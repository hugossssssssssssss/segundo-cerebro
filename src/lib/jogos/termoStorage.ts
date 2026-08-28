/**
 * PERSISTÊNCIA DE ESTADO E ESTATÍSTICAS DO TERMO, DUETO E QUARTETO
 * 
 * Gerencia o estado de jogos diários e estatísticas para cada modalidade:
 * - Termo (Individual)
 * - Dueto (2 Palavras)
 * - Quarteto (4 Palavras)
 */

import type { Settings } from "../settings";
import type { ItemRepo } from "../repo";
import { atualizarCacheLocal } from "../repo";
import { salvarRascunhoLocal } from "../offlineQueue";
import { lerMarkdown } from "../markdown";
import { ler } from "../github";
import { obterPalavrasDoDia, obterPalavrasAleatorias } from "./palavras";
import {
  CONFIG_MODOS,
  type TipoJogo,
} from "./termoEngine";

export const CHAVE_STORAGE_TERMO = "klaus_termo_dados";
export const CAMINHO_REPO_TERMO = "jogos/termo.json";

export type StatusJogo = "jogando" | "venceu" | "perdeu";

export interface EstadoJogoGenerico {
  tipo: TipoJogo;
  dataIso: string;
  numeroJogo: number;
  palavras: string[];
  tentativasPorTabuleiro: string[][];
  tentativasGerais: string[];
  resolvidos: boolean[];
  status: StatusJogo;
  finalizadoEm?: string;
  modoRitmo: "diario" | "infinito";
}

// Retrocompatibilidade
export type EstadoJogoTermo = EstadoJogoGenerico;

export interface EstatisticasModo {
  totalJogos: number;
  vitorias: number;
  derrotas: number;
  sequenciaAtual: number;
  melhorSequencia: number;
  distribuicao: Record<number, number>;
  ultimaDataJogada?: string;
}

export interface EstatisticasGlobais {
  termo: EstatisticasModo;
  dueto: EstatisticasModo;
  quarteto: EstatisticasModo;
}

// Retrocompatibilidade
export type EstatisticasTermo = EstatisticasModo;

export interface DadosTermoPersistidos {
  versao: number;
  jogosDoDia: Record<TipoJogo, EstadoJogoGenerico>;
  estatisticas: EstatisticasGlobais;
  // Campos legados para retrocompatibilidade
  jogoDoDia?: any;
}

/**
 * Cria a distribuição zerada para um número máximo de tentativas.
 */
function criarDistribuicaoZerada(maxTentativas: number): Record<number, number> {
  const dist: Record<number, number> = {};
  for (let i = 1; i <= maxTentativas; i++) {
    dist[i] = 0;
  }
  return dist;
}

export const ESTATISTICAS_INICIAIS_MODO = (tipo: TipoJogo): EstatisticasModo => ({
  totalJogos: 0,
  vitorias: 0,
  derrotas: 0,
  sequenciaAtual: 0,
  melhorSequencia: 0,
  distribuicao: criarDistribuicaoZerada(CONFIG_MODOS[tipo].tentativas),
});

export const ESTATISTICAS_INICIAIS: EstatisticasModo = ESTATISTICAS_INICIAIS_MODO("termo");

/**
 * Cria um novo estado de jogo para o modo especificado.
 */
export function criarNovoJogo(
  tipo: TipoJogo = "termo",
  data: Date = new Date(),
  modoRitmo: "diario" | "infinito" = "diario"
): EstadoJogoGenerico {
  const config = CONFIG_MODOS[tipo];
  let palavras: string[];
  let numeroJogo = 0;
  let dataIso = "infinito";

  if (modoRitmo === "diario") {
    const info = obterPalavrasDoDia(tipo, data);
    palavras = info.palavras;
    numeroJogo = info.numeroJogo;
    dataIso = info.dataIso;
  } else {
    palavras = obterPalavrasAleatorias(config.tabuleiros);
  }

  return {
    tipo,
    dataIso,
    numeroJogo,
    palavras,
    tentativasPorTabuleiro: Array.from({ length: config.tabuleiros }, () => []),
    tentativasGerais: [],
    resolvidos: new Array(config.tabuleiros).fill(false),
    status: "jogando",
    modoRitmo,
  };
}

export function criarNovoJogoDoDia(data: Date = new Date()): EstadoJogoGenerico {
  return criarNovoJogo("termo", data, "diario");
}

/**
 * Cria um conjunto padrão inicial de dados para todos os modos.
 */
