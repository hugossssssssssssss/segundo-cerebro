/**
 * Gerenciador de Rascunhos e Fila de Operações Offline.
 *
 * Permite salvar notas e tarefas localmente quando o usuário estiver sem internet
 * e sincroniza automaticamente com o GitHub assim que a conexão voltar.
 */

import type { Settings } from "./settings";
import { gravar } from "./github";
import { invalidarCache } from "./repo";
import { notificarOutrasAbas } from "./syncChannel";

export type RascunhoOffline = {
  id: string;
  caminho: string;
  texto: string;
  sha?: string;
  mensagemCommit?: string;
  criadoEm: string;
};

const CHAVE_RASCUNHOS = "klaus:rascunhos_offline";

export function obterRascunhosLocais(): RascunhoOffline[] {
  try {
    const salvo = localStorage.getItem(CHAVE_RASCUNHOS);
    return salvo ? JSON.parse(salvo) : [];
  } catch {
    return [];
  }
}

export function salvarRascunhoLocal(
  caminho: string,
  texto: string,
  sha?: string,
  mensagemCommit?: string,
  notificarEvent = true
): RascunhoOffline {
  const rascunhos = obterRascunhosLocais();
  const id = `draft_${caminho}_${Date.now()}`;

  const novo: RascunhoOffline = {
    id,
    caminho,
    texto,
    sha,
    mensagemCommit,
    criadoEm: new Date().toISOString(),
  };

  // Substitui rascunho anterior para o mesmo caminho, se existir
  const filtrados = rascunhos.filter((r) => r.caminho !== caminho);
  filtrados.push(novo);

  localStorage.setItem(CHAVE_RASCUNHOS, JSON.stringify(filtrados));
  if (notificarEvent) {
    window.dispatchEvent(new CustomEvent("acervo-atualizado"));
  }
  return novo;
}

export function removerRascunhoLocal(caminho: string): void {
  const rascunhos = obterRascunhosLocais();
  const filtrados = rascunhos.filter((r) => r.caminho !== caminho);
  localStorage.setItem(CHAVE_RASCUNHOS, JSON.stringify(filtrados));
  window.dispatchEvent(new CustomEvent("acervo-atualizado"));
}

/** Tenta descarregar a fila de rascunhos offline para o GitHub */
export async function sincronizarFilaOffline(cfg: Settings): Promise<number> {
  if (!navigator.onLine) return 0;
  const rascunhos = obterRascunhosLocais();
  if (rascunhos.length === 0) return 0;

  let concluidos = 0;
  for (const item of rascunhos) {
    try {
      await gravar(cfg, item.caminho, item.texto, item.sha, item.mensagemCommit);
      removerRascunhoLocal(item.caminho);
      concluidos++;
    } catch {
      // continua tentando os próximos
    }
  }

  if (concluidos > 0) {
    invalidarCache();
    window.dispatchEvent(new CustomEvent("acervo-atualizado"));
    notificarOutrasAbas();
  }

  return concluidos;
}
