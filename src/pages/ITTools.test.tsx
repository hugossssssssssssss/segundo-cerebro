import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ITTools from "./ITTools";

describe("Página ITTools", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderiza o cabeçalho e a lista de ferramentas", () => {
    render(
      <MemoryRouter>
        <ITTools />
      </MemoryRouter>
    );

    expect(screen.getByText("IT-Tools")).toBeDefined();
    expect(screen.getByText("Conversor de Unidades (px / rem / pt)")).toBeDefined();
    expect(screen.getByText("Calculadora de Aspect Ratio")).toBeDefined();
    expect(screen.getByText("Verificador de Contraste WCAG")).toBeDefined();
  });

  it("permite filtrar ferramentas pela busca", () => {
    render(
      <MemoryRouter>
        <ITTools />
      </MemoryRouter>
    );

    const inputBusca = screen.getByPlaceholderText("Buscar ferramenta...");
    fireEvent.change(inputBusca, { target: { value: "wcag" } });

    expect(screen.getByText("Verificador de Contraste WCAG")).toBeDefined();
    expect(screen.queryByText("Calculadora de Aspect Ratio")).toBeNull();
  });

  it("abre a tela da ferramenta ao clicar", () => {
    render(
      <MemoryRouter>
        <ITTools />
      </MemoryRouter>
    );

    const cardUnidades = screen.getByText("Conversor de Unidades (px / rem / pt)");
    fireEvent.click(cardUnidades);

    expect(screen.getByText("Voltar para todas as ferramentas")).toBeDefined();
    expect(screen.getByText("Valor de Entrada")).toBeDefined();
  });
});
