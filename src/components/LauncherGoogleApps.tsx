import React, { useState, useMemo, useEffect } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { lerConfig } from "@/lib/settings";
import { Pencil, Check, RotateCcw, Plus, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Interface de um App / Atalho no Launcher do Google
 */
export interface ItemGoogleApp {
  id: string;
  nome: string;
  url: string;
  icone: "conta" | "drive" | "gmail" | "youtube" | "gemini" | "maps" | "pesquisa" | "agenda" | "notebook" | "chrome" | "noticias" | "fotos" | "meet" | "tradutor" | "play" | "custom";
  iconeUrl?: string;
  personalizado?: boolean;
}

const APPS_PADRAO: ItemGoogleApp[] = [
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

const CHAVE_STORAGE = "klaus_google_apps_favoritos";

/**
 * Renderizador de Ícones Vetoriais Oficiais Google
 */
export function IconeGoogleApp({ tipo, nome, avatarUrl }: { tipo: ItemGoogleApp["icone"]; nome: string; avatarUrl?: string }) {
  switch (tipo) {
    case "conta":
      return (
        <div className="w-10 h-10 rounded-full overflow-hidden border border-border/40 shadow-xs flex items-center justify-center bg-primary/10 select-none">
          {avatarUrl ? (
            <img src={avatarUrl} alt={nome} className="w-full h-full object-cover" />
          ) : (
            <span className="font-semibold text-primary text-sm">
              {nome.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
      );

    case "drive":
      return (
        <svg viewBox="0 0 87.3 78" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.6 66.85L38.55 11.5H74.35L42.4 66.85H6.6Z" fill="#0066DA" />
          <path d="M43.65 66.85L59.15 40L87.3 66.85H43.65Z" fill="#00AC47" />
          <path d="M29.1 11.5L58.2 61.9L74.35 66.85L45.25 16.45L29.1 11.5Z" fill="#EA4335" opacity="0" />
          <path d="M74.35 11.5L58.85 38.35L29.1 11.5H74.35Z" fill="#FFBA00" />
          <path d="M0 66.85L15.5 40L43.65 66.85H0Z" fill="#26842A" />
          <path d="M29.1 11.5L0 66.85H35.8L64.9 11.5H29.1Z" fill="#FFBA00" />
          <path d="M87.3 66.85L58.2 16.45L42.7 43.3L71.8 93.7" fill="#00AC47" opacity="0" />
          <path d="M58.2 16.45L87.3 66.85H51.5L22.4 16.45H58.2Z" fill="#00AC47" />
        </svg>
      );

    case "gmail":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 48V21.6L32 36.6L52 21.6V48C52 50.2 50.2 52 48 52H16C13.8 52 12 50.2 12 48Z" fill="#4285F4" opacity="0.15" />
          <path d="M52 16H48V34L52 31V16Z" fill="#DB4437" />
          <path d="M12 16H16V34L12 31V16Z" fill="#DB4437" />
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
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="16" width="48" height="32" rx="10" fill="#FF0000" />
          <path d="M26 24L42 32L26 40V24Z" fill="white" />
        </svg>
      );

    case "gemini":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1BA1E3" />
              <stop offset="35%" stopColor="#5B76F7" />
              <stop offset="70%" stopColor="#9B51E0" />
              <stop offset="100%" stopColor="#E879F9" />
            </linearGradient>
          </defs>
          <path
            d="M32 6C32 20.3589 20.3589 32 6 32C20.3589 32 32 43.6411 32 58C32 43.6411 43.6411 32 58 32C43.6411 32 32 20.3589 32 6Z"
            fill="url(#geminiGrad)"
          />
        </svg>
      );

    case "maps":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 8C20.95 8 12 16.95 12 28C12 41 29.5 54.5 30.5 55.3C31 55.7 32 55.7 32.5 55.3C33.5 54.5 52 41 52 28C52 16.95 43.05 8 32 8Z" fill="#EA4335" />
          <path d="M28 28C28 25.8 29.8 24 32 24C34.2 24 36 25.8 36 28C36 30.2 34.2 32 32 32C29.8 32 28 30.2 28 28Z" fill="#FFFFFF" />
          <path d="M32 8C20.95 8 12 16.95 12 28C12 33.6 14.8 39.2 19 44L32 28V8Z" fill="#4285F4" />
          <path d="M32 28L45 44C49.2 39.2 52 33.6 52 28C52 16.95 43.05 8 32 8V28Z" fill="#EA4335" />
          <path d="M19 44L32 56V28L19 44Z" fill="#34A853" />
          <path d="M32 56L45 44L32 28V56Z" fill="#FBBC04" />
          <circle cx="32" cy="28" r="6" fill="#1A73E8" />
        </svg>
      );

    case "pesquisa":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M54.5 32.5C54.5 30.7 54.3 29 54 27.5H32V36.2H44.7C44.1 39.2 42.4 41.7 39.8 43.4V49.4H47.4C51.8 45.3 54.5 39.5 54.5 32.5Z" fill="#4285F4" />
          <path d="M32 55.5C38.3 55.5 43.6 53.4 47.4 49.4L39.8 43.4C37.8 44.8 35.1 45.7 32 45.7C25.8 45.7 20.6 41.5 18.7 35.8H10.9V42H18.7C22.6 49.8 30.6 55.5 32 55.5Z" fill="#34A853" />
          <path d="M18.7 35.8C18.2 34.3 17.9 32.7 17.9 31C17.9 29.3 18.2 27.7 18.7 26.2V20H10.9C9.3 23.3 8.4 27.1 8.4 31C8.4 34.9 9.3 38.7 10.9 42L18.7 35.8Z" fill="#FBBC05" />
          <path d="M32 16.3C35.5 16.3 38.6 17.5 41 19.8L47.6 13.2C43.6 9.4 38.3 7 32 7C22.6 7 14.6 12.7 10.9 20L18.7 26.2C20.6 20.5 25.8 16.3 32 16.3Z" fill="#EA4335" />
        </svg>
      );

    case "agenda":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="12" width="44" height="44" rx="10" fill="#4285F4" />
          <rect x="10" y="12" width="44" height="14" rx="10" fill="#1A73E8" />
          <rect x="10" y="22" width="44" height="4" fill="#1A73E8" />
          <text x="32" y="44" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="sans-serif">
            31
          </text>
        </svg>
      );

    case "notebook":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="nbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4285F4" />
              <stop offset="100%" stopColor="#8AB4F8" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="22" fill="none" stroke="url(#nbGrad)" strokeWidth="4.5" />
          <circle cx="32" cy="32" r="14" fill="none" stroke="#A8C7FA" strokeWidth="4" />
          <circle cx="32" cy="32" r="6" fill="#1A73E8" />
        </svg>
      );

    case "chrome":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="24" fill="#EA4335" />
          <path d="M32 8C43.2 8 52.6 15.6 55.2 26H32L24 12.1C26.5 9.5 29.1 8 32 8Z" fill="#EA4335" />
          <path d="M55.2 26C56 28 56.4 30.1 56.4 32.3C56.4 44.5 47.2 54.6 35.3 56.1L43.8 41.4L55.2 26Z" fill="#FBBC05" />
          <path d="M35.3 56.1C34.2 56.2 33.1 56.3 32 56.3C19.7 56.3 9.5 47.1 8 35.2L20.2 35.2L35.3 56.1Z" fill="#34A853" />
          <circle cx="32" cy="32" r="12" fill="white" />
          <circle cx="32" cy="32" r="9" fill="#1A73E8" />
        </svg>
      );

    case "noticias":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="14" width="40" height="36" rx="6" fill="#4285F4" />
          <rect x="18" y="22" width="28" height="12" rx="2" fill="white" />
          <rect x="18" y="38" width="16" height="3" rx="1.5" fill="#E8F0FE" />
          <rect x="18" y="43" width="12" height="3" rx="1.5" fill="#E8F0FE" />
          <rect x="38" y="38" width="8" height="8" rx="2" fill="#EA4335" />
        </svg>
      );

    case "fotos":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Petalas do catavento Google Photos */}
          <path d="M32 10C37.5 10 42 14.5 42 20V32H32C26.5 32 22 27.5 22 22C22 16.5 26.5 10 32 10Z" fill="#EA4335" />
          <path d="M54 32C54 37.5 49.5 42 44 42H32V32C32 26.5 36.5 22 42 22C47.5 22 54 26.5 54 32Z" fill="#4285F4" />
          <path d="M32 54C26.5 54 22 49.5 22 44V32H32C37.5 32 42 36.5 42 42C42 47.5 37.5 54 32 54Z" fill="#34A853" />
          <path d="M10 32C10 26.5 14.5 22 20 22H32V32C32 37.5 27.5 42 22 42C16.5 42 10 37.5 10 32Z" fill="#FBBC05" />
        </svg>
      );

    case "meet":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="18" width="28" height="28" rx="6" fill="#00AC47" />
          <path d="M38 27L52 18V46L38 37V27Z" fill="#00832D" />
          <circle cx="24" cy="32" r="5" fill="#FFE01B" />
        </svg>
      );

    case "tradutor":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="14" width="30" height="30" rx="6" fill="#4285F4" />
          <text x="25" y="35" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
            G
          </text>
          <rect x="24" y="24" width="30" height="30" rx="6" fill="#EA4335" />
          <text x="39" y="45" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
            文
          </text>
        </svg>
      );

    case "play":
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 10L36 32L14 54V10Z" fill="#4285F4" />
          <path d="M44 24L36 32L14 10L44 24Z" fill="#EA4335" />
          <path d="M36 32L44 40L14 54L36 32Z" fill="#00AC47" />
          <path d="M50 32L44 24L36 32L44 40L50 32Z" fill="#FFBA00" />
        </svg>
      );

    default:
      return (
        <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-foreground font-medium text-sm border border-border/40">
          {nome.slice(0, 2).toUpperCase()}
        </div>
      );
  }
}

