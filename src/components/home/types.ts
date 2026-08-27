export type ColunasWidget = 1 | 2 | 3 | 4;

export interface WidgetConfig {
  id: string;
  ativo: boolean;
  colunas: ColunasWidget;
  alturaPx: number; // Altura livre em pixels (ajustável arrastando o canto)
  ordem: number;
}

export interface InfoWidgetCatalogo {
  id: string;
  titulo: string;
  resumo: string;
  icone: string;
  colunasPadrao: ColunasWidget;
  alturaPadraoPx: number;
}

export const CATALOGO_WIDGETS: InfoWidgetCatalogo[] = [
  {
    id: "foco_hoje",
    titulo: "Foco do Dia",
    resumo: "Suas tarefas e prioridades de hoje",
    icone: "CheckSquare",
    colunasPadrao: 2,
    alturaPadraoPx: 320,
  },
  {
    id: "scratchpad",
    titulo: "Rascunho Rápido",
    resumo: "Bloco de notas livre com salvamento automático",
    icone: "Edit3",
    colunasPadrao: 2,
    alturaPadraoPx: 320,
  },
  {
    id: "notas_recentes",
    titulo: "Notas Recentes",
    resumo: "Últimos documentos criados e editados",
    icone: "FileText",
    colunasPadrao: 2,
    alturaPadraoPx: 320,
  },
  {
    id: "referencias_mural",
    titulo: "Mural de Referências",
    resumo: "Mosaico das suas inspirações e imagens",
    icone: "ImageIcon",
    colunasPadrao: 2,
    alturaPadraoPx: 320,
  },
  {
    id: "hub_ferramentas",
    titulo: "Central de Ferramentas",
    resumo: "Todas as ferramentas criativas e utilitários do app",
    icone: "Layers",
    colunasPadrao: 4,
    alturaPadraoPx: 260,
  },
  {
    id: "metas_pdi",
    titulo: "Metas & Carreira (PDI)",
    resumo: "Metas profissionais e entregas ativas",
    icone: "Target",
    colunasPadrao: 2,
    alturaPadraoPx: 320,
  },
  {
    id: "processos_crm",
    titulo: "Pipelines & Processos",
    resumo: "Funis de clientes e cards em andamento",
    icone: "GitMerge",
    colunasPadrao: 2,
    alturaPadraoPx: 320,
  },
  {
    id: "lousas_recentes",
    titulo: "Lousas & Mapas Mentais",
    resumo: "Quadros de desenho e diagramas",
    icone: "Layout",
    colunasPadrao: 2,
    alturaPadraoPx: 320,
  },
  {
    id: "busca_web",
    titulo: "Busca Web",
    resumo: "Pesquisa rápida na internet integrada",
    icone: "Globe",
    colunasPadrao: 4,
    alturaPadraoPx: 200,
  },
];

export const CONFIG_PADRAO_WIDGETS: WidgetConfig[] = [
  { id: "foco_hoje", ativo: true, colunas: 2, alturaPx: 340, ordem: 0 },
  { id: "scratchpad", ativo: true, colunas: 2, alturaPx: 340, ordem: 1 },
  { id: "notas_recentes", ativo: true, colunas: 2, alturaPx: 340, ordem: 2 },
  { id: "referencias_mural", ativo: true, colunas: 2, alturaPx: 340, ordem: 3 },
  { id: "hub_ferramentas", ativo: true, colunas: 4, alturaPx: 260, ordem: 4 },
  { id: "metas_pdi", ativo: false, colunas: 2, alturaPx: 340, ordem: 5 },
  { id: "processos_crm", ativo: false, colunas: 2, alturaPx: 340, ordem: 6 },
  { id: "lousas_recentes", ativo: false, colunas: 2, alturaPx: 340, ordem: 7 },
  { id: "busca_web", ativo: false, colunas: 4, alturaPx: 200, ordem: 8 },
];
