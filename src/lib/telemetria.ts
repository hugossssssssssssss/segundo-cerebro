/**
 * Módulo de Telemetria e Logs do Klaus.
 * Grava sessões de foco (concluídas ou interrompidas) no arquivo `registro-tempo.json` do repositório.
 */

import type { ItemRepo } from "./repo";

export interface LogTempo {
  data: string; // ISO String com timezone local
  tarefaCaminho: string;
  tarefaTitulo: string;
  duracaoSegundos: number;
  modo: "foco" | "pausa";
  status: "Completo" | "Interrompido";
}

export const CAMINHO_TELEMETRIA = "registro-tempo.json";

/**
 * Lê todos os logs de telemetria do acervo carregado.
 */
export function extrairLogsTelemetria(acervo: ItemRepo[]): LogTempo[] {
  const item = acervo.find((x) => x.caminho === CAMINHO_TELEMETRIA);
  if (!item || !item.texto.trim()) return [];
  try {
    const logs = JSON.parse(item.texto);
    if (Array.isArray(logs)) return logs;
  } catch {
    /* JSON corrompido ou inválido, retorna vazio */
  }
  return [];
}

/**
 * Obtém o SHA atual do arquivo de telemetria para fins de commit.
 */
export function obterShaTelemetria(acervo: ItemRepo[]): string | undefined {
  const item = acervo.find((x) => x.caminho === CAMINHO_TELEMETRIA);
  return item?.sha;
}

/**
 * Cria a representação em texto do arquivo JSON contendo o novo log adicionado.
 */
export function adicionarLog(logsAntigos: LogTempo[], novoLog: LogTempo): string {
  const novosLogs = [...logsAntigos, novoLog];
  return JSON.stringify(novosLogs, null, 2);
}
