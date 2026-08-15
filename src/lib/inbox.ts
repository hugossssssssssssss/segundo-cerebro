/**
 * LÓGICA E SERVIÇOS DA CAIXA DE ENTRADA E LEMBRETES DO KLAUS
 *
 * Responsável por:
 * 1. Extrair lembretes padronizados [⏰ Lembrete: titulo | YYYY-MM-DD HH:mm] de qualquer documento
 * 2. Identificar tarefas atrasadas
 * 3. Gerenciar o estado de visualização (visto, descartado) com persistência no GitHub/localStorage
 * 4. Disparar notificações via Telegram Bot API e Google Apps Script (E-mail)
 */

import type { ItemRepo } from "./repo";
import type { ItemInbox, Lembrete } from "./tipos";
import type { Settings } from "./settings";
import { lerMarkdown, tituloProvavel } from "./markdown";
import { ler, gravar } from "./github";

export const CAMINHO_ESTADO_INBOX = "caixa-entrada/estado.json";
const CHAVE_LOCAL_INBOX = "segundo-cerebro:inbox-estado";

export interface EstadoItemInbox {
  visto: boolean;
  vistoEm?: string;
  descartado?: boolean;
  notificadoTelegram?: boolean;
  notificadoEmail?: boolean;
}

export type MapaEstadoInbox = Record<string, EstadoItemInbox>;

/**
 * Formata um lembrete como a tag padronizada inserida no documento.
 * Exemplo: [⏰ Lembrete: Comprar materiais | 2026-08-18 15:00]
 */
export function formatarTagLembrete(titulo: string, dataHora: string): string {
  const limpo = titulo.replace(/[|[\]]/g, "").trim();
  return `[⏰ Lembrete: ${limpo} | ${dataHora.trim()}]`;
}

/**
 * Expressão regular para encontrar lembretes em documentos.
 * Aceita:
 * - `[⏰ Lembrete: Título | 2026-08-18 15:00]`
 * - `[⏰ Lembrete: Título | 2026-08-18]`
 * - `@lembrete 2026-08-18 Título`
 */
const RE_LEMBRETE_TAG = /\[⏰\s*Lembrete:\s*([^|]+)\|\s*([\d\s\-\:T]+)\]/gi;
const RE_LEMBRETE_AT = /(?:@lembrete|@me\s+lembre)\s+([\d\-\:T]+)\s+([^\n]+)/gi;

/**
 * Extrai todos os lembretes contidos no texto de um documento.
 */
export function extrairLembretesDeTexto(
  texto: string,
  caminhoDoc: string,
  tituloDoc: string,
): Lembrete[] {
  if (!texto) return [];

  const lembretes: Lembrete[] = [];
  const vistos = new Set<string>();

  // Parse formato 1: [⏰ Lembrete: Titulo | Data]
  for (const match of texto.matchAll(RE_LEMBRETE_TAG)) {
    const titulo = match[1]?.trim();
    const dataHora = match[2]?.trim();
    if (!titulo || !dataHora) continue;

    const id = `lembrete-${caminhoDoc}-${titulo}-${dataHora}`.toLowerCase().replace(/[^a-z0-9]/g, "-");
    if (vistos.has(id)) continue;
    vistos.add(id);

    lembretes.push({
      id,
      titulo,
      caminhoOrigem: caminhoDoc,
      tituloOrigem: tituloDoc,
      dataHora,
    });
  }

  // Parse formato 2: @lembrete 2026-08-18 Titulo
  for (const match of texto.matchAll(RE_LEMBRETE_AT)) {
    const dataHora = match[1]?.trim();
    const titulo = match[2]?.trim();
    if (!titulo || !dataHora) continue;

    const id = `lembrete-${caminhoDoc}-${titulo}-${dataHora}`.toLowerCase().replace(/[^a-z0-9]/g, "-");
    if (vistos.has(id)) continue;
    vistos.add(id);

    lembretes.push({
      id,
      titulo,
      caminhoOrigem: caminhoDoc,
      tituloOrigem: tituloDoc,
      dataHora,
    });
  }

  return lembretes;
}

/**
 * Varre todo o acervo do repositório para extrair lembretes e tarefas atrasadas.
 */
