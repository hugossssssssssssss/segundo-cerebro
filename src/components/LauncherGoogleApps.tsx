import React, { useState, useMemo, useEffect, useRef } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { lerConfig } from "@/lib/settings";
import { Pencil, Check, RotateCcw, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Interface de um App / Atalho no Launcher do Google
 */
export interface ItemGoogleApp {
  id: string;
  nome: string;
  url: string;
  icone:
    | "conta"
    | "drive"
    | "gmail"
    | "youtube"
    | "gemini"
    | "maps"
    | "pesquisa"
    | "agenda"
    | "notebook"
    | "chrome"
    | "noticias"
    | "fotos"
    | "meet"
    | "tradutor"
    | "play"
    | "custom";
  personalizado?: boolean;
}

export const APPS_PADRAO_GOOGLE: ItemGoogleApp[] = [
  { id: "conta", nome: "Conta", url: "https://myaccount.google.com/", icone: "conta" },
  { id: "drive", nome: "Drive", url: "https://drive.google.com/", icone: "drive" },
  { id: "gmail", nome: "Gmail", url: "https://mail.google.com/", icone: "gmail" },
  { id: "youtube", nome: "YouTube", url: "https://www.youtube.com/", icone: "youtube" },
  { id: "gemini", nome: "Gemini", url: "https://gemini.google.com/", icone: "gemini" },
  { id: "maps", nome: "Maps", url: "https://maps.google.com/", icone: "maps" },
  { id: "pesquisa", nome: "Pesquisa", url: "https://www.google.com/", icone: "pesquisa" },
  { id: "agenda", nome: "Agenda", url: "https://calendar.google.com/", icone: "agenda" },
  { id: "notebook", nome: "Notebook", url: "https://notebooklm.google.com/", icone: "notebook" },
  { id: "chrome", nome: "Chrome", url: "https://www.google.com/chrome/", icone: "chrome" },
  { id: "noticias", nome: "Notícias", url: "https://news.google.com/", icone: "noticias" },
  { id: "fotos", nome: "Fotos", url: "https://photos.google.com/", icone: "fotos" },
  { id: "meet", nome: "Meet", url: "https://meet.google.com/", icone: "meet" },
  { id: "tradutor", nome: "Tradutor", url: "https://translate.google.com/", icone: "tradutor" },
  { id: "play", nome: "Play", url: "https://play.google.com/", icone: "play" },
];

const CHAVE_STORAGE = "klaus_google_apps_favoritos_ordem";

/**
 * Ícones Oficiais do Google em SVG de Alta Fidelidade
 */
export function IconeGoogleOficial({
  tipo,
  nome,
  avatarUrl,
}: {
  tipo: ItemGoogleApp["icone"];
  nome: string;
  avatarUrl?: string;
}) {
  switch (tipo) {
    case "conta":
      return (
        <div className="w-11 h-11 rounded-full p-[1.5px] bg-gradient-to-tr from-[#4285F4] via-[#EA4335] to-[#FBBC05] shadow-xs flex items-center justify-center select-none shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden bg-background flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt={nome} className="w-full h-full object-cover" />
            ) : (
              <span className="font-semibold text-primary text-sm">
                {nome.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      );

    case "drive":
      return (
        <svg viewBox="0 0 87.3 78" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.6 66.85L38.55 11.5H74.35L42.4 66.85H6.6Z" fill="#0066DA" />
          <path d="M43.65 66.85L59.15 40L87.3 66.85H43.65Z" fill="#00AC47" />
          <path d="M29.1 11.5L0 66.85H35.8L64.9 11.5H29.1Z" fill="#FFBA00" />
          <path d="M74.35 11.5L58.85 38.35L29.1 11.5H74.35Z" fill="#FFBA00" />
          <path d="M58.2 16.45L87.3 66.85H51.5L22.4 16.45H58.2Z" fill="#00AC47" />
        </svg>
      );

    case "gmail":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 48V21.6L32 36.6L52 21.6V48C52 50.2 50.2 52 48 52H16C13.8 52 12 50.2 12 48Z" fill="#4285F4" opacity="0.12" />
          <path d="M48 12H52C54.2 12 56 13.8 56 16V48C56 50.2 54.2 52 52 52H48V21.6L32 33.6L16 21.6V52H12C9.8 52 8 50.2 8 48V16C8 13.8 9.8 12 12 12H16L32 24L48 12Z" fill="#EA4335" />
          <path d="M8 16C8 13.8 9.8 12 12 12H16V26.4L8 20.4V16Z" fill="#C5221F" />
          <path d="M56 16C56 13.8 54.2 12 52 12H48V26.4L56 20.4V16Z" fill="#C5221F" />
          <path d="M8 48C8 50.2 9.8 52 12 52H16V31L8 25V48Z" fill="#4285F4" />
          <path d="M56 48C56 50.2 54.2 52 52 52H48V31L56 25V48Z" fill="#34A853" />
          <path d="M16 52H48V33.6L32 45.6L16 33.6V52Z" fill="#FBBC05" />
        </svg>
      );

    case "youtube":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="14" width="52" height="36" rx="11" fill="#FF0000" />
          <path d="M26 23L42 32L26 41V23Z" fill="white" />
        </svg>
      );

    case "gemini":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="geminiOfficial" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1BA1E3" />
              <stop offset="35%" stopColor="#5B76F7" />
              <stop offset="70%" stopColor="#9B51E0" />
              <stop offset="100%" stopColor="#F28B82" />
            </linearGradient>
          </defs>
          <path
            d="M32 4C32 19.464 19.464 32 4 32C19.464 32 32 44.536 32 60C32 44.536 44.536 32 60 32C44.536 32 32 19.464 32 4Z"
            fill="url(#geminiOfficial)"
          />
        </svg>
      );

    case "maps":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 6C20.4 6 11 15.4 11 27C11 40.5 29.2 55.4 30.5 56.5C31.4 57.2 32.6 57.2 33.5 56.5C34.8 55.4 53 40.5 53 27C53 15.4 43.6 6 32 6Z" fill="#EA4335" />
          <path d="M32 6C20.4 6 11 15.4 11 27C11 32.8 14 38.6 18.5 43.6L32 27V6Z" fill="#4285F4" />
          <path d="M32 27L45.5 43.6C50 38.6 53 32.8 53 27C53 15.4 43.6 6 32 6V27Z" fill="#EA4335" />
          <path d="M18.5 43.6L32 56.5V27L18.5 43.6Z" fill="#34A853" />
          <path d="M32 56.5L45.5 43.6L32 27V56.5Z" fill="#FBBC04" />
          <circle cx="32" cy="27" r="7.5" fill="#1A73E8" />
        </svg>
      );

    case "pesquisa":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M54.5 32.5C54.5 30.7 54.3 29 54 27.5H32V36.2H44.7C44.1 39.2 42.4 41.7 39.8 43.4V49.4H47.4C51.8 45.3 54.5 39.5 54.5 32.5Z" fill="#4285F4" />
          <path d="M32 55.5C38.3 55.5 43.6 53.4 47.4 49.4L39.8 43.4C37.8 44.8 35.1 45.7 32 45.7C25.8 45.7 20.6 41.5 18.7 35.8H10.9V42H18.7C22.6 49.8 30.6 55.5 32 55.5Z" fill="#34A853" />
          <path d="M18.7 35.8C18.2 34.3 17.9 32.7 17.9 31C17.9 29.3 18.2 27.7 18.7 26.2V20H10.9C9.3 23.3 8.4 27.1 8.4 31C8.4 34.9 9.3 38.7 10.9 42L18.7 35.8Z" fill="#FBBC05" />
          <path d="M32 16.3C35.5 16.3 38.6 17.5 41 19.8L47.6 13.2C43.6 9.4 38.3 7 32 7C22.6 7 14.6 12.7 10.9 20L18.7 26.2C20.6 20.5 25.8 16.3 32 16.3Z" fill="#EA4335" />
        </svg>
      );

    case "agenda":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="10" width="48" height="48" rx="12" fill="#4285F4" />
          <rect x="8" y="10" width="48" height="15" rx="12" fill="#1A73E8" />
          <rect x="8" y="20" width="48" height="5" fill="#1A73E8" />
          <text x="32" y="47" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            31
          </text>
        </svg>
      );

    case "notebook":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="nbOficial" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1A73E8" />
              <stop offset="100%" stopColor="#8AB4F8" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="23" fill="none" stroke="url(#nbOficial)" strokeWidth="4.5" />
          <circle cx="32" cy="32" r="14.5" fill="none" stroke="#A8C7FA" strokeWidth="4" />
          <circle cx="32" cy="32" r="6" fill="#1A73E8" />
        </svg>
      );

    case "chrome":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="25" fill="#EA4335" />
          <path d="M32 7C44.2 7 54.4 15.3 57.2 26.5H32L23 11.2C25.8 8.5 28.8 7 32 7Z" fill="#EA4335" />
          <path d="M57.2 26.5C58.1 28.6 58.5 30.9 58.5 33.3C58.5 46.5 48.5 57.5 35.6 59.1L45.2 42.5L57.2 26.5Z" fill="#FBBC05" />
          <path d="M35.6 59.1C34.4 59.2 33.2 59.3 32 59.3C18.6 59.3 7.6 49.3 6 36.5L19.2 36.5L35.6 59.1Z" fill="#34A853" />
          <circle cx="32" cy="32" r="12.5" fill="white" />
          <circle cx="32" cy="32" r="9.5" fill="#1A73E8" />
        </svg>
      );

    case "noticias":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="12" width="44" height="40" rx="7" fill="#4285F4" />
          <rect x="16" y="20" width="32" height="13" rx="2" fill="white" />
          <rect x="16" y="38" width="18" height="3" rx="1.5" fill="#E8F0FE" />
          <rect x="16" y="43" width="14" height="3" rx="1.5" fill="#E8F0FE" />
          <rect x="38" y="37" width="10" height="9" rx="2" fill="#EA4335" />
        </svg>
      );

    case "fotos":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 9C37.8 9 42.5 13.7 42.5 19.5V32H32C26.2 32 21.5 27.3 21.5 21.5C21.5 15.7 26.2 9 32 9Z" fill="#EA4335" />
          <path d="M55 32C55 37.8 50.3 42.5 44.5 42.5H32V32C32 26.2 36.7 21.5 42.5 21.5C48.3 21.5 55 26.2 55 32Z" fill="#4285F4" />
          <path d="M32 55C26.2 55 21.5 50.3 21.5 44.5V32H32C37.8 32 42.5 36.7 42.5 42.5C42.5 48.3 37.8 55 32 55Z" fill="#34A853" />
          <path d="M9 32C9 26.2 13.7 21.5 19.5 21.5H32V32C32 37.8 27.3 42.5 21.5 42.5C15.7 42.5 9 37.8 9 32Z" fill="#FBBC05" />
        </svg>
      );

    case "meet":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="16" width="32" height="32" rx="7" fill="#00AC47" />
          <path d="M40 26L56 16V48L40 38V26Z" fill="#00832D" />
          <circle cx="24" cy="32" r="6" fill="#FFE01B" />
        </svg>
      );

    case "tradutor":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="12" width="34" height="34" rx="7" fill="#4285F4" />
          <text x="25" y="36" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="sans-serif">
            G
          </text>
          <rect x="22" y="24" width="34" height="34" rx="7" fill="#EA4335" />
          <text x="39" y="48" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="sans-serif">
            文
          </text>
        </svg>
      );

    case "play":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 9L38 32L13 55V9Z" fill="#4285F4" />
          <path d="M46 23.5L38 32L13 9L46 23.5Z" fill="#EA4335" />
          <path d="M38 32L46 40.5L13 55L38 32Z" fill="#00AC47" />
          <path d="M52 32L46 23.5L38 32L46 40.5L52 32Z" fill="#FFBA00" />
        </svg>
      );

    default:
      return (
        <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-foreground font-semibold text-sm border border-border/40 shadow-xs">
          {nome.slice(0, 2).toUpperCase()}
        </div>
      );
  }
}

