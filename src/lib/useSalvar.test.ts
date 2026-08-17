/**
 * Testes do hook de salvamento.
 *
 * A regra que estes testes protegem é a ORDEM das operações:
 *   gravar() → atualizarCacheLocal(sha REAL) → invalidarCache() → evento
 *
 * Se o cache for atualizado antes de `gravar()` retornar, ele guarda o texto
 * novo com o sha ANTIGO — e o mapa `textoPorSha` passa a mentir para o resto
 * do app. Foi uma das perdas de dados encontradas na auditoria.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSalvar } from "./useSalvar";
import type { Settings } from "./settings";

vi.mock("./github", () => {
  class ErroGitHub extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ErroGitHub";
      this.status = status;
    }
  }
  return {
    gravar: vi.fn(),
    apagar: vi.fn(),
    ErroGitHub,
  };
});

vi.mock("./repo", () => ({
  atualizarCacheLocal: vi.fn(),
  invalidarCache: vi.fn(),
}));

import { gravar, apagar } from "./github";
import { atualizarCacheLocal, invalidarCache } from "./repo";

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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSalvar — salvarTexto", () => {
  it("devolve o sha novo que veio do GitHub", async () => {
    vi.mocked(gravar).mockResolvedValue("sha-novo");
    const { result } = renderHook(() => useSalvar(cfg));

    let devolvido = "";
    await act(async () => {
      devolvido = await result.current.salvarTexto("notas/a.md", "texto", "sha-antigo");
    });

    expect(devolvido).toBe("sha-novo");
    expect(gravar).toHaveBeenCalledWith(cfg, "notas/a.md", "texto", "sha-antigo", undefined);
  });

  it("atualiza o cache com o sha REAL do GitHub, não com o sha enviado", async () => {
    vi.mocked(gravar).mockResolvedValue("sha-novo");
    const { result } = renderHook(() => useSalvar(cfg));

    await act(async () => {
      await result.current.salvarTexto("notas/a.md", "texto", "sha-antigo");
    });

    const [caminho, texto, , sha] = vi.mocked(atualizarCacheLocal).mock.calls[0];
    expect(caminho).toBe("notas/a.md");
    expect(texto).toBe("texto");
    expect(sha).toBe("sha-novo");
  });

  it("só toca no cache DEPOIS de gravar() resolver", async () => {
    const ordem: string[] = [];
    vi.mocked(gravar).mockImplementation(async () => {
      ordem.push("gravar");
      return "sha-novo";
    });
    vi.mocked(atualizarCacheLocal).mockImplementation(() => {
      ordem.push("atualizarCacheLocal");
    });
    vi.mocked(invalidarCache).mockImplementation(() => {
      ordem.push("invalidarCache");
    });

    const { result } = renderHook(() => useSalvar(cfg));
    await act(async () => {
      await result.current.salvarTexto("notas/a.md", "texto", "sha");
    });

    expect(ordem).toEqual(["gravar", "atualizarCacheLocal", "invalidarCache"]);
  });

  it("dispara 'acervo-atualizado' para as outras telas sincronizarem", async () => {
    vi.mocked(gravar).mockResolvedValue("sha-novo");
    const ouvinte = vi.fn();
    window.addEventListener("acervo-atualizado", ouvinte);

    const { result } = renderHook(() => useSalvar(cfg));
    await act(async () => {
      await result.current.salvarTexto("notas/a.md", "texto", "sha");
    });

    expect(ouvinte).toHaveBeenCalledTimes(1);
    window.removeEventListener("acervo-atualizado", ouvinte);
  });

  it("repassa a mensagem de commit quando ela é dada", async () => {
    vi.mocked(gravar).mockResolvedValue("sha-novo");
    const { result } = renderHook(() => useSalvar(cfg));

    await act(async () => {
      await result.current.salvarTexto("notas/a.md", "t", "s", "minha mensagem");
    });

    expect(gravar).toHaveBeenCalledWith(cfg, "notas/a.md", "t", "s", "minha mensagem");
  });
});

describe("useSalvar — falhas", () => {
  it("guarda o erro no estado e repassa a exceção para quem chamou", async () => {
    vi.mocked(gravar).mockRejectedValue(new Error("409 conflito"));
    const { result } = renderHook(() => useSalvar(cfg));

    await act(async () => {
      await expect(
        result.current.salvarTexto("notas/a.md", "texto", "sha"),
      ).rejects.toThrow("409 conflito");
    });

    await waitFor(() => expect(result.current.erro).toBe("409 conflito"));
  });

  it("NÃO envenena o cache quando a gravação falha", async () => {
    vi.mocked(gravar).mockRejectedValue(new Error("falhou"));
    const { result } = renderHook(() => useSalvar(cfg));

    await act(async () => {
      await result.current.salvarTexto("notas/a.md", "texto", "sha").catch(() => {});
    });

    expect(atualizarCacheLocal).not.toHaveBeenCalled();
    expect(invalidarCache).not.toHaveBeenCalled();
  });

  it("não anuncia 'acervo-atualizado' quando a gravação falha", async () => {
    vi.mocked(gravar).mockRejectedValue(new Error("falhou"));
    const ouvinte = vi.fn();
    window.addEventListener("acervo-atualizado", ouvinte);

    const { result } = renderHook(() => useSalvar(cfg));
    await act(async () => {
      await result.current.salvarTexto("notas/a.md", "texto", "sha").catch(() => {});
    });

    expect(ouvinte).not.toHaveBeenCalled();
    window.removeEventListener("acervo-atualizado", ouvinte);
  });

  it("baixa o sinalizador de salvando mesmo depois de falhar", async () => {
    vi.mocked(gravar).mockRejectedValue(new Error("falhou"));
    const { result } = renderHook(() => useSalvar(cfg));

    await act(async () => {
      await result.current.salvarTexto("notas/a.md", "texto", "sha").catch(() => {});
    });

    await waitFor(() => expect(result.current.salvando).toBe(false));
  });

  it("limparErro zera a mensagem", async () => {
    vi.mocked(gravar).mockRejectedValue(new Error("falhou"));
    const { result } = renderHook(() => useSalvar(cfg));

    await act(async () => {
      await result.current.salvarTexto("notas/a.md", "t", "s").catch(() => {});
    });
    await waitFor(() => expect(result.current.erro).toBe("falhou"));

    act(() => result.current.limparErro());
    await waitFor(() => expect(result.current.erro).toBe(""));
  });

  it("um save bem-sucedido limpa o erro do save anterior", async () => {
    vi.mocked(gravar).mockRejectedValueOnce(new Error("falhou"));
    const { result } = renderHook(() => useSalvar(cfg));

    await act(async () => {
      await result.current.salvarTexto("notas/a.md", "t", "s").catch(() => {});
    });
    await waitFor(() => expect(result.current.erro).toBe("falhou"));

    vi.mocked(gravar).mockResolvedValue("sha-novo");
    await act(async () => {
      await result.current.salvarTexto("notas/a.md", "t", "s");
    });

    await waitFor(() => expect(result.current.erro).toBe(""));
  });
});

describe("useSalvar — apagarItem", () => {
  it("apaga, invalida o cache e anuncia a mudança", async () => {
    vi.mocked(apagar).mockResolvedValue(undefined);
    const ouvinte = vi.fn();
    window.addEventListener("acervo-atualizado", ouvinte);

    const { result } = renderHook(() => useSalvar(cfg));
    await act(async () => {
      await result.current.apagarItem("notas/a.md", "sha");
    });

    expect(apagar).toHaveBeenCalledWith(cfg, "notas/a.md", "sha");
    expect(invalidarCache).toHaveBeenCalled();
    expect(ouvinte).toHaveBeenCalledTimes(1);
    window.removeEventListener("acervo-atualizado", ouvinte);
  });

  it("não invalida o cache quando o apagar falha", async () => {
    vi.mocked(apagar).mockRejectedValue(new Error("404"));
    const { result } = renderHook(() => useSalvar(cfg));

    await act(async () => {
      await result.current.apagarItem("notas/a.md", "sha").catch(() => {});
    });

    expect(invalidarCache).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.erro).toBe("404"));
  });
});
