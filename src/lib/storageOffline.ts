/**
 * Armazenamento Local Assíncrono para a Fila Offline do Klaus (IndexedDB).
 *
 * Substitui o limite síncrono e rígido de ~5MB do localStorage por uma
 * solução de grande capacidade (centenas de MBs), que não bloqueia a thread
 * principal da interface e oferece resiliência total contra estouro de cota.
 *
 * Mantém a regra do Klaus: o armazenamento local é 100% efêmero e transitório;
 * os arquivos Markdown no GitHub continuam sendo a única fonte da verdade.
 */

import type { RascunhoOffline } from "./offlineQueue";
import { logger } from "./logger";

const DB_NAME = "klaus_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "sync_queue";
const CHAVE_LEGADA_LOCALSTORAGE = "klaus:rascunhos_offline";

let idbDisponivel: boolean | null = null;
const memoriaFallback = new Map<string, RascunhoOffline>();

function checarSuporteIDB(): boolean {
  if (idbDisponivel !== null) return idbDisponivel;
  try {
    idbDisponivel = typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    idbDisponivel = false;
  }
  return idbDisponivel;
}

function abrirConexao(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!checarSuporteIDB()) {
      reject(new Error("IndexedDB não disponível no ambiente"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Erro ao abrir IndexedDB"));
  });
}

/**
 * Salva ou atualiza um rascunho offline no IndexedDB (ou fallback em memória).
 */
export async function salvarRascunhoNoArmazenamento(rascunho: RascunhoOffline): Promise<void> {
  memoriaFallback.set(rascunho.id, rascunho);

  if (!checarSuporteIDB()) return;

  try {
    const db = await abrirConexao();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(rascunho);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    logger.warn("Falha ao salvar no IndexedDB, mantido em memória:", err);
  }
}

/**
 * Retorna todos os rascunhos offline armazenados.
 */
export async function carregarTodosRascunhosArmazenamento(): Promise<RascunhoOffline[]> {
  if (!checarSuporteIDB()) {
    return Array.from(memoriaFallback.values());
  }

  try {
    const db = await abrirConexao();
    const lista: RascunhoOffline[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    // Sincroniza a memória de fallback
    memoriaFallback.clear();
    for (const r of lista) {
      memoriaFallback.set(r.id, r);
    }

    return lista;
  } catch (err) {
    logger.warn("Falha ao carregar do IndexedDB, usando memória:", err);
    return Array.from(memoriaFallback.values());
  }
}

/**
 * Remove um rascunho por ID ou caminho.
 */
export async function removerRascunhoDoArmazenamento(idOuCaminho: string): Promise<void> {
  // Remove da memória
  for (const [id, r] of memoriaFallback.entries()) {
    if (id === idOuCaminho || r.caminho === idOuCaminho) {
      memoriaFallback.delete(id);
    }
  }

  if (!checarSuporteIDB()) return;

  try {
    const db = await abrirConexao();
    const todos = await carregarTodosRascunhosArmazenamento();
    const alvos = todos.filter((r) => r.id === idOuCaminho || r.caminho === idOuCaminho);

    if (alvos.length === 0) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const a of alvos) {
        store.delete(a.id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    logger.warn("Falha ao remover do IndexedDB:", err);
  }
}

/**
 * Limpa todos os rascunhos armazenados.
 */
export async function limparTodosRascunhosArmazenamento(): Promise<void> {
  memoriaFallback.clear();

  if (!checarSuporteIDB()) return;

  try {
    const db = await abrirConexao();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    logger.warn("Falha ao limpar IndexedDB:", err);
  }
}

/**
 * Migra automaticamente rascunhos legados do localStorage para o IndexedDB na inicialização.
 */
export async function migrarRascunhosLegadosLocalStorage(): Promise<number> {
  try {
    const salvo = localStorage.getItem(CHAVE_LEGADA_LOCALSTORAGE);
    if (!salvo) return 0;

    const lista: RascunhoOffline[] = JSON.parse(salvo);
    if (!Array.isArray(lista) || lista.length === 0) {
      localStorage.removeItem(CHAVE_LEGADA_LOCALSTORAGE);
      return 0;
    }

    for (const r of lista) {
      await salvarRascunhoNoArmazenamento(r);
    }

    localStorage.removeItem(CHAVE_LEGADA_LOCALSTORAGE);
    logger.info(`Migrados ${lista.length} rascunhos offline do localStorage para IndexedDB.`);
    return lista.length;
  } catch (err) {
    logger.warn("Erro durante migração de rascunhos legados:", err);
    return 0;
  }
}
