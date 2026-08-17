import {
  FileImage,
  FileText,
  FileType,
  Mic,
  CheckSquare,
  Target,
  Image as ImageIcon,
  Layout,
  MessageCircle,
  Settings,
  GitMerge,
  FolderTree,
} from "lucide-react";
import type { ComponentType } from "react";

export interface FerramentaApp {
  id: string;
  titulo: string;
  descricao: string;
  categoria: "conversor" | "ferramenta" | "modulo";
  rota: string;
  icone: ComponentType<{ size?: number; className?: string }>;
  palavrasChave: string[];
}

export const LISTA_FERRAMENTAS_APP: FerramentaApp[] = [
  // --- CONVERSÕES ---
  {
    id: "pdf_para_png",
    titulo: "PDF para PNG",
    descricao: "Extrai e converte cada página de um PDF em imagens PNG de alta resolução",
    categoria: "conversor",
    rota: "/conversor?ferramenta=pdf_para_png",
    icone: FileImage,
    palavrasChave: ["pdf", "png", "imagem", "extrair", "páginas", "converter"],
  },
  {
    id: "pdf_para_jpg",
    titulo: "PDF para JPG",
    descricao: "Converte páginas de PDF em arquivos de imagem JPG compactos",
    categoria: "conversor",
    rota: "/conversor?ferramenta=pdf_para_jpg",
    icone: FileImage,
    palavrasChave: ["pdf", "jpg", "jpeg", "imagem", "converter"],
  },
  {
    id: "img_para_pdf",
    titulo: "Imagens para PDF",
    descricao: "Junta uma ou mais imagens (PNG, JPG, WebP) em um único documento PDF",
    categoria: "conversor",
    rota: "/conversor?ferramenta=img_para_pdf",
    icone: FileText,
    palavrasChave: ["imagem", "pdf", "juntar", "compilar", "gerar pdf"],
  },
  {
    id: "img_para_webp",
    titulo: "Converter para WebP",
    descricao: "Otimize suas imagens para WebP com tamanho reduzido e alta qualidade",
    categoria: "conversor",
    rota: "/conversor?ferramenta=img_para_webp",
    icone: ImageIcon,
    palavrasChave: ["webp", "imagem", "otimizar", "comprimir", "converter"],
  },
  {
    id: "img_para_png",
    titulo: "Converter para PNG",
    descricao: "Transforme imagens JPG, WebP ou GIF em formato PNG transparente",
    categoria: "conversor",
    rota: "/conversor?ferramenta=img_para_png",
    icone: ImageIcon,
    palavrasChave: ["png", "imagem", "converter"],
  },
  {
    id: "img_para_jpg",
    titulo: "Converter para JPG",
    descricao: "Transforme imagens PNG ou WebP em formato JPG",
    categoria: "conversor",
    rota: "/conversor?ferramenta=img_para_jpg",
    icone: ImageIcon,
    palavrasChave: ["jpg", "jpeg", "imagem", "converter"],
  },
  {
    id: "texto_para_md",
    titulo: "Texto/HTML/JSON para Markdown",
    descricao: "Converte textos colados, arquivos TXT, HTML, JSON ou CSV em notas Markdown",
    categoria: "conversor",
    rota: "/conversor?ferramenta=texto_para_md",
    icone: FileType,
    palavrasChave: ["texto", "html", "json", "csv", "markdown", "md", "converter", "nota"],
  },

  // --- MÓDULOS E FERRAMENTAS DO KLAUS ---
  {
    id: "transcritor",
    titulo: "Transcritor de Áudio",
    descricao: "Grave voz ou envie arquivos de áudio para transcrição e resumo com IA",
    categoria: "ferramenta",
    rota: "/transcritor",
    icone: Mic,
    palavrasChave: ["áudio", "gravador", "transcrição", "voz", "resumo", "ia"],
  },
  {
    id: "processos",
    titulo: "Construtor de Processos & Pipelines",
    descricao: "Crie funis de trabalho flexíveis, CRM, checklists por etapa e automações",
    categoria: "modulo",
    rota: "/processos",
    icone: GitMerge,
    palavrasChave: ["processo", "pipeline", "crm", "funil", "automação", "pipefy", "etapas"],
  },
  {
    id: "contatos",
    titulo: "Árvore de Contatos",
    descricao: "Gerencie contatos, rede de relacionamentos, hierarquias (chefe/equipe) e propriedades editáveis",
    categoria: "modulo",
    rota: "/contatos",
    icone: FolderTree,
    palavrasChave: ["contatos", "árvore", "pessoas", "equipe", "chefe", "hierarquia", "rede", "relacionamentos", "csv"],
  },
  {
    id: "tarefas",
    titulo: "Quadro de Tarefas (Kanban)",
    descricao: "Gerencie tarefas, prazos, prioridades e cronômetro Pomodoro",
    categoria: "modulo",
    rota: "/tarefas",
    icone: CheckSquare,
    palavrasChave: ["tarefas", "kanban", "fazer", "pomodoro", "prazos"],
  },
  {
    id: "pdi",
    titulo: "Plano de Carreira & Metas (PDI)",
    descricao: "Acompanhe suas metas de carreira e entregas do PDI",
    categoria: "modulo",
    rota: "/pdi",
    icone: Target,
    palavrasChave: ["metas", "pdi", "entregas", "carreira", "desenvolvimento"],
  },
  {
    id: "referencias",
    titulo: "Referências Visuais",
    descricao: "Galeria de imagens, inspirações visuais e upload de referências",
    categoria: "modulo",
    rota: "/referencias",
    icone: ImageIcon,
    palavrasChave: ["referências", "fotos", "galeria", "inspirações", "design", "imagens"],
  },
  {
    id: "lousas",
    titulo: "Lousas Visuais (Excalidraw)",
    descricao: "Quadros em branco para desenhar, planejar e esquematizar ideias",
    categoria: "modulo",
    rota: "/lousas",
    icone: Layout,
    palavrasChave: ["lousa", "desenho", "canvas", "esboço", "excalidraw", "mindmap"],
  },
  {
    id: "chat_ia",
    titulo: "Assistente IA do Klaus",
    descricao: "Converse com a IA para buscar contexto, tirar dúvidas ou organizar ideias",
    categoria: "ferramenta",
    rota: "/chat",
    icone: MessageCircle,
    palavrasChave: ["chat", "ia", "gemini", "ajuda", "assistente"],
  },
  {
    id: "configuracoes",
    titulo: "Ajustes e Conexões",
    descricao: "Configure seus tokens do GitHub, chave do Gemini e preferências",
    categoria: "ferramenta",
    rota: "/config",
    icone: Settings,
    palavrasChave: ["ajustes", "configuração", "token", "github", "gemini", "senha"],
  },
];
