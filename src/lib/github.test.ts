/**
 * Testes da camada de dados — o arquivo por onde passa 100% do conteúdo.
 *
 * Estava sem um único teste, o que é o mesmo que dizer que ninguém garantia
 * que um acento sobrevive à viagem até o GitHub e de volta.
 *
 * Sem rede: o `fetch` global é substituído por respostas de mentira.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ler, gravar, apagar, ErroGitHub } from "./github";
import { PADRAO, type Settings } from "./settings";

const cfg: Settings = {
  ...PADRAO,
  githubToken: "token-de-teste",
  repoOwner: "hugo",
  repoName: "dados",
};

/** Codifica em base64 como o GitHub faz — via bytes UTF-8. */
function b64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  return btoa(String.fromCharCode(...bytes));
}

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

let fetchFalso: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchFalso = vi.fn();
  vi.stubGlobal("fetch", fetchFalso);
  vi.stubGlobal("navigator", { onLine: true });
});

afterEach(() => vi.unstubAllGlobals());

describe("ler", () => {
  it("decodifica acentos e emoji sem corromper", async () => {
    const original = "Coração, ação, ünïcode 🍅 — travessão";
    fetchFalso.mockResolvedValue(resposta({ content: b64(original), sha: "s1" }));

    const r = await ler(cfg, "notas/x.md");
    expect(r.texto).toBe(original);
    expect(r.sha).toBe("s1");
  });

  it("aguenta base64 quebrado em linhas, como o GitHub devolve", async () => {
    const original = "linha um\nlinha dois";
    const partido = b64(original).replace(/(.{4})/g, "$1\n");
    fetchFalso.mockResolvedValue(resposta({ content: partido, sha: "s" }));

    expect((await ler(cfg, "notas/x.md")).texto).toBe(original);
  });
});

describe("gravar", () => {
  it("manda o conteúdo em base64 e devolve o sha novo", async () => {
    fetchFalso.mockResolvedValue(resposta({ content: { sha: "novo-sha" } }));

    const sha = await gravar(cfg, "notas/x.md", "Ação 🍅");
    expect(sha).toBe("novo-sha");

    const [, init] = fetchFalso.mock.calls[0];
    const corpo = JSON.parse(init.body);
    expect(atob(corpo.content)).not.toBe("Ação 🍅"); // está codificado
    expect(new TextDecoder().decode(
      Uint8Array.from(atob(corpo.content), (c) => c.charCodeAt(0)),
    )).toBe("Ação 🍅"); // e volta certo
  });

  it("sem sha cria; com sha atualiza", async () => {
    fetchFalso.mockResolvedValue(resposta({ content: { sha: "x" } }));

    await gravar(cfg, "a.md", "t");
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body).sha).toBeUndefined();

    await gravar(cfg, "a.md", "t", "sha-antigo");
    expect(JSON.parse(fetchFalso.mock.calls[1][1].body).sha).toBe("sha-antigo");
  });
});

describe("mensagens de erro", () => {
  it("403 por LIMITE não acusa o token de estar errado", async () => {
    const daquiA10min = Math.floor((Date.now() + 600_000) / 1000);
    fetchFalso.mockResolvedValue(
      resposta({ message: "rate limit" }, {
        status: 403,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(daquiA10min),
        },
      }),
    );

    await expect(ler(cfg, "a.md")).rejects.toThrow(/limite/i);
    await expect(ler(cfg, "a.md")).rejects.toThrow(/token está certo/i);
  });

  it("403 por PERMISSÃO continua falando de permissão", async () => {
    fetchFalso.mockResolvedValue(
      resposta({ message: "Forbidden" }, {
        status: 403,
        headers: { "x-ratelimit-remaining": "4321" },
      }),
    );
    await expect(ler(cfg, "a.md")).rejects.toThrow(/permiss/i);
  });

  it("429 também é tratado como limite", async () => {
    fetchFalso.mockResolvedValue(
      resposta({}, { status: 429, headers: { "x-ratelimit-remaining": "0" } }),
    );
    await expect(ler(cfg, "a.md")).rejects.toThrow(/limite/i);
  });

  it("401 manda conferir o token", async () => {
    fetchFalso.mockResolvedValue(resposta({ message: "Bad credentials" }, { status: 401 }));
    await expect(ler(cfg, "a.md")).rejects.toThrow(/Token do GitHub/i);
  });

  it("falha de rede vira mensagem em português, não 'Failed to fetch'", async () => {
    fetchFalso.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(ler(cfg, "a.md")).rejects.toThrow(/Não consegui falar com o GitHub/);
  });

  it("sem internet, diz que é falta de internet", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    fetchFalso.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(ler(cfg, "a.md")).rejects.toThrow(/sem internet/i);
  });

  it("o erro carrega o status para quem quiser tratar", async () => {
    fetchFalso.mockResolvedValue(resposta({}, { status: 409 }));
    await expect(ler(cfg, "a.md")).rejects.toMatchObject({
      name: "ErroGitHub",
      status: 409,
    });
    expect(new ErroGitHub("x", 1)).toBeInstanceOf(Error);
  });
});

describe("apagar", () => {
  it("exige o sha e usa DELETE", async () => {
    fetchFalso.mockResolvedValue(resposta({ commit: {} }));
    await apagar(cfg, "notas/a.md", "sha1");

    const [, init] = fetchFalso.mock.calls[0];
    expect(init.method).toBe("DELETE");
    expect(JSON.parse(init.body).sha).toBe("sha1");
  });
});

describe("token com sujeira do copiar-e-colar", () => {
  it("quebra de linha no token não vai para o cabeçalho", async () => {
    fetchFalso.mockResolvedValue(resposta({ content: b64("x"), sha: "s" }));
    await ler({ ...cfg, githubToken: "tok\n" }, "a.md");

    const [, init] = fetchFalso.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(init.headers.Authorization).not.toContain("\n");
  });
});
