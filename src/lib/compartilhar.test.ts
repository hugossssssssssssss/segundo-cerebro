import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  suportaCompartilhamento,
  compartilhar,
  compartilharNota,
  compartilharTarefa,
  compartilharReferencia,
} from "./compartilhar";
import type { Tarefa } from "./tarefas";

describe("compartilhar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve detectar suporte à Web Share API", () => {
    // Sem share no navigator
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(suportaCompartilhamento()).toBe(false);

    // Com share no navigator
    Object.defineProperty(navigator, "share", {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
    expect(suportaCompartilhamento()).toBe(true);
  });

  it("deve chamar navigator.share quando disponível", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: shareMock,
      configurable: true,
      writable: true,
    });

    const res = await compartilhar({
      titulo: "Minha Nota",
      texto: "Conteúdo da nota",
      url: "https://exemplo.com",
    });

    expect(shareMock).toHaveBeenCalledWith({
      title: "Minha Nota",
      text: "Conteúdo da nota",
      url: "https://exemplo.com",
    });
    expect(res).toEqual({ sucesso: true, metodo: "nativo" });
  });

  it("deve fazer fallback para cópia no clipboard quando share não existir", async () => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const res = await compartilhar({
      titulo: "Minha Nota",
      texto: "Conteúdo da nota",
    });

    expect(writeTextMock).toHaveBeenCalledWith("Minha Nota\n\nConteúdo da nota");
    expect(res).toEqual({ sucesso: true, metodo: "copiado" });
  });

  it("deve formatar e compartilhar uma tarefa corretamente", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: shareMock,
      configurable: true,
      writable: true,
    });

    const tarefa: Tarefa = {
      caminho: "tarefas/comprar-cafe.md",
      sha: "123",
      bruto: {},
      tags: ["compras"],
      titulo: "Comprar Café Especial",
      status: "a-fazer",
      prioridade: "alta",
      prazo: "2026-09-10",
      corpo: "- [x] Grãos arábica\n- [ ] Filtro v60\n\nComprar na torrefação local.",
    };

    const res = await compartilharTarefa(tarefa);
    expect(res.sucesso).toBe(true);
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Comprar Café Especial",
        text: expect.stringContaining("Subtarefas:"),
      })
    );
  });

  it("deve formatar nota e referência corretamente", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: shareMock,
      configurable: true,
      writable: true,
    });

    await compartilharNota("Ideia de App", "Criar um app simples.");
    expect(shareMock).toHaveBeenCalledWith({
      title: "Ideia de App",
      text: "Criar um app simples.",
      url: undefined,
    });

    await compartilharReferencia("Design Minimalista", "https://dribbble.com/123", "Gostei da paleta.");
    expect(shareMock).toHaveBeenCalledWith({
      title: "Referência: Design Minimalista",
      text: "Gostei da paleta.",
      url: "https://dribbble.com/123",
    });
  });
});
