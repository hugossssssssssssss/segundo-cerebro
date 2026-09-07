import React, { useState, useMemo, useEffect, useRef } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { lerConfig } from "@/lib/settings";
import { Pencil, Check, RotateCcw, Plus, X, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { RenderizadorIconeItem } from "@/components/ModalSelecionarIconeFavorito";
import { sugerirIconePorUrl } from "@/lib/catalogoIconesMarcas";

/**
 * Interface de um App / Atalho no Launcher
 */
export interface ItemGoogleApp {
  id: string;
  nome: string;
  url: string;
  iconeId?: string;
  tipoEspecial?:
    | "conta"
    | "gmail"
    | "agenda"
    | "notebook"
    | "chrome"
    | "drive"
    | "youtube"
    | "gemini"
    | "maps"
    | "pesquisa"
    | "noticias"
    | "fotos"
    | "meet"
    | "tradutor"
    | "play";
  personalizado?: boolean;
}

export const APPS_PADRAO_GOOGLE: ItemGoogleApp[] = [
  { id: "conta", nome: "Conta", url: "https://myaccount.google.com/", tipoEspecial: "conta" },
  { id: "drive", nome: "Drive", url: "https://drive.google.com/", tipoEspecial: "drive" },
  { id: "gmail", nome: "Gmail", url: "https://mail.google.com/", tipoEspecial: "gmail" },
  { id: "youtube", nome: "YouTube", url: "https://www.youtube.com/", tipoEspecial: "youtube" },
  { id: "gemini", nome: "Gemini", url: "https://gemini.google.com/", tipoEspecial: "gemini" },
  { id: "maps", nome: "Maps", url: "https://maps.google.com/", tipoEspecial: "maps" },
  { id: "pesquisa", nome: "Pesquisa", url: "https://www.google.com/", tipoEspecial: "pesquisa" },
  { id: "agenda", nome: "Agenda", url: "https://calendar.google.com/", tipoEspecial: "agenda" },
  { id: "notebook", nome: "Notebook", url: "https://notebooklm.google.com/", tipoEspecial: "notebook" },
  { id: "chrome", nome: "Chrome", url: "https://www.google.com/chrome/", tipoEspecial: "chrome" },
  { id: "noticias", nome: "Notícias", url: "https://news.google.com/", tipoEspecial: "noticias" },
  { id: "fotos", nome: "Fotos", url: "https://photos.google.com/", tipoEspecial: "fotos" },
  { id: "meet", nome: "Meet", url: "https://meet.google.com/", tipoEspecial: "meet" },
  { id: "tradutor", nome: "Tradutor", url: "https://translate.google.com/", tipoEspecial: "tradutor" },
  { id: "play", nome: "Play", url: "https://play.google.com/", tipoEspecial: "play" },
];

const CHAVE_STORAGE = "klaus_google_apps_favoritos_ordem";

/**
 * SVGs Vetoriais Oficiais Coloridos dos Produtos Google
 */
export function IconesOficiaisGoogleSvg({
  tipo,
  nome,
  avatarUrl,
}: {
  tipo: string;
  nome: string;
  avatarUrl?: string;
}) {
  switch (tipo) {
    case "conta":
      return (
        <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 via-indigo-500 to-pink-500 shadow-xs flex items-center justify-center select-none shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden bg-background flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt={nome} className="w-full h-full object-cover" />
            ) : (
              <span className="font-semibold text-purple-600 dark:text-purple-300 text-sm">
                {nome.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      );

    case "gmail":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M44 38.5V15.5L34 23.5V38.5H44Z" fill="#34A853" />
          <path d="M4 38.5V15.5L14 23.5V38.5H4Z" fill="#4285F4" />
          <path d="M4 15.5L24 30.5L44 15.5V11.5C44 10.4 43.1 9.5 42 9.5H6C4.9 9.5 4 10.4 4 11.5V15.5Z" fill="#EA4335" />
          <path d="M34 23.5L44 15.5V11.5L24 26.5L4 11.5V15.5L14 23.5L24 31L34 23.5Z" fill="#FBBC04" />
          <path d="M34 38.5V23.5L24 31L14 23.5V38.5H34Z" fill="#EA4335" />
        </svg>
      );

    case "agenda":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="6" width="40" height="38" rx="8" fill="#4285F4" />
          <path d="M4 14C4 9.6 7.6 6 12 6H36C40.4 6 44 9.6 44 14V17H4V14Z" fill="#1967D2" />
          <rect x="8" y="19" width="32" height="21" rx="4" fill="white" />
          <text
            x="24"
            y="35"
            textAnchor="middle"
            fill="#1967D2"
            fontSize="16"
            fontWeight="bold"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            31
          </text>
        </svg>
      );

    case "notebook":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="nbOficialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4285F4" />
              <stop offset="50%" stopColor="#8AB4F8" />
              <stop offset="100%" stopColor="#C58AF9" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="36" height="36" rx="10" fill="#E8F0FE" className="dark:fill-slate-800" />
          <circle cx="24" cy="24" r="14" fill="none" stroke="url(#nbOficialGrad)" strokeWidth="3.5" />
          <circle cx="24" cy="24" r="8" fill="none" stroke="#8AB4F8" strokeWidth="2.5" />
          <circle cx="24" cy="24" r="3.5" fill="#4285F4" />
        </svg>
      );

    case "chrome":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="20" fill="#EA4335" />
          <path d="M24 4C33.3 4 41.2 10.3 43.4 19H24L17.5 7.7C19.5 5.3 21.6 4 24 4Z" fill="#EA4335" />
          <path d="M43.4 19C44 20.6 44.4 22.3 44.4 24C44.4 33.7 37.1 41.7 27.6 43.6L34.5 31.7L43.4 19Z" fill="#FBBC04" />
          <path d="M27.6 43.6C26.4 43.9 25.2 44 24 44C13.5 44 4.9 35.9 4.1 25.5L14.7 25.5L27.6 43.6Z" fill="#34A853" />
          <circle cx="24" cy="24" r="9.5" fill="white" />
          <circle cx="24" cy="24" r="7.5" fill="#1A73E8" />
        </svg>
      );

    case "drive":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4.6 37.5L19.5 9.5H36.4L21.5 37.5H4.6Z" fill="#0066DA" />
          <path d="M22.1 37.5L29.9 24L44 37.5H22.1Z" fill="#00AC47" />
          <path d="M14.8 9.5L0 37.5H18.2L33 9.5H14.8Z" fill="#FFBA00" />
          <path d="M36.4 9.5L28.6 23L14.8 9.5H36.4Z" fill="#FFBA00" />
          <path d="M29.5 12L44 37.5H26L11.5 12H29.5Z" fill="#00AC47" />
        </svg>
      );

    case "youtube":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="10" width="40" height="28" rx="8" fill="#FF0000" />
          <path d="M20 18L32 24L20 30V18Z" fill="white" />
        </svg>
      );

    case "gemini":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="geminiLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1BA1E3" />
              <stop offset="35%" stopColor="#5B76F7" />
              <stop offset="70%" stopColor="#9B51E0" />
              <stop offset="100%" stopColor="#E879F9" />
            </linearGradient>
          </defs>
          <path
            d="M24 4C24 15.046 15.046 24 4 24C15.046 24 24 32.954 24 44C24 32.954 32.954 24 44 24C32.954 24 24 15.046 24 4Z"
            fill="url(#geminiLogoGrad)"
          />
        </svg>
      );

    case "maps":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 4C14.6 4 7 11.6 7 21C7 32 21.7 44.2 22.8 45.1C23.5 45.7 24.5 45.7 25.2 45.1C26.3 44.2 41 32 41 21C41 11.6 33.4 4 24 4Z" fill="#EA4335" />
          <path d="M24 4C14.6 4 7 11.6 7 21C7 25.6 9.4 30.2 13 34.2L24 21V4Z" fill="#4285F4" />
          <path d="M24 21L35 34.2C38.6 30.2 41 25.6 41 21C41 11.6 33.4 4 24 4V21Z" fill="#EA4335" />
          <path d="M13 34.2L24 44.5V21L13 34.2Z" fill="#34A853" />
          <path d="M24 44.5L35 34.2L24 21V44.5Z" fill="#FBBC04" />
          <circle cx="24" cy="21" r="6" fill="#1A73E8" />
        </svg>
      );

    case "pesquisa":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M43.6 24.5C43.6 23.1 43.5 21.8 43.3 20.6H24V28.2H35C34.5 30.8 33 32.9 30.8 34.3V39.2H37.3C41.1 35.7 43.6 30.6 43.6 24.5Z" fill="#4285F4" />
          <path d="M24 44.5C29.5 44.5 34.2 42.7 37.3 39.2L30.8 34.3C29 35.5 26.7 36.3 24 36.3C18.7 36.3 14.1 32.7 12.5 27.8H5.8V32.9C9.2 39.8 16.1 44.5 24 44.5Z" fill="#34A853" />
          <path d="M12.5 27.8C12.1 26.6 11.9 25.3 11.9 24C11.9 22.7 12.1 21.4 12.5 20.2V15.1H5.8C4.4 17.8 3.6 20.8 3.6 24C3.6 27.2 4.4 30.2 5.8 32.9L12.5 27.8Z" fill="#FBBC05" />
          <path d="M24 11.7C27 11.7 29.7 12.7 31.8 14.7L37.5 9C34.1 5.9 29.5 4 24 4C16.1 4 9.2 8.7 5.8 15.6L12.5 20.7C14.1 15.8 18.7 11.7 24 11.7Z" fill="#EA4335" />
        </svg>
      );

    case "noticias":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="8" width="36" height="32" rx="6" fill="#4285F4" />
          <rect x="11" y="14" width="26" height="10" rx="2" fill="white" />
          <rect x="11" y="28" width="14" height="2.5" rx="1.25" fill="#E8F0FE" />
          <rect x="11" y="32" width="10" height="2.5" rx="1.25" fill="#E8F0FE" />
          <rect x="29" y="27" width="8" height="7.5" rx="2" fill="#EA4335" />
        </svg>
      );

    case "fotos":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 7C28.4 7 32 10.6 32 15V24H24C19.6 24 16 20.4 16 16C16 11.6 19.6 7 24 7Z" fill="#EA4335" />
          <path d="M41 24C41 28.4 37.4 32 33 32H24V24C24 19.6 27.6 16 32 16C36.4 16 41 19.6 41 24Z" fill="#4285F4" />
          <path d="M24 41C19.6 41 16 37.4 16 33V24H24C28.4 24 32 27.6 32 32C32 36.4 28.4 41 24 41Z" fill="#34A853" />
          <path d="M7 24C7 19.6 10.6 16 15 16H24V24C24 28.4 20.4 32 16 32C11.6 32 7 28.4 7 24Z" fill="#FBBC05" />
        </svg>
      );

    case "meet":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="12" width="24" height="24" rx="5" fill="#00AC47" />
          <path d="M30 19L42 11V37L30 29V19Z" fill="#00832D" />
          <circle cx="18" cy="24" r="4.5" fill="#FFE01B" />
        </svg>
      );

    case "tradutor":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="9" width="26" height="26" rx="6" fill="#4285F4" />
          <text x="19" y="27" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="sans-serif">
            G
          </text>
          <rect x="16" y="18" width="26" height="26" rx="6" fill="#EA4335" />
          <text x="29" y="36" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="sans-serif">
            文
          </text>
        </svg>
      );

    case "play":
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 7L28 24L10 41V7Z" fill="#4285F4" />
          <path d="M34 18L28 24L10 7L34 18Z" fill="#EA4335" />
          <path d="M28 24L34 30L10 41L28 24Z" fill="#00AC47" />
          <path d="M39 24L34 18L28 24L34 30L39 24Z" fill="#FFBA00" />
        </svg>
      );

    default:
      return (
        <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-foreground font-semibold text-sm border border-border/40 shadow-xs shrink-0">
          <Globe size={20} className="text-muted-foreground" />
        </div>
      );
  }
}

