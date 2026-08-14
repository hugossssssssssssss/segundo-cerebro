/**
 * Regras das tarefas.
 *
 * Uma tarefa é um arquivo .md em `tarefas/`. O frontmatter guarda o estado;
 * o corpo é anotação livre. O tempo de pomodoro é registrado no próprio corpo,
 * para continuar legível fora do app.
 */

import type { Documento, Frontmatter } from "./markdown";
import { comoLista, mesclarFrontmatter } from "./markdown";
import { diasAte } from "./utils";

export const STATUS = ["a-fazer", "fazendo", "feito"] as const;
export type Status = (typeof STATUS)[number];

export const ROTULO_STATUS: Record<Status, string> = {
  "a-fazer": "A fazer",
  fazendo: "Fazendo",
  feito: "Feito",
};

export type Tarefa = {
  /** Frontmatter como veio do arquivo — preserva campos que o app não conhece */
  bruto: Frontmatter;
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
    bruto: doc.dados,
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
  return mesclarFrontmatter(t.bruto, {
    titulo: t.titulo,
    tipo: "tarefa",
    status: t.status,
    prazo: t.prazo,
    tags: t.tags.length ? t.tags : undefined,
  });
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

/* ------------------------------------------------------------ subtarefas */

/**
 * Subtarefas são caixinhas markdown no corpo da tarefa:
 *
 *   - [ ] escolher as imagens
 *   - [x] revisar os textos
 *
 * Guardar assim, e não num campo do frontmatter, tem uma razão: continua
 * legível e clicável em qualquer editor de Markdown, no GitHub e para
 * qualquer IA. É a mesma sintaxe que o mundo inteiro já usa.
 */

const CAIXA = /^(\s*)[-*]\s+\[( |x|X)\]\s+(.*)$/;

export type Subtarefa = {
  /** Índice da linha no corpo — é assim que marcamos a certa */
  linha: number;
  feita: boolean;
  texto: string;
};

export function lerSubtarefas(corpo: string): Subtarefa[] {
  const saida: Subtarefa[] = [];
  corpo.split("\n").forEach((l, i) => {
    const m = l.match(CAIXA);
    if (m) {
      saida.push({ linha: i, feita: m[2].toLowerCase() === "x", texto: m[3].trim() });
    }
  });
  return saida;
}

/** Marca ou desmarca uma caixinha, preservando indentação e o resto do texto. */
export function alternarSubtarefa(corpo: string, linha: number): string {
  const linhas = corpo.split("\n");
  const alvo = linhas[linha];
  if (alvo === undefined) return corpo;

  const m = alvo.match(CAIXA);
  if (!m) return corpo;

  const marcada = m[2].toLowerCase() === "x";
  linhas[linha] = alvo.replace(
    /\[( |x|X)\]/,
    marcada ? "[ ]" : "[x]",
  );
  return linhas.join("\n");
}

/** Acrescenta uma subtarefa no fim da lista existente, ou no fim do corpo. */
export function adicionarSubtarefa(corpo: string, texto: string): string {
  const limpo = texto.trim();
  if (!limpo) return corpo;

  const linhas = corpo.split("\n");
  const subs = lerSubtarefas(corpo);

  if (subs.length === 0) {
    const base = corpo.trimEnd();
    return `${base}${base ? "\n\n" : ""}- [ ] ${limpo}\n`;
  }

  // insere logo abaixo da última caixinha, herdando a indentação dela
  const ultima = subs[subs.length - 1].linha;
  const recuo = linhas[ultima].match(/^(\s*)/)?.[1] ?? "";
  linhas.splice(ultima + 1, 0, `${recuo}- [ ] ${limpo}`);
  return linhas.join("\n");
}

export function removerSubtarefa(corpo: string, linha: number): string {
  const linhas = corpo.split("\n");
  if (!linhas[linha]?.match(CAIXA)) return corpo;
  linhas.splice(linha, 1);
  return linhas.join("\n");
}

/** Quantas estão feitas, para a barrinha de progresso. */
export function progressoSubtarefas(corpo: string): {
  feitas: number;
  total: number;
  porcento: number;
} {
  const subs = lerSubtarefas(corpo);
  const feitas = subs.filter((s) => s.feita).length;
  return {
    feitas,
    total: subs.length,
    porcento: subs.length ? Math.round((feitas / subs.length) * 100) : 0,
  };
}
