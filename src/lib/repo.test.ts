import { describe, it, expect } from "vitest";
import { daPasta, invalidarCache, type ItemRepo } from "./repo";
import { lerMarkdown } from "./markdown";

const itemMock = (caminho: string, texto = "# Teste"): ItemRepo => ({
  caminho,
  nome: caminho.split("/").pop()!,
  sha: `sha-${caminho}`,
  tamanho: texto.length,
  texto,
  doc: lerMarkdown(texto),
});

describe("daPasta", () => {
  it("filtra apenas os arquivos da pasta especificada", () => {
    const todos = [
      itemMock("notas/2026-08-13-a.md"),
      itemMock("notas/2026-08-14-b.md"),
      itemMock("tarefas/2026-08-13-c.md"),
      itemMock("pdi/metas/d.md"),
    ];

    const notas = daPasta(todos, "notas");
    expect(notas).toHaveLength(2);
    expect(notas.map((n) => n.caminho)).toEqual([
      "notas/2026-08-14-b.md",
      "notas/2026-08-13-a.md",
    ]);
  });

  it("não inclui arquivos de subpastas mais profundas", () => {
    const todos = [
      itemMock("pdi/meta.md"),
      itemMock("pdi/metas/meta-profunda.md"),
    ];

    const pdi = daPasta(todos, "pdi");
    expect(pdi).toHaveLength(1);
    expect(pdi[0].caminho).toBe("pdi/meta.md");
  });
});

describe("invalidarCache", () => {
  it("executa sem erros", () => {
    expect(() => invalidarCache()).not.toThrow();
  });
});

/* ------------------------------------------------------------------------
 * Testes do carregamento e do cache.
 *
 * Guardam três correções que custaram caro para achar:
 *   - o cache nunca revalidava, servindo dado velho a sessão inteira;
 *   - o reaproveitamento por sha era código morto, então salvar uma nota
 *     re-baixava o repositório inteiro;
 *   - limite de API aparecia como "token sem permissão".
 * ---------------------------------------------------------------------- */

import { vi, beforeEach, afterEach } from "vitest";
import { carregarRepo, esquecerTudo } from "./repo";
import { PADRAO, type Settings } from "./settings";

const cfg: Settings = {
  ...PADRAO,
  githubToken: "tok",
  repoOwner: "hugo",
  repoName: "dados",
};

function resposta(
  corpo: unknown,
  { status = 200, headers = {} as Record<string, string> } = {},
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => headers[h.toLowerCase()] ?? null },
    json: async () => corpo,
  } as unknown as Response;
}

const arvore = (arquivos: { path: string; sha: string }[], truncated = false) =>
  resposta({
    truncated,
    tree: arquivos.map((a) => ({ ...a, type: "blob", size: 10 })),
  });

const conteudo = (textos: string[]) =>
  resposta({
    data: {
      repository: Object.fromEntries(
        textos.map((t, i) => [`f${i}`, { text: t }]),
      ),
    },
  });

let fetchFalso: ReturnType<typeof vi.fn>;

beforeEach(() => {
  esquecerTudo();
  fetchFalso = vi.fn();
  vi.stubGlobal("fetch", fetchFalso);
  vi.stubGlobal("navigator", { onLine: true });
});

afterEach(() => vi.unstubAllGlobals());

