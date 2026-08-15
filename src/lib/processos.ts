/**
 * Manipulação de Processos e Cartões no Klaus.
 *
 * Cada Processo é um arquivo em `processos/` definindo suas etapas e regras.
 * Cada Cartão é um arquivo em `processos/cards/` registrando seu progresso,
 * checklists e comentários.
 */

import type { Frontmatter } from "./markdown";
import type { Processo, CardProcesso, EtapaProcesso, RegraAutomacao, ComentarioCard } from "./tipos";

export const MODELOS_PROCESSO_PADRAO: Array<{
  titulo: string;
  descricao: string;
  etapas: EtapaProcesso[];
  regras: RegraAutomacao[];
}> = [
  {
    titulo: "Identidade Visual & Branding",
    descricao: "Fluxo completo de criação de marca, do briefing ao handoff de arquivos.",
    etapas: [
      {
        id: "briefing",
        nome: "Briefing & Pesquisa",
        cor: "blue",
        checklistsPadrao: [
          { id: "b1", texto: "Enviar formulário de briefing ao cliente" },
          { id: "b2", texto: "Receber respostas e realizar reunião de alinhamento" },
          { id: "b3", texto: "Coletar referências e montar Moodboard" },
        ],
      },
      {
        id: "criacao",
        nome: "Conceito & Criação",
        cor: "purple",
        checklistsPadrao: [
          { id: "c1", texto: "Desenvolver 3 opções de logotipo" },
          { id: "c2", texto: "Definir paleta de cores e tipografias de apoio" },
          { id: "c3", texto: "Aplicar marca em 3 mockups de teste" },
        ],
      },
      {
        id: "aprovacao",
        nome: "Aprovação do Cliente",
        cor: "amber",
        checklistsPadrao: [
          { id: "a1", texto: "Enviar apresentação em PDF para o cliente" },
          { id: "a2", texto: "Coletar feedback ou aprovação final" },
        ],
      },
      {
        id: "entrega",
        nome: "Handoff & Entrega",
        cor: "emerald",
        checklistsPadrao: [
          { id: "e1", texto: "Exportar arquivos vetoriais (SVG, EPS, PDF)" },
          { id: "e2", texto: "Gerar versões PNG sem fundo e manual de marca" },
          { id: "e3", texto: "Receber 50% de pagamento final" },
        ],
      },
    ],
    regras: [
      {
        id: "r1",
        gatilho: "ao_mudar_etapa",
        condicao: { etapaOrigemId: "aprovacao" },
        acao: "adicionar_comentario",
        parametros: { mensagemComentario: "Projeto movido para aprovação do cliente." },
      },
    ],
  },
  {
    titulo: "Social Media & Conteúdo",
    descricao: "Gestão e aprovação de posts, carrosséis e vídeos curtos.",
    etapas: [
      {
        id: "ideacao",
        nome: "Ideação & Pauta",
        cor: "slate",
        checklistsPadrao: [
          { id: "s1", texto: "Definir tema da publicação" },
          { id: "s2", texto: "Escrever roteiro / estrutura da legenda" },
        ],
      },
      {
        id: "design",
        nome: "Design da Peça",
        cor: "indigo",
        checklistsPadrao: [
          { id: "s3", texto: "Criar arte estática ou carrossel no Photoshop/Figma" },
          { id: "s4", texto: "Revisar tamanho e proporção de tela" },
        ],
      },
      {
        id: "aprovacao_post",
        nome: "Aprovação do Cliente",
        cor: "amber",
        checklistsPadrao: [
          { id: "s5", texto: "Enviar prévia com legenda para aprovação" },
        ],
      },
      {
        id: "agendado",
        nome: "Agendado / Publicado",
        cor: "emerald",
        checklistsPadrao: [
          { id: "s6", texto: "Agendar publicação na plataforma" },
        ],
      },
    ],
    regras: [],
  },
  {
    titulo: "Funil Comercial & Orçamentos",
    descricao: "Acompanhamento de novos contatos, propostas enviadas e fecho.",
    etapas: [
      {
        id: "contato",
        nome: "Novo Contato / Lead",
        cor: "blue",
        checklistsPadrao: [
          { id: "f1", texto: "Entender demanda inicial do cliente" },
          { id: "f2", texto: "Enviar estimativa preliminar de prazo" },
        ],
      },
      {
        id: "proposta",
        nome: "Proposta Enviada",
        cor: "amber",
        checklistsPadrao: [
          { id: "f3", texto: "Montar proposta comercial personalizada em PDF" },
          { id: "f4", texto: "Gerar link direto de atendimento no WhatsApp" },
        ],
      },
      {
        id: "fechado",
        nome: "Contrato Fechado",
        cor: "emerald",
        checklistsPadrao: [
          { id: "f5", texto: "Enviar contrato assinado" },
          { id: "f6", texto: "Confirmar pagamento do sinal" },
        ],
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
  return {
    ...p.bruto,
    id: p.id,
    titulo: p.titulo,
    descricao: p.descricao,
    etapas: p.etapas,
    regras: p.regras,
    atualizadoEm: new Date().toISOString(),
  };
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
  return {
    ...c.bruto,
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
    urgente: c.urgente,
    atualizadoEm: new Date().toISOString(),
  };
}
