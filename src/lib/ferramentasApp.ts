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
  FolderTree,
  FilePlus,
  Scissors,
  Crop,
  Lock,
  Layers,
  Minimize2,
  ScanText,
  PenTool,
  Plus,
  UserPlus,
  UploadCloud,
  BellPlus,
  SunMoon,
  Timer,
  BookOpen,
  Video,
  Newspaper,
  Headphones,
  Network,
  RefreshCw,
  Wrench,
  Ruler,
  Maximize2,
  Eye,
  Type,
  AlignLeft,
  QrCode,
  FileCode2,
  KeyRound,
  Sparkles,
  Download,
  Play,
  Volume2,
  Link as LinkIcon,
  Camera,
} from "lucide-react";
import type { ComponentType } from "react";
import { obterIconePorNome } from "./icones";
import {
  carregarMenuPersonalizado,
  type GrupoMenuPersonalizado,
  type ItemMenuPersonalizado,
} from "./menuPersonalizado";

export interface FerramentaApp {
  id: string;
  titulo: string;
  descricao: string;
  categoria: "conversor" | "ferramenta" | "modulo" | "acao";
  rota: string;
  icone: ComponentType<{ size?: number; className?: string }>;
  palavrasChave: string[];
  cor?: string;
  destaque?: boolean;
  oculto?: boolean;
}

