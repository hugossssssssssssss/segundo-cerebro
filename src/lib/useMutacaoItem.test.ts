import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMutacaoItem } from "./useMutacaoItem";
import type { ItemBase } from "./tipos";

vi.mock("./useSalvar", () => ({
  useSalvar: () => ({
    salvarTexto: vi.fn().mockResolvedValue("novo_sha_123"),
    apagarItem: vi.fn().mockResolvedValue(undefined),
    salvando: false,
    erro: "",
    limparErro: vi.fn(),
  }),
}));

interface ItemMock extends ItemBase {
  tags: string[];
}

describe("useMutacaoItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executa mutar imediato serializando o documento", async () => {
    const serializar = vi.fn().mockReturnValue({
      dados: { titulo: "Item Teste", tipo: "mock" },
      corpo: "Corpo do item",
    });

    const { result } = renderHook(() =>
      useMutacaoItem<ItemMock>({
        serializar,
      })
    );

    const item: ItemMock = {
      caminho: "processos/p1.md",
      sha: "sha_antigo",
      bruto: {},
      titulo: "Item Teste",
      corpo: "Corpo do item",
      tags: [],
    };

    let sha = "";
    await act(async () => {
      sha = await result.current.mutar(item, "atualiza teste", true);
    });

    expect(sha).toBe("novo_sha_123");
    expect(serializar).toHaveBeenCalledWith(item);
  });
});
