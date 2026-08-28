import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Jogos from "./Jogos";
import { CHAVE_STORAGE_TERMO } from "@/lib/jogos/termoStorage";

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

describe("Página Jogos (Termo, Dueto e Quarteto)", () => {
  it("renderiza a página com abas de Termo, Dueto e Quarteto", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    expect(screen.getByText("Jogos & Desafios")).toBeTruthy();
    expect(screen.getByText("Termo")).toBeTruthy();
    expect(screen.getByText("Dueto")).toBeTruthy();
    expect(screen.getByText("Quarteto")).toBeTruthy();
    expect(screen.getByText("Diário")).toBeTruthy();
    expect(screen.getByText("Infinito")).toBeTruthy();
  });

  it("permite clicar em células individuais para posicionar foco e digitar", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    // Clicar em T, depois E
    fireEvent.click(screen.getByLabelText("Letra T"));
    fireEvent.click(screen.getByLabelText("Letra E"));

    // O texto T e E deve estar na tela
    expect(screen.getAllByText("T").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("E").length).toBeGreaterThanOrEqual(2);
  });

  it("aceita digitação via teclado físico (keydown)", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    // Digitar 'G', 'A', 'T', 'O', 'S' no teclado físico
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyDown(window, { key: "t" });
    fireEvent.keyDown(window, { key: "o" });
    fireEvent.keyDown(window, { key: "s" });

    expect(screen.getAllByText("G").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("A").length).toBeGreaterThanOrEqual(2);

    // Apagar com Backspace
    fireEvent.keyDown(window, { key: "Backspace" });
  });

  it("permite alternar para o modo Dueto (2 tabuleiros)", () => {
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

  it("permite alternar para o modo Quarteto (4 tabuleiros)", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    const botaoQuarteto = screen.getByText("Quarteto");
    fireEvent.click(botaoQuarteto);

    expect(screen.getByText("Palavra 1")).toBeTruthy();
    expect(screen.getByText("Palavra 2")).toBeTruthy();
    expect(screen.getByText("Palavra 3")).toBeTruthy();
    expect(screen.getByText("Palavra 4")).toBeTruthy();
  });

  it("permite alternar para o Modo Infinito do Dueto", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    // Selecionar Dueto
    fireEvent.click(screen.getByText("Dueto"));

    // Selecionar Infinito
    fireEvent.click(screen.getByText("Infinito"));

    expect(screen.getByText("Nova Palavra")).toBeTruthy();
  });

  it("permite submeter palavra e persiste no storage", async () => {
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

    fireEvent.click(screen.getByLabelText("Confirmar palavra"));

    await waitFor(() => {
      const salvo = localStorage.getItem(CHAVE_STORAGE_TERMO);
      expect(salvo).toBeDefined();
      expect(salvo).toContain("TERMO");
    });
  });
});
