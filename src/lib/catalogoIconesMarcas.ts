export interface ItemIconeCatalogo {
  id: string; // ex: "si:youtubemusic", "lucide:Star", "emoji:🎨", "iconify:tabler:coffee"
  nome: string; // ex: "YouTube Music", "Estrela", "Design / Arte"
  categoria:
    | "Google & Produtividade"
    | "Comunicação"
    | "Design & Criatividade"
    | "Desenvolvimento & IA"
    | "Mídia & Música"
    | "Redes & Conteúdo"
    | "Finanças & Serviços"
    | "Símbolos & UI"
    | "Genéricos"
    | "Emojis";
  slug?: string; // slug do Simple Icons
  cor?: string; // cor oficial hexadecimal da marca
  iconeLucide?: string; // nome do componente Lucide
  emoji?: string; // caractere emoji direto
  tags?: string[]; // palavras-chave adicionais para pesquisa
  provedor?: "local" | "simple-icons" | "lucide" | "emoji" | "iconify";
}

export const CATEGORIAS_ICONES_MARCAS = [
  "Todos",
  "Símbolos & UI",
  "Design & Criatividade",
  "Google & Produtividade",
  "Comunicação",
  "Desenvolvimento & IA",
  "Mídia & Música",
  "Redes & Conteúdo",
  "Finanças & Serviços",
  "Emojis",
  "Genéricos",
] as const;

export type CategoriaIconeMarca = (typeof CATEGORIAS_ICONES_MARCAS)[number];

export const EMOJIS_POPULARES_FAVORITOS: ItemIconeCatalogo[] = [
  { id: "emoji:🎨", nome: "Design / Arte", emoji: "🎨", categoria: "Emojis", tags: ["arte", "design", "pintura", "criativo", "cor"] },
  { id: "emoji:🚀", nome: "Foguete / Startup", emoji: "🚀", categoria: "Emojis", tags: ["foguete", "startup", "lancamento", "rapido"] },
  { id: "emoji:💻", nome: "Computador / Dev", emoji: "💻", categoria: "Emojis", tags: ["computador", "laptop", "programacao", "dev", "tech"] },
  { id: "emoji:☕", nome: "Café / Pausa", emoji: "☕", categoria: "Emojis", tags: ["cafe", "coffee", "xicara", "pausa"] },
  { id: "emoji:💡", nome: "Ideia / Lâmpada", emoji: "💡", categoria: "Emojis", tags: ["ideia", "lampada", "brainstorm", "insight"] },
  { id: "emoji:🎮", nome: "Jogos / Games", emoji: "🎮", categoria: "Emojis", tags: ["jogos", "games", "game", "controle"] },
  { id: "emoji:📌", nome: "Pin / Fixado", emoji: "📌", categoria: "Emojis", tags: ["pin", "fixado", "importante", "lembrete"] },
  { id: "emoji:🔥", nome: "Fogo / Em Alta", emoji: "🔥", categoria: "Emojis", tags: ["fogo", "destaque", "trend", "quente", "top"] },
  { id: "emoji:⭐", nome: "Estrela / Favorito", emoji: "⭐", categoria: "Emojis", tags: ["estrela", "favorito", "destaque"] },
  { id: "emoji:🎧", nome: "Fones / Música", emoji: "🎧", categoria: "Emojis", tags: ["fone", "musica", "audio", "podcast"] },
  { id: "emoji:📷", nome: "Câmera / Fotos", emoji: "📷", categoria: "Emojis", tags: ["camera", "foto", "fotografia", "imagem"] },
  { id: "emoji:📚", nome: "Livros / Estudos", emoji: "📚", categoria: "Emojis", tags: ["livro", "estudo", "educacao", "leitura"] },
  { id: "emoji:🎬", nome: "Cinema / Vídeos", emoji: "🎬", categoria: "Emojis", tags: ["filme", "video", "cinema", "claquete"] },
  { id: "emoji:💼", nome: "Trabalho / Negócios", emoji: "💼", categoria: "Emojis", tags: ["trabalho", "negocios", "pasta", "carreira"] },
  { id: "emoji:🏠", nome: "Casa / Início", emoji: "🏠", categoria: "Emojis", tags: ["casa", "home", "inicio"] },
  { id: "emoji:🔍", nome: "Lupa / Busca", emoji: "🔍", categoria: "Emojis", tags: ["lupa", "busca", "pesquisa"] },
  { id: "emoji:🛒", nome: "Carrinho / Compras", emoji: "🛒", categoria: "Emojis", tags: ["carrinho", "compras", "loja", "shop"] },
  { id: "emoji:💬", nome: "Chat / Mensagem", emoji: "💬", categoria: "Emojis", tags: ["chat", "balao", "conversa", "mensagem"] },
  { id: "emoji:📅", nome: "Calendário / Agenda", emoji: "📅", categoria: "Emojis", tags: ["calendario", "agenda", "data", "evento"] },
  { id: "emoji:🎯", nome: "Alvo / Foco", emoji: "🎯", categoria: "Emojis", tags: ["alvo", "meta", "objetivo", "foco"] },
  { id: "emoji:⚡", nome: "Raio / Rápido", emoji: "⚡", categoria: "Emojis", tags: ["raio", "energia", "rapido", "eletrico"] },
  { id: "emoji:💎", nome: "Diamante / Premium", emoji: "💎", categoria: "Emojis", tags: ["diamante", "joia", "premium", "valioso"] },
  { id: "emoji:🍕", nome: "Pizza / Comida", emoji: "🍕", categoria: "Emojis", tags: ["pizza", "comida", "delivery", "lanche"] },
  { id: "emoji:✈️", nome: "Avião / Viagem", emoji: "✈️", categoria: "Emojis", tags: ["aviao", "viagem", "voo", "ferias"] },
  { id: "emoji:🌎", nome: "Planeta / Global", emoji: "🌎", categoria: "Emojis", tags: ["globo", "terra", "mundo", "global"] },
  { id: "emoji:🌿", nome: "Folha / Natureza", emoji: "🌿", categoria: "Emojis", tags: ["folha", "natureza", "planta", "verde"] },
  { id: "emoji:📊", nome: "Gráficos / Dados", emoji: "📊", categoria: "Emojis", tags: ["grafico", "estatistica", "metricas", "dados"] },
  { id: "emoji:💰", nome: "Dinheiro / Finanças", emoji: "💰", categoria: "Emojis", tags: ["dinheiro", "financas", "banco", "pagamento"] },
  { id: "emoji:🔐", nome: "Segurança / Senhas", emoji: "🔐", categoria: "Emojis", tags: ["cadeado", "senha", "seguranca", "chave"] },
  { id: "emoji:🛠️", nome: "Ferramentas", emoji: "🛠️", categoria: "Emojis", tags: ["ferramentas", "ajustes", "configuracao"] },
  { id: "emoji:✍️", nome: "Escrita / Redação", emoji: "✍️", categoria: "Emojis", tags: ["escrita", "caneta", "redacao", "texto"] },
  { id: "emoji:✨", nome: "Brilhos / IA", emoji: "✨", categoria: "Emojis", tags: ["brilho", "magica", "especial", "novo", "ia"] },
];

