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

/** Converte um documento lido da pasta `processos/` em `Processo` */
export function comoProcesso(
  doc: { dados: Frontmatter; corpo: string },
  caminho: string,
  sha: string,
  tituloFallback = "Processo sem título"
): Processo {
  const d = doc.dados || {};
  const id = typeof d.id === "string" ? d.id : caminho.replace("processos/", "").replace(".md", "");
  const titulo = typeof d.titulo === "string" ? d.titulo : tituloFallback;
  const descricao = typeof d.descricao === "string" ? d.descricao : "";
  const etapas = Array.isArray(d.etapas) ? (d.etapas as EtapaProcesso[]) : [];
  const regras = Array.isArray(d.regras) ? (d.regras as RegraAutomacao[]) : [];

  return {
    caminho,
    sha,
    bruto: d,
    id,
    titulo,
    corpo: doc.corpo || "",
    descricao,
    etapas,
    regras,
    atualizadoEm: typeof d.atualizadoEm === "string" ? d.atualizadoEm : undefined,
  };
}

/** Prepara um `Processo` para ser gravado em frontmatter Markdown */
export function processoParaFrontmatter(p: Processo): Record<string, any> {
  return mesclarFrontmatter(p.bruto, {
    id: p.id,
    titulo: p.titulo,
    descricao: p.descricao,
    etapas: p.etapas,
    regras: p.regras,
    atualizadoEm: new Date().toISOString(),
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
  const id = typeof d.id === "string" ? d.id : caminho.replace("processos/cards/", "").replace(".md", "");
  const processoId = typeof d.processoId === "string" ? d.processoId : "";
  const etapaId = typeof d.etapaId === "string" ? d.etapaId : "";
  const titulo = typeof d.titulo === "string" ? d.titulo : tituloFallback;
  const cliente = typeof d.cliente === "string" ? d.cliente : undefined;
  const valor = typeof d.valor === "number" ? d.valor : undefined;
  const checklists = typeof d.checklists === "object" && d.checklists !== null ? (d.checklists as Record<string, boolean>) : {};
  const checklistsExtras = Array.isArray(d.checklistsExtras) ? (d.checklistsExtras as any[]) : [];
  const comentarios = Array.isArray(d.comentarios) ? (d.comentarios as ComentarioCard[]) : [];
  const tags = Array.isArray(d.tags) ? (d.tags as string[]) : [];
  const urgente = Boolean(d.urgente);
  const atualizadoEm = typeof d.atualizadoEm === "string" ? d.atualizadoEm : new Date().toISOString();

  return {
    caminho,
    sha,
    bruto: d,
    id,
    processoId,
    etapaId,
    titulo,
    cliente,
    valor,
    corpo: doc.corpo || "",
    checklists,
    checklistsExtras,
    comentarios,
    tags,
    urgente,
    atualizadoEm,
  };
}

/** Prepara um `CardProcesso` para ser gravado em frontmatter Markdown */
export function cardProcessoParaFrontmatter(c: CardProcesso): Record<string, any> {
  return mesclarFrontmatter(c.bruto, {
    id: c.id,
    processoId: c.processoId,
    etapaId: c.etapaId,
    titulo: c.titulo,
    cliente: c.cliente,
    valor: c.valor,
    checklists: c.checklists,
    checklistsExtras: c.checklistsExtras,
    comentarios: c.comentarios,
    tags: c.tags,
    urgente: c.urgente ? true : undefined,
    atualizadoEm: new Date().toISOString(),
  });
}
