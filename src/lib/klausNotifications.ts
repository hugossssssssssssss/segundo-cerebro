/**
 * MÓDULO DE NOTIFICAÇÕES COLABORATIVAS DO KLAUS
 *
 * Detecta @menções em documentos Markdown e atribuições de responsabilidade
 * em tarefas/entregas no repositório de dados, gerando itens de notificação
 * em tempo real para o usuário conectado, sem necessidade de servidor backend.
 */

import type { ItemRepo } from "./repo";
import type { ItemInbox } from "./tipos";
import type { MapaEstadoInbox } from "./klausInbox";
import { lerMarkdown, tituloProvavel } from "./markdown";

/**
 * Normaliza um identificador (login ou nome) para comparação case-insensitive sem caracteres especiais.
 */
function normalizarIdentificador(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^@/, "")
    .trim();
}

/**
 * Extrai um trecho de contexto em torno de uma menção de texto.
 */
export function extrairTrechoMencao(texto: string, alvo: string, raio: number = 40): string | null {
  if (!texto || !alvo) return null;

  const alvoLimpo = normalizarIdentificador(alvo);
  if (!alvoLimpo) return null;

  // Busca menção com @ seguido do identificador
  const regex = new RegExp(`@(${alvoLimpo}[a-zA-Z0-9_-]*)`, "i");
  const match = regex.exec(texto);

  if (!match || match.index === undefined) return null;

  const inicio = Math.max(0, match.index - raio);
  const fim = Math.min(texto.length, match.index + match[0].length + raio);

  let trecho = texto.slice(inicio, fim).replace(/\s+/g, " ").trim();
  if (inicio > 0) trecho = `...${trecho}`;
  if (fim < texto.length) trecho = `${trecho}...`;

  return trecho;
}

/**
 * Verifica se um texto contém menção direta a um usuário pelo seu login ou primeiro nome.
 */
export function contemMencaoUsuario(
  texto: string,
  loginUsuario: string,
  nomeUsuario?: string,
): { encontrou: boolean; trecho?: string } {
  if (!texto) return { encontrou: false };

  const loginLimpo = normalizarIdentificador(loginUsuario);
  if (loginLimpo) {
    const trecho = extrairTrechoMencao(texto, loginLimpo);
    if (trecho) {
      return { encontrou: true, trecho };
    }
  }

  if (nomeUsuario) {
    const primeiroNome = normalizarIdentificador(nomeUsuario.split(" ")[0] || "");
    if (primeiroNome && primeiroNome.length >= 3) {
      const trecho = extrairTrechoMencao(texto, primeiroNome);
      if (trecho) {
        return { encontrou: true, trecho };
      }
    }
  }

  return { encontrou: false };
}

/**
 * Verifica se um item tem atribuição direta para o usuário no frontmatter.
 */
export function estaAtribuidoAoUsuario(
  frontmatter: Record<string, unknown>,
  loginUsuario: string,
  nomeUsuario?: string,
): boolean {
  if (!frontmatter) return false;

  const loginLimpo = normalizarIdentificador(loginUsuario);
  const nomeCompletoLimpo = nomeUsuario ? normalizarIdentificador(nomeUsuario) : "";
  const primeiroNome = nomeUsuario ? normalizarIdentificador(nomeUsuario.split(" ")[0] || "") : "";

  const candidatos: string[] = [];

  if (Array.isArray(frontmatter.responsaveis)) {
    frontmatter.responsaveis.forEach((r) => {
      if (typeof r === "string") candidatos.push(normalizarIdentificador(r));
    });
  }

  if (typeof frontmatter.responsavel === "string") {
    candidatos.push(normalizarIdentificador(frontmatter.responsavel));
  }

  if (Array.isArray(frontmatter.participantes)) {
    frontmatter.participantes.forEach((p) => {
      if (typeof p === "string") candidatos.push(normalizarIdentificador(p));
    });
  }

  return candidatos.some((c) => {
    if (!c) return false;
    if (loginLimpo && c === loginLimpo) return true;
    if (nomeCompletoLimpo && c === nomeCompletoLimpo) return true;
    if (primeiroNome && primeiroNome.length >= 3 && (c === primeiroNome || c.startsWith(primeiroNome))) return true;
    return false;
  });
}

/**
 * Compila todas as notificações colaborativas (menções e atribuições) de equipe.
 */
