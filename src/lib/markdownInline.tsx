import type { ReactNode } from "react";

export interface OpcoesMarkdownInline {
  classeNegrito?: string;
  classeItalico?: string;
  classeCodigo?: string;
  classeMencao?: string;
  classeLink?: string;
}

/**
 * Renderiza trechos de texto com formatação inline de Markdown e reconhecimento inteligente:
 * - **negrito** e __negrito__ -> <strong>
 * - *itálico* e _itálico_ -> <em>
 * - `código` -> <code>
 * - ~~tachado~~ -> <del>
 * - [link](url) -> <a> (se for mailto: ou tel:, renderiza como texto puro)
 * - URLs web (http://, https://, www., .com, .br, .org, .io, etc.) -> <a>
 * - E-mails e contatos -> Texto puro (não vira link nem mailto:)
 * - @menção -> <span className="text-primary font-normal">
 */
export function renderizarMarkdownInline(
  texto: string,
  opcoes?: OpcoesMarkdownInline
): ReactNode {
  if (!texto || typeof texto !== "string") return null;

  // Limpa escapes comuns de markdown (como \*, \[, \], \', \")
  const textoLimpo = texto.replace(/\\([*_[\]()#`~\\'-])/g, "$1");

  // Se não contém nenhum caractere especial de formatação ou padrão de link/menção, retorna texto puro
  if (
    !/[*_~`@\[]/.test(textoLimpo) &&
    !/https?:\/\/|www\.|\.(?:com|br|org|net|io|app|dev|ai|co|me)\b/i.test(textoLimpo)
  ) {
    return textoLimpo;
  }

  // Regex para tokens inline de markdown + e-mails (texto puro) + URLs diretas na web
  const regex =
    /(\*\*|__)(.+?)\1|(?<![*_])(\*|_)([^*_]+?)\3(?![*_])|(~~)(.+?)\5|(`)(.+?)\7|\[(.+?)\]\((.+?)\)|(?<![\w.@-])@([a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ0-9_\- \t]{1,40}?)(?=[^a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ0-9_\- \t]|$)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(?<=^|[\s(])((?:https?:\/\/|www\.)[^\s<>"'{}|\\^`]+|(?:[a-zA-Z0-9-]+\.)+(?:com\.br|com|org|net|io|co|app|dev|me|ai|edu|gov|br)(?:\/[^\s<>"'{}|\\^`]*)?)(?=[.,;!?]?(?:[\s)]|$))/gi;

  const partes: ReactNode[] = [];
  let ultimoIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(textoLimpo)) !== null) {
    if (match.index > ultimoIndex) {
      const trechoTexto = textoLimpo.slice(ultimoIndex, match.index);
      partes.push(trechoTexto.replace(/[*`~]/g, ""));
    }

    if (match[1] && match[2]) {
      // Negrito
      const conteudoNegrito = match[2].trim();
      partes.push(
        <strong
          key={`b-${match.index}`}
          className={opcoes?.classeNegrito || "font-semibold text-inherit"}
        >
          {renderizarMarkdownInline(conteudoNegrito, opcoes)}
        </strong>
      );
    } else if (match[3] && match[4]) {
      // Itálico
      partes.push(
        <em
          key={`i-${match.index}`}
          className={opcoes?.classeItalico || "italic text-inherit"}
        >
          {match[4].trim()}
        </em>
      );
    } else if (match[5] && match[6]) {
      // Tachado
      partes.push(
        <del key={`d-${match.index}`} className="line-through opacity-70">
          {match[6]}
        </del>
      );
    } else if (match[7] && match[8]) {
      // Código inline
      partes.push(
        <code
          key={`c-${match.index}`}
          className={
            opcoes?.classeCodigo ||
            "rounded bg-muted/60 px-1 py-0.5 font-mono text-[11px] text-muted-foreground"
          }
        >
          {match[8]}
        </code>
      );
    } else if (match[9] && match[10]) {
      // Link explícito markdown: [texto](url)
      const rotulo = match[9];
      const href = match[10].trim();

      // E-mails e telefones não viram links clicáveis com mailto/tel:
      if (
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(href)
      ) {
        partes.push(rotulo);
      } else {
        partes.push(
          <a
            key={`a-${match.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={
              opcoes?.classeLink ||
              "text-primary hover:underline font-normal inline"
            }
          >
            {rotulo}
          </a>
        );
      }
    } else if (match[11]) {
      // Menção: @alvo
      partes.push(
        <span
          key={`m-${match.index}`}
          className={
            opcoes?.classeMencao ||
            "text-primary/90 font-normal hover:underline"
          }
        >
          @{match[11]}
        </span>
      );
    } else if (match[12]) {
      // E-mail capturado explicitamente: sempre texto puro, NUNCA link de site
      partes.push(match[12]);
    } else if (match[13]) {
      // URL direta detectada no texto (https://, http://, www., .com, .br, etc.)
      const urlTexto = match[13];
      // Ignora e-mails ou menções com @
      if (urlTexto.includes("@")) {
        partes.push(urlTexto);
      } else {
        const hrefCompleto = urlTexto.startsWith("http://") || urlTexto.startsWith("https://")
          ? urlTexto
          : `https://${urlTexto}`;

        partes.push(
          <a
            key={`url-${match.index}`}
            href={hrefCompleto}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={
              opcoes?.classeLink ||
              "text-primary hover:underline font-normal inline"
            }
          >
            {urlTexto}
          </a>
        );
      }
    }

    ultimoIndex = regex.lastIndex;
  }

  if (ultimoIndex < textoLimpo.length) {
    const restante = textoLimpo.slice(ultimoIndex);
    partes.push(restante.replace(/[*`~]/g, ""));
  }

  return partes.length === 1 ? partes[0] : partes;
}

/**
 * Prepara e extrai um snippet seguro e limpo de texto puro para pré-visualização.
 * Remove quaisquer símbolos de formatação (asteriscos, barras, crases, comentários HTML, etc.)
 * para que os cartões e listas exibam texto legível e agradável sem ruído técnico.
 */
export function prepararSnippetPreview(corpo: string, tamanhoMax = 180): string {
  if (!corpo || typeof corpo !== "string") return "";

  let limpo = corpo
    // Remove blocos de código
    .replace(/```[\s\S]*?```/g, "")
    // Remove comentários HTML como <!-- align:... -->
    .replace(/<!--[\s\S]*?-->/g, "")
    // Remove tags HTML
    .replace(/<[^>]+>/g, "")
    // Remove imagens markdown
    .replace(/!\[[\s\S]*?\]\([\s\S]*?\)/g, "")
    .replace(/!\[.*?\]/g, "")
    // Converte links markdown [texto](url) em apenas texto
    .replace(/\[([\s\S]*?)\]\([\s\S]*?\)/g, "$1")
    // Remove wikilinks [[alvo]]
    .replace(/\[\[(.*?)\]\]/g, "$1")
    // Remove títulos markdown #
    .replace(/^#{1,6}\s+/gm, "")
    // Remove marcadores de lista e checkboxes
    .replace(/^[ \t]*[-*+](?: \[[ xX]\])?\s+/gm, "")
    .replace(/^[ \t]*\d+\.\s+/gm, "")
    .replace(/(^|\s)[*•\-+](?=\s)/g, "$1")
    // Remove citações > e divisores ---
    .replace(/^[ \t]*>\s+/gm, "")
    .replace(/^-{3,}$/gm, "")
    // Remove marcadores inline como **, __, *, _, ~~, `
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    // Remove escapes \
    .replace(/\\([*_[\]()#`~\\'-])/g, "$1")
    // Limpa asteriscos, crases, til e barras soltas residuais
    .replace(/[*`~]/g, "")
    // Normaliza quebras de linha e múltiplos espaços
    .replace(/\s+/g, " ")
    .trim();

  if (limpo.length <= tamanhoMax) {
    return limpo;
  }

  let cortado = limpo.slice(0, tamanhoMax);
  const ultimoEspaco = cortado.lastIndexOf(" ");
  if (ultimoEspaco > tamanhoMax * 0.7) {
    cortado = cortado.slice(0, ultimoEspaco);
  }

  return cortado.trim() + "…";
}
