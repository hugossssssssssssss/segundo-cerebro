/**
 * Refatoração e atualização de referências cruzadas em cascata.
 *
 * Ao renomear uma nota, meta ou tarefa:
 * 1. Isola blocos de código (fenced e inline) para não alterar menções falsas.
 * 2. Atualiza menções @TituloAntigo -> @TituloNovo sem corromper títulos compostos
 *    mais longos (ex: @Design vs @Design System).
 * 3. Atualiza wikilinks legados [[TituloAntigo]].
 * 4. Atualiza referências de URL interna (?abrir=caminho-antigo.md).
 * 5. Oferece `planejarRefatoracao` para visualização e confirmação antes de gravar.
 */

import type { ItemRepo } from "./repo";
import { tituloProvavel, lerMarkdown } from "./markdown";
import { atualizarCacheLocal, invalidarCache } from "./repo";
import { dispararAtualizacaoAcervo } from "./eventos";
import { notificarOutrasAbas } from "./syncChannel";
import type { Settings } from "./settings";
import { gravar } from "./github";

export type AlteracaoProposta = {
  caminho: string;
  titulo: string;
  textoAntes: string;
  textoDepois: string;
  sha: string;
};

export type PlanoRefatoracao = {
  totalArquivos: number;
  alteracoes: AlteracaoProposta[];
};

function escaparRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Isola blocos de código protegidos para que menções dentro deles não sejam tocadas.
 */
export function isolarBlocosCodigo(markdown: string): { textoSemCodigo: string; blocos: string[] } {
  const blocos: string[] = [];
  const textoSemCodigo = markdown.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    blocos.push(match);
    return `__BLOCO_CODIGO_PROTEGIDO_${blocos.length - 1}__`;
  });
  return { textoSemCodigo, blocos };
}

/**
 * Restaura os blocos de código originais.
 */
export function restaurarBlocosCodigo(texto: string, blocos: string[]): string {
  return texto.replace(/__BLOCO_CODIGO_PROTEGIDO_(\d+)__/g, (_m, idx) => blocos[Number(idx)] ?? "");
}

/**
 * Substitui menções de um título antigo por um título novo de forma estritamente segura.
 */
export function substituirMencoesSeguras(
  textoOriginal: string,
  tituloAntigo: string,
  tituloNovo: string,
  titulosConhecidosNoAcervo: string[] = [],
  caminhoAntigo?: string,
  caminhoNovo?: string,
): string {
  if (!textoOriginal || !tituloAntigo || !tituloNovo) return textoOriginal;
  if (tituloAntigo.trim() === tituloNovo.trim()) return textoOriginal;

  const antigoLimpo = tituloAntigo.trim();
  const novoLimpo = tituloNovo.trim();

  // 1. Isola blocos de código
  const { textoSemCodigo, blocos } = isolarBlocosCodigo(textoOriginal);

  // 2. Identifica títulos conhecidos que são extensões do título antigo
  const titulosMaisLongos = titulosConhecidosNoAcervo
    .filter((t) => t && t.length > antigoLimpo.length && t.toLowerCase().startsWith(`${antigoLimpo.toLowerCase()} `));

  function ehPrefixoDeOutroTitulo(texto: string, pos: number): boolean {
    return titulosMaisLongos.some((t) => texto.toLowerCase().startsWith(t.toLowerCase(), pos));
  }

  // Regex para @TituloAntigo respeitando limites de palavras e acentos
  const regArroba = new RegExp(`@${escaparRegex(antigoLimpo)}(?![\\w\\u00C0-\\u024F])`, "gi");
  let textoProcessado = textoSemCodigo.replace(regArroba, (casado, deslocamento: number, textoInteiro: string) => {
    // +1 para pular o "@" e comparar contra o título
    return ehPrefixoDeOutroTitulo(textoInteiro, deslocamento + 1) ? casado : `@${novoLimpo}`;
  });

  // Regex para [[TituloAntigo]] e [[TituloAntigo|Texto]]
  const regColchetes = new RegExp(`\\[\\[${escaparRegex(antigoLimpo)}(\\|[^\\]]+)?\\]\\]`, "gi");
  textoProcessado = textoProcessado.replace(regColchetes, (_match, alias) => {
    return alias ? `[[${novoLimpo}${alias}]]` : `[[${novoLimpo}]]`;
  });

  // Se houver caminho antigo e novo, atualiza URLs internas (?abrir=...)
  if (caminhoAntigo && caminhoNovo && caminhoAntigo !== caminhoNovo) {
    const encAntigo = encodeURIComponent(caminhoAntigo);
    const encNovo = encodeURIComponent(caminhoNovo);
    textoProcessado = textoProcessado
      .replaceAll(`?abrir=${caminhoAntigo}`, `?abrir=${caminhoNovo}`)
      .replaceAll(`?abrir=${encAntigo}`, `?abrir=${encNovo}`);
  }

  // 3. Restaura blocos de código
  return restaurarBlocosCodigo(textoProcessado, blocos);
}

