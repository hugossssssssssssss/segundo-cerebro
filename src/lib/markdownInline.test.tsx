import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderizarMarkdownInline, prepararSnippetPreview } from "./markdownInline";

describe("renderizarMarkdownInline", () => {
  it("renderiza texto com negrito como elemento <strong>", () => {
    render(<div>{renderizarMarkdownInline("Este é um texto com **negrito importante** no meio.")}</div>);
    const strongEl = screen.getByText("negrito importante");
    expect(strongEl.tagName).toBe("STRONG");
  });

  it("renderiza texto com itálico como elemento <em>", () => {
    render(<div>{renderizarMarkdownInline("Texto com *ênfase em itálico* aqui.")}</div>);
    const emEl = screen.getByText("ênfase em itálico");
    expect(emEl.tagName).toBe("EM");
  });

  it("renderiza múltiplos trechos em negrito na mesma frase", () => {
    render(<div>{renderizarMarkdownInline("Temos **primeiro negrito** e **segundo negrito** na nota.")}</div>);
    expect(screen.getByText("primeiro negrito").tagName).toBe("STRONG");
    expect(screen.getByText("segundo negrito").tagName).toBe("STRONG");
  });

  it("renderiza código inline como <code>", () => {
    render(<div>{renderizarMarkdownInline("Execute `npm test` para validar.")}</div>);
    const codeEl = screen.getByText("npm test");
    expect(codeEl.tagName).toBe("CODE");
  });
});

describe("prepararSnippetPreview", () => {
  it("preserva negrito e fecha pares abertos no corte", () => {
    const texto = "Esta é uma nota sobre **Reuniões Nitro** com foco em design e entrega rápida.";
    const snippet = prepararSnippetPreview(texto, 45);
    expect(snippet).toContain("**Reuniões Nitro**");
  });

  it("limpa cabeçalhos e marcadores desnecessários", () => {
    const texto = "# Título Principal\n\n- Item 1\n- Item 2\n\nTexto com **destaque** real.";
    const snippet = prepararSnippetPreview(texto, 100);
    expect(snippet).not.toContain("#");
    expect(snippet).not.toContain("-");
    expect(snippet).toContain("**destaque**");
  });
});
