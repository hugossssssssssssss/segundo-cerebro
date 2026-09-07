import { describe, it, expect, vi } from "vitest";
import {
  gerarPropsArrasto,
  obterItemArrastadoAtual,
  definirItemArrastadoAtual,
  TIPO_MIME_ITEM_KLAUS,
  EVENTO_DRAG_INICIADO,
  EVENTO_DRAG_FINALIZADO,
} from "./arrastoItem";

describe("arrastoItem", () => {
  it("armazena e limpa item arrastado atual e emite eventos", () => {
    const mockIniciado = vi.fn();
    const mockFinalizado = vi.fn();

    window.addEventListener(EVENTO_DRAG_INICIADO, mockIniciado);
    window.addEventListener(EVENTO_DRAG_FINALIZADO, mockFinalizado);

    const item = { caminho: "notas/teste.md", titulo: "Nota de Teste", rotuloTipo: "Nota" };
    definirItemArrastadoAtual(item);

    expect(obterItemArrastadoAtual()).toEqual(item);
    expect(mockIniciado).toHaveBeenCalledTimes(1);

    definirItemArrastadoAtual(null);
    expect(obterItemArrastadoAtual()).toBeNull();
    expect(mockFinalizado).toHaveBeenCalledTimes(1);

    window.removeEventListener(EVENTO_DRAG_INICIADO, mockIniciado);
    window.removeEventListener(EVENTO_DRAG_FINALIZADO, mockFinalizado);
  });

  it("gerarPropsArrasto cria manipuladores dragStart e dragEnd corretos", () => {
    const item = { caminho: "tarefas/fazer-algo.md", titulo: "Tarefa 1" };
    const props = gerarPropsArrasto(item);

    expect(props.draggable).toBe(true);
    expect(typeof props.onDragStart).toBe("function");
    expect(typeof props.onDragEnd).toBe("function");

    const dataTransferMock: Record<string, string> = {};
    const e = {
      dataTransfer: {
        setData: (tipo: string, val: string) => {
          dataTransferMock[tipo] = val;
        },
        effectAllowed: "",
      },
    } as any;

    props.onDragStart!(e);
    expect(dataTransferMock[TIPO_MIME_ITEM_KLAUS]).toContain("tarefas/fazer-algo.md");
    expect(dataTransferMock["text/plain"]).toBe("tarefas/fazer-algo.md");
    expect(obterItemArrastadoAtual()).toEqual(item);

    props.onDragEnd!({} as any);
    expect(obterItemArrastadoAtual()).toBeNull();
  });
});
