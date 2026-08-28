export type ColunasWidget = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface WidgetConfig {
  id: string;
  ativo: boolean;
  colunas: ColunasWidget; // 1 a 12 colunas na malha livre
  alturaPx: number; // Altura livre em pixels
  ordem: number;
}

export interface InfoWidgetCatalogo {
  id: string;
  titulo: string;
  resumo: string;
  categoria: "produtividade" | "conhecimento" | "ferramenta";
  icone: string;
  colunasPadrao: ColunasWidget;
  alturaPadraoPx: number;
  ferramentaPopupId?: string;
}

export const CATALOGO_WIDGETS: InfoWidgetCatalogo[] = [
  // ── Produtividade & Conhecimento ──
  {
    id: "foco_hoje",
    titulo: "Foco do Dia",
    resumo: "Tarefas e prioridades de hoje",
    categoria: "produtividade",
    icone: "CheckSquare",
    colunasPadrao: 6,
    alturaPadraoPx: 320,
  },
  {
    id: "scratchpad",
    titulo: "Rascunho Rápido",
    resumo: "Bloco de notas livre",
    categoria: "produtividade",
    icone: "Edit3",
    colunasPadrao: 6,
    alturaPadraoPx: 320,
  },
  {
    id: "notas_recentes",
    titulo: "Notas Recentes",
    resumo: "Últimos documentos editados",
    categoria: "conhecimento",
    icone: "FileText",
    colunasPadrao: 6,
    alturaPadraoPx: 320,
  },
  {
    id: "referencias_mural",
    titulo: "Mural de Referências",
    resumo: "Galeria de fotos e inspirações",
    categoria: "conhecimento",
    icone: "ImageIcon",
    colunasPadrao: 6,
    alturaPadraoPx: 320,
  },
  {
    id: "metas_pdi",
    titulo: "Metas & PDI",
    resumo: "Desenvolvimento de carreira",
    categoria: "produtividade",
    icone: "Target",
    colunasPadrao: 6,
    alturaPadraoPx: 320,
  },
  {
    id: "busca_web",
    titulo: "Busca Web",
    resumo: "Spotlight de busca na internet",
    categoria: "ferramenta",
    icone: "Globe",
    colunasPadrao: 12,
    alturaPadraoPx: 120,
  },

  // ── Ferramentas Dedicadas com Popup ──
  {
    id: "conversor_arquivos",
    titulo: "Conversor de Arquivos",
    resumo: "Converter PDF em JPEG, PNG, WebP e EPUB",
    categoria: "ferramenta",
    icone: "FileImage",
    colunasPadrao: 6,
    alturaPadraoPx: 220,
    ferramentaPopupId: "conversor",
  },
  {
    id: "ferramentas_pdf",
    titulo: "Ferramentas PDF",
    resumo: "Juntar, dividir, comprimir e recortar PDFs",
    categoria: "ferramenta",
    icone: "Scissors",
    colunasPadrao: 6,
    alturaPadraoPx: 220,
    ferramentaPopupId: "ferramentas_pdf",
  },
  {
    id: "transcritor_voz",
    titulo: "Transcritor de Voz",
    resumo: "Áudio e gravações para texto com Whisper AI",
    categoria: "ferramenta",
    icone: "Mic",
    colunasPadrao: 6,
    alturaPadraoPx: 220,
    ferramentaPopupId: "transcritor",
  },
  {
    id: "sons_foco",
    titulo: "Sons de Foco",
    resumo: "Ruídos brancos e paisagens sonoras",
    categoria: "ferramenta",
    icone: "Headphones",
    colunasPadrao: 6,
    alturaPadraoPx: 220,
    ferramentaPopupId: "sons",
  },
  {
    id: "lousas_recentes",
    titulo: "Lousas & Diagramas",
    resumo: "Quadros de desenho visual Excalidraw",
    categoria: "conhecimento",
    icone: "Layout",
    colunasPadrao: 6,
    alturaPadraoPx: 260,
    ferramentaPopupId: "lousas",
  },
  {
    id: "hardware_test",
    titulo: "Testador de Hardware",
    resumo: "Câmera, microfone, teclado e mouse",
    categoria: "ferramenta",
    icone: "Video",
    colunasPadrao: 6,
    alturaPadraoPx: 220,
    ferramentaPopupId: "testador_hardware",
  },
  {
    id: "pesquisa_livros",
    titulo: "Pesquisa de Livros",
    resumo: "Acervo de livros Gutenberg e OpenLibrary",
    categoria: "conhecimento",
    icone: "BookOpen",
    colunasPadrao: 6,
    alturaPadraoPx: 220,
    ferramentaPopupId: "pesquisa_livros",
  },
  {
    id: "grafo_neural",
    titulo: "Grafo Neural 3D",
    resumo: "Conexões neurais entre suas notas",
    categoria: "conhecimento",
    icone: "Network",
    colunasPadrao: 6,
    alturaPadraoPx: 260,
  },
  {
    id: "noticias_feed",
    titulo: "Notícias & Design",
    resumo: "Feed de novidades e inspirações RSS",
    categoria: "conhecimento",
    icone: "Newspaper",
    colunasPadrao: 6,
    alturaPadraoPx: 260,
  },
  {
    id: "calendario_home",
    titulo: "Calendário de Prazos",
    resumo: "Visão mensal de tarefas e datas",
    categoria: "produtividade",
    icone: "Calendar",
    colunasPadrao: 6,
    alturaPadraoPx: 280,
  },
  {
    id: "chat_ia",
    titulo: "Chat Gemini IA",
    resumo: "Conversa e perguntas diretas à IA",
    categoria: "ferramenta",
    icone: "MessageSquare",
    colunasPadrao: 6,
    alturaPadraoPx: 220,
    ferramentaPopupId: "chat_ia",
  },
];

export const CONFIG_PADRAO_WIDGETS: WidgetConfig[] = [
  { id: "busca_web", ativo: true, colunas: 12, alturaPx: 90, ordem: 0 },
  { id: "foco_hoje", ativo: true, colunas: 6, alturaPx: 320, ordem: 1 },
  { id: "scratchpad", ativo: true, colunas: 6, alturaPx: 320, ordem: 2 },
  { id: "notas_recentes", ativo: true, colunas: 6, alturaPx: 320, ordem: 3 },
  { id: "referencias_mural", ativo: true, colunas: 6, alturaPx: 320, ordem: 4 },
  { id: "conversor_arquivos", ativo: true, colunas: 6, alturaPx: 200, ordem: 5 },
  { id: "ferramentas_pdf", ativo: true, colunas: 6, alturaPx: 200, ordem: 6 },
];
