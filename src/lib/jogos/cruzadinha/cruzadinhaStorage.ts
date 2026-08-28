/**
 * PERSISTÊNCIA DE PROGRESSO DAS PALAVRAS CRUZADAS
 * 
 * Salva localmente no localStorage e sincroniza no GitHub (jogos/cruzadinha.json).
 */

import type { Settings } from "../../settings";
import type { ItemRepo } from "../../repo";
import { atualizarCacheLocal } from "../../repo";
import { salvarRascunhoLocal } from "../../offlineQueue";
import { lerMarkdown } from "../../markdown";
import { ler } from "../../github";

export const CHAVE_STORAGE_CRUZADINHA = "klaus_cruzadinha_dados";
export const CAMINHO_REPO_CRUZADINHA = "jogos/cruzadinha.json";

export interface ProgressoTabuleiro {
  letrasDigitadas: Record<string, string>;
  tempoSegundos: number;
  concluido: boolean;
  concluidoEm?: string;
}

export interface DadosCruzadinhaPersistidos {
  versao: number;
  progresso: Record<string, ProgressoTabuleiro>;
  totalConcluidas: number;
}

export function criarDadosIniciaisCruzadinha(): DadosCruzadinhaPersistidos {
  return {
    versao: 1,
    progresso: {},
    totalConcluidas: 0,
  };
}

export function lerDadosCruzadinhaLocal(): DadosCruzadinhaPersistidos {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_CRUZADINHA);
    if (!salvo) {
      const inicial = criarDadosIniciaisCruzadinha();
      salvarDadosCruzadinhaLocal(inicial);
      return inicial;
    }
    const parsed = JSON.parse(salvo);
    if (!parsed || typeof parsed !== "object") {
      return criarDadosIniciaisCruzadinha();
    }
    return {
      versao: 1,
      progresso: parsed.progresso || {},
      totalConcluidas: Number(parsed.totalConcluidas) || 0,
    };
  } catch {
    return criarDadosIniciaisCruzadinha();
  }
}

export function salvarDadosCruzadinhaLocal(dados: DadosCruzadinhaPersistidos): void {
  try {
    localStorage.setItem(CHAVE_STORAGE_CRUZADINHA, JSON.stringify(dados));
  } catch {}
}

export function mesclarDadosCruzadinha(
  local: DadosCruzadinhaPersistidos,
  remoto: DadosCruzadinhaPersistidos
): DadosCruzadinhaPersistidos {
  const progresso: Record<string, ProgressoTabuleiro> = { ...local.progresso };

  for (const [id, rProg] of Object.entries(remoto.progresso || {})) {
    const lProg = progresso[id];
    if (!lProg) {
      progresso[id] = rProg;
    } else {
      progresso[id] = {
        letrasDigitadas: { ...lProg.letrasDigitadas, ...rProg.letrasDigitadas },
        tempoSegundos: Math.max(lProg.tempoSegundos || 0, rProg.tempoSegundos || 0),
        concluido: lProg.concluido || rProg.concluido,
        concluidoEm: lProg.concluidoEm || rProg.concluidoEm,
      };
    }
  }

  const concluidas = Object.values(progresso).filter((p) => p.concluido).length;

  return {
    versao: 1,
    progresso,
    totalConcluidas: concluidas,
  };
}

export async function carregarDadosCruzadinha(
  cfg: Settings,
  itensRepo?: ItemRepo[]
): Promise<{ dados: DadosCruzadinhaPersistidos; sha?: string }> {
  const local = lerDadosCruzadinhaLocal();
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { dados: local };
  }

  if (itensRepo) {
    const itemArquivo = itensRepo.find((i) => i.caminho === CAMINHO_REPO_CRUZADINHA);
    if (itemArquivo && itemArquivo.texto) {
      try {
        const remoto: DadosCruzadinhaPersistidos = JSON.parse(itemArquivo.texto);
        const mesclado = mesclarDadosCruzadinha(local, remoto);
        salvarDadosCruzadinhaLocal(mesclado);
        return { dados: mesclado, sha: itemArquivo.sha };
      } catch {}
    }
    return { dados: local };
  }

  try {
    const res = await ler(cfg, CAMINHO_REPO_CRUZADINHA, { silenciar404: true });
    if (res?.texto) {
      const remoto: DadosCruzadinhaPersistidos = JSON.parse(res.texto);
      const mesclado = mesclarDadosCruzadinha(local, remoto);
      salvarDadosCruzadinhaLocal(mesclado);
      return { dados: mesclado, sha: res.sha };
    }
  } catch {}

  return { dados: local };
}

export async function gravarDadosCruzadinha(
  cfg: Settings,
  dados: DadosCruzadinhaPersistidos,
  shaAntigo?: string
): Promise<{ ok: boolean; sha?: string; erro?: string }> {
  salvarDadosCruzadinhaLocal(dados);

  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { ok: true };
  }

  try {
    const conteudo = JSON.stringify(dados, null, 2);
    let shaFinal = shaAntigo;

    if (!shaFinal) {
      try {
        const res = await ler(cfg, CAMINHO_REPO_CRUZADINHA, { silenciar404: true });
        if (res?.sha) shaFinal = res.sha;
      } catch {}
    }

    salvarRascunhoLocal(CAMINHO_REPO_CRUZADINHA, conteudo, shaFinal, "atualizar progresso das Palavras Cruzadas");
    atualizarCacheLocal(
      CAMINHO_REPO_CRUZADINHA,
      conteudo,
      lerMarkdown(conteudo),
      shaFinal || `temp_${Math.random().toString(36).substring(7)}`
    );

    return { ok: true, sha: shaFinal };
  } catch (err: any) {
    return { ok: false, erro: err?.message || "Falha ao gravar cruzadinha no GitHub." };
  }
}