export const CATALOGO_ICONES_MARCAS: ItemIconeCatalogo[] = [
  // =========================================================================
  // --- Símbolos & UI (Lucide Icons com nomes em Português e busca ampla) ---
  // =========================================================================
  { id: "lucide:Globe", nome: "Globo / Web", categoria: "Símbolos & UI", iconeLucide: "Globe", tags: ["globo", "web", "internet", "site"] },
  { id: "lucide:Bookmark", nome: "Marcador", categoria: "Símbolos & UI", iconeLucide: "Bookmark", tags: ["marcador", "favorito", "salvo"] },
  { id: "lucide:Star", nome: "Estrela", categoria: "Símbolos & UI", iconeLucide: "Star", tags: ["estrela", "favorito", "destaque"] },
  { id: "lucide:Heart", nome: "Coração", categoria: "Símbolos & UI", iconeLucide: "Heart", tags: ["coracao", "amor", "like", "favorito"] },
  { id: "lucide:Sparkles", nome: "Brilho / Mágico", categoria: "Símbolos & UI", iconeLucide: "Sparkles", tags: ["brilho", "magica", "ia", "destaque"] },
  { id: "lucide:Folder", nome: "Pasta", categoria: "Símbolos & UI", iconeLucide: "Folder", tags: ["pasta", "arquivos", "diretorio"] },
  { id: "lucide:CheckSquare", nome: "Tarefas / Check", categoria: "Símbolos & UI", iconeLucide: "CheckSquare", tags: ["tarefa", "checklist", "concluido"] },
  { id: "lucide:FileText", nome: "Documento / Texto", categoria: "Símbolos & UI", iconeLucide: "FileText", tags: ["documento", "texto", "artigo", "nota"] },
  { id: "lucide:Calendar", nome: "Calendário", categoria: "Símbolos & UI", iconeLucide: "Calendar", tags: ["calendario", "agenda", "data", "evento"] },
  { id: "lucide:Mail", nome: "E-mail", categoria: "Símbolos & UI", iconeLucide: "Mail", tags: ["email", "correio", "mensagem"] },
  { id: "lucide:Home", nome: "Início / Casa", categoria: "Símbolos & UI", iconeLucide: "Home", tags: ["casa", "home", "inicio", "principal"] },
  { id: "lucide:Search", nome: "Pesquisa / Busca", categoria: "Símbolos & UI", iconeLucide: "Search", tags: ["busca", "pesquisa", "lupa"] },
  { id: "lucide:Coffee", nome: "Café / Xícara", categoria: "Símbolos & UI", iconeLucide: "Coffee", tags: ["cafe", "coffee", "xicara", "pausa"] },
  { id: "lucide:Palette", nome: "Paleta / Cores", categoria: "Símbolos & UI", iconeLucide: "Palette", tags: ["paleta", "cores", "design", "arte"] },
  { id: "lucide:Brush", nome: "Pincel", categoria: "Símbolos & UI", iconeLucide: "Brush", tags: ["pincel", "pintura", "arte", "design"] },
  { id: "lucide:PenTool", nome: "Caneta Vetor", categoria: "Símbolos & UI", iconeLucide: "PenTool", tags: ["caneta", "vetor", "pentool", "design"] },
  { id: "lucide:Layers", nome: "Camadas / Layers", categoria: "Símbolos & UI", iconeLucide: "Layers", tags: ["camadas", "layers", "design", "organizacao"] },
  { id: "lucide:Crop", nome: "Recorte / Crop", categoria: "Símbolos & UI", iconeLucide: "Crop", tags: ["crop", "recorte", "imagem"] },
  { id: "lucide:Image", nome: "Imagem / Foto", categoria: "Símbolos & UI", iconeLucide: "Image", tags: ["imagem", "foto", "quadro"] },
  { id: "lucide:Camera", nome: "Câmera Fotográfica", categoria: "Símbolos & UI", iconeLucide: "Camera", tags: ["camera", "foto", "fotografia"] },
  { id: "lucide:Headphones", nome: "Fones de Ouvido", categoria: "Símbolos & UI", iconeLucide: "Headphones", tags: ["fone", "musica", "audio", "podcast"] },
  { id: "lucide:Music", nome: "Música / Nota", categoria: "Símbolos & UI", iconeLucide: "Music", tags: ["musica", "som", "audio"] },
  { id: "lucide:Video", nome: "Vídeo / Gravação", categoria: "Símbolos & UI", iconeLucide: "Video", tags: ["video", "gravacao", "filme"] },
  { id: "lucide:Film", nome: "Cinema / Rolo", categoria: "Símbolos & UI", iconeLucide: "Film", tags: ["cinema", "filme", "pelicula"] },
  { id: "lucide:Mic", nome: "Microfone / Voz", categoria: "Símbolos & UI", iconeLucide: "Mic", tags: ["microfone", "audio", "gravacao", "voz"] },
  { id: "lucide:Tv", nome: "Televisão / Monitor", categoria: "Símbolos & UI", iconeLucide: "Tv", tags: ["tv", "televisao", "tela"] },
  { id: "lucide:BookOpen", nome: "Livro Aberto", categoria: "Símbolos & UI", iconeLucide: "BookOpen", tags: ["livro", "leitura", "estudo", "educacao"] },
  { id: "lucide:Book", nome: "Livro", categoria: "Símbolos & UI", iconeLucide: "Book", tags: ["livro", "caderno", "manual"] },
  { id: "lucide:GraduationCap", nome: "Formatura / Ensino", categoria: "Símbolos & UI", iconeLucide: "GraduationCap", tags: ["ensino", "escola", "faculdade", "curso"] },
  { id: "lucide:Newspaper", nome: "Jornal / Notícias", categoria: "Símbolos & UI", iconeLucide: "Newspaper", tags: ["jornal", "noticia", "artigo", "midia"] },
  { id: "lucide:Code", nome: "Código / Tags", categoria: "Símbolos & UI", iconeLucide: "Code", tags: ["codigo", "programacao", "html", "dev"] },
  { id: "lucide:Terminal", nome: "Terminal / Console", categoria: "Símbolos & UI", iconeLucide: "Terminal", tags: ["terminal", "bash", "prompt", "dev"] },
  { id: "lucide:Cpu", nome: "Processador / CPU", categoria: "Símbolos & UI", iconeLucide: "Cpu", tags: ["cpu", "hardware", "processador", "chip"] },
  { id: "lucide:Database", nome: "Banco de Dados", categoria: "Símbolos & UI", iconeLucide: "Database", tags: ["banco", "dados", "database", "sql"] },
  { id: "lucide:Server", nome: "Servidor / Server", categoria: "Símbolos & UI", iconeLucide: "Server", tags: ["servidor", "server", "cloud", "infra"] },
  { id: "lucide:Cloud", nome: "Nuvem / Cloud", categoria: "Símbolos & UI", iconeLucide: "Cloud", tags: ["nuvem", "cloud", "sincronizacao"] },
  { id: "lucide:Smartphone", nome: "Celular / Mobile", categoria: "Símbolos & UI", iconeLucide: "Smartphone", tags: ["celular", "mobile", "telefone", "app"] },
  { id: "lucide:Laptop", nome: "Notebook / Laptop", categoria: "Símbolos & UI", iconeLucide: "Laptop", tags: ["laptop", "notebook", "computador"] },
  { id: "lucide:Monitor", nome: "Monitor / Tela", categoria: "Símbolos & UI", iconeLucide: "Monitor", tags: ["monitor", "display", "tela"] },
  { id: "lucide:Bot", nome: "Robô / IA", categoria: "Símbolos & UI", iconeLucide: "Bot", tags: ["robo", "ia", "bot", "inteligencia"] },
  { id: "lucide:Zap", nome: "Raio / Rápido", categoria: "Símbolos & UI", iconeLucide: "Zap", tags: ["raio", "energia", "rapido", "performance"] },
  { id: "lucide:Flame", nome: "Fogo / Chama", categoria: "Símbolos & UI", iconeLucide: "Flame", tags: ["fogo", "chama", "destaque", "streak"] },
  { id: "lucide:Sun", nome: "Sol / Dia", categoria: "Símbolos & UI", iconeLucide: "Sun", tags: ["sol", "dia", "clima", "brilho"] },
  { id: "lucide:Moon", nome: "Lua / Noite", categoria: "Símbolos & UI", iconeLucide: "Moon", tags: ["lua", "noite", "escuro", "dark"] },
  { id: "lucide:Lock", nome: "Cadeado / Seguro", categoria: "Símbolos & UI", iconeLucide: "Lock", tags: ["cadeado", "seguranca", "privado", "senha"] },
  { id: "lucide:Key", nome: "Chave / Acesso", categoria: "Símbolos & UI", iconeLucide: "Key", tags: ["chave", "acesso", "token", "login"] },
  { id: "lucide:Shield", nome: "Escudo / Proteção", categoria: "Símbolos & UI", iconeLucide: "Shield", tags: ["escudo", "protecao", "antivirus"] },
  { id: "lucide:Link", nome: "Link / Conexão", categoria: "Símbolos & UI", iconeLucide: "Link", tags: ["link", "url", "hiperlink", "conexao"] },
  { id: "lucide:Compass", nome: "Bússola / Explorar", categoria: "Símbolos & UI", iconeLucide: "Compass", tags: ["bussola", "explorar", "guia", "direcao"] },
  { id: "lucide:MapPin", nome: "Localização / Pin", categoria: "Símbolos & UI", iconeLucide: "MapPin", tags: ["localizacao", "mapa", "pin", "lugar"] },
  { id: "lucide:Map", nome: "Mapa", categoria: "Símbolos & UI", iconeLucide: "Map", tags: ["mapa", "rotas", "viagem"] },
  { id: "lucide:Plane", nome: "Avião / Viagens", categoria: "Símbolos & UI", iconeLucide: "Plane", tags: ["aviao", "viagem", "voo", "turismo"] },
  { id: "lucide:Car", nome: "Carro / Veículo", categoria: "Símbolos & UI", iconeLucide: "Car", tags: ["carro", "veiculo", "transporte", "uber"] },
  { id: "lucide:Bike", nome: "Bicicleta", categoria: "Símbolos & UI", iconeLucide: "Bike", tags: ["bike", "bicicleta", "esporte", "saude"] },
  { id: "lucide:ShoppingCart", nome: "Carrinho de Compras", categoria: "Símbolos & UI", iconeLucide: "ShoppingCart", tags: ["carrinho", "compras", "loja", "ecommerce"] },
  { id: "lucide:ShoppingBag", nome: "Sacola de Compras", categoria: "Símbolos & UI", iconeLucide: "ShoppingBag", tags: ["sacola", "compras", "loja"] },
  { id: "lucide:Package", nome: "Pacote / Encomenda", categoria: "Símbolos & UI", iconeLucide: "Package", tags: ["pacote", "encomenda", "entrega", "correios"] },
  { id: "lucide:Tag", nome: "Etiqueta / Tag", categoria: "Símbolos & UI", iconeLucide: "Tag", tags: ["tag", "etiqueta", "desconto", "preco"] },
  { id: "lucide:CreditCard", nome: "Cartão de Crédito", categoria: "Símbolos & UI", iconeLucide: "CreditCard", tags: ["cartao", "credito", "debito", "banco"] },
  { id: "lucide:DollarSign", nome: "Dinheiro / Finanças", categoria: "Símbolos & UI", iconeLucide: "DollarSign", tags: ["dinheiro", "dolar", "moeda", "preco"] },
  { id: "lucide:Wallet", nome: "Carteira", categoria: "Símbolos & UI", iconeLucide: "Wallet", tags: ["carteira", "saldo", "pagamento"] },
  { id: "lucide:TrendingUp", nome: "Tendência de Alta", categoria: "Símbolos & UI", iconeLucide: "TrendingUp", tags: ["grafico", "alta", "crescimento", "investimento"] },
  { id: "lucide:BarChart3", nome: "Gráfico de Barras", categoria: "Símbolos & UI", iconeLucide: "BarChart3", tags: ["grafico", "barras", "analytics", "dados"] },
  { id: "lucide:PieChart", nome: "Gráfico de Pizza", categoria: "Símbolos & UI", iconeLucide: "PieChart", tags: ["grafico", "pizza", "relatorio"] },
  { id: "lucide:Briefcase", nome: "Maleta / Trabalho", categoria: "Símbolos & UI", iconeLucide: "Briefcase", tags: ["maleta", "trabalho", "carreira", "empresa"] },
  { id: "lucide:Trophy", nome: "Troféu / Conquista", categoria: "Símbolos & UI", iconeLucide: "Trophy", tags: ["trofeu", "conquista", "vitoria", "premio"] },
  { id: "lucide:Flag", nome: "Bandeira / Meta", categoria: "Símbolos & UI", iconeLucide: "Flag", tags: ["bandeira", "meta", "ponto"] },
  { id: "lucide:Clock", nome: "Relógio / Tempo", categoria: "Símbolos & UI", iconeLucide: "Clock", tags: ["relogio", "hora", "tempo", "prazo"] },
  { id: "lucide:Bell", nome: "Sino / Notificação", categoria: "Símbolos & UI", iconeLucide: "Bell", tags: ["sino", "notificacao", "alerta"] },
  { id: "lucide:Rocket", nome: "Foguete / Lançamento", categoria: "Símbolos & UI", iconeLucide: "Rocket", tags: ["foguete", "lancamento", "rapido"] },
  { id: "lucide:MessageSquare", nome: "Mensagem / Balão", categoria: "Símbolos & UI", iconeLucide: "MessageSquare", tags: ["mensagem", "chat", "balao", "comentario"] },
  { id: "lucide:Users", nome: "Usuários / Equipe", categoria: "Símbolos & UI", iconeLucide: "Users", tags: ["usuarios", "equipe", "pessoas", "grupo"] },

  // =========================================================================
  // --- Design & Criatividade ---
  // =========================================================================
  { id: "si:figma", nome: "Figma", categoria: "Design & Criatividade", slug: "figma", cor: "#F24E1E", tags: ["ui", "ux", "design", "prototipo"] },
  { id: "si:canva", nome: "Canva", categoria: "Design & Criatividade", slug: "canva", cor: "#00C4CC", tags: ["design", "posts", "social", "artes"] },
  { id: "si:dribbble", nome: "Dribbble", categoria: "Design & Criatividade", slug: "dribbble", cor: "#EA4C89", tags: ["portfolio", "design", "inspiracao"] },
  { id: "si:behance", nome: "Behance", categoria: "Design & Criatividade", slug: "behance", cor: "#1769FF", tags: ["adobe", "portfolio", "design", "artes"] },
  { id: "si:adobe", nome: "Adobe Creative Cloud", categoria: "Design & Criatividade", slug: "adobe", cor: "#FF0000", tags: ["creative", "cloud", "suite"] },
  { id: "si:adobephotoshop", nome: "Photoshop", categoria: "Design & Criatividade", slug: "adobephotoshop", cor: "#31A8FF", tags: ["ps", "edicao", "foto", "raster"] },
  { id: "si:adobeillustrator", nome: "Illustrator", categoria: "Design & Criatividade", slug: "adobeillustrator", cor: "#FF9A00", tags: ["ai", "vetor", "ilustracao", "logo"] },
  { id: "si:adobeindesign", nome: "InDesign", categoria: "Design & Criatividade", slug: "adobeindesign", cor: "#FF3366", tags: ["id", "diagramacao", "editorial", "livro"] },
  { id: "si:adobepremierepro", nome: "Premiere Pro", categoria: "Design & Criatividade", slug: "adobepremierepro", cor: "#9999FF", tags: ["pr", "video", "edicao"] },
  { id: "si:adobeaftereffects", nome: "After Effects", categoria: "Design & Criatividade", slug: "adobeaftereffects", cor: "#9999FF", tags: ["ae", "motion", "animacao", "vfx"] },
  { id: "si:adobelightroom", nome: "Lightroom", categoria: "Design & Criatividade", slug: "adobelightroom", cor: "#31A8FF", tags: ["lr", "foto", "color", "graduacao"] },
  { id: "si:framer", nome: "Framer", categoria: "Design & Criatividade", slug: "framer", cor: "#0055FF", tags: ["site", "prototipo", "web", "design"] },
  { id: "si:webflow", nome: "Webflow", categoria: "Design & Criatividade", slug: "webflow", cor: "#146EF5", tags: ["nocode", "web", "site", "design"] },
  { id: "si:pinterest", nome: "Pinterest", categoria: "Design & Criatividade", slug: "pinterest", cor: "#BD081C", tags: ["boards", "inspiracao", "painel"] },
  { id: "si:unsplash", nome: "Unsplash", categoria: "Design & Criatividade", slug: "unsplash", cor: "#000000", tags: ["fotos", "imagens", "banco", "gratis"] },
  { id: "si:pexels", nome: "Pexels", categoria: "Design & Criatividade", slug: "pexels", cor: "#05A081", tags: ["fotos", "videos", "banco", "stock"] },
  { id: "si:freepik", nome: "Freepik", categoria: "Design & Criatividade", slug: "freepik", cor: "#0D6EFD", tags: ["vetores", "psd", "fotos", "templates"] },
  { id: "si:artstation", nome: "ArtStation", categoria: "Design & Criatividade", slug: "artstation", cor: "#13AFF0", tags: ["concept", "art", "games", "ilustracao"] },
  { id: "si:blender", nome: "Blender", categoria: "Design & Criatividade", slug: "blender", cor: "#E87D0D", tags: ["3d", "render", "animacao", "modelagem"] },
  { id: "si:sketch", nome: "Sketch", categoria: "Design & Criatividade", slug: "sketch", cor: "#FDB300", tags: ["mac", "ui", "ux", "vetor"] },
  { id: "si:googlefonts", nome: "Google Fonts", categoria: "Design & Criatividade", slug: "googlefonts", cor: "#4285F4", tags: ["fontes", "tipografia", "type"] },

  // =========================================================================
  // --- Google & Produtividade ---
  // =========================================================================
  { id: "si:gmail", nome: "Gmail", categoria: "Google & Produtividade", slug: "gmail", cor: "#EA4335", tags: ["email", "google", "correio"] },
  { id: "si:googledrive", nome: "Google Drive", categoria: "Google & Produtividade", slug: "googledrive", cor: "#4285F4", tags: ["drive", "arquivos", "nuvem"] },
  { id: "si:google", nome: "Google", categoria: "Google & Produtividade", slug: "google", cor: "#4285F4", tags: ["busca", "pesquisa", "google"] },
  { id: "si:googlecalendar", nome: "Google Agenda", categoria: "Google & Produtividade", slug: "googlecalendar", cor: "#4285F4", tags: ["agenda", "calendario", "reunioes"] },
  { id: "si:googledocs", nome: "Google Documentos", categoria: "Google & Produtividade", slug: "googledocs", cor: "#4285F4", tags: ["docs", "texto", "editor"] },
  { id: "si:googlesheets", nome: "Google Planilhas", categoria: "Google & Produtividade", slug: "googlesheets", cor: "#34A853", tags: ["sheets", "planilha", "excel"] },
  { id: "si:googleslides", nome: "Google Apresentações", categoria: "Google & Produtividade", slug: "googleslides", cor: "#FBBC04", tags: ["slides", "apresentacao", "powerpoint"] },
  { id: "si:googleforms", nome: "Google Formulários", categoria: "Google & Produtividade", slug: "googleforms", cor: "#7248B9", tags: ["forms", "pesquisa", "formulario"] },
  { id: "si:googlemeet", nome: "Google Meet", categoria: "Google & Produtividade", slug: "googlemeet", cor: "#00897B", tags: ["meet", "videochamada", "reuniao"] },
  { id: "si:googlekeep", nome: "Google Keep", categoria: "Google & Produtividade", slug: "googlekeep", cor: "#FFBB00", tags: ["keep", "notas", "lembretes"] },
  { id: "si:googlemaps", nome: "Google Maps", categoria: "Google & Produtividade", slug: "googlemaps", cor: "#4285F4", tags: ["maps", "rotas", "gps", "mapa"] },
  { id: "si:googlephotos", nome: "Google Fotos", categoria: "Google & Produtividade", slug: "googlephotos", cor: "#4285F4", tags: ["fotos", "backup", "galeria"] },
  { id: "si:googletranslate", nome: "Google Tradutor", categoria: "Google & Produtividade", slug: "googletranslate", cor: "#4285F4", tags: ["tradutor", "idiomas", "translate"] },
  { id: "si:notion", nome: "Notion", categoria: "Google & Produtividade", slug: "notion", cor: "#000000", tags: ["workspace", "notas", "docs", "wiki"] },
  { id: "si:trello", nome: "Trello", categoria: "Google & Produtividade", slug: "trello", cor: "#0052CC", tags: ["kanban", "quadros", "tarefas"] },
  { id: "si:asana", nome: "Asana", categoria: "Google & Produtividade", slug: "asana", cor: "#F06A6A", tags: ["projetos", "gestao", "tarefas"] },
  { id: "si:jira", nome: "Jira", categoria: "Google & Produtividade", slug: "jira", cor: "#0052CC", tags: ["sprints", "tickets", "scrum"] },
  { id: "si:confluence", nome: "Confluence", categoria: "Google & Produtividade", slug: "confluence", cor: "#172B4D", tags: ["wiki", "documentacao", "atlassian"] },
  { id: "si:linear", nome: "Linear", categoria: "Google & Produtividade", slug: "linear", cor: "#5E6AD2", tags: ["issues", "projetos", "dev", "sprints"] },
  { id: "si:clickup", nome: "ClickUp", categoria: "Google & Produtividade", slug: "clickup", cor: "#7B68EE", tags: ["tarefas", "docs", "gestao"] },
  { id: "si:mondaydotcom", nome: "Monday.com", categoria: "Google & Produtividade", slug: "mondaydotcom", cor: "#6161FF", tags: ["workflows", "projetos"] },
  { id: "si:todoist", nome: "Todoist", categoria: "Google & Produtividade", slug: "todoist", cor: "#E44332", tags: ["todo", "listas", "tarefas"] },
  { id: "si:airtable", nome: "Airtable", categoria: "Google & Produtividade", slug: "airtable", cor: "#18BFFF", tags: ["banco", "tabelas", "planilhas"] },
  { id: "si:miro", nome: "Miro", categoria: "Google & Produtividade", slug: "miro", cor: "#050038", tags: ["whiteboard", "lousa", "postit", "brainstorm"] },
  { id: "si:obsidian", nome: "Obsidian", categoria: "Google & Produtividade", slug: "obsidian", cor: "#7C3AED", tags: ["markdown", "notas", "segundo cerebro", "pkm"] },
  { id: "si:evernote", nome: "Evernote", categoria: "Google & Produtividade", slug: "evernote", cor: "#00A82D", tags: ["notas", "caderno", "elefante"] },
  { id: "si:microsoft365", nome: "Microsoft 365", categoria: "Google & Produtividade", slug: "microsoft365", cor: "#D83B01", tags: ["office", "word", "excel", "ms"] },
  { id: "si:microsoftoutlook", nome: "Outlook", categoria: "Google & Produtividade", slug: "microsoftoutlook", cor: "#0078D4", tags: ["email", "calendario", "hotmail"] },
  { id: "si:microsoftexcel", nome: "Excel", categoria: "Google & Produtividade", slug: "microsoftexcel", cor: "#217346", tags: ["planilha", "formulas", "tabelas"] },
  { id: "si:microsoftword", nome: "Word", categoria: "Google & Produtividade", slug: "microsoftword", cor: "#2B579A", tags: ["texto", "documento", "escrita"] },
  { id: "si:microsoftpowerpoint", nome: "PowerPoint", categoria: "Google & Produtividade", slug: "microsoftpowerpoint", cor: "#B7472A", tags: ["apresentacao", "slides"] },
  { id: "si:microsoftonenote", nome: "OneNote", categoria: "Google & Produtividade", slug: "microsoftonenote", cor: "#7719AA", tags: ["notas", "caderno"] },
  { id: "si:microsoftonedrive", nome: "OneDrive", categoria: "Google & Produtividade", slug: "microsoftonedrive", cor: "#0078D4", tags: ["nuvem", "arquivos", "backup"] },
  { id: "si:dropbox", nome: "Dropbox", categoria: "Google & Produtividade", slug: "dropbox", cor: "#0061FF", tags: ["nuvem", "arquivos", "compartilhamento"] },
  { id: "si:loom", nome: "Loom", categoria: "Google & Produtividade", slug: "loom", cor: "#625DF5", tags: ["gravacao", "video", "tela"] },
  { id: "si:calendly", nome: "Calendly", categoria: "Google & Produtividade", slug: "calendly", cor: "#006BFF", tags: ["agendamento", "reunioes", "horarios"] },
  { id: "si:typeform", nome: "Typeform", categoria: "Google & Produtividade", slug: "typeform", cor: "#262627", tags: ["formularios", "pesquisas"] },

  // =========================================================================
  // --- Comunicação ---
  // =========================================================================
  { id: "si:whatsapp", nome: "WhatsApp", categoria: "Comunicação", slug: "whatsapp", cor: "#25D366", tags: ["chat", "mensagens", "conversa"] },
  { id: "si:telegram", nome: "Telegram", categoria: "Comunicação", slug: "telegram", cor: "#26A5E4", tags: ["chat", "canais", "grupos"] },
  { id: "si:discord", nome: "Discord", categoria: "Comunicação", slug: "discord", cor: "#5865F2", tags: ["comunidades", "voz", "servidores"] },
  { id: "si:slack", nome: "Slack", categoria: "Comunicação", slug: "slack", cor: "#4A154B", tags: ["empresa", "trabalho", "chat"] },
  { id: "si:microsoftteams", nome: "Microsoft Teams", categoria: "Comunicação", slug: "microsoftteams", cor: "#6264A7", tags: ["reunioes", "teams", "trabalho"] },
  { id: "si:zoom", nome: "Zoom", categoria: "Comunicação", slug: "zoom", cor: "#0B5CFF", tags: ["videochamada", "webinar", "reuniao"] },
  { id: "si:signal", nome: "Signal", categoria: "Comunicação", slug: "signal", cor: "#3A76F0", tags: ["privacidade", "mensagens", "criptografado"] },
  { id: "si:messenger", nome: "Messenger", categoria: "Comunicação", slug: "messenger", cor: "#00B2FF", tags: ["facebook", "chat"] },
  { id: "si:skype", nome: "Skype", categoria: "Comunicação", slug: "skype", cor: "#00AFF0", tags: ["chamadas", "voip"] },
  { id: "si:googlechat", nome: "Google Chat", categoria: "Comunicação", slug: "googlechat", cor: "#00AC47", tags: ["chat", "hangouts", "google"] },

  // =========================================================================
  // --- Desenvolvimento & IA ---
  // =========================================================================
  { id: "si:openai", nome: "ChatGPT / OpenAI", categoria: "Desenvolvimento & IA", slug: "openai", cor: "#412991", tags: ["chatgpt", "ia", "inteligencia", "gpt"] },
  { id: "si:anthropic", nome: "Claude (Anthropic)", categoria: "Desenvolvimento & IA", slug: "anthropic", cor: "#191919", tags: ["claude", "ia", "sonnet", "opus"] },
  { id: "si:googlegemini", nome: "Google Gemini", categoria: "Desenvolvimento & IA", slug: "googlegemini", cor: "#8E75FF", tags: ["gemini", "bard", "ia", "google"] },
  { id: "si:perplexity", nome: "Perplexity AI", categoria: "Desenvolvimento & IA", slug: "perplexity", cor: "#22B8CD", tags: ["pesquisa", "respostas", "ia"] },
  { id: "si:midjourney", nome: "Midjourney", categoria: "Desenvolvimento & IA", slug: "midjourney", cor: "#000000", tags: ["ia", "imagens", "geracao", "arte"] },
  { id: "si:huggingface", nome: "Hugging Face", categoria: "Desenvolvimento & IA", slug: "huggingface", cor: "#FFD21E", tags: ["modelos", "ia", "open source"] },
  { id: "si:cursor", nome: "Cursor", categoria: "Desenvolvimento & IA", slug: "cursor", cor: "#000000", tags: ["editor", "code", "ia", "ide"] },
  { id: "si:github", nome: "GitHub", categoria: "Desenvolvimento & IA", slug: "github", cor: "#181717", tags: ["git", "repositorio", "codigo", "commits"] },
  { id: "si:gitlab", nome: "GitLab", categoria: "Desenvolvimento & IA", slug: "gitlab", cor: "#FC6D26", tags: ["devops", "ci", "git"] },
  { id: "si:bitbucket", nome: "Bitbucket", categoria: "Desenvolvimento & IA", slug: "bitbucket", cor: "#0052CC", tags: ["git", "atlassian"] },
  { id: "si:stackoverflow", nome: "Stack Overflow", categoria: "Desenvolvimento & IA", slug: "stackoverflow", cor: "#F58025", tags: ["duvidas", "programacao", "respostas"] },
  { id: "si:visualstudiocode", nome: "VS Code", categoria: "Desenvolvimento & IA", slug: "visualstudiocode", cor: "#007ACC", tags: ["editor", "microsoft", "codigo"] },
  { id: "si:replit", nome: "Replit", categoria: "Desenvolvimento & IA", slug: "replit", cor: "#F26207", tags: ["ide", "online", "coding"] },
  { id: "si:vercel", nome: "Vercel", categoria: "Desenvolvimento & IA", slug: "vercel", cor: "#000000", tags: ["deploy", "nextjs", "frontend", "nuvem"] },
  { id: "si:netlify", nome: "Netlify", categoria: "Desenvolvimento & IA", slug: "netlify", cor: "#00C7B7", tags: ["deploy", "jamstack", "hosting"] },
  { id: "si:supabase", nome: "Supabase", categoria: "Desenvolvimento & IA", slug: "supabase", cor: "#3ECF8E", tags: ["postgres", "banco", "backend", "auth"] },
  { id: "si:firebase", nome: "Firebase", categoria: "Desenvolvimento & IA", slug: "firebase", cor: "#DD2C00", tags: ["google", "backend", "realtime"] },
  { id: "si:cloudflare", nome: "Cloudflare", categoria: "Desenvolvimento & IA", slug: "cloudflare", cor: "#F38020", tags: ["dns", "cdn", "seguranca", "workers"] },
  { id: "si:docker", nome: "Docker", categoria: "Desenvolvimento & IA", slug: "docker", cor: "#2496ED", tags: ["containers", "devops", "imagens"] },
  { id: "si:npm", nome: "npm", categoria: "Desenvolvimento & IA", slug: "npm", cor: "#CB3837", tags: ["pacotes", "javascript", "node"] },
  { id: "si:postman", nome: "Postman", categoria: "Desenvolvimento & IA", slug: "postman", cor: "#FF6C37", tags: ["api", "rest", "requisicoes"] },

  // =========================================================================
  // --- Mídia & Música ---
  // =========================================================================
  { id: "si:youtubemusic", nome: "YouTube Music", categoria: "Mídia & Música", slug: "youtubemusic", cor: "#FF0000", tags: ["musica", "streaming", "google"] },
  { id: "si:youtube", nome: "YouTube", categoria: "Mídia & Música", slug: "youtube", cor: "#FF0000", tags: ["videos", "canais", "streaming"] },
  { id: "si:spotify", nome: "Spotify", categoria: "Mídia & Música", slug: "spotify", cor: "#1ED760", tags: ["musica", "playlist", "podcast"] },
  { id: "si:applemusic", nome: "Apple Music", categoria: "Mídia & Música", slug: "applemusic", cor: "#FA243C", tags: ["musica", "apple", "faixas"] },
  { id: "si:deezer", nome: "Deezer", categoria: "Mídia & Música", slug: "deezer", cor: "#A238FF", tags: ["musica", "streaming"] },
  { id: "si:soundcloud", nome: "SoundCloud", categoria: "Mídia & Música", slug: "soundcloud", cor: "#FF5500", tags: ["musica", "indie", "remix", "sets"] },
  { id: "si:bandcamp", nome: "Bandcamp", categoria: "Mídia & Música", slug: "bandcamp", cor: "#408294", tags: ["musica", "artistas", "albuns"] },
  { id: "si:amazonmusic", nome: "Amazon Music", categoria: "Mídia & Música", slug: "amazonmusic", cor: "#00A8E1", tags: ["musica", "amazon", "prime"] },
  { id: "si:tidal", nome: "Tidal", categoria: "Mídia & Música", slug: "tidal", cor: "#000000", tags: ["hifi", "alta fidelidade", "audio"] },
  { id: "si:netflix", nome: "Netflix", categoria: "Mídia & Música", slug: "netflix", cor: "#E50914", tags: ["filmes", "series", "streaming"] },
  { id: "si:primevideo", nome: "Prime Video", categoria: "Mídia & Música", slug: "primevideo", cor: "#00A8E1", tags: ["filmes", "series", "amazon"] },
  { id: "si:disneyplus", nome: "Disney+", categoria: "Mídia & Música", slug: "disneyplus", cor: "#000000", tags: ["disney", "marvel", "star wars"] },
  { id: "si:max", nome: "Max (HBO)", categoria: "Mídia & Música", slug: "max", cor: "#002BE7", tags: ["hbo", "warner", "series"] },
  { id: "si:globoplay", nome: "Globoplay", categoria: "Mídia & Música", slug: "globoplay", cor: "#FB0037", tags: ["novelas", "globo", "aovivo"] },
  { id: "si:twitch", nome: "Twitch", categoria: "Mídia & Música", slug: "twitch", cor: "#9146FF", tags: ["lives", "stream", "games"] },
  { id: "si:crunchyroll", nome: "Crunchyroll", categoria: "Mídia & Música", slug: "crunchyroll", cor: "#F47521", tags: ["animes", "manga", "japao"] },
  { id: "si:vimeo", nome: "Vimeo", categoria: "Mídia & Música", slug: "vimeo", cor: "#1AB7EA", tags: ["video", "portfolio", "filmes"] },
  { id: "si:letterboxd", nome: "Letterboxd", categoria: "Mídia & Música", slug: "letterboxd", cor: "#00D735", tags: ["cinema", "avaliacoes", "filmes"] },

  // =========================================================================
  // --- Redes & Conteúdo ---
  // =========================================================================
  { id: "si:instagram", nome: "Instagram", categoria: "Redes & Conteúdo", slug: "instagram", cor: "#E4405F", tags: ["fotos", "reels", "stories", "feed"] },
  { id: "si:x", nome: "X (antigo Twitter)", categoria: "Redes & Conteúdo", slug: "x", cor: "#000000", tags: ["twitter", "tweets", "posts"] },
  { id: "si:threads", nome: "Threads", categoria: "Redes & Conteúdo", slug: "threads", cor: "#000000", tags: ["instagram", "textos", "conversas"] },
  { id: "si:bluesky", nome: "Bluesky", categoria: "Redes & Conteúdo", slug: "bluesky", cor: "#0285FF", tags: ["rede", "posts", "social", "bsky"] },
  { id: "si:facebook", nome: "Facebook", categoria: "Redes & Conteúdo", slug: "facebook", cor: "#1877F2", tags: ["meta", "grupos", "amigos"] },
  { id: "si:linkedin", nome: "LinkedIn", categoria: "Redes & Conteúdo", slug: "linkedin", cor: "#0A66C2", tags: ["trabalho", "carreira", "profissional"] },
  { id: "si:tiktok", nome: "TikTok", categoria: "Redes & Conteúdo", slug: "tiktok", cor: "#000000", tags: ["videos curtos", "danca", "trends"] },
  { id: "si:reddit", nome: "Reddit", categoria: "Redes & Conteúdo", slug: "reddit", cor: "#FF4500", tags: ["comunidades", "foruns", "subreddits"] },
  { id: "si:medium", nome: "Medium", categoria: "Redes & Conteúdo", slug: "medium", cor: "#000000", tags: ["artigos", "textos", "blogs"] },
  { id: "si:substack", nome: "Substack", categoria: "Redes & Conteúdo", slug: "substack", cor: "#FF6719", tags: ["newsletter", "escrita", "publicacao"] },
  { id: "si:mastodon", nome: "Mastodon", categoria: "Redes & Conteúdo", slug: "mastodon", cor: "#6364FF", tags: ["fediverso", "aberto", "social"] },
  { id: "si:wikipedia", nome: "Wikipedia", categoria: "Redes & Conteúdo", slug: "wikipedia", cor: "#000000", tags: ["enciclopedia", "conhecimento"] },
  { id: "si:tumblr", nome: "Tumblr", categoria: "Redes & Conteúdo", slug: "tumblr", cor: "#36465D", tags: ["blogs", "gifs", "fandom"] },
  { id: "si:devdotto", nome: "Dev.to", categoria: "Redes & Conteúdo", slug: "devdotto", cor: "#0A0A0A", tags: ["dev", "artigos", "programacao"] },
  { id: "si:hashnode", nome: "Hashnode", categoria: "Redes & Conteúdo", slug: "hashnode", cor: "#2962FF", tags: ["blog", "tecnologia", "artigos"] },

  // =========================================================================
  // --- Finanças & Serviços ---
  // =========================================================================
  { id: "si:nubank", nome: "Nubank", categoria: "Finanças & Serviços", slug: "nubank", cor: "#820AD1", tags: ["banco", "roxinho", "cartao", "financas"] },
  { id: "si:mercadolibre", nome: "Mercado Livre", categoria: "Finanças & Serviços", slug: "mercadolibre", cor: "#FFE600", tags: ["compras", "ecommerce", "produtos"] },
  { id: "si:mercadopago", nome: "Mercado Pago", categoria: "Finanças & Serviços", slug: "mercadopago", cor: "#009EE3", tags: ["pagamentos", "pix", "carteira"] },
  { id: "si:amazon", nome: "Amazon", categoria: "Finanças & Serviços", slug: "amazon", cor: "#FF9900", tags: ["loja", "livros", "entregas", "prime"] },
  { id: "si:shopee", nome: "Shopee", categoria: "Finanças & Serviços", slug: "shopee", cor: "#EE4D2D", tags: ["compras", "frete", "loja"] },
  { id: "si:aliexpress", nome: "AliExpress", categoria: "Finanças & Serviços", slug: "aliexpress", cor: "#FF4747", tags: ["importacao", "china", "compras"] },
  { id: "si:shein", nome: "Shein", categoria: "Finanças & Serviços", slug: "shein", cor: "#000000", tags: ["roupas", "moda", "fashion"] },
  { id: "si:ifood", nome: "iFood", categoria: "Finanças & Serviços", slug: "ifood", cor: "#EA1D2C", tags: ["comida", "delivery", "restaurantes"] },
  { id: "si:uber", nome: "Uber", categoria: "Finanças & Serviços", slug: "uber", cor: "#000000", tags: ["corrida", "transporte", "viagem"] },
  { id: "si:picpay", nome: "PicPay", categoria: "Finanças & Serviços", slug: "picpay", cor: "#21C25E", tags: ["pagamentos", "pix", "carteira"] },
  { id: "si:paypal", nome: "PayPal", categoria: "Finanças & Serviços", slug: "paypal", cor: "#00457C", tags: ["pagamentos", "internacional", "dolar"] },
  { id: "si:stripe", nome: "Stripe", categoria: "Finanças & Serviços", slug: "stripe", cor: "#635BFF", tags: ["checkout", "assinaturas", "pagamentos"] },
  { id: "si:apple", nome: "Apple", categoria: "Finanças & Serviços", slug: "apple", cor: "#000000", tags: ["icloud", "mac", "iphone", "loja"] },
  { id: "si:steam", nome: "Steam", categoria: "Finanças & Serviços", slug: "steam", cor: "#000000", tags: ["jogos", "pc", "games", "valve"] },
  { id: "si:playstation", nome: "PlayStation", categoria: "Finanças & Serviços", slug: "playstation", cor: "#003791", tags: ["sony", "ps5", "ps4", "games"] },
  { id: "si:xbox", nome: "Xbox", categoria: "Finanças & Serviços", slug: "xbox", cor: "#107C10", tags: ["microsoft", "gamepass", "jogos"] },
  { id: "si:nintendo", nome: "Nintendo", categoria: "Finanças & Serviços", slug: "nintendo", cor: "#E60012", tags: ["switch", "mario", "zelda"] },
  { id: "si:strava", nome: "Strava", categoria: "Finanças & Serviços", slug: "strava", cor: "#FC4C02", tags: ["corrida", "ciclismo", "esporte", "exercicio"] },
  { id: "si:duolingo", nome: "Duolingo", categoria: "Finanças & Serviços", slug: "duolingo", cor: "#58CC02", tags: ["idiomas", "ingles", "coruja"] },
  { id: "si:airbnb", nome: "Airbnb", categoria: "Finanças & Serviços", slug: "airbnb", cor: "#FF5A5F", tags: ["hospedagem", "viagem", "casas"] },
  { id: "si:bookingdotcom", nome: "Booking.com", categoria: "Finanças & Serviços", slug: "bookingdotcom", cor: "#003580", tags: ["hoteis", "viagens", "reserva"] },

  // Emojis inclusos no catálogo principal
  ...EMOJIS_POPULARES_FAVORITOS,
];

