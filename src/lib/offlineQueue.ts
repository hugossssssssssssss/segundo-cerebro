/**
 * Gerenciador de Rascunhos e Fila de Operações em Segundo Plano (Sync Queue).
 *
 * Permite salvar e deletar notas, tarefas e outros itens localmente com Optimistic UI
 * e sincroniza automaticamente com o GitHub em background assim que houver rede.
 */

import { lerConfig, configCompleta } from "./settings";
import type { Settings } from "./settings";
import { gravar, ler, apagar, ErroGitHub } from "./github";
import { atualizarCacheLocal, invalidarCache, removerDoCacheLocal, cache, obterCacheExistente } from "./repo";
import { lerMarkdown } from "./markdown";
import { notificarOutrasAbas } from "./syncChannel";
import { toast } from "./toast";
import { formatarNomeAmigavel } from "./utils";
import { dispararAtualizacaoAcervo } from "./eventos";
import {
  salvarRascunhoNoArmazenamento,
  removerRascunhoDoArmazenamento,
  limparTodosRascunhosArmazenamento,
  carregarTodosRascunhosArmazenamento,
  migrarRascunhosLegadosLocalStorage,
} from "./storageOffline";

export type StatusRascunho = "pendente" | "conflito" | "erro" | "sincronizando";

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
  acao?: "gravar" | "apagar";
};

const CHAVE_RASCUNHOS = "klaus:rascunhos_offline";

// Cache em memória para acesso síncrono e Optimistic UI imediata (0ms)
let memoriaRascunhos: RascunhoOffline[] = [];
let inicializado = false;

/**
 * Carrega a memória a partir do storage assíncrono e faz a migração inicial.
 */
export async function inicializarArmazenamentoOffline(): Promise<void> {
  try {
    await migrarRascunhosLegadosLocalStorage();
    const carregados = await carregarTodosRascunhosArmazenamento();
    if (carregados.length > 0) {
      memoriaRascunhos = carregados;
    }
  } catch {
    // fallback mantém memória atual
  } finally {
    inicializado = true;
  }
}

export function estaArmazenamentoInicializado(): boolean {
  return inicializado;
}

// Inicializa imediatamente se estiver no navegador
if (typeof window !== "undefined") {
  // Carregamento rápido síncrono de fallback
  try {
    const salvo = localStorage.getItem(CHAVE_RASCUNHOS);
    if (salvo) {
      memoriaRascunhos = JSON.parse(salvo);
    }
  } catch {}
  inicializarArmazenamentoOffline().catch(() => {});
}

export function obterRascunhosLocais(): RascunhoOffline[] {
  // Se ainda temos itens no localStorage legados não carregados na memória
  if (memoriaRascunhos.length === 0 && typeof localStorage !== "undefined") {
    try {
      const salvo = localStorage.getItem(CHAVE_RASCUNHOS);
      if (salvo) {
        memoriaRascunhos = JSON.parse(salvo);
      }
    } catch {}
  }

  if (!sincronizandoFila) {
    return memoriaRascunhos.map((r) => (r.status === "sincronizando" ? { ...r, status: "pendente" } : r));
  }
  return [...memoriaRascunhos];
}

export function salvarRascunhoLocal(
  caminho: string,
  texto: string,
  sha?: string,
  mensagemCommit?: string,
  notificarEvent = true,
  acao: "gravar" | "apagar" = "gravar"
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
    acao,
  };

  // Coalescing: Substitui qualquer rascunho pendente do mesmo arquivo pelo mais recente
  const filtrados = rascunhos.filter((r) => r.caminho !== caminho);
  filtrados.push(novo);
  memoriaRascunhos = filtrados;

  // Persiste no IndexedDB assíncrono (sem risco de estourar 5MB de cota síncrona)
  salvarRascunhoNoArmazenamento(novo).catch(() => {});

  // Também guarda backup no localStorage se for pequeno (para resiliência adicional)
  try {
    localStorage.setItem(CHAVE_RASCUNHOS, JSON.stringify(filtrados));
  } catch {
    // Ignora estouro no localStorage, pois já está garantido no IndexedDB e memória
  }

  if (notificarEvent) {
    dispararAtualizacaoAcervo(caminho);
    
    // Dispara a sincronização imediatamente em background se estiver online e autenticado
    const cfg = lerConfig();
    if (configCompleta(cfg) && navigator.onLine) {
      sincronizarFilaOffline(cfg).catch(() => {});
    }
  }

  return { ok: true, rascunho: novo };
}

export function atualizarRascunhoLocal(rascunho: RascunhoOffline): void {
  const rascunhos = obterRascunhosLocais();
  const index = rascunhos.findIndex((r) => r.id === rascunho.id || r.caminho === rascunho.caminho);
  if (index >= 0) {
    rascunhos[index] = rascunho;
  } else {
    rascunhos.push(rascunho);
  }
  memoriaRascunhos = [...rascunhos];

  salvarRascunhoNoArmazenamento(rascunho).catch(() => {});
  try {
    localStorage.setItem(CHAVE_RASCUNHOS, JSON.stringify(rascunhos));
  } catch {}

  dispararAtualizacaoAcervo(rascunho.caminho);
}

export function removerRascunhoLocal(idOuCaminho: string): void {
  const rascunhos = obterRascunhosLocais();
  const filtrados = rascunhos.filter((r) => r.id !== idOuCaminho && r.caminho !== idOuCaminho);
  memoriaRascunhos = filtrados;

  removerRascunhoDoArmazenamento(idOuCaminho).catch(() => {});
  try {
    localStorage.setItem(CHAVE_RASCUNHOS, JSON.stringify(filtrados));
  } catch {}

  dispararAtualizacaoAcervo(idOuCaminho);
}

