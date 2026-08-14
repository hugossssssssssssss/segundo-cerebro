import { describe, it, expect } from "vitest";
import { converterHtmlParaMarkdown } from "./clipper";

describe("clipper", () => {
  it("converte HTML para Markdown limpo", () => {
    const html = `
      <html>
        <head><title>Artigo de Teste</title></head>
        <body>
          <h1>Título Principal</h1>
          <p>Este é um parágrafo de <strong>teste</strong>.</p>
        </body>
      </html>
    `;

    const res = converterHtmlParaMarkdown(html, "https://exemplo.com/artigo");
    expect(res.titulo).toBe("Artigo de Teste");
    expect(res.markdown).toContain("Este é um parágrafo de **teste**.");
    expect(res.markdown).toContain("Fonte original");
  });
});
