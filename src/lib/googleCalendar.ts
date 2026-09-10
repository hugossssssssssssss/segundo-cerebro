/**
 * Integração com Google Calendar via Google Identity Services (OAuth 2.0)
 * e Google Calendar API v3 — 100% Client-Side no navegador (Zero Backend).
 * Suporte a múltiplas agendas ("Outras Agendas") e sincronização bidirecional de cores.
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

export interface AgendaGoogle {
  id: string;
  nome: string;
  descricao?: string;
  principal: boolean;
  selecionada: boolean;
  corFundo?: string; // Hex do Google Calendar, ex: "#039be5"
  corTexto?: string;
  corId?: string;
  somenteLeitura: boolean;
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
  agendaId?: string;
  agendaNome?: string;
  agendaCor?: string;
}

const CHAVE_TOKEN = "klaus:gcal:access_token";
const CHAVE_EXPIRA = "klaus:gcal:expires_at";

/**
 * Paleta oficial de cores de eventos do Google Calendar API v3 (1 a 11)
 */
export const PALETA_CORES_GOOGLE: Record<
  string,
  { nome: string; hex: string; bg: string; text: string; border: string; dot: string }
> = {
  "1": { nome: "Lavanda", hex: "#7986cb", bg: "bg-[#7986cb]/15", text: "text-[#3949ab] dark:text-[#9fa8da]", border: "border-[#7986cb]/30", dot: "bg-[#7986cb]" },
  "2": { nome: "Sálvia", hex: "#33b679", bg: "bg-[#33b679]/15", text: "text-[#2e7d32] dark:text-[#81c784]", border: "border-[#33b679]/30", dot: "bg-[#33b679]" },
  "3": { nome: "Uva", hex: "#8e24aa", bg: "bg-[#8e24aa]/15", text: "text-[#6a1b9a] dark:text-[#ba68c8]", border: "border-[#8e24aa]/30", dot: "bg-[#8e24aa]" },
  "4": { nome: "Flamingo", hex: "#e67c73", bg: "bg-[#e67c73]/15", text: "text-[#c2185b] dark:text-[#f48fb1]", border: "border-[#e67c73]/30", dot: "bg-[#e67c73]" },
  "5": { nome: "Banana", hex: "#f6bf26", bg: "bg-[#f6bf26]/15", text: "text-[#f57f17] dark:text-[#fff176]", border: "border-[#f6bf26]/30", dot: "bg-[#f6bf26]" },
  "6": { nome: "Tangerina", hex: "#f4511e", bg: "bg-[#f4511e]/15", text: "text-[#d84315] dark:text-[#ff8a65]", border: "border-[#f4511e]/30", dot: "bg-[#f4511e]" },
  "7": { nome: "Pavão", hex: "#039be5", bg: "bg-[#039be5]/15", text: "text-[#0277bd] dark:text-[#4fc3f7]", border: "border-[#039be5]/30", dot: "bg-[#039be5]" },
  "8": { nome: "Grafite", hex: "#616161", bg: "bg-[#616161]/15", text: "text-[#424242] dark:text-[#bdbdbd]", border: "border-[#616161]/30", dot: "bg-[#616161]" },
  "9": { nome: "Mirtilo", hex: "#3f51b5", bg: "bg-[#3f51b5]/15", text: "text-[#283593] dark:text-[#7986cb]", border: "border-[#3f51b5]/30", dot: "bg-[#3f51b5]" },
  "10": { nome: "Manjericão", hex: "#0b8043", bg: "bg-[#0b8043]/15", text: "text-[#1b5e20] dark:text-[#66bb6a]", border: "border-[#0b8043]/30", dot: "bg-[#0b8043]" },
  "11": { nome: "Tomate", hex: "#d50000", bg: "bg-[#d50000]/15", text: "text-[#b71c1c] dark:text-[#ef9a9a]", border: "border-[#d50000]/30", dot: "bg-[#d50000]" },
};

/**
 * Mapeia uma cor do Klaus / Notion (azul, verde, amarelo, vermelho, etc.) para o colorId mais próximo do Google Calendar (1 a 11).
 */
export function mapearCorNotionParaGoogleColorId(corNomeOuTag?: string): string | undefined {
  if (!corNomeOuTag) return undefined;
  const c = corNomeOuTag.toLowerCase().trim();

  const mapa: Record<string, string> = {
    vermelho: "11", // Tomate
    rose: "11",
    red: "11",
    verde: "10",   // Manjericão
    emerald: "10",
    green: "10",
    azul: "9",      // Mirtilo
    blue: "9",
    amarelo: "5",   // Banana
    amber: "5",
    yellow: "5",
    laranja: "6",   // Tangerina
    orange: "6",
    roxo: "3",      // Uva
    purple: "3",
    rosa: "4",      // Flamingo
    pink: "4",
    cinza: "8",     // Grafite
    gray: "8",
    grey: "8",
  };

  return mapa[c];
}

/**
 * Obtém os estilos visuais de um evento do Google para o Klaus.
 * Prioriza corId individual do evento; se não houver, usa a cor de fundo da agenda correspondente.
 */
