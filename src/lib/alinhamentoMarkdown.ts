/**
 * Utilitários para preservação de alinhamento de texto (esquerda, centro, direita, justificado)
 * entre o editor BlockNote e arquivos Markdown (.md).
 *
 * Como a especificação CommonMark padrão não possui sintaxe nativa para alinhamento de blocos,
 * utilizamos marcações limpas em HTML/comentários suportadas por visualizadores Markdown e GitHub:
 * Exemplo:
 * <!-- align:center -->
 * Texto centralizado
 *
 * Ou tags HTML como:
 * <div align="center">Texto centralizado</div>
 * <p align="right">Texto alinhado à direita</p>
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
 * Anota o markdown com metadados de alinhamento para cada bloco que não seja "left".
 */
export function aplicarAlinhamentoAoMarkdown(
  markdown: string,
  blocos: BlocoComAlinhamento[]
): string {
  if (!markdown || !Array.isArray(blocos) || blocos.length === 0) {
    return markdown;
  }

  // Verifica se há algum bloco com alinhamento especial
  const temAlinhamentoEspecial = blocos.some(
    (b) => b.props?.textAlignment && b.props.textAlignment !== "left"
  );
  if (!temAlinhamentoEspecial) return markdown;

  const linhas = markdown.split("\n");
  const resultado: string[] = [];

  // Mapeia texto aproximado de cada bloco para seu alinhamento
  let indiceBloco = 0;
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const linhaTrim = linha.trim();

    // Linha vazia não recebe anotação
    if (!linhaTrim) {
      resultado.push(linha);
      continue;
    }

    // Ignora linhas que já são anotações
    if (linhaTrim.startsWith("<!-- align:") || linhaTrim.startsWith("<p align=") || linhaTrim.startsWith("<div align=")) {
      resultado.push(linha);
      continue;
    }

    const blocoAtual = blocos[indiceBloco];
    if (blocoAtual) {
      const align = blocoAtual.props?.textAlignment as TipoAlinhamento | undefined;
      if (align && align !== "left") {
        resultado.push(`<!-- align:${align} -->`);
      }
      indiceBloco++;
    }

    resultado.push(linha);
  }

  return resultado.join("\n");
}

/**
 * Analisa o markdown e extrai os alinhamentos correspondentes para os blocos gerados pelo BlockNote.
 */
export function restaurarAlinhamentoEmBlocos<T extends BlocoComAlinhamento>(
  blocos: T[],
  markdown: string
): T[] {
  if (!Array.isArray(blocos) || blocos.length === 0 || !markdown) {
    return blocos;
  }

  // Divide o markdown em linhas e extrai o alinhamento de cada parágrafo/bloco
  const linhas = markdown.split("\n");
  const alinhamentosDosBlocos: TipoAlinhamento[] = [];

  let alinhamentoPendente: TipoAlinhamento | null = null;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;

    const matchComentario = linha.match(/^<!--\s*align:\s*(center|right|justify|left)\s*-->$/i);
    if (matchComentario) {
      alinhamentoPendente = matchComentario[1].toLowerCase() as TipoAlinhamento;
      continue;
    }

    const matchTagP = linha.match(/<p\s+align=["'](center|right|justify|left)["']/i);
    const matchTagDiv = linha.match(/<div\s+align=["'](center|right|justify|left)["']/i);
    if (matchTagP || matchTagDiv) {
      alinhamentoPendente = ((matchTagP || matchTagDiv)![1]).toLowerCase() as TipoAlinhamento;
    }

    alinhamentosDosBlocos.push(alinhamentoPendente || "left");
    alinhamentoPendente = null;
  }

  const temAlgumAlinhamento = alinhamentosDosBlocos.some((a) => a !== "left");
  if (!temAlgumAlinhamento) {
    return blocos;
  }

  // Percorre os blocos e atribui textAlignment correspondente 1-a-1
  return blocos.map((bloco, idx) => {
    const novoBloco = { ...bloco, props: { ...(bloco.props || {}) } };

    // Limpa anotações residuais do conteúdo de texto se houver
    if (Array.isArray(novoBloco.content)) {
      novoBloco.content = novoBloco.content.map((c: any) => {
        if (typeof c === "object" && typeof c.text === "string") {
          let textoLimpo = c.text
            .replace(/<!--\s*align:\s*(center|right|justify|left)\s*-->/gi, "")
            .replace(/<\/?(p|div)\s+align=["'][^"']+["']>/gi, "")
            .replace(/<\/(p|div)>/gi, "");
          return { ...c, text: textoLimpo };
        }
        return c;
      });
    }

    if (idx < alinhamentosDosBlocos.length) {
      novoBloco.props.textAlignment = alinhamentosDosBlocos[idx];
    }

    return novoBloco;
  });
}
