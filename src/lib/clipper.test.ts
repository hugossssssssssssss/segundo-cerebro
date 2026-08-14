import { describe, it, expect } from "vitest";
import {
  converterHtmlParaMarkdown,
  extrairMetadados,
  aplicarModelo,
  comoData,
} from "./clipper";

function doc(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

const ARTIGO = `
  <html>
    <head><title>Artigo de Teste</title></head>
    <body>
      <h1>Título Principal</h1>
      <p>Este é um parágrafo de <strong>teste</strong>.</p>
    </body>
  </html>
`;

describe("clipper", () => {
  it("converte HTML para Markdown limpo", () => {
    const res = converterHtmlParaMarkdown(ARTIGO, "https://exemplo.com/artigo");
    expect(res.titulo).toBe("Artigo de Teste");
    expect(res.markdown).toContain("Este é um parágrafo de **teste**.");
    expect(res.markdown).toContain("Fonte:");
  });

  it("não perde o texto quando o HTML é lixo", () => {
    // perder a limpeza é chato; perder o que o Hugo copiou, não pode
    const res = converterHtmlParaMarkdown("só um texto solto");
    expect(res.markdown).toContain("só um texto solto");
  });
});

describe("comoData", () => {
  it("normaliza formatos diferentes para AAAA-MM-DD", () => {
    expect(comoData("2026-03-14T10:00:00Z")).toBe("2026-03-14");
    expect(comoData("March 14, 2026")).toBe("2026-03-14");
  });

  it("devolve undefined no que não é data, em vez de 'Invalid Date'", () => {
    expect(comoData("qualquer coisa")).toBeUndefined();
    expect(comoData("")).toBeUndefined();
    expect(comoData(undefined)).toBeUndefined();
    expect(comoData(42)).toBeUndefined();
  });
});

describe("extrairMetadados", () => {
  it("lê autor e data das meta tags", () => {
    const m = extrairMetadados(
      doc(`<html><head>
        <title>Grades editoriais</title>
        <meta name="author" content="Josef Müller-Brockmann">
        <meta property="article:published_time" content="2026-03-14T10:00:00Z">
        <meta property="og:description" content="Sobre ritmo de leitura.">
        <meta property="og:image" content="https://exemplo.com/capa.jpg">
      </head><body></body></html>`),
      "https://www.exemplo.com/grades",
    );

    expect(m.titulo).toBe("Grades editoriais");
    expect(m.autor).toBe("Josef Müller-Brockmann");
    expect(m.publicado).toBe("2026-03-14");
    expect(m.descricao).toBe("Sobre ritmo de leitura.");
    expect(m.imagem).toBe("https://exemplo.com/capa.jpg");
    expect(m.dominio).toBe("exemplo.com"); // sem o "www."
  });

  it("prefere o JSON-LD, que erra menos que as meta tags", () => {
    const m = extrairMetadados(
      doc(`<html><head>
        <meta name="author" content="Redação do Site">
        <script type="application/ld+json">
          {"@type":"Article","headline":"O artigo","author":{"name":"Ana Prado"},
           "datePublished":"2026-01-05"}
        </script>
      </head><body></body></html>`),
    );
    expect(m.autor).toBe("Ana Prado");
    expect(m.publicado).toBe("2026-01-05");
  });

  it("aceita vários autores no JSON-LD", () => {
    const m = extrairMetadados(
      doc(`<html><head><script type="application/ld+json">
        {"author":[{"name":"Ana"},{"name":"Bruno"}],"datePublished":"2026-01-05"}
      </script></head><body></body></html>`),
    );
    expect(m.autor).toBe("Ana, Bruno");
  });

  it("JSON-LD quebrado não derruba a captura", () => {
    const m = extrairMetadados(
      doc(`<html><head>
        <title>Ainda funciona</title>
        <script type="application/ld+json">{ isto não é json }</script>
      </head><body></body></html>`),
    );
    expect(m.titulo).toBe("Ainda funciona");
  });

  it("página sem metadado nenhum não quebra", () => {
    const m = extrairMetadados(doc("<html><head></head><body></body></html>"));
    expect(m.titulo).toBe("Captura da Web");
    expect(m.autor).toBeUndefined();
  });
});

describe("aplicarModelo", () => {
  it("troca as variáveis pelos valores", () => {
    expect(aplicarModelo("Fonte: {{titulo}} ({{url}})", {
      titulo: "Grades",
      url: "https://x.com",
    })).toBe("Fonte: Grades (https://x.com)");
  });

  it("aplica o filtro pedido", () => {
    expect(aplicarModelo("{{titulo|nome_seguro}}", { titulo: 'A/B: "teste"' })).toBe(
      "A-B- -teste-",
    );
    expect(aplicarModelo("{{t|minuscula}}", { t: "GRADE" })).toBe("grade");
  });

  it("some com o rótulo que ficou sem valor", () => {
    // capturar site sem autor gravava "Autor:" pelado no texto
    const r = aplicarModelo("Título: {{titulo}}\nAutor: {{autor}}\nfim", {
      titulo: "X",
      autor: undefined,
    });
    expect(r).not.toContain("Autor:");
    expect(r).toContain("Título: X");
    expect(r).toContain("fim");
  });

  it("some com o rótulo dentro de citação também", () => {
    const r = aplicarModelo("> Autor: {{autor}}\n> resto", { autor: undefined });
    expect(r).not.toContain("Autor:");
    expect(r).toContain("> resto");
  });

  it("não deixa buraco de três linhas em branco", () => {
    const r = aplicarModelo("a\n\n{{vazio}}\n\nb", { vazio: undefined });
    expect(r).toBe("a\n\nb");
  });

  it("variável desconhecida vira vazio, não quebra", () => {
    expect(aplicarModelo("x{{naoexiste}}y", {})).toBe("xy");
  });
});

describe("captura completa", () => {
  it("põe autor e data no frontmatter, não no meio do texto", () => {
    const res = converterHtmlParaMarkdown(
      `<html><head>
        <title>Grades editoriais</title>
        <meta name="author" content="Ana Prado">
        <meta property="article:published_time" content="2026-03-14">
      </head><body><p>${"texto do artigo. ".repeat(30)}</p></body></html>`,
      "https://exemplo.com/grades",
    );

    expect(res.dados.autor).toBe("Ana Prado");
    expect(res.dados.publicado).toBe("2026-03-14");
    expect(res.dados.site).toBe("exemplo.com");
    expect(res.dados.fonte).toBe("https://exemplo.com/grades");
  });

  it("sem metadados, o frontmatter não ganha campo vazio", () => {
    const res = converterHtmlParaMarkdown(ARTIGO);
    expect(res.dados.autor).toBeUndefined();
    expect(res.dados.publicado).toBeUndefined();
    expect(Object.values(res.dados)).not.toContain("");
  });
});
