import { lerConfig } from "./settings";

export type TipoLog = "info" | "warn" | "error" | "request";

export interface EntradaLog {
  id: string;
  timestamp: string;
  tipo: TipoLog;
  mensagem: string;
  detalhes?: string;
}

let logs: EntradaLog[] = [];
const MAX_LOGS = 500;
const listeners = new Set<() => void>();

function notificarListeners() {
  listeners.forEach((l) => l());
}

/**
 * Limpa todos os logs voláteis em memória.
 */
export function limparLogs() {
  logs = [];
  notificarListeners();
}

/**
 * Retorna uma cópia da lista atual de logs.
 */
export function obterLogs(): EntradaLog[] {
  return [...logs];
}

/**
 * Se inscreve para receber atualizações na lista de logs.
 * Retorna uma função de cancelamento de inscrição.
 */
export function inscreverLogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Intercepta e mascara credenciais em qualquer string de log.
 */
export function higienizar(texto: string): string {
  if (!texto) return "";

  let textoLimpo = texto;

  // 1. Tenta obter segredos configurados dinamicamente no localStorage do app
  try {
    const cfg = lerConfig();
    const segredos = [
      { valor: cfg.githubToken, rotulo: "[TOKEN_GITHUB_OCULTO]" },
      { valor: cfg.geminiKey, rotulo: "[CHAVE_GEMINI_OCULTA]" },
      { valor: cfg.telegramBotToken, rotulo: "[TOKEN_TELEGRAM_OCULTO]" },
    ];

    for (const s of segredos) {
      if (s.valor && s.valor.length > 3) {
        // Escapa caracteres especiais para uso seguro em RegExp
        const valorEscapado = s.valor.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(valorEscapado, "g");
        textoLimpo = textoLimpo.replace(regex, s.rotulo);
      }
    }
  } catch {
    // Silencia erros caso lerConfig quebre durante inicialização
  }

  // 2. Filtros e padrões estáticos de fallback (regex)
  
  // GitHub Fine-grained e Classic Tokens
  textoLimpo = textoLimpo.replace(/ghp_[a-zA-Z0-9]+/g, "[TOKEN_GITHUB_OCULTO]");
  textoLimpo = textoLimpo.replace(/github_pat_[a-zA-Z0-9]{5,22}_[a-zA-Z0-9]+/g, "[TOKEN_GITHUB_OCULTO]");

  // Chaves de API do Google/Gemini
  textoLimpo = textoLimpo.replace(/AIzaSy[a-zA-Z0-9_-]{5,40}/g, "[CHAVE_GEMINI_OCULTA]");

  // Cabeçalho Authorization
  textoLimpo = textoLimpo.replace(/(Authorization:\s*Bearer\s+)[^\s"']+/gi, "$1[TOKEN_OCULTO]");
  textoLimpo = textoLimpo.replace(/(Authorization":\s*"Bearer\s+)[^"]+/gi, "$1[TOKEN_OCULTO]");

  // Chave de URL (ex: ?key=...)
  textoLimpo = textoLimpo.replace(/([\?&]key=)[a-zA-Z0-9_-]+/gi, "$1[CHAVE_OCULTA]");

  return textoLimpo;
}

/**
 * Adiciona uma entrada de log na pilha.
 */
export function adicionarLog(tipo: TipoLog, mensagem: string, detalhes?: any) {
  const agora = new Date();
  const timestamp = agora.toTimeString().split(" ")[0] || agora.toLocaleTimeString();

  let detString = "";
  if (detalhes !== undefined && detalhes !== null) {
    if (typeof detalhes === "string") {
      detString = detalhes;
    } else if (detalhes instanceof Error) {
      detString = `${detalhes.name}: ${detalhes.message}\n${detalhes.stack || ""}`;
    } else {
      try {
        detString = JSON.stringify(detalhes, null, 2);
      } catch {
        detString = String(detalhes);
      }
    }
  }

  const logEntry: EntradaLog = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp,
    tipo,
    mensagem: higienizar(mensagem),
    detalhes: detString ? higienizar(detString) : undefined,
  };

  logs.push(logEntry);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  notificarListeners();
}

export const logger = {
  info: (msg: string, det?: any) => adicionarLog("info", msg, det),
  warn: (msg: string, det?: any) => adicionarLog("warn", msg, det),
  error: (msg: string, det?: any) => adicionarLog("error", msg, det),
  request: (msg: string, det?: any) => adicionarLog("request", msg, det),
};

let fetchInterceptado = false;

/**
 * Inicializa a captura global de logs (fetch, erros globais da window).
 */
export function inicializarLogger(forcar = false) {
  if (fetchInterceptado && !forcar) return;
  fetchInterceptado = true;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : (input instanceof URL ? input.toString() : input.url);
    const metodo = init?.method || "GET";

    let requestBody = "";
    if (init?.body) {
      if (typeof init.body === "string") {
        requestBody = init.body;
      } else {
        requestBody = "[Corpo binário ou multipart]";
      }
    }

    let silenciar404 = false;
    let silenciarTodosErros = false;

    if (init && init.headers) {
      if (init.headers instanceof Headers) {
        if (init.headers.has("x-silent-404")) {
          silenciar404 = init.headers.get("x-silent-404") === "true";
          init.headers.delete("x-silent-404");
        }
        if (init.headers.has("x-silent-errors")) {
          silenciarTodosErros = init.headers.get("x-silent-errors") === "true";
          init.headers.delete("x-silent-errors");
        }
      } else if (Array.isArray(init.headers)) {
        const novosHeaders: [string, string][] = [];
        for (const [k, v] of init.headers) {
          if (k.toLowerCase() === "x-silent-404") {
            silenciar404 = v === "true";
          } else if (k.toLowerCase() === "x-silent-errors") {
            silenciarTodosErros = v === "true";
          } else {
            novosHeaders.push([k, v]);
          }
        }
        init.headers = novosHeaders;
      } else {
        const novosHeaders = { ...init.headers } as Record<string, string>;
        if ("x-silent-404" in novosHeaders) {
          silenciar404 = novosHeaders["x-silent-404"] === "true";
          delete novosHeaders["x-silent-404"];
        }
        if ("x-silent-errors" in novosHeaders) {
          silenciarTodosErros = novosHeaders["x-silent-errors"] === "true";
          delete novosHeaders["x-silent-errors"];
        }
        init.headers = novosHeaders;
      }
    }

    const idRequisicao = Math.random().toString(36).substring(2, 9);

    logger.request(`→ ${metodo} ${url}`, {
      id: idRequisicao,
      headers: init?.headers,
      body: requestBody,
    });

    const startTime = performance.now();

    try {
      const resposta = await originalFetch(input, init);
      const duration = (performance.now() - startTime).toFixed(0);

      let responseBody = "";
      const clone = resposta.clone();
      try {
        const contentType = clone.headers.get("content-type") || "";
        if (contentType.includes("application/json") || contentType.includes("text/")) {
          responseBody = await clone.text();
        } else {
          responseBody = "[Dados binários]";
        }
      } catch {
        responseBody = "[Falha ao ler corpo]";
      }

      const ehSucessoOuCache = resposta.ok || resposta.status === 304;
      const statusTexto = resposta.status === 304
        ? "304 Not Modified (Cache)"
        : `${resposta.status} ${resposta.statusText}`.trim();

      if (ehSucessoOuCache) {
        logger.request(`← ${metodo} ${url} [${statusTexto}] (${duration}ms)`, {
          id: idRequisicao,
          headers: Object.fromEntries(resposta.headers.entries()),
          body: responseBody,
        });
      } else {
        const ehSilencioso = silenciarTodosErros || (silenciar404 && resposta.status === 404);
        if (ehSilencioso) {
          logger.request(`← ${metodo} ${url} [${statusTexto} (Silenciado)] (${duration}ms)`, {
            id: idRequisicao,
            headers: Object.fromEntries(resposta.headers.entries()),
            body: responseBody,
          });
        } else {
          logger.error(`← ${metodo} ${url} [FALHA: ${statusTexto}] (${duration}ms)`, {
            id: idRequisicao,
            headers: Object.fromEntries(resposta.headers.entries()),
            body: responseBody,
          });
        }
      }

      return resposta;
    } catch (erro: any) {
      const duration = (performance.now() - startTime).toFixed(0);
      logger.error(`✕ ${metodo} ${url} [ERRO DE REDE/CORS] (${duration}ms)`, erro);
      throw erro;
    }
  };

  // Capturar erros não tratados do script global
  window.addEventListener("error", (event) => {
    // Ignora erros relacionados a extensões do navegador ou redundâncias
    if (event.filename && event.filename.includes("extension")) return;
    logger.error(`Erro não tratado: ${event.message}`, {
      arquivo: event.filename,
      linha: event.lineno,
      coluna: event.colno,
      erro: event.error,
    });
  });

  // Capturar rejeições de promessas
  window.addEventListener("unhandledrejection", (event) => {
    logger.error(`Rejeição de Promessa não tratada: ${event.reason?.message || String(event.reason)}`, {
      reason: event.reason,
    });
  });
}
