export interface ItemIconeCatalogo {
  id: string; // ex: "si:whatsapp" ou "lucide:Star"
  nome: string; // ex: "WhatsApp"
  categoria:
    | "Google & Produtividade"
    | "Comunicação"
    | "Design & Criatividade"
    | "Desenvolvimento"
    | "Mídia & Redes"
    | "Genéricos";
  slug?: string; // slug do Simple Icons
  cor?: string; // cor oficial hexadecimal da marca
  iconeLucide?: string; // nome do componente Lucide se for genérico
}

export const CATEGORIAS_ICONES_MARCAS = [
  "Todos",
  "Google & Produtividade",
  "Comunicação",
  "Design & Criatividade",
  "Desenvolvimento",
  "Mídia & Redes",
  "Genéricos",
] as const;

export type CategoriaIconeMarca = (typeof CATEGORIAS_ICONES_MARCAS)[number];

export const CATALOGO_ICONES_MARCAS: ItemIconeCatalogo[] = [
  // --- Google & Produtividade ---
  {
    id: "si:whatsapp",
    nome: "WhatsApp",
    categoria: "Comunicação",
    slug: "whatsapp",
    cor: "#25D366",
  },
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
    id: "si:linear",
    nome: "Linear",
    categoria: "Google & Produtividade",
    slug: "linear",
    cor: "#5E6AD2",
  },
  {
    id: "si:miro",
    nome: "Miro",
    categoria: "Google & Produtividade",
    slug: "miro",
    cor: "#050038",
  },
  {
    id: "si:microsoftoutlook",
    nome: "Outlook",
    categoria: "Google & Produtividade",
    slug: "microsoftoutlook",
    cor: "#0078D4",
  },
  {
    id: "si:microsoft365",
    nome: "Microsoft 365",
    categoria: "Google & Produtividade",
    slug: "microsoft365",
    cor: "#D83B01",
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

  // --- Comunicação ---
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

  // --- Desenvolvimento ---
  {
    id: "si:github",
    nome: "GitHub",
    categoria: "Desenvolvimento",
    slug: "github",
    cor: "#181717",
  },
  {
    id: "si:gitlab",
    nome: "GitLab",
    categoria: "Desenvolvimento",
    slug: "gitlab",
    cor: "#FC6D26",
  },
  {
    id: "si:stackoverflow",
    nome: "Stack Overflow",
    categoria: "Desenvolvimento",
    slug: "stackoverflow",
    cor: "#F58025",
  },
  {
    id: "si:openai",
    nome: "OpenAI / ChatGPT",
    categoria: "Desenvolvimento",
    slug: "openai",
    cor: "#412991",
  },
  {
    id: "si:anthropic",
    nome: "Anthropic / Claude",
    categoria: "Desenvolvimento",
    slug: "anthropic",
    cor: "#191919",
  },
  {
    id: "si:vercel",
    nome: "Vercel",
    categoria: "Desenvolvimento",
    slug: "vercel",
    cor: "#000000",
  },
  {
    id: "si:netlify",
    nome: "Netlify",
    categoria: "Desenvolvimento",
    slug: "netlify",
    cor: "#00C7B7",
  },
  {
    id: "si:supabase",
    nome: "Supabase",
    categoria: "Desenvolvimento",
    slug: "supabase",
    cor: "#3ECF8E",
  },
  {
    id: "si:firebase",
    nome: "Firebase",
    categoria: "Desenvolvimento",
    slug: "firebase",
    cor: "#DD2C00",
  },
  {
    id: "si:cloudflare",
    nome: "Cloudflare",
    categoria: "Desenvolvimento",
    slug: "cloudflare",
    cor: "#F38020",
  },
  {
    id: "si:visualstudiocode",
    nome: "VS Code",
    categoria: "Desenvolvimento",
    slug: "visualstudiocode",
    cor: "#007ACC",
  },
  {
    id: "si:docker",
    nome: "Docker",
    categoria: "Desenvolvimento",
    slug: "docker",
    cor: "#2496ED",
  },

  // --- Mídia & Redes ---
  {
    id: "si:youtube",
    nome: "YouTube",
    categoria: "Mídia & Redes",
    slug: "youtube",
    cor: "#FF0000",
  },
  {
    id: "si:spotify",
    nome: "Spotify",
    categoria: "Mídia & Redes",
    slug: "spotify",
    cor: "#1ED760",
  },
  {
    id: "si:netflix",
    nome: "Netflix",
    categoria: "Mídia & Redes",
    slug: "netflix",
    cor: "#E50914",
  },
  {
    id: "si:instagram",
    nome: "Instagram",
    categoria: "Mídia & Redes",
    slug: "instagram",
    cor: "#E4405F",
  },
  {
    id: "si:x",
    nome: "X (antigo Twitter)",
    categoria: "Mídia & Redes",
    slug: "x",
    cor: "#000000",
  },
  {
    id: "si:linkedin",
    nome: "LinkedIn",
    categoria: "Mídia & Redes",
    slug: "linkedin",
    cor: "#0A66C2",
  },
  {
    id: "si:reddit",
    nome: "Reddit",
    categoria: "Mídia & Redes",
    slug: "reddit",
    cor: "#FF4500",
  },
  {
    id: "si:twitch",
    nome: "Twitch",
    categoria: "Mídia & Redes",
    slug: "twitch",
    cor: "#9146FF",
  },
  {
    id: "si:tiktok",
    nome: "TikTok",
    categoria: "Mídia & Redes",
    slug: "tiktok",
    cor: "#000000",
  },
  {
    id: "si:facebook",
    nome: "Facebook",
    categoria: "Mídia & Redes",
    slug: "facebook",
    cor: "#1877F2",
  },
  {
    id: "si:threads",
    nome: "Threads",
    categoria: "Mídia & Redes",
    slug: "threads",
    cor: "#000000",
  },
  {
    id: "si:medium",
    nome: "Medium",
    categoria: "Mídia & Redes",
    slug: "medium",
    cor: "#000000",
  },
  {
    id: "si:wikipedia",
    nome: "Wikipedia",
    categoria: "Mídia & Redes",
    slug: "wikipedia",
    cor: "#000000",
  },
  {
    id: "si:amazon",
    nome: "Amazon",
    categoria: "Mídia & Redes",
    slug: "amazon",
    cor: "#FF9900",
  },
  {
    id: "si:mercadolibre",
    nome: "Mercado Livre",
    categoria: "Mídia & Redes",
    slug: "mercadolibre",
    cor: "#FFE600",
  },
  {
    id: "si:apple",
    nome: "Apple",
    categoria: "Mídia & Redes",
    slug: "apple",
    cor: "#000000",
  },
  {
    id: "si:steam",
    nome: "Steam",
    categoria: "Mídia & Redes",
    slug: "steam",
    cor: "#000000",
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
 * Retorna a URL SVG oficial da CDN do Simple Icons para um determinado slug.
 */
export function obterUrlSimpleIcon(slug: string, cor?: string): string {
  const c = cor ? cor.replace("#", "") : "";
  return c ? `https://cdn.simpleicons.org/${slug}/${c}` : `https://cdn.simpleicons.org/${slug}`;
}

/**
 * Detecta se uma URL pertence a um serviço famoso que tem logo oficial cadastrado.
 * Exemplo: web.whatsapp.com -> whatsapp, mail.google.com -> gmail, drive.google.com -> googledrive.
 */
export function sugerirIconePorUrl(url: string): string | undefined {
  const u = (url || "").toLowerCase();
  if (u.includes("whatsapp.com") || u.includes("wa.me")) return "si:whatsapp";
  if (u.includes("mail.google.com") || u.includes("gmail.com")) return "si:gmail";
  if (u.includes("drive.google.com")) return "si:googledrive";
  if (u.includes("calendar.google.com")) return "si:googlecalendar";
  if (u.includes("docs.google.com/document")) return "si:googledocs";
  if (u.includes("docs.google.com/spreadsheets")) return "si:googlesheets";
  if (u.includes("docs.google.com/presentation")) return "si:googleslides";
  if (u.includes("meet.google.com")) return "si:googlemeet";
  if (u.includes("keep.google.com")) return "si:googlekeep";
  if (u.includes("notion.so") || u.includes("notion.site")) return "si:notion";
  if (u.includes("figma.com")) return "si:figma";
  if (u.includes("github.com")) return "si:github";
  if (u.includes("gitlab.com")) return "si:gitlab";
  if (u.includes("trello.com")) return "si:trello";
  if (u.includes("slack.com")) return "si:slack";
  if (u.includes("discord.com") || u.includes("discord.gg")) return "si:discord";
  if (u.includes("spotify.com")) return "si:spotify";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "si:youtube";
  if (u.includes("netflix.com")) return "si:netflix";
  if (u.includes("telegram.org") || u.includes("t.me")) return "si:telegram";
  if (u.includes("canva.com")) return "si:canva";
  if (u.includes("dribbble.com")) return "si:dribbble";
  if (u.includes("behance.net")) return "si:behance";
  if (u.includes("chatgpt.com") || u.includes("chat.openai.com")) return "si:openai";
  if (u.includes("claude.ai")) return "si:anthropic";
  if (u.includes("linear.app")) return "si:linear";
  if (u.includes("miro.com")) return "si:miro";
  if (u.includes("linkedin.com")) return "si:linkedin";
  if (u.includes("instagram.com")) return "si:instagram";
  if (u.includes("x.com") || u.includes("twitter.com")) return "si:x";
  if (u.includes("reddit.com")) return "si:reddit";
  if (u.includes("twitch.tv")) return "si:twitch";
  return undefined;
}
