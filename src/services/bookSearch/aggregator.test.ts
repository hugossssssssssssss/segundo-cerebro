import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buscarLivrosUnificado } from "./aggregator";

describe("buscarLivrosUnificado", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna lista vazia se a query for vazia", async () => {
    const resultados = await buscarLivrosUnificado("");
    expect(resultados).toEqual([]);
  });

  it("agrega resultados com sucesso e ordena por relevância", async () => {
    const mockFetch = vi.mocked(fetch);

    // Mock para a resposta do Gutendex (Project Gutenberg)
    const gutendexResponse = {
      results: [
        {
          id: 16328,
          title: "O Ateneu",
          authors: [{ name: "Pompéia, Raul" }],
          languages: ["pt"],
          formats: {
            "application/epub+zip": "https://gutenberg.org/16328.epub",
            "image/jpeg": "https://gutenberg.org/16328.jpg"
          }
        }
      ]
    };

    // Mock para a resposta do Open Library
    const openLibraryResponse = {
      docs: [
        {
          key: "/works/OL12345W",
          title: "Dom Casmurro",
          author_name: ["Machado de Assis"],
          first_publish_year: 1899,
          language: ["por"],
          ia: ["domcasmurro00mach"],
          cover_i: 123456
        }
      ]
    };

    // O fetch vai ser chamado duas vezes (uma para cada conector)
    mockFetch.mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("gutendex.com")) {
        return {
          ok: true,
          json: async () => gutendexResponse
        } as any;
      }
      if (urlStr.includes("openlibrary.org")) {
        return {
          ok: true,
          json: async () => openLibraryResponse
        } as any;
      }
      return { ok: false } as any;
    });

    const resultados = await buscarLivrosUnificado("Machado");

    // Devem vir os dois livros agregados
    expect(resultados).toHaveLength(2);

    // Ordenação por relevância: "Dom Casmurro" deve vir primeiro porque a query era "Machado",
    // mas espere, "Dom Casmurro" tem autor "Machado de Assis", e "O Ateneu" não tem "Machado" no título ou no autor.
    // Vamos checar: o agregador ordena por:
    // 1. Título começa com termo
    // 2. Título contem termo
    // 3. Demais (onde entra o ano de publicação ou ordem alfabética)
    // "Dom Casmurro" e "O Ateneu" empatam nas regras de título, pois nenhum tem "Machado" no título.
    // Então ordena por ano de publicação: "Dom Casmurro" tem ano 1899, "O Ateneu" não tem ano definido (0).
    // Assim, "Dom Casmurro" (1899) vem antes de "O Ateneu" (0).
    expect(resultados[0].titulo).toBe("Dom Casmurro");
    expect(resultados[0].autores).toContain("Machado de Assis");
    expect(resultados[0].fonte).toBe("Open Library");
    expect(resultados[0].linksDownload["EPUB"]).toContain("domcasmurro00mach.epub");

    expect(resultados[1].titulo).toBe("O Ateneu");
    expect(resultados[1].autores).toContain("Raul Pompéia");
    expect(resultados[1].fonte).toBe("Project Gutenberg");
  });

  it("continua funcionando e retorna resultados se uma das fontes falhar", async () => {
    const mockFetch = vi.mocked(fetch);

    // Gutenberg falha (HTTP 500)
    // Open Library funciona com sucesso
    mockFetch.mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("gutendex.com")) {
        return {
          ok: false,
          status: 500
        } as any;
      }
      if (urlStr.includes("openlibrary.org")) {
        return {
          ok: true,
          json: async () => ({
            docs: [
              {
                key: "/works/OL12345W",
                title: "Memórias Póstumas de Brás Cubas",
                author_name: ["Machado de Assis"],
                first_publish_year: 1881,
                language: ["por"],
                ia: ["memoriaspostumas00mach"],
                cover_i: 654321
              }
            ]
          })
        } as any;
      }
      return { ok: false } as any;
    });

    const resultados = await buscarLivrosUnificado("Memórias");

    // Deve retornar apenas o livro do Open Library sem estourar erro
    expect(resultados).toHaveLength(1);
    expect(resultados[0].titulo).toBe("Memórias Póstumas de Brás Cubas");
    expect(resultados[0].fonte).toBe("Open Library");
  });
});
