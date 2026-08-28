/**
 * Manipulação de Processos e Cartões no Klaus.
 *
 * Cada Processo é um arquivo em `processos/` definindo suas etapas e regras.
 * Cada Cartão é um arquivo em `processos/cards/` registrando seu progresso,
 * checklists e comentários.
 */

import { mesclarFrontmatter, type Frontmatter } from "./markdown";
import type { Processo, CardProcesso, EtapaProcesso, RegraAutomacao, ComentarioCard } from "./tipos";

export const MODELOS_PROCESSO_PADRAO: Array<{
  titulo: string;
  descricao: string;
  etapas: EtapaProcesso[];
  regras: RegraAutomacao[];
}> = [
  {
    titulo: "Kanban Geral",
    descricao: "Fluxo simples de 3 colunas para qualquer tipo de tarefa ou processo.",
    etapas: [
      {
        id: "a_fazer",
        nome: "A Fazer",
        cor: "blue",
        checklistsPadrao: [
          { id: "k1", texto: "Revisar requisitos e detalhes do cartão" },
        ],
      },
      {
        id: "em_andamento",
        nome: "Em Andamento",
        cor: "amber",
        checklistsPadrao: [
          { id: "k2", texto: "Executar etapas principais" },
        ],
      },
      {
        id: "concluido",
        nome: "Concluído",
        cor: "emerald",
        checklistsPadrao: [
          { id: "k3", texto: "Validar e finalizar item" },
        ],
      },
    ],
    regras: [],
  },
  {
    titulo: "Pipeline de Atendimento & Vendas",
    descricao: "Gestão de contatos, propostas e negociações.",
    etapas: [
      {
        id: "novo_contato",
        nome: "Novo Contato",
        cor: "blue",
        checklistsPadrao: [
          { id: "v1", texto: "Entender necessidade inicial" },
        ],
      },
      {
        id: "em_negociacao",
        nome: "Em Negociação",
        cor: "amber",
        checklistsPadrao: [
          { id: "v2", texto: "Enviar proposta comercial" },
          { id: "v3", texto: "Acompanhar retorno" },
        ],
      },
      {
        id: "fechado",
        nome: "Fechado / Ganho",
        cor: "emerald",
        checklistsPadrao: [
          { id: "v4", texto: "Confirmar contratação ou pagamento" },
        ],
      },
    ],
    regras: [],
  },
  {
    titulo: "Processo em 3 Fases",
    descricao: "Modelo flexível para triagem, execução e entrega.",
    etapas: [
      {
        id: "fase1",
        nome: "Triagem",
        cor: "slate",
        checklistsPadrao: [{ id: "p1", texto: "Coletar informações iniciais" }],
      },
      {
        id: "fase2",
        nome: "Em Processamento",
        cor: "purple",
        checklistsPadrao: [{ id: "p2", texto: "Executar processo principal" }],
      },
      {
        id: "fase3",
        nome: "Finalizado",
        cor: "emerald",
        checklistsPadrao: [{ id: "p3", texto: "Arquivar cartão" }],
      },
    ],
    regras: [],
  },
];

function sanitizarEtapas(raw: unknown): EtapaProcesso[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, any> => typeof e === "object" && e !== null)
    .map((e, idx) => {
      const id = typeof e.id === "string" && e.id.trim() ? e.id.trim() : `etapa_${idx + 1}`;
      const nome = typeof e.nome === "string" && e.nome.trim() ? e.nome.trim() : `Etapa ${idx + 1}`;
      const corValida = ["blue", "emerald", "amber", "purple", "rose", "indigo", "slate"].includes(e.cor)
        ? e.cor
        : "blue";
      const checklistsPadrao = Array.isArray(e.checklistsPadrao)
        ? e.checklistsPadrao
            .filter((c: any) => c !== null && c !== undefined && c !== "")
            .map((c: any, cIdx: number) => {
              if (typeof c === "object") {
                return {
                  id: typeof c.id === "string" ? c.id : `chk_${cIdx + 1}`,
                  texto: typeof c.texto === "string" ? c.texto : String(c),
                };
              }
              return {
                id: `chk_${cIdx + 1}`,
                texto: String(c),
              };
            })
        : [];
      return { id, nome, cor: corValida, checklistsPadrao };
    });
}

