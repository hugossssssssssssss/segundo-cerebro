import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  obterPerfilUsuario,
  lerPerfilLocal,
  salvarPerfilLocal,
  limparPerfilLocal,
  type PerfilUsuario,
} from "./usuario";

describe("usuario.ts - Identidade e Perfil", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("salva e recupera perfil localmente", () => {
    const perfil: PerfilUsuario = {
      login: "hugosilva",
      nome: "Hugo Silva",
      avatarUrl: "https://github.com/hugosilva.png",
      atualizadoEm: "2026-09-14T17:00:00Z",
    };

    salvarPerfilLocal(perfil);
    expect(lerPerfilLocal()).toEqual(perfil);

    limparPerfilLocal();
    expect(lerPerfilLocal()).toBeNull();
  });

  it("retorna null se token não for informado", async () => {
    const res = await obterPerfilUsuario({ githubToken: "" });
    expect(res).toBeNull();
  });

  it("busca dados no GitHub e atualiza cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        login: "hugosilva",
        name: "Hugo Silva Designer",
        avatar_url: "https://avatars.github.com/u/123",
        email: "hugo@exemplo.com",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const perfil = await obterPerfilUsuario({ githubToken: "ghp_teste" });
    expect(perfil).not.toBeNull();
    expect(perfil?.login).toBe("hugosilva");
    expect(perfil?.nome).toBe("Hugo Silva Designer");
    expect(perfil?.email).toBe("hugo@exemplo.com");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ghp_teste",
        }),
      }),
    );

    // Próxima chamada deve usar cache sem bater na rede
    fetchMock.mockClear();
    const emCache = await obterPerfilUsuario({ githubToken: "ghp_teste" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(emCache?.login).toBe("hugosilva");
  });

  it("em caso de falha de rede, devolve o cache existente", async () => {
    const perfilSalvo: PerfilUsuario = {
      login: "hugosilva",
      nome: "Hugo Silva",
      avatarUrl: "https://github.com/hugosilva.png",
      atualizadoEm: "2026-09-14T17:00:00Z",
    };
    salvarPerfilLocal(perfilSalvo);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Sem internet")));

    const res = await obterPerfilUsuario(
      { githubToken: "ghp_teste" },
      { forcarAtualizacao: true },
    );
    expect(res).toEqual(perfilSalvo);
  });

  it("verificarPermissaoRepositorio identifica acesso e permissão de push", async () => {
    const { verificarPermissaoRepositorio } = await import("./usuario");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          permissions: {
            admin: true,
            push: true,
            pull: true,
          },
        }),
      }),
    );

    const res = await verificarPermissaoRepositorio({
      githubToken: "tok",
      repoOwner: "hugo",
      repoName: "dados",
    });

    expect(res.temAcesso).toBe(true);
    expect(res.podeGravar).toBe(true);
    expect(res.ehAdmin).toBe(true);
    expect(res.papel).toBe("admin");
  });

  it("verificarPermissaoRepositorio reporta erro amigável se repo der 404", async () => {
    const { verificarPermissaoRepositorio } = await import("./usuario");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    const res = await verificarPermissaoRepositorio({
      githubToken: "tok",
      repoOwner: "hugo",
      repoName: "repo_inexistente",
    });

    expect(res.temAcesso).toBe(false);
    expect(res.podeGravar).toBe(false);
    expect(res.erro).toMatch(/não encontrado/);
  });
});

