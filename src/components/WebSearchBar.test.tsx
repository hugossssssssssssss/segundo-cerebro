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

  it("deve renderizar o input de busca e seletor de motores", () => {
    render(<WebSearchBar modo="widget" />);

    expect(screen.getByRole("combobox", { name: /escolher buscador/i })).toBeTruthy();
    expect(screen.getByPlaceholderText(/pesquisar no google/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /filtros/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /buscar/i })).toBeTruthy();
  });

  it("permite alterar o buscador padrão e atualiza o placeholder", () => {
    render(<WebSearchBar modo="widget" />);

    const select = screen.getByRole("combobox", { name: /escolher buscador/i });
    fireEvent.change(select, { target: { value: "duckduckgo" } });

    expect(screen.getByPlaceholderText(/pesquisar no duckduckgo/i)).toBeTruthy();
  });

  it("chama aoSubmeter com a query correta ao submeter busca", () => {
    const aoSubmeter = vi.fn();
    render(<WebSearchBar modo="widget" aoSubmeter={aoSubmeter} />);

    const input = screen.getByPlaceholderText(/pesquisar no google/i);
    fireEvent.change(input, { target: { value: "design system" } });

    const botaoBuscar = screen.getByRole("button", { name: /buscar/i });
    fireEvent.click(botaoBuscar);

    expect(aoSubmeter).toHaveBeenCalledWith("design system", "google");
  });
});
