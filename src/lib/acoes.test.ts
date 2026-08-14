import { describe, it, expect, vi } from "vitest";
import {
  acoesDeChamadas,
  descrever,
  executar,
  limparReservas,
  type Acao,
  type ChamadaFuncao,
} from "./acoes";
import { PADRAO } from "./settings";

const chamada = (name: string, args: Record<string, unknown>): ChamadaFuncao => ({
  name,
  args,
});

describe("acoesDeChamadas", () => {
  it("converte uma criação com todos os campos", () => {
    const acoes = acoesDeChamadas([
      chamada("criar_item", {
        pasta: "tarefas",
        titulo: "Revisar proposta",
        corpo: "Ver o [[Briefing Acme]]",
        status: "a-fazer",
        prazo: "2026-08-22",
        tags: ["cliente"],
        motivo: "você pediu para sexta",
      }),
    ]);

    expect(acoes).toHaveLength(1);
    expect(acoes[0]).toMatchObject({
      tipo: "criar",
      pasta: "tarefas",
      titulo: "Revisar proposta",
      motivo: "você pediu para sexta",
    });
    expect(acoes[0].campos).toEqual({
      status: "a-fazer",
      prazo: "2026-08-22",
      tags: ["cliente"],
    });
  });

  it("converte várias chamadas de uma vez", () => {
    const acoes = acoesDeChamadas([
      chamada("criar_item", { pasta: "tarefas", titulo: "Comprar café" }),
      chamada("criar_item", { pasta: "tarefas", titulo: "Ligar pro dentista" }),
    ]);
    expect(acoes.map((a) => a.titulo)).toEqual([
      "Comprar café",
      "Ligar pro dentista",
    ]);
  });

  it("converte edição e remoção", () => {
    const acoes = acoesDeChamadas([
      chamada("editar_item", {
        caminho: "tarefas/2026-08-13-x.md",
        status: "feito",
      }),
      chamada("apagar_item", { caminho: "notas/2026-08-13-velha.md" }),
    ]);
    expect(acoes[0]).toMatchObject({ tipo: "editar" });
    expect(acoes[0].campos).toEqual({ status: "feito" });
    expect(acoes[1]).toMatchObject({ tipo: "apagar" });
  });

  it("sem chamada nenhuma devolve lista vazia", () => {
    expect(acoesDeChamadas([])).toEqual([]);
  });
});

describe("a IA não pode escrever onde quiser", () => {
  it("recusa pasta fora da lista conhecida", () => {
    expect(
      acoesDeChamadas([chamada("criar_item", { pasta: "etc", titulo: "X" })]),
    ).toEqual([]);
    expect(
      acoesDeChamadas([
        chamada("criar_item", { pasta: ".github/workflows", titulo: "X" }),
      ]),
    ).toEqual([]);
  });

  it("recusa caminho tentando subir de diretório", () => {
    expect(
      acoesDeChamadas([
        chamada("apagar_item", { caminho: "tarefas/../../.git/config.md" }),
      ]),
    ).toEqual([]);
  });

  it("recusa mexer em arquivo fora das pastas de conteúdo", () => {
    expect(
      acoesDeChamadas([chamada("apagar_item", { caminho: "AGENTS.md" })]),
    ).toEqual([]);
    expect(
      acoesDeChamadas([chamada("editar_item", { caminho: "README.md" })]),
    ).toEqual([]);
    expect(
      acoesDeChamadas([
        chamada("editar_item", { caminho: ".github/workflows/deploy.yml.md" }),
      ]),
    ).toEqual([]);
  });

  it("recusa criar sem título", () => {
    expect(
      acoesDeChamadas([chamada("criar_item", { pasta: "tarefas", titulo: "  " })]),
    ).toEqual([]);
    expect(
      acoesDeChamadas([chamada("criar_item", { pasta: "tarefas" })]),
    ).toEqual([]);
  });

  it("recusa caminho que não é .md", () => {
    expect(
      acoesDeChamadas([
        chamada("apagar_item", { caminho: "referencias/imagens/foto.png" }),
      ]),
    ).toEqual([]);
  });

  it("recusa função inventada", () => {
    expect(
      acoesDeChamadas([
        chamada("rodar_comando", { caminho: "tarefas/x.md" }),
      ]),
    ).toEqual([]);
  });

  it("descarta só a chamada inválida, mantendo as boas", () => {
    const acoes = acoesDeChamadas([
      chamada("criar_item", { pasta: "tarefas", titulo: "Boa" }),
      chamada("apagar_item", { caminho: "/etc/passwd" }),
    ]);
    expect(acoes).toHaveLength(1);
    expect(acoes[0].titulo).toBe("Boa");
  });

  it("aceita as pastas válidas, inclusive as de dois níveis", () => {
    expect(
      acoesDeChamadas([
        chamada("criar_item", { pasta: "pdi/metas", titulo: "Meta" }),
      ]),
    ).toHaveLength(1);
    expect(
      acoesDeChamadas([
        chamada("editar_item", { caminho: "pdi/entregas/2026-08-13-x.md" }),
      ]),
    ).toHaveLength(1);
  });
});