export function obterEstiloEventoGoogle(ev: EventoGoogle): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  corHex: string;
} {
  if (ev.corId && PALETA_CORES_GOOGLE[ev.corId]) {
    const estilo = PALETA_CORES_GOOGLE[ev.corId];
    return {
      bg: estilo.bg,
      text: estilo.text,
      border: estilo.border,
      dot: estilo.dot,
      corHex: estilo.hex,
    };
  }

  const corHex = ev.agendaCor || "#3b82f6";

  return {
    bg: "bg-primary/15",
    text: "text-foreground",
    border: "border-border/60",
    dot: "bg-primary",
    corHex,
  };
}

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
        scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
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
 * Tenta obter o token do Google silenciosamente se ainda estiver válido no storage (sem popup intrusivo).
 */
export async function autenticarOuRenovarSilencioso(_clientId?: string): Promise<string | null> {
  const tokenSalvo = obterTokenGoogleSalvo();
  if (tokenSalvo) return tokenSalvo;
  return null;
}

/**
 * Garante que temos um token válido antes de chamar a API (somente em ações explícitas do usuário).
 */
async function obterTokenValido(): Promise<string> {
  const tokenSalvo = obterTokenGoogleSalvo();
  if (tokenSalvo) return tokenSalvo;
  return solicitarAutorizacaoGoogle();
}

/**
 * Extrai o intervalo de início e término de um EventoGoogle, detectando se cobre múltiplos dias.
 */
