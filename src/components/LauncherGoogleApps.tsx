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
  arquivoSvg?: string; // Caminho do SVG oficial salvo em /assets/google-apps/
  iconeId?: string; // id do catálogo ex: "si:figma"
  tipoEspecial?: "conta";
  personalizado?: boolean;
}

export const APPS_PADRAO_GOOGLE: ItemGoogleApp[] = [
  { id: "conta", nome: "Conta", url: "https://myaccount.google.com/", tipoEspecial: "conta" },
  { id: "drive", nome: "Drive", url: "https://drive.google.com/", arquivoSvg: "drive.svg" },
  { id: "gmail", nome: "Gmail", url: "https://mail.google.com/", arquivoSvg: "gmail.svg" },
  { id: "youtube", nome: "YouTube", url: "https://www.youtube.com/", arquivoSvg: "youtube.svg" },
  { id: "gemini", nome: "Gemini", url: "https://gemini.google.com/", arquivoSvg: "gemini.svg" },
  { id: "maps", nome: "Maps", url: "https://maps.google.com/", arquivoSvg: "maps.svg" },
  { id: "pesquisa", nome: "Pesquisa", url: "https://www.google.com/", arquivoSvg: "pesquisa.svg" },
  { id: "agenda", nome: "Agenda", url: "https://calendar.google.com/", arquivoSvg: "agenda.svg" },
  { id: "notebook", nome: "Notebook", url: "https://notebooklm.google.com/", arquivoSvg: "notebook.svg" },
  { id: "chrome", nome: "Chrome", url: "https://www.google.com/chrome/", arquivoSvg: "chrome.svg" },
  { id: "noticias", nome: "Notícias", url: "https://news.google.com/", arquivoSvg: "news.svg" },
  { id: "fotos", nome: "Fotos", url: "https://photos.google.com/", arquivoSvg: "photos.svg" },
  { id: "meet", nome: "Meet", url: "https://meet.google.com/", arquivoSvg: "meet.svg" },
  { id: "tradutor", nome: "Tradutor", url: "https://translate.google.com/", arquivoSvg: "translate.svg" },
  { id: "play", nome: "Play", url: "https://play.google.com/", arquivoSvg: "play.svg" },
];

const CHAVE_STORAGE = "klaus_google_apps_favoritos_ordem";

/**
 * Renderizador de Ícone com Arquivos SVG Oficiais Reais do Google
 */
export function IconeAppLauncher({
  app,
  avatarUrl,
}: {
  app: ItemGoogleApp;
  avatarUrl?: string;
}) {
  // 1. Conta / Avatar do usuário
  if (app.tipoEspecial === "conta" || app.id === "conta") {
    return (
      <div className="w-11 h-11 rounded-full p-[1.5px] border border-border/80 shadow-xs flex items-center justify-center select-none shrink-0 bg-muted/40">
        <div className="w-full h-full rounded-full overflow-hidden bg-background flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt={app.nome} className="w-full h-full object-cover" />
          ) : (
            <span className="font-semibold text-foreground text-sm">
              {app.nome.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2. Arquivo SVG Oficial do Google (public/assets/google-apps/)
  if (app.arquivoSvg) {
    const base = import.meta.env.BASE_URL || "/";
    const prefixo = base.endsWith("/") ? base : `${base}/`;
    const srcSvg = `${prefixo}assets/google-apps/${app.arquivoSvg}`;
    return (
      <img
        src={srcSvg}
        alt={app.nome}
        className="w-10 h-10 object-contain shrink-0 pointer-events-none transition-transform"
        loading="lazy"
      />
    );
  }

  // 3. Catálogo de Marcas para atalhos personalizados (si:figma, si:notion, etc.)
  const idCatalogo = app.iconeId || sugerirIconePorUrl(app.url);
  if (idCatalogo) {
    return (
      <div className="w-10 h-10 flex items-center justify-center shrink-0">
        <RenderizadorIconeItem iconeId={idCatalogo} tamanho={34} className="w-8 h-8" />
      </div>
    );
  }

  // 4. Fallback genérico
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
 * LauncherGoogleApps — Botão de 9 pontinhos sóbrio e neutro no header,
 * com modal "Seus favoritos", ícones 100% oficiais do Google e Drag & Drop nativo
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

  // Carrega lista salva ou mantém padrão (restaurando arquivoSvg se necessário)
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);
      if (salvo) {
        const parsed: ItemGoogleApp[] = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const atualizados = parsed.map((item) => {
            const padrao = APPS_PADRAO_GOOGLE.find((p) => p.id === item.id);
            if (padrao && !item.arquivoSvg) {
              return { ...item, arquivoSvg: padrao.arquivoSvg, tipoEspecial: padrao.tipoEspecial };
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
              "rounded-lg p-1.5 sm:p-2 transition-colors cursor-pointer flex items-center justify-center",
              aberto
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            aria-label="Google Apps e Favoritos"
          >
            {/* Grade 3x3 de 9 pontinhos Google Waffle sóbrio */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="shrink-0"
            >
              <circle cx="5" cy="5" r="2" />
              <circle cx="12" cy="5" r="2" />
              <circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
              <circle cx="5" cy="19" r="2" />
              <circle cx="12" cy="19" r="2" />
              <circle cx="19" cy="19" r="2" />
            </svg>
          </button>
        </PopoverTrigger>
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[350px] max-w-[94vw] max-h-[82vh] p-0 rounded-[28px] border border-border bg-popover/95 text-foreground shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 backdrop-blur-md"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 select-none">
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
            Seus favoritos
          </h3>
          <div className="flex items-center gap-2">
            {modoEdicao && (
              <button
                type="button"
                onClick={restaurarPadrao}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
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
                  : "bg-secondary hover:bg-accent text-foreground border border-border/60"
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
          <div className="mx-5 mb-2 px-3 py-1.5 rounded-2xl bg-muted/60 border border-border text-[11px] flex items-center justify-between text-muted-foreground select-none animate-in fade-in-50">
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

        {/* Modal Clean para Adicionar Novo Atalho */}
        {modalNovoAberto && (
          <div className="mx-5 mb-3 p-3.5 rounded-2xl bg-card border border-border shadow-lg animate-in fade-in-0 zoom-in-95">
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
                    ehDestino && "scale-105 bg-accent ring-2 ring-primary/40",
                    !sendoArrastado &&
                      !ehDestino &&
                      "hover:bg-accent/70 active:scale-95"
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
