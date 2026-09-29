/**
 * Klaus Goals & Milestones (PDI) Module
 *
 * Gerencia Metas e Entregas do Plano de Desenvolvimento Individual do Klaus:
 *   pdi/metas/*.md     — metas e objetivos
 *   pdi/entregas/*.md  — entregas e realizações
 */

import { diasAte } from "./utils";
import type { Meta, Entrega } from "./tipos";

export const PASTA_METAS = "pdi/metas";
export const PASTA_ENTREGAS = "pdi/entregas";
export const KLAUS_GOALS_DIR = PASTA_METAS;
export const KLAUS_DELIVERIES_DIR = PASTA_ENTREGAS;

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

export type KlausGoalSummary = ResumoMeta;

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

/** Alias canônico Klaus */
export const summarizeKlausGoals = resumir;

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

/** Alias canônico Klaus */
export const getKlausStalledGoals = paradas;

/** Entregas que ainda não foram ligadas a nenhuma meta. */
export function semMeta(entregas: Entrega[]): Entrega[] {
  return entregas.filter((e) => e.metas.length === 0);
}

/** Alias canônico Klaus */
export const getKlausUnlinkedDeliveries = semMeta;

/** Entregas com ligação sugerida pela IA e ainda não conferida. */
export function aConferir(entregas: Entrega[]): Entrega[] {
  return entregas.filter((e) => e.iaSugeriu);
}

/** Alias canônico Klaus */
export const getKlausPendingAiDeliveries = aConferir;
