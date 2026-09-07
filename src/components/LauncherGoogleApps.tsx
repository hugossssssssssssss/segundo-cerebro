import React, { useState, useMemo, useEffect, useRef } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { lerConfig } from "@/lib/settings";
import { Pencil, Check, RotateCcw, Plus, X, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { RenderizadorIconeItem } from "@/components/ModalSelecionarIconeFavorito";
import { sugerirIconePorUrl } from "@/lib/catalogoIconesMarcas";

/**
 * Interface de um App / Atalho no Launcher do Google
 */
export interface ItemGoogleApp {
  id: string;
  nome: string;
  url: string;
  iconeId?: string; // id do catálogo ex: "si:gmail", "si:googledrive"
  tipoEspecial?: "conta";
  personalizado?: boolean;
}

export const APPS_PADRAO_GOOGLE: ItemGoogleApp[] = [
  { id: "conta", nome: "Conta", url: "https://myaccount.google.com/", tipoEspecial: "conta" },
  { id: "drive", nome: "Drive", url: "https://drive.google.com/", iconeId: "si:googledrive" },
  { id: "gmail", nome: "Gmail", url: "https://mail.google.com/", iconeId: "si:gmail" },
  { id: "youtube", nome: "YouTube", url: "https://www.youtube.com/", iconeId: "si:youtube" },
  { id: "gemini", nome: "Gemini", url: "https://gemini.google.com/", iconeId: "si:googlegemini" },
  { id: "maps", nome: "Maps", url: "https://maps.google.com/", iconeId: "si:googlemaps" },
  { id: "pesquisa", nome: "Pesquisa", url: "https://www.google.com/", iconeId: "si:google" },
  { id: "agenda", nome: "Agenda", url: "https://calendar.google.com/", iconeId: "si:googlecalendar" },
  { id: "notebook", nome: "Notebook", url: "https://notebooklm.google.com/", iconeId: "si:googlekeep" },
  { id: "chrome", nome: "Chrome", url: "https://www.google.com/chrome/", iconeId: "si:googlechrome" },
  { id: "noticias", nome: "Notícias", url: "https://news.google.com/", iconeId: "si:googlenews" },
  { id: "fotos", nome: "Fotos", url: "https://photos.google.com/", iconeId: "si:googlephotos" },
  { id: "meet", nome: "Meet", url: "https://meet.google.com/", iconeId: "si:googlemeet" },
  { id: "tradutor", nome: "Tradutor", url: "https://translate.google.com/", iconeId: "si:googletranslate" },
  { id: "play", nome: "Play", url: "https://play.google.com/", iconeId: "si:googleplay" },
];

const CHAVE_STORAGE = "klaus_google_apps_favoritos_ordem";

function extrairDominio(url: string): string {
  try {
    const semProtocolo = url.replace(/^https?:\/\//i, "");
    return semProtocolo.split("/")[0].split("?")[0].split("#")[0];
  } catch {
    return "";
  }
}

/**
 * Renderizador de Ícones Oficiais do Pacote de Favoritos do Klaus
 */
export function IconeAppOficial({
  app,
  avatarUrl,
}: {
  app: ItemGoogleApp;
  avatarUrl?: string;
}) {
  const [erroImagem, setErroImagem] = useState(false);

  // 1. Caso especial: Foto da conta do usuário
  if (app.tipoEspecial === "conta" || app.id === "conta") {
    return (
      <div className="w-11 h-11 rounded-full p-[1.5px] bg-gradient-to-tr from-[#4285F4] via-[#EA4335] to-[#FBBC05] shadow-xs flex items-center justify-center select-none shrink-0">
        <div className="w-full h-full rounded-full overflow-hidden bg-background flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt={app.nome} className="w-full h-full object-cover" />
          ) : (
            <span className="font-semibold text-primary text-sm">
              {app.nome.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    );
  }

  const dominio = extrairDominio(app.url);
  const urlFaviconAltaRes = dominio
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(dominio)}&sz=128`
    : "";

  const idIconeCatalogo = app.iconeId || sugerirIconePorUrl(app.url);

  // Se a imagem direta carregar sem erro, exibe o ícone oficial em alta definição
  if (urlFaviconAltaRes && !erroImagem) {
    return (
      <img
        src={urlFaviconAltaRes}
        alt={app.nome}
        onError={() => setErroImagem(true)}
        className="w-10 h-10 object-contain rounded-xl shrink-0 pointer-events-none transition-transform"
        loading="lazy"
      />
    );
  }

  // Fallback para os ícones do pacote de marcas de favoritos
  if (idIconeCatalogo) {
    return (
      <div className="w-10 h-10 flex items-center justify-center shrink-0">
        <RenderizadorIconeItem iconeId={idIconeCatalogo} tamanho={36} className="w-9 h-9" />
      </div>
    );
  }

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
 * LauncherGoogleApps — Botão de 9 pontinhos e modal "Seus favoritos" estilo Google Apps
 * com reaproveitamento do pacote oficial de ícones de marcas e Drag & Drop clean
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

        {/* Modal Clean para Adicionar Novo Atalho */}
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

                  {/* Ícone Oficial do Pacote de Marcas */}
                  <div className="flex items-center justify-center relative my-0.5 pointer-events-none">
                    <IconeAppOficial
                      app={app}
                      avatarUrl={app.tipoEspecial === "conta" ? avatarHugo : undefined}
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
