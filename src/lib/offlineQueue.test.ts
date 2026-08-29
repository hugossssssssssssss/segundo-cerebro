import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  obterRascunhosLocais,
  salvarRascunhoLocal,
  removerRascunhoLocal,
  limparTodosRascunhosLocais,
} from "./offlineQueue";

describe("offlineQueue", () => {
  beforeEach(() => {
    limparTodosRascunhosLocais();
    localStorage.clear();
  });

  it("salva e recupera rascunhos offline", () => {
    expect(obterRascunhosLocais()).toEqual([]);

    salvarRascunhoLocal("notas/teste.md", "# Teste Offline", "sha123");
    const rascunhos = obterRascunhosLocais();

    expect(rascunhos).toHaveLength(1);
    expect(rascunhos[0].caminho).toBe("notas/teste.md");
    expect(rascunhos[0].texto).toBe("# Teste Offline");
  });

  it("substitui rascunho anterior para o mesmo caminho", () => {
    salvarRascunhoLocal("notas/teste.md", "Versão 1");
    salvarRascunhoLocal("notas/teste.md", "Versão 2");

    const rascunhos = obterRascunhosLocais();
    expect(rascunhos).toHaveLength(1);
    expect(rascunhos[0].texto).toBe("Versão 2");
  });

  it("remove rascunho salvo por ID único ou caminho", () => {
    const res = salvarRascunhoLocal("notas/teste.md", "Conteúdo");
    expect(res.ok).toBe(true);
    expect(obterRascunhosLocais()).toHaveLength(1);

    removerRascunhoLocal(res.rascunho.id);
    expect(obterRascunhosLocais()).toHaveLength(0);
  });

  it("continua com ok: true resiliente mesmo ao atingir limite de cota do localStorage (QuotaExceededError)", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new Error("QuotaExceededError");
      err.name = "QuotaExceededError";
      throw err;
    });

    const res = salvarRascunhoLocal("notas/teste.md", "Muito grande");
    expect(res.ok).toBe(true);
    expect(obterRascunhosLocais()).toHaveLength(1);

    spy.mockRestore();
  });

  it("limpa todos os rascunhos com limparTodosRascunhosLocais", () => {
    salvarRascunhoLocal("notas/a.md", "A");
    salvarRascunhoLocal("notas/b.md", "B");
    expect(obterRascunhosLocais()).toHaveLength(2);

    limparTodosRascunhosLocais();
    expect(obterRascunhosLocais()).toHaveLength(0);
  });

  it("marca rascunho como conflito em 409 se o conteúdo remoto for diferente", async () => {
    const { sincronizarFilaOffline } = await import("./offlineQueue");
    const github = await import("./github");

    const spyGravar = vi.spyOn(github, "gravar").mockRejectedValue(
      new github.ErroGitHub("Conflito de edição no GitHub (HTTP 409)", 409),
    );
    const spyLer = vi.spyOn(github, "ler").mockResolvedValue({
      texto: "# Versão Remota no GitHub",
      sha: "sha-remoto-novo",
    });

    salvarRascunhoLocal("notas/conflito.md", "# Versão Local Diferente", "sha-antigo", undefined, false);

    const cfg = {
      githubToken: "token",
      repoOwner: "dono",
      repoName: "repo",
      branch: "main",
      nomeUsuario: "",
      profissaoUsuario: "",
      onboardingConcluido: true,
      geminiKey: "",
      geminiModel: "",
    };

    const res = await sincronizarFilaOffline(cfg);
    expect(res.falhas).toBe(1);

    const rascunhos = obterRascunhosLocais();
    expect(rascunhos).toHaveLength(1);
    expect(rascunhos[0].status).toBe("conflito");

    spyGravar.mockRestore();
    spyLer.mockRestore();
  });
});


