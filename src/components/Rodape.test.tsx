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
    expect(screen.getByText(/Status do Sistema/i)).toBeTruthy();
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

  it("exibe botão de créditos Open Source e abre modal", () => {
    render(
      <MemoryRouter>
        <Rodape />
      </MemoryRouter>
    );

    const botaoCreditos = screen.getByRole("button", { name: /Créditos Open Source/i });
    expect(botaoCreditos).toBeTruthy();

    fireEvent.click(botaoCreditos);
    expect(screen.getByText(/Tecnologias & Créditos Open Source/i)).toBeTruthy();
  });

  it("garante que os créditos não poluem o rodapé inline e ficam exclusivamente no modal", () => {
    render(
      <MemoryRouter initialEntries={["/lousas"]}>
        <Rodape />
      </MemoryRouter>
    );

    // Não renderiza banner inline de créditos no rodapé
    expect(screen.queryByTestId("credito-opensource-banner")).toBeNull();

    // Créditos continuam disponíveis exclusivamente ao abrir o modal
    const botaoCreditos = screen.getByRole("button", { name: /Créditos Open Source/i });
    fireEvent.click(botaoCreditos);
    expect(screen.getByText(/Tecnologias & Créditos Open Source/i)).toBeTruthy();
  });
});

