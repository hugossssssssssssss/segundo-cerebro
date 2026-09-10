/**
 * Utilitários para preservação de alinhamento de texto (esquerda, centro, direita, justificado)
 * entre o editor BlockNote e arquivos Markdown (.md).
 *
 * O Markdown padrão não possui sintaxe nativa para alinhamento de texto.
 * Usamos marcações limpas `<!-- align:center -->`, `<!-- align:right -->`, etc.
 * Antes de passar o Markdown para o parser do BlockNote, limpamos essas anotações
 * para evitar que o BlockNote quebre os blocos, e re-aplicamos o textAlignment diretamente
 * nas propriedades dos blocos gerados.
 */

export type TipoAlinhamento = "left" | "center" | "right" | "justify";

export interface BlocoComAlinhamento {
  id?: string;
  type?: string;
  props?: Record<string, any>;
  content?: any;
  children?: any[];
}

/**
 * Analisa o markdown, extrai o alinhamento de cada seção/bloco e retorna o Markdown limpo
 * pronto para ser parseado com segurança pelo BlockNote.
 */
export function extrairAlinhamentoDoMarkdown(markdown: string): {
  markdownLimpo: string;
  alinhamentos: TipoAlinhamento[];
} {
  if (!markdown || typeof markdown !== "string") {
    return { markdownLimpo: "", alinhamentos: [] };
  }

  // Se não tem nenhuma marcação de alinhamento, retorna o markdown como está
  if (
    !/<!--\s*align:\s*(center|right|justify|left)\s*-->/i.test(markdown) &&
    !/<(?:p|div)\s+align=["'](center|right|justify|left)["']/i.test(markdown) &&
    !/<center>/i.test(markdown)
  ) {
    return { markdownLimpo: markdown, alinhamentos: [] };
  }

  const linhas = markdown.split("\n");
  const linhasLimpas: string[] = [];
  const alinhamentos: TipoAlinhamento[] = [];

  let alinhamentoAtual: TipoAlinhamento = "left";
  let temNovoBloco = false;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const linhaTrim = linha.trim();

    // Linha de comentário de alinhamento
    const matchComentario = linhaTrim.match(/^<!--\s*align:\s*(center|right|justify|left)\s*-->$/i);
    if (matchComentario) {
      alinhamentoAtual = matchComentario[1].toLowerCase() as TipoAlinhamento;
      continue;
    }

    // Linha com tag HTML de alinhamento
    const matchTag = linhaTrim.match(/^<(?:p|div)\s+align=["'](center|right|justify|left)["']>/i);
    if (matchTag) {
      alinhamentoAtual = matchTag[1].toLowerCase() as TipoAlinhamento;
      const conteudoLinha = linhaTrim
        .replace(/^<(?:p|div)\s+align=["'][^"']+["']>/i, "")
        .replace(/<\/(?:p|div)>$/i, "");
      if (conteudoLinha) {
        linhasLimpas.push(conteudoLinha);
        alinhamentos.push(alinhamentoAtual);
        alinhamentoAtual = "left";
      }
      continue;
    }

    if (linhaTrim === "<center>") {
      alinhamentoAtual = "center";
      continue;
    }
    if (linhaTrim === "</center>") {
      alinhamentoAtual = "left";
      continue;
    }

    if (!linhaTrim) {
      linhasLimpas.push(linha);
      temNovoBloco = true;
      continue;
    }

    // Primeira linha de um bloco de conteúdo
    if (temNovoBloco || alinhamentos.length === 0) {
      alinhamentos.push(alinhamentoAtual);
      alinhamentoAtual = "left";
      temNovoBloco = false;
    }

    linhasLimpas.push(linha);
  }

  // Limpa possíveis tags inline residuais
  const mdLimpo = linhasLimpas
    .join("\n")
    .replace(/<!--\s*align:\s*(center|right|justify|left)\s*-->/gi, "")
    .replace(/<\/?center>/gi, "");

  return {
    markdownLimpo: mdLimpo,
    alinhamentos,
  };
}

/**
 * Restaura o textAlignment nos blocos gerados a partir do markdown limpo.
 */
export function restaurarAlinhamentoEmBlocos<T extends BlocoComAlinhamento>(
  blocos: T[],
  markdownOuAlinhamentos: string | TipoAlinhamento[]
): T[] {
  if (!Array.isArray(blocos) || blocos.length === 0) {
    return blocos;
  }

  let alinhamentos: TipoAlinhamento[] = [];
  if (Array.isArray(markdownOuAlinhamentos)) {
    alinhamentos = markdownOuAlinhamentos;
  } else if (typeof markdownOuAlinhamentos === "string") {
    alinhamentos = extrairAlinhamentoDoMarkdown(markdownOuAlinhamentos).alinhamentos;
  }

  if (!alinhamentos || alinhamentos.length === 0) {
    return blocos;
  }

  return blocos.map((bloco, idx) => {
    const align = idx < alinhamentos.length ? alinhamentos[idx] : "left";
    const novoBloco = {
      ...bloco,
      props: {
        ...(bloco.props || {}),
        textAlignment: align || "left",
      },
    };
    return novoBloco;
  });
}

/**
 * Converte blocos do BlockNote em Markdown anotado com comentários de alinhamento.
 */
export function aplicarAlinhamentoAoMarkdown(
  markdown: string,
  blocos: BlocoComAlinhamento[]
): string {
  if (!markdown || !Array.isArray(blocos) || blocos.length === 0) {
    return markdown;
  }

  const temAlinhamentoEspecial = blocos.some(
    (b) => b.props?.textAlignment && b.props.textAlignment !== "left"
  );
  if (!temAlinhamentoEspecial) return markdown;

  // Divide o markdown por blocos/parágrafos separados por linhas em branco
  const secoes = markdown.split(/\n\n+/);
  const resultado: string[] = [];

  let idxBloco = 0;
  for (let i = 0; i < secoes.length; i++) {
    const secao = secoes[i].trim();
    if (!secao) {
      resultado.push(secoes[i]);
      continue;
    }

    const blocoAtual = blocos[idxBloco];
    const align = blocoAtual?.props?.textAlignment as TipoAlinhamento | undefined;

    if (align && align !== "left") {
      resultado.push(`<!-- align:${align} -->\n${secao}`);
    } else {
      resultado.push(secao);
    }

    idxBloco++;
  }

  return resultado.join("\n\n");
}
