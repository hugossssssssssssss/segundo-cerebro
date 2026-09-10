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

  // Regex para tokens inline de markdown + URLs diretas na web
  // Nota: URLs diretas exigem início com espaço/linha/parêntese e não capturam e-mails (que possuem @ antes do domínio)
  const regex =
    /(\*\*|__)(.+?)\1|(?<![*_])(\*|_)([^*_]+?)\3(?![*_])|(~~)(.+?)\5|(`)(.+?)\7|\[(.+?)\]\((.+?)\)|(?<![\w.@-])@([a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ0-9_\- \t]{1,40}?)(?=[^a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ0-9_\- \t]|$)|(?<=^|[\s(])((?:https?:\/\/|www\.)[^\s<>"'{}|\\^`]+|(?:[a-zA-Z0-9-]+\.)+(?:com\.br|com|org|net|io|co|app|dev|me|ai|edu|gov|br)(?:\/[^\s<>"'{}|\\^`]*)?)(?=[.,;!?]?(?:[\s)]|$))/gi;

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
      // URL direta detectada no texto (https://, http://, www., .com, .br, etc.)
      const urlTexto = match[12];
      // Ignora se for padrão de e-mail
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
 * Prepara e extrai um snippet seguro de markdown para pré-visualização.
 */
export function prepararSnippetPreview(corpo: string, tamanhoMax = 180): string {
  if (!corpo || typeof corpo !== "string") return "";

  let limpo = corpo
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[ \t]*[-*+](?: \[[ xX]\])?\s+/gm, "")
    .replace(/^[ \t]*\d+\.\s+/gm, "")
    .replace(/(^|\s)[*•\-+](?=\s)/g, "$1")
    .replace(/^[ \t]*>\s+/gm, "")
    .replace(/^-{3,}$/gm, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\\([*_[\]()#`~\\'-])/g, "$1")
    .replace(/\n+/g, " ")
    .trim();

  if (limpo.length <= tamanhoMax) {
    return balancearFormatacaoSnippet(limpo);
  }

  let cortado = limpo.slice(0, tamanhoMax);
  const ultimoEspaco = cortado.lastIndexOf(" ");
  if (ultimoEspaco > tamanhoMax * 0.7) {
    cortado = cortado.slice(0, ultimoEspaco);
  }

  return balancearFormatacaoSnippet(cortado) + "…";
}

function balancearFormatacaoSnippet(texto: string): string {
  let res = texto.trim();

  const contagemNegrito = (res.match(/\*\*/g) || []).length;
  if (contagemNegrito % 2 !== 0) {
    res += "**";
  }

  const asteriscosSoltos = (res.replace(/\*\*/g, "").match(/\*/g) || []).length;
  if (asteriscosSoltos % 2 !== 0) {
    res += "*";
  }

  const crases = (res.match(/`/g) || []).length;
  if (crases % 2 !== 0) {
    res += "`";
  }

  return res;
}
