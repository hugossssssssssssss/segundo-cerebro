export type TamanhoWidget = "compacto" | "medio" | "largo" | "destaque";

export interface WidgetConfig {
  id: string;
  ativo: boolean;
  tamanho: TamanhoWidget;
  ordem: number;
}

export type CategoriaWidget = "foco" | "conhecimento" | "carreira" | "ferramentas";

export interface InfoWidgetCatalogo {
  id: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaWidget;
  icone: any;
  tamanhoPadrao: TamanhoWidget;
  tamanhosPermitidos: TamanhoWidget[];
  corIcone: string;
}

export const CATALOGO_WIDGETS: InfoWidgetCatalogo[] = [
  {
    id: "foco_hoje",
    titulo: "Foco do Dia & Tarefas",
    descricao: "Checklist interativa das tarefas prioritárias de hoje com conclusão instantânea",
    categoria: "foco",
    icone: "CheckSquare",
    tamanhoPadrao: "medio",
    tamanhosPermitidos: ["compacto", "medio", "destaque"],
    corIcone: "text-emerald-500 bg-emerald-500/10",
  },
  {
    id: "scratchpad",
    titulo: "Scratchpad (Rascunho Rápido)",
    descricao: "Bloco de anotações instantâneo para capturar pensamentos e transformar em nota",
    categoria: "foco",
    icone: "Edit3",
    tamanhoPadrao: "compacto",
    tamanhosPermitidos: ["compacto", "medio"],
    corIcone: "text-amber-500 bg-amber-500/10",
  },
  {
    id: "notas_recentes",
    titulo: "Notas & Conhecimento Recente",
    descricao: "Últimos documentos criados e editados no seu segundo cérebro",
    categoria: "conhecimento",
    icone: "FileText",
    tamanhoPadrao: "medio",
    tamanhosPermitidos: ["compacto", "medio", "largo"],
    corIcone: "text-blue-500 bg-blue-500/10",
  },
  {
    id: "referencias_mural",
    titulo: "Mural de Inspirações & Mídia",
    descricao: "Mosaico visual com as referências visuais e imagens salvas",
    categoria: "conhecimento",
    icone: "ImageIcon",
    tamanhoPadrao: "medio",
    tamanhosPermitidos: ["compacto", "medio", "largo"],
    corIcone: "text-purple-500 bg-purple-500/10",
  },
  {
    id: "metas_pdi",
    titulo: "Carreira & Metas (PDI)",
    descricao: "Acompanhamento do progresso das metas profissionais e entregas ativas",
    categoria: "carreira",
    icone: "Target",
    tamanhoPadrao: "compacto",
    tamanhosPermitidos: ["compacto", "medio"],
    corIcone: "text-rose-500 bg-rose-500/10",
  },
  {
    id: "processos_crm",
    titulo: "Processos & Pipelines (CRM)",
    descricao: "Visão rápida dos funis de clientes, etapas e cards ativos",
    categoria: "carreira",
    icone: "GitMerge",
    tamanhoPadrao: "compacto",
    tamanhosPermitidos: ["compacto", "medio", "largo"],
    corIcone: "text-indigo-500 bg-indigo-500/10",
  },
  {
    id: "lousas_recentes",
    titulo: "Lousas & Mapas Mentais",
    descricao: "Quadros de desenho visual e diagramas criados no Excalidraw",
    categoria: "conhecimento",
    icone: "Layout",
    tamanhoPadrao: "compacto",
    tamanhosPermitidos: ["compacto", "medio"],
    corIcone: "text-cyan-500 bg-cyan-500/10",
  },
  {
    id: "hub_ferramentas",
    titulo: "Central de Ferramentas",
    descricao: "Atalhos rápidos para PDF, Conversor, Áudio, Transcritor e Hardware",
    categoria: "ferramentas",
    icone: "Layers",
    tamanhoPadrao: "largo",
    tamanhosPermitidos: ["medio", "largo", "destaque"],
    corIcone: "text-orange-500 bg-orange-500/10",
  },
  {
    id: "busca_web",
    titulo: "Busca Web Inteligente",
    descricao: "Barra de busca web rápida integrada ao seu fluxo de trabalho",
    categoria: "ferramentas",
    icone: "Globe",
    tamanhoPadrao: "largo",
    tamanhosPermitidos: ["medio", "largo"],
    corIcone: "text-teal-500 bg-teal-500/10",
  },
];

export const CONFIG_PADRAO_WIDGETS: WidgetConfig[] = [
  { id: "foco_hoje", ativo: true, tamanho: "medio", ordem: 0 },
  { id: "scratchpad", ativo: true, tamanho: "compacto", ordem: 1 },
  { id: "metas_pdi", ativo: true, tamanho: "compacto", ordem: 2 },
  { id: "notas_recentes", ativo: true, tamanho: "medio", ordem: 3 },
  { id: "referencias_mural", ativo: true, tamanho: "medio", ordem: 4 },
  { id: "hub_ferramentas", ativo: true, tamanho: "largo", ordem: 5 },
  { id: "processos_crm", ativo: true, tamanho: "compacto", ordem: 6 },
  { id: "lousas_recentes", ativo: false, tamanho: "compacto", ordem: 7 },
  { id: "busca_web", ativo: false, tamanho: "largo", ordem: 8 },
];
