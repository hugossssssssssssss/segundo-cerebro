import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { Tooltip } from "./tooltip";

describe("Tooltip (Dica Flutuante)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renderiza o elemento filho e exibe a dica ao focar ou passar o mouse", async () => {
    render(
      <Tooltip conteudo="Dica de teste" atalho="⌘K" atrasoMs={100}>
        <button>Botão Teste</button>
      </Tooltip>
    );

    const botao = screen.getByRole("button", { name: "Botão Teste" });
    expect(botao).toBeDefined();

    // No Radix UI Tooltip, o gatilho responde a focus/pointerEnter
    act(() => {
      fireEvent.focus(botao);
      vi.advanceTimersByTime(150);
    });

    const dica = screen.getByText("Dica de teste");
    expect(dica).toBeDefined();

    const atalho = screen.getByText(/^(⌘K|Ctrl\+K)$/);
    expect(atalho).toBeDefined();

    // Blur ou saída esconde a dica
    act(() => {
      fireEvent.blur(botao);
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByText("Dica de teste")).toBeNull();
  });

  it("aceita prop 'content' como alias de 'conteudo'", () => {
    render(
      <Tooltip content="Dica via alias content" atrasoMs={100}>
        <button>Ação Secundária</button>
      </Tooltip>
    );

    const botao = screen.getByRole("button", { name: "Ação Secundária" });
    act(() => {
      fireEvent.focus(botao);
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByText("Dica via alias content")).toBeDefined();
  });

  it("não exibe a dica se a prop 'desabilitado' estiver ativa", () => {
    render(
      <Tooltip conteudo="Não deve aparecer" desabilitado atrasoMs={100}>
        <button>Botão Desativado</button>
      </Tooltip>
    );

    const botao = screen.getByRole("button", { name: "Botão Desativado" });
    act(() => {
      fireEvent.focus(botao);
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByText("Não deve aparecer")).toBeNull();
  });

  it("permite exibir tooltip em botão desabilitado (disabled)", () => {
    render(
      <Tooltip conteudo="Explicação de por que está desabilitado" atrasoMs={100}>
        <button disabled>Botão Inativo</button>
      </Tooltip>
    );

    // Quando o botão é disabled, o Tooltip envolve com um span acessível tabIndex={0}
    const container = screen.getByRole("presentation");
    expect(container).toBeDefined();

    act(() => {
      fireEvent.focus(container);
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByText("Explicação de por que está desabilitado")).toBeDefined();
  });
});
