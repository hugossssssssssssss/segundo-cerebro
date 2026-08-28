/**
 * PERSISTÊNCIA DE ESTADO E ESTATÍSTICAS DO TERMO
 * 
 * Gerencia o estado do jogo do dia atual e as estatísticas globais com:
 * 1. Resposta síncrona instantânea via localStorage (offline-first).
 * 2. Sincronização assíncrona com o repositório GitHub em `jogos/termo.json`.
 * 3. Detecção e transição suave de virada de meia-noite.
 */

import type { Settings } from "../settings";
import type { ItemRepo } from "../repo";
import { atualizarCacheLocal } from "../repo";
import { salvarRascunhoLocal } from "../offlineQueue";
import { lerMarkdown } from "../markdown";
import { ler } from "../github";
import { obterPalavraDoDia } from "./palavras";

export const CHAVE_STORAGE_TERMO = "klaus_termo_dados";
export const CAMINHO_REPO_TERMO = "jogos/termo.json";

export type StatusJogo = "jogando" | "venceu" | "perdeu";

export interface EstadoJogoTermo {
  dataIso: string;
  numeroJogo: number;
  palavra: string;
  tentativas: string[];
  status: StatusJogo;
  finalizadoEm?: string;
  modo: "diario" | "infinito";
}

export interface EstatisticasTermo {
  totalJogos: number;
  vitorias: number;
  derrotas: number;
  sequenciaAtual: number;
  melhorSequencia: number;
  distribuicao: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
  ultimaDataJogada?: string;
}

export interface DadosTermoPersistidos {
  versao: number;
  jogoDoDia: EstadoJogoTermo;
  estatisticas: EstatisticasTermo;
}

/**
 * Estatísticas zeradas padrão para novos usuários.
 */
export const ESTATISTICAS_INICIAIS: EstatisticasTermo = {
  totalJogos: 0,
  vitorias: 0,
  derrotas: 0,
  sequenciaAtual: 0,
  melhorSequencia: 0,
  distribuicao: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  },
};

/**
 * Cria um novo estado de jogo para o dia especificado.
 */
export function criarNovoJogoDoDia(data: Date = new Date()): EstadoJogoTermo {
  const info = obterPalavraDoDia(data);
  return {
    dataIso: info.dataIso,
    numeroJogo: info.numeroJogo,
    palavra: info.palavra,
    tentativas: [],
    status: "jogando",
    modo: "diario",
  };
}

/**
 * Cria um conjunto padrão inicial de dados.
 */
export function criarDadosIniciais(data: Date = new Date()): DadosTermoPersistidos {
  return {
    versao: 1,
    jogoDoDia: criarNovoJogoDoDia(data),
    estatisticas: { ...ESTATISTICAS_INICIAIS, distribuicao: { ...ESTATISTICAS_INICIAIS.distribuicao } },
  };
}

/**
 * Lê os dados do Termo salvos no localStorage de forma segura e tolerante a falhas.
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

    // Mesclar estatísticas com valores padrão para garantir que todos os campos existam
    const estatisticas: EstatisticasTermo = {
      totalJogos: Number(parsed.estatisticas?.totalJogos) || 0,
      vitorias: Number(parsed.estatisticas?.vitorias) || 0,
      derrotas: Number(parsed.estatisticas?.derrotas) || 0,
      sequenciaAtual: Number(parsed.estatisticas?.sequenciaAtual) || 0,
      melhorSequencia: Number(parsed.estatisticas?.melhorSequencia) || 0,
      distribuicao: {
        1: Number(parsed.estatisticas?.distribuicao?.[1]) || 0,
        2: Number(parsed.estatisticas?.distribuicao?.[2]) || 0,
        3: Number(parsed.estatisticas?.distribuicao?.[3]) || 0,
        4: Number(parsed.estatisticas?.distribuicao?.[4]) || 0,
        5: Number(parsed.estatisticas?.distribuicao?.[5]) || 0,
        6: Number(parsed.estatisticas?.distribuicao?.[6]) || 0,
      },
      ultimaDataJogada: parsed.estatisticas?.ultimaDataJogada,
    };

    const jogoSalvo = parsed.jogoDoDia;
    const infoHoje = obterPalavraDoDia(dataAtual);

    let jogoDoDia: EstadoJogoTermo;
    if (jogoSalvo && jogoSalvo.dataIso === infoHoje.dataIso) {
      // Mesmo dia: mantém o progresso
      jogoDoDia = {
        dataIso: infoHoje.dataIso,
        numeroJogo: infoHoje.numeroJogo,
        palavra: infoHoje.palavra,
        tentativas: Array.isArray(jogoSalvo.tentativas) ? jogoSalvo.tentativas.map(String) : [],
        status: jogoSalvo.status === "venceu" || jogoSalvo.status === "perdeu" ? jogoSalvo.status : "jogando",
        finalizadoEm: jogoSalvo.finalizadoEm,
        modo: "diario",
      };
    } else {
      // Virada de dia: cria um novo jogo para hoje
      jogoDoDia = criarNovoJogoDoDia(dataAtual);
    }

    const resultado: DadosTermoPersistidos = {
      versao: 1,
      jogoDoDia,
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

/**
 * Salva os dados do Termo no localStorage.
 */
