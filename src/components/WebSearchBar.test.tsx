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

  it("deve renderizar o input de busca, abas de motores e botões", () => {
    render(<WebSearchBar modo="widget" />);

    expect(screen.getByRole("button", { name: /google/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /bing/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /duckduckgo/i })).toBeTruthy();
    expect(screen.getByPlaceholderText(/o que você deseja pesquisar/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /filtros/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /buscar/i })).toBeTruthy();
  });

  it("permite alternar o motor de busca pelas abas e atualiza o placeholder", () => {
    render(<WebSearchBar modo="widget" />);

    const botaoDuck = screen.getByRole("button", { name: /duckduckgo/i });
    fireEvent.click(botaoDuck);

    expect(screen.getByPlaceholderText(/pesquise com privacidade no duckduckgo/i)).toBeTruthy();
  });

  it("abre o painel de filtros com atalhos e categorias principais", () => {
    render(<WebSearchBar modo="widget" />);

    const botaoFiltros = screen.getByRole("button", { name: /filtros/i });
    fireEvent.click(botaoFiltros);

    expect(screen.getByText(/apenas neste site/i)).toBeTruthy();
    expect(screen.getByText(/documentos em pdf/i)).toBeTruthy();
    expect(screen.getByText(/frase ou expressão exata/i)).toBeTruthy();
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
