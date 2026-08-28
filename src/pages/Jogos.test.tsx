import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Jogos from "./Jogos";

describe("Página Jogos (Hub de Jogos: Termo e Palavras Cruzadas)", () => {
  it("renderiza o Hub de Jogos com abas de Termo e Palavras Cruzadas e créditos", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    expect(screen.getByText("Jogos & Desafios")).toBeTruthy();
    expect(screen.getAllByText("Termo").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Palavras Cruzadas").length).toBeGreaterThanOrEqual(1);
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

    const botaoCruzadinha = screen.getAllByText("Palavras Cruzadas")[0];
    fireEvent.click(botaoCruzadinha);

    expect(screen.getByText("Horizontais (Across)")).toBeTruthy();
    expect(screen.getByText("Verticais (Down)")).toBeTruthy();
  });
});