interface LauncherGoogleAppsProps {
  aoAbrirBuscaWeb?: () => void;
}

/**
 * LauncherGoogleApps — Botão de 9 pontinhos e modal "Seus favoritos" estilo Google Apps
 * com reordenação fluida Drag & Drop nativa e design hiper clean
 */
export function LauncherGoogleApps({ aoAbrirBuscaWeb }: LauncherGoogleAppsProps) {
  const [aberto, setAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [apps, setApps] = useState<ItemGoogleApp[]>(APPS_PADRAO_GOOGLE);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaUrl, setNovaUrl] = useState("");

  // Estado para Drag and Drop
  const [idArrastando, setIdArrastando] = useState<string | null>(null);
  const [idDestinoHover, setIdDestinoHover] = useState<string | null>(null);
  const arrastoAtivoRef = useRef(false);

  const cfg = useMemo(() => lerConfig(), []);
  const avatarHugo = cfg.repoOwner ? `https://github.com/${cfg.repoOwner}.png` : undefined;

  // Carrega lista salva ou mantém padrão
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);
      if (salvo) {
        const parsed: ItemGoogleApp[] = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setApps(parsed);
        }
      }
    } catch {
      // Ignora erro
    }
  }, []);

  const salvarLista = (novos: ItemGoogleApp[]) => {
    setApps(novos);
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(novos));
    } catch {
      // Ignora erro
    }
  };

  const restaurarPadrao = () => {
    salvarLista(APPS_PADRAO_GOOGLE);
    setModoEdicao(false);
  };

  // Reordenação ao arrastar (Drag and Drop nativo)
  const aoIniciarArrasto = (e: React.DragEvent, id: string) => {
    setIdArrastando(id);
    arrastoAtivoRef.current = true;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const aoPassarPorCima = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (idDestinoHover !== id && id !== idArrastando) {
      setIdDestinoHover(id);
    }
  };

  const aoSoltar = (e: React.DragEvent, idDestino: string) => {
    e.preventDefault();
    if (!idArrastando || idArrastando === idDestino) {
      setIdArrastando(null);
      setIdDestinoHover(null);
      return;
    }

    const indexOrigem = apps.findIndex((a) => a.id === idArrastando);
    const indexDestino = apps.findIndex((a) => a.id === idDestino);

    if (indexOrigem !== -1 && indexDestino !== -1) {
      const novaOrdem = [...apps];
      const [removido] = novaOrdem.splice(indexOrigem, 1);
      novaOrdem.splice(indexDestino, 0, removido);
      salvarLista(novaOrdem);
    }

    setIdArrastando(null);
    setIdDestinoHover(null);
    setTimeout(() => {
      arrastoAtivoRef.current = false;
    }, 100);
  };

  const aoFinalizarArrasto = () => {
    setIdArrastando(null);
    setIdDestinoHover(null);
    setTimeout(() => {
      arrastoAtivoRef.current = false;
    }, 100);
  };

  const removerApp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    salvarLista(apps.filter((a) => a.id !== id));
  };

  const adicionarApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novaUrl.trim()) return;
    let urlFormatada = novaUrl.trim();
    if (!/^https?:\/\//i.test(urlFormatada)) {
      urlFormatada = `https://${urlFormatada}`;
    }
    const novo: ItemGoogleApp = {
      id: `custom_${Date.now()}`,
      nome: novoNome.trim(),
      url: urlFormatada,
      icone: "custom",
      personalizado: true,
    };
    salvarLista([...apps, novo]);
    setNovoNome("");
    setNovaUrl("");
    setModalNovoAberto(false);
  };

  const clicarApp = (app: ItemGoogleApp) => {
    if (modoEdicao || arrastoAtivoRef.current) return;
    setAberto(false);
    if (app.id === "pesquisa" && aoAbrirBuscaWeb) {
      aoAbrirBuscaWeb();
      return;
    }
    window.open(app.url, "_blank", "noopener,noreferrer");
  };

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <Tooltip conteudo="Google Apps e Favoritos">
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "rounded-xl p-2 transition-all relative cursor-pointer flex items-center justify-center border",
              aberto
                ? "bg-accent border-border/80 text-foreground shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-accent/80 hover:text-foreground"
            )}
            aria-label="Google Apps e Favoritos"
          >
            {/* Grade 3x3 de 9 pontinhos Google Waffle */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="transition-transform group-hover:scale-105"
            >
              <circle cx="5" cy="5" r="2.2" />
              <circle cx="12" cy="5" r="2.2" />
              <circle cx="19" cy="5" r="2.2" />
              <circle cx="5" cy="12" r="2.2" />
              <circle cx="12" cy="12" r="2.2" />
              <circle cx="19" cy="12" r="2.2" />
              <circle cx="5" cy="19" r="2.2" />
              <circle cx="12" cy="19" r="2.2" />
              <circle cx="19" cy="19" r="2.2" />
            </svg>
          </button>
        </PopoverTrigger>
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[350px] max-w-[94vw] max-h-[82vh] p-0 rounded-[28px] border border-border/50 bg-[#edf2fa] dark:bg-[#1f1f1f] text-foreground shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95"
      >
        {/* Cabeçalho minimalista idêntico ao Google */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 select-none">
          <h3 className="text-[17px] font-medium tracking-tight text-foreground/90">
            Seus favoritos
          </h3>
          <div className="flex items-center gap-2">
            {modoEdicao && (
              <button
                type="button"
                onClick={restaurarPadrao}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                title="Restaurar padrão"
              >
                <RotateCcw size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setModoEdicao(!modoEdicao);
                setModalNovoAberto(false);
              }}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90",
                modoEdicao
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-[#d3e3fd] hover:bg-[#c2d7fb] dark:bg-[#004a77] dark:hover:bg-[#005c94] text-[#041e49] dark:text-[#c2e7ff]"
              )}
              title={modoEdicao ? "Concluir organização" : "Organizar ou personalizar"}
              aria-label="Personalizar favoritos"
            >
              {modoEdicao ? (
                <Check size={16} className="stroke-[2.5]" />
              ) : (
                <Pencil size={15} className="stroke-[2.2]" />
              )}
            </button>
          </div>
        </div>

        {/* Barra de ações rápida no modo edição */}
        {modoEdicao && (
          <div className="mx-5 mb-2 px-3 py-1.5 rounded-2xl bg-card/80 border border-border/50 text-[11px] flex items-center justify-between text-muted-foreground select-none animate-in fade-in-50">
            <span>Arraste os ícones para reordenar</span>
            <button
              type="button"
              onClick={() => setModalNovoAberto(true)}
              className="text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Novo Atalho
            </button>
          </div>
        )}

        {/* Modal / Sheet Clean para Adicionar Novo Atalho */}
        {modalNovoAberto && (
          <div className="mx-5 mb-3 p-3.5 rounded-2xl bg-card border border-border/80 shadow-md animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">Novo Atalho</span>
              <button
                type="button"
                onClick={() => setModalNovoAberto(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
              >
                <X size={14} />
              </button>
            </div>
            <form onSubmit={adicionarApp} className="space-y-2 text-xs">
              <input
                type="text"
                placeholder="Nome (ex: Figma)"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
                required
                autoFocus
              />
              <input
                type="text"
                placeholder="URL (ex: figma.com)"
                value={novaUrl}
                onChange={(e) => setNovaUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
                required
              />
              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-2.5 py-1 rounded-lg text-muted-foreground hover:bg-accent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 cursor-pointer shadow-xs"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Grade de Apps (3 Colunas) com Drag and Drop Suave */}
        <div className="flex-1 overflow-y-auto px-4 pb-5 pt-1 custom-scrollbar">
          <div className="grid grid-cols-3 gap-y-3.5 gap-x-1">
            {apps.map((app) => {
              const sendoArrastado = idArrastando === app.id;
              const ehDestino = idDestinoHover === app.id;

              return (
                <div
                  key={app.id}
                  draggable
                  onDragStart={(e) => aoIniciarArrasto(e, app.id)}
                  onDragOver={(e) => aoPassarPorCima(e, app.id)}
                  onDrop={(e) => aoSoltar(e, app.id)}
                  onDragEnd={aoFinalizarArrasto}
                  onClick={() => clicarApp(app)}
                  className={cn(
                    "group flex flex-col items-center justify-start p-2 rounded-2xl transition-all duration-150 text-center select-none relative cursor-grab active:cursor-grabbing",
                    sendoArrastado && "opacity-30 scale-90",
                    ehDestino && "scale-105 bg-primary/10 ring-2 ring-primary/40",
                    !sendoArrastado &&
                      !ehDestino &&
                      "hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                  )}
                  role="button"
                  tabIndex={0}
                  title={modoEdicao ? `Arraste para mover ${app.nome}` : app.nome}
                >
                  {/* Botão de excluir discreto no modo edição */}
                  {modoEdicao && (
                    <button
                      type="button"
                      onClick={(e) => removerApp(app.id, e)}
                      className="absolute top-0 right-1 h-4 w-4 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center shadow-xs hover:scale-110 transition-transform cursor-pointer z-10"
                      title="Remover"
                    >
                      <X size={10} className="stroke-[3]" />
                    </button>
                  )}

                  {/* Ícone Oficial */}
                  <div className="flex items-center justify-center relative my-0.5 pointer-events-none">
                    <IconeGoogleOficial
                      tipo={app.icone}
                      nome={app.nome}
                      avatarUrl={app.icone === "conta" ? avatarHugo : undefined}
                    />
                  </div>

                  {/* Nome do App */}
                  <span className="text-[12px] font-normal text-foreground/90 group-hover:text-foreground mt-1.5 tracking-tight truncate max-w-full px-0.5 leading-tight pointer-events-none">
                    {app.nome}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