/**
 * Retorna as URLs SVG prioritária e alternativas para um determinado slug do Simple Icons.
 */
export function obterUrlsSimpleIcon(slug: string, cor?: string): string[] {
  const c = cor ? cor.replace("#", "") : "";
  return [
    c ? `https://cdn.simpleicons.org/${slug}/${c}` : `https://cdn.simpleicons.org/${slug}`,
    `https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/${slug}.svg`,
    `https://unpkg.com/simple-icons@v14/icons/${slug}.svg`,
  ];
}

/**
 * Retorna a URL SVG oficial prioritária.
 */
export function obterUrlSimpleIcon(slug: string, cor?: string): string {
  return obterUrlsSimpleIcon(slug, cor)[0];
}

/**
 * Cache local de buscas na API do Iconify para acelerar respostas e economizar requisições.
 */
const cacheBuscaIconify = new Map<string, ItemIconeCatalogo[]>();

/**
 * Busca ícones em tempo real na API pública global do Iconify (mais de 200.000 ícones de todas as bibliotecas).
 */
export async function buscarIconesIconify(
  termo: string,
  limite = 36,
  signal?: AbortSignal,
): Promise<ItemIconeCatalogo[]> {
  const query = termo.trim().toLowerCase();
  if (!query || query.length < 2) return [];

  if (cacheBuscaIconify.has(query)) {
    return cacheBuscaIconify.get(query)!;
  }

  try {
    const url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${limite}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];

    const dados = (await res.json()) as { icons?: string[] };
    if (!dados || !Array.isArray(dados.icons)) return [];

    const itens: ItemIconeCatalogo[] = dados.icons.map((nomeCompleto) => {
      const partes = nomeCompleto.split(":");
      const prefixo = partes[0] || "icon";
      const nomeBase = partes.slice(1).join(":");
      const nomeLegivel = nomeBase
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      return {
        id: `iconify:${nomeCompleto}`,
        nome: `${nomeLegivel} (${prefixo})`,
        categoria: "Genéricos",
        tags: [prefixo, nomeBase, ...nomeBase.split(/[-_]/)],
        provedor: "iconify",
      };
    });

    cacheBuscaIconify.set(query, itens);
    return itens;
  } catch (_e) {
    return [];
  }
}

