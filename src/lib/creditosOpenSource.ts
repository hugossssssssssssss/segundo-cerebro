/**
 * Registro de Créditos e Agradecimentos Open Source.
 *
 * Mapeia as bibliotecas, motores e ferramentas de código aberto utilizadas
 * no Klaus, atribuindo os devidos créditos aos autores originais com links
 * diretos para seus repositórios no GitHub e licenças.
 */

export interface CreditoOpenSource {
  id: string;
  nome: string;
  autor: string;
  descricao: string;
  github: string;
  licenca: string;
  rotas?: string[];
}

export const TODOS_CREDITOS_OPEN_SOURCE: CreditoOpenSource[] = [
  {
    id: "termo-lingle",
    nome: "Termo & Lingle (Wordle pt-BR)",
    autor: "Fernando Serboncini & sixels",
    descricao: "Mecânica do Termo, dicionário de 5 letras em português e algoritmo determinístico de sorteio diário",
    github: "https://github.com/sixels/Lingle",
    licenca: "MIT",
    rotas: ["/jogos"],
  },
  {
    id: "cruzadinha-react",
    nome: "React Crossword & The Guardian",
    autor: "Jared Reisinger & The Guardian",
    descricao: "Engine e renderização matricial de grade de Palavras Cruzadas (Crossword)",
    github: "https://github.com/JaredReisinger/react-crossword",
    licenca: "MIT",
    rotas: ["/jogos"],
  },
  {
    id: "excalidraw",
    nome: "Excalidraw",
    autor: "Excalidraw Team",
    descricao: "Lousas virtuais, desenhos vetoriais e diagramação livre",
    github: "https://github.com/excalidraw/excalidraw",
    licenca: "MIT",
    rotas: ["/lousas"],
  },
  {
    id: "blocknote",
    nome: "BlockNote",
    autor: "TypeCell (Yousef El-Dardiry)",
    descricao: "Editor de texto em blocos moderno baseado em ProseMirror",
    github: "https://github.com/TypeCellOS/BlockNote",
    licenca: "MPL-2.0",
    rotas: ["/notas"],
  },
  {
    id: "whisper",
    nome: "Whisper (Transformers.js)",
    autor: "Xenova / Hugging Face & OpenAI",
    descricao: "Rede neural para transcrição de voz local via ONNX Runtime",
    github: "https://github.com/xenova/transformers.js",
    licenca: "Apache-2.0",
    rotas: ["/transcritor"],
  },
  {
    id: "pdf-lib",
    nome: "PDF-Lib & PDF.js",
    autor: "Andrew Dillon (Hopding) & Mozilla",
    descricao: "Manipulação, junção e renderização client-side de arquivos PDF",
    github: "https://github.com/Hopding/pdf-lib",
    licenca: "MIT / Apache-2.0",
    rotas: ["/pdf"],
  },
  {
    id: "turndown",
    nome: "Turndown & Readability",
    autor: "Dom Christie & Mozilla",
    descricao: "Conversão HTML para Markdown e extração de artigos da web",
    github: "https://github.com/mixmark-io/turndown",
    licenca: "MIT / Apache-2.0",
    rotas: ["/conversor"],
  },
  {
    id: "tesseract",
    nome: "Tesseract.js & Color Thief",
    autor: "Naptha Team & Lokesh Dhakar",
    descricao: "Reconhecimento óptico de caracteres (OCR) e extração de paleta de cores",
    github: "https://github.com/naptha/tesseract.js",
    licenca: "Apache-2.0 / MIT",
    rotas: ["/referencias"],
  },
  {
    id: "dnd-kit",
    nome: "dnd kit",
    autor: "Claudéric Demers",
    descricao: "Sistema de arrastar e soltar (Drag and Drop) para o quadro de tarefas",
    github: "https://github.com/clauderic/dnd-kit",
    licenca: "MIT",
    rotas: ["/tarefas"],
  },
  {
    id: "grafo",
    nome: "3D Force Graph & Three.js",
    autor: "Vasco Asturiano & Mr.doob",
    descricao: "Renderização do grafo neural tridimensional em WebGL",
    github: "https://github.com/vasturiano/3d-force-graph",
    licenca: "MIT",
    rotas: ["/grafo"],
  },
  {
    id: "lucide",
    nome: "Lucide Icons",
    autor: "Lucide Project",
    descricao: "Conjunto completo de ícones minimalistas e consistentes",
    github: "https://github.com/lucide-icons/lucide",
    licenca: "ISC",
  },
  {
    id: "minisearch",
    nome: "MiniSearch & cmdk",
    autor: "Luca Ongaro & Paco Coursey",
    descricao: "Motor de busca de texto completo no navegador e paleta de comandos",
    github: "https://github.com/lucaong/minisearch",
    licenca: "MIT",
  },
];

/**
 * Retorna os créditos de código aberto relevantes para a rota atual do usuário.
 */
export function obterCreditosPorRota(pathname: string): CreditoOpenSource[] {
  const rotaLimpa = pathname.replace(/^#/, "").toLowerCase();
  const especificos = TODOS_CREDITOS_OPEN_SOURCE.filter(
    (c) => c.rotas && c.rotas.some((r) => rotaLimpa.startsWith(r))
  );

  if (especificos.length > 0) {
    return especificos;
  }

  // Se não tiver um específico da rota, retorna os destaques do app
  return [
    TODOS_CREDITOS_OPEN_SOURCE.find((c) => c.id === "excalidraw")!,
    TODOS_CREDITOS_OPEN_SOURCE.find((c) => c.id === "blocknote")!,
    TODOS_CREDITOS_OPEN_SOURCE.find((c) => c.id === "whisper")!,
    TODOS_CREDITOS_OPEN_SOURCE.find((c) => c.id === "lucide")!,
  ].filter(Boolean);
}
