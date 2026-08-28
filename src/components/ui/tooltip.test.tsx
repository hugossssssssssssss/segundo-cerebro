import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Tooltip } from "./tooltip";

describe("Tooltip (Dica Flutuante)", () => {
  it("renderiza o elemento filho e exibe a dica ao passar o mouse", async () => {
    vi.useFakeTimers();

    render(
      <Tooltip conteudo="Dica de teste" atalho="⌘K">
        <button>Botão Teste</button>
      </Tooltip>
    );

    const botao = screen.getByRole("button", { name: /botão teste/i });
    expect(botao).toBeDefined();

    // Mouse enter dispara o timer de atraso
    fireEvent.mouseEnter(botao);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Tooltip renderizado no portal do body
    const dica = screen.getByText("Dica de teste");
    expect(dica).toBeDefined();

    const atalho = screen.getByText(/^(⌘K|Ctrl\+K)$/);
    expect(atalho).toBeDefined();

    // Mouse leave esconde a dica
    fireEvent.mouseLeave(botao);
    expect(screen.queryByText("Dica de teste")).toBeNull();

    vi.useRealTimers();
  });

  it("não exibe a dica se estiver desabilitado", () => {
    vi.useFakeTimers();

    render(
      <Tooltip conteudo="Não deve aparecer" desabilitado>
        <button>Desabilitado</button>
      </Tooltip>
    );

    const botao = screen.getByRole("button", { name: /desabilitado/i });
    fireEvent.mouseEnter(botao);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText("Não deve aparecer")).toBeNull();
    vi.useRealTimers();
  });
});
