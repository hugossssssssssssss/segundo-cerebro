import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Globe,
  Headphones,
  Play,
  Pause,
  VolumeX,
  Music,
  ExternalLink,
} from "lucide-react";
import { BarraFavoritos } from "@/components/BarraFavoritos";
import { LogoKlaus } from "@/components/LogoKlaus";
import { PainelNotificacoesHeader } from "@/components/PainelNotificacoesHeader";
import { CapturaRapida } from "@/components/CapturaRapida";
import { Busca } from "@/components/Busca";
import { ModalBuscaWeb } from "@/components/ModalBuscaWeb";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const LISTA_SONS_AMBIENTE = [
  { id: "chuva", nome: "Chuva Suave", url: "https://actions.google.com/sounds/v1/weather/rain_heavy.ogg" },
  { id: "floresta", nome: "Floresta", url: "https://actions.google.com/sounds/v1/ambiences/forest_birds.ogg" },
  { id: "cafe", nome: "Cafeteria", url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg" },
  { id: "ondas", nome: "Ondas do Mar", url: "https://actions.google.com/sounds/v1/water/waves_crashing.ogg" },
  { id: "fogueira", nome: "Fogueira", url: "https://actions.google.com/sounds/v1/ambiences/fireplace.ogg" },
  { id: "vento", nome: "Vento Suave", url: "https://actions.google.com/sounds/v1/weather/wind_light.ogg" },
];

export default function HeaderHUD() {
  const [capturando, setCapturando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [buscandoWeb, setBuscandoWeb] = useState(false);

  // Sons de fundo
  const [somAmbiente, setSomAmbiente] = useState<string | null>(() => localStorage.getItem("klaus_som_ambiente"));
  const [somAmbienteTocando, setSomAmbienteTocando] = useState(false);
  const [volumeSomAmbiente, setVolumeSomAmbiente] = useState(0.4);
  const [somMenuAberto, setSomMenuAberto] = useState(false);

  // Notifica o frame pai da extensão para expandir altura ao abrir modais
  useEffect(() => {
    const expandir = capturando || buscando || buscandoWeb || somMenuAberto;
    window.parent.postMessage(
      {
        type: "klaus-redimensionar",
        altura: expandir ? 600 : 54,
        expandido: expandir,
      },
      "*"
    );
  }, [capturando, buscando, buscandoWeb, somMenuAberto]);

  return (
    <div className="w-full bg-background/95 backdrop-blur-md border-b border-border text-foreground select-none overflow-visible">
      <div className="flex items-center justify-between px-3.5 sm:px-6 h-13 sm:h-14 gap-2 w-full">
        {/* Lado Esquerdo: Logo do Klaus e Barra de Favoritos */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
          <a
            href="./"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-bold tracking-tight text-sm hover:opacity-90 transition-opacity shrink-0 group cursor-pointer"
            title="Abrir Klaus Segundo Cérebro em nova aba"
          >
            <LogoKlaus tamanho={24} />
            <span className="hidden xs:inline">Klaus</span>
            <ExternalLink size={12} className="text-muted-foreground group-hover:text-foreground transition-colors hidden sm:inline" />
          </a>

          <BarraFavoritos className="flex-1 min-w-0" />
        </div>

        {/* Lado Direito: Ações Rápidas Oficiais do Klaus */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <Tooltip conteudo="Captura rápida" atalho="⌘J">
            <button
              onClick={() => setCapturando(true)}
              className="rounded-lg p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              aria-label="Captura rápida"
            >
              <Plus size={18} />
            </button>
          </Tooltip>

          {/* Som Ambiente */}
          <div className="relative">
            <Tooltip conteudo="Configurações de som ambiente">
              <button
                onClick={() => setSomMenuAberto(!somMenuAberto)}
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

            {somMenuAberto && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Music size={13} className="text-primary" />
                    Som de Fundo
                  </span>
                  <button
                    onClick={() => setSomMenuAberto(false)}
                    className="text-[10px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1">
                    {LISTA_SONS_AMBIENTE.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSomAmbiente(s.id);
                          localStorage.setItem("klaus_som_ambiente", s.id);
                        }}
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

                  <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-1 gap-2">
                    <Tooltip conteudo={somAmbienteTocando ? "Pausar som" : "Tocar som"}>
                      <button
                        onClick={() => setSomAmbienteTocando(!somAmbienteTocando)}
                        className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                        aria-label={somAmbienteTocando ? "Pausar som" : "Tocar som"}
                      >
                        {somAmbienteTocando ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    </Tooltip>

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
                        onClick={() => {
                          setSomAmbiente(null);
                          setSomAmbienteTocando(false);
                          setSomMenuAberto(false);
                          localStorage.removeItem("klaus_som_ambiente");
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

          {/* Notificações */}
          <PainelNotificacoesHeader />

          {/* Busca Web */}
          <Tooltip conteudo="Busca Web Externa">
            <button
              type="button"
              onClick={() => setBuscandoWeb(true)}
              className="rounded-lg p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              aria-label="Busca Web"
            >
              <Globe size={18} />
            </button>
          </Tooltip>

          {/* Busca em tudo */}
          <Tooltip conteudo="Buscar em tudo" atalho="⌘K">
            <button
              onClick={() => setBuscando(true)}
              className="rounded-lg p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              aria-label="Buscar"
            >
              <Search size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Modais Integrados */}
      <CapturaRapida aberta={capturando} aoFechar={() => setCapturando(false)} />
      <Busca aberta={buscando} aoFechar={() => setBuscando(false)} />
      <ModalBuscaWeb aberta={buscandoWeb} aoFechar={() => setBuscandoWeb(false)} />
    </div>
  );
}
