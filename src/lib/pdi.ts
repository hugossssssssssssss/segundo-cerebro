/**
 * Plano de Desenvolvimento Individual.
 *
 * Duas coisas, guardadas como arquivos .md:
 *
 *   pdi/metas/*.md     — onde você quer chegar
 *   pdi/entregas/*.md  — o que você já fez
 *
 * A ligação entre elas é o campo `metas` no frontmatter da entrega, que
 * aponta para o NOME DO ARQUIVO da meta (sem .md). Usar o nome do arquivo
 * e não o título permite renomear o título sem quebrar a ligação.
 *
 * Os tipos e funções de conversão vivem agora em `tipos.ts` e `entidades.ts`.
 * Este arquivo re-exporta tudo com os nomes legados.
 */

import { diasAte } from "./utils";
import type { Meta, Entrega } from "./tipos";

export const PASTA_METAS = "pdi/metas";
export const PASTA_ENTREGAS = "pdi/entregas";

// Re-exporta os contratos centrais
export {
  STATUS_META,
  ROTULO_STATUS_META as ROTULO_META,
  type StatusMeta,
  type Meta,
  type Entrega,
} from "./tipos";

export {
  comoMeta,
  comoEntrega,
  dataDoNome,
  textoPrazoMeta,
} from "./entidades";

import { metaParaArquivo, entregaParaArquivo } from "./entidades";

/**
 * Wrappers legados que retornam só o frontmatter (Record), não {dados,corpo}.
 * Mantidos para compatibilidade com testes e código antigo.
 * As telas novas usam `metaParaArquivo` e `entregaParaArquivo` de entidades.ts.
 */
export function metaParaFrontmatter(m: Meta): Record<string, unknown> {
  return metaParaArquivo(m).dados;
}
export function entregaParaFrontmatter(e: Entrega): Record<string, unknown> {
  return entregaParaArquivo(e).dados;
}

export function idDoCaminho(caminho: string): string {
  return caminho.split("/").pop()!.replace(/\.md$/, "");
}

/* ------------------------------------------------------------- agregação */

export type ResumoMeta = {
  meta: Meta;
  entregas: Entrega[];
  /** Dias desde a última entrega ligada a esta meta. null = nenhuma ainda */
  diasSemMovimento: number | null;
};

export function resumir(metas: Meta[], entregas: Entrega[]): ResumoMeta[] {
  return metas.map((meta) => {
    const slugArquivo = idDoCaminho(meta.caminho);
    const ligadas = entregas
      .filter((e) => e.metas.includes(meta.id) || (Boolean(slugArquivo) && e.metas.includes(slugArquivo)))
      .sort((a, b) => b.data.localeCompare(a.data));

    const ultima = ligadas[0];
    const dias = ultima ? Math.max(0, -(diasAte(ultima.data) ?? 0)) : null;

    return { meta, entregas: ligadas, diasSemMovimento: dias };
  });
}

/**
 * Metas que precisam de atenção: sem nenhuma entrega há mais de 30 dias.
 * Meta concluída ou recém-criada não conta.
 */
export function paradas(resumos: ResumoMeta[]): ResumoMeta[] {
  return resumos.filter(
    (r) =>
      r.meta.status !== "concluida" &&
      r.diasSemMovimento !== null &&
      r.diasSemMovimento > 30,
  );
}

/** Entregas que ainda não foram ligadas a nenhuma meta. */
export function semMeta(entregas: Entrega[]): Entrega[] {
  return entregas.filter((e) => e.metas.length === 0);
}

/** Entregas com ligação sugerida pela IA e ainda não conferida. */
export function aConferir(entregas: Entrega[]): Entrega[] {
  return entregas.filter((e) => e.iaSugeriu);
}


