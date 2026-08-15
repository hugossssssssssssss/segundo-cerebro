import { useMemo, useState, useEffect } from "react";
import { ExternalLink, ZoomIn, ZoomOut, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { lerMarkdown } from "@/lib/markdown";
import { lerConfig } from "@/lib/settings";
import { lerOuVazio } from "@/lib/github";
import { Carregando, Botao } from "@/components/ui";
import type { ItemRepo } from "@/lib/repo";

type Props = {
  item: ItemRepo;
  onAbrirEditor?: () => void;
};

export function MapaMentalEmbed({ item, onAbrirEditor }: Props) {
  const [conteudoTexto, setConteudoTexto] = useState(item.texto || "");
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [carregandoSvg, setCarregandoSvg] = useState(true);
  const [zoomScale, setZoomScale] = useState<number>(0.75); // Padrão com zoom out confortável
  const [expandido, setExpandido] = useState<boolean>(true);

  useEffect(() => {
    if (!conteudoTexto && item.caminho) {
      const cfg = lerConfig();
      lerOuVazio(cfg, item.caminho, item.sha)
        .then((txt) => {
          if (txt) setConteudoTexto(txt);
        })
        .catch(() => {});
    }
  }, [item.caminho, item.sha, conteudoTexto]);

  const docParsed = useMemo(() => {
    return item.doc && item.doc.corpo ? item.doc : lerMarkdown(conteudoTexto || "");
  }, [item, conteudoTexto]);

  const titulo = (docParsed.dados?.titulo as string) || item.nome.replace(/\.md$/, "");
  const ehModoEscuro = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  useEffect(() => {
    let cancelado = false;
    setCarregandoSvg(true);

    async function gerarSvg() {
      if (docParsed.dados?.svg && typeof docParsed.dados.svg === "string") {
        setSvgHtml(docParsed.dados.svg);
        setCarregandoSvg(false);
        return;
      }

      try {
        const corpoLimpo = docParsed.corpo ? docParsed.corpo.trim() : (conteudoTexto.trim().startsWith("{") ? conteudoTexto.trim() : "");
        let elements: any[] = [];
        let appState: any = {};
        let files: any = {};

        if (corpoLimpo.startsWith("{")) {
          const parsed = JSON.parse(corpoLimpo);
          if (Array.isArray(parsed)) {
            elements = parsed;
          } else if (parsed && typeof parsed === "object") {
            elements = parsed.elements || [];
            appState = parsed.appState || {};
            files = parsed.files || {};
          }
        }

        if (elements.length > 0) {
          const { exportToSvg } = await import("@excalidraw/excalidraw");
          const svgEl = await exportToSvg({
            elements: elements.filter((el) => !el.isDeleted),
            appState: {
              ...appState,
              exportWithDarkMode: ehModoEscuro,
              exportBackground: true,
              viewBackgroundColor: appState?.viewBackgroundColor || (ehModoEscuro ? "#121212" : "#ffffff"),
            },
            files,
          });
          if (!cancelado && svgEl) {
            svgEl.setAttribute("width", "100%");
            svgEl.setAttribute("height", "100%");
            svgEl.style.maxWidth = "100%";
            svgEl.style.maxHeight = "100%";
            setSvgHtml(svgEl.outerHTML);
          }
        }
      } catch {
        // ignora falha
      } finally {
        if (!cancelado) setCarregandoSvg(false);
      }
    }

    gerarSvg();
    return () => {
      cancelado = true;
    };
  }, [docParsed, conteudoTexto, ehModoEscuro]);

  const abrirNoExcalidraw = () => {
    if (onAbrirEditor) {
      onAbrirEditor();
    } else {
      window.location.hash = `#/lousas?abrir=${encodeURIComponent(item.caminho)}`;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  };

  return (
    <div className="my-4 w-full rounded-2xl border border-indigo-500/30 bg-card overflow-hidden shadow-lg transition-all hover:border-indigo-500/50">
      {/* Cabeçalho da Lousa Incorporada */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-indigo-500/10 dark:bg-indigo-950/40 border-b border-indigo-500/20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpandido(!expandido)}
            className="p-1 hover:bg-indigo-500/20 rounded-md text-indigo-700 dark:text-indigo-300 transition-colors"
            title={expandido ? "Minimizar visualização" : "Expandir visualização"}
          >
            {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <span className="text-base">🗺️</span>
          <span className="font-bold text-sm text-indigo-700 dark:text-indigo-300 truncate max-w-[200px] sm:max-w-[320px]">
            Mapa Mental: {titulo}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 font-medium hidden sm:inline-block">
            Excalidraw Visual
          </span>
        </div>

        {/* Barra de Controles de Zoom */}
        {expandido && (
          <div className="flex items-center gap-1 bg-background/80 dark:bg-neutral-900/80 px-2 py-1 rounded-lg border border-border text-xs">
            <button
              onClick={() => setZoomScale((z) => Math.max(0.3, z - 0.15))}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
              title="Reduzir Tamanho / Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="font-mono text-[11px] px-1 min-w-[36px] text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale((z) => Math.min(1.5, z + 0.15))}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
              title="Aumentar Tamanho / Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => setZoomScale(0.75)}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground ml-1"
              title="Resetar Zoom (75%)"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        )}

        <Botao
          variante="fantasma"
          tamanho="pequeno"
          onClick={abrirNoExcalidraw}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 flex items-center gap-1.5 ml-auto"
        >
          <span>Abrir no Editor</span>
          <ExternalLink size={13} />
        </Botao>
      </div>

      {/* Corpo da Lousa Incorporada com Escalonamento Flexível */}
      {expandido && (
        <div
          onClick={abrirNoExcalidraw}
          className="w-full min-h-[180px] max-h-[320px] p-4 bg-background/50 dark:bg-neutral-950/50 flex items-center justify-center cursor-pointer hover:bg-accent/30 transition-colors relative overflow-hidden group"
          title="Clique para abrir e editar no Excalidraw em Tela Cheia"
        >
          {carregandoSvg ? (
            <Carregando texto="Gerando visualização do mapa mental..." />
          ) : svgHtml ? (
            <div
              className="w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-200"
              style={{ transform: `scale(${zoomScale})`, transformOrigin: "center center" }}
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          ) : (
            <div className="text-center text-sm text-muted-foreground p-6">
              <span>🗺️ Mapa Mental sem elementos desenhados ainda.</span>
              <div className="mt-2 text-xs text-indigo-500 font-semibold underline">
                Clique aqui para abrir e desenhar no Excalidraw
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
