/**
 * Testes do hook de carregamento.
 *
 * O que estes testes protegem:
 * - O laço infinito: um callback que dependa do tamanho da lista se recria a
 *   cada carga e dispara outra carga. O `jaCarregouRef` interno existe para
 *   quebrar esse laço, e um teste tem que provar que ele o quebra.
 * - O recarregamento silencioso: recarregar depois de salvar não pode piscar
 *   a tela inteira de volta para o spinner.
 * - O evento "acervo-atualizado": salvar numa aba tem que atualizar a outra.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

// Sem cleanup, os hooks dos testes anteriores continuam montados e ouvindo
// "acervo-atualizado" — o evento de um teste chega nos hooks de todos os
// outros e as atualizações param de chegar ao `result.current` deste.
afterEach(cleanup);

import { useItemRepo } from "./useItemRepo";
import type { ItemRepo } from "./repo";
import type { Settings } from "./settings";
import { PASTAS } from "./tipos";

vi.mock("./repo", () => ({
  carregarRepo: vi.fn(),
  daPasta: vi.fn((itens: ItemRepo[], pasta: string) =>
    itens.filter((i) => i.caminho.startsWith(pasta + "/")),
  ),
  arquivosIlegiveis: vi.fn(() => []),
}));

import { carregarRepo, daPasta, arquivosIlegiveis } from "./repo";

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

/** Um ItemRepo mínimo para os testes. */
function item(caminho: string, titulo = "Sem título"): ItemRepo {
  return {
    caminho,
    nome: caminho.split("/").pop()!,
    sha: "sha-" + caminho,
    tamanho: 10,
    texto: "",
    doc: { dados: { titulo }, corpo: "corpo" },
  };
}

const ACERVO = [
  item("notas/a.md", "Nota A"),
  item("notas/b.md", "Nota B"),
  item("tarefas/c.md", "Tarefa C"),
];

beforeEach(() => {
  // Reafirmado a cada teste: o wrapper de act da testing-library restaura
  // esta bandeira fora de um `finally`, então uma promessa rejeitada dentro
  // de um act deixa a bandeira presa em false e todos os `act` seguintes
  // viram no-ops silenciosos.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  // resetAllMocks e não clearAllMocks: `clear` zera só as chamadas registradas
  // e deixa a implementação de pé, então um mockRejectedValue de um teste
  // continuava valendo nos testes seguintes.
  vi.resetAllMocks();
  vi.mocked(daPasta).mockImplementation((itens: ItemRepo[], pasta: string) =>
    itens.filter((i) => i.caminho.startsWith(pasta + "/")),
  );
  vi.mocked(arquivosIlegiveis).mockReturnValue([]);
});

describe("useItemRepo — carregamento", () => {
  it("carrega, filtra pela pasta e converte os itens", async () => {
    vi.mocked(carregarRepo).mockResolvedValue(ACERVO);

    const { result } = renderHook(() =>
      useItemRepo(cfg, PASTAS.notas, (i) => i.caminho),
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.itens).toEqual(["notas/a.md", "notas/b.md"]);
    expect(result.current.acervo).toHaveLength(3);
    expect(result.current.erro).toBe("");
  });

  it("expõe o acervo inteiro, não só a pasta pedida", async () => {
    vi.mocked(carregarRepo).mockResolvedValue(ACERVO);

    const { result } = renderHook(() =>
      useItemRepo(cfg, PASTAS.notas, (i) => i.caminho),
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.acervo.map((i) => i.caminho)).toEqual([
      "notas/a.md",
      "notas/b.md",
      "tarefas/c.md",
    ]);
  });

  it("monta o mapa de títulos de TODAS as entidades, não só da pasta", async () => {
    vi.mocked(carregarRepo).mockResolvedValue(ACERVO);

    const { result } = renderHook(() =>
      useItemRepo(cfg, PASTAS.notas, (i) => i.caminho),
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.titulos).toEqual({
      "notas/a.md": "Nota A",
      "notas/b.md": "Nota B",
      "tarefas/c.md": "Tarefa C",
    });
  });

  it("repassa os arquivos ilegíveis para a tela poder avisar", async () => {
    vi.mocked(carregarRepo).mockResolvedValue(ACERVO);
    vi.mocked(arquivosIlegiveis).mockReturnValue(["notas/quebrada.md"]);

    const { result } = renderHook(() =>
      useItemRepo(cfg, PASTAS.notas, (i) => i.caminho),
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.ilegiveis).toEqual(["notas/quebrada.md"]);
  });

  it("não chama o GitHub quando a configuração está incompleta", async () => {
    const semToken = { ...cfg, githubToken: "" };
    const { result } = renderHook(() =>
      useItemRepo(semToken, PASTAS.notas, (i) => i.caminho),
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(carregarRepo).not.toHaveBeenCalled();
    expect(result.current.itens).toEqual([]);
  });

  it("carrega só uma vez na montagem — sem laço de recarregamento", async () => {
    vi.mocked(carregarRepo).mockResolvedValue(ACERVO);

    const { result } = renderHook(() =>
      useItemRepo(cfg, PASTAS.notas, (i) => i.caminho),
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));
    // Dá tempo para um eventual laço se manifestar.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(carregarRepo).toHaveBeenCalledTimes(1);
  });
});

