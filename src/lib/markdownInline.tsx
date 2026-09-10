import type { ReactNode } from "react";

export interface OpcoesMarkdownInline {
  classeNegrito?: string;
  classeItalico?: string;
  classeCodigo?: string;
  classeMencao?: string;
  classeLink?: string;
}

/**
 * Renderiza trechos de texto com formatação inline de Markdown:
 * - **negrito** e __negrito__ -> <strong> com tonalidade suave de descrição
 * - *itálico* e _itálico_ -> <em>
 * - `código` -> <code>
 * - ~~tachado~~ -> <del>
 * - [link](url) -> <a>
 * - @menção -> <span className="text-primary font-normal">
 */
export function renderizarMarkdownInline(
  texto: string,
  opcoes?: OpcoesMarkdownInline
): ReactNode {
  if (!texto || typeof texto !== "string") return null;

  // Limpa escapes comuns de markdown (como \*, \[, \], \', \")
  const textoLimpo = texto.replace(/\\([*_[\]()#`~\\'-])/g, "$1");

  // Se não contém nenhum caractere especial de formatação, retorna o texto puro
  if (!/[*_~`@\[]/.test(textoLimpo)) {
    return textoLimpo;
  }

  // Regex para tokens inline de markdown
  const regex =
    /(\*\*|__)(.+?)\1|(?<![*_])(\*|_)([^*_]+?)\3(?![*_])|(~~)(.+?)\5|(`)(.+?)\7|\[(.+?)\]\((.+?)\)|(?<![\w.@-])@([a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ0-9_\- \t]{1,40}?)(?=[^a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ0-9_\- \t]|$)/g;

  const partes: ReactNode[] = [];
  let ultimoIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(textoLimpo)) !== null) {
    if (match.index > ultimoIndex) {
      const trechoTexto = textoLimpo.slice(ultimoIndex, match.index);
      // Remove eventuais asteriscos ou crases soltas que não fecharam
      partes.push(trechoTexto.replace(/[*`~]/g, ""));
    }

    if (match[1] && match[2]) {
      // Negrito com tonalidade suave de cinza para manter visual de descrição
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
      // Itálico: *texto* ou _texto_
      partes.push(
        <em
          key={`i-${match.index}`}
          className={opcoes?.classeItalico || "italic text-inherit"}
        >
          {match[4].trim()}
        </em>
      );
    } else if (match[5] && match[6]) {
      // Tachado: ~~texto~~
      partes.push(
        <del key={`d-${match.index}`} className="line-through opacity-70">
          {match[6]}
        </del>
      );
    } else if (match[7] && match[8]) {
      // Código: `código`
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
      // Link: [texto](url)
      partes.push(
        <a
          key={`a-${match.index}`}
          href={match[10]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={opcoes?.classeLink || "text-primary/90 hover:underline font-normal"}
        >
          {match[9]}
        </a>
      );
    } else if (match[11]) {
      // Menção: @alvo
      partes.push(
        <span
          key={`m-${match.index}`}
          className={opcoes?.classeMencao || "text-primary/90 font-normal hover:underline"}
        >
          @{match[11]}
        </span>
      );
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
 * Prepara e extrai um snippet seguro de markdown para pré-visualização,
 * garantindo que tags e formatações como **negrito** não fiquem quebradas ao cortar
 * e removendo vazamento de asteriscos, aspas escapadas ou marcadores soltos.
 */
export function prepararSnippetPreview(corpo: string, tamanhoMax = 180): string {
  if (!corpo || typeof corpo !== "string") return "";

  let limpo = corpo
    // Remove blocos de código completos
    .replace(/```[\s\S]*?```/g, "")
    // Remove tags HTML
    .replace(/<[^>]+>/g, "")
    // Remove imagens ![](...)
    .replace(/!\[.*?\]\(.*?\)/g, "")
    // Converte links [texto](url) para texto
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    // Remove cabeçalhos #
    .replace(/^#{1,6}\s+/gm, "")
    // Remove marcadores de lista (- [ ], - [x], -, *, +, 1.)
    .replace(/^[ \t]*[-*+](?: \[[ xX]\])?\s+/gm, "")
    .replace(/^[ \t]*\d+\.\s+/gm, "")
    // Remove marcadores soltos no meio do texto
    .replace(/(^|\s)[*•\-+](?=\s)/g, "$1")
    // Remove citações >
    .replace(/^[ \t]*>\s+/gm, "")
    // Remove divisórias horizontais
    .replace(/^-{3,}$/gm, "")
    // Remove comentários HTML como <!-- align:center -->
    .replace(/<!--[\s\S]*?-->/g, "")
    // Remove escapes de caracteres especiais
    .replace(/\\([*_[\]()#`~\\'-])/g, "$1")
    // Normaliza quebras de linha
    .replace(/\n+/g, " ")
    .trim();

  if (limpo.length <= tamanhoMax) {
    // Se tiver asterisco ímpar ou não fechado, fecha ou limpa
    return balancearFormatacaoSnippet(limpo);
  }

  // Corta de forma segura evitando quebrar palavras no meio
  let cortado = limpo.slice(0, tamanhoMax);
  const ultimoEspaco = cortado.lastIndexOf(" ");
  if (ultimoEspaco > tamanhoMax * 0.7) {
    cortado = cortado.slice(0, ultimoEspaco);
  }

  return balancearFormatacaoSnippet(cortado) + "…";
}

function balancearFormatacaoSnippet(texto: string): string {
  let res = texto.trim();

  // Fecha formatação de negrito ** se tiver número ímpar de pares **
  const contagemNegrito = (res.match(/\*\*/g) || []).length;
  if (contagemNegrito % 2 !== 0) {
    res += "**";
  }

  // Fecha formatação de itálico * se tiver número ímpar
  const asteriscosSoltos = (res.replace(/\*\*/g, "").match(/\*/g) || []).length;
  if (asteriscosSoltos % 2 !== 0) {
    res += "*";
  }

  // Se restou crase solta
  const crases = (res.match(/`/g) || []).length;
  if (crases % 2 !== 0) {
    res += "`";
  }

  return res;
}