export const LISTA_FERRAMENTAS_APP: FerramentaApp[] = [
  // --- MÓDULO BAIXADOR DE MÍDIA ---
  {
    id: "baixador_midia",
    titulo: "Baixador de Mídia Universal",
    descricao: "Baixe vídeos, reels, shorts e fotos de qualquer rede social sem anúncios",
    categoria: "ferramenta",
    rota: "/baixador",
    icone: Download,
    palavrasChave: [
      "baixar",
      "video",
      "download",
      "midia",
      "mp4",
      "mp3",
      "youtube",
      "instagram",
      "tiktok",
      "twitter",
      "x",
      "reels",
      "shorts",
      "stories",
      "cobalt",
      "baixador",
    ],
  },
  {
    id: "baixador_youtube",
    titulo: "Baixar do YouTube (Vídeo & MP3)",
    descricao: "Download de vídeos em Full HD/4K ou extração de áudio MP3 do YouTube",
    categoria: "ferramenta",
    rota: "/baixador?ferramenta=youtube",
    icone: Video,
    palavrasChave: ["youtube", "video", "mp3", "shorts", "yt", "musica", "audio", "4k", "1080p", "baixar youtube"],
  },
  {
    id: "baixador_instagram",
    titulo: "Baixar do Instagram (Reels & Fotos)",
    descricao: "Download de Reels, posts em vídeo, fotos e carrossel do Instagram",
    categoria: "ferramenta",
    rota: "/baixador?ferramenta=instagram",
    icone: ImageIcon,
    palavrasChave: ["instagram", "reels", "insta", "fotos", "carrossel", "stories", "post", "baixar instagram"],
  },
  {
    id: "baixador_tiktok",
    titulo: "Baixar do TikTok (Sem Marca d'Água)",
    descricao: "Download de vídeos em alta resolução sem marca d'água e áudio do TikTok",
    categoria: "ferramenta",
    rota: "/baixador?ferramenta=tiktok",
    icone: Play,
    palavrasChave: ["tiktok", "sem marca", "sem marca dagua", "tt", "video tiktok", "audio tiktok", "baixar tiktok"],
  },
  {
    id: "baixador_twitter",
    titulo: "Baixar do X / Twitter (Vídeos & GIFs)",
    descricao: "Download de vídeos e GIFs em qualidade máxima do X (Twitter)",
    categoria: "ferramenta",
    rota: "/baixador?ferramenta=twitter",
    icone: LinkIcon,
    palavrasChave: ["twitter", "x", "x.com", "tweet", "video twitter", "gif twitter", "baixar twitter"],
  },
  {
    id: "baixador_facebook",
    titulo: "Baixar do Facebook (Reels & Vídeos)",
    descricao: "Download de vídeos públicos e Reels do Facebook",
    categoria: "ferramenta",
    rota: "/baixador?ferramenta=facebook",
    icone: Layers,
    palavrasChave: ["facebook", "fb", "reels facebook", "video facebook", "fb watch", "baixar facebook"],
  },
  {
    id: "baixador_pinterest",
    titulo: "Baixar do Pinterest (Vídeos & Pins)",
    descricao: "Download de vídeos de referências e inspirações do Pinterest",
    categoria: "ferramenta",
    rota: "/baixador?ferramenta=pinterest",
    icone: ImageIcon,
    palavrasChave: ["pinterest", "pin", "pins", "video pinterest", "referencia", "painel", "baixar pinterest"],
  },
  {
    id: "baixador_audio",
    titulo: "Extrair Áudio (MP3 / WAV / OGG)",
    descricao: "Transforme qualquer link de vídeo ou música em arquivo de áudio MP3",
    categoria: "ferramenta",
    rota: "/baixador?ferramenta=audio",
    icone: Volume2,
    palavrasChave: ["mp3", "audio", "extrair audio", "musica", "som", "wav", "ogg", "converter para mp3", "baixar mp3"],
  },

  // --- MÓDULO IT-TOOLS ---
  {
    id: "it_tools",
    titulo: "IT-Tools",
    descricao: "Canivete suíço de medidas, design, texto e geradores rápidos",
    categoria: "modulo",
    rota: "/it-tools",
    icone: Wrench,
    palavrasChave: ["it-tools", "ferramentas", "utilitarios", "canivete", "design", "desenvolvedor"],
  },
  {
    id: "it_unidades",
    titulo: "Conversor de Unidades (px / rem / pt)",
    descricao: "Converta medidas entre pixels, rem, em, pt, cm e polegadas",
    categoria: "ferramenta",
    rota: "/it-tools?ferramenta=conversor_unidades",
    icone: Ruler,
    palavrasChave: ["px", "rem", "em", "pt", "cm", "unidades", "medidas", "tamanho", "font-size", "css", "pixels", "it-tools"],
  },
  {
    id: "it_aspect_ratio",
    titulo: "Calculadora de Aspect Ratio",
    descricao: "Calcule proporções de vídeo e tela (16:9, 4:3, 1:1, 9:16) com preview",
    categoria: "ferramenta",
    rota: "/it-tools?ferramenta=aspect_ratio",
    icone: Maximize2,
    palavrasChave: ["aspect ratio", "proporcao", "resolucao", "16:9", "4:3", "9:16", "tela", "dimensao", "it-tools"],
  },
  {
    id: "it_contraste",
    titulo: "Verificador de Contraste WCAG",
    descricao: "Teste acessibilidade de cores e valide conformidade AA e AAA",
    categoria: "ferramenta",
    rota: "/it-tools?ferramenta=contraste_wcag",
    icone: Eye,
    palavrasChave: ["contraste", "wcag", "acessibilidade", "cores", "aa", "aaa", "color", "hex", "it-tools"],
  },
  {
    id: "it_cases",
    titulo: "Conversor de Case & Slugs",
    descricao: "Transforme texto em kebab-case, snake_case, camelCase e slug limpo",
    categoria: "ferramenta",
    rota: "/it-tools?ferramenta=case_converter",
    icone: Type,
    palavrasChave: ["case", "slug", "kebab", "snake", "camel", "pascal", "maiusculas", "nomes de arquivo", "it-tools"],
  },
  {
    id: "it_estatisticas",
    titulo: "Estatísticas & Contador de Palavras",
    descricao: "Contagem de caracteres, palavras, parágrafos e tempo de leitura",
    categoria: "ferramenta",
    rota: "/it-tools?ferramenta=estatisticas_texto",
    icone: AlignLeft,
    palavrasChave: ["contador", "caracteres", "palavras", "linhas", "tempo de leitura", "estatisticas", "it-tools"],
  },
  {
    id: "it_limpador",
    titulo: "Limpador & Formatador de Texto",
    descricao: "Remova quebras duplicadas, espaços extras, acentos e tags HTML",
    categoria: "ferramenta",
    rota: "/it-tools?ferramenta=limpador_texto",
    icone: RefreshCw,
    palavrasChave: ["limpar", "formatar", "espacos", "acentos", "html", "quebras", "it-tools"],
  },
  {
    id: "it_qr_code",
    titulo: "Gerador de QR Code Vetorial",
    descricao: "Gere QR Codes personalizáveis com download em SVG e PNG",
    categoria: "ferramenta",
    rota: "/it-tools?ferramenta=qr_code",
    icone: QrCode,
    palavrasChave: ["qr code", "qrcode", "codigo qr", "link", "svg", "png", "vetor", "it-tools"],
  },
  {
    id: "it_lorem",
    titulo: "Gerador de Lorem Ipsum",
    descricao: "Gere texto de preenchimento por parágrafos, frases ou palavras",
    categoria: "ferramenta",
    rota: "/it-tools?ferramenta=lorem_ipsum",
    icone: Sparkles,
    palavrasChave: ["lorem ipsum", "texto falso", "preenchimento", "placeholder", "dummy text", "it-tools"],
  },
  {
    id: "it_json",
    titulo: "Formatador & Validador de JSON",
    descricao: "Indente, embeleze ou minifique código JSON com validação",
    categoria: "ferramenta",
    rota: "/it-tools?ferramenta=json_formatter",
    icone: FileCode2,
    palavrasChave: ["json", "formatar", "minificar", "validar", "indentar", "codigo", "it-tools"],
  },
  {
    id: "it_hash_base64",
    titulo: "UUID, Base64 & Hash SHA-256",
    descricao: "Gerador de UUID v4, codificador/decodificador Base64 e hash",
    categoria: "ferramenta",
    rota: "/it-tools?ferramenta=hash_base64",
    icone: KeyRound,
    palavrasChave: ["uuid", "base64", "hash", "sha256", "criptografia", "token", "it-tools"],
  },

  // --- FERRAMENTAS ILOVEPDF / PDF ---
  {
    id: "pdf_juntar",
    titulo: "Juntar e Mesclar PDFs (iLovePDF)",
    descricao: "Combine múltiplos arquivos PDF em um único documento organizado",
    categoria: "ferramenta",
    rota: "/pdf?aba=juntar",
    icone: FilePlus,
    palavrasChave: ["pdf", "juntar", "mesclar", "combinar", "unir", "ilovepdf", "documentos"],
  },
  {
    id: "pdf_dividir",
    titulo: "Dividir PDF / Extrair Páginas (iLovePDF)",
    descricao: "Separe páginas de um PDF ou escolha intervalos específicos para extrair",
    categoria: "ferramenta",
    rota: "/pdf?aba=dividir",
    icone: Scissors,
    palavrasChave: ["pdf", "dividir", "extrair", "separar", "páginas", "intervalo", "ilovepdf"],
  },
  {
    id: "pdf_comprimir",
    titulo: "Comprimir e Reduzir PDF (iLovePDF)",
    descricao: "Reduza o tamanho de arquivos PDF pesados sem perder qualidade visual",
    categoria: "ferramenta",
    rota: "/pdf?aba=comprimir",
    icone: Minimize2,
    palavrasChave: ["pdf", "comprimir", "reduzir", "tamanho", "peso", "otimizar", "ilovepdf"],
  },
  {
    id: "pdf_recortar",
    titulo: "Recortar Margens de PDF (iLovePDF)",
    descricao: "Ajuste e corte as margens em branco de páginas de um arquivo PDF",
    categoria: "ferramenta",
    rota: "/pdf?aba=recortar",
    icone: Crop,
    palavrasChave: ["pdf", "recortar", "margens", "cortar", "ajustar", "ilovepdf"],
  },
  {
    id: "pdf_desbloquear",
    titulo: "Desbloquear PDF (iLovePDF)",
    descricao: "Remova senhas e restrições de proteção contra cópia ou impressão",
    categoria: "ferramenta",
    rota: "/pdf?aba=desbloquear",
    icone: Lock,
    palavrasChave: ["pdf", "desbloquear", "senha", "proteger", "remover senha", "ilovepdf"],
  },
  {
    id: "pdf_organizar",
    titulo: "Organizar e Reordenar Páginas PDF",
    descricao: "Mude a ordem, gire e organize páginas de um documento PDF livremente",
    categoria: "ferramenta",
    rota: "/pdf?aba=organizar",
    icone: Layers,
    palavrasChave: ["pdf", "organizar", "reordenar", "ordenar", "mover páginas", "ilovepdf"],
  },
  {
    id: "pdf_digitalizar",
    titulo: "Digitalizar Documentos / Scanner para PDF",
    descricao: "Escaneie fotos com a câmera, corrija a perspectiva dos 4 cantos e crie PDFs nítidos",
    categoria: "ferramenta",
    rota: "/pdf?aba=digitalizar",
    icone: Camera,
    palavrasChave: ["digitalizar", "scanner", "escanear", "camera", "foto", "pdf", "camscanner", "documento", "ilovepdf"],
  },
  {
    id: "pdf_ocr",
    titulo: "Reconhecimento OCR de PDF e Imagem",
    descricao: "Extraia texto pesquisável e legível de PDFs digitalizados e fotos",
    categoria: "ferramenta",
    rota: "/conversor?ferramenta=ocr",
    icone: ScanText,
    palavrasChave: ["pdf", "ocr", "texto", "reconhecer", "digitalizado", "extrair texto", "tesseract"],
  },

  // --- LOUSAS E EXCALIDRAW ---
  {
    id: "excalidraw_nova",
    titulo: "Nova Lousa / Canvas Excalidraw",
    descricao: "Abra um quadro em branco para desenhar, rascunhar e criar mapas mentais",
    categoria: "ferramenta",
    rota: "/lousas?nova=true",
    icone: PenTool,
    palavrasChave: ["lousa", "excalidraw", "desenho", "canvas", "novo", "esboço", "mapa mental", "diagrama"],
  },
  {
    id: "lousas",
    titulo: "Lousas Visuais (Excalidraw)",
    descricao: "Galeria de quadros Excalidraw, diagramas e mapas mentais salvos",
    categoria: "modulo",
    rota: "/lousas",
    icone: Layout,
    palavrasChave: ["lousa", "excalidraw", "canvas", "diagrama", "mapas mentais", "desenhos"],
  },

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
    id: "pdf_para_epub",
    titulo: "Conversor: PDF para EPUB",
    descricao: "Extraia o texto de documentos PDF e monte um arquivo de livro digital EPUB",
    categoria: "conversor",
    rota: "/conversor?ferramenta=pdf_para_epub",
    icone: FileText,
    palavrasChave: ["pdf", "epub", "livro", "digital", "converter", "texto", "leitura"],
  },
  {
    id: "epub_trocar_capa",
    titulo: "Conversor: Trocar Capa de EPUB",
    descricao: "Substitua a imagem de capa de um livro digital EPUB existente",
    categoria: "conversor",
    rota: "/conversor?ferramenta=epub_trocar_capa",
    icone: FileImage,
    palavrasChave: ["epub", "capa", "trocar capa", "livro", "imagem", "substituir capa", "editar"],
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
    id: "pesquisa_livros",
    titulo: "Pesquisar e Baixar Livros",
    descricao: "Busque e baixe livros e PDFs de domínio público/abertos de forma rápida e direta",
    categoria: "ferramenta",
    rota: "/livros",
    icone: BookOpen,
    palavrasChave: ["livros", "pesquisar livros", "pdf", "epub", "baixar", "gutenberg", "open library", "gutenberg", "biblioteca"],
  },
  {
    id: "contatos",
    titulo: "Árvore de Contatos & Pessoas",
    descricao: "Gerencie contatos, rede de relacionamentos, hierarquias (chefe/equipe) e propriedades editáveis",
    categoria: "modulo",
    rota: "/contatos",
    icone: FolderTree,
    palavrasChave: ["contatos", "árvore", "pessoas", "equipe", "chefe", "hierarquia", "rede", "relacionamentos", "csv"],
  },
  {
    id: "testador_hardware",
    titulo: "Diagnóstico de Hardware",
    descricao: "Verifique o feed de vídeo, grave um áudio de teste e monitore seus microfones",
    categoria: "ferramenta",
    rota: "/testador",
    icone: Video,
    palavrasChave: ["câmera", "microfone", "áudio", "vídeo", "hardware", "diagnóstico", "teste", "espelho", "camera", "som"],
  },
  {
    id: "transcritor",
    titulo: "Transcritor de Áudio & Voz",
    descricao: "Grave voz ou envie arquivos de áudio para transcrição e resumo com IA",
    categoria: "ferramenta",
    rota: "/transcritor",
    icone: Mic,
    palavrasChave: ["áudio", "gravador", "transcrição", "voz", "resumo", "ia"],
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
    titulo: "Referências Visuais (Pinterest)",
    descricao: "Galeria de imagens, inspirações visuais e upload de referências",
    categoria: "modulo",
    rota: "/referencias",
    icone: ImageIcon,
    palavrasChave: ["referências", "fotos", "galeria", "inspirações", "design", "imagens", "pinterest"],
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
  {
    id: "ferramentas_pdf",
    titulo: "Suíte de Ferramentas PDF (iLovePDF)",
    descricao: "Juntar, dividir, comprimir, recortar, desbloquear e organizar páginas de PDF",
    categoria: "ferramenta",
    rota: "/pdf",
    icone: FilePlus,
    palavrasChave: ["pdf", "ilovepdf", "mesclar", "dividir", "comprimir", "recortar", "desbloquear", "organizar"],
  },
  {
    id: "conversor",
    titulo: "Conversor Universal & Utilitários",
    descricao: "Conversões de imagem (PNG, JPG, WebP), OCR, Markdown e livros EPUB",
    categoria: "ferramenta",
    rota: "/conversor",
    icone: RefreshCw,
    palavrasChave: ["conversor", "converter", "imagem", "ocr", "texto", "epub", "markdown"],
  },
  {
    id: "sons",
    titulo: "Sons Ambiente & Foco",
    descricao: "Sons relaxantes de chuva, cafeteria, ruído branco e ondas para concentração",
    categoria: "ferramenta",
    rota: "/sons",
    icone: Headphones,
    palavrasChave: ["sons", "foco", "ruído branco", "chuva", "cafeteria", "áudio", "ambiente", "concentração", "música"],
  },
  {
    id: "noticias",
    titulo: "Radar de Notícias & Feed RSS",
    descricao: "Acompanhe novidades, tendências e feeds RSS em tempo real",
    categoria: "modulo",
    rota: "/noticias",
    icone: Newspaper,
    palavrasChave: ["notícias", "radar", "feed", "rss", "novidades", "artigos", "design"],
  },
  {
    id: "grafo",
    titulo: "Grafo Neural de Conhecimento",
    descricao: "Explore as conexões e relacionamentos visuais entre todas as suas notas e ideias",
    categoria: "modulo",
    rota: "/grafo",
    icone: Network,
    palavrasChave: ["grafo", "neural", "rede", "conexões", "mapa mental", "relacionamentos", "obsidian"],
  },

  // --- AÇÕES RÁPIDAS (QUICK ACTIONS) ---
  {
    id: "acao_nova_nota",
    titulo: "Criar Nova Nota",
    descricao: "Abra instantaneamente a tela de criação de nota em Markdown",
    categoria: "acao",
    rota: "/notas?nova=true",
    icone: Plus,
    palavrasChave: ["criar nota", "nova nota", "escrever nota", "adicionar nota", "nova"],
  },
  {
    id: "acao_nova_tarefa",
    titulo: "Criar Nova Tarefa",
    descricao: "Cadastre uma nova tarefa com prazo, prioridade e checklist",
    categoria: "acao",
    rota: "/tarefas?nova=true",
    icone: CheckSquare,
    palavrasChave: ["criar tarefa", "nova tarefa", "fazer", "adicionar tarefa", "pendencia"],
  },
  {
    id: "acao_novo_contato",
    titulo: "Adicionar Novo Contato",
    descricao: "Cadastre um novo contato na sua árvore de relacionamentos",
    categoria: "acao",
    rota: "/contatos?novo=true",
    icone: UserPlus,
    palavrasChave: ["criar contato", "novo contato", "adicionar pessoa", "equipe", "adicionar contato"],
  },
  {
    id: "acao_nova_meta",
    titulo: "Criar Meta no PDI",
    descricao: "Cadastre uma nova meta profissional no seu Plano de Desenvolvimento",
    categoria: "acao",
    rota: "/pdi?nova_meta=true",
    icone: Target,
    palavrasChave: ["criar meta", "nova meta", "pdi", "carreira", "desenvolvimento"],
  },
  {
    id: "acao_upload_referencia",
    titulo: "Upload de Referência Visual",
    descricao: "Envie novas imagens e inspirações visuais para a sua galeria",
    categoria: "acao",
    rota: "/referencias?upload=true",
    icone: UploadCloud,
    palavrasChave: ["upload", "nova imagem", "enviar foto", "nova referencia", "inspiração"],
  },
  {
    id: "acao_novo_lembrete",
    titulo: "Criar Lembrete na Caixa de Entrada",
    descricao: "Cadastre um novo lembrete com notificação e data",
    categoria: "acao",
    rota: "/inbox?novo=true",
    icone: BellPlus,
    palavrasChave: ["criar lembrete", "novo lembrete", "inbox", "notificação", "alerta"],
  },
  {
    id: "acao_alternar_tema",
    titulo: "Alternar Tema Claro / Escuro",
    descricao: "Mude o tema visual do Klaus entre modo escuro (dark) e claro (light)",
    categoria: "acao",
    rota: "acao:alternar_tema",
    icone: SunMoon,
    palavrasChave: ["tema", "escuro", "claro", "dark mode", "light mode", "modo escuro", "modo claro", "aparencia"],
  },
  {
    id: "acao_iniciar_pomodoro",
    titulo: "Iniciar Cronômetro Pomodoro",
    descricao: "Abra o temporizador de foco Pomodoro para concentrar no trabalho",
    categoria: "acao",
    rota: "acao:iniciar_pomodoro",
    icone: Timer,
    palavrasChave: ["pomodoro", "cronometro", "temporizador", "foco", "timer"],
  },
];