interface LauncherGoogleAppsProps {
  aoAbrirBuscaKlaus?: () => void;
}

/**
 * LauncherGoogleApps — Botão de 9 pontinhos e modal "Seus favoritos" estilo Google Apps
 */
export function LauncherGoogleApps({ aoAbrirBuscaKlaus }: LauncherGoogleAppsProps) {
  const [aberto, setAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [apps, setApps] = useState<ItemGoogleApp[]>(APPS_PADRAO);
  const [novoNome, setNovoNome] = useState("");
  const [novaUrl, setNovaUrl] = useState("");
  const [adicionando, setAdicionando] = useState(false);

  const cfg = useMemo(() => lerConfig(), []);
  const avatarHugo = cfg.repoOwner ? `https://github.com/${cfg.repoOwner}.png` : undefined;

  // Carrega apps customizados se existirem
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setApps(parsed);
        }
      }
    } catch {
      // Ignora erro
    }
  }, []);

  const salvarApps = (novos: ItemGoogleApp[]) => {
    setApps(novos);
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(novos));
    } catch {
      // Ignora erro
    }
  };

  const restaurarPadrao = () => {
    salvarApps(APPS_PADRAO);
    setModoEdicao(false);
  };

  const removerApp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtrados = apps.filter((a) => a.id !== id);
    salvarApps(filtrados);
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
    salvarApps([...apps, novo]);
    setNovoNome("");
    setNovaUrl("");
    setAdicionando(false);
  };

  const clicarApp = (app: ItemGoogleApp) => {
    if (modoEdicao) return;
    setAberto(false);
    if (app.id === "pesquisa" && aoAbrirBuscaKlaus) {
      aoAbrirBuscaKlaus();
      return;
    }
    window.open(app.url, "_blank", "noopener,noreferrer");
  };

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <Tooltip conteudo="Google Apps e Atalhos">
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
            {/* Grade 3x3 de 9 pontinhos */}
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
        className="w-[360px] max-w-[94vw] max-h-[82vh] p-0 rounded-[28px] border border-border/50 bg-[#f0f4f9] dark:bg-[#1e1f20] text-foreground shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95"
      >
        {/* Cabeçalho do Launcher estilo Google */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 select-none">
          <h3 className="text-[17px] font-medium tracking-tight text-foreground/90">
            Seus favoritos
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setModoEdicao(!modoEdicao);
                setAdicionando(false);
              }}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90",
                modoEdicao
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-[#d3e3fd] hover:bg-[#c2d7fb] dark:bg-[#004a77] dark:hover:bg-[#005c94] text-[#041e49] dark:text-[#c2e7ff]"
              )}
              title={modoEdicao ? "Concluir edição" : "Personalizar favoritos"}
              aria-label="Personalizar favoritos"
            >
              {modoEdicao ? <Check size={17} className="stroke-[2.5]" /> : <Pencil size={16} className="stroke-[2.2]" />}
            </button>
          </div>
        </div>

        {/* Corpo com Grid de Apps */}
        <div className="flex-1 overflow-y-auto px-4 pb-5 pt-1 custom-scrollbar">
          {modoEdicao && (
            <div className="mb-3 px-2 py-2 rounded-xl bg-card border border-border/60 text-xs flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Modo de edição ativo</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdicionando(true)}
                  className="text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} /> Adicionar
                </button>
                <button
                  type="button"
                  onClick={restaurarPadrao}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  title="Restaurar apps padrão"
                >
                  <RotateCcw size={13} /> Resetar
                </button>
              </div>
            </div>
          )}

          {/* Form para adicionar novo atalho */}
          {adicionando && (
            <form onSubmit={adicionarApp} className="mb-3 p-3 rounded-2xl bg-card border border-border/70 text-xs space-y-2">
              <div className="font-semibold text-foreground">Novo Atalho</div>
              <input
                type="text"
                placeholder="Nome do app (ex: Figma)"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                required
              />
              <input
                type="text"
                placeholder="URL (ex: figma.com)"
                value={novaUrl}
                onChange={(e) => setNovaUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                required
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAdicionando(false)}
                  className="px-2.5 py-1 rounded-lg text-muted-foreground hover:bg-accent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          )}

          {/* Grade 3 Colunas */}
          <div className="grid grid-cols-3 gap-y-3 gap-x-1">
            {apps.map((app) => (
              <div
                key={app.id}
                onClick={() => clicarApp(app)}
                className={cn(
                  "group flex flex-col items-center justify-start p-2.5 rounded-2xl transition-all text-center select-none relative",
                  modoEdicao
                    ? "bg-card/70 border border-dashed border-border/80"
                    : "hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer active:scale-95"
                )}
                role="button"
                tabIndex={0}
              >
                {/* Botão de excluir no modo edição */}
                {modoEdicao && (
                  <button
                    type="button"
                    onClick={(e) => removerApp(app.id, e)}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-xs hover:scale-110 transition-transform cursor-pointer"
                    title="Remover"
                  >
                    <Trash2 size={11} />
                  </button>
                )}

                {/* Ícone */}
                <div className="flex items-center justify-center relative">
                  <IconeGoogleApp
                    tipo={app.icone}
                    nome={app.nome}
                    avatarUrl={app.icone === "conta" ? avatarHugo : undefined}
                  />
                  {app.personalizado && !modoEdicao && (
                    <ExternalLink size={10} className="absolute -bottom-1 -right-1 text-muted-foreground" />
                  )}
                </div>

                {/* Nome */}
                <span className="text-[12px] font-normal text-foreground/90 group-hover:text-foreground mt-2 tracking-tight truncate max-w-full px-0.5 leading-none">
                  {app.nome}
                </span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
