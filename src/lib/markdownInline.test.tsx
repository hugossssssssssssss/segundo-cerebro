import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { renderizarMarkdownInline, prepararSnippetPreview } from "./markdownInline";

describe("renderizarMarkdownInline", () => {
  afterEach(() => {
    cleanup();
  });

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

  it("limpa escapes e não vaza asteriscos soltos", () => {
    render(<div>{renderizarMarkdownInline("Nota com \\[escape\\] e \\*asterisco\\* e **negrito**.")}</div>);
    expect(screen.getByText("negrito").tagName).toBe("STRONG");
    expect(screen.getByText("asterisco").tagName).toBe("EM");
  });

  it("reconhece URLs com https, www e domínios comuns como links clicáveis", () => {
    render(
      <div>
        {renderizarMarkdownInline("Visite https://google.com e www.github.com ou figma.com e site.com.br")}
      </div>
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    expect(links[0].getAttribute("href")).toBe("https://google.com");
    expect(links[1].getAttribute("href")).toBe("https://www.github.com");
    expect(links[2].getAttribute("href")).toBe("https://figma.com");
    expect(links[3].getAttribute("href")).toBe("https://site.com.br");
  });

  it("não transforma e-mails em links clicáveis", () => {
    render(<div>{renderizarMarkdownInline("Contato: suporte@exemplo.com ou hugo@design.com.br")}</div>);
    const links = screen.queryAllByRole("link");
    expect(links).toHaveLength(0);
    expect(screen.getByText(/suporte@exemplo\.com/)).toBeTruthy();
  });

  it("diferencia e-mail de site em uma mesma frase", () => {
    render(<div>{renderizarMarkdownInline("Envie um e-mail para contato@acme.com ou acesse figma.com")}</div>);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("https://figma.com");
    expect(screen.getByText(/contato@acme\.com/)).toBeTruthy();
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
    expect(snippet).not.toContain("- Item");
    expect(snippet).toContain("**destaque**");
  });

  it("limpa escapes e marcadores de lista no meio do texto", () => {
    const texto = "Itens: * primeiro * segundo com **negrito**";
    const snippet = prepararSnippetPreview(texto, 100);
    expect(snippet).not.toContain("* primeiro");
    expect(snippet).toContain("primeiro");
    expect(snippet).toContain("**negrito**");
  });
});
