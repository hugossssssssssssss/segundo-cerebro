import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { WebSearchBar } from "./WebSearchBar";

describe("WebSearchBar Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("deve renderizar o input de busca e botão de filtros", () => {
    render(<WebSearchBar modo="widget" />);

    expect(screen.getByPlaceholderText(/o que você deseja pesquisar/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /filtros/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /buscar/i })).toBeTruthy();
  });

  it("abre o painel de propriedades e exibe campos Site, Tipo, Exatamente", () => {
    render(<WebSearchBar modo="widget" />);

    const botaoFiltros = screen.getByRole("button", { name: /filtros/i });
    fireEvent.click(botaoFiltros);

    expect(screen.getByText(/site:/i)).toBeTruthy();
    expect(screen.getByText(/tipo:/i)).toBeTruthy();
    expect(screen.getByText(/exatamente:/i)).toBeTruthy();
    expect(screen.getByText(/sem as palavras:/i)).toBeTruthy();
  });

  it("chama aoSubmeter com a query correta ao submeter busca", () => {
    const aoSubmeter = vi.fn();
    render(<WebSearchBar modo="widget" aoSubmeter={aoSubmeter} />);

    const input = screen.getByPlaceholderText(/o que você deseja pesquisar/i);
    fireEvent.change(input, { target: { value: "design system" } });

    const botaoBuscar = screen.getByRole("button", { name: /buscar/i });
    fireEvent.click(botaoBuscar);

    expect(aoSubmeter).toHaveBeenCalledWith("design system", "google");
  });
});