export function extrairIntervaloEventoGoogle(ev: EventoGoogle): {
  inicio: Date;
  fim: Date;
  ehIntervalo: boolean;
  textoFormatado?: string;
} | null {
  if (!ev.inicio) return null;

  let dataInicio: Date;
  let dataFim: Date;

  if (ev.oDiaTodo) {
    // Formato "2026-09-08"
    const partes = ev.inicio.slice(0, 10).split("-").map(Number);
    dataInicio = new Date(partes[0], partes[1] - 1, partes[2], 0, 0, 0);

    if (ev.fim && ev.fim !== ev.inicio) {
      const partesFim = ev.fim.slice(0, 10).split("-").map(Number);
      const fimBruto = new Date(partesFim[0], partesFim[1] - 1, partesFim[2], 0, 0, 0);
      // No Google Calendar, a data 'end' de evento de dia todo é exclusiva (dia seguinte).
      // Se fimBruto for até 1 dia depois de dataInicio, o evento durou apenas 1 dia.
      if (fimBruto.getTime() > dataInicio.getTime() + 24 * 3600 * 1000) {
        // Múltiplos dias: o último dia inclusivo é fimBruto - 1 dia
        dataFim = new Date(fimBruto.getTime() - 24 * 3600 * 1000);
      } else {
        dataFim = dataInicio;
      }
    } else {
      dataFim = dataInicio;
    }
  } else {
    dataInicio = new Date(ev.inicio);
    dataFim = ev.fim ? new Date(ev.fim) : dataInicio;
  }

  if (isNaN(dataInicio.getTime())) return null;
  if (isNaN(dataFim.getTime()) || dataFim < dataInicio) dataFim = dataInicio;

  const inicioDia = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
  const fimDia = new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate());
  const ehIntervalo = inicioDia.getTime() !== fimDia.getTime();

  const textoFormatado = ehIntervalo
    ? `${dataInicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} → ${dataFim.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
    : undefined;

  return {
    inicio: inicioDia,
    fim: fimDia,
    ehIntervalo,
    textoFormatado,
  };
}

/**
 * Lista todas as agendas que o usuário tem acesso no Google Calendar (primária, secundárias e compartilhadas).
 */
export async function listarAgendasGoogle(tokenParam?: string): Promise<AgendaGoogle[]> {
  const token = tokenParam || (await obterTokenValido());

  try {
    let proximaPagina: string | undefined = undefined;
    const todosItens: any[] = [];

    do {
      const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
      url.searchParams.set("showHidden", "true");
      url.searchParams.set("maxResults", "250");
      if (proximaPagina) {
        url.searchParams.set("pageToken", proximaPagina);
      }

      const resposta = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (resposta.status === 401 || resposta.status === 403) {
        limparTokenGoogle();
        throw new Error("Permissão ou sessão do Google expirada. Por favor, conecte novamente em Ajustes.");
      }

      if (!resposta.ok) {
        break;
      }

      const dados = await resposta.json();
      if (Array.isArray(dados.items)) {
        todosItens.push(...dados.items);
      }
      proximaPagina = dados.nextPageToken;
    } while (proximaPagina);

    if (todosItens.length === 0) {
      return [
        {
          id: "primary",
          nome: "Minha Agenda",
          principal: true,
          selecionada: true,
          corFundo: "#039be5",
          corTexto: "#ffffff",
          somenteLeitura: false,
        },
      ];
    }

    return todosItens.map((item: any): AgendaGoogle => ({
      id: item.id,
      nome: item.summaryOverride || item.summary || (item.primary ? "Minha Agenda" : item.id),
      descricao: item.description,
      principal: Boolean(item.primary),
      // No Klaus, todas as agendas encontradas ficam ativas por padrão para que o usuário veja tudo
      selecionada: true,
      corFundo: item.backgroundColor || (item.primary ? "#039be5" : "#7986cb"),
      corTexto: item.foregroundColor || "#ffffff",
      corId: item.colorId,
      somenteLeitura: item.accessRole === "reader" || item.accessRole === "freeBusyReader",
    }));
  } catch (err) {
    console.warn("Aviso ao carregar calendarList do Google:", err);
    return [
      {
        id: "primary",
        nome: "Minha Agenda",
        principal: true,
        selecionada: true,
        corFundo: "#039be5",
        corTexto: "#ffffff",
        somenteLeitura: false,
      },
    ];
  }
}

/**
 * Busca eventos de uma agenda específica.
 */
async function buscarEventosDeAgenda(
  calendarId: string,
  inicio: Date,
  fim: Date,
  token: string,
  agendaInfo?: { nome: string; corFundo?: string }
): Promise<EventoGoogle[]> {
  try {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
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

    if (!resposta.ok) return [];

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
        agendaId: calendarId,
        agendaNome: agendaInfo?.nome || (calendarId === "primary" ? "Minha Agenda" : undefined),
        agendaCor: agendaInfo?.corFundo,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Busca eventos do Google Calendar silenciosamente se houver token ativo ou renovação silenciosa disponível.
 * Itera por todas as agendas disponíveis/selecionadas.
 */
export async function buscarEventosGoogleSilencioso(
  inicio: Date,
  fim: Date,
  agendasAlvo?: AgendaGoogle[]
): Promise<{ eventos: EventoGoogle[]; agendas: AgendaGoogle[] }> {
  let token = obterTokenGoogleSalvo();
  if (!token) {
    token = await autenticarOuRenovarSilencioso();
  }
  if (!token) return { eventos: [], agendas: [] };

  try {
    const agendas = agendasAlvo && agendasAlvo.length > 0 ? agendasAlvo : await listarAgendasGoogle(token);
    const promessas = agendas
      .filter((ag) => ag.selecionada !== false)
      .map((ag) => buscarEventosDeAgenda(ag.id, inicio, fim, token, { nome: ag.nome, corFundo: ag.corFundo }));

    const resultados = await Promise.allSettled(promessas);
    const todosEventos: EventoGoogle[] = [];

    for (const res of resultados) {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        todosEventos.push(...res.value);
      }
    }

    todosEventos.sort((a, b) => (a.inicio || "").localeCompare(b.inicio || ""));
    return { eventos: todosEventos, agendas };
  } catch {
    return { eventos: [], agendas: [] };
  }
}

/**
 * Lista eventos de todas as agendas do Google Calendar dentro de uma faixa de datas (autentica se necessário).
 */
export async function listarEventosGoogle(
  inicio: Date,
  fim: Date,
  agendasAlvo?: AgendaGoogle[]
): Promise<{ eventos: EventoGoogle[]; agendas: AgendaGoogle[] }> {
  const token = await obterTokenValido();
  const agendas = agendasAlvo && agendasAlvo.length > 0 ? agendasAlvo : await listarAgendasGoogle(token);

  const promessas = agendas
    .filter((ag) => ag.selecionada !== false)
    .map((ag) => buscarEventosDeAgenda(ag.id, inicio, fim, token, { nome: ag.nome, corFundo: ag.corFundo }));

  const resultados = await Promise.allSettled(promessas);
  const todosEventos: EventoGoogle[] = [];

  for (const res of resultados) {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      todosEventos.push(...res.value);
    }
  }

  todosEventos.sort((a, b) => (a.inicio || "").localeCompare(b.inicio || ""));
  return { eventos: todosEventos, agendas };
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
  corId?: string;
  agendaId?: string;
}): Promise<string> {
  const token = await obterTokenValido();
  const calendarId = dados.agendaId || "primary";

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

  const payload: any = {
    summary: dados.titulo,
    description: dados.descricao ? `${dados.descricao}\n\n— Criado via Klaus` : "Criado via Klaus (Segundo Cérebro)",
    start: startPayload,
    end: endPayload,
  };

  if (dados.corId) {
    payload.colorId = dados.corId;
  }

  const resposta = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
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
    corId?: string;
    agendaId?: string;
  }
): Promise<void> {
  const token = await obterTokenValido();
  const calendarId = dados.agendaId || "primary";

  const payload: any = {};
  if (dados.titulo) payload.summary = dados.titulo;
  if (dados.descricao !== undefined) payload.description = dados.descricao;
  if (dados.corId !== undefined) payload.colorId = dados.corId;

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

  const resposta = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventoId)}`, {
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
export async function excluirEventoGoogle(eventoId: string, agendaId = "primary"): Promise<void> {
  const token = await obterTokenValido();

  const resposta = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(agendaId)}/events/${encodeURIComponent(eventoId)}`, {
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

