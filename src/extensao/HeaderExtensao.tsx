import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Headphones,
  Play,
  Pause,
  VolumeX,
  Music,
  ExternalLink,
  Pin,
  Check,
  X,
  FileText,
  CheckSquare,
  Image as ImageIcon,
} from "lucide-react";
import { BarraFavoritos } from "@/components/BarraFavoritos";
import { LogoKlaus } from "@/components/LogoKlaus";
import { Tooltip } from "@/components/ui/tooltip";
import { lerConfig } from "@/lib/settings";
import { useSalvar } from "@/lib/useSalvar";
import { cn } from "@/lib/utils";

const LISTA_SONS_AMBIENTE = [
  { id: "chuva", nome: "Chuva Suave", url: "https://actions.google.com/sounds/v1/weather/rain_heavy.ogg" },
  { id: "floresta", nome: "Floresta", url: "https://actions.google.com/sounds/v1/ambiences/forest_birds.ogg" },
  { id: "cafe", nome: "Cafeteria", url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg" },
  { id: "ondas", nome: "Ondas do Mar", url: "https://actions.google.com/sounds/v1/water/waves_crashing.ogg" },
  { id: "fogueira", nome: "Fogueira", url: "https://actions.google.com/sounds/v1/ambiences/fireplace.ogg" },
  { id: "vento", nome: "Vento Suave", url: "https://actions.google.com/sounds/v1/weather/wind_light.ogg" },
];

export function HeaderExtensao({
  estaFixado,
  aoAlternarFixar,
  onModalStateChange,
}: {
  estaFixado: boolean;
  aoAlternarFixar: () => void;
  onModalStateChange: (aberto: boolean) => void;
}) {
  const cfg = lerConfig();
  const { salvarTexto } = useSalvar(cfg);

  // Estados dos Modais
  const [modalCapturaAberto, setModalCapturaAberto] = useState(false);
  const [modalBuscaAberto, setModalBuscaAberto] = useState(false);

  // Dados da Captura
  const [tipoDestino, setTipoDestino] = useState<"referencias" | "notas" | "tarefas">("referencias");
  const [tituloCaptura, setTituloCaptura] = useState("");
  const [corpoCaptura, setCorpoCaptura] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvoSucesso, setSalvoSucesso] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");

  // Som Ambiente
  const [somAmbiente, setSomAmbiente] = useState<string | null>(() => localStorage.getItem("klaus_som_ambiente"));
  const [somAmbienteTocando, setSomAmbienteTocando] = useState(false);
  const [volumeSomAmbiente, setVolumeSomAmbiente] = useState(0.4);
  const [somMenuAberto, setSomMenuAberto] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Notifica o wrapper sobre abertura de modais para manter a barra visível
  useEffect(() => {
    const aberto = modalCapturaAberto || modalBuscaAberto || somMenuAberto;
    onModalStateChange(aberto);
  }, [modalCapturaAberto, modalBuscaAberto, somMenuAberto, onModalStateChange]);

  // Gerenciamento do Áudio
  useEffect(() => {
    if (!somAmbiente || !somAmbienteTocando) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }
    const itemSom = LISTA_SONS_AMBIENTE.find((s) => s.id === somAmbiente);
    if (itemSom) {
      if (!audioRef.current) {
        audioRef.current = new Audio(itemSom.url);
        audioRef.current.loop = true;
      } else {
        audioRef.current.src = itemSom.url;
      }
      audioRef.current.volume = volumeSomAmbiente;
      audioRef.current.play().catch(() => {});
    }
  }, [somAmbiente, somAmbienteTocando]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volumeSomAmbiente;
    }
  }, [volumeSomAmbiente]);

  // Função para abrir captura rápida com o contexto real da página atual
  const abrirCapturaContextual = () => {
    const tituloDoc = document.title || "Referência da Web";
    const urlDoc = typeof window !== "undefined" ? window.location.href || "" : "";
    const selecao = typeof window !== "undefined" && window.getSelection ? window.getSelection()?.toString().trim() || "" : "";
    const metaDesc =
      (typeof document !== "undefined" && (
        document.querySelector('meta[name="description"]')?.getAttribute("content") ||
        document.querySelector('meta[property="og:description"]')?.getAttribute("content")
      )) || "";

    setTituloCaptura(tituloDoc);
    setTipoDestino("referencias");

    const hoje = new Date().toISOString().slice(0, 10);
    const corpoInicial = `---
titulo: "${tituloDoc.replace(/"/g, '\\"')}"
data: ${hoje}
url: "${urlDoc}"
tipo: referencia
tags:
  - web-clipper
---

# ${tituloDoc}

> **Fonte:** [${urlDoc}](${urlDoc})
> **Capturado em:** ${hoje}

${selecao ? `### Citação Selecionada:\n> ${selecao}\n\n` : ""}${metaDesc ? `### Resumo:\n${metaDesc}\n` : ""}
`;

    setCorpoCaptura(corpoInicial);
    setModalCapturaAberto(true);
  };

  // Salvar captura direta no GitHub do Klaus
  const executarSalvarCaptura = async () => {
    if (!tituloCaptura.trim()) return;
    setSalvando(true);

    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const slug = tituloCaptura
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const caminho = `${tipoDestino}/${hoje}-${slug}.md`;
      await salvarTexto(caminho, corpoCaptura, undefined, `captura rapida: ${tituloCaptura}`, true);

      setSalvoSucesso(true);
      setTimeout(() => {
        setSalvoSucesso(false);
        setModalCapturaAberto(false);
      }, 1200);
    } catch (e) {
      alert(`Não foi possível salvar no GitHub: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSalvando(false);
    }
  };

  // Escuta atalhos de teclado ⌘J e ⌘K na página
  useEffect(() => {
    const aoDigitar = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "j") {
        e.preventDefault();
        abrirCapturaContextual();
      } else if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setModalBuscaAberto(true);
      }
    };
    window.addEventListener("keydown", aoDigitar);
    return () => window.removeEventListener("keydown", aoDigitar);
  }, []);

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-xl border-b border-white/10 text-slate-100 shadow-2xl select-none relative">
      <div className="flex items-center justify-between px-3.5 sm:px-6 h-13 sm:h-14 gap-2 w-full">
        {/* Lado Esquerdo: Logo Oficial do Klaus e Barra de Favoritos Real */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
          <a
            href="https://hugossssssssssssss.github.io/segundo-cerebro/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-bold tracking-tight text-sm text-slate-100 hover:opacity-90 transition-opacity shrink-0 group cursor-pointer"
            title="Abrir Klaus Segundo Cérebro em nova aba"
          >
            <LogoKlaus tamanho={24} />
            <span className="hidden xs:inline">Klaus</span>
            <ExternalLink size={12} className="text-slate-400 group-hover:text-slate-200 transition-colors hidden sm:inline" />
          </a>

          {/* Barra de Favoritos do Klaus */}
          <BarraFavoritos className="flex-1 min-w-0" />
        </div>

        {/* Lado Direito: Ações Rápidas */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Captura Rápida Contextual da Página */}
          <Tooltip conteudo="Capturar página atual no Klaus" atalho="⌘J">
            <button
              onClick={abrirCapturaContextual}
              className="rounded-lg p-1.5 sm:p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Captura rápida"
            >
              <Plus size={18} />
            </button>
          </Tooltip>

          {/* Som Ambiente */}
          <div className="relative">
            <Tooltip conteudo="Sons de fundo e concentração">
              <button
                onClick={() => setSomMenuAberto(!somMenuAberto)}
                className={cn(
                  "rounded-lg p-1.5 sm:p-2 transition-colors relative flex items-center justify-center cursor-pointer",
                  somAmbienteTocando
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
                aria-label="Controle de áudio"
              >
                <Headphones size={18} className={somAmbienteTocando ? "animate-pulse" : ""} />
                {somAmbienteTocando && (
                  <span className="absolute bottom-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                )}
              </button>
            </Tooltip>

            {somMenuAberto && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Music size={13} className="text-indigo-400" />
                    Som de Fundo
                  </span>
                  <button
                    onClick={() => setSomMenuAberto(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-100 hover:underline cursor-pointer"
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
                          setSomAmbienteTocando(true);
                          localStorage.setItem("klaus_som_ambiente", s.id);
                        }}
                        className={cn(
                          "text-[11px] px-2 py-1 rounded-md text-left truncate transition-colors cursor-pointer",
                          somAmbiente === s.id && somAmbienteTocando
                            ? "bg-indigo-500/20 text-indigo-400 font-semibold"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {s.nome}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-1 gap-2">
                    <button
                      onClick={() => setSomAmbienteTocando(!somAmbienteTocando)}
                      className="p-1.5 rounded-lg bg-white/10 text-slate-100 hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      {somAmbienteTocando ? <Pause size={14} /> : <Play size={14} />}
                    </button>

                    <div className="flex-1 flex items-center gap-1.5">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volumeSomAmbiente}
                        onChange={(e) => setVolumeSomAmbiente(Number(e.target.value))}
                        className="w-full accent-indigo-500 h-1 rounded bg-slate-700 appearance-none cursor-pointer"
                      />
                    </div>

                    <button
                      onClick={() => {
                        setSomAmbiente(null);
                        setSomAmbienteTocando(false);
                        setSomMenuAberto(false);
                        localStorage.removeItem("klaus_som_ambiente");
                      }}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Desligar som"
                    >
                      <VolumeX size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Busca em Tudo (⌘K) */}
          <Tooltip conteudo="Buscar em tudo no Klaus" atalho="⌘K">
            <button
              onClick={() => setModalBuscaAberto(true)}
              className="rounded-lg p-1.5 sm:p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Buscar"
            >
              <Search size={18} />
            </button>
          </Tooltip>

          {/* Fixar Barra */}
          <Tooltip conteudo={estaFixado ? "Desafixar barra" : "Manter barra sempre fixa"}>
            <button
              onClick={aoAlternarFixar}
              className={cn(
                "rounded-lg p-1.5 sm:p-2 transition-colors cursor-pointer",
                estaFixado
                  ? "bg-indigo-500/25 text-indigo-400"
                  : "text-slate-400 hover:bg-white/10 hover:text-slate-200"
              )}
            >
              <Pin size={17} className={estaFixado ? "rotate-45" : ""} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Modal Nativo de Captura Rápida Contextual */}
      {modalCapturaAberto && (
        <div className="fixed top-16 right-4 w-[420px] max-w-[calc(100vw-32px)] bg-slate-900 border border-white/20 rounded-2xl p-4 shadow-2xl text-slate-100 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block animate-pulse" />
              <h3 className="text-sm font-semibold text-white">Capturar para o Klaus</h3>
            </div>
            <button
              onClick={() => setModalCapturaAberto(false)}
              className="p-1 rounded-md text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Seletor de Destino */}
          <div className="grid grid-cols-3 gap-1.5 mb-3 bg-slate-950/60 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setTipoDestino("referencias")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                tipoDestino === "referencias" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              <ImageIcon size={14} /> Referência
            </button>
            <button
              onClick={() => setTipoDestino("notas")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                tipoDestino === "notas" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              <FileText size={14} /> Nota
            </button>
            <button
              onClick={() => setTipoDestino("tarefas")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                tipoDestino === "tarefas" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              <CheckSquare size={14} /> Tarefa
            </button>
          </div>

          {/* Campo Título */}
          <div className="space-y-1.5 mb-3">
            <label className="text-[11px] font-medium text-slate-400">Título</label>
            <input
              type="text"
              value={tituloCaptura}
              onChange={(e) => setTituloCaptura(e.target.value)}
              placeholder="Título da nota ou referência..."
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Campo Conteúdo em Markdown */}
          <div className="space-y-1.5 mb-4">
            <label className="text-[11px] font-medium text-slate-400">Conteúdo (Markdown)</label>
            <textarea
              value={corpoCaptura}
              onChange={(e) => setCorpoCaptura(e.target.value)}
              rows={6}
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setModalCapturaAberto(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={executarSalvarCaptura}
              disabled={salvando || !tituloCaptura.trim()}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                salvoSucesso
                  ? "bg-emerald-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
              )}
            >
              {salvoSucesso ? (
                <>
                  <Check size={14} /> Salvo no GitHub!
                </>
              ) : salvando ? (
                "Gravando..."
              ) : (
                "Salvar no Klaus"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal Nativo de Busca Global */}
      {modalBuscaAberto && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[520px] max-w-[calc(100vw-32px)] bg-slate-900 border border-white/20 rounded-2xl p-4 shadow-2xl text-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-3">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar em todo o Klaus..."
              className="w-full bg-transparent border-none text-sm text-slate-100 placeholder-slate-500 outline-none"
            />
            <button
              onClick={() => setModalBuscaAberto(false)}
              className="p-1 rounded-md text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="text-center py-6 text-xs text-slate-400">
            <p>Pressione Enter para abrir a busca no Klaus Web</p>
            <a
              href={`https://hugossssssssssssss.github.io/segundo-cerebro/#/home?busca=${encodeURIComponent(termoBusca)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-indigo-400 hover:underline font-semibold"
            >
              Buscar no Klaus Completo <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
