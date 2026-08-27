import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ModalTourGuiado } from "./ModalTourGuiado";

describe("ModalTourGuiado", () => {
  afterEach(() => {
    cleanup();
  });

  it("não renderiza nada se aberta=false", () => {
    render(<ModalTourGuiado aberta={false} aoFechar={() => {}} />);
    expect(screen.queryByText(/Tour Guiado pelo Klaus/i)).toBeNull();
  });

  it("renderiza o primeiro passo do tour quando aberta=true", () => {
    render(<ModalTourGuiado aberta={true} aoFechar={() => {}} />);
    expect(screen.getByText(/Tour Guiado pelo Klaus/i)).toBeTruthy();
    expect(screen.getAllByText(/Notas Conectadas/i).length).toBeGreaterThan(0);
  });

  it("permite navegar para o próximo passo do tour", () => {
    render(<ModalTourGuiado aberta={true} aoFechar={() => {}} />);
    const botaoProximo = screen.getByRole("button", { name: /Próximo/i });
    fireEvent.click(botaoProximo);

    expect(screen.getByText(/Tarefas, Kanban & Foco Pomodoro/i)).toBeTruthy();
  });

  it("chama aoFechar ao clicar em Fechar ou Pular", () => {
    const aoFechar = vi.fn();
    render(<ModalTourGuiado aberta={true} aoFechar={aoFechar} />);
    const botaoPular = screen.getByRole("button", { name: /Pular tour/i });
    fireEvent.click(botaoPular);
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });
});

