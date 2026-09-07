import { describe, it, expect, vi } from "vitest";
import {
  gerarPropsArrasto,
  calcularSlotPorCoordenadas,
  TIPO_MIME_ITEM_KLAUS,
  EVENTO_SOLTAR_ITEM,
} from "./arrastoItem";

describe("arrastoItem", () => {
  it("calcularSlotPorCoordenadas calcula o slot correto baseado em X", () => {
    const w = 1000;
    expect(calcularSlotPorCoordenadas(100, w)).toBe("esquerda");
    expect(calcularSlotPorCoordenadas(340, w)).toBe("esquerda");
    expect(calcularSlotPorCoordenadas(500, w)).toBe("popup");
    expect(calcularSlotPorCoordenadas(660, w)).toBe("direita");
    expect(calcularSlotPorCoordenadas(900, w)).toBe("direita");
  });

  it("gerarPropsArrasto cria manipuladores dragStart e dragEnd com cálculo de slot", () => {
    const item = { caminho: "tarefas/fazer-algo.md", titulo: "Tarefa 1" };
    const props = gerarPropsArrasto(item);

    expect(props.draggable).toBe(true);
    expect(typeof props.onDragStart).toBe("function");
    expect(typeof props.onDragEnd).toBe("function");

    const dataTransferMock: Record<string, string> = {};
    const eStart = {
      dataTransfer: {
        setData: (tipo: string, val: string) => {
          dataTransferMock[tipo] = val;
        },
        effectAllowed: "",
      },
    } as any;

    props.onDragStart!(eStart);
    expect(dataTransferMock[TIPO_MIME_ITEM_KLAUS]).toContain("tarefas/fazer-algo.md");
    expect(dataTransferMock["text/plain"]).toBe("tarefas/fazer-algo.md");

    const mockListener = vi.fn();
    window.addEventListener(EVENTO_SOLTAR_ITEM, mockListener);

    const eEnd = {
      clientX: 100,
      clientY: 300,
    } as any;

    props.onDragEnd!(eEnd);
    expect(mockListener).toHaveBeenCalledTimes(1);

    window.removeEventListener(EVENTO_SOLTAR_ITEM, mockListener);
  });
});
