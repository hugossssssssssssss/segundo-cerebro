export interface ItemHistorico {
  id?: string;
  nome: string;
  tipo: string; // Ex: "PDF para EPUB" ou "Trocar Capa de EPUB"
  data: string; // Data ISO do momento do processamento
  blob: Blob; // Arquivo resultante salvo
}

const DB_NAME = "klaus-conversor";
const DB_VERSION = 1;
const STORE_NAME = "historico";

/**
 * Inicializa a conexão com o IndexedDB do navegador.
 */
export function inicializarDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

/**
 * Adiciona uma nova conversão ao histórico IndexedDB.
 * Em seguida, dispara a limpeza para respeitar as regras de expiração e limite de tamanho.
 */
export async function adicionarAoHistorico(nome: string, tipo: string, blob: Blob): Promise<void> {
  try {
    const db = await inicializarDb();
    
    // Converte e insere o item
    await new Promise<void>((resolve, reject) => {
      const transacao = db.transaction(STORE_NAME, "readwrite");
      const loja = transacao.objectStore(STORE_NAME);

      const novoItem: ItemHistorico = {
        id: Date.now().toString(),
        nome,
        tipo,
        data: new Date().toISOString(),
        blob,
      };

      const request = loja.add(novoItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Limpeza silenciosa após a inserção bem-sucedida
    await limparExcedentesETtl();
  } catch (error) {
    // Tratamento silencioso: se der erro por falta de cota ou recusa do navegador,
    // apenas registra no console para diagnóstico e deixa o fluxo prosseguir
    console.warn("[IndexedDB] Falha ao gravar conversão no histórico local:", error);
  }
}

/**
 * Retorna todos os itens do histórico ordenados por data decrescente (mais novos primeiro).
 */
export async function listarHistorico(): Promise<ItemHistorico[]> {
  try {
    const db = await inicializarDb();
    const itens = await new Promise<ItemHistorico[]>((resolve, reject) => {
      const transacao = db.transaction(STORE_NAME, "readonly");
      const loja = transacao.objectStore(STORE_NAME);
      const request = loja.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    // Ordenar: mais novos primeiro
    return itens.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  } catch (error) {
    console.error("[IndexedDB] Erro ao recuperar histórico:", error);
    return [];
  }
}

/**
 * Limpa silenciosamente os registros que excederam o TTL de 7 dias
 * ou que ultrapassaram o limite de retenção de no máximo 2 itens no histórico.
 */
export async function limparExcedentesETtl(): Promise<void> {
  try {
    const db = await inicializarDb();
    
    // 1. Obter todos os itens
    const itens = await new Promise<ItemHistorico[]>((resolve, reject) => {
      const transacao = db.transaction(STORE_NAME, "readonly");
      const loja = transacao.objectStore(STORE_NAME);
      const request = loja.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (itens.length === 0) return;

    // Ordenar do mais novo para o mais antigo
    itens.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    const agora = Date.now();
    const seteDiasMs = 7 * 24 * 60 * 60 * 1000;
    
    const transacaoEscrita = db.transaction(STORE_NAME, "readwrite");
    const lojaEscrita = transacaoEscrita.objectStore(STORE_NAME);

    // Iterar e deletar o que não cumprir as regras
    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      const tempoMs = new Date(item.data).getTime();
      
      const expirado = agora - tempoMs > seteDiasMs;
      const excedente = i >= 2; // Mantém apenas os índices 0 e 1 (os 2 mais novos)

      if (expirado || excedente) {
        if (item.id) {
          lojaEscrita.delete(item.id);
        }
      }
    }
  } catch (error) {
    console.error("[IndexedDB] Erro ao realizar a limpeza de expiração/limite:", error);
  }
}

/**
 * Deleta todos os registros da loja do histórico.
 */
export async function deletarHistorico(): Promise<void> {
  try {
    const db = await inicializarDb();
    await new Promise<void>((resolve, reject) => {
      const transacao = db.transaction(STORE_NAME, "readwrite");
      const loja = transacao.objectStore(STORE_NAME);
      const request = loja.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("[IndexedDB] Erro ao limpar histórico completamente:", error);
  }
}