export function compilarItensInbox(
  itensRepo: ItemRepo[],
  mapaEstado: MapaEstadoInbox = {},
  agora: Date = new Date(),
): ItemInbox[] {
  const resultado: ItemInbox[] = [];

  const hojeIso = agora.toISOString().slice(0, 10);

  for (const item of itensRepo) {
    if (!item.texto) continue;
    const doc = lerMarkdown(item.texto);
    const tituloDoc = tituloProvavel(doc, item.nome);

    // 1. Tarefas Atrasadas (em tarefas/)
    if (item.caminho.startsWith("tarefas/")) {
      const status = doc.dados.status;
      const prazo = doc.dados.prazo;

      if (status !== "feito" && prazo && String(prazo) < hojeIso) {
        const id = `tarefa-atrasada-${item.caminho}`;
        const estado = mapaEstado[id];

        if (!estado?.descartado) {
          resultado.push({
            id,
            tipo: "tarefa_atrasada",
            titulo: `Tarefa Atrasada: ${tituloDoc}`,
            descricao: `Prazo venceu em ${prazo}. Status atual: ${status || "A fazer"}.`,
            caminhoOrigem: item.caminho,
            tituloOrigem: tituloDoc,
            dataVencimento: String(prazo),
            visto: Boolean(estado?.visto),
            vistoEm: estado?.vistoEm,
            notificadoTelegram: estado?.notificadoTelegram,
            notificadoEmail: estado?.notificadoEmail,
          });
        }
      }
    }

    // 2. Lembretes inline no texto do documento
    const lembretes = extrairLembretesDeTexto(item.texto, item.caminho, tituloDoc);
    for (const lembrete of lembretes) {
      const id = lembrete.id;
      const estado = mapaEstado[id];

      // O lembrete entra na inbox se a dataHora já chegou/passou ou é do dia
      const dataIso = lembrete.dataHora.slice(0, 10);
      const venceu = dataIso <= hojeIso;

      if (venceu && !estado?.descartado) {
        resultado.push({
          id,
          tipo: "lembrete",
          titulo: lembrete.titulo,
          descricao: `Lembrete agendado para ${lembrete.dataHora} em "${tituloDoc}".`,
          caminhoOrigem: lembrete.caminhoOrigem,
          tituloOrigem: lembrete.tituloOrigem,
          dataVencimento: lembrete.dataHora,
          visto: Boolean(estado?.visto),
          vistoEm: estado?.vistoEm,
          notificadoTelegram: estado?.notificadoTelegram,
          notificadoEmail: estado?.notificadoEmail,
          lembreteBruto: formatarTagLembrete(lembrete.titulo, lembrete.dataHora),
        });
      }
    }
  }

  // Ordenar por data de vencimento (os mais recentes/urgentes primeiro)
  return resultado.sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento));
}

/**
 * Lê o mapa de estado da Inbox do localStorage.
 */
export function lerEstadoInboxLocal(): MapaEstadoInbox {
  try {
    const salvo = localStorage.getItem(CHAVE_LOCAL_INBOX);
    return salvo ? JSON.parse(salvo) : {};
  } catch {
    return {};
  }
}

/**
 * Salva o mapa de estado da Inbox no localStorage.
 */
export function salvarEstadoInboxLocal(mapa: MapaEstadoInbox): void {
  try {
    localStorage.setItem(CHAVE_LOCAL_INBOX, JSON.stringify(mapa));
  } catch {
    // ignora erro de quota
  }
}

/**
 * Carrega o estado da Inbox sincronizado do repositório GitHub (com fallback pro local).
 */
export async function carregarEstadoInbox(cfg: Settings): Promise<{ mapa: MapaEstadoInbox; sha?: string }> {
  const local = lerEstadoInboxLocal();
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { mapa: local };
  }

  try {
    const res = await ler(cfg, CAMINHO_ESTADO_INBOX);
    if (res?.texto) {
      const remoto: MapaEstadoInbox = JSON.parse(res.texto);
      const mesclado = { ...local, ...remoto };
      salvarEstadoInboxLocal(mesclado);
      return { mapa: mesclado, sha: res.sha };
    }
  } catch {
    // Arquivo ainda não existe no repo
  }

  return { mapa: local };
}

/**
 * Grava o estado atualizado da Inbox no repositório GitHub.
 */
export async function gravarEstadoInbox(
  cfg: Settings,
  mapa: MapaEstadoInbox,
  shaAntigo?: string,
): Promise<string | null> {
  salvarEstadoInboxLocal(mapa);
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) return null;

  try {
    const conteudo = JSON.stringify(mapa, null, 2);
    const novoSha = await gravar(cfg, CAMINHO_ESTADO_INBOX, conteudo, shaAntigo, "atualizar estado da caixa de entrada");
    return novoSha;
  } catch {
    return null;
  }
}

/**
 * Envia notificação para o Telegram via Telegram Bot API.
 */
export async function enviarNotificacaoTelegram(
  botToken: string,
  chatId: string,
  mensagem: string,
): Promise<boolean> {
  if (!botToken || !chatId) return false;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: mensagem,
        parse_mode: "Markdown",
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Envia notificação de e-mail via Webhook / Google Apps Script.
 */
export async function enviarNotificacaoEmailGoogle(
  scriptUrl: string,
  assunto: string,
  mensagem: string,
): Promise<boolean> {
  if (!scriptUrl) return false;

  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assunto,
        mensagem,
        app: "Klaus - Segundo Cérebro",
        data: new Date().toISOString(),
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Verifica se um item não visto excedeu X horas e precisa de notificação push no Telegram.
 */
export function precisaEscalationInatividade(
  item: ItemInbox,
  horasEscala: number = 3,
  agora: Date = new Date(),
): boolean {
  if (item.visto || item.notificadoTelegram) return false;

  const dataVenc = new Date(item.dataVencimento);
  if (isNaN(dataVenc.getTime())) return false;

  const limiteMs = horasEscala * 60 * 60 * 1000;
  const diferencaMs = agora.getTime() - dataVenc.getTime();

  return diferencaMs >= limiteMs;
}
