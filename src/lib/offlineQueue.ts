/**
 * Gerenciador de Rascunhos e Fila de Operações Offline.
 *
 * Permite salvar notas e tarefas localmente quando o usuário estiver sem internet
 * e sincroniza automaticamente com o GitHub assim que a conexão voltar.
 */

import type { Settings } from "./settings";
import { gravar, ler, ErroGitHub } from "./github";
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
): { ok: boolean; rascunho: RascunhoOffline } {
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

  const filtrados = rascunhos.filter((r) => r.caminho !== caminho);
  filtrados.push(novo);

  let gravado = false;
  try {
    localStorage.setItem(CHAVE_RASCUNHOS, JSON.stringify(filtrados));
    gravado = true;
  } catch (err: any) {
    if (err?.name === "QuotaExceededError" || err?.code === 22 || String(err).includes("Quota")) {
      // Tenta podar os rascunhos mais antigos para dar espaço ao novo rascunho
      while (filtrados.length > 1 && !gravado) {
        filtrados.shift();
        try {
          localStorage.setItem(CHAVE_RASCUNHOS, JSON.stringify(filtrados));
          gravado = true;
        } catch {
          // Tenta podar mais um se ainda falhar
        }
      }
    }
  }

  if (gravado && notificarEvent) {
    window.dispatchEvent(new CustomEvent("acervo-atualizado"));
  }

  return { ok: gravado, rascunho: novo };
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

let sincronizandoFila = false;

/** Tenta descarregar a fila de rascunhos offline para o GitHub */
export async function sincronizarFilaOffline(cfg: Settings): Promise<{ concluidos: number; falhas: number }> {
  if (!navigator.onLine) return { concluidos: 0, falhas: 0 };
  if (sincronizandoFila) return { concluidos: 0, falhas: 0 };

  const rascunhos = obterRascunhosLocais();
  if (rascunhos.length === 0) return { concluidos: 0, falhas: 0 };

  sincronizandoFila = true;
  let concluidos = 0;
  let falhas = 0;

  try {
    for (const item of rascunhos) {
      // Não re-tenta itens marcados com conflito automático até o usuário resolver
      if (item.status === "conflito") {
        falhas++;
        continue;
      }

      try {
        await gravar(cfg, item.caminho, item.texto, item.sha, item.mensagemCommit);
        removerRascunhoLocal(item.id);
        concluidos++;
      } catch (err: any) {
        falhas++;
        const status = err instanceof ErroGitHub ? err.status : err?.status;
        const msg = err instanceof Error ? err.message : String(err);
        const tent = (item.tentativas || 0) + 1;

        if (status === 401 || status === 403) {
          toast("Sincronização offline interrompida: Token do GitHub inválido ou sem permissão.", { tipo: "erro" });
          break;
        }

        if (status === 409 || msg.includes("409") || msg.includes("conflito")) {
          // Tenta auto-resolver buscando o SHA atualizado no GitHub
          try {
            const { sha: remoteSha } = await ler(cfg, item.caminho);
            await gravar(cfg, item.caminho, item.texto, remoteSha, item.mensagemCommit);
            removerRascunhoLocal(item.id);
            concluidos++;
            continue;
          } catch {
            // Se falhar a leitura/recuperação, marca como conflito para o usuário revisar
          }

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
  } finally {
    sincronizandoFila = false;
  }

  if (concluidos > 0) {
    invalidarCache();
    window.dispatchEvent(new CustomEvent("acervo-atualizado"));
    notificarOutrasAbas();
  }

  return { concluidos, falhas };
}