describe("carregarRepo", () => {
  it("busca árvore e conteúdo em duas requisições", async () => {
    fetchFalso
      .mockResolvedValueOnce(arvore([{ path: "notas/a.md", sha: "s1" }]))
      .mockResolvedValueOnce(conteudo(["---\ntitulo: A\n---\n\ncorpo"]));

    const itens = await carregarRepo(cfg);
    expect(fetchFalso).toHaveBeenCalledTimes(2);
    expect(itens[0].doc.dados.titulo).toBe("A");
  });

  it("repositório vazio não pede conteúdo", async () => {
    fetchFalso.mockResolvedValueOnce(arvore([]));
    expect(await carregarRepo(cfg)).toEqual([]);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("repositório sem commits (404) não é erro", async () => {
    fetchFalso.mockResolvedValueOnce(resposta({}, { status: 404 }));
    expect(await carregarRepo(cfg)).toEqual([]);
  });

  it("ignora ocultos e o que não é .md", async () => {
    fetchFalso
      .mockResolvedValueOnce(
        arvore([
          { path: "notas/a.md", sha: "s1" },
          { path: "notas/.gitkeep.md", sha: "s2" },
          { path: "referencias/imagens/foto.png", sha: "s3" },
        ]),
      )
      .mockResolvedValueOnce(conteudo(["conteudo"]));

    expect((await carregarRepo(cfg)).map((i) => i.caminho)).toEqual([
      "notas/a.md",
    ]);
  });
});

describe("revalidação — não pode mostrar dado velho", () => {
  it("confere a árvore a cada chamada", async () => {
    fetchFalso
      .mockResolvedValueOnce(arvore([{ path: "notas/a.md", sha: "s1" }]))
      .mockResolvedValueOnce(conteudo(["v1"]))
      .mockResolvedValueOnce(arvore([{ path: "notas/a.md", sha: "s2" }]))
      .mockResolvedValueOnce(conteudo(["editado no github.com"]));

    expect((await carregarRepo(cfg))[0].texto).toBe("v1");
    expect((await carregarRepo(cfg))[0].texto).toBe("editado no github.com");
  });

  it("janela de memória evita recarga em montagens simultâneas", async () => {
    fetchFalso
      .mockResolvedValueOnce(arvore([{ path: "notas/a.md", sha: "s1" }]))
      .mockResolvedValueOnce(conteudo(["v1"]));

    await carregarRepo(cfg);
    await carregarRepo(cfg, { memoria: 5000 });
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });
});

describe("reaproveitamento por sha — salvar não re-baixa tudo", () => {
  it("só baixa o arquivo que mudou de sha", async () => {
    fetchFalso
      .mockResolvedValueOnce(
        arvore([
          { path: "notas/a.md", sha: "s1" },
          { path: "notas/b.md", sha: "s2" },
          { path: "notas/c.md", sha: "s3" },
        ]),
      )
      .mockResolvedValueOnce(conteudo(["A", "B", "C"]));
    await carregarRepo(cfg);

    invalidarCache();
    fetchFalso
      .mockResolvedValueOnce(
        arvore([
          { path: "notas/a.md", sha: "s1" },
          { path: "notas/b.md", sha: "NOVO" },
          { path: "notas/c.md", sha: "s3" },
        ]),
      )
      .mockResolvedValueOnce(conteudo(["B editado"]));

    const itens = await carregarRepo(cfg);
    const query = JSON.parse(fetchFalso.mock.calls[3][1].body).query;
    expect(query).toContain("notas/b.md");
    expect(query).not.toContain("notas/a.md");

    const porCaminho = Object.fromEntries(itens.map((i) => [i.caminho, i.texto]));
    expect(porCaminho["notas/a.md"]).toBe("A");
    expect(porCaminho["notas/b.md"]).toBe("B editado");
    expect(porCaminho["notas/c.md"]).toBe("C");
  });

  it("nada mudou: nem pede conteúdo", async () => {
    fetchFalso
      .mockResolvedValueOnce(arvore([{ path: "notas/a.md", sha: "s1" }]))
      .mockResolvedValueOnce(conteudo(["A"]));
    await carregarRepo(cfg);

    invalidarCache();
    fetchFalso.mockResolvedValueOnce(arvore([{ path: "notas/a.md", sha: "s1" }]));

    expect((await carregarRepo(cfg))[0].texto).toBe("A");
    expect(fetchFalso).toHaveBeenCalledTimes(3);
  });
});

describe("erros", () => {
  it("limite de API não vira 'token sem permissão'", async () => {
    fetchFalso.mockResolvedValueOnce(
      resposta({}, { status: 403, headers: { "x-ratelimit-remaining": "0" } }),
    );
    await expect(carregarRepo(cfg)).rejects.toThrow(/limite/i);
  });

  it("403 por permissão continua falando de permissão", async () => {
    fetchFalso.mockResolvedValueOnce(
      resposta({}, { status: 403, headers: { "x-ratelimit-remaining": "999" } }),
    );
    await expect(carregarRepo(cfg)).rejects.toThrow(/permiss/i);
  });

  it("árvore truncada avisa em vez de listar pela metade", async () => {
    fetchFalso.mockResolvedValueOnce(
      arvore([{ path: "notas/a.md", sha: "s1" }], true),
    );
    await expect(carregarRepo(cfg)).rejects.toThrow(/tamanho/i);
  });

  it("erro do GraphQL é reportado, não engolido", async () => {
    fetchFalso
      .mockResolvedValueOnce(arvore([{ path: "notas/a.md", sha: "s1" }]))
      .mockResolvedValueOnce(resposta({ errors: [{ message: "algo ruim" }] }));
    await expect(carregarRepo(cfg)).rejects.toThrow(/algo ruim/);
  });
});
