import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";

export type ResultadoClipping = {
  titulo: string;
  markdown: string;
  fonteUrl?: string;
};

/**
 * Converte um texto HTML em Markdown limpo usando Readability + Turndown.
 */
export function converterHtmlParaMarkdown(html: string, urlOrigem?: string): ResultadoClipping {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

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

    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
                    doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content");

    const titulo = artigo?.title || doc.title || "Captura da Web";
    const htmlConteudo = artigo?.content || html;

    let markdown = turndown.turndown(htmlConteudo);

    if (ogImage) {
      markdown = `![](${ogImage})\n\n${markdown}`;
    }

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

/**
 * Busca o HTML real de uma URL (usando proxies CORS se necessário) e converte em Markdown.
 */
export async function capturarUrlWeb(url: string): Promise<ResultadoClipping> {
  const urlLimpa = url.trim();
  if (!/^https?:\/\//i.test(urlLimpa)) {
    throw new Error("Informe uma URL válida começando com http:// ou https://");
  }

  const proxies = [
    (u: string) => u,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];

  let html = "";
  let ultimoErro = "";

  for (const getProxyUrl of proxies) {
    try {
      const resp = await fetch(getProxyUrl(urlLimpa), {
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
      if (resp.ok) {
        html = await resp.text();
        if (html && html.includes("<")) break;
      }
    } catch (e) {
      ultimoErro = e instanceof Error ? e.message : String(e);
    }
  }

  if (!html) {
    throw new Error(`Não foi possível baixar o conteúdo da página (${ultimoErro || "bloqueio de rede"}). Tente copiar e colar o texto ou HTML direto no app.`);
  }

  return converterHtmlParaMarkdown(html, urlLimpa);
}
