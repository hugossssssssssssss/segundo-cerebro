import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Jogos from "./Jogos";
import { TODOS_CREDITOS_OPEN_SOURCE } from "@/lib/creditosOpenSource";

describe("Página Jogos (Hub de Jogos: Termo e Palavras Cruzadas)", () => {
  it("renderiza o Hub de Jogos com abas de Termo e Palavras Cruzadas sem rodapé inventado", () => {
    render(
      <MemoryRouter>
        <Jogos />
      </MemoryRouter>
    );

    expect(screen.getByText("Jogos & Desafios")).toBeTruthy();
    expect(screen.getAllByText("Termo").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Palavras Cruzadas").length).toBeGreaterThanOrEqual(1);
    // Não possui rodapé inventado na tela; créditos pertencem ao modal padrão
    expect(screen.queryByText("Créditos & Motores Open Source dos Jogos")).toBeNull();
  });

  it("garante que os motores open source dos jogos estão registrados para o modal padrão", () => {
    const ids = TODOS_CREDITOS_OPEN_SOURCE.map((c) => c.id);
    expect(ids).toContain("termo-lingle");
    expect(ids).toContain("cruzadinha-react");

    const creditoTermo = TODOS_CREDITOS_OPEN_SOURCE.find((c) => c.id === "termo-lingle");
    expect(creditoTermo?.rotas).toContain("/jogos");

    const creditoCruzadinha = TODOS_CREDITOS_OPEN_SOURCE.find((c) => c.id === "cruzadinha-react");
    expect(creditoCruzadinha?.rotas).toContain("/jogos");
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
