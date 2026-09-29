/**
 * Klaus Tasks & Subtasks Domain Logic
 *
 * Uma tarefa é um arquivo .md em `tarefas/`. O frontmatter guarda o estado;
 * o corpo é anotação livre. Subtarefas são caixinhas markdown legíveis no próprio corpo.
 */

import { diasAte, dataISO, formatarDataPtBR, normalizarDataISO } from "./utils";
import type { Tarefa } from "./tipos";

export {
  STATUS_TAREFA as STATUS,
  ROTULO_STATUS_TAREFA as ROTULO_STATUS,
  type StatusTarefa as Status,
  type Tarefa,
} from "./tipos";

export {
  comoTarefa,
} from "./entidades";

import { tarefaParaArquivo } from "./entidades";

export function paraFrontmatter(t: Tarefa): Record<string, unknown> {
  return tarefaParaArquivo(t).dados;
}

export function statusValido(v: unknown): import("./tipos").StatusTarefa {
  const validos = ["a-fazer", "fazendo", "feito"] as const;
  return validos.includes(v as typeof validos[number]) ? (v as typeof validos[number]) : "a-fazer";
}

/* -------------------------------------------------------------- ordenação */

export function ordenar(tarefas: Tarefa[]): Tarefa[] {
  return [...tarefas].sort((a, b) => {
    if (a.status === "feito" && b.status !== "feito") return 1;
    if (b.status === "feito" && a.status !== "feito") return -1;

    const da = diasAte(a.prazo);
    const db = diasAte(b.prazo);
    if (da === null && db === null) return a.titulo.localeCompare(b.titulo);
    if (da === null) return 1;
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
  const intervalo = extrairIntervaloTarefa(t);
  if (intervalo?.ehIntervalo) {
    return intervalo.textoFormatado;
  }
  const d = diasAte(t.prazo);
  if (d === null) return "";
  if (d < 0) return d === -1 ? "atrasada 1 dia" : `atrasada ${-d} dias`;
  if (d === 0) return "vence hoje";
  if (d === 1) return "amanhã";
  if (d <= 7) return `em ${d} dias`;
  return formatarDataPtBR(t.prazo) || (t.prazo ?? "");
}

export interface IntervaloTarefa {
  inicio: Date;
  fim: Date;
  ehIntervalo: boolean;
  textoFormatado: string;
}

export function extrairIntervaloTarefa(t: Tarefa): IntervaloTarefa | null {
  const prazoRaw = typeof t.prazo === "string" ? t.prazo.trim() : "";
  const inicioRaw =
    typeof t.bruto?.inicio === "string" ? t.bruto.inicio.trim() :
    typeof t.bruto?.data_inicio === "string" ? t.bruto.data_inicio.trim() : "";
  const fimRaw =
    typeof t.bruto?.fim === "string" ? t.bruto.fim.trim() :
    typeof t.bruto?.data_fim === "string" ? t.bruto.data_fim.trim() : "";

  let strInicio = "";
  let strFim = "";

  if (prazoRaw.includes("→") || prazoRaw.includes("->") || prazoRaw.includes(" a ")) {
    const separador = prazoRaw.includes("→") ? "→" : prazoRaw.includes("->") ? "->" : " a ";
    const partes = prazoRaw.split(separador).map((p) => p.trim());
    strInicio = partes[0] || "";
    strFim = partes[1] || "";
  } else if (inicioRaw && (fimRaw || prazoRaw)) {
    strInicio = inicioRaw;
    strFim = fimRaw || prazoRaw;
  } else if (prazoRaw) {
    strInicio = prazoRaw;
    strFim = prazoRaw;
  } else if (inicioRaw) {
    strInicio = inicioRaw;
    strFim = inicioRaw;
  }

  if (!strInicio) return null;

  const isoInicio = normalizarDataISO(strInicio);
  const isoFim = strFim ? normalizarDataISO(strFim) : isoInicio;

  if (!isoInicio) return null;
  const isoFimValido = isoFim || isoInicio;

  const [anoI, mesI, diaI] = isoInicio.split("-").map(Number);
  const [anoF, mesF, diaF] = isoFimValido.split("-").map(Number);

  let dataInicio = new Date(anoI, mesI - 1, diaI, 0, 0, 0, 0);
  let dataFim = new Date(anoF, mesF - 1, diaF, 23, 59, 59, 999);

  if (isNaN(dataInicio.getTime())) return null;
  if (isNaN(dataFim.getTime())) dataFim = dataInicio;

  if (dataFim < dataInicio) {
    const temp = dataInicio;
    dataInicio = dataFim;
    dataFim = temp;
  }

  const ehIntervalo = isoInicio !== isoFimValido;

  return {
    inicio: dataInicio,
    fim: dataFim,
    ehIntervalo,
    textoFormatado: ehIntervalo
      ? `${formatarDataPtBR(isoInicio)} → ${formatarDataPtBR(isoFimValido)}`
      : formatarDataPtBR(isoInicio),
  };
}

/* --------------------------------------------------------------- pomodoro */

export function registrarCiclo(corpo: string, minutos: number): string {
  const minsValidos = Math.max(1, Math.round(minutos || 0));
  const agora = new Date();
  const fim = agora.toTimeString().slice(0, 5);
  const inicio = new Date(agora.getTime() - minsValidos * 60_000)
    .toTimeString()
    .slice(0, 5);
  const dia = dataISO(agora);
  const linha = `- ${dia} ${inicio} → ${fim} (${minsValidos}min)`;

  const CABECALHO = "## Tempo";
  if (corpo.includes(CABECALHO)) {
    return corpo.replace(CABECALHO, `${CABECALHO}\n${linha}`);
  }
  const base = corpo.trimEnd();
  return `${base}${base ? "\n\n" : ""}${CABECALHO}\n${linha}\n`;
}

export function minutosRegistrados(corpo: string): number {
  const encontrados = corpo.matchAll(/\((\d+)min\)/g);
  let total = 0;
  for (const m of encontrados) total += Number(m[1]);
  return total;
}

/* ------------------------------------------------------------ subtarefas */

const CAIXA = /^(\s*)[-*]\s+\[( |x|X)\]\s+(.*)$/;

export type Subtarefa = {
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

export function alternarSubtarefa(corpo: string, identificador: number | string, feita?: boolean): string {
  let textoAlvo = "";
  let feitaAlvo = false;

  if (typeof identificador === "number") {
    const subs = lerSubtarefas(corpo);
    const encontrada = subs.find((s) => s.linha === identificador);
    if (!encontrada) return corpo;
    textoAlvo = encontrada.texto;
    feitaAlvo = encontrada.feita;
  } else {
    textoAlvo = identificador;
    feitaAlvo = feita !== undefined ? feita : false;
  }

  const linhas = corpo.split("\n");
  const idx = linhas.findIndex((l) => {
    const m = l.match(CAIXA);
    return m && m[3].trim() === textoAlvo && (m[2].toLowerCase() === "x") === feitaAlvo;
  });

  if (idx === -1) {
    const idxApenasTexto = linhas.findIndex((l) => {
      const m = l.match(CAIXA);
      return m && m[3].trim() === textoAlvo;
    });
    if (idxApenasTexto === -1) return corpo;

    const m = linhas[idxApenasTexto].match(CAIXA)!;
    const jaMarcada = m[2].toLowerCase() === "x";
    linhas[idxApenasTexto] = linhas[idxApenasTexto].replace(
      /\[( |x|X)\]/,
      jaMarcada ? "[ ]" : "[x]"
    );
    return linhas.join("\n");
  }

  linhas[idx] = linhas[idx].replace(
    /\[( |x|X)\]/,
    feitaAlvo ? "[ ]" : "[x]"
  );
  return linhas.join("\n");
}

export function adicionarSubtarefa(corpo: string, texto: string): string {
  const limpo = texto.trim();
  if (!limpo) return corpo;

  const linhas = corpo.split("\n");
  const subs = lerSubtarefas(corpo);

  if (subs.length === 0) {
    const base = corpo.trimEnd();
    return `${base}${base ? "\n\n" : ""}- [ ] ${limpo}\n`;
  }

  const ultima = subs[subs.length - 1].linha;
  const recuo = linhas[ultima].match(/^(\s*)/)?.[1] ?? "";
  linhas.splice(ultima + 1, 0, `${recuo}- [ ] ${limpo}`);
  return linhas.join("\n");
}

export function removerSubtarefa(corpo: string, identificador: number | string, feita?: boolean): string {
  let textoAlvo = "";
  let feitaAlvo = false;

  if (typeof identificador === "number") {
    const subs = lerSubtarefas(corpo);
    const encontrada = subs.find((s) => s.linha === identificador);
    if (!encontrada) return corpo;
    textoAlvo = encontrada.texto;
    feitaAlvo = encontrada.feita;
  } else {
    textoAlvo = identificador;
    feitaAlvo = feita !== undefined ? feita : false;
  }

  const linhas = corpo.split("\n");
  const idx = linhas.findIndex((l) => {
    const m = l.match(CAIXA);
    return m && m[3].trim() === textoAlvo && (m[2].toLowerCase() === "x") === feitaAlvo;
  });

  if (idx === -1) {
    const idxApenasTexto = linhas.findIndex((l) => {
      const m = l.match(CAIXA);
      return m && m[3].trim() === textoAlvo;
    });
    if (idxApenasTexto === -1) return corpo;
    linhas.splice(idxApenasTexto, 1);
    return linhas.join("\n");
  }

  linhas.splice(idx, 1);
  return linhas.join("\n");
}

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

export function proximaDataRecorrencia(
  prazoAtual?: string,
  frequencia?: "diaria" | "semanal" | "mensal",
): string {
  const base = prazoAtual ? new Date(prazoAtual + "T12:00:00") : new Date();
  if (isNaN(base.getTime())) return dataISO(new Date());

  if (frequencia === "diaria") {
    base.setDate(base.getDate() + 1);
  } else if (frequencia === "semanal") {
    base.setDate(base.getDate() + 7);
  } else if (frequencia === "mensal") {
    base.setMonth(base.getMonth() + 1);
  }

  return dataISO(base);
}

// ── Nomes Canônicos do Klaus SDK ─────────────────────────────────────────────
export const sortKlausTasks = ordenar;
export const getKlausTaskUrgency = urgencia;
export const getKlausTaskDueText = textoPrazo;
export const getKlausSubtasks = lerSubtarefas;
export const toggleKlausSubtask = alternarSubtarefa;
export const addKlausSubtask = adicionarSubtarefa;
export const removeKlausSubtask = removerSubtarefa;
export const getKlausSubtasksProgress = progressoSubtarefas;
export const getNextKlausRecurrenceDate = proximaDataRecorrencia;

export type KlausTask = Tarefa;
export type KlausSubtask = Subtarefa;
export type KlausTaskUrgency = Urgencia;