function sanitizarRegras(raw: unknown): RegraAutomacao[] {
  if (!Array.isArray(raw)) return [];
  const gatilhosValidos = ["ao_concluir_checklist", "ao_mudar_etapa", "ao_criar_card", "tempo_parado"] as const;
  const acoesValidas = ["mudar_etapa", "adicionar_checklist", "marcar_urgente", "adicionar_comentario"] as const;

  return raw
    .filter((r): r is Record<string, any> => typeof r === "object" && r !== null)
    .map((r, idx) => {
      const gatilho = typeof r.gatilho === "string" && (gatilhosValidos as readonly string[]).includes(r.gatilho)
        ? (r.gatilho as RegraAutomacao["gatilho"])
        : "ao_concluir_checklist";
      const acao = typeof r.acao === "string" && (acoesValidas as readonly string[]).includes(r.acao)
        ? (r.acao as RegraAutomacao["acao"])
        : "mudar_etapa";

      return {
        id: typeof r.id === "string" && r.id.trim() ? r.id.trim() : `regra_${idx + 1}`,
        gatilho,
        condicao: typeof r.condicao === "object" && r.condicao !== null ? r.condicao : {},
        acao,
        parametros: typeof r.parametros === "object" && r.parametros !== null ? r.parametros : {},
      };
    });
}

function sanitizarChecklistsExtras(raw: unknown): Array<{ id: string; texto: string; concluido: boolean }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Record<string, any> => typeof c === "object" && c !== null)
    .map((c, idx) => ({
      id: typeof c.id === "string" && c.id.trim() ? c.id.trim() : `extra_${idx + 1}`,
      texto: typeof c.texto === "string" ? c.texto : "",
      concluido: Boolean(c.concluido),
    }))
    .filter((c) => c.texto.trim().length > 0);
}

/**
 * Extrai comentários formatados no corpo Markdown se o usuário preferir escrever no texto:
 * Formato 1: - **2026-08-28 10:00 (Hugo)**: mensagem
 * Formato 2: > **Hugo** (2026-08-28): mensagem
 */
export function extrairComentariosDoCorpo(corpo: string): ComentarioCard[] {
  if (!corpo) return [];
  const comentarios: ComentarioCard[] = [];
  const linhas = corpo.split("\n");

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i].trim();
    // Padrão: - **YYYY-MM-DD HH:mm (Autor)**: Texto
    const m1 = l.match(/^[-*]\s+\*\*([\d\s\-\:T]+)\s*\(([^)]+)\)\*\*:\s*(.+)$/i);
    if (m1) {
      comentarios.push({
        id: `c_corpo_${i + 1}`,
        data: m1[1].trim(),
        autor: m1[2].trim(),
        texto: m1[3].trim(),
      });
      continue;
    }
    // Padrão: > **Autor** (YYYY-MM-DD HH:mm): Texto
    const m2 = l.match(/^>\s+\*\*([^*]+)\*\*\s*\(([\d\s\-\:T]+)\):\s*(.+)$/i);
    if (m2) {
      comentarios.push({
        id: `c_corpo_${i + 1}`,
        data: m2[2].trim(),
        autor: m2[1].trim(),
        texto: m2[3].trim(),
      });
    }
  }

  return comentarios;
}

function sanitizarComentarios(raw: unknown, corpo = ""): ComentarioCard[] {
  const doFrontmatter: ComentarioCard[] = [];
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (typeof c === "object" && c !== null) {
        doFrontmatter.push({
          id: typeof c.id === "string" && c.id.trim() ? c.id.trim() : `comentario_${i + 1}`,
          data: typeof c.data === "string" && c.data.trim() ? c.data.trim() : new Date().toISOString(),
          autor: typeof c.autor === "string" && c.autor.trim() ? c.autor.trim() : "Usuário",
          texto: typeof c.texto === "string" ? c.texto : "",
        });
      }
    }
  }

  const doCorpo = extrairComentariosDoCorpo(corpo);
  if (doFrontmatter.length === 0) return doCorpo;

  // Unifica preservando os do frontmatter e complementando com os do corpo que não existam
  const textosExistentes = new Set(doFrontmatter.map((c) => c.texto.trim()));
  for (const c of doCorpo) {
    if (!textosExistentes.has(c.texto.trim())) {
      doFrontmatter.push(c);
      textosExistentes.add(c.texto.trim());
    }
  }

  return doFrontmatter;
}

