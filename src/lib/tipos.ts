/**
 * CONTRATOS DO APP — comece aqui antes de qualquer mudança.
 *
 * Este arquivo é a "lei" do Klaus. Toda entidade do app tem um
 * tipo aqui; o TypeScript recusa código que viole esses contratos. Para
 * adicionar um campo a uma entidade, adicione aqui primeiro — as funções
 * de conversão em `entidades.ts` vão reclamar se ficarem fora de sincronia.
 *
 * Regras inegociáveis (gravadas como código, não só como comentário):
 * - `bruto` nunca é descartado: é o frontmatter original, preserva campos
 *    que o app não conhece. Ver `mesclarFrontmatter` em markdown.ts.
 * - `sha` é o SHA real devolvido pelo GitHub após gravar, nunca inventado.
 * - Nenhum dado vai para o arquivo sem passar por `paraArquivo()`.
 * - Token do GitHub e chave Gemini só existem via `lerConfig()` — nunca
 *    hardcoded, nunca em outro lugar.
 */

import type { Frontmatter } from "./markdown";

/* ============================================================== PASTAS */

/**
 * As pastas do repositório de dados — use estas constantes, nunca strings
 * literais. Mudar o nome de uma pasta aqui força o TypeScript a mostrar
 * todos os lugares que precisam de atualização.
 */
export const PASTAS = {
  notas:     "notas",
  tarefas:   "tarefas",
  metas:     "pdi/metas",
  entregas:  "pdi/entregas",
  referencias: "referencias",
  lousas:    "lousas",
  caixaEntrada: "caixa-entrada",
  contatos:  "contatos",
  jogos:     "jogos",
} as const;

export type Pasta = (typeof PASTAS)[keyof typeof PASTAS];

/* ============================================================ ENTIDADES */

/**
 * Campos que TODA entidade tem.
 *
 * `caminho` identifica o arquivo no repositório: "notas/2026-08-15-titulo.md".
 * `sha` é o SHA do git — muda a cada gravação. Sem ele não dá para salvar.
 * `bruto` é o frontmatter inteiro como veio do arquivo — campos que o app
 *   não conhece ficam aqui e voltam para o arquivo no próximo save.
 */
export interface ItemBase {
  readonly caminho: string;
  readonly sha: string;
  readonly bruto: Frontmatter;
  readonly id?: string;
  titulo: string;
  corpo: string;
  criadoEm?: string;
  atualizadoEm?: string;
  relacionamentos?: string[];
}

/** Uma nota ou rascunho em `notas/`. */
export interface Nota extends ItemBase {
  tipo: "nota" | "referencia" | "rascunho";
  subtipo?: "nota" | "reuniao" | "briefing" | "rascunho";
  tags: string[];
  fixado?: boolean;
  atualizado?: string;
  dataReuniao?: string;
  participantes?: string[];
}

/** Os três estados possíveis de uma tarefa. */
export const STATUS_TAREFA = ["a-fazer", "fazendo", "feito"] as const;
export type StatusTarefa = (typeof STATUS_TAREFA)[number];
export const ROTULO_STATUS_TAREFA: Record<StatusTarefa, string> = {
  "a-fazer": "A fazer",
  fazendo:   "Fazendo",
  feito:     "Feito",
};

/** Uma tarefa em `tarefas/`. */
export interface Tarefa extends ItemBase {
  status: StatusTarefa;
  prazo?: string;
  tags: string[];
  prioridade?: "baixa" | "media" | "alta" | "urgente";
  pomodorosEstimados?: number;
  pomodorosRealizados?: number;
  pomodoro?: number;
  Pomodoro?: number;
  fraturados?: number;
}

/** Os três estados de uma meta de PDI. */
export const STATUS_META = ["a-fazer", "em-andamento", "concluida"] as const;
export type StatusMeta = (typeof STATUS_META)[number];
export const ROTULO_STATUS_META: Record<StatusMeta, string> = {
  "a-fazer":     "A começar",
  "em-andamento": "Em andamento",
  concluida:     "Concluída",
};

/** Uma meta do PDI em `pdi/metas/`. */
export interface Meta extends ItemBase {
  /** Nome do arquivo sem .md — é a chave usada pelas entregas para referenciar. */
  readonly id: string;
  status: StatusMeta;
  prazo?: string;
  /** Como você vai saber que chegou lá. */
  indicador: string;
  tags?: string[];
}