/**
 * Monta o plano de refatoração comparando o acervo sem gravar no repositório.
 */
export function planejarRefatoracao(
  acervo: ItemRepo[],
  tituloAntigo: string,
  tituloNovo: string,
  caminhoAntigo?: string,
  caminhoNovo?: string,
): PlanoRefatoracao {
  if (!tituloAntigo || !tituloNovo || tituloAntigo.trim() === tituloNovo.trim()) {
    return { totalArquivos: 0, alteracoes: [] };
  }

  const titulosTodos = acervo.map((i) => tituloProvavel(i.doc, i.nome));
  const alteracoes: AlteracaoProposta[] = [];

  for (const item of acervo) {
    // Não substitui dentro do próprio item se for o próprio alvo que está sendo renomeado
    if (caminhoAntigo && item.caminho === caminhoAntigo) continue;

    const textoAtual = item.texto || "";
    const textoNovo = substituirMencoesSeguras(
      textoAtual,
      tituloAntigo,
      tituloNovo,
      titulosTodos,
      caminhoAntigo,
      caminhoNovo,
    );

    if (textoNovo !== textoAtual) {
      alteracoes.push({
        caminho: item.caminho,
        titulo: tituloProvavel(item.doc, item.nome),
        textoAntes: textoAtual,
        textoDepois: textoNovo,
        sha: item.sha,
      });
    }
  }

  return {
    totalArquivos: alteracoes.length,
    alteracoes,
  };
}

/**
 * Executa o plano de refatoração no GitHub sequencialmente com pausa preventiva.
 */
export async function executarPlanoRefatoracao(
  cfg: Settings,
  plano: PlanoRefatoracao,
  aoProgredir?: (atual: number, total: number) => void,
): Promise<{ sucessos: number; falhas: string[] }> {
  const falhas: string[] = [];
  let sucessos = 0;

  for (let i = 0; i < plano.alteracoes.length; i++) {
    const alt = plano.alteracoes[i];
    try {
      const novoSha = await gravar(
        cfg,
        alt.caminho,
        alt.textoDepois,
        alt.sha,
        `refatorar: atualizar menções em cascata`,
      );
      const docAtualizado = lerMarkdown(alt.textoDepois);
      atualizarCacheLocal(alt.caminho, alt.textoDepois, docAtualizado, novoSha);
      sucessos++;
    } catch {
      falhas.push(alt.caminho);
    }

    if (aoProgredir) {
      aoProgredir(i + 1, plano.alteracoes.length);
    }

    // Pequena pausa entre requisições para evitar rate-limit agressivo
    if (i < plano.alteracoes.length - 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  if (sucessos > 0) {
    invalidarCache();
    dispararAtualizacaoAcervo();
    notificarOutrasAbas();
  }

  return { sucessos, falhas };
}
