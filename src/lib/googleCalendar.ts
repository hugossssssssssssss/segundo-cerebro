/**
 * Integração com Google Calendar via Google Identity Services (OAuth 2.0)
 * e Google Calendar API v3 — 100% Client-Side no navegador (Zero Backend).
 */

import { lerConfig, salvarConfig, type Settings } from "./settings";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponseGoogle) => void;
            error_callback?: (err: any) => void;
          }) => TokenClientGoogle;
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

export interface TokenResponseGoogle {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface TokenClientGoogle {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

export interface EventoGoogle {
  id: string;
  titulo: string;
  descricao?: string;
  inicio: string; // ISO string ou YYYY-MM-DD
  fim: string;    // ISO string ou YYYY-MM-DD
  oDiaTodo: boolean;
  link?: string;
  local?: string;
  corId?: string;
}

const CHAVE_TOKEN = "klaus:gcal:access_token";
const CHAVE_EXPIRA = "klaus:gcal:expires_at";

/**
 * Carrega a biblioteca Google Identity Services de forma assíncrona.
 */
export async function carregarGisScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.google?.accounts?.oauth2) return true;

  return new Promise((resolve) => {
    const scriptId = "google-gis-sdk";
    const existente = document.getElementById(scriptId);
    if (existente) {
      existente.addEventListener("load", () => resolve(true));
      existente.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Obtém o token de acesso armazenado se ainda for válido.
 */
export function obterTokenGoogleSalvo(): string | null {
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem(CHAVE_TOKEN);
  const expiraEm = localStorage.getItem(CHAVE_EXPIRA);

  if (!token || !expiraEm) return null;

  // Se expirar em menos de 1 minuto, considera expirado
  const agora = Date.now();
  if (parseInt(expiraEm, 10) - agora < 60 * 1000) {
    limparTokenGoogle();
    return null;
  }

  return token;
}

/**
 * Salva o token de acesso e seu tempo de expiração.
 */
export function salvarTokenGoogle(token: string, expiresInSegundos: number): void {
  if (typeof localStorage === "undefined") return;
  const expiraEm = Date.now() + expiresInSegundos * 1000;
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_EXPIRA, expiraEm.toString());
}

/**
 * Remove o token do Google salvo.
 */
export function limparTokenGoogle(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_EXPIRA);
}

/**
 * Retorna se há um token de acesso válido armazenado no navegador.
 */
export function temTokenGoogleValido(): boolean {
  return Boolean(obterTokenGoogleSalvo());
}

/**
 * Dispara o popup oficial do Google para autorização do usuário e retorno do Access Token.
 */
export async function solicitarAutorizacaoGoogle(clientId?: string, prompt?: string): Promise<string> {
  const cfg = lerConfig();
  const cId = (clientId || cfg.googleCalendarClientId || "").trim();

  if (!cId) {
    throw new Error("Client ID do Google não configurado. Adicione-o na tela de Ajustes.");
  }

  const carregado = await carregarGisScript();
  if (!carregado || !window.google?.accounts?.oauth2) {
    throw new Error("Não foi possível carregar o serviço de autenticação do Google.");
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: cId,
        scope: "https://www.googleapis.com/auth/calendar.events",
        callback: (resposta: TokenResponseGoogle) => {
          if (resposta.error) {
            reject(new Error(resposta.error_description || resposta.error));
            return;
          }
          if (resposta.access_token) {
            salvarTokenGoogle(resposta.access_token, resposta.expires_in || 3600);
            // Atualiza settings para marcar como ativo
            const configAtual = lerConfig();
            salvarConfig({
              ...configAtual,
              googleCalendarAtivo: true,
            });
            resolve(resposta.access_token);
          } else {
            reject(new Error("Nenhum token retornado pelo Google."));
          }
        },
        error_callback: (err) => {
          reject(new Error(err?.message || "Erro na autenticação com Google."));
        },
      });

      const configPrompt = prompt !== undefined ? prompt : (cfg.googleCalendarAtivo ? "" : "consent");
      client.requestAccessToken({ prompt: configPrompt });
    } catch (e: any) {
      reject(new Error(e?.message || "Falha ao iniciar login do Google."));
    }
  });
}

/**
 * Desconecta a conta do Google e revoga o token.
 */
export function desconectarGoogle(): void {
  const token = obterTokenGoogleSalvo();
  if (token && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {});
    } catch {
      // ignora se falhar ao revogar
    }
  }
  limparTokenGoogle();
  const cfg = lerConfig();
  salvarConfig({
    ...cfg,
    googleCalendarAtivo: false,
  });
}

/**
 * Retorna se o usuário está com o Google Calendar configurado e ativo.
 */
export function estaConectadoGoogle(cfg?: Settings): boolean {
  const configuracao = cfg || lerConfig();
  return Boolean(configuracao.googleCalendarClientId && (configuracao.googleCalendarAtivo || obterTokenGoogleSalvo()));
}

/**
 * Garante que temos um token válido antes de chamar a API.
 */
async function obterTokenValido(): Promise<string> {
  const tokenSalvo = obterTokenGoogleSalvo();
  if (tokenSalvo) return tokenSalvo;
  return solicitarAutorizacaoGoogle();
}

/**
 * Busca eventos do Google Calendar silenciosamente apenas se já houver token ativo.
 * Não dispara pop-up em segundo plano (evita bloqueio pelo navegador).
 */