describe("useItemRepo — erros", () => {
  it("guarda a mensagem de erro e sai do estado de carregando", async () => {
    vi.mocked(carregarRepo).mockRejectedValue(new Error("rede caiu"));

    const { result } = renderHook(() =>
      useItemRepo(cfg, PASTAS.notas, (i) => i.caminho),
    );

    await waitFor(() => expect(result.current.erro).toBe("rede caiu"));
    expect(result.current.carregando).toBe(false);
  });

  it("um recarregamento bem-sucedido limpa o erro anterior", async () => {
    vi.mocked(carregarRepo).mockRejectedValueOnce(new Error("rede caiu"));

    const { result } = renderHook(() =>
      useItemRepo(cfg, PASTAS.notas, (i) => i.caminho),
    );
    await waitFor(() => expect(result.current.erro).toBe("rede caiu"));

    vi.mocked(carregarRepo).mockResolvedValue(ACERVO);
    await act(async () => {
      result.current.recarregar();
    });

    await waitFor(() => expect(result.current.erro).toBe(""));
    expect(result.current.itens).toEqual(["notas/a.md", "notas/b.md"]);
  });
});

describe("useItemRepo — recarregar", () => {
  it("busca de novo e atualiza a lista", async () => {
    vi.mocked(carregarRepo).mockResolvedValue(ACERVO);

    const { result } = renderHook(() =>
      useItemRepo(cfg, PASTAS.notas, (i) => i.caminho),
    );
    await waitFor(() => expect(result.current.carregando).toBe(false));

    vi.mocked(carregarRepo).mockResolvedValue([...ACERVO, item("notas/nova.md", "Nova")]);
    await act(async () => {
      result.current.recarregar();
    });

    await waitFor(() =>
      expect(result.current.itens).toEqual(["notas/a.md", "notas/b.md", "notas/nova.md"]),
    );
    expect(carregarRepo).toHaveBeenCalledTimes(2);
  });

  it("recarrega em silêncio — não volta a tela para o spinner", async () => {
    vi.mocked(carregarRepo).mockResolvedValue(ACERVO);

    const { result } = renderHook(() =>
      useItemRepo(cfg, PASTAS.notas, (i) => i.caminho),
    );
    await waitFor(() => expect(result.current.carregando).toBe(false));

    let resolver: (v: ItemRepo[]) => void = () => {};
    vi.mocked(carregarRepo).mockReturnValue(
      new Promise<ItemRepo[]>((r) => {
        resolver = r;
      }),
    );

    await act(async () => {
      result.current.recarregar();
      // Deixa o microtask rodar sem resolver a busca — o hook já começou a
      // recarregar, mas a resposta do GitHub ainda não chegou.
      await Promise.resolve();
    });

    // Com a busca ainda pendente, a tela continua mostrando a lista antiga.
    expect(result.current.carregando).toBe(false);
    expect(result.current.itens).toEqual(["notas/a.md", "notas/b.md"]);

    await act(async () => {
      resolver(ACERVO);
    });
  });
});

describe("useItemRepo — evento acervo-atualizado", () => {
  it("recarrega quando outra tela anuncia que o acervo mudou", async () => {
    vi.mocked(carregarRepo).mockResolvedValue(ACERVO);

    const { result } = renderHook(() =>
      useItemRepo(cfg, PASTAS.notas, (i) => i.caminho),
    );
    await waitFor(() => expect(result.current.carregando).toBe(false));

    vi.mocked(carregarRepo).mockResolvedValue([...ACERVO, item("notas/de-outra-aba.md", "Outra")]);
    await act(async () => {
      window.dispatchEvent(new CustomEvent("acervo-atualizado"));
    });

    await waitFor(() =>
      expect(result.current.itens).toContain("notas/de-outra-aba.md"),
    );
  });

  it("desregistra o ouvinte ao desmontar — sem vazamento", async () => {
    vi.mocked(carregarRepo).mockResolvedValue(ACERVO);

    const { result, unmount } = renderHook(() =>
      useItemRepo(cfg, PASTAS.notas, (i) => i.caminho),
    );
    await waitFor(() => expect(result.current.carregando).toBe(false));

    unmount();
    vi.mocked(carregarRepo).mockClear();

    await act(async () => {
      window.dispatchEvent(new CustomEvent("acervo-atualizado"));
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(carregarRepo).not.toHaveBeenCalled();
  });
});

describe("useItemRepo — troca de pasta", () => {
  it("recarrega e refiltra quando a pasta muda", async () => {
    vi.mocked(carregarRepo).mockResolvedValue(ACERVO);

    const { result, rerender } = renderHook(
      ({ pasta }) => useItemRepo(cfg, pasta, (i: ItemRepo) => i.caminho),
      { initialProps: { pasta: PASTAS.notas as string as typeof PASTAS.notas } },
    );
    await waitFor(() => expect(result.current.itens).toEqual(["notas/a.md", "notas/b.md"]));

    rerender({ pasta: PASTAS.tarefas as unknown as typeof PASTAS.notas });

    await waitFor(() => expect(result.current.itens).toEqual(["tarefas/c.md"]));
  });
});
