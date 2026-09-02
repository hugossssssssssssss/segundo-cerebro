/**
 * Lixeira Soberana em Markdown do Klaus (.lixeira/)
 *
 * Em vez de destruir arquivos permanentemente com DELETE direto no GitHub,
 * move o arquivo para a pasta oculta `.lixeira/` preservando todo o histórico
 * e metadados com possibilidade de restauração em 1 clique.
 */

import type { Settings } from "./settings";
import type { ItemRepo } from "./repo";
import { ler, gravar, apagar } from "./github";
import { lerMarkdown, escreverMarkdown, mesclarFrontmatter, tituloProvavel } from "./markdown";
import { invalidarCache, obterCacheExistente } from "./repo";
import { dispararAtualizacaoAcervo } from "./eventos";
import { notificarOutrasAbas } from "./syncChannel";

export const PASTA_LIXEIRA = ".lixeira";

export type ItemLixeira = {
  caminho: string;
  caminhoOrigem: string;
  titulo: string;
  apagadoEm: string;
  sha: string;
  tipo: string;
};

/**
 * Move um arquivo para a Lixeira Soberana (.lixeira/) com metadados de reversão.
 */
export async function moverParaLixeira(
  cfg: Settings,
  caminho: string,
  sha: string,
): Promise<void> {
  let texto: string;
  const itemEmCache = obterCacheExistente(cfg)?.itens.find((i) => i.caminho === caminho);
  if (itemEmCache && itemEmCache.texto) {
    texto = itemEmCache.texto;
  } else {
    const lido = await ler(cfg, caminho);
    texto = lido.texto;
  }
  const doc = lerMarkdown(texto);

  const caminhoLixeira = `${PASTA_LIXEIRA}/${caminho}`;
  const agora = new Date().toISOString();

  const dadosLixeira = mesclarFrontmatter(doc.dados, {
    apagado_em: agora,
    caminho_origem: caminho,
  });

  const textoLixeira = escreverMarkdown({ dados: dadosLixeira, corpo: doc.corpo });

  // 1. Grava na pasta da lixeira
  await gravar(cfg, caminhoLixeira, textoLixeira, undefined, `lixeira: mover ${caminho}`);

  // 2. Remove o arquivo da árvore ativa original
  await apagar(cfg, caminho, sha);

  invalidarCache();
  dispararAtualizacaoAcervo();
  notificarOutrasAbas();
}

/**
 * Restaura um arquivo da Lixeira para sua pasta de origem.
 */
export async function restaurarDaLixeira(
  cfg: Settings,
  caminhoLixeira: string,
  shaLixeira: string,
): Promise<string> {
  const { texto } = await ler(cfg, caminhoLixeira);
  const doc = lerMarkdown(texto);

  const caminhoOrigem = (doc.dados.caminho_origem as string) || caminhoLixeira.replace(/^\.lixeira\//, "");

  const dadosOriginais = { ...doc.dados };
  delete dadosOriginais.apagado_em;
  delete dadosOriginais.caminho_origem;

  const textoRestaurado = escreverMarkdown({ dados: dadosOriginais, corpo: doc.corpo });

  // 1. Regrava no destino original
  let novoSha: string;
  try {
    novoSha = await gravar(cfg, caminhoOrigem, textoRestaurado, undefined, `lixeira: restaurar ${caminhoOrigem}`);
  } catch (err: any) {
    if (err?.message?.includes("sha") || err?.message?.includes("422") || err?.message?.includes("já existe")) {
      throw new Error(`Já existe um arquivo ativo com o caminho "${caminhoOrigem}". Renomeie ou exclua o arquivo existente antes de restaurar este item.`);
    }
    throw err;
  }

  // 2. Remove da lixeira
  await apagar(cfg, caminhoLixeira, shaLixeira);

  invalidarCache();
  dispararAtualizacaoAcervo();
  notificarOutrasAbas();

  return novoSha;
}

/**
 * Filtra e formata os itens da lixeira a partir do acervo carregado.
 */
export function listarItensLixeira(acervo: ItemRepo[]): ItemLixeira[] {
  return acervo
    .filter((item) => item.caminho.startsWith(`${PASTA_LIXEIRA}/`))
    .map((item) => {
      const doc = item.doc;
      const caminhoOrigem = (doc.dados?.caminho_origem as string) || item.caminho.replace(/^\.lixeira\//, "");
      const apagadoEm = (doc.dados?.apagado_em as string) || "";
      const titulo = tituloProvavel(doc, item.nome);
      const tipo = (doc.dados?.tipo as string) || caminhoOrigem.split("/")[0] || "nota";

      return {
        caminho: item.caminho,
        caminhoOrigem,
        titulo,
        apagadoEm,
        sha: item.sha,
        tipo,
      };
    })
    .sort((a, b) => (b.apagadoEm || "").localeCompare(a.apagadoEm || ""));
}