export function limparTodosRascunhosLocais(): void {
  memoriaRascunhos = [];
  limparTodosRascunhosArmazenamento().catch(() => {});
  try {
    localStorage.removeItem(CHAVE_RASCUNHOS);
  } catch {}
  dispararAtualizacaoAcervo();
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


      // Coloca status como "sincronizando"
      atualizarRascunhoLocal({ ...item, status: "sincronizando" });
      const acao = item.acao || "gravar";

      try {
        // Tenta obter o SHA mais recente do cache local em memória
        let shaParaEnviar = item.sha;
        const cacheExistente = cache || obterCacheExistente(cfg);
        const itemCache = cacheExistente?.itens.find((i) => i.caminho === item.caminho);
        if (itemCache && itemCache.sha && !itemCache.sha.startsWith("temp_")) {
          shaParaEnviar = itemCache.sha;
        }

        if (acao === "apagar") {
          await apagar(cfg, item.caminho, shaParaEnviar || "");
          removerRascunhoLocal(item.id);
          removerDoCacheLocal(item.caminho);
          concluidos++;
        } else {
          const novoSha = await gravar(cfg, item.caminho, item.texto, shaParaEnviar, item.mensagemCommit);
          removerRascunhoLocal(item.id);
          
          // Sincroniza o cache em memória com os dados finais reais
          const doc = lerMarkdown(item.texto);
          atualizarCacheLocal(item.caminho, item.texto, doc, novoSha);
          concluidos++;
        }
      } catch (err: any) {
        falhas++;
        const status = err instanceof ErroGitHub ? err.status : err?.status;
        const msg = err instanceof Error ? err.message : String(err);
        const tent = (item.tentativas || 0) + 1;

        if (status === 401 || status === 403) {
          atualizarRascunhoLocal({
            ...item,
            status: "erro",
            ultimoErro: msg,
          });
          toast("Sincronização offline interrompida: Token do GitHub inválido ou sem permissão", {
            tipo: "erro",
            detalhes: `A API do GitHub retornou erro de permissão (HTTP ${status}). Acesse a aba de Ajustes para renovar seu token.`,
          });
          break;
        }

        const nomeAmigavel = formatarNomeAmigavel(item.caminho);

        if (status === 404 && acao === "apagar") {
          // Arquivo já foi excluído no GitHub, sucesso silencioso
          removerRascunhoLocal(item.id);
          removerDoCacheLocal(item.caminho);
          concluidos++;
          continue;
        }

        if (status === 409 || msg.includes("409") || msg.includes("conflito") || msg.includes("does not match")) {
          // Tenta auto-recuperação buscando a SHA mais recente no GitHub
          try {
            const remoto = await ler(cfg, item.caminho);
            if (remoto && remoto.sha) {
              if (acao === "apagar") {
                await apagar(cfg, item.caminho, remoto.sha);
                removerRascunhoLocal(item.id);
                removerDoCacheLocal(item.caminho);
                concluidos++;
                continue;
              } else {
                const novoSha = await gravar(cfg, item.caminho, item.texto, remoto.sha, item.mensagemCommit);
                removerRascunhoLocal(item.id);
                const doc = lerMarkdown(item.texto);
                atualizarCacheLocal(item.caminho, item.texto, doc, novoSha);
                concluidos++;
                continue;
              }
            }
          } catch {
            // Se a leitura também falhar, marca como conflito para resolução manual
          }

          const erroTxt = "Conflito de edição no GitHub (HTTP 409). O arquivo foi modificado diretamente no repositório.";
          atualizarRascunhoLocal({
            ...item,
            tentativas: tent,
            status: "conflito",
            ultimoErro: erroTxt,
            acao,
          });
          toast(`Conflito no rascunho de "${nomeAmigavel}": clique para resolver`, {
            tipo: "erro",
            detalhes: `${erroTxt}\n\nAcesse a Caixa de Entrada > Rascunhos Offline para aceitar a versão local ou descartar.`,
          });
        } else {
          atualizarRascunhoLocal({
            ...item,
            tentativas: tent,
            status: tent >= 3 ? "erro" : "pendente",
            ultimoErro: msg,
            acao,
          });
        }
      }
    }
  } finally {
    sincronizandoFila = false;
  }

  if (concluidos > 0) {
    invalidarCache();
    dispararAtualizacaoAcervo();
    notificarOutrasAbas();
  }

  return { concluidos, falhas };
}

/**
 * Força a gravação de um rascunho com conflito (409) ou erro no GitHub,
 * buscando a SHA mais recente do repositório remoto e aplicando o rascunho.
 */
export async function forcarResolverConflitoRascunho(cfg: Settings, id: string): Promise<void> {
  const rascunhos = obterRascunhosLocais();
  const alvo = rascunhos.find((r) => r.id === id);
  if (!alvo) throw new Error("Rascunho não encontrado.");

  const acao = alvo.acao || "gravar";
  let remoteSha = alvo.sha;
  try {
    const res = await ler(cfg, alvo.caminho);
    remoteSha = res.sha;
  } catch {
    /* arquivo novo remoto */
  }

  if (acao === "apagar") {
    await apagar(cfg, alvo.caminho, remoteSha || "");
    removerRascunhoLocal(id);
    removerDoCacheLocal(alvo.caminho);
  } else {
    const novoSha = await gravar(cfg, alvo.caminho, alvo.texto, remoteSha, alvo.mensagemCommit || `Resolve conflito em ${alvo.caminho}`);
    removerRascunhoLocal(id);
    const doc = lerMarkdown(alvo.texto);
    atualizarCacheLocal(alvo.caminho, alvo.texto, doc, novoSha);
  }
  
  invalidarCache();
  notificarOutrasAbas(alvo.caminho);
}
