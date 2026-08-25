import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  construirQueryWeb,
  gerarUrlBuscaWeb,
  contarFiltrosAtivos,
  obterMotorBuscaWeb,
  salvarMotorBuscaWeb,
} from "./buscaWeb";

describe("buscaWeb - Operadores e Query Builder", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("deve construir busca simples sem filtros", () => {
    const query = construirQueryWeb("design tokens", {}, "google");
    expect(query).toBe("design tokens");
    expect(gerarUrlBuscaWeb("design tokens", {}, "google")).toBe(
      "https://www.google.com/search?q=design%20tokens"
    );
  });

  it("deve construir busca com filtros principais universais (site, filetype, exata, excluir)", () => {
    const queryGoogle = construirQueryWeb(
      "componentes",
      {
        site: "https://github.com/",
        filetype: ".pdf",
        exata: "design system",
        excluir: "anuncio banner",
      },
      "google"
    );

    expect(queryGoogle).toBe(
      'componentes site:github.com filetype:pdf "design system" -anuncio -banner'
    );
  });

  it("permite busca apenas com filtros e sem termo principal", () => {
    const query = construirQueryWeb(
      "",
      {
        site: "wikipedia.org",
        filetype: "pdf",
      },
      "duckduckgo"
    );

    expect(query).toBe("site:wikipedia.org filetype:pdf");
    expect(gerarUrlBuscaWeb("", { site: "wikipedia.org" }, "duckduckgo")).toBe(
      "https://duckduckgo.com/?q=site%3Awikipedia.org"
    );
  });

  it("deve incluir campos específicos do Google (intitle, inurl, intext, before, after)", () => {
    const query = construirQueryWeb(
      "inteligencia artificial",
      {
        intitle: "pesquisa",
        inurl: "artigos",
        intext: "redes neurais",
        before: "2025-01-01",
        after: "2024-01-01",
      },
      "google"
    );

    expect(query).toBe(
      "inteligencia artificial intitle:pesquisa inurl:artigos intext:redes neurais before:2025-01-01 after:2024-01-01"
    );
  });

  it("deve descartar campos incompatíveis quando o motor é Bing", () => {
    // Bing suporta intitle, inbody, loc. NÃO suporta inurl, intext, before, after
    const query = construirQueryWeb(
      "computacao",
      {
        intitle: "guia",
        inbody: "algoritmos",
        loc: "br",
        // Campos que pertencem apenas ao Google e devem ser ignorados no Bing:
        intext: "texto invalido no bing",
        before: "2025-01-01",
      },
      "bing"
    );

    expect(query).toBe("computacao intitle:guia inbody:algoritmos loc:br");
    expect(query).not.toContain("intext:");
    expect(query).not.toContain("before:");
  });

  it("deve descartar campos incompatíveis quando o motor é DuckDuckGo", () => {
    // DuckDuckGo suporta intitle, inurl, inbody. NÃO suporta loc, intext, before, after
    const query = construirQueryWeb(
      "privacidade",
      {
        intitle: "seguranca",
        inurl: "docs",
        inbody: "criptografia",
        // Campos que não devem entrar:
        loc: "us",
        after: "2024-01-01",
      },
      "duckduckgo"
    );

    expect(query).toBe("privacidade intitle:seguranca inurl:docs inbody:criptografia");
    expect(query).not.toContain("loc:");
    expect(query).not.toContain("after:");
  });

  it("conta corretamente filtros ativos suportados por motor", () => {
    const filtros = {
      site: "github.com",
      filetype: "json",
      intext: "exemplo", // suportado apenas no Google
      loc: "br", // suportado apenas no Bing
    };

    expect(contarFiltrosAtivos(filtros, "google")).toBe(3); // site, filetype, intext
    expect(contarFiltrosAtivos(filtros, "bing")).toBe(3); // site, filetype, loc
    expect(contarFiltrosAtivos(filtros, "duckduckgo")).toBe(2); // site, filetype
  });

  it("persiste e emite evento ao mudar o motor de busca padrão", () => {
    expect(obterMotorBuscaWeb()).toBe("google");

    const spyDisparar = vi.spyOn(window, "dispatchEvent");
    salvarMotorBuscaWeb("duckduckgo");

    expect(obterMotorBuscaWeb()).toBe("duckduckgo");
    expect(spyDisparar).toHaveBeenCalled();
  });
});
