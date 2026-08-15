import { useMemo, useState, useEffect, useRef } from "react";
import {
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  GripVertical,
  GripHorizontal,
} from "lucide-react";
import { lerMarkdown } from "@/lib/markdown";
import { lerConfig } from "@/lib/settings";
import { lerOuVazio } from "@/lib/github";
import { Carregando, Botao } from "@/components/ui";
import type { ItemRepo } from "@/lib/repo";

type Props = {
  item: ItemRepo;
  onAbrirEditor?: () => void;
  onDragStartEmbed?: (caminho: string) => void;
};

export function MapaMentalEmbed({
  item,
  onAbrirEditor,
  onDragStartEmbed,
}: Props) {
  const [conteudoTexto, setConteudoTexto] = useState(item.texto || "");
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [carregandoSvg, setCarregandoSvg] = useState(true);
  const [zoomScale, setZoomScale] = useState<number>(0.75); // Zoom confortável padrão
  const [expandido, setExpandido] = useState<boolean>(true);

  // Redimensionamento do container segurando e arrastando pelo canto
  const [altura, setAltura] = useState<number>(280);
  const arrastandoRef = useRef(false);
  const startYRef = useRef(0);
  const startAlturaRef = useRef(280);

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

  // Arraste para redimensionar a altura do embed pelo canto
  const iniciarRedimensionamento = (e: React.MouseEvent) => {
    e.preventDefault();
    arrastandoRef.current = true;
    startYRef.current = e.clientY;
    startAlturaRef.current = altura;

    const aoMoverMouse = (ev: MouseEvent) => {
      if (!arrastandoRef.current) return;
      const deltaY = ev.clientY - startYRef.current;
      const novaAltura = Math.min(700, Math.max(150, startAlturaRef.current + deltaY));
      setAltura(novaAltura);
    };

    const aoSoltarMouse = () => {
      arrastandoRef.current = false;
      window.removeEventListener("mousemove", aoMoverMouse);
      window.removeEventListener("mouseup", aoSoltarMouse);
    };

    window.addEventListener("mousemove", aoMoverMouse);
    window.addEventListener("mouseup", aoSoltarMouse);
  };

  return (
    <div className="my-4 w-full rounded-2xl border border-indigo-500/30 bg-card overflow-hidden shadow-lg transition-all hover:border-indigo-500/50 group relative">
      {/* Cabeçalho com Alça de Arraste Estilo Notion */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-indigo-500/10 dark:bg-indigo-950/40 border-b border-indigo-500/20">
        <div className="flex items-center gap-1.5">
          {/* Alça Arrastável Estilo Notion */}
          <div
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", item.caminho);
              e.dataTransfer.effectAllowed = "move";
              if (onDragStartEmbed) onDragStartEmbed(item.caminho);
            }}
            className="p-1.5 cursor-grab active:cursor-grabbing text-indigo-500/70 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-500/20 rounded transition-colors"
            title="Clique, segure e arraste para mover a posição do mapa mental"
          >
            <GripVertical size={16} />
          </div>

          <button
            onClick={() => setExpandido(!expandido)}
            className="p-1 hover:bg-indigo-500/20 rounded-md text-indigo-700 dark:text-indigo-300 transition-colors"
            title={expandido ? "Minimizar mapa mental" : "Expandir mapa mental"}
          >
            {expandido ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <span className="text-base">🗺️</span>
          <span className="font-bold text-sm text-indigo-700 dark:text-indigo-300 truncate max-w-[180px] sm:max-w-[280px]">
            Mapa Mental: {titulo}
          </span>
        </div>

        {/* Barra de Zoom Flutuante Estilo Pill Badge */}
        {expandido && (
          <div className="flex items-center gap-1 bg-indigo-500/10 dark:bg-indigo-950/60 border border-indigo-500/30 backdrop-blur-md rounded-full px-2.5 py-1 text-xs shadow-xs">
            <button
              onClick={() => setZoomScale((z) => Math.max(0.3, z - 0.15))}
              className="p-1 hover:bg-indigo-500/20 rounded-full text-indigo-700 dark:text-indigo-300 transition-all active:scale-95"
              title="Diminuir Zoom (Zoom Out)"
            >
              <ZoomOut size={13} />
            </button>

            <span className="font-mono text-[11px] font-bold text-indigo-800 dark:text-indigo-200 px-1 min-w-[34px] text-center">
              {Math.round(zoomScale * 100)}%
            </span>

            <button
              onClick={() => setZoomScale((z) => Math.min(1.5, z + 0.15))}
              className="p-1 hover:bg-indigo-500/20 rounded-full text-indigo-700 dark:text-indigo-300 transition-all active:scale-95"
              title="Aumentar Zoom (Zoom In)"
            >
              <ZoomIn size={13} />
            </button>

            <button
              onClick={() => setZoomScale(0.75)}
              className="p-1 hover:bg-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-400 transition-all active:scale-95 ml-0.5"
              title="Restaurar Zoom Padrão (75%)"
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

      {/* Corpo da Lousa Incorporada com Redimensionamento pelo Canto */}
      {expandido && (
        <div
          style={{ height: `${altura}px` }}
          className="w-full bg-background/50 dark:bg-neutral-950/50 flex items-center justify-center relative overflow-hidden transition-all duration-75"
        >
          <div
            onClick={abrirNoExcalidraw}
            className="w-full h-full p-3 flex items-center justify-center cursor-pointer hover:bg-accent/20 transition-colors group/canvas"
            title="Clique para abrir e editar em Tela Cheia no Excalidraw"
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

          {/* Alça de Arraste no Canto Inferior Direito para Redimensionar */}
          <div
            onMouseDown={iniciarRedimensionamento}
            className="absolute bottom-0 right-0 w-6 h-6 bg-indigo-500/20 hover:bg-indigo-500/40 dark:bg-indigo-500/30 cursor-se-resize flex items-center justify-center rounded-tl-lg transition-colors border-t border-l border-indigo-500/30"
            title="Clique e arraste pelo canto para mudar o tamanho no documento"
          >
            <GripHorizontal size={14} className="text-indigo-600 dark:text-indigo-300 transform -rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