export function salvarDadosTermoLocal(dados: DadosTermoPersistidos): void {
  try {
    localStorage.setItem(CHAVE_STORAGE_TERMO, JSON.stringify(dados));
  } catch {
    // ignora erros de cota de armazenamento
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
  estatisticas: EstatisticasTermo,
  venceu: boolean,
  numTentativas: number,
  dataIso: string
): EstatisticasTermo {
  const novas = {
    ...estatisticas,
    distribuicao: { ...estatisticas.distribuicao },
    totalJogos: estatisticas.totalJogos + 1,
  };

  if (venceu) {
    novas.vitorias += 1;
    const tentativaClamped = Math.max(1, Math.min(6, numTentativas)) as 1 | 2 | 3 | 4 | 5 | 6;
    novas.distribuicao[tentativaClamped] = (novas.distribuicao[tentativaClamped] || 0) + 1;

    // Cálculo da sequência (streak)
    if (!estatisticas.ultimaDataJogada) {
      novas.sequenciaAtual = 1;
    } else {
      const diff = diferencaEmDias(estatisticas.ultimaDataJogada, dataIso);
      if (diff === 1) {
        // Jogou no dia seguinte consecutivo
        novas.sequenciaAtual += 1;
      } else if (diff === 0) {
        // Mesmo dia (não altera o streak além de 1)
        novas.sequenciaAtual = Math.max(1, novas.sequenciaAtual);
      } else {
        // Pulou um ou mais dias
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
  const infoHoje = obterPalavraDoDia(dataAtual);

  // 1. Estatísticas: combinar com base no maior número de vitórias/jogos
  const estatisticas: EstatisticasTermo = {
    totalJogos: Math.max(local.estatisticas.totalJogos, remoto.estatisticas.totalJogos),
    vitorias: Math.max(local.estatisticas.vitorias, remoto.estatisticas.vitorias),
    derrotas: Math.max(local.estatisticas.derrotas, remoto.estatisticas.derrotas),
    sequenciaAtual: Math.max(local.estatisticas.sequenciaAtual, remoto.estatisticas.sequenciaAtual),
    melhorSequencia: Math.max(local.estatisticas.melhorSequencia, remoto.estatisticas.melhorSequencia),
    distribuicao: {
      1: Math.max(local.estatisticas.distribuicao[1] || 0, remoto.estatisticas.distribuicao[1] || 0),
      2: Math.max(local.estatisticas.distribuicao[2] || 0, remoto.estatisticas.distribuicao[2] || 0),
      3: Math.max(local.estatisticas.distribuicao[3] || 0, remoto.estatisticas.distribuicao[3] || 0),
      4: Math.max(local.estatisticas.distribuicao[4] || 0, remoto.estatisticas.distribuicao[4] || 0),
      5: Math.max(local.estatisticas.distribuicao[5] || 0, remoto.estatisticas.distribuicao[5] || 0),
      6: Math.max(local.estatisticas.distribuicao[6] || 0, remoto.estatisticas.distribuicao[6] || 0),
    },
    ultimaDataJogada: local.estatisticas.ultimaDataJogada || remoto.estatisticas.ultimaDataJogada,
  };

  // 2. Jogo do Dia: se for de hoje, usa o que tem mais tentativas ou status finalizado
  let jogoDoDia: EstadoJogoTermo;
  const jogoLocalHoje = local.jogoDoDia.dataIso === infoHoje.dataIso;
  const jogoRemotoHoje = remoto.jogoDoDia?.dataIso === infoHoje.dataIso;

  if (jogoLocalHoje && jogoRemotoHoje) {
    const finalizadoLocal = local.jogoDoDia.status !== "jogando";
    const finalizadoRemoto = remoto.jogoDoDia.status !== "jogando";

    if (finalizadoLocal) {
      jogoDoDia = local.jogoDoDia;
    } else if (finalizadoRemoto) {
      jogoDoDia = remoto.jogoDoDia;
    } else {
      // Pega o que tiver mais tentativas
      jogoDoDia =
        local.jogoDoDia.tentativas.length >= (remoto.jogoDoDia.tentativas?.length || 0)
          ? local.jogoDoDia
          : remoto.jogoDoDia;
    }
  } else if (jogoLocalHoje) {
    jogoDoDia = local.jogoDoDia;
  } else if (jogoRemotoHoje) {
    jogoDoDia = remoto.jogoDoDia;
  } else {
    jogoDoDia = criarNovoJogoDoDia(dataAtual);
  }

  return {
    versao: 1,
    jogoDoDia,
    estatisticas,
  };
}

/**
 * Carrega os dados do Termo sincronizados do repositório GitHub (com fallback para localStorage).
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
        // arquivo corrompido no repo
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
    // arquivo não existe ainda
  }

  return { dados: local };
}

/**
 * Grava os dados do Termo no repositório GitHub e atualiza a fila offline.
 */
export async function gravarDadosTermo(
  cfg: Settings,
  dados: DadosTermoPersistidos,
  shaAntigo?: string
): Promise<{ ok: boolean; sha?: string; erro?: string }> {
  salvarDadosTermoLocal(dados);

  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { ok: true }; // offline / sem configuração salva apenas local
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

    salvarRascunhoLocal(CAMINHO_REPO_TERMO, conteudo, shaFinal, "atualizar progresso do Termo");
    atualizarCacheLocal(
      CAMINHO_REPO_TERMO,
      conteudo,
      lerMarkdown(conteudo),
      shaFinal || `temp_${Math.random().toString(36).substring(7)}`
    );

    return { ok: true, sha: shaFinal };
  } catch (err: any) {
    return { ok: false, erro: err?.message || "Falha ao gravar Termo no GitHub." };
  }
}