/** Converte um documento lido da pasta `processos/` em `Processo` */
export function comoProcesso(
  doc: { dados: Frontmatter; corpo: string },
  caminho: string,
  sha: string,
  tituloFallback = "Processo sem título"
): Processo {
  const d = doc.dados || {};
  const id = typeof d.id === "string" && d.id.trim() ? d.id.trim() : caminho.replace("processos/", "").replace(".md", "");
  const titulo = typeof d.titulo === "string" && d.titulo.trim() ? d.titulo.trim() : tituloFallback;
  const descricao = typeof d.descricao === "string" ? d.descricao : "";
  const etapas = sanitizarEtapas(d.etapas);
  const regras = sanitizarRegras(d.regras);
  const criadoEm = typeof d.criado_em === "string" ? d.criado_em : typeof d.criado === "string" ? d.criado : undefined;
  const atualizadoEm =
    typeof d.atualizado_em === "string"
      ? d.atualizado_em
      : typeof d.atualizadoEm === "string"
      ? d.atualizadoEm
      : typeof d.atualizado === "string"
      ? d.atualizado
      : undefined;

  return {
    caminho,
    sha,
    bruto: d,
    id,
    tipo: "processo",
    titulo,
    corpo: doc.corpo || "",
    descricao,
    etapas,
    regras,
    criadoEm,
    atualizadoEm,
  };
}

/** Prepara um `Processo` para ser gravado em frontmatter Markdown */
export function processoParaFrontmatter(p: Processo): Record<string, any> {
  const agora = new Date().toISOString();
  const criadoEm = p.criadoEm || p.bruto.criado_em || p.bruto.criado || agora;
  return mesclarFrontmatter(p.bruto, {
    id:            p.id,
    tipo:          "processo",
    titulo:        p.titulo,
    descricao:     p.descricao,
    etapas:        p.etapas.length ? p.etapas : undefined,
    regras:        p.regras.length ? p.regras : undefined,
    criado_em:     criadoEm,
    atualizado_em: agora,
    // Limpeza de campos legados
    atualizadoEm:  undefined,
    atualizado:    undefined,
    criado:        undefined,
  });
}

/** Converte um documento lido da pasta `processos/cards/` em `CardProcesso` */
export function comoCardProcesso(
  doc: { dados: Frontmatter; corpo: string },
  caminho: string,
  sha: string,
  tituloFallback = "Cartão sem título"
): CardProcesso {
  const d = doc.dados || {};
  const id = typeof d.id === "string" && d.id.trim() ? d.id.trim() : caminho.replace("processos/cards/", "").replace(".md", "");
  const processoId =
    typeof d.processo_id === "string" && d.processo_id.trim()
      ? d.processo_id.trim()
      : typeof d.processoId === "string"
      ? d.processoId.trim()
      : "";
  const etapaId =
    typeof d.etapa_id === "string" && d.etapa_id.trim()
      ? d.etapa_id.trim()
      : typeof d.etapaId === "string"
      ? d.etapaId.trim()
      : "";
  const titulo = typeof d.titulo === "string" && d.titulo.trim() ? d.titulo.trim() : tituloFallback;
  const cliente = typeof d.cliente === "string" && d.cliente.trim() ? d.cliente.trim() : undefined;
  const empresa = typeof d.empresa === "string" && d.empresa.trim() ? d.empresa.trim() : undefined;
  const email = typeof d.email === "string" && d.email.trim() ? d.email.trim() : undefined;
  const telefone = typeof d.telefone === "string" && d.telefone.trim() ? d.telefone.trim() : undefined;
  const valor = typeof d.valor === "number" && !isNaN(d.valor) ? d.valor : undefined;
  const prazo = typeof d.prazo === "string" && d.prazo.trim() ? d.prazo.trim() : undefined;
  const prioridade = typeof d.prioridade === "string" && ["baixa", "media", "alta", "urgente"].includes(d.prioridade) ? (d.prioridade as CardProcesso["prioridade"]) : undefined;
  
  const checklists: Record<string, boolean> = {};
  if (typeof d.checklists === "object" && d.checklists !== null) {
    for (const [k, v] of Object.entries(d.checklists)) {
      checklists[k] = Boolean(v);
    }
  }

  const checklistsExtras = sanitizarChecklistsExtras(d.checklists_extras || d.checklistsExtras);
  const comentarios = sanitizarComentarios(d.comentarios, doc.corpo || "");
  const tags = Array.isArray(d.tags) ? d.tags.map(String).filter((t) => t.trim().length > 0) : [];
  const urgente = Boolean(d.urgente) || prioridade === "urgente";
  const criadoEm = typeof d.criado_em === "string" ? d.criado_em : typeof d.criado === "string" ? d.criado : undefined;
  const atualizadoEm =
    typeof d.atualizado_em === "string"
      ? d.atualizado_em
      : typeof d.atualizadoEm === "string"
      ? d.atualizadoEm
      : typeof d.atualizado === "string"
      ? d.atualizado
      : new Date().toISOString();

  return {
    caminho,
    sha,
    bruto: d,
    id,
    tipo: "card_processo",
    processoId,
    etapaId,
    titulo,
    cliente,
    empresa,
    email,
    telefone,
    valor,
    prazo,
    prioridade,
    corpo: doc.corpo || "",
    checklists,
    checklistsExtras,
    comentarios,
    tags,
    urgente,
    criadoEm,
    atualizadoEm,
  };
}

