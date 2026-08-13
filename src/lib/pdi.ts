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
 */

import type { Documento } from "./markdown";
import { comoLista } from "./markdown";
import { diasAte } from "./utils";

export const PASTA_METAS = "pdi/metas";
export const PASTA_ENTREGAS = "pdi/entregas";

export const STATUS_META = ["a-fazer", "em-andamento", "concluida"] as const;
export type StatusMeta = (typeof STATUS_META)[number];

export const ROTULO_META: Record<StatusMeta, string> = {
  "a-fazer": "A começar",
  "em-andamento": "Em andamento",
  concluida: "Concluída",
};

export type Meta = {
  caminho: string;
  /** Nome do arquivo sem .md — é a chave usada nas ligações */
  id: string;
  sha: string;
  titulo: string;
  status: StatusMeta;
  prazo?: string;
  /** Como você vai saber que chegou lá */
  indicador: string;
  corpo: string;
};

export type Entrega = {
  caminho: string;
  id: string;
  sha: string;
  titulo: string;
  data: string;
  /** ids das metas que esta entrega alimenta */
  metas: string[];
  /** true quando a ligação foi sugerida pela IA e ainda não foi conferida */
  iaSugeriu: boolean;
  corpo: string;
};

export function idDoCaminho(caminho: string): string {
  return caminho.split("/").pop()!.replace(/\.md$/, "");
}

function statusMetaValido(v: unknown): StatusMeta {
  return STATUS_META.includes(v as StatusMeta) ? (v as StatusMeta) : "a-fazer";
}

export function comoMeta(
  doc: Documento,
  caminho: string,
  sha: string,
  tituloFallback: string,
): Meta {
  const d = doc.dados;
  return {
    caminho,
    id: idDoCaminho(caminho),
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    status: statusMetaValido(d.status),
    prazo: typeof d.prazo === "string" ? d.prazo : undefined,
    indicador: typeof d.indicador === "string" ? d.indicador : "",
    corpo: doc.corpo,
  };
}

export function comoEntrega(
  doc: Documento,
  caminho: string,
  sha: string,
  tituloFallback: string,
): Entrega {
  const d = doc.dados;
  return {
    caminho,
    id: idDoCaminho(caminho),
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    data:
      typeof d.data === "string" ? d.data : caminho.slice(-13, -3), // AAAA-MM-DD do nome
    metas: comoLista(d.metas),
    iaSugeriu: d.ia_sugeriu === true,
    corpo: doc.corpo,
  };
}

export function metaParaFrontmatter(m: Meta): Record<string, unknown> {
  return {
    titulo: m.titulo,
    tipo: "meta",
    status: m.status,
    prazo: m.prazo,
    indicador: m.indicador || undefined,
  };
}

export function entregaParaFrontmatter(e: Entrega): Record<string, unknown> {
  return {
    titulo: e.titulo,
    tipo: "entrega",
    data: e.data,
    metas: e.metas.length ? e.metas : undefined,
    ia_sugeriu: e.iaSugeriu || undefined,
  };
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
    const ligadas = entregas
      .filter((e) => e.metas.includes(meta.id))
      .sort((a, b) => b.data.localeCompare(a.data));

    const ultima = ligadas[0];
    const dias = ultima ? -(diasAte(ultima.data) ?? 0) : null;

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

export function textoPrazoMeta(m: Meta): string {
  const d = diasAte(m.prazo);
  if (d === null) return "";
  if (m.status === "concluida") return "";
  if (d < 0) return `venceu há ${-d} dia${-d > 1 ? "s" : ""}`;
  if (d === 0) return "vence hoje";
  if (d <= 30) return `${d} dias`;
  return `${Math.round(d / 30)} meses`;
}
