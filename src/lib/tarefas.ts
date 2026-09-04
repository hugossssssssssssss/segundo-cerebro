/**
 * Regras das tarefas.
 *
 * Uma tarefa é um arquivo .md em `tarefas/`. O frontmatter guarda o estado;
 * o corpo é anotação livre. O tempo de pomodoro é registrado no próprio corpo,
 * para continuar legível fora do app.
 *
 * Os tipos e funções de conversão vivem agora em `tipos.ts` e `entidades.ts`.
 * Este arquivo re-exporta tudo com os nomes legados para não quebrar imports.
 */

import { diasAte, dataISO, formatarDataPtBR } from "./utils";
import type { Tarefa } from "./tipos";

// Re-exporta os contratos centrais com os nomes que o restante do app usa
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

/**
 * Retorna o frontmatter de uma tarefa para gravar de volta.
 * Mantido com assinatura legada (retorna Record, não {dados, corpo})
 * para compatibilidade com os testes existentes e com o código antigo.
 * As telas novas devem usar `tarefaParaArquivo` de `entidades.ts`.
 */
export function paraFrontmatter(t: Tarefa): Record<string, unknown> {
  return tarefaParaArquivo(t).dados;
}

/** @deprecated Use StatusTarefa de tipos.ts */
export function statusValido(v: unknown): import("./tipos").StatusTarefa {
  const validos = ["a-fazer", "fazendo", "feito"] as const;
  return validos.includes(v as typeof validos[number]) ? (v as typeof validos[number]) : "a-fazer";
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

/**
 * Extrai e normaliza o intervalo de datas de uma tarefa.
 * Suporta formatos:
 * - "2026-08-20 → 2026-08-25"
 * - "2026-08-20 -> 2026-08-25"
 * - "2026-08-20 a 2026-08-25"
 * - "2026-08-20"
 * - Frontmatter com campos separados `inicio` / `data_inicio` e `prazo` / `data_fim`
 */
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

  const extrairDataIso = (s: string): string => {
    const match = s.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : s.slice(0, 10);
  };

  const isoInicio = extrairDataIso(strInicio);
  const isoFim = strFim ? extrairDataIso(strFim) : isoInicio;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoInicio)) return null;
  const isoFimValido = /^\d{4}-\d{2}-\d{2}$/.test(isoFim) ? isoFim : isoInicio;

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

/**
 * Acrescenta o registro de um ciclo no corpo da tarefa, sob um cabeçalho fixo.
 * Fica legível como texto puro, fora do app:
 *
 *   ## Tempo
 *   - 2026-08-13 14:20 → 14:45 (25min)
 */
export function registrarCiclo(corpo: string, minutos: number): string {
  const minsValidos = Math.max(1, Math.round(minutos || 0));
  const agora = new Date();
  const fim = agora.toTimeString().slice(0, 5);
  const inicio = new Date(agora.getTime() - minsValidos * 60_000)
    .toTimeString()
    .slice(0, 5);
  // dataISO e nao toISOString: depois das 21h no horario de Brasilia,
  // o UTC ja virou o dia e o ciclo era registrado em amanha.
  const dia = dataISO(agora);
  const linha = `- ${dia} ${inicio} → ${fim} (${minsValidos}min)`;

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
    // Fallback apenas pelo texto
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
    // Fallback apenas pelo texto
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

/**
 * Calcula o próximo prazo de uma tarefa recorrente (diária, semanal ou mensal).
 */
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
