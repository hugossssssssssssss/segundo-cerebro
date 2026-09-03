import TurndownService from "turndown";
import { sanitizarHTML } from "./sanitizer";

/**
 * Converte nós de tabela HTML em formato de tabela GitHub Flavored Markdown (GFM).
 * Lida com 'colspan', 'rowspan', quebras de linha (<br>), links e escape de pipes (|).
 */
function converterTabelaParaGfm(
  tabelaEl: HTMLTableElement,
  turndownInline: TurndownService
): string {
  const linhasEl = Array.from(tabelaEl.querySelectorAll("tr"));
  if (linhasEl.length === 0) return "";

  // Matriz 2D para acomodar células e resolver rowspan/colspan
  const grid: string[][] = [];

  for (let r = 0; r < linhasEl.length; r++) {
    const tr = linhasEl[r];
    if (!grid[r]) grid[r] = [];

    const celulas = Array.from(tr.querySelectorAll<HTMLTableCellElement>("th, td"));
    let colIndex = 0;

    for (const celula of celulas) {
      // Pula posições já preenchidas por rowspan de linhas anteriores
      while (grid[r][colIndex] !== undefined) {
        colIndex++;
      }

      // Substitui <br> por espaço antes de extrair texto/markdown
      const cloneCelula = celula.cloneNode(true) as HTMLElement;
      cloneCelula.querySelectorAll("br").forEach((br) => {
        br.replaceWith(document.createTextNode(" "));
      });

      let textoCelula = "";
      try {
        textoCelula = turndownInline.turndown(cloneCelula.innerHTML);
      } catch {
        textoCelula = cloneCelula.textContent || "";
      }

      // Sanitiza o texto da célula: remove quebras de linha abruptas e escapa o pipe '|'
      textoCelula = textoCelula
        .replace(/(\r\n|\n|\r)/gm, " ")
        .replace(/\|/g, "\\|")
        .replace(/\s+/g, " ")
        .trim();

      const colspan = parseInt(celula.getAttribute("colspan") || "1", 10) || 1;
      const rowspan = parseInt(celula.getAttribute("rowspan") || "1", 10) || 1;

      for (let ro = 0; ro < rowspan; ro++) {
        const targetRow = r + ro;
        if (!grid[targetRow]) grid[targetRow] = [];

        for (let co = 0; co < colspan; co++) {
          const targetCol = colIndex + co;
          grid[targetRow][targetCol] = co === 0 && ro === 0 ? textoCelula : (colspan > 1 || rowspan > 1 ? textoCelula : "");
        }
      }

      colIndex += colspan;
    }
  }

  // Descobre a quantidade máxima de colunas
  const maxColunas = Math.max(0, ...grid.map((l) => l.length));
  if (maxColunas === 0) return "";

  // Normaliza todas as linhas para terem o mesmo número de colunas
  const gridNormalizado = grid.map((linha) => {
    const novaLinha = [...linha];
    while (novaLinha.length < maxColunas) {
      novaLinha.push("");
    }
    return novaLinha;
  });

  if (gridNormalizado.length === 0) return "";

  const resultadoLinhas: string[] = [];

  // Linha 0: Cabeçalho
  const cabecalho = gridNormalizado[0].map((c) => c || " ");
  resultadoLinhas.push(`| ${cabecalho.join(" | ")} |`);

  // Linha 1: Separador GFM
  const separadores = cabecalho.map(() => "---");
  resultadoLinhas.push(`| ${separadores.join(" | ")} |`);

  // Linhas seguintes: Dados
  for (let i = 1; i < gridNormalizado.length; i++) {
    const linha = gridNormalizado[i].map((c) => c || " ");
    resultadoLinhas.push(`| ${linha.join(" | ")} |`);
  }

  return `\n\n${resultadoLinhas.join("\n")}\n\n`;
}

/**
 * Limpa e pré-processa o HTML para remover ruídos da web (Wikipedia, blogs)
 * e ajustar URLs relativas antes da conversão para Markdown.
 */
function preProcessarHtml(html: string, urlOrigem?: string): string {
  if (!html) return "";

  const doc = new DOMParser().parseFromString(html, "text/html");

  // Se houver tag <base> ou urlOrigem, usa para resolução
  const baseTag = doc.querySelector("base");
  const baseUrl = urlOrigem || baseTag?.getAttribute("href") || undefined;

  // 1. Remove elementos irrelevantes e de navegação/edição (ex: Wikipedia)
  const seletoresRemover = [
    "script",
    "style",
    "noscript",
    "iframe",
    "svg",
    ".mw-editsection",
    ".reference",
    ".mw-cite-backlink",
    ".navbox",
    ".infobox-navbar",
    ".noprint",
    ".mw-jump-link",
    ".mw-empty-elt",
    "[aria-hidden='true']",
  ];

  for (const seletor of seletoresRemover) {
    doc.querySelectorAll(seletor).forEach((el) => el.remove());
  }

  // 2. Normaliza links <a>
  doc.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    // Remove âncoras internas ou referências numéricas vazias
    if (href.startsWith("#cite_note") || href.startsWith("#cite_ref")) {
      link.remove();
      return;
    }

    if (href.startsWith("//")) {
      link.setAttribute("href", `https:${href}`);
    } else if (href.startsWith("/wiki/") || href.startsWith("/w/")) {
      link.setAttribute("href", `https://pt.wikipedia.org${href}`);
    } else if (href.startsWith("/") && baseUrl) {
      try {
        const u = new URL(href, baseUrl);
        link.setAttribute("href", u.toString());
      } catch {
        // mantém como está
      }
    }
  });

  // 3. Normaliza imagens <img>
  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) {
      img.remove();
      return;
    }

    // Converte imagens pequenas de ícone da Wikipedia ou placeholders 1x1 em nada
    const width = parseInt(img.getAttribute("width") || "0", 10);
    const height = parseInt(img.getAttribute("height") || "0", 10);
    if ((width > 0 && width <= 2) || (height > 0 && height <= 2)) {
      img.remove();
      return;
    }

    if (src.startsWith("//")) {
      img.setAttribute("src", `https:${src}`);
    } else if (src.startsWith("/") && baseUrl) {
      try {
        const u = new URL(src, baseUrl);
        img.setAttribute("src", u.toString());
      } catch {
        // mantém
      }
    }
  });

  return doc.body.innerHTML;
}

