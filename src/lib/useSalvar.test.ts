/**
 * Testes do hook de salvamento otimista.
 *
 * Garante que o useSalvar realiza as gravações e exclusões na fila de sincronização
 * local (Sync Queue) e atualiza o cache em memória imediatamente (Optimistic UI)
 * sem travar a interface do usuário.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSalvar } from "./useSalvar";
import type { Settings } from "./settings";

vi.mock("./repo", () => ({
  atualizarCacheLocal: vi.fn(),
  removerDoCacheLocal: vi.fn(),
}));

vi.mock("./offlineQueue", () => ({
  salvarRascunhoLocal: vi.fn().mockReturnValue({ ok: true }),
  obterRascunhosLocais: vi.fn().mockReturnValue([]),
  limparRascunhosComErro: vi.fn(),
  redefinirRascunhosComErroParaPendente: vi.fn(),
  sincronizarFilaOffline: vi.fn().mockResolvedValue({ concluidos: 0, falhas: 0 }),
}));

import { atualizarCacheLocal, removerDoCacheLocal } from "./repo";
import { salvarRascunhoLocal, obterRascunhosLocais } from "./offlineQueue";

const cfg: Settings = {
  githubToken: "tok",
  repoOwner: "hugo",
  repoName: "dados",
  branch: "main",
  geminiKey: "",
  geminiModel: "",
  nomeUsuario: "Hugo",
  profissaoUsuario: "Designer",
  onboardingConcluido: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(obterRascunhosLocais).mockReturnValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSalvar — salvarTexto", () => {
  it("devolve o sha enviado ou gera um temporário", async () => {
    const { result } = renderHook(() => useSalvar(cfg));

    let devolvido = "";
    await act(async () => {
      devolvido = await result.current.salvarTexto("notas/a.md", "texto", "sha-antigo");
    });

    expect(devolvido).toBe("sha-antigo");
    expect(salvarRascunhoLocal).toHaveBeenCalledWith("notas/a.md", "texto", "sha-antigo", undefined, false, "gravar");
    expect(atualizarCacheLocal).toHaveBeenCalledWith("notas/a.md", "texto", expect.any(Object), "sha-antigo");
  });

  it("gera um sha temporário caso não seja passado", async () => {
    const { result } = renderHook(() => useSalvar(cfg));

    let devolvido = "";
    await act(async () => {
      devolvido = await result.current.salvarTexto("notas/a.md", "texto");
    });

    expect(devolvido).toContain("temp_");
    expect(salvarRascunhoLocal).toHaveBeenCalledWith("notas/a.md", "texto", undefined, undefined, false, "gravar");
    expect(atualizarCacheLocal).toHaveBeenCalledWith("notas/a.md", "texto", expect.any(Object), devolvido);
  });

  it("dispara 'acervo-atualizado' para as outras telas sincronizarem se não for silencioso", async () => {
    const ouvinte = vi.fn();
    window.addEventListener("acervo-atualizado", ouvinte);

    const { result } = renderHook(() => useSalvar(cfg));
    await act(async () => {
      await result.current.salvarTexto("notas/a.md", "texto", "sha");
    });

    expect(ouvinte).toHaveBeenCalledTimes(1);
    window.removeEventListener("acervo-atualizado", ouvinte);
  });

  it("reage ao status da fila local (salvando)", async () => {
    // Mocka a fila local como contendo itens pendentes
    vi.mocked(obterRascunhosLocais).mockReturnValue([
      { id: "1", caminho: "a.md", texto: "t", criadoEm: "", status: "sincronizando" }
    ]);

    const { result } = renderHook(() => useSalvar(cfg));
    
    // O useEffect roda na montagem e atualiza o estado
    await waitFor(() => expect(result.current.salvando).toBe(true));
  });

  it("reage a erros na fila local", async () => {
    // Mocka a fila local contendo item com erro
    vi.mocked(obterRascunhosLocais).mockReturnValue([
      { id: "1", caminho: "a.md", texto: "t", criadoEm: "", status: "erro", ultimoErro: "Erro 500" }
    ]);

    const { result } = renderHook(() => useSalvar(cfg));
    await waitFor(() => expect(result.current.erro).toBe("Erro 500"));

    // Limpar erro zera o erro localmente no hook
    act(() => result.current.limparErro());
    expect(result.current.erro).toBe("");
  });
});

describe("useSalvar — apagarItem", () => {
  it("enfileira a exclusão e remove do cache local imediatamente", async () => {
    const ouvinte = vi.fn();
    window.addEventListener("acervo-atualizado", ouvinte);

    const { result } = renderHook(() => useSalvar(cfg));
    await act(async () => {
      await result.current.apagarItem("notas/a.md", "sha");
    });

    expect(salvarRascunhoLocal).toHaveBeenCalledWith("notas/a.md", "", "sha", undefined, false, "apagar");
    expect(removerDoCacheLocal).toHaveBeenCalledWith("notas/a.md");
    expect(ouvinte).toHaveBeenCalledTimes(1);
    window.removeEventListener("acervo-atualizado", ouvinte);
  });
});
