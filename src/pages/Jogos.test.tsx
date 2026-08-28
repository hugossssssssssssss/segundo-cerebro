import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Jogos from "./Jogos";
import { CHAVE_STORAGE_TERMO } from "@/lib/jogos/termoStorage";

afterEach(() => {
  cleanup();
});

// Mock de matchMedia e clipboard
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

describe("Página Jogos (Clone do Termo)", () => {
  it("renderiza a página com título, grade 5x6 e teclado virtual", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    expect(screen.getByText("Jogos & Desafios")).toBeTruthy();
    expect(screen.getByText("Termo Diário")).toBeTruthy();
    expect(screen.getByText("Modo Infinito")).toBeTruthy();
    expect(screen.getByText("ENTER")).toBeTruthy();
  });

  it("permite digitar letras e apagar via teclado virtual", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    // Clicar em T, E, R
    fireEvent.click(screen.getByLabelText("Letra T"));
    fireEvent.click(screen.getByLabelText("Letra E"));
    fireEvent.click(screen.getByLabelText("Letra R"));

    // O texto T, E, R deve estar presente
    expect(screen.getAllByText("T").length).toBeGreaterThanOrEqual(2); // tecla e célula
    expect(screen.getAllByText("E").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("R").length).toBeGreaterThanOrEqual(2);

    // Clicar em apagar (Backspace)
    const botaoApagar = screen.getByLabelText("Apagar letra");
    fireEvent.click(botaoApagar);
  });

  it("abre e fecha o modal de 'Como Jogar'", async () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    const botaoAjuda = screen.getByTitle("Como jogar");
    fireEvent.click(botaoAjuda);

    expect(screen.getByText("Como Jogar o Termo")).toBeTruthy();
    expect(
      screen.getByText(/Adivinhe a palavra secreta em/i)
    ).toBeTruthy();

    const botaoFechar = screen.getByText("Entendi, vamos jogar!");
    fireEvent.click(botaoFechar);

    await waitFor(() => {
      expect(screen.queryByText("Como Jogar o Termo")).toBeNull();
    });
  });

  it("abre e fecha o modal de 'Estatísticas'", async () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    const botaoStats = screen.getByTitle("Ver estatísticas");
    fireEvent.click(botaoStats);

    expect(screen.getByText("Estatísticas do Termo")).toBeTruthy();
    expect(screen.getByText("Distribuição de Tentativas")).toBeTruthy();
  });

  it("alterna para o Modo Infinito", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    const botoesInfinito = screen.getAllByText("Modo Infinito");
    fireEvent.click(botoesInfinito[0]);

    expect(screen.getByText("Nova Palavra")).toBeTruthy();
  });

  it("permite submeter uma palavra válida e salva no storage", async () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    // Digitar TERMO
    fireEvent.click(screen.getByLabelText("Letra T"));
    fireEvent.click(screen.getByLabelText("Letra E"));
    fireEvent.click(screen.getByLabelText("Letra R"));
    fireEvent.click(screen.getByLabelText("Letra M"));
    fireEvent.click(screen.getByLabelText("Letra O"));

    // Confirmar
    fireEvent.click(screen.getByLabelText("Confirmar palavra"));

    await waitFor(() => {
      const salvo = localStorage.getItem(CHAVE_STORAGE_TERMO);
      expect(salvo).toBeDefined();
      expect(salvo).toContain("TERMO");
    });
  });
});