/** Uma entrega do PDI em `pdi/entregas/`. */
export interface Entrega extends ItemBase {
  readonly id: string;
  /** Data AAAA-MM-DD da entrega. */
  data: string;
  /** IDs das metas que esta entrega alimenta (nome do arquivo sem .md). */
  metas: string[];
  /** true quando a ligação foi sugerida pela IA e ainda não conferida pelo Hugo. */
  iaSugeriu: boolean;
  /** Impacto ou resultado alcançado (mensurável ou qualitativo). */
  impacto?: string;
  /** Elogio ou feedback recebido relacionado a esta entrega. */
  elogio?: string;
  /** Autor do elogio ou contato vinculado (nome ou id do contato). */
  autorElogio?: string;
  /** Áreas, equipes ou colegas envolvidos na colaboração. */
  colaboracao?: string[];
  /** Habilidades ou aprendizados demonstrados (tags). */
  tags?: string[];
}

/** Opções padrão para o campo de colaboração / equipe. */
export const OPCOES_COLABORACAO_PADRAO = [
  "Design",
  "Produto",
  "Engenharia",
  "Marketing",
  "Liderança",
  "Mentoria",
  "Operações",
  "Diretoria",
] as const;


/** Uma referência visual em `referencias/`. */
export interface Referencia extends ItemBase {
  readonly id: string;
  /** Caminho da imagem dentro do repositório, se houver. */
  imagem?: string;
  /** URL de origem, se veio da web. */
  fonte?: string;
  tags: string[];
  /** Por que você salvou isto — o campo mais importante. */
  porque: string;
}

/** Uma lousa Excalidraw em `lousas/`. O corpo é o JSON do Excalidraw. */
export interface Lousa {
  readonly caminho: string;
  readonly sha: string;
  titulo: string;
  tituloOriginal: string;
  /** O JSON do Excalidraw, parseado. */
  dados: LousaDados;
}

export interface LousaDados {
  title?: string;
  elements?: unknown[];
  appState?: unknown;
  files?: unknown;
}

export type TipoItemInbox = "lembrete" | "tarefa_atrasada" | "nota_inativa";

export interface Lembrete {
  id: string;
  titulo: string;
  caminhoOrigem: string;
  tituloOrigem: string;
  dataHora: string;
  canais?: ("inbox" | "telegram" | "email")[];
  recorrencia?: "unico" | "diario" | "semanal" | "mensal";
  concluido?: boolean;
}

export interface ItemInbox {
  id: string;
  tipo: TipoItemInbox;
  titulo: string;
  descricao?: string;
  caminhoOrigem: string;
  tituloOrigem: string;
  dataVencimento: string;
  visto: boolean;
  vistoEm?: string;
  notificadoTelegram?: boolean;
  notificadoEmail?: boolean;
  lembreteBruto?: string;
  tags?: string[];
}

/** Um contato ou pessoa vinculada em `contatos/`. */
export interface Contato extends ItemBase {
  readonly id: string;
  cargo?: string;
  empresa?: string;
  email?: string;
  telefone?: string;
  paiId?: string;
  tags: string[];
  propriedades: Record<string, string>;
  atualizado?: string;
}

/* ========================================================= MAPEAMENTOS */

/**
 * Tipos de item que o app conhece (usado pela busca e pela navegação).
 * Atenção: "reuniao" vai para a pasta `notas/` com tipo no frontmatter.
 */
export type TipoItem =
  | "tarefa"
  | "nota"
  | "referencia"
  | "lousa"
  | "meta"
  | "entrega"
  | "reuniao"
  | "contato"
  | "outro";

/** Para onde navegar ao clicar em cada tipo de item na busca. */
export const ROTA_POR_TIPO: Record<TipoItem, string> = {
  tarefa:    "/tarefas",
  nota:      "/notas",
  referencia: "/referencias",
  lousa:     "/lousas",
  meta:      "/pdi",
  entrega:   "/pdi",
  reuniao:   "/notas",
  contato:   "/contatos",
  outro:     "/notas",
};

/** Rótulo legível por humano para cada tipo. */
export const ROTULO_TIPO: Record<TipoItem, string> = {
  tarefa:    "Tarefa",
  nota:      "Nota",
  referencia: "Pinterest / Referência",
  lousa:     "Excalidraw / Mapa Mental",
  meta:      "Meta",
  entrega:   "Entrega",
  reuniao:   "Reunião",
  contato:   "Contato / Árvore",
  outro:     "Outro",
};
