import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Jogos from "./Jogos";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("Página Jogos (Hub de Jogos: Termo e Palavras Cruzadas)", () => {
  it("renderiza o Hub de Jogos com abas de Termo e Palavras Cruzadas e créditos", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    expect(screen.getByText("Jogos & Desafios")).toBeTruthy();
    expect(screen.getByText("Termo")).toBeTruthy();
    expect(screen.getByText("Palavras Cruzadas")).toBeTruthy();
    expect(screen.getByText("Créditos & Motores Open Source dos Jogos")).toBeTruthy();
    expect(screen.getByText("Termo & Lingle")).toBeTruthy();
    expect(screen.getByText("React Crossword")).toBeTruthy();
  });

  it("permite alternar para a pastinha de Palavras Cruzadas", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    const botaoCruzadinha = screen.getByText("Palavras Cruzadas");
    fireEvent.click(botaoCruzadinha);

    expect(screen.getByText("Horizontais (Across)")).toBeTruthy();
    expect(screen.getByText("Verticais (Down)")).toBeTruthy();
    expect(screen.getByText("Verificar")).toBeTruthy();
  });

  it("permite digitar letras e apagar no Termo", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText("Letra T"));
    fireEvent.click(screen.getByLabelText("Letra E"));

    expect(screen.getAllByText("T").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("E").length).toBeGreaterThanOrEqual(2);
  });

  it("permite alternar entre modalidades do Termo (Dueto e Quarteto)", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    const botaoDueto = screen.getByText("Dueto");
    fireEvent.click(botaoDueto);

    expect(screen.getByText("Palavra 1")).toBeTruthy();
    expect(screen.getByText("Palavra 2")).toBeTruthy();
  });
});
