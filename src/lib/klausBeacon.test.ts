import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  verificarFrescorArquivo,
  limparCacheBeacon,
} from "./klausBeacon";

describe("klausBeacon - Detecção de Concorrência e Frescor", () => {
  beforeEach(() => {
    limparCacheBeacon();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("retorna ehRecente=false quando não há commits ou caminho vazio", async () => {
    const res = await verificarFrescorArquivo(
      { repoOwner: "hugo", repoName: "dados", branch: "main", githubToken: "ghp_123" },
      ""
    );
    expect(res.temCommit).toBe(false);
    expect(res.ehRecente).toBe(false);
  });

  it("detecta alteração recente feita por outro membro da equipe", async () => {
    // Configura perfil local do usuário logado como 'hugosilva'
    localStorage.setItem(
      "segundo-cerebro:usuario-perfil",
      JSON.stringify({ login: "hugosilva", nome: "Hugo Silva" })
    );

    const dataRecente = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // 3 minutos atrás
    const mockCommitResponse = [
      {
        sha: "a1b2c3d4e5f6",
        commit: {
          message: "atualiza notas/briefing.md com feedback do cliente",
          author: {
            name: "Maria Designer",
            date: dataRecente,
          },
        },
        author: {
          login: "mariadesign",
          avatar_url: "https://github.com/mariadesign.png",
        },
      },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockCommitResponse,
    } as Response);

    const res = await verificarFrescorArquivo(
      { repoOwner: "empresa", repoName: "segundo-cerebro-dados", branch: "main", githubToken: "ghp_test" },
      "notas/briefing.md",
      15 // limite de 15 minutos
    );

    expect(res.temCommit).toBe(true);
    expect(res.ehRecente).toBe(true);
    expect(res.ehOutroAutor).toBe(true);
    expect(res.autorLogin).toBe("mariadesign");
    expect(res.autorNome).toBe("Maria Designer");
    expect(res.minutosAtras).toBeLessThanOrEqual(5);
  });

  it("ignora alerta se o último commit recente foi feito pelo próprio usuário", async () => {
    localStorage.setItem(
      "segundo-cerebro:usuario-perfil",
      JSON.stringify({ login: "hugosilva", nome: "Hugo Silva" })
    );

    const dataRecente = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const mockCommitResponse = [
      {
        sha: "11223344",
        commit: {
          message: "minha própria edição",
          author: { name: "Hugo Silva", date: dataRecente },
        },
        author: {
          login: "hugosilva",
          avatar_url: "https://github.com/hugosilva.png",
        },
      },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockCommitResponse,
    } as Response);

    const res = await verificarFrescorArquivo(
      { repoOwner: "hugosilva", repoName: "dados", branch: "main", githubToken: "ghp_test" },
      "notas/ideias.md"
    );

    expect(res.temCommit).toBe(true);
    expect(res.ehRecente).toBe(true);
    expect(res.ehOutroAutor).toBe(false); // Foi o próprio Hugo
  });
});