export async function buscarEventosGoogleSilencioso(inicio: Date, fim: Date): Promise<EventoGoogle[]> {
  const token = obterTokenGoogleSalvo();
  if (!token) return [];

  try {
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", inicio.toISOString());
    url.searchParams.set("timeMax", fim.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "250");

    const resposta = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (resposta.status === 401) {
      limparTokenGoogle();
      return [];
    }

    if (!resposta.ok) {
      return [];
    }

    const dados = await resposta.json();
    const itens = Array.isArray(dados.items) ? dados.items : [];

    return itens.map((item: any): EventoGoogle => {
      const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
      const inicioStr = item.start?.dateTime || item.start?.date || "";
      const fimStr = item.end?.dateTime || item.end?.date || inicioStr;

      return {
        id: item.id,
        titulo: item.summary || "(Sem título)",
        descricao: item.description || "",
        inicio: inicioStr,
        fim: fimStr,
        oDiaTodo: isAllDay,
        link: item.htmlLink,
        local: item.location,
        corId: item.colorId,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Lista eventos do Google Calendar primário dentro de uma faixa de datas (autentica se necessário).
 */
export async function listarEventosGoogle(inicio: Date, fim: Date): Promise<EventoGoogle[]> {
  const token = await obterTokenValido();

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", inicio.toISOString());
  url.searchParams.set("timeMax", fim.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");

  const resposta = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (resposta.status === 401) {
    limparTokenGoogle();
    throw new Error("Sessão do Google expirada. Por favor, conecte novamente.");
  }

  if (!resposta.ok) {
    const erroBody = await resposta.json().catch(() => null);
    throw new Error(erroBody?.error?.message || `Erro ao carregar eventos do Google (${resposta.status})`);
  }

  const dados = await resposta.json();
  const itens = Array.isArray(dados.items) ? dados.items : [];

  return itens.map((item: any): EventoGoogle => {
    const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
    const inicioStr = item.start?.dateTime || item.start?.date || "";
    const fimStr = item.end?.dateTime || item.end?.date || inicioStr;

    return {
      id: item.id,
      titulo: item.summary || "(Sem título)",
      descricao: item.description || "",
      inicio: inicioStr,
      fim: fimStr,
      oDiaTodo: isAllDay,
      link: item.htmlLink,
      local: item.location,
      corId: item.colorId,
    };
  });
}

/**
 * Cria um novo evento no Google Calendar.
 */
export async function criarEventoGoogle(dados: {
  titulo: string;
  descricao?: string;
  dataInicio: string; // "2026-09-08" ou ISO
  dataFim?: string;
  oDiaTodo?: boolean;
}): Promise<string> {
  const token = await obterTokenValido();

  const isDiaTodo = dados.oDiaTodo ?? (dados.dataInicio.length === 10);
  
  let startPayload: any = {};
  let endPayload: any = {};

  if (isDiaTodo) {
    const dataApenas = dados.dataInicio.slice(0, 10);
    startPayload = { date: dataApenas };
    const fim = dados.dataFim ? dados.dataFim.slice(0, 10) : dataApenas;
    endPayload = { date: fim };
  } else {
    startPayload = { dateTime: new Date(dados.dataInicio).toISOString() };
    const fimIso = dados.dataFim ? new Date(dados.dataFim).toISOString() : new Date(new Date(dados.dataInicio).getTime() + 60 * 60 * 1000).toISOString();
    endPayload = { dateTime: fimIso };
  }

  const payload = {
    summary: dados.titulo,
    description: dados.descricao ? `${dados.descricao}\n\n— Criado via Klaus` : "Criado via Klaus (Segundo Cérebro)",
    start: startPayload,
    end: endPayload,
  };

  const resposta = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resposta.ok) {
    const erroBody = await resposta.json().catch(() => null);
    throw new Error(erroBody?.error?.message || `Falha ao criar evento no Google Calendar (${resposta.status})`);
  }

  const res = await resposta.json();
  return res.id;
}

/**
 * Atualiza um evento existente no Google Calendar.
 */
export async function atualizarEventoGoogle(
  eventoId: string,
  dados: {
    titulo?: string;
    descricao?: string;
    dataInicio?: string;
    dataFim?: string;
    oDiaTodo?: boolean;
  }
): Promise<void> {
  const token = await obterTokenValido();

  const payload: any = {};
  if (dados.titulo) payload.summary = dados.titulo;
  if (dados.descricao !== undefined) payload.description = dados.descricao;

  if (dados.dataInicio) {
    const isDiaTodo = dados.oDiaTodo ?? (dados.dataInicio.length === 10);
    if (isDiaTodo) {
      const dataApenas = dados.dataInicio.slice(0, 10);
      payload.start = { date: dataApenas };
      const fim = dados.dataFim ? dados.dataFim.slice(0, 10) : dataApenas;
      payload.end = { date: fim };
    } else {
      payload.start = { dateTime: new Date(dados.dataInicio).toISOString() };
      if (dados.dataFim) {
        payload.end = { dateTime: new Date(dados.dataFim).toISOString() };
      }
    }
  }

  const resposta = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventoId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resposta.ok) {
    const erroBody = await resposta.json().catch(() => null);
    throw new Error(erroBody?.error?.message || `Falha ao atualizar evento no Google Calendar (${resposta.status})`);
  }
}

/**
 * Exclui um evento do Google Calendar.
 */
export async function excluirEventoGoogle(eventoId: string): Promise<void> {
  const token = await obterTokenValido();

  const resposta = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventoId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resposta.ok && resposta.status !== 404 && resposta.status !== 410) {
    const erroBody = await resposta.json().catch(() => null);
    throw new Error(erroBody?.error?.message || `Falha ao remover evento do Google Calendar (${resposta.status})`);
  }
}
