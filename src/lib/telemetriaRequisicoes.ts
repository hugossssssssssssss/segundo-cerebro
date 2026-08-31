/**
 * Telemetria de Requisições da GitHub API
 *
 * Monitora e audita em tempo real:
 * - Limite de requisições por hora (x-ratelimit-limit: 5.000 ou 60)
 * - Requisições restantes (x-ratelimit-remaining)
 * - Tempo restante para reset da cota (x-ratelimit-reset)
 * - Requisições salvas via HTTP 304 Not Modified (ETag / Conditional Requests)
 * - Distribuição de consumo por tipo de operação (Árvore, Conteúdo, Gravação, Favoritos, etc.)
 */

import { hojeISO } from "./utils";

export interface MetricasRequisicoes {
  limiteHora: number;
  restanteHora: number;
  usadoHora: number;
  resetTimestamp: number;
  minutosAteReset: number;
  totalHoje: number;
  totalEconomizadas304: number;
  porTipo: {
    arvoreGit: number;
    conteudoGraphQL: number;
    conteudoArquivo: number;
    gravacaoCommit: number;
    favoritos: number;
    imagens: number;
    outros: number;
  };
  ultimasRequisicoes: {
    timestamp: string;
    metodo: string;
    urlSimplificada: string;
    status: number;
    economizou304: boolean;
    restante: number;
  }[];
}

const CHAVE_METRICAS_STORAGE = "klaus:metricas-requisicoes-hoje";

function carregarMetricasIniciais(): MetricasRequisicoes {
  const hojeStr = hojeISO();

  try {
    const salvo = localStorage.getItem(CHAVE_METRICAS_STORAGE);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (parsed.data === hojeStr && parsed.metricas) {
        return parsed.metricas;
      }
    }
  } catch {}

  return {
    limiteHora: 5000,
    restanteHora: 5000,
    usadoHora: 0,
    resetTimestamp: 0,
    minutosAteReset: 0,
    totalHoje: 0,
    totalEconomizadas304: 0,
    porTipo: {
      arvoreGit: 0,
      conteudoGraphQL: 0,
      conteudoArquivo: 0,
      gravacaoCommit: 0,
      favoritos: 0,
      imagens: 0,
      outros: 0,
    },
    ultimasRequisicoes: [],
  };
}

let estadoMetricas: MetricasRequisicoes = carregarMetricasIniciais();
const listeners = new Set<() => void>();

function salvarMetricas(): void {
  try {
    const hojeStr = hojeISO();
    localStorage.setItem(
      CHAVE_METRICAS_STORAGE,
      JSON.stringify({ data: hojeStr, metricas: estadoMetricas }),
    );
  } catch {}
  listeners.forEach((cb) => cb());
}

export function classificarUrlGitHub(url: string, metodo: string): keyof MetricasRequisicoes["porTipo"] {
  const u = url.toLowerCase();
  if (u.includes("/git/trees")) return "arvoreGit";
  if (u.includes("/graphql")) return "conteudoGraphQL";
  if (u.includes("favoritos.json")) return "favoritos";
  if (u.includes("referencias/imagens")) return "imagens";
  if (metodo === "PUT" || metodo === "DELETE" || u.includes("/git/commits") || u.includes("/git/refs")) {
    return "gravacaoCommit";
  }
  if (u.includes("/contents/")) return "conteudoArquivo";
  return "outros";
}

export function registrarRespostaGitHub(
  url: string,
  metodo: string,
  status: number,
  headers: Headers | Record<string, string>,
): void {
  if (!url.includes("api.github.com")) return;

  const getHeader = (nome: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(nome);
    }
    return headers[nome] || headers[nome.toLowerCase()] || null;
  };

  const limitHeader = getHeader("x-ratelimit-limit");
  const remainingHeader = getHeader("x-ratelimit-remaining");
  const usedHeader = getHeader("x-ratelimit-used");
  const resetHeader = getHeader("x-ratelimit-reset");

  const limite = limitHeader ? parseInt(limitHeader, 10) : estadoMetricas.limiteHora;
  const restante = remainingHeader ? parseInt(remainingHeader, 10) : estadoMetricas.restanteHora;
  const usado = usedHeader ? parseInt(usedHeader, 10) : limite - restante;
  const resetSec = resetHeader ? parseInt(resetHeader, 10) : 0;
  const resetMs = resetSec * 1000;
  const minutosReset = resetMs > Date.now() ? Math.ceil((resetMs - Date.now()) / 60000) : 0;

  const eh304 = status === 304;
  const categoria = classificarUrlGitHub(url, metodo);

  estadoMetricas.limiteHora = limite;
  estadoMetricas.restanteHora = restante;
  estadoMetricas.usadoHora = usado;
  estadoMetricas.resetTimestamp = resetMs;
  estadoMetricas.minutosAteReset = minutosReset;
  estadoMetricas.totalHoje += 1;

  if (eh304) {
    estadoMetricas.totalEconomizadas304 += 1;
  } else {
    estadoMetricas.porTipo[categoria] += 1;
  }

  // URL simplificada para exibição
  let urlLimpa = url.replace("https://api.github.com", "");
  urlLimpa = urlLimpa.replace(/\/repos\/[^/]+\/[^/]+/, "");

  const agora = new Date();
  const horaFormatada = agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  estadoMetricas.ultimasRequisicoes.unshift({
    timestamp: horaFormatada,
    metodo,
    urlSimplificada: urlLimpa,
    status,
    economizou304: eh304,
    restante,
  });

  if (estadoMetricas.ultimasRequisicoes.length > 50) {
    estadoMetricas.ultimasRequisicoes = estadoMetricas.ultimasRequisicoes.slice(0, 50);
  }

  salvarMetricas();
}

export function obterMetricasRequisicoes(): MetricasRequisicoes {
  if (estadoMetricas.resetTimestamp > 0) {
    estadoMetricas.minutosAteReset = Math.max(
      0,
      Math.ceil((estadoMetricas.resetTimestamp - Date.now()) / 60000),
    );
  }
  return { ...estadoMetricas };
}

export function inscreverMetricas(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