describe("descrever", () => {
  it("diz em português o que vai acontecer", () => {
    expect(descrever({ tipo: "criar", pasta: "tarefas", titulo: "Ligar" })).toBe(
      'Criar a tarefa "Ligar"',
    );
    expect(
      descrever({ tipo: "apagar", caminho: "notas/2026-08-13-velha.md" }),
    ).toBe('Apagar "2026-08-13-velha"');
    expect(descrever({ tipo: "editar", caminho: "pdi/metas/branding.md" })).toBe(
      'Editar "branding"',
    );
  });

  it("cada pasta tem seu rótulo", () => {
    expect(
      descrever({ tipo: "criar", pasta: "pdi/metas", titulo: "X" }),
    ).toContain("a meta");
    expect(
      descrever({ tipo: "criar", pasta: "referencias", titulo: "X" }),
    ).toContain("a referência");
  });
});

describe("aprovar duas criações seguidas não colide", () => {
  it("o segundo item ganha nome próprio, mesmo com o mesmo título", async () => {
    limparReservas();

    const gravados: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (init?.method === "PUT") gravados.push(String(url).split("/contents/")[1]);
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({ content: { sha: "novo" } }),
        } as unknown as Response;
      }),
    );
    vi.stubGlobal("navigator", { onLine: true });

    const cfg = { ...PADRAO, githubToken: "t", repoOwner: "h", repoName: "d" };
    const acao: Acao = { tipo: "criar", pasta: "tarefas", titulo: "Reunião" };

    // as duas aprovações veem o MESMO acervo, como acontece na tela
    await Promise.all([executar(cfg, acao, []), executar(cfg, acao, [])]);

    expect(gravados).toHaveLength(2);
    expect(new Set(gravados).size).toBe(2); // caminhos diferentes
    vi.unstubAllGlobals();
  });
});

describe("a marca da IA", () => {
  async function gravadoPor(acao: Acao): Promise<string> {
    limparReservas();
    let corpo = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        if (init?.method === "PUT") {
          const enviado = JSON.parse(String(init.body)).content;
          corpo = new TextDecoder().decode(
            Uint8Array.from(atob(enviado), (c) => c.charCodeAt(0)),
          );
        }
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({ content: { sha: "s" } }),
        } as unknown as Response;
      }),
    );
    vi.stubGlobal("navigator", { onLine: true });
    await executar(
      { ...PADRAO, githubToken: "t", repoOwner: "h", repoName: "d" },
      acao,
      [],
    );
    vi.unstubAllGlobals();
    return corpo;
  }

  it("marca a entrega, onde existe tela para conferir", async () => {
    const corpo = await gravadoPor({
      tipo: "criar",
      pasta: "pdi/entregas",
      titulo: "Campanha",
    });
    expect(corpo).toContain("ia_sugeriu: true");
  });

  it("NÃO marca tarefa: nada exibiria e nada removeria a marca", async () => {
    // marca que ninguém pode tirar vira lixo permanente no arquivo, porque
    // mesclarFrontmatter a reescreve fielmente em todo save
    const corpo = await gravadoPor({
      tipo: "criar",
      pasta: "tarefas",
      titulo: "Ligar",
    });
    expect(corpo).not.toContain("ia_sugeriu");
  });

  it("NÃO marca nota nem referência", async () => {
    expect(
      await gravadoPor({ tipo: "criar", pasta: "notas", titulo: "Ideia" }),
    ).not.toContain("ia_sugeriu");
    expect(
      await gravadoPor({ tipo: "criar", pasta: "referencias", titulo: "Grade" }),
    ).not.toContain("ia_sugeriu");
  });
});

describe("a IA não pode esvaziar um texto sem querer", () => {
  it("edição com corpo vazio preserva o corpo existente", async () => {
    limparReservas();
    let gravado = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        if (init?.method === "PUT") {
          const b64 = JSON.parse(String(init.body)).content;
          gravado = new TextDecoder().decode(
            Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
          );
        }
        // resposta do `ler` que antecede a edição
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({
            content: btoa("---\ntitulo: X\n---\n\ntexto importante"),
            sha: "s",
            ...(init?.method === "PUT" ? { content: { sha: "novo" } } : {}),
          }),
        } as unknown as Response;
      }),
    );
    vi.stubGlobal("navigator", { onLine: true });

    await executar(
      { ...PADRAO, githubToken: "t", repoOwner: "h", repoName: "d" },
      { tipo: "editar", caminho: "notas/x.md", corpo: "" },
      [],
    );

    expect(gravado).toContain("texto importante");
    vi.unstubAllGlobals();
  });
});