export function compilarNotificacoesColaborativas(
  itensRepo: ItemRepo[],
  loginUsuario: string,
  nomeUsuario?: string,
  mapaEstado: MapaEstadoInbox = {},
): ItemInbox[] {
  if (!loginUsuario && !nomeUsuario) return [];

  const loginNorm = normalizarIdentificador(loginUsuario || "");
  const notificacoes: ItemInbox[] = [];

  for (const item of itensRepo) {
    if (!item.texto) continue;

    // Ignora arquivos do sistema, lixeira e configurações internas
    if (
      item.caminho.startsWith(".lixeira/") ||
      item.caminho.startsWith("lixeira/") ||
      item.caminho.includes("/lixeira/") ||
      item.caminho.startsWith(".github/") ||
      item.caminho.startsWith(".klaus/") ||
      item.caminho.startsWith("caixa-entrada/")
    ) {
      continue;
    }

    const doc = lerMarkdown(item.texto);
    if (doc.dados?.apagado_em || doc.dados?.caminho_origem) {
      continue;
    }

    const autor =
      (doc.dados?.atualizadoPor as string) ||
      (doc.dados?.atualizado_por as string) ||
      (doc.dados?.criadoPor as string) ||
      (doc.dados?.criado_por as string) ||
      "";

    const autorNorm = normalizarIdentificador(autor);
    const ehProprioAutor = Boolean(loginNorm && autorNorm && autorNorm === loginNorm);

    const tituloDoc = tituloProvavel(doc, item.nome);
    const dataRef =
      (doc.dados?.atualizadoEm as string) ||
      (doc.dados?.atualizado_em as string) ||
      (doc.dados?.criadoEm as string) ||
      (doc.dados?.prazo as string) ||
      new Date().toISOString().slice(0, 10);

    // 1. Detecção de Atribuição (em tarefas ou PDI)
    if (estaAtribuidoAoUsuario(doc.dados, loginUsuario, nomeUsuario)) {
      const idAtribuicao = `atribuicao-${item.caminho.replace(/[^a-z0-9_-]/gi, "-")}-${loginNorm}`;
      const estado = mapaEstado[idAtribuicao];

      // Só notifica se a tarefa não estiver concluída e não tiver sido descartada
      const statusTarefa = doc.dados?.status;
      if (statusTarefa !== "feito" && !estado?.descartado) {
        notificacoes.push({
          id: idAtribuicao,
          tipo: "atribuicao",
          titulo: `Atribuído a você: ${tituloDoc}`,
          descricao: autor
            ? `Item atribuído por ${autor}`
            : "Você foi definido como responsável por este item na equipe.",
          caminhoOrigem: item.caminho,
          tituloOrigem: tituloDoc,
          dataVencimento: (doc.dados?.prazo as string) || dataRef,
          dataInicioIso: (doc.dados?.prazo as string) || dataRef,
          visto: Boolean(estado?.visto),
          vistoEm: estado?.vistoEm,
          autor: autor || undefined,
          responsaveis: Array.isArray(doc.dados?.responsaveis)
            ? (doc.dados.responsaveis as string[])
            : typeof doc.dados?.responsavel === "string"
            ? [doc.dados.responsavel]
            : undefined,
          tags: Array.isArray(doc.dados?.tags) ? (doc.dados.tags as string[]) : [],
        });
      }
    }

    // 2. Detecção de @Menções no corpo de texto (ignora se o autor do texto for o próprio usuário)
    if (!ehProprioAutor) {
      const mencao = contemMencaoUsuario(doc.corpo, loginUsuario, nomeUsuario);
      if (mencao.encontrou) {
        const idMencao = `mencao-${item.caminho.replace(/[^a-z0-9_-]/gi, "-")}-${loginNorm}`;
        const estado = mapaEstado[idMencao];

        if (!estado?.descartado) {
          notificacoes.push({
            id: idMencao,
            tipo: "mencao",
            titulo: `Você foi mencionado em: ${tituloDoc}`,
            descricao: mencao.trecho || "Você recebeu uma menção neste documento.",
            caminhoOrigem: item.caminho,
            tituloOrigem: tituloDoc,
            dataVencimento: dataRef,
            dataInicioIso: dataRef,
            visto: Boolean(estado?.visto),
            vistoEm: estado?.vistoEm,
            autor: autor || undefined,
            trecho: mencao.trecho,
            tags: Array.isArray(doc.dados?.tags) ? (doc.dados.tags as string[]) : [],
          });
        }
      }
    }
  }

  return notificacoes;
}