export function criarDadosIniciais(data: Date = new Date()): DadosTermoPersistidos {
  return {
    versao: 2,
    jogosDoDia: {
      termo: criarNovoJogo("termo", data, "diario"),
      dueto: criarNovoJogo("dueto", data, "diario"),
      quarteto: criarNovoJogo("quarteto", data, "diario"),
    },
    estatisticas: {
      termo: ESTATISTICAS_INICIAIS_MODO("termo"),
      dueto: ESTATISTICAS_INICIAIS_MODO("dueto"),
      quarteto: ESTATISTICAS_INICIAIS_MODO("quarteto"),
    },
  };
}

/**
 * Lê os dados do Termo salvos no localStorage com migração transparente de versões legadas.
 */
export function lerDadosTermoLocal(dataAtual: Date = new Date()): DadosTermoPersistidos {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_TERMO);
    if (!salvo) {
      const inicial = criarDadosIniciais(dataAtual);
      salvarDadosTermoLocal(inicial);
      return inicial;
    }

    const parsed = JSON.parse(salvo);
    if (!parsed || typeof parsed !== "object") {
      const inicial = criarDadosIniciais(dataAtual);
      salvarDadosTermoLocal(inicial);
      return inicial;
    }

    const infoHoje = obterPalavrasDoDia("termo", dataAtual);

    // Normalizar estatísticas de cada modalidade
    const estatisticas: EstatisticasGlobais = {
      termo: normalizarEstatisticasModo(parsed.estatisticas?.termo || parsed.estatisticas, "termo"),
      dueto: normalizarEstatisticasModo(parsed.estatisticas?.dueto, "dueto"),
      quarteto: normalizarEstatisticasModo(parsed.estatisticas?.quarteto, "quarteto"),
    };

    // Normalizar jogos do dia
    const jogosDoDia: Record<TipoJogo, EstadoJogoGenerico> = {
      termo: normalizarJogoDoDia(parsed.jogosDoDia?.termo || parsed.jogoDoDia, "termo", dataAtual, infoHoje.dataIso),
      dueto: normalizarJogoDoDia(parsed.jogosDoDia?.dueto, "dueto", dataAtual, infoHoje.dataIso),
      quarteto: normalizarJogoDoDia(parsed.jogosDoDia?.quarteto, "quarteto", dataAtual, infoHoje.dataIso),
    };

    const resultado: DadosTermoPersistidos = {
      versao: 2,
      jogosDoDia,
      estatisticas,
    };

    salvarDadosTermoLocal(resultado);
    return resultado;
  } catch {
    const fallback = criarDadosIniciais(dataAtual);
    salvarDadosTermoLocal(fallback);
    return fallback;
  }
}

function normalizarEstatisticasModo(raw: any, tipo: TipoJogo): EstatisticasModo {
  const padrao = ESTATISTICAS_INICIAIS_MODO(tipo);
  if (!raw || typeof raw !== "object") return padrao;

  const maxTentativas = CONFIG_MODOS[tipo].tentativas;
  const dist: Record<number, number> = {};
  for (let i = 1; i <= maxTentativas; i++) {
    dist[i] = Number(raw.distribuicao?.[i]) || 0;
  }

  return {
    totalJogos: Number(raw.totalJogos) || 0,
    vitorias: Number(raw.vitorias) || 0,
    derrotas: Number(raw.derrotas) || 0,
    sequenciaAtual: Number(raw.sequenciaAtual) || 0,
    melhorSequencia: Number(raw.melhorSequencia) || 0,
    distribuicao: dist,
    ultimaDataJogada: typeof raw.ultimaDataJogada === "string" ? raw.ultimaDataJogada : undefined,
  };
}

