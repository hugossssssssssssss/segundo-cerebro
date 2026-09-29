import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GuardaExtensao } from "./GuardaExtensao";
import { salvarProjetosExtensoes } from "@/lib/klausProjects";

describe("GuardaExtensao", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("exibe aviso e botão para a biblioteca quando a extensão não está baixada", () => {
    render(
      <MemoryRouter>
        <GuardaExtensao idExtensao="conversor" nomeExtensao="Conversor de Formatos">
          <div data-testid="conteudo-secreto">Ferramenta Ativa</div>
        </GuardaExtensao>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("conteudo-secreto")).toBeNull();
    expect(screen.getByText("Conversor de Formatos não está instalada")).toBeTruthy();
    expect(screen.getByText("Instalar na Biblioteca")).toBeTruthy();
  });

  it("renderiza o conteúdo da ferramenta quando a extensão foi instalada no repositório", () => {
    salvarProjetosExtensoes([
      {
        id: "conversor",
        nome: "Conversor de Formatos",
        descricao: "Conversor",
        icone: "RefreshCw",
        categoria: "utilitarios",
        tipo: "nativa",
        ativo: true,
        origem: "catalogo",
      },
    ]);

    render(
      <MemoryRouter>
        <GuardaExtensao idExtensao="conversor" nomeExtensao="Conversor de Formatos">
          <div data-testid="conteudo-secreto">Ferramenta Ativa</div>
        </GuardaExtensao>
      </MemoryRouter>
    );

    expect(screen.getByTestId("conteudo-secreto")).toBeTruthy();
    expect(screen.getByText("Ferramenta Ativa")).toBeTruthy();
  });
});
