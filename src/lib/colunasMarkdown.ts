import {
  extrairAlinhamentoDoMarkdown,
  restaurarAlinhamentoEmBlocos,
} from "./alinhamentoMarkdown";

/**
 * Utilitários para preservação de layouts de colunas (estilo Notion)
 * entre o editor BlockNote e arquivos Markdown (.md).
 *
 * O Markdown padrão não possui sintaxe nativa para colunas lado a lado.
 * Utilizamos anotações discretas e limpas em comentários HTML:
 * <!-- klaus:colunas proporcoes="1,1" -->
 * <!-- klaus:coluna -->
 * Conteúdo da coluna 1...
 * <!-- klaus:coluna -->
 * Conteúdo da coluna 2...
 * <!-- klaus:fim-colunas -->
 *
 * Isso garante que:
 * 1. No Klaus: o editor reconstrói com precisão a estrutura de colunas e larguras relativas.
 * 2. No GitHub ou leitores externos: os comentários ficam invisíveis e o texto permanece 100% legível.
 */

export interface SegmentoMarkdown {
  tipo: "texto" | "colunas";
  conteudo: string;
  proporcoes?: number[];
  colunas?: string[];
}

const REGEX_BLOCO_COLUNAS =
  /<!--\s*klaus:colunas(?:\s+proporcoes=["']([^"']*)["'])?\s*-->([\s\S]*?)<!--\s*klaus:fim-colunas\s*-->/gi;

const REGEX_SEPARADOR_COLUNA = /<!--\s*klaus:coluna\s*-->/gi;

/**
 * Formata um conjunto de colunas e suas larguras para inclusão no Markdown.
 */
export function formatarColunasParaMarkdown(
  conteudosColunas: string[],
  proporcoes?: number[]
): string {
  if (!conteudosColunas || conteudosColunas.length === 0) {
    return "";
  }

  // Limita entre 2 e 5 colunas
  const colunasFiltradas = conteudosColunas.slice(0, 5);
  const props =
    proporcoes && proporcoes.length > 0
      ? proporcoes.slice(0, colunasFiltradas.length).map((p) => {
          const n = Number(p);
          return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : 1;
        })
      : colunasFiltradas.map(() => 1);

  const strProporcoes = props.join(",");

  const partes: string[] = [`<!-- klaus:colunas proporcoes="${strProporcoes}" -->`];

  for (const conteudo of colunasFiltradas) {
    partes.push("<!-- klaus:coluna -->");
    partes.push(conteudo.trim());
  }

  partes.push("<!-- klaus:fim-colunas -->");

  return partes.join("\n\n");
}

/**
 * Segmenta um texto Markdown dividindo entre blocos comuns e blocos de colunas.
 */
export function dividirMarkdownEmSegmentos(markdown: string): SegmentoMarkdown[] {
  if (!markdown || typeof markdown !== "string") {
    return [];
  }

  const segmentos: SegmentoMarkdown[] = [];
  let ultimoIndice = 0;

  REGEX_BLOCO_COLUNAS.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = REGEX_BLOCO_COLUNAS.exec(markdown)) !== null) {
    const inicio = match.index;
    const fim = REGEX_BLOCO_COLUNAS.lastIndex;

    // Texto antes do bloco de colunas
    if (inicio > ultimoIndice) {
      const textoAntes = markdown.slice(ultimoIndice, inicio).trim();
      if (textoAntes) {
        segmentos.push({
          tipo: "texto",
          conteudo: textoAntes,
        });
      }
    }

    const rawProporcoes = match[1] || "";
    const corpoColunas = match[2] || "";

    const proporcoes = rawProporcoes
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);

    // Divide pelas marcações de coluna
    const partesColunas = corpoColunas
      .split(REGEX_SEPARADOR_COLUNA)
      .map((c) => c.trim())
      .filter((c, idx) => idx > 0 || c.length > 0); // ignora eventual vazio antes da primeira tag

    segmentos.push({
      tipo: "colunas",
      conteudo: match[0],
      proporcoes: proporcoes.length > 0 ? proporcoes : undefined,
      colunas: partesColunas.length > 0 ? partesColunas : [""],
    });

    ultimoIndice = fim;
  }

  // Texto restante após o último bloco de colunas
  if (ultimoIndice < markdown.length) {
    const textoDepois = markdown.slice(ultimoIndice).trim();
    if (textoDepois) {
      segmentos.push({
        tipo: "texto",
        conteudo: textoDepois,
      });
    }
  }

  // Se não encontrou nenhuma coluna, retorna o markdown como bloco de texto simples
  if (segmentos.length === 0 && markdown.trim()) {
    segmentos.push({
      tipo: "texto",
      conteudo: markdown.trim(),
    });
  }

  return segmentos;
}

