import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SumarioNota } from "./SumarioNota";

afterEach(cleanup);

describe("SumarioNota", () => {
  it("renderiza contagem de palavras e tempo de leitura quando houver seções", () => {
    const texto = [
      "# Primeiro Título",
      "Um parágrafo de introdução detalhado com conteúdo relevante.",
      "## Segundo Título",
      "Outro parágrafo detalhando as seções da nota do usuário.",
    ].join("\n");

    render(<SumarioNota corpo={texto} />);

    expect(screen.getByText(/Sumário \(2 seções\)/)).toBeDefined();
    expect(screen.getByText(/palavras/)).toBeDefined();
    expect(screen.getByText(/min de leitura/)).toBeDefined();
  });

  it("expande e exibe itens de cabeçalho ao clicar", async () => {
    const texto = [
      "# Introdução",
      "Texto introdutório...",
      "## Objetivos de Design",
      "Mais texto...",
      "### Requisitos Visuais",
      "Mais texto...",
    ].join("\n");

    render(<SumarioNota corpo={texto} />);

    const gatilho = screen.getByText(/Sumário \(3 seções\)/);
    await userEvent.click(gatilho);

    expect(screen.getByText("Introdução")).toBeDefined();
    expect(screen.getByText("Objetivos de Design")).toBeDefined();
    expect(screen.getByText("Requisitos Visuais")).toBeDefined();
  });

  it("não polui a interface se a nota tiver menos de 2 seções", () => {
    const { container } = render(<SumarioNota corpo="Apenas uma linha simples." />);
    expect(container.firstChild).toBeNull();
  });

  it("não polui a interface se o texto for longo mas não tiver títulos", () => {
    const textoLongoSemTitulos = Array(150).fill("palavra qualquer sem cabeçalho").join(" ");
    const { container } = render(<SumarioNota corpo={textoLongoSemTitulos} />);
    expect(container.firstChild).toBeNull();
  });
});
