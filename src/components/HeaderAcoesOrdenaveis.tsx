import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Headphones, Music, Play, Pause, VolumeX } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { PainelNotificacoesHeader } from "@/components/PainelNotificacoesHeader";
import { LauncherGoogleApps } from "@/components/LauncherGoogleApps";
import { useCronometro, LISTA_SONS_AMBIENTE } from "@/components/ContextoCronometro";
import { cn } from "@/lib/utils";

export type IdBotaoHeader = "captura" | "som_ambiente" | "notificacoes" | "google_apps" | "busca";

export const ORDEM_PADRAO_HEADER: IdBotaoHeader[] = [
  "captura",
  "som_ambiente",
  "notificacoes",
  "google_apps",
  "busca",
];

const CHAVE_STORAGE_HEADER_ORDEM = "klaus_header_botoes_ordem";

interface HeaderAcoesOrdenaveisProps {
  onAbrirCaptura: () => void;
  onAbrirBusca: () => void;
  onAbrirBuscaWeb?: () => void;
  // Props opcionais de som para componentes que controlam som localmente
  somAmbiente?: string | null;
  setSomAmbiente?: (som: string | null) => void;
  somAmbienteTocando?: boolean;
  setSomAmbienteTocando?: (tocando: boolean) => void;
  volumeSomAmbiente?: number;
  setVolumeSomAmbiente?: (vol: number) => void;
  somMenuAberto?: boolean;
  setSomMenuAberto?: (aberto: boolean) => void;
  aoNotificar?: boolean;
}

/**
 * HeaderAcoesOrdenaveis — Grupo de ações do cabeçalho com suporte a Drag & Drop nativo
 */