/** Prepara um `CardProcesso` para ser gravado em frontmatter Markdown */
export function cardProcessoParaFrontmatter(c: CardProcesso): Record<string, any> {
  const agora = new Date().toISOString();
  const criadoEm = c.criadoEm || c.bruto.criado_em || c.bruto.criado || agora;
  return mesclarFrontmatter(c.bruto, {
    id:                c.id,
    tipo:              "card_processo",
    processo_id:       c.processoId,
    etapa_id:          c.etapaId,
    titulo:            c.titulo,
    cliente:           c.cliente,
    empresa:           c.empresa,
    email:             c.email,
    telefone:          c.telefone,
    valor:             c.valor,
    prazo:             c.prazo,
    prioridade:        c.prioridade,
    checklists:        Object.keys(c.checklists).length ? c.checklists : undefined,
    checklists_extras: c.checklistsExtras && c.checklistsExtras.length ? c.checklistsExtras : undefined,
    comentarios:       c.comentarios && c.comentarios.length ? c.comentarios : undefined,
    tags:              c.tags.length ? c.tags : undefined,
    urgente:           c.urgente ? true : undefined,
    criado_em:         criadoEm,
    atualizado_em:     agora,
    // Limpeza de campos legados
    processoId:        undefined,
    etapaId:           undefined,
    checklistsExtras:  undefined,
    atualizadoEm:      undefined,
    atualizado:        undefined,
    criado:            undefined,
  });
}

/**
 * Reordena ou move um cartão de processo para uma nova etapa e/ou nova posição na lista.
 * Protege contra posições fora dos limites da lista (índice negativo ou maior que o tamanho).
 */
export function moverCardProcesso<T extends CardProcesso>(
  lista: T[],
  cardId: string,
  novaEtapaId: string,
  novoIndice: number
): T[] {
  const card = lista.find((c) => c.id === cardId);
  if (!card) return lista;

  const semCard = lista.filter((c) => c.id !== cardId);
  const cardAtualizado = { ...card, etapaId: novaEtapaId, atualizadoEm: new Date().toISOString() };

  const cartoesDaEtapa = semCard.filter((c) => c.etapaId === novaEtapaId);
  const indiceClamped = Math.max(0, Math.min(novoIndice, cartoesDaEtapa.length));

  const resultado: T[] = [];
  let inserido = false;
  let contagemNaEtapa = 0;

  for (const c of semCard) {
    if (c.etapaId === novaEtapaId) {
      if (contagemNaEtapa === indiceClamped) {
        resultado.push(cardAtualizado as T);
        inserido = true;
      }
      resultado.push(c);
      contagemNaEtapa++;
    } else {
      resultado.push(c);
    }
  }

  if (!inserido) {
    resultado.push(cardAtualizado as T);
  }

  return resultado;
}
