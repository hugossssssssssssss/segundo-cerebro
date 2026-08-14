import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";

export type ResultadoClipping = {
  titulo: string;
  markdown: string;
  fonteUrl?: string;
};

/**
 * Converte uma string HTML (ou trecho de artigo da web) em Markdown limpo usando
 * Readability + Turndown. Roda 100% no navegador sem backend.
 */
export function converterHtmlParaMarkdown(html: string, urlOrigem?: string): ResultadoClipping {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Adiciona base URL se fornecido para resolver links relativos
    if (urlOrigem) {
      const baseElem = doc.createElement("base");
      baseElem.href = urlOrigem;
      doc.head.appendChild(baseElem);
    }

    const reader = new Readability(doc);
    const artigo = reader.parse();

    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });

    let titulo = artigo?.title || doc.title || "Captura da Web";
    let htmlConteudo = artigo?.content || html;

    let markdown = turndown.turndown(htmlConteudo);

    if (urlOrigem) {
      markdown = `> **Fonte original:** [${titulo}](${urlOrigem})\n\n${markdown}`;
    }

    return {
      titulo: titulo.trim(),
      markdown: markdown.trim(),
      fonteUrl: urlOrigem,
    };
  } catch (err) {
    console.warn("Erro ao converter HTML para Markdown:", err);
    return {
      titulo: "Captura da Web",
      markdown: html,
      fonteUrl: urlOrigem,
    };
  }
}
