/**
 * Regras das tarefas.
 *
 * Uma tarefa é um arquivo .md em `tarefas/`. O frontmatter guarda o estado;
 * o corpo é anotação livre. O tempo de pomodoro é registrado no próprio corpo,
 * para continuar legível fora do app.
 */

import type { Documento } from "./markdown";
import { comoLista } from "./markdown";
import { diasAte } from "./utils";

export const STATUS = ["a-fazer", "fazendo", "feito"] as const;
export type Status = (typeof STATUS)[number];

export const ROTULO_STATUS: Record<Status, string> = {
  "a-fazer": "A fazer",
  fazendo: "Fazendo",
  feito: "Feito",
};

export type Tarefa = {
  caminho: string;
  sha: string;
  titulo: string;
  status: Status;
  prazo?: string;
  tags: string[];
  corpo: string;
};

export function statusValido(v: unknown): Status {
  return STATUS.includes(v as Status) ? (v as Status) : "a-fazer";
}

/** Monta uma Tarefa a partir do arquivo lido. Campos ausentes viram padrão. */
export function comoTarefa(
  doc: Documento,
  caminho: string,
  sha: string,
  tituloFallback: string,
): Tarefa {
  const d = doc.dados;
  return {
    caminho,
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    status: statusValido(d.status),
    prazo: typeof d.prazo === "string" ? d.prazo : undefined,
    tags: comoLista(d.tags),
    corpo: doc.corpo,
  };
}

/** Frontmatter para gravar de volta. */
export function paraFrontmatter(t: Tarefa): Record<string, unknown> {
  return {
    titulo: t.titulo,
    tipo: "tarefa",
    status: t.status,
    prazo: t.prazo,
    tags: t.tags.length ? t.tags : undefined,
  };
}

/* -------------------------------------------------------------- ordenação */

/**
 * Ordena pelo que exige atenção primeiro: atrasadas, depois por prazo,
 * depois as sem prazo. Concluídas sempre no fim.
 */
export function ordenar(tarefas: Tarefa[]): Tarefa[] {
  return [...tarefas].sort((a, b) => {
    if (a.status === "feito" && b.status !== "feito") return 1;
    if (b.status === "feito" && a.status !== "feito") return -1;

    const da = diasAte(a.prazo);
    const db = diasAte(b.prazo);
    if (da === null && db === null) return a.titulo.localeCompare(b.titulo);
    if (da === null) return 1; // sem prazo vai depois
    if (db === null) return -1;
    return da - db;
  });
}

/* --------------------------------------------------------------- urgência */

export type Urgencia = "atrasada" | "hoje" | "proxima" | "tranquila" | "nenhuma";

export function urgencia(t: Tarefa): Urgencia {
  if (t.status === "feito") return "nenhuma";
  const d = diasAte(t.prazo);
  if (d === null) return "nenhuma";
  if (d < 0) return "atrasada";
  if (d === 0) return "hoje";
  if (d <= 3) return "proxima";
  return "tranquila";
}

export function textoPrazo(t: Tarefa): string {
  const d = diasAte(t.prazo);
  if (d === null) return "";
  if (d < 0) return d === -1 ? "atrasada 1 dia" : `atrasada ${-d} dias`;
  if (d === 0) return "vence hoje";
  if (d === 1) return "amanhã";
  if (d <= 7) return `em ${d} dias`;
  return t.prazo ?? "";
}

/* --------------------------------------------------------------- pomodoro */

/**
 * Acrescenta o registro de um ciclo no corpo da tarefa, sob um cabeçalho fixo.
 * Fica legível como texto puro, fora do app:
 *
 *   ## Tempo
 *   - 2026-08-13 14:20 → 14:45 (25min)
 */
export function registrarCiclo(corpo: string, minutos: number): string {
  const agora = new Date();
  const fim = agora.toTimeString().slice(0, 5);
  const inicio = new Date(agora.getTime() - minutos * 60_000)
    .toTimeString()
    .slice(0, 5);
  const dia = agora.toISOString().slice(0, 10);
  const linha = `- ${dia} ${inicio} → ${fim} (${minutos}min)`;

  const CABECALHO = "## Tempo";
  if (corpo.includes(CABECALHO)) {
    // insere logo abaixo do cabeçalho, mantendo o mais recente no topo
    return corpo.replace(CABECALHO, `${CABECALHO}\n${linha}`);
  }
  const base = corpo.trimEnd();
  return `${base}${base ? "\n\n" : ""}${CABECALHO}\n${linha}\n`;
}

/** Soma os minutos já registrados no corpo. */
export function minutosRegistrados(corpo: string): number {
  const encontrados = corpo.matchAll(/\((\d+)min\)/g);
  let total = 0;
  for (const m of encontrados) total += Number(m[1]);
  return total;
}