function normalizarJogoDoDia(
  raw: any,
  tipo: TipoJogo,
  dataAtual: Date,
  hojeIso: string
): EstadoJogoGenerico {
  const config = CONFIG_MODOS[tipo];
  if (!raw || typeof raw !== "object" || raw.dataIso !== hojeIso) {
    return criarNovoJogo(tipo, dataAtual, "diario");
  }

  // Se veio do formato antigo do Termo individual (palavra string simples)
  let palavras: string[] = Array.isArray(raw.palavras) ? raw.palavras.map(String) : [];
  if (palavras.length === 0 && typeof raw.palavra === "string") {
    palavras = [raw.palavra];
  }
  if (palavras.length < config.tabuleiros) {
    const info = obterPalavrasDoDia(tipo, dataAtual);
    palavras = info.palavras;
  }

  const tentativasGerais: string[] = Array.isArray(raw.tentativasGerais)
    ? raw.tentativasGerais.map(String)
    : Array.isArray(raw.tentativas)
    ? raw.tentativas.map(String)
    : [];

  const tentativasPorTabuleiro: string[][] = Array.isArray(raw.tentativasPorTabuleiro)
    ? raw.tentativasPorTabuleiro.map((arr: any) => (Array.isArray(arr) ? arr.map(String) : []))
    : Array.from({ length: config.tabuleiros }, () => [...tentativasGerais]);

  const resolvidos: boolean[] = Array.isArray(raw.resolvidos)
    ? raw.resolvidos.map(Boolean)
    : new Array(config.tabuleiros).fill(raw.status === "venceu");

  return {
    tipo,
    dataIso: hojeIso,
    numeroJogo: Number(raw.numeroJogo) || 1,
    palavras,
    tentativasPorTabuleiro,
    tentativasGerais,
    resolvidos,
    status: raw.status === "venceu" || raw.status === "perdeu" ? raw.status : "jogando",
    finalizadoEm: raw.finalizadoEm,
    modoRitmo: "diario",
  };
}

/**
 * Salva os dados do Termo no localStorage.
 */
export function salvarDadosTermoLocal(dados: DadosTermoPersistidos): void {
  try {
    localStorage.setItem(CHAVE_STORAGE_TERMO, JSON.stringify(dados));
  } catch {
    // ignora erros de cota
  }
}

/**
 * Calcula a diferença em dias corridos entre duas datas no formato YYYY-MM-DD.
 */
