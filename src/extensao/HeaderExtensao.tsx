import { useState, useEffect, useRef } from "react";
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
  Pin,
  X,
  FileText,
  CheckSquare,
  Image as ImageIcon,
  Check,
  Folder,
} from "lucide-react";
import { LogoKlaus } from "@/components/LogoKlaus";
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
  // Modais
  const [capturando, setCapturando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [buscandoWeb, setBuscandoWeb] = useState(false);
  const [somMenuAberto, setSomMenuAberto] = useState(false);

  // Captura Contextual
  const [tipoDestino, setTipoDestino] = useState<"referencias" | "notas" | "tarefas">("referencias");
  const [tituloCaptura, setTituloCaptura] = useState("");
  const [corpoCaptura, setCorpoCaptura] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvoSucesso, setSalvoSucesso] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");
  const [termoBuscaWeb, setTermoBuscaWeb] = useState("");

  // Som Ambiente
  const [somAmbiente, setSomAmbiente] = useState<string | null>(() => {
    try {
      return localStorage.getItem("klaus_som_ambiente");
    } catch {
      return null;
    }
  });
  const [somAmbienteTocando, setSomAmbienteTocando] = useState(false);
  const [volumeSomAmbiente, setVolumeSomAmbiente] = useState(0.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Favoritos do Klaus
  const [favoritos] = useState<any[]>(() => {
    try {
      const salvos = localStorage.getItem("klaus_favoritos_v1");
      if (salvos) return JSON.parse(salvos);
    } catch {}
    return [
      { id: "1", titulo: "Notas", url: "https://hugossssssssssssss.github.io/segundo-cerebro/#/notas", tipo: "app" },
      { id: "2", titulo: "Tarefas", url: "https://hugossssssssssssss.github.io/segundo-cerebro/#/tarefas", tipo: "app" },
      { id: "3", titulo: "Lousas", url: "https://hugossssssssssssss.github.io/segundo-cerebro/#/lousas", tipo: "app" },
      { id: "4", titulo: "Grafo", url: "https://hugossssssssssssss.github.io/segundo-cerebro/#/grafo", tipo: "app" },
      { id: "5", titulo: "GitHub", url: "https://github.com", tipo: "link" },
      { id: "6", titulo: "Figma", url: "https://figma.com", tipo: "link" },
    ];
  });

  // Notifica o wrapper sobre modais abertos
  useEffect(() => {
    const aberto = capturando || buscando || buscandoWeb || somMenuAberto;
    onModalStateChange(aberto);
  }, [capturando, buscando, buscandoWeb, somMenuAberto, onModalStateChange]);

  // Sons de fundo
  useEffect(() => {
    if (!somAmbiente || !somAmbienteTocando) {
      if (audioRef.current) audioRef.current.pause();
      return;
    }
    const item = LISTA_SONS_AMBIENTE.find((s) => s.id === somAmbiente);
    if (item) {
      if (!audioRef.current) {
        audioRef.current = new Audio(item.url);
        audioRef.current.loop = true;
      } else {
        audioRef.current.src = item.url;
      }
      audioRef.current.volume = volumeSomAmbiente;
      audioRef.current.play().catch(() => {});
    }
  }, [somAmbiente, somAmbienteTocando]);

  // Captura Contextual da Página
  const abrirCapturaContextual = () => {
    const tituloDoc = typeof document !== "undefined" ? document.title || "Referência Web" : "Referência Web";
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
    const corpo = `---
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
    setCorpoCaptura(corpo);
    setCapturando(true);
  };

  // Salvar captura no GitHub do usuário
  const executarSalvarCaptura = async () => {
    if (!tituloCaptura.trim()) return;
    setSalvando(true);

    let token = "";
    let owner = "hugossssssssssssss";
    let repo = "segundo-cerebro-dados";

    try {
      const cfgLocal = localStorage.getItem("klaus_config_v1");
      if (cfgLocal) {
        const parsed = JSON.parse(cfgLocal);
        if (parsed.githubToken) token = parsed.githubToken;
        if (parsed.repoOwner) owner = parsed.repoOwner;
        if (parsed.repoName) repo = parsed.repoName;
      }
    } catch {}

    const hoje = new Date().toISOString().slice(0, 10);
    const slug = tituloCaptura
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const caminho = `${tipoDestino}/${hoje}-${slug}.md`;

    if (token) {
      try {
        await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${caminho}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json",
          },
          body: JSON.stringify({
            message: `captura rapida: ${tituloCaptura}`,
            content: btoa(unescape(encodeURIComponent(corpoCaptura))),
            branch: "main",
          }),
        });
      } catch {}
    }

    setSalvoSucesso(true);
    setTimeout(() => {
      setSalvoSucesso(false);
      setCapturando(false);
    }, 1200);
    setSalvando(false);
  };

  // Atalhos ⌘J e ⌘K
  useEffect(() => {
    const aoDigitar = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "j") {
        e.preventDefault();
        abrirCapturaContextual();
      } else if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscando(true);
      }
    };
    window.addEventListener("keydown", aoDigitar);
    return () => window.removeEventListener("keydown", aoDigitar);
  }, []);

  return (
    <header className="w-full border-b border-border bg-background/95 backdrop-blur-md text-foreground select-none shadow-2xl relative font-sans">
      <div className="flex items-center justify-between px-3.5 sm:px-6 h-13 sm:h-14 gap-2 w-full">
        {/* Lado Esquerdo: Logo do Klaus + Barra de Favoritos Oficial */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
          <a
            href="https://hugossssssssssssss.github.io/segundo-cerebro/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-bold tracking-tight text-sm text-foreground hover:opacity-90 transition-opacity shrink-0 group cursor-pointer"
            title="Abrir Klaus Segundo Cérebro em nova aba"
          >
            <LogoKlaus tamanho={24} />
            <span className="hidden xs:inline font-bold">Klaus</span>
            <ExternalLink size={12} className="text-muted-foreground group-hover:text-foreground transition-colors hidden sm:inline" />
          </a>

          {/* Barra de Favoritos Real do Klaus */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50vw] scrollbar-none py-1">
            {favoritos.map((fav) => {
              let domain = "";
              try {
                domain = new URL(fav.url).hostname;
              } catch {
                domain = fav.url;
              }
              return (
                <a
                  key={fav.id || fav.url}
                  href={fav.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/50 hover:bg-secondary text-secondary-foreground transition-all shrink-0 border border-border/40 hover:border-border"
                  title={fav.titulo}
                >
                  {fav.tipo === "pasta" ? (
                    <Folder size={13} className="text-primary" />
                  ) : (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                      alt=""
                      className="w-3.5 h-3.5 rounded-xs object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  )}
                  <span className="truncate max-w-[120px]">{fav.titulo}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Lado Direito: Captura Rápida, Som, Notificações, Busca e Fixar */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Captura Rápida Contextual */}
          <button
            onClick={abrirCapturaContextual}
            className="rounded-lg p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
            title="Captura rápida da página atual (⌘J)"
            aria-label="Captura rápida"
          >
            <Plus size={18} />
          </button>

          {/* Som Ambiente Oficial */}
          <div className="relative">
            <button
              onClick={() => setSomMenuAberto(!somMenuAberto)}
              className={cn(
                "rounded-lg p-1.5 sm:p-2 transition-colors relative flex items-center justify-center cursor-pointer",
                somAmbienteTocando
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              title="Sons de concentração e ambiente"
            >
              <Headphones size={18} className={somAmbienteTocando ? "animate-pulse" : ""} />
              {somAmbienteTocando && (
                <span className="absolute bottom-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
            </button>

            {somMenuAberto && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 z-50">
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
                          setSomAmbienteTocando(true);
                          localStorage.setItem("klaus_som_ambiente", s.id);
                        }}
                        className={cn(
                          "text-[11px] px-2 py-1 rounded-md text-left truncate transition-colors cursor-pointer",
                          somAmbiente === s.id && somAmbienteTocando
                            ? "bg-primary/15 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {s.nome}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-1 gap-2">
                    <button
                      onClick={() => setSomAmbienteTocando(!somAmbienteTocando)}
                      className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
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
                        className="w-full accent-primary h-1 rounded bg-secondary appearance-none cursor-pointer"
                      />
                    </div>

                    <button
                      onClick={() => {
                        setSomAmbiente(null);
                        setSomAmbienteTocando(false);
                        setSomMenuAberto(false);
                        localStorage.removeItem("klaus_som_ambiente");
                      }}
                      className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Desligar som"
                    >
                      <VolumeX size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Busca Web Externa */}
          <button
            type="button"
            onClick={() => setBuscandoWeb(true)}
            className="rounded-lg p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
            title="Busca Web Externa"
          >
            <Globe size={18} />
          </button>

          {/* Busca em tudo oficial */}
          <button
            onClick={() => setBuscando(true)}
            className="rounded-lg p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
            title="Buscar em tudo no Klaus (⌘K)"
          >
            <Search size={18} />
          </button>

          {/* Fixar Barra */}
          <button
            onClick={aoAlternarFixar}
            className={cn(
              "rounded-lg p-1.5 sm:p-2 transition-colors cursor-pointer",
              estaFixado
                ? "bg-primary/20 text-primary font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            title={estaFixado ? "Desafixar barra" : "Manter barra sempre fixa"}
          >
            <Pin size={17} className={estaFixado ? "rotate-45" : ""} />
          </button>
        </div>
      </div>

      {/* Modal Nativo de Captura Rápida Contextual */}
      {capturando && (
        <div className="fixed top-16 right-4 w-[430px] max-w-[calc(100vw-32px)] bg-card border border-border rounded-2xl p-4 shadow-2xl text-foreground z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block animate-pulse" />
              <h3 className="text-sm font-semibold">Capturar para o Klaus</h3>
            </div>
            <button
              onClick={() => setCapturando(false)}
              className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Seletor de Destino */}
          <div className="grid grid-cols-3 gap-1.5 mb-3 bg-secondary/50 p-1 rounded-xl border border-border/40">
            <button
              onClick={() => setTipoDestino("referencias")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                tipoDestino === "referencias" ? "bg-primary text-primary-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ImageIcon size={14} /> Referência
            </button>
            <button
              onClick={() => setTipoDestino("notas")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                tipoDestino === "notas" ? "bg-primary text-primary-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText size={14} /> Nota
            </button>
            <button
              onClick={() => setTipoDestino("tarefas")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                tipoDestino === "tarefas" ? "bg-primary text-primary-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckSquare size={14} /> Tarefa
            </button>
          </div>

          {/* Campo Título */}
          <div className="space-y-1.5 mb-3">
            <label className="text-[11px] font-medium text-muted-foreground">Título</label>
            <input
              type="text"
              value={tituloCaptura}
              onChange={(e) => setTituloCaptura(e.target.value)}
              placeholder="Título da nota ou referência..."
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Campo Conteúdo em Markdown */}
          <div className="space-y-1.5 mb-4">
            <label className="text-[11px] font-medium text-muted-foreground">Conteúdo (Markdown)</label>
            <textarea
              value={corpoCaptura}
              onChange={(e) => setCorpoCaptura(e.target.value)}
              rows={6}
              className="w-full bg-background border border-input rounded-xl p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setCapturando(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
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
                  : "bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20"
              )}
            >
              {salvoSucesso ? (
                <>
                  <Check size={14} /> Salvo no Klaus!
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
      {buscando && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[520px] max-w-[calc(100vw-32px)] bg-card border border-border rounded-2xl p-4 shadow-2xl text-foreground z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-3 border-b border-border pb-3 mb-3">
            <Search size={18} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              autoFocus
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar em todo o Klaus..."
              className="w-full bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              onClick={() => setBuscando(false)}
              className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="text-center py-6 text-xs text-muted-foreground">
            <p>Pressione Enter para abrir a busca no Klaus Web</p>
            <a
              href={`https://hugossssssssssssss.github.io/segundo-cerebro/#/home?busca=${encodeURIComponent(termoBusca)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-primary hover:underline font-semibold"
            >
              Buscar no Klaus Completo <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* Modal de Busca Web Externa */}
      {buscandoWeb && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[520px] max-w-[calc(100vw-32px)] bg-card border border-border rounded-2xl p-4 shadow-2xl text-foreground z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-3 border-b border-border pb-3 mb-3">
            <Globe size={18} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              autoFocus
              value={termoBuscaWeb}
              onChange={(e) => setTermoBuscaWeb(e.target.value)}
              placeholder="Pesquisar no Google, DuckDuckGo ou Perplexity..."
              className="w-full bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              onClick={() => setBuscandoWeb(false)}
              className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 py-4">
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(termoBuscaWeb)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs bg-secondary hover:bg-secondary/80 transition-colors font-medium flex items-center gap-1.5"
            >
              Google <ExternalLink size={11} />
            </a>
            <a
              href={`https://www.perplexity.ai/search?q=${encodeURIComponent(termoBuscaWeb)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs bg-secondary hover:bg-secondary/80 transition-colors font-medium flex items-center gap-1.5"
            >
              Perplexity <ExternalLink size={11} />
            </a>
            <a
              href={`https://duckduckgo.com/?q=${encodeURIComponent(termoBuscaWeb)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs bg-secondary hover:bg-secondary/80 transition-colors font-medium flex items-center gap-1.5"
            >
              DuckDuckGo <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