/**
 * Cria uma instância configurada do TurndownService com suporte a GFM e regras estendidas.
 */
function criarTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    hr: "---",
    emDelimiter: "*",
    strongDelimiter: "**",
  });

  const turndownInline = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
  });

  // Regra personalizada para tabelas: transforma tabelas inteiras em Markdown GFM
  service.addRule("tabelasGfm", {
    filter: "table",
    replacement: (_content, node) => {
      if (node.nodeName === "TABLE") {
        return converterTabelaParaGfm(node as HTMLTableElement, turndownInline);
      }
      return _content;
    },
  });

  // Regra para preservar blocos de código com linguagem
  service.addRule("codigoFormatado", {
    filter: (node) => {
      return (
        node.nodeName === "PRE" &&
        node.firstChild !== null &&
        node.firstChild.nodeName === "CODE"
      );
    },
    replacement: (_content, node) => {
      const codeNode = node.firstChild as HTMLElement;
      const classe = codeNode.getAttribute("class") || "";
      const matchLang = classe.match(/language-(\w+)/);
      const lang = matchLang ? matchLang[1] : "";
      const text = codeNode.textContent || "";
      return `\n\`\`\`${lang}\n${text.replace(/\n+$/, "")}\n\`\`\`\n`;
    },
  });

  // Regra para tachado <del>, <s>, <strike>
  service.addRule("tachado", {
    filter: (node) => ["DEL", "S", "STRIKE"].includes(node.nodeName),
    replacement: (content) => {
      return `~~${content}~~`;
    },
  });

  return service;
}

/**
 * Converte HTML da área de transferência em Markdown limpo e semanticamente estruturado.
 */
export function converterHtmlParaMarkdownClipboard(
  htmlCru: string,
  opcoes?: { urlOrigem?: string }
): string {
  if (!htmlCru || typeof htmlCru !== "string" || !htmlCru.trim()) {
    return "";
  }

  try {
    // 1. Sanitização de segurança básica contra scripts e XSS
    const htmlSanitizado = sanitizarHTML(htmlCru);

    // 2. Pré-processamento semântico de ruídos da web
    const htmlLimpo = preProcessarHtml(htmlSanitizado, opcoes?.urlOrigem);
    if (!htmlLimpo.trim()) {
      return "";
    }

    // 3. Conversão com Turndown e plugins GFM
    const turndown = criarTurndownService();
    let md = turndown.turndown(htmlLimpo);

    // 4. Limpeza final de espaçamentos em marcadores de lista e linhas extras
    md = md
      .replace(/^([ \t]*[-*+]) {2,}/gm, "$1 ")
      .replace(/^([ \t]*\d+\.) {2,}/gm, "$1 ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return md;
  } catch (err) {
    console.error("Erro ao converter HTML do clipboard para Markdown:", err);
    return "";
  }
}

/**
 * Detecta se o payload do clipboard contém HTML rico relevante que deva ser convertido
 * em vez de ser colado como texto simples.
 */
export function ehHtmlFormatadoRelevante(html: string, plainText?: string): boolean {
  if (!html || typeof html !== "string") return false;

  // Se o HTML for apenas uma tag vazia ou apenas um parágrafo simples idêntico ao texto puro
  const textoLimpo = (plainText || "").trim();
  const htmlLimpo = html.trim();

  if (!htmlLimpo.includes("<")) return false;

  // Tags que indicam conteúdo rico / estruturado relevante
  const tagsRelevantes = [
    "<table",
    "<thead",
    "<tr",
    "<td",
    "<th",
    "<h1",
    "<h2",
    "<h3",
    "<h4",
    "<h5",
    "<h6",
    "<ul",
    "<ol",
    "<li",
    "<blockquote",
    "<pre",
    "<img",
    "<strong",
    "<b",
    "<em",
    "<i",
    "<del",
    "<s",
    "<strike",
    "<code",
    "<a "
  ];

  const temTagsRelevantes = tagsRelevantes.some((tag) =>
    htmlLimpo.toLowerCase().includes(tag)
  );

  if (!temTagsRelevantes) return false;

  // Se for apenas `<p>Texto puro</p>` sem formatação e igual ao plainText, não precisa de conversão complexa
  const matchP = htmlLimpo.match(/^<p(?:\s+[^>]*)?>(.*?)<\/p>$/is);
  if (matchP && matchP[1].trim() === textoLimpo && !matchP[1].includes("<")) {
    return false;
  }

  return true;
}
