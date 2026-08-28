export interface ItemIconeCatalogo {
  id: string; // ex: "si:youtubemusic" ou "lucide:Star"
  nome: string; // ex: "YouTube Music"
  categoria:
    | "Google & Produtividade"
    | "Comunicação"
    | "Design & Criatividade"
    | "Desenvolvimento & IA"
    | "Mídia & Música"
    | "Redes & Conteúdo"
    | "Finanças & Serviços"
    | "Genéricos";
  slug?: string; // slug do Simple Icons
  cor?: string; // cor oficial hexadecimal da marca
  iconeLucide?: string; // nome do componente Lucide se for genérico
}

export const CATEGORIAS_ICONES_MARCAS = [
  "Todos",
  "Mídia & Música",
  "Google & Produtividade",
  "Comunicação",
  "Design & Criatividade",
  "Desenvolvimento & IA",
  "Redes & Conteúdo",
  "Finanças & Serviços",
  "Genéricos",
] as const;

export type CategoriaIconeMarca = (typeof CATEGORIAS_ICONES_MARCAS)[number];

export const CATALOGO_ICONES_MARCAS: ItemIconeCatalogo[] = [
  // --- Mídia & Música ---
  {
    id: "si:youtubemusic",
    nome: "YouTube Music",
    categoria: "Mídia & Música",
    slug: "youtubemusic",
    cor: "#FF0000",
  },
  {
    id: "si:youtube",
    nome: "YouTube",
    categoria: "Mídia & Música",
    slug: "youtube",
    cor: "#FF0000",
  },
  {
    id: "si:spotify",
    nome: "Spotify",
    categoria: "Mídia & Música",
    slug: "spotify",
    cor: "#1ED760",
  },
  {
    id: "si:applemusic",
    nome: "Apple Music",
    categoria: "Mídia & Música",
    slug: "applemusic",
    cor: "#FA243C",
  },
  {
    id: "si:deezer",
    nome: "Deezer",
    categoria: "Mídia & Música",
    slug: "deezer",
    cor: "#A238FF",
  },
  {
    id: "si:soundcloud",
    nome: "SoundCloud",
    categoria: "Mídia & Música",
    slug: "soundcloud",
    cor: "#FF5500",
  },
  {
    id: "si:amazonmusic",
    nome: "Amazon Music",
    categoria: "Mídia & Música",
    slug: "amazonmusic",
    cor: "#00A8E1",
  },
  {
    id: "si:tidal",
    nome: "Tidal",
    categoria: "Mídia & Música",
    slug: "tidal",
    cor: "#000000",
  },
  {
    id: "si:netflix",
    nome: "Netflix",
    categoria: "Mídia & Música",
    slug: "netflix",
    cor: "#E50914",
  },
  {
    id: "si:primevideo",
    nome: "Prime Video",
    categoria: "Mídia & Música",
    slug: "primevideo",
    cor: "#00A8E1",
  },
  {
    id: "si:disneyplus",
    nome: "Disney+",
    categoria: "Mídia & Música",
    slug: "disneyplus",
    cor: "#000000",
  },
  {
    id: "si:max",
    nome: "Max (HBO)",
    categoria: "Mídia & Música",
    slug: "max",
    cor: "#002BE7",
  },
  {
    id: "si:globoplay",
    nome: "Globoplay",
    categoria: "Mídia & Música",
    slug: "globoplay",
    cor: "#FB0037",
  },
  {
    id: "si:twitch",
    nome: "Twitch",
    categoria: "Mídia & Música",
    slug: "twitch",
    cor: "#9146FF",
  },
  {
    id: "si:crunchyroll",
    nome: "Crunchyroll",
    categoria: "Mídia & Música",
    slug: "crunchyroll",
    cor: "#F47521",
  },
  {
    id: "si:vimeo",
    nome: "Vimeo",
    categoria: "Mídia & Música",
    slug: "vimeo",
    cor: "#1AB7EA",
  },

  // --- Google & Produtividade ---
  {
    id: "si:gmail",
    nome: "Gmail",
    categoria: "Google & Produtividade",
    slug: "gmail",
    cor: "#EA4335",
  },
  {
    id: "si:googledrive",
    nome: "Google Drive",
    categoria: "Google & Produtividade",
    slug: "googledrive",
    cor: "#4285F4",
  },
  {
    id: "si:google",
    nome: "Google",
    categoria: "Google & Produtividade",
    slug: "google",
    cor: "#4285F4",
  },
  {
    id: "si:googlecalendar",
    nome: "Google Agenda",
    categoria: "Google & Produtividade",
    slug: "googlecalendar",
    cor: "#4285F4",
  },
  {
    id: "si:googledocs",
    nome: "Google Documentos",
    categoria: "Google & Produtividade",
    slug: "googledocs",
    cor: "#4285F4",
  },
  {
    id: "si:googlesheets",
    nome: "Google Planilhas",
    categoria: "Google & Produtividade",
    slug: "googlesheets",
    cor: "#34A853",
  },
  {
    id: "si:googleslides",
    nome: "Google Apresentações",
    categoria: "Google & Produtividade",
    slug: "googleslides",
    cor: "#FBBC04",
  },
  {
    id: "si:googleforms",
    nome: "Google Formulários",
    categoria: "Google & Produtividade",
    slug: "googleforms",
    cor: "#7248B9",
  },
  {
    id: "si:googlemeet",
    nome: "Google Meet",
    categoria: "Google & Produtividade",
    slug: "googlemeet",
    cor: "#00897B",
  },
  {
    id: "si:googlekeep",
    nome: "Google Keep",
    categoria: "Google & Produtividade",
    slug: "googlekeep",
    cor: "#FFBB00",
  },
  {
    id: "si:googlemaps",
    nome: "Google Maps",
    categoria: "Google & Produtividade",
    slug: "googlemaps",
    cor: "#4285F4",
  },
  {
    id: "si:googlephotos",
    nome: "Google Fotos",
    categoria: "Google & Produtividade",
    slug: "googlephotos",
    cor: "#4285F4",
  },
  {
    id: "si:googletranslate",
    nome: "Google Tradutor",
    categoria: "Google & Produtividade",
    slug: "googletranslate",
    cor: "#4285F4",
  },
  {
    id: "si:notion",
    nome: "Notion",
    categoria: "Google & Produtividade",
    slug: "notion",
    cor: "#000000",
  },
  {
    id: "si:trello",
    nome: "Trello",
    categoria: "Google & Produtividade",
    slug: "trello",
    cor: "#0052CC",
  },
  {
    id: "si:asana",
    nome: "Asana",
    categoria: "Google & Produtividade",
    slug: "asana",
    cor: "#F06A6A",
  },
  {
    id: "si:jira",
    nome: "Jira",
    categoria: "Google & Produtividade",
    slug: "jira",
    cor: "#0052CC",
  },
  {
    id: "si:confluence",
    nome: "Confluence",
    categoria: "Google & Produtividade",
    slug: "confluence",
    cor: "#172B4D",
  },
  {
    id: "si:linear",
    nome: "Linear",
    categoria: "Google & Produtividade",
    slug: "linear",
    cor: "#5E6AD2",
  },
  {
    id: "si:clickup",
    nome: "ClickUp",
    categoria: "Google & Produtividade",
    slug: "clickup",
    cor: "#7B68EE",
  },
  {
    id: "si:mondaydotcom",
    nome: "Monday.com",
    categoria: "Google & Produtividade",
    slug: "mondaydotcom",
    cor: "#6161FF",
  },
  {
    id: "si:todoist",
    nome: "Todoist",
    categoria: "Google & Produtividade",
    slug: "todoist",
    cor: "#E44332",
  },
  {
    id: "si:miro",
    nome: "Miro",
    categoria: "Google & Produtividade",
    slug: "miro",
    cor: "#050038",
  },
  {
    id: "si:obsidian",
    nome: "Obsidian",
    categoria: "Google & Produtividade",
    slug: "obsidian",
    cor: "#7C3AED",
  },
  {
    id: "si:evernote",
    nome: "Evernote",
    categoria: "Google & Produtividade",
    slug: "evernote",
    cor: "#00A82D",
  },
  {
    id: "si:microsoft365",
    nome: "Microsoft 365",
    categoria: "Google & Produtividade",
    slug: "microsoft365",
    cor: "#D83B01",
  },
  {
    id: "si:microsoftoutlook",
    nome: "Outlook",
    categoria: "Google & Produtividade",
    slug: "microsoftoutlook",
    cor: "#0078D4",
  },
  {
    id: "si:microsoftexcel",
    nome: "Excel",
    categoria: "Google & Produtividade",
    slug: "microsoftexcel",
    cor: "#217346",
  },
  {
    id: "si:microsoftword",
    nome: "Word",
    categoria: "Google & Produtividade",
    slug: "microsoftword",
    cor: "#2B579A",
  },
  {
    id: "si:microsoftpowerpoint",
    nome: "PowerPoint",
    categoria: "Google & Produtividade",
    slug: "microsoftpowerpoint",
    cor: "#B7472A",
  },
  {
    id: "si:microsoftonenote",
    nome: "OneNote",
    categoria: "Google & Produtividade",
    slug: "microsoftonenote",
    cor: "#7719AA",
  },
  {
    id: "si:microsoftonedrive",
    nome: "OneDrive",
    categoria: "Google & Produtividade",
    slug: "microsoftonedrive",
    cor: "#0078D4",
  },
  {
    id: "si:dropbox",
    nome: "Dropbox",
    categoria: "Google & Produtividade",
    slug: "dropbox",
    cor: "#0061FF",
  },
  {
    id: "si:loom",
    nome: "Loom",
    categoria: "Google & Produtividade",
    slug: "loom",
    cor: "#625DF5",
  },
  {
    id: "si:calendly",
    nome: "Calendly",
    categoria: "Google & Produtividade",
    slug: "calendly",
    cor: "#006BFF",
  },
  {
    id: "si:typeform",
    nome: "Typeform",
    categoria: "Google & Produtividade",
    slug: "typeform",
    cor: "#262627",
  },

  // --- Comunicação ---
  {
    id: "si:whatsapp",
    nome: "WhatsApp",
    categoria: "Comunicação",
    slug: "whatsapp",
    cor: "#25D366",
  },
  {
    id: "si:telegram",
    nome: "Telegram",
    categoria: "Comunicação",
    slug: "telegram",
    cor: "#26A5E4",
  },
  {
    id: "si:discord",
    nome: "Discord",
    categoria: "Comunicação",
    slug: "discord",
    cor: "#5865F2",
  },
  {
    id: "si:slack",
    nome: "Slack",
    categoria: "Comunicação",
    slug: "slack",
    cor: "#4A154B",
  },
  {
    id: "si:microsoftteams",
    nome: "Microsoft Teams",
    categoria: "Comunicação",
    slug: "microsoftteams",
    cor: "#6264A7",
  },
  {
    id: "si:zoom",
    nome: "Zoom",
    categoria: "Comunicação",
    slug: "zoom",
    cor: "#0B5CFF",
  },
  {
    id: "si:signal",
    nome: "Signal",
    categoria: "Comunicação",
    slug: "signal",
    cor: "#3A76F0",
  },
  {
    id: "si:messenger",
    nome: "Messenger",
    categoria: "Comunicação",
    slug: "messenger",
    cor: "#00B2FF",
  },
  {
    id: "si:skype",
    nome: "Skype",
    categoria: "Comunicação",
    slug: "skype",
    cor: "#00AFF0",
  },
  {
    id: "si:googlechat",
    nome: "Google Chat",
    categoria: "Comunicação",
    slug: "googlechat",
    cor: "#00AC47",
  },

  // --- Design & Criatividade ---
  {
    id: "si:figma",
    nome: "Figma",
    categoria: "Design & Criatividade",
    slug: "figma",
    cor: "#F24E1E",
  },
  {
    id: "si:canva",
    nome: "Canva",
    categoria: "Design & Criatividade",
    slug: "canva",
    cor: "#00C4CC",
  },
  {
    id: "si:dribbble",
    nome: "Dribbble",
    categoria: "Design & Criatividade",
    slug: "dribbble",
    cor: "#EA4C89",
  },
  {
    id: "si:behance",
    nome: "Behance",
    categoria: "Design & Criatividade",
    slug: "behance",
    cor: "#1769FF",
  },
  {
    id: "si:adobe",
    nome: "Adobe Creative Cloud",
    categoria: "Design & Criatividade",
    slug: "adobe",
    cor: "#FF0000",
  },
  {
    id: "si:adobephotoshop",
    nome: "Photoshop",
    categoria: "Design & Criatividade",
    slug: "adobephotoshop",
    cor: "#31A8FF",
  },
  {
    id: "si:adobeillustrator",
    nome: "Illustrator",
    categoria: "Design & Criatividade",
    slug: "adobeillustrator",
    cor: "#FF9A00",
  },
  {
    id: "si:adobeindesign",
    nome: "InDesign",
    categoria: "Design & Criatividade",
    slug: "adobeindesign",
    cor: "#FF3366",
  },
  {
    id: "si:adobepremierepro",
    nome: "Premiere Pro",
    categoria: "Design & Criatividade",
    slug: "adobepremierepro",
    cor: "#9999FF",
  },
  {
    id: "si:adobeaftereffects",
    nome: "After Effects",
    categoria: "Design & Criatividade",
    slug: "adobeaftereffects",
    cor: "#9999FF",
  },
  {
    id: "si:adobelightroom",
    nome: "Lightroom",
    categoria: "Design & Criatividade",
    slug: "adobelightroom",
    cor: "#31A8FF",
  },
  {
    id: "si:pinterest",
    nome: "Pinterest",
    categoria: "Design & Criatividade",
    slug: "pinterest",
    cor: "#BD081C",
  },
  {
    id: "si:unsplash",
    nome: "Unsplash",
    categoria: "Design & Criatividade",
    slug: "unsplash",
    cor: "#000000",
  },
  {
    id: "si:freepik",
    nome: "Freepik",
    categoria: "Design & Criatividade",
    slug: "freepik",
    cor: "#0D6EFD",
  },
  {
    id: "si:artstation",
    nome: "ArtStation",
    categoria: "Design & Criatividade",
    slug: "artstation",
    cor: "#13AFF0",
  },
  {
    id: "si:blender",
    nome: "Blender",
    categoria: "Design & Criatividade",
    slug: "blender",
    cor: "#E87D0D",
  },
  {
    id: "si:sketch",
    nome: "Sketch",
    categoria: "Design & Criatividade",
    slug: "sketch",
    cor: "#FDB300",
  },

  // --- Desenvolvimento & IA ---
  {
    id: "si:openai",
    nome: "ChatGPT / OpenAI",
    categoria: "Desenvolvimento & IA",
    slug: "openai",
    cor: "#412991",
  },
  {
    id: "si:anthropic",
    nome: "Claude (Anthropic)",
    categoria: "Desenvolvimento & IA",
    slug: "anthropic",
    cor: "#191919",
  },
  {
    id: "si:perplexity",
    nome: "Perplexity AI",
    categoria: "Desenvolvimento & IA",
    slug: "perplexity",
    cor: "#22B8CD",
  },
  {
    id: "si:midjourney",
    nome: "Midjourney",
    categoria: "Desenvolvimento & IA",
    slug: "midjourney",
    cor: "#000000",
  },
  {
    id: "si:github",
    nome: "GitHub",
    categoria: "Desenvolvimento & IA",
    slug: "github",
    cor: "#181717",
  },
  {
    id: "si:gitlab",
    nome: "GitLab",
    categoria: "Desenvolvimento & IA",
    slug: "gitlab",
    cor: "#FC6D26",
  },
  {
    id: "si:bitbucket",
    nome: "Bitbucket",
    categoria: "Desenvolvimento & IA",
    slug: "bitbucket",
    cor: "#0052CC",
  },
  {
    id: "si:stackoverflow",
    nome: "Stack Overflow",
    categoria: "Desenvolvimento & IA",
    slug: "stackoverflow",
    cor: "#F58025",
  },
  {
    id: "si:visualstudiocode",
    nome: "VS Code",
    categoria: "Desenvolvimento & IA",
    slug: "visualstudiocode",
    cor: "#007ACC",
  },
  {
    id: "si:vercel",
    nome: "Vercel",
    categoria: "Desenvolvimento & IA",
    slug: "vercel",
    cor: "#000000",
  },
  {
    id: "si:netlify",
    nome: "Netlify",
    categoria: "Desenvolvimento & IA",
    slug: "netlify",
    cor: "#00C7B7",
  },
  {
    id: "si:supabase",
    nome: "Supabase",
    categoria: "Desenvolvimento & IA",
    slug: "supabase",
    cor: "#3ECF8E",
  },
  {
    id: "si:firebase",
    nome: "Firebase",
    categoria: "Desenvolvimento & IA",
    slug: "firebase",
    cor: "#DD2C00",
  },
  {
    id: "si:cloudflare",
    nome: "Cloudflare",
    categoria: "Desenvolvimento & IA",
    slug: "cloudflare",
    cor: "#F38020",
  },
  {
    id: "si:docker",
    nome: "Docker",
    categoria: "Desenvolvimento & IA",
    slug: "docker",
    cor: "#2496ED",
  },
  {
    id: "si:npm",
    nome: "npm",
    categoria: "Desenvolvimento & IA",
    slug: "npm",
    cor: "#CB3837",
  },
  {
    id: "si:postman",
    nome: "Postman",
    categoria: "Desenvolvimento & IA",
    slug: "postman",
    cor: "#FF6C37",
  },

  // --- Redes & Conteúdo ---
  {
    id: "si:instagram",
    nome: "Instagram",
    categoria: "Redes & Conteúdo",
    slug: "instagram",
    cor: "#E4405F",
  },
  {
    id: "si:x",
    nome: "X (antigo Twitter)",
    categoria: "Redes & Conteúdo",
    slug: "x",
    cor: "#000000",
  },
  {
    id: "si:threads",
    nome: "Threads",
    categoria: "Redes & Conteúdo",
    slug: "threads",
    cor: "#000000",
  },
  {
    id: "si:facebook",
    nome: "Facebook",
    categoria: "Redes & Conteúdo",
    slug: "facebook",
    cor: "#1877F2",
  },
  {
    id: "si:linkedin",
    nome: "LinkedIn",
    categoria: "Redes & Conteúdo",
    slug: "linkedin",
    cor: "#0A66C2",
  },
  {
    id: "si:tiktok",
    nome: "TikTok",
    categoria: "Redes & Conteúdo",
    slug: "tiktok",
    cor: "#000000",
  },
  {
    id: "si:reddit",
    nome: "Reddit",
    categoria: "Redes & Conteúdo",
    slug: "reddit",
    cor: "#FF4500",
  },
  {
    id: "si:medium",
    nome: "Medium",
    categoria: "Redes & Conteúdo",
    slug: "medium",
    cor: "#000000",
  },
  {
    id: "si:substack",
    nome: "Substack",
    categoria: "Redes & Conteúdo",
    slug: "substack",
    cor: "#FF6719",
  },
  {
    id: "si:wikipedia",
    nome: "Wikipedia",
    categoria: "Redes & Conteúdo",
    slug: "wikipedia",
    cor: "#000000",
  },
  {
    id: "si:tumblr",
    nome: "Tumblr",
    categoria: "Redes & Conteúdo",
    slug: "tumblr",
    cor: "#36465D",
  },
  {
    id: "si:devdotto",
    nome: "Dev.to",
    categoria: "Redes & Conteúdo",
    slug: "devdotto",
    cor: "#0A0A0A",
  },
  {
    id: "si:hashnode",
    nome: "Hashnode",
    categoria: "Redes & Conteúdo",
    slug: "hashnode",
    cor: "#2962FF",
  },

  // --- Finanças & Serviços ---
  {
    id: "si:nubank",
    nome: "Nubank",
    categoria: "Finanças & Serviços",
    slug: "nubank",
    cor: "#820AD1",
  },
  {
    id: "si:mercadolibre",
    nome: "Mercado Livre",
    categoria: "Finanças & Serviços",
    slug: "mercadolibre",
    cor: "#FFE600",
  },
  {
    id: "si:mercadopago",
    nome: "Mercado Pago",
    categoria: "Finanças & Serviços",
    slug: "mercadopago",
    cor: "#009EE3",
  },
  {
    id: "si:amazon",
    nome: "Amazon",
    categoria: "Finanças & Serviços",
    slug: "amazon",
    cor: "#FF9900",
  },
  {
    id: "si:shopee",
    nome: "Shopee",
    categoria: "Finanças & Serviços",
    slug: "shopee",
    cor: "#EE4D2D",
  },
  {
    id: "si:aliexpress",
    nome: "AliExpress",
    categoria: "Finanças & Serviços",
    slug: "aliexpress",
    cor: "#FF4747",
  },
  {
    id: "si:shein",
    nome: "Shein",
    categoria: "Finanças & Serviços",
    slug: "shein",
    cor: "#000000",
  },
  {
    id: "si:ifood",
    nome: "iFood",
    categoria: "Finanças & Serviços",
    slug: "ifood",
    cor: "#EA1D2C",
  },
  {
    id: "si:uber",
    nome: "Uber",
    categoria: "Finanças & Serviços",
    slug: "uber",
    cor: "#000000",
  },
  {
    id: "si:picpay",
    nome: "PicPay",
    categoria: "Finanças & Serviços",
    slug: "picpay",
    cor: "#21C25E",
  },
  {
    id: "si:paypal",
    nome: "PayPal",
    categoria: "Finanças & Serviços",
    slug: "paypal",
    cor: "#00457C",
  },
  {
    id: "si:apple",
    nome: "Apple",
    categoria: "Finanças & Serviços",
    slug: "apple",
    cor: "#000000",
  },
  {
    id: "si:steam",
    nome: "Steam",
    categoria: "Finanças & Serviços",
    slug: "steam",
    cor: "#000000",
  },
  {
    id: "si:playstation",
    nome: "PlayStation",
    categoria: "Finanças & Serviços",
    slug: "playstation",
    cor: "#003791",
  },
  {
    id: "si:xbox",
    nome: "Xbox",
    categoria: "Finanças & Serviços",
    slug: "xbox",
    cor: "#107C10",
  },
  {
    id: "si:nintendo",
    nome: "Nintendo",
    categoria: "Finanças & Serviços",
    slug: "nintendo",
    cor: "#E60012",
  },
  {
    id: "si:strava",
    nome: "Strava",
    categoria: "Finanças & Serviços",
    slug: "strava",
    cor: "#FC4C02",
  },
  {
    id: "si:duolingo",
    nome: "Duolingo",
    categoria: "Finanças & Serviços",
    slug: "duolingo",
    cor: "#58CC02",
  },
  {
    id: "si:airbnb",
    nome: "Airbnb",
    categoria: "Finanças & Serviços",
    slug: "airbnb",
    cor: "#FF5A5F",
  },
  {
    id: "si:bookingdotcom",
    nome: "Booking.com",
    categoria: "Finanças & Serviços",
    slug: "bookingdotcom",
    cor: "#003580",
  },

  // --- Genéricos (Lucide) ---
  { id: "lucide:Globe", nome: "Globo", categoria: "Genéricos", iconeLucide: "Globe" },
  { id: "lucide:Bookmark", nome: "Marcador", categoria: "Genéricos", iconeLucide: "Bookmark" },
  { id: "lucide:Star", nome: "Estrela", categoria: "Genéricos", iconeLucide: "Star" },
  { id: "lucide:Heart", nome: "Coração", categoria: "Genéricos", iconeLucide: "Heart" },
  { id: "lucide:Sparkles", nome: "Brilho", categoria: "Genéricos", iconeLucide: "Sparkles" },
  { id: "lucide:Folder", nome: "Pasta", categoria: "Genéricos", iconeLucide: "Folder" },
  { id: "lucide:CheckSquare", nome: "Tarefas", categoria: "Genéricos", iconeLucide: "CheckSquare" },
  { id: "lucide:FileText", nome: "Documento", categoria: "Genéricos", iconeLucide: "FileText" },
  { id: "lucide:Calendar", nome: "Calendário", categoria: "Genéricos", iconeLucide: "Calendar" },
  { id: "lucide:Mail", nome: "E-mail", categoria: "Genéricos", iconeLucide: "Mail" },
  { id: "lucide:Music", nome: "Música", categoria: "Genéricos", iconeLucide: "Music" },
  { id: "lucide:Video", nome: "Vídeo", categoria: "Genéricos", iconeLucide: "Video" },
  { id: "lucide:ShoppingCart", nome: "Compras", categoria: "Genéricos", iconeLucide: "ShoppingCart" },
  { id: "lucide:Code", nome: "Código", categoria: "Genéricos", iconeLucide: "Code" },
  { id: "lucide:Terminal", nome: "Terminal", categoria: "Genéricos", iconeLucide: "Terminal" },
  { id: "lucide:Palette", nome: "Paleta de Cores", categoria: "Genéricos", iconeLucide: "Palette" },
  { id: "lucide:Zap", nome: "Raio / Rápido", categoria: "Genéricos", iconeLucide: "Zap" },
  { id: "lucide:Lock", nome: "Cadeado / Seguro", categoria: "Genéricos", iconeLucide: "Lock" },
  { id: "lucide:Link", nome: "Link", categoria: "Genéricos", iconeLucide: "Link" },
  { id: "lucide:Compass", nome: "Bússola", categoria: "Genéricos", iconeLucide: "Compass" },
];

/**
 * Retorna as URLs SVG prioritária e alternativas para um determinado slug.
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

  return undefined;
}