/**
 * Renderizador Unificado de Ícone
 */
export function IconeAppLauncher({
  app,
  avatarUrl,
}: {
  app: ItemGoogleApp;
  avatarUrl?: string;
}) {
  // 1. Se tem tipo especial oficial (Gmail, Agenda, NotebookLM, Chrome, etc.)
  if (app.tipoEspecial) {
    return <IconesOficiaisGoogleSvg tipo={app.tipoEspecial} nome={app.nome} avatarUrl={avatarUrl} />;
  }

  // 2. Se tem id no catálogo de marcas de favoritos (ex: si:figma, si:notion, si:github)
  const idCatalogo = app.iconeId || sugerirIconePorUrl(app.url);
  if (idCatalogo) {
    return (
      <div className="w-10 h-10 flex items-center justify-center shrink-0">
        <RenderizadorIconeItem iconeId={idCatalogo} tamanho={34} className="w-8 h-8" />
      </div>
    );
  }

  // 3. Fallback genérico
  return (
    <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-foreground font-semibold text-sm border border-border/40 shadow-xs shrink-0">
      <Globe size={20} className="text-muted-foreground" />
    </div>
  );
}

interface LauncherGoogleAppsProps {
  aoAbrirBuscaWeb?: () => void;
}

/**
 * LauncherGoogleApps — Botão de 9 pontinhos e modal "Seus favoritos"
 * com visual nativo Klaus (tons roxos elegantes), ícones 100% oficiais e Drag & Drop
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
          // Garante que os apps padrão recuperem o tipoEspecial se vierem de versão anterior
          const atualizados = parsed.map((item) => {
            const padrao = APPS_PADRAO_GOOGLE.find((p) => p.id === item.id);
            if (padrao && !item.tipoEspecial) {
              return { ...item, tipoEspecial: padrao.tipoEspecial };
            }
            return item;
          });
          setApps(atualizados);
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
    const iconeSugerido = sugerirIconePorUrl(urlFormatada);
    const novo: ItemGoogleApp = {
      id: `custom_${Date.now()}`,
      nome: novoNome.trim(),
      url: urlFormatada,
      iconeId: iconeSugerido,
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
                ? "bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-300 shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-300"
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
        className="w-[350px] max-w-[94vw] max-h-[82vh] p-0 rounded-[28px] border border-purple-500/20 dark:border-purple-500/30 bg-[#f8f6fd] dark:bg-[#181622] text-foreground shadow-2xl shadow-purple-950/20 flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 backdrop-blur-xl"
      >
        {/* Cabeçalho nativo Klaus */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 select-none">
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground/95">
            Seus favoritos
          </h3>
          <div className="flex items-center gap-2">
            {modoEdicao && (
              <button
                type="button"
                onClick={restaurarPadrao}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-purple-500/10 transition-all cursor-pointer"
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
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/70 dark:hover:bg-purple-900/90 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40"
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
          <div className="mx-5 mb-2 px-3 py-1.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-[11px] flex items-center justify-between text-purple-700 dark:text-purple-300 select-none animate-in fade-in-50">
            <span>Arraste os ícones para reordenar</span>
            <button
              type="button"
              onClick={() => setModalNovoAberto(true)}
              className="text-purple-600 dark:text-purple-300 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Novo Atalho
            </button>
          </div>
        )}

        {/* Modal Clean para Adicionar Novo Atalho */}
        {modalNovoAberto && (
          <div className="mx-5 mb-3 p-3.5 rounded-2xl bg-card border border-purple-500/30 shadow-lg shadow-purple-950/10 animate-in fade-in-0 zoom-in-95">
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
                className="w-full px-2.5 py-1.5 rounded-xl border border-purple-500/20 bg-background text-foreground outline-none focus:ring-1 focus:ring-purple-500"
                required
                autoFocus
              />
              <input
                type="text"
                placeholder="URL (ex: figma.com)"
                value={novaUrl}
                onChange={(e) => setNovaUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-purple-500/20 bg-background text-foreground outline-none focus:ring-1 focus:ring-purple-500"
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
                  className="px-3 py-1 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 cursor-pointer shadow-xs"
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
                    ehDestino && "scale-105 bg-purple-500/15 ring-2 ring-purple-500/40",
                    !sendoArrastado &&
                      !ehDestino &&
                      "hover:bg-purple-500/10 dark:hover:bg-purple-500/15 active:scale-95"
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
                      className="absolute top-0 right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-xs hover:scale-110 transition-transform cursor-pointer z-10"
                      title="Remover"
                    >
                      <X size={10} className="stroke-[3]" />
                    </button>
                  )}

                  {/* Ícone Oficial */}
                  <div className="flex items-center justify-center relative my-0.5 pointer-events-none">
                    <IconeAppLauncher
                      app={app}
                      avatarUrl={app.tipoEspecial === "conta" ? avatarHugo : undefined}
                    />
                  </div>

                  {/* Nome do App */}
                  <span className="text-[12px] font-medium text-foreground/90 group-hover:text-foreground mt-1.5 tracking-tight truncate max-w-full px-0.5 leading-tight pointer-events-none">
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
