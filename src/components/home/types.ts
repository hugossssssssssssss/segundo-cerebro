export type LarguraWidget = 1 | 2 | 3 | 4;
export type AlturaWidget = "auto" | "compacto" | "medio" | "alto";

export interface WidgetConfig {
  id: string;
  ativo: boolean;
  colunas: LarguraWidget;
  altura?: AlturaWidget;
  ordem: number;
}

export type CategoriaWidget = "foco" | "conhecimento" | "carreira" | "ferramentas";

export interface InfoWidgetCatalogo {
  id: string;
  titulo: string;
  subtitulo: string;
  descricao: string;
  categoria: CategoriaWidget;
  icone: string;
  colunasPadrao: LarguraWidget;
  corIcone: string;
  tagDestaque?: string;
}

export const CATALOGO_WIDGETS: InfoWidgetCatalogo[] = [
  {
    id: "foco_hoje",
    titulo: "Foco do Dia & Tarefas",
    subtitulo: "Produtividade Diária",
    descricao: "Checklist com anel de progresso, prioridades e conclusão em um clique direto na Home.",
    categoria: "foco",
    icone: "CheckSquare",
    colunasPadrao: 2,
    corIcone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25",
    tagDestaque: "Essencial",
  },
  {
    id: "scratchpad",
    titulo: "Scratchpad (Rascunho Rápido)",
    subtitulo: "Captura Instantânea",
    descricao: "Bloco de notas rápido para ideias soltas, com salvamento contínuo e 1 clique para virar nota.",
    categoria: "foco",
    icone: "Edit3",
    colunasPadrao: 1,
    corIcone: "text-amber-500 bg-amber-500/10 border-amber-500/25",
  },
  {
    id: "notas_recentes",
    titulo: "Notas & Conhecimento",
    subtitulo: "Segundo Cérebro",
    descricao: "Cards elegantes com prévias dos seus documentos, tags coloridas e acesso direto ao editor.",
    categoria: "conhecimento",
    icone: "FileText",
    colunasPadrao: 2,
    corIcone: "text-blue-500 bg-blue-500/10 border-blue-500/25",
  },
  {
    id: "referencias_mural",
    titulo: "Mural de Inspirações",
    subtitulo: "Galeria Visual",
    descricao: "Mosaico fotográfico das suas referências de design, fotos e vídeos salvos.",
    categoria: "conhecimento",
    icone: "ImageIcon",
    colunasPadrao: 2,
    corIcone: "text-purple-500 bg-purple-500/10 border-purple-500/25",
  },
  {
    id: "metas_pdi",
    titulo: "Carreira & Metas (PDI)",
    subtitulo: "Desenvolvimento Individual",
    descricao: "Acompanhamento do progresso das metas profissionais com barras de avanço em tempo real.",
    categoria: "carreira",
    icone: "Target",
    colunasPadrao: 1,
    corIcone: "text-rose-500 bg-rose-500/10 border-rose-500/25",
  },
  {
    id: "hub_ferramentas",
    titulo: "Central de Ferramentas",
    subtitulo: "Atalhos Criativos",
    descricao: "Acesso rápido a Ferramentas PDF, Conversor, Transcritor, Sons de Foco e Hardware.",
    categoria: "ferramentas",
    icone: "Layers",
    colunasPadrao: 4,
    corIcone: "text-orange-500 bg-orange-500/10 border-orange-500/25",
  },
  {
    id: "processos_crm",
    titulo: "Pipelines & Processos",
    subtitulo: "CRM & Funis",
    descricao: "Visão rápida dos funis de clientes, etapas e cards ativos em andamento.",
    categoria: "carreira",
    icone: "GitMerge",
    colunasPadrao: 1,
    corIcone: "text-indigo-500 bg-indigo-500/10 border-indigo-500/25",
  },
  {
    id: "lousas_recentes",
    titulo: "Lousas & Mapas Mentais",
    subtitulo: "Excalidraw Visual",
    descricao: "Acesso rápido aos seus quadros visuais, fluxogramas e diagramas mentais.",
    categoria: "conhecimento",
    icone: "Layout",
    colunasPadrao: 1,
    corIcone: "text-cyan-500 bg-cyan-500/10 border-cyan-500/25",
  },
  {
    id: "busca_web",
    titulo: "Busca Web Inteligente",
    subtitulo: "Pesquisa Integrada",
    descricao: "Barra de busca na internet integrada para pesquisar referências sem sair do Klaus.",
    categoria: "ferramentas",
    icone: "Globe",
    colunasPadrao: 4,
    corIcone: "text-teal-500 bg-teal-500/10 border-teal-500/25",
  },
];

export const CONFIG_PADRAO_WIDGETS: WidgetConfig[] = [
  { id: "foco_hoje", ativo: true, colunas: 2, altura: "auto", ordem: 0 },
  { id: "scratchpad", ativo: true, colunas: 1, altura: "auto", ordem: 1 },
  { id: "metas_pdi", ativo: true, colunas: 1, altura: "auto", ordem: 2 },
  { id: "notas_recentes", ativo: true, colunas: 2, altura: "auto", ordem: 3 },
  { id: "referencias_mural", ativo: true, colunas: 2, altura: "auto", ordem: 4 },
  { id: "hub_ferramentas", ativo: true, colunas: 4, altura: "auto", ordem: 5 },
  { id: "processos_crm", ativo: false, colunas: 1, altura: "auto", ordem: 6 },
  { id: "lousas_recentes", ativo: false, colunas: 1, altura: "auto", ordem: 7 },
  { id: "busca_web", ativo: false, colunas: 4, altura: "auto", ordem: 8 },
];