function diferencaEmDias(dataA: string, dataB: string): number {
  try {
    const d1 = new Date(dataA + "T00:00:00");
    const d2 = new Date(dataB + "T00:00:00");
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

/**
 * Atualiza o objeto de estatísticas com o resultado de uma partida concluída.
 */
export function atualizarEstatisticasComResultado(
  estatisticas: EstatisticasModo,
  venceu: boolean,
  numTentativas: number,
  dataIso: string
): EstatisticasModo {
  const novas: EstatisticasModo = {
    ...estatisticas,
    distribuicao: { ...estatisticas.distribuicao },
    totalJogos: estatisticas.totalJogos + 1,
  };

  if (venceu) {
    novas.vitorias += 1;
    const maxPossivel = Math.max(...Object.keys(novas.distribuicao).map(Number), 6);
    const tentativaClamped = Math.max(1, Math.min(maxPossivel, numTentativas));
    novas.distribuicao[tentativaClamped] = (novas.distribuicao[tentativaClamped] || 0) + 1;

    // Cálculo da sequência (streak)
    if (!estatisticas.ultimaDataJogada) {
      novas.sequenciaAtual = 1;
    } else {
      const diff = diferencaEmDias(estatisticas.ultimaDataJogada, dataIso);
      if (diff === 1) {
        novas.sequenciaAtual += 1;
      } else if (diff === 0) {
        novas.sequenciaAtual = Math.max(1, novas.sequenciaAtual);
      } else {
        novas.sequenciaAtual = 1;
      }
    }

    novas.melhorSequencia = Math.max(novas.melhorSequencia, novas.sequenciaAtual);
  } else {
    novas.derrotas += 1;
    novas.sequenciaAtual = 0;
  }

  novas.ultimaDataJogada = dataIso;
  return novas;
}

/**
 * Mescla dados locais e remotos garantindo que o progresso mais avançado prevaleça.
 */
export function mesclarDadosTermo(
  local: DadosTermoPersistidos,
  remoto: DadosTermoPersistidos,
  dataAtual: Date = new Date()
): DadosTermoPersistidos {
  const infoHoje = obterPalavrasDoDia("termo", dataAtual);

  const mesclarStatsModo = (l: EstatisticasModo, r?: EstatisticasModo, tipo: TipoJogo = "termo"): EstatisticasModo => {
    if (!r) return l;
    const maxTentativas = CONFIG_MODOS[tipo].tentativas;
    const dist: Record<number, number> = {};
    for (let i = 1; i <= maxTentativas; i++) {
      dist[i] = Math.max(l.distribuicao[i] || 0, r.distribuicao?.[i] || 0);
    }
    return {
      totalJogos: Math.max(l.totalJogos, r.totalJogos || 0),
      vitorias: Math.max(l.vitorias, r.vitorias || 0),
      derrotas: Math.max(l.derrotas, r.derrotas || 0),
      sequenciaAtual: Math.max(l.sequenciaAtual, r.sequenciaAtual || 0),
      melhorSequencia: Math.max(l.melhorSequencia, r.melhorSequencia || 0),
      distribuicao: dist,
      ultimaDataJogada: l.ultimaDataJogada || r.ultimaDataJogada,
    };
  };

  const estatisticas: EstatisticasGlobais = {
    termo: mesclarStatsModo(local.estatisticas.termo, remoto.estatisticas?.termo || remoto.estatisticas as any, "termo"),
    dueto: mesclarStatsModo(local.estatisticas.dueto, remoto.estatisticas?.dueto, "dueto"),
    quarteto: mesclarStatsModo(local.estatisticas.quarteto, remoto.estatisticas?.quarteto, "quarteto"),
  };

  const mesclarJogoModo = (l: EstadoJogoGenerico, r?: EstadoJogoGenerico, tipo: TipoJogo = "termo"): EstadoJogoGenerico => {
    const lHoje = l?.dataIso === infoHoje.dataIso;
    const rHoje = r?.dataIso === infoHoje.dataIso;

    if (lHoje && rHoje && r) {
      if (l.status !== "jogando") return l;
      if (r.status !== "jogando") return r;
      return l.tentativasGerais.length >= (r.tentativasGerais?.length || 0) ? l : r;
    }
    if (lHoje) return l;
    if (rHoje && r) return r;
    return criarNovoJogo(tipo, dataAtual, "diario");
  };

  const jogosDoDia: Record<TipoJogo, EstadoJogoGenerico> = {
    termo: mesclarJogoModo(local.jogosDoDia.termo, remoto.jogosDoDia?.termo || remoto.jogoDoDia, "termo"),
    dueto: mesclarJogoModo(local.jogosDoDia.dueto, remoto.jogosDoDia?.dueto, "dueto"),
    quarteto: mesclarJogoModo(local.jogosDoDia.quarteto, remoto.jogosDoDia?.quarteto, "quarteto"),
  };

  return {
    versao: 2,
    jogosDoDia,
    estatisticas,
  };
}

/**
 * Carrega os dados do Termo sincronizados do repositório GitHub.
 */
export async function carregarDadosTermo(
  cfg: Settings,
  itensRepo?: ItemRepo[],
  dataAtual: Date = new Date()
): Promise<{ dados: DadosTermoPersistidos; sha?: string }> {
  const local = lerDadosTermoLocal(dataAtual);
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { dados: local };
  }

  if (itensRepo) {
    const itemArquivo = itensRepo.find((i) => i.caminho === CAMINHO_REPO_TERMO);
    if (itemArquivo && itemArquivo.texto) {
      try {
        const remoto: DadosTermoPersistidos = JSON.parse(itemArquivo.texto);
        const mesclado = mesclarDadosTermo(local, remoto, dataAtual);
        salvarDadosTermoLocal(mesclado);
        return { dados: mesclado, sha: itemArquivo.sha };
      } catch {
        // arquivo corrompido
      }
    }
    return { dados: local };
  }

  try {
    const res = await ler(cfg, CAMINHO_REPO_TERMO, { silenciar404: true });
    if (res?.texto) {
      const remoto: DadosTermoPersistidos = JSON.parse(res.texto);
      const mesclado = mesclarDadosTermo(local, remoto, dataAtual);
      salvarDadosTermoLocal(mesclado);
      return { dados: mesclado, sha: res.sha };
    }
  } catch {
    // arquivo ainda não existe
  }

  return { dados: local };
}

/**
 * Grava os dados do Termo no repositório GitHub.
 */
export async function gravarDadosTermo(
  cfg: Settings,
  dados: DadosTermoPersistidos,
  shaAntigo?: string
): Promise<{ ok: boolean; sha?: string; erro?: string }> {
  salvarDadosTermoLocal(dados);

  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { ok: true };
  }

  try {
    const conteudo = JSON.stringify(dados, null, 2);
    let shaFinal = shaAntigo;

    if (!shaFinal) {
      try {
        const res = await ler(cfg, CAMINHO_REPO_TERMO, { silenciar404: true });
        if (res?.sha) shaFinal = res.sha;
      } catch {}
    }

    salvarRascunhoLocal(CAMINHO_REPO_TERMO, conteudo, shaFinal, "atualizar progresso dos Jogos (Termo, Dueto, Quarteto)");
    atualizarCacheLocal(
      CAMINHO_REPO_TERMO,
      conteudo,
      lerMarkdown(conteudo),
      shaFinal || `temp_${Math.random().toString(36).substring(7)}`
    );

    return { ok: true, sha: shaFinal };
  } catch (err: any) {
    return { ok: false, erro: err?.message || "Falha ao gravar jogos no GitHub." };
  }
}