/**
 * Detecta se uma URL pertence a um serviço famoso que tem logo oficial cadastrado.
 */
export function sugerirIconePorUrl(url: string): string | undefined {
  const u = (url || "").toLowerCase();

  // YouTube Music precisa vir antes de YouTube!
  if (u.includes("music.youtube.com")) return "si:youtubemusic";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "si:youtube";

  if (u.includes("whatsapp.com") || u.includes("wa.me")) return "si:whatsapp";
  if (u.includes("mail.google.com") || u.includes("gmail.com")) return "si:gmail";
  if (u.includes("drive.google.com")) return "si:googledrive";
  if (u.includes("calendar.google.com")) return "si:googlecalendar";
  if (u.includes("docs.google.com/document")) return "si:googledocs";
  if (u.includes("docs.google.com/spreadsheets")) return "si:googlesheets";
  if (u.includes("docs.google.com/presentation")) return "si:googleslides";
  if (u.includes("docs.google.com/forms")) return "si:googleforms";
  if (u.includes("meet.google.com")) return "si:googlemeet";
  if (u.includes("keep.google.com")) return "si:googlekeep";
  if (u.includes("maps.google.com")) return "si:googlemaps";
  if (u.includes("photos.google.com")) return "si:googlephotos";

  if (u.includes("notion.so") || u.includes("notion.site")) return "si:notion";
  if (u.includes("figma.com")) return "si:figma";
  if (u.includes("framer.com")) return "si:framer";
  if (u.includes("webflow.com")) return "si:webflow";
  if (u.includes("bsky.app") || u.includes("bluesky")) return "si:bluesky";
  if (u.includes("github.com")) return "si:github";
  if (u.includes("gitlab.com")) return "si:gitlab";
  if (u.includes("trello.com")) return "si:trello";
  if (u.includes("slack.com")) return "si:slack";
  if (u.includes("discord.com") || u.includes("discord.gg")) return "si:discord";
  if (u.includes("spotify.com")) return "si:spotify";
  if (u.includes("netflix.com")) return "si:netflix";
  if (u.includes("telegram.org") || u.includes("t.me")) return "si:telegram";
  if (u.includes("canva.com")) return "si:canva";
  if (u.includes("dribbble.com")) return "si:dribbble";
  if (u.includes("behance.net")) return "si:behance";
  if (u.includes("chatgpt.com") || u.includes("chat.openai.com")) return "si:openai";
  if (u.includes("claude.ai")) return "si:anthropic";
  if (u.includes("gemini.google.com")) return "si:googlegemini";
  if (u.includes("perplexity.ai")) return "si:perplexity";
  if (u.includes("linear.app")) return "si:linear";
  if (u.includes("miro.com")) return "si:miro";
  if (u.includes("linkedin.com")) return "si:linkedin";
  if (u.includes("instagram.com")) return "si:instagram";
  if (u.includes("x.com") || u.includes("twitter.com")) return "si:x";
  if (u.includes("reddit.com")) return "si:reddit";
  if (u.includes("twitch.tv")) return "si:twitch";
  if (u.includes("mercadolivre") || u.includes("mercadolibre")) return "si:mercadolibre";
  if (u.includes("shopee")) return "si:shopee";
  if (u.includes("amazon")) return "si:amazon";
  if (u.includes("nubank")) return "si:nubank";
  if (u.includes("ifood")) return "si:ifood";
  if (u.includes("airtable.com")) return "si:airtable";
  if (u.includes("cursor.com") || u.includes("cursor.sh")) return "si:cursor";

  return undefined;
}