/**
 * Converte blocos do BlockNote para texto Markdown anotado com preservação
 * de alinhamento e colunas.
 */
export async function serializarBlocosComColunas(
  editor: any,
  blocos: any[]
): Promise<string> {
  if (!blocos || blocos.length === 0) return "";

  const partesMd: string[] = [];

  for (const b of blocos) {
    if (b.type === "columnList") {
      const colunas = (b.children || []).slice(0, 5);
      const proporcoes = colunas.map((col: any) => {
        const w = Number(col.props?.width);
        return Number.isFinite(w) && w > 0 ? Number(w.toFixed(2)) : 1;
      });

      const colunasMd: string[] = [];
      for (const col of colunas) {
        const filhos = col.children || [];
        if (filhos.length === 0) {
          colunasMd.push("");
          continue;
        }
        // Converte os filhos da coluna serializando individualmente para preservar alinhamentos
        const mdFilhos: string[] = [];
        for (const f of filhos) {
          const fMd = (await editor.blocksToMarkdownLossy([f])).trim();
          const align = (f.props as any)?.textAlignment;
          if (align && align !== "left") {
            mdFilhos.push(`<!-- align:${align} -->\n${fMd}`);
          } else {
            mdFilhos.push(fMd);
          }
        }
        colunasMd.push(mdFilhos.join("\n\n"));
      }

      const blocoFormatado = formatarColunasParaMarkdown(colunasMd, proporcoes);
      partesMd.push(blocoFormatado);
    } else {
      const bMd = (await editor.blocksToMarkdownLossy([b])).trim();
      const align = (b.props as any)?.textAlignment;
      if (align && align !== "left") {
        partesMd.push(`<!-- align:${align} -->\n${bMd}`);
      } else {
        partesMd.push(bMd);
      }
    }
  }

  return partesMd.join("\n\n");
}

/**
 * Analisa o Markdown e o converte para os blocos correspondentes do BlockNote,
 * reconstruindo a árvore com colunas (columnList e column) e alinhamentos.
 */
export async function converterMarkdownParaBlocosComColunas(
  editor: any,
  markdown: string
): Promise<any[]> {
  if (!markdown || !markdown.trim()) return [];

  const segmentos = dividirMarkdownEmSegmentos(markdown);
  const blocosFinais: any[] = [];

  for (const seg of segmentos) {
    if (seg.tipo === "texto") {
      const { markdownLimpo, alinhamentos } = extrairAlinhamentoDoMarkdown(seg.conteudo);
      const parsed = await editor.tryParseMarkdownToBlocks(markdownLimpo);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const comAlinhamento = restaurarAlinhamentoEmBlocos(parsed, alinhamentos);
        blocosFinais.push(...comAlinhamento);
      }
    } else if (seg.tipo === "colunas" && seg.colunas) {
      const colunasBlocos: any[] = [];
      const colunasTexto = seg.colunas.slice(0, 5);
      const proporcoes = seg.proporcoes || [];

      for (let i = 0; i < colunasTexto.length; i++) {
        const colMd = colunasTexto[i];
        let filhosDaColuna: any[] = [];

        if (colMd.trim()) {
          const { markdownLimpo, alinhamentos } = extrairAlinhamentoDoMarkdown(colMd);
          const parsed = await editor.tryParseMarkdownToBlocks(markdownLimpo);
          if (Array.isArray(parsed) && parsed.length > 0) {
            filhosDaColuna = restaurarAlinhamentoEmBlocos(parsed, alinhamentos);
          }
        }

        if (filhosDaColuna.length === 0) {
          filhosDaColuna = [{ type: "paragraph" }];
        }

        const largura = proporcoes[i] ?? 1;

        colunasBlocos.push({
          type: "column",
          props: {
            width: Number.isFinite(largura) && largura > 0 ? largura : 1,
          },
          children: filhosDaColuna,
        });
      }

      // BlockNote columnList precisa de pelo menos 2 colunas para existir como layout
      if (colunasBlocos.length >= 2) {
        blocosFinais.push({
          type: "columnList",
          props: {},
          children: colunasBlocos,
        });
      } else if (colunasBlocos.length === 1) {
        // Se sobrou só uma coluna, extrai os filhos diretamente para não aninhar inutilmente
        blocosFinais.push(...colunasBlocos[0].children);
      }
    }
  }

  return blocosFinais;
}
