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
 * Adia uma data/hora de lembrete com base na opção selecionada (Snooze).
 */
export function adiarDataHora(
  dataHoraBase: string,
  opcao: "1h" | "amanha" | "3dias" | "proxima_segunda",
  agora: Date = new Date(),
): string {
  let baseDate = new Date(dataHoraBase);
  if (isNaN(baseDate.getTime())) {
    baseDate = new Date(agora);
  }

  if (opcao === "1h") {
    baseDate.setHours(baseDate.getHours() + 1);
  } else if (opcao === "amanha") {
    baseDate.setDate(baseDate.getDate() + 1);
    baseDate.setHours(9, 0, 0, 0);
  } else if (opcao === "3dias") {
    baseDate.setDate(baseDate.getDate() + 3);
    baseDate.setHours(9, 0, 0, 0);
  } else if (opcao === "proxima_segunda") {
    const diaDaSemana = baseDate.getDay();
    const diasAteSegunda = (8 - diaDaSemana) % 7 || 7;
    baseDate.setDate(baseDate.getDate() + diasAteSegunda);
    baseDate.setHours(9, 0, 0, 0);
  }

  const yyyy = baseDate.getFullYear();
  const mm = String(baseDate.getMonth() + 1).padStart(2, "0");
  const dd = String(baseDate.getDate()).padStart(2, "0");
  const hh = String(baseDate.getHours()).padStart(2, "0");
  const min = String(baseDate.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Identifica notas paradas/inativas no repositório há mais de X dias (Ideia 10).
 */
export function compilarNotasInativas(
  itensRepo: ItemRepo[],
  mapaEstado: MapaEstadoInbox = {},
  agora: Date = new Date(),
  diasLimite = 30,
): ItemInbox[] {
  const resultado: ItemInbox[] = [];
  const limiteMs = diasLimite * 24 * 60 * 60 * 1000;

  for (const item of itensRepo) {
    if (!item.caminho.startsWith("notas/")) continue;
    const doc = lerMarkdown(item.texto);
    const atualizadoEm = (doc.dados.atualizado as string) || (doc.dados.criado as string);

    let dataNota: Date | null = null;
    if (atualizadoEm) {
      dataNota = new Date(atualizadoEm);
    } else {
      const matchData = item.nome.match(/^(\d{4}-\d{2}-\d{2})/);
      if (matchData) dataNota = new Date(matchData[1]);
    }

    if (dataNota && !isNaN(dataNota.getTime())) {
      const diffMs = agora.getTime() - dataNota.getTime();
      if (diffMs >= limiteMs) {
        const id = `nota-inativa-${item.caminho}`;
        const estado = mapaEstado[id];
        if (!estado?.descartado) {
          const tituloDoc = tituloProvavel(doc, item.nome);
          const diasInativo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const tags = Array.isArray(doc.dados.tags) ? (doc.dados.tags as string[]) : [];
          resultado.push({
            id,
            tipo: "nota_inativa",
            titulo: `Nota inativa: ${tituloDoc}`,
            descricao: `Esta nota não é alterada há ${diasInativo} dias. Deseja revisar ou arquivar?`,
            caminhoOrigem: item.caminho,
            tituloOrigem: tituloDoc,
            dataVencimento: dataNota.toISOString().slice(0, 10),
            visto: Boolean(estado?.visto),
            vistoEm: estado?.vistoEm,
            tags,
          });
        }
      }
    }
  }

  return resultado;
}

/**
 * Varre todo o acervo do repositório para extrair lembretes, tarefas atrasadas e notas inativas.
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
    const tagsDoc = Array.isArray(doc.dados.tags) ? (doc.dados.tags as string[]) : [];

    // 1. Tarefas com Prazo/Data (em tarefas/)
    if (item.caminho.startsWith("tarefas/")) {
      const status = doc.dados.status;
      const prazo = doc.dados.prazo;

      if (status !== "feito" && prazo) {
        const prazoStr = String(prazo).trim();
        if (prazoStr) {
          const id = `tarefa-atrasada-${item.caminho}`;
          const estado = mapaEstado[id];

          if (!estado?.descartado) {
            const ehAtrasada = prazoStr < hojeIso;
            const ehHoje = prazoStr === hojeIso;
            const tituloPrefixo = ehAtrasada
              ? "Tarefa Atrasada"
              : ehHoje
              ? "Tarefa para Hoje"
              : "Tarefa Agendada";

            const descricao = ehAtrasada
              ? `Prazo venceu em ${prazoStr}. Status atual: ${status || "A fazer"}.`
              : ehHoje
              ? `Prazo vence HOJE (${prazoStr}). Status atual: ${status || "A fazer"}.`
              : `Prazo agendado para ${prazoStr}. Status atual: ${status || "A fazer"}.`;

            resultado.push({
              id,
              tipo: "tarefa_atrasada",
              titulo: `${tituloPrefixo}: ${tituloDoc}`,
              descricao,
              caminhoOrigem: item.caminho,
              tituloOrigem: tituloDoc,
              dataVencimento: prazoStr,
              visto: Boolean(estado?.visto),
              vistoEm: estado?.vistoEm,
              notificadoTelegram: estado?.notificadoTelegram,
              notificadoEmail: estado?.notificadoEmail,
              tags: tagsDoc,
            });
          }
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
          tags: tagsDoc,
        });
      }
    }
  }

  /*
   * 3. Notas inativas — DESLIGADO por padrão, de propósito.
   *
   * Num segundo cérebro, a maioria esmagadora das notas é para ficar parada.
   * Uma referência de tipografia salva em fevereiro não precisa ser "revisada"
   * em março. Com 200 notas, esta regra enchia a caixa de entrada com ~150
   * alertas falsos no dia 31 — e uma caixa que sempre tem 150 itens é uma
   * caixa que ninguém abre. Isso matava junto os lembretes de verdade, que são
   * a razão desta tela existir.
   *
   * A função continua exportada e testada. Quando houver uma tela de "revisão
   * semanal" — onde uma sugestão gentil faz sentido — é lá que ela entra, e
   * não aqui, misturada com prazos vencidos.
   */

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

export interface ResultadoGravarEstadoInbox {
  ok: boolean;
  sha?: string;
  erro?: string;
}

/**
 * Grava o estado atualizado da Inbox no repositório GitHub.
 */
export async function gravarEstadoInbox(
  cfg: Settings,
  mapa: MapaEstadoInbox,
  shaAntigo?: string,
): Promise<ResultadoGravarEstadoInbox> {
  salvarEstadoInboxLocal(mapa);
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { ok: false, erro: "Configuração do GitHub incompleta." };
  }

  try {
    const conteudo = JSON.stringify(mapa, null, 2);
    const novoSha = await gravar(cfg, CAMINHO_ESTADO_INBOX, conteudo, shaAntigo, "atualizar estado da caixa de entrada");
    return { ok: true, sha: novoSha };
  } catch (err: any) {
    return { ok: false, erro: err?.message || "Falha ao gravar estado no GitHub." };
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
  if (item.visto || item.notificadoTelegram || item.notificadoEmail) return false;

  const dataVenc = new Date(item.dataVencimento);
  if (isNaN(dataVenc.getTime())) return false;

  const limiteMs = horasEscala * 60 * 60 * 1000;
  const diferencaMs = agora.getTime() - dataVenc.getTime();

  return diferencaMs >= limiteMs;
}