export function HeaderAcoesOrdenaveis({
  onAbrirCaptura,
  onAbrirBusca,
  onAbrirBuscaWeb,
  somAmbiente: somAmbienteProp,
  setSomAmbiente: setSomAmbienteProp,
  somAmbienteTocando: somAmbienteTocandoProp,
  setSomAmbienteTocando: setSomAmbienteTocandoProp,
  volumeSomAmbiente: volumeSomAmbienteProp,
  setVolumeSomAmbiente: setVolumeSomAmbienteProp,
  somMenuAberto: somMenuAbertoProp,
  setSomMenuAberto: setSomMenuAbertoProp,
}: HeaderAcoesOrdenaveisProps) {
  const [ordem, setOrdem] = useState<IdBotaoHeader[]>(ORDEM_PADRAO_HEADER);
  const [idArrastando, setIdArrastando] = useState<IdBotaoHeader | null>(null);
  const [idDestinoHover, setIdDestinoHover] = useState<IdBotaoHeader | null>(null);
  const arrastoAtivoRef = useRef(false);

  // Hook do contexto (fallback se não fornecido via props)
  let contextoCronometro: any = {};
  try {
    contextoCronometro = useCronometro();
  } catch {
    // Sem provedor de contexto
  }

  const somAmbiente = somAmbienteProp !== undefined ? somAmbienteProp : contextoCronometro.somAmbiente;
  const setSomAmbiente = setSomAmbienteProp || contextoCronometro.setSomAmbiente || (() => {});
  const somAmbienteTocando =
    somAmbienteTocandoProp !== undefined ? somAmbienteTocandoProp : contextoCronometro.somAmbienteTocando;
  const setSomAmbienteTocando =
    setSomAmbienteTocandoProp || contextoCronometro.setSomAmbienteTocando || (() => {});
  const volumeSomAmbiente =
    volumeSomAmbienteProp !== undefined ? volumeSomAmbienteProp : contextoCronometro.volumeSomAmbiente ?? 0.5;
  const setVolumeSomAmbiente =
    setVolumeSomAmbienteProp || contextoCronometro.setVolumeSomAmbiente || (() => {});
  const somMenuAberto =
    somMenuAbertoProp !== undefined ? somMenuAbertoProp : contextoCronometro.somMenuAberto;
  const setSomMenuAberto = setSomMenuAbertoProp || contextoCronometro.setSomMenuAberto || (() => {});

  // Carrega ordem salva
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE_HEADER_ORDEM);
      if (salvo) {
        const parsed: IdBotaoHeader[] = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const todosValidos = parsed.filter((id) => ORDEM_PADRAO_HEADER.includes(id));
          const faltantes = ORDEM_PADRAO_HEADER.filter((id) => !todosValidos.includes(id));
          setOrdem([...todosValidos, ...faltantes]);
        }
      }
    } catch {
      // Ignora erro
    }
  }, []);

  const salvarOrdem = (novaOrdem: IdBotaoHeader[]) => {
    setOrdem(novaOrdem);
    try {
      localStorage.setItem(CHAVE_STORAGE_HEADER_ORDEM, JSON.stringify(novaOrdem));
    } catch {
      // Ignora erro
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, id: IdBotaoHeader) => {
    setIdArrastando(id);
    arrastoAtivoRef.current = true;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, id: IdBotaoHeader) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (idDestinoHover !== id && id !== idArrastando) {
      setIdDestinoHover(id);
    }
  };

  const handleDrop = (e: React.DragEvent, idDestino: IdBotaoHeader) => {
    e.preventDefault();
    if (!idArrastando || idArrastando === idDestino) {
      setIdArrastando(null);
      setIdDestinoHover(null);
      return;
    }

    const idxOrigem = ordem.indexOf(idArrastando);
    const idxDestino = ordem.indexOf(idDestino);

    if (idxOrigem !== -1 && idxDestino !== -1) {
      const nova = [...ordem];
      const [removido] = nova.splice(idxOrigem, 1);
      nova.splice(idxDestino, 0, removido);
      salvarOrdem(nova);
    }

    setIdArrastando(null);
    setIdDestinoHover(null);
    setTimeout(() => {
      arrastoAtivoRef.current = false;
    }, 120);
  };

  const handleDragEnd = () => {
    setIdArrastando(null);
    setIdDestinoHover(null);
    setTimeout(() => {
      arrastoAtivoRef.current = false;
    }, 120);
  };

  // Renderizador de cada botão individual
  const renderizarBotao = (id: IdBotaoHeader) => {
    switch (id) {
      case "captura":
        return (
          <Tooltip conteudo="Captura rápida" atalho="⌘J">
            <button
              type="button"
              onClick={() => {
                if (!arrastoAtivoRef.current) onAbrirCaptura();
              }}
              className="rounded-lg p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              aria-label="Captura rápida"
            >
              <Plus size={18} />
            </button>
          </Tooltip>
        );

      case "som_ambiente":
        if (!somAmbiente) return null;
        return (
          <div className="relative">
            <Tooltip conteudo="Configurações de som ambiente">
              <button
                type="button"
                onClick={() => {
                  if (!arrastoAtivoRef.current) setSomMenuAberto(!somMenuAberto);
                }}
                className={cn(
                  "rounded-lg p-1.5 sm:p-2 transition-colors relative flex items-center justify-center cursor-pointer",
                  somAmbienteTocando
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                aria-label="Controle de áudio"
              >
                <Headphones size={18} className={somAmbienteTocando ? "animate-pulse" : ""} />
                {somAmbienteTocando && (
                  <span className="absolute bottom-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </button>
            </Tooltip>

            {/* Menu suspenso de áudio */}
            {somMenuAberto && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Music size={13} className="text-primary" />
                    Som de Fundo
                  </span>
                  <button
                    type="button"
                    onClick={() => setSomMenuAberto(false)}
                    className="text-[10px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Seletor rápido de sons */}
                  <div className="grid grid-cols-2 gap-1">
                    {LISTA_SONS_AMBIENTE.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSomAmbiente(s.id)}
                        className={cn(
                          "text-[11px] px-2 py-1 rounded-md text-left truncate transition-colors cursor-pointer",
                          somAmbiente === s.id
                            ? "bg-primary/15 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {s.nome}
                      </button>
                    ))}
                  </div>

                  {/* Controles de Play/Pause/Volume */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-1 gap-2">
                    <Tooltip conteudo={somAmbienteTocando ? "Pausar som" : "Tocar som"}>
                      <button
                        type="button"
                        onClick={() => setSomAmbienteTocando(!somAmbienteTocando)}
                        className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                        aria-label={somAmbienteTocando ? "Pausar som" : "Tocar som"}
                      >
                        {somAmbienteTocando ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    </Tooltip>

                    {/* Slider de volume */}
                    <div className="flex-1 flex items-center gap-1.5">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volumeSomAmbiente}
                        onChange={(e) => setVolumeSomAmbiente(Number(e.target.value))}
                        className="w-full accent-primary h-1 rounded bg-secondary appearance-none cursor-pointer"
                        aria-label="Volume"
                      />
                      <span className="text-[10px] font-mono text-muted-foreground w-6 text-right select-none">
                        {Math.round(volumeSomAmbiente * 100)}%
                      </span>
                    </div>

                    <Tooltip conteudo="Desligar e fechar áudio">
                      <button
                        type="button"
                        onClick={() => {
                          setSomAmbiente(null);
                          setSomMenuAberto(false);
                        }}
                        className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        aria-label="Desligar e fechar"
                      >
                        <VolumeX size={14} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "notificacoes":
        return <PainelNotificacoesHeader />;

      case "google_apps":
        return <LauncherGoogleApps aoAbrirBuscaWeb={onAbrirBuscaWeb} />;

      case "busca":
        return (
          <Tooltip conteudo="Buscar em tudo" atalho="⌘K">
            <button
              type="button"
              onClick={() => {
                if (!arrastoAtivoRef.current) onAbrirBusca();
              }}
              className="rounded-lg p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              aria-label="Buscar"
            >
              <Search size={18} />
            </button>
          </Tooltip>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
      {ordem.map((id) => {
        if (id === "som_ambiente" && !somAmbiente) return null;

        const sendoArrastado = idArrastando === id;
        const ehDestino = idDestinoHover === id;

        return (
          <div
            key={id}
            draggable
            onDragStart={(e) => handleDragStart(e, id)}
            onDragOver={(e) => handleDragOver(e, id)}
            onDrop={(e) => handleDrop(e, id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "transition-all duration-150 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing",
              sendoArrastado && "opacity-30 scale-90",
              ehDestino && "bg-accent scale-105 ring-1 ring-border"
            )}
            title="Arraste para mudar a posição"
          >
            {renderizarBotao(id)}
          </div>
        );
      })}
    </div>
  );
}
