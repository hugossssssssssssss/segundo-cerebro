/**
 * Gerenciador de Rascunhos e Fila de Operações Offline.
 *
 * Permite salvar notas e tarefas localmente quando o usuário estiver sem internet
 * e sincroniza automaticamente com o GitHub assim que a conexão voltar.
 */

import type { Settings } from "./settings";
import { gravar, ErroGitHub } from "./github";
import { invalidarCache } from "./repo";
import { notificarOutrasAbas } from "./syncChannel";
import { toast } from "./toast";

export type StatusRascunho = "pendente" | "conflito" | "erro";

export type RascunhoOffline = {
  id: string;
  caminho: string;
  texto: string;
  sha?: string;
  mensagemCommit?: string;
  criadoEm: string;
  tentativas?: number;
  status?: StatusRascunho;
  ultimoErro?: string;
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
  const id = `draft_${caminho.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;

  const novo: RascunhoOffline = {
    id,
    caminho,
    texto,
    sha,
    mensagemCommit,
    criadoEm: new Date().toISOString(),
    tentativas: 0,
    status: "pendente",
  };

  // Substitui rascunho anterior para o mesmo caminho, se existir
  const filtrados = rascunhos.filter((r) => r.caminho !== caminho);
  filtrados.push(novo);

  try {
    localStorage.setItem(CHAVE_RASCUNHOS, JSON.stringify(filtrados));
  } catch (err: any) {
    if (err?.name === "QuotaExceededError" || err?.code === 22) {
      throw new Error("Espaço de armazenamento local (localStorage) cheio no seu navegador. Libere espaço para guardar rascunhos offline.");
    }
    throw new Error(`Falha ao salvar rascunho localmente: ${err?.message || "Erro desconhecido"}`);
  }

  if (notificarEvent) {
    window.dispatchEvent(new CustomEvent("acervo-atualizado"));
  }
  return novo;
}

export function atualizarRascunhoLocal(rascunho: RascunhoOffline): void {
  const rascunhos = obterRascunhosLocais();
  const index = rascunhos.findIndex((r) => r.id === rascunho.id || r.caminho === rascunho.caminho);
  if (index >= 0) {
    rascunhos[index] = rascunho;
  } else {
    rascunhos.push(rascunho);
  }

  try {
    localStorage.setItem(CHAVE_RASCUNHOS, JSON.stringify(rascunhos));
  } catch {
    // Trata estouro de localStorage
  }
  window.dispatchEvent(new CustomEvent("acervo-atualizado"));
}

export function removerRascunhoLocal(idOuCaminho: string): void {
  const rascunhos = obterRascunhosLocais();
  const filtrados = rascunhos.filter((r) => r.id !== idOuCaminho && r.caminho !== idOuCaminho);
  try {
    localStorage.setItem(CHAVE_RASCUNHOS, JSON.stringify(filtrados));
  } catch {
    // Trata erro ao salvar no localStorage
  }
  window.dispatchEvent(new CustomEvent("acervo-atualizado"));
}

/** Tenta descarregar a fila de rascunhos offline para o GitHub */
export async function sincronizarFilaOffline(cfg: Settings): Promise<number> {
  if (!navigator.onLine) return 0;
  const rascunhos = obterRascunhosLocais();
  if (rascunhos.length === 0) return 0;

  let concluidos = 0;
  for (const item of rascunhos) {
    // Não re-tenta itens marcados com conflito automático até o usuário resolver
    if (item.status === "conflito") continue;

    try {
      await gravar(cfg, item.caminho, item.texto, item.sha, item.mensagemCommit);
      removerRascunhoLocal(item.id);
      concluidos++;
    } catch (err: any) {
      const status = err instanceof ErroGitHub ? err.status : err?.status;
      const msg = err instanceof Error ? err.message : String(err);
      const tent = (item.tentativas || 0) + 1;

      if (status === 401 || status === 403) {
        toast("Sincronização offline interrompida: Token do GitHub inválido ou sem permissão.", { tipo: "erro" });
        break;
      }

      if (status === 409 || msg.includes("409") || msg.includes("conflito")) {
        // Conflito no GitHub (arquivo mudou lá)
        atualizarRascunhoLocal({
          ...item,
          tentativas: tent,
          status: "conflito",
          ultimoErro: "Conflito de edição no GitHub (HTTP 409). O arquivo mudou no repositório.",
        });
        toast(`Conflito de edição no rascunho de "${item.caminho.split("/").pop()}". Acesse a Caixa de Entrada para revisar.`, { tipo: "aviso" });
      } else {
        atualizarRascunhoLocal({
          ...item,
          tentativas: tent,
          status: tent >= 3 ? "erro" : "pendente",
          ultimoErro: msg,
        });
      }
    }
  }

  if (concluidos > 0) {
    invalidarCache();
    window.dispatchEvent(new CustomEvent("acervo-atualizado"));
    notificarOutrasAbas();
  }

  return concluidos;
}