/**
 * Retorna o catálogo de ferramentas aplicando os nomes, ícones e cores
 * personalizados pelo usuário no menu lateral ("Personalizar Menu") aos
 * módulos principais, preservando rigorosamente o título e ícone específico
 * de cada sub-ferramenta (ex: Juntar PDF, PDF para PNG, etc.).
 */
export function obterFerramentasPersonalizadas(
  gruposMenu: GrupoMenuPersonalizado[] = carregarMenuPersonalizado()
): FerramentaApp[] {
  const mapaCustomPorRota = new Map<string, ItemMenuPersonalizado>();
  const mapaCustomPorId = new Map<string, ItemMenuPersonalizado>();

  for (const g of gruposMenu) {
    for (const it of g.itens || []) {
      if (it?.para) {
        mapaCustomPorRota.set(it.para.toLowerCase(), it);
      }
      if (it?.id) {
        mapaCustomPorId.set(it.id.toLowerCase(), it);
      }
    }
  }

  return LISTA_FERRAMENTAS_APP.map((f) => {
    const rotaLimpa = f.rota.toLowerCase();
    // É módulo principal se a rota for direta (sem query params de ação ou sub-ferramenta)
    const ehModuloPrincipal = !f.rota.includes("?") && !f.rota.startsWith("acao:");

    // Busca customização direta correspondente
    const custom =
      mapaCustomPorRota.get(rotaLimpa) ||
      mapaCustomPorId.get(f.id.toLowerCase()) ||
      (f.id === "chat_ia" ? mapaCustomPorId.get("chat") : undefined) ||
      (f.id === "ferramentas_pdf" ? (mapaCustomPorId.get("pdf") || mapaCustomPorRota.get("/pdf")) : undefined) ||
      (f.id === "pesquisa_livros" ? (mapaCustomPorId.get("livros") || mapaCustomPorRota.get("/livros")) : undefined) ||
      (f.id === "testador_hardware" ? (mapaCustomPorId.get("testador_hardware") || mapaCustomPorRota.get("/testador")) : undefined);

    if (!custom) {
      // Para sub-ferramentas (ex: /pdf?aba=juntar), herda opcionalmente a cor de destaque do módulo pai
      const rotaBase = f.rota.split("?")[0].toLowerCase();
      const customPai = mapaCustomPorRota.get(rotaBase);
      if (customPai?.cor) {
        return { ...f, cor: customPai.cor };
      }
      return f;
    }

    const IconeCustom = custom.iconeNome ? obterIconePorNome(custom.iconeNome) : null;

    // Apenas renomeia e altera ícone se for o módulo principal correspondente ao item do menu
    const titulo = ehModuloPrincipal && custom.rotulo?.trim()
      ? custom.rotulo.trim()
      : f.titulo;

    const icone = ehModuloPrincipal && IconeCustom ? IconeCustom : f.icone;

    // Adiciona o nome customizado nas palavras-chave para permitir busca direta
    const palavrasChave = custom.rotulo && custom.rotulo !== f.titulo
      ? [...f.palavrasChave, custom.rotulo.toLowerCase()]
      : f.palavrasChave;

    return {
      ...f,
      titulo,
      icone,
      cor: custom.cor || f.cor,
      destaque: ehModuloPrincipal ? custom.destaque : f.destaque,
      oculto: ehModuloPrincipal ? custom.oculto : f.oculto,
      palavrasChave,
    };
  });
}
