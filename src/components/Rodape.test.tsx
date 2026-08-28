import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Rodape } from "./Rodape";

describe("Rodape", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderiza o rodapé com informações de identidade, versão e status", () => {
    render(
      <MemoryRouter>
        <Rodape />
      </MemoryRouter>
    );

    expect(screen.getByTestId("rodape-klaus")).toBeTruthy();
    expect(screen.getByText("Klaus")).toBeTruthy();
    expect(screen.getByText(/Notas & Conhecimento/i)).toBeTruthy();
    expect(screen.getByText(/Tarefas & Projetos/i)).toBeTruthy();
    expect(screen.getByText(/Status em Tempo Real/i)).toBeTruthy();
  });

  it("renderiza atalhos de teclado principais adaptados ao sistema operacional", () => {
    render(
      <MemoryRouter>
        <Rodape />
      </MemoryRouter>
    );

    expect(screen.getByText(/^(⌘K|Ctrl\+K)$/)).toBeTruthy();
    expect(screen.getByText(/^(⌘J|Ctrl\+J)$/)).toBeTruthy();
    expect(screen.getByText(/^(⌘B|Ctrl\+B)$/)).toBeTruthy();
  });

  it("possui botão de rolar para o topo e executa scrollTo", () => {
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(
      <MemoryRouter>
        <Rodape />
      </MemoryRouter>
    );

    const botaoTopo = screen.getByRole("button", { name: /Voltar ao topo da página/i });
    expect(botaoTopo).toBeTruthy();

    fireEvent.click(botaoTopo);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
