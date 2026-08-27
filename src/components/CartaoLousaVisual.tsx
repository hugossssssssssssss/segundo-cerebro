import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Layout,
  MoreVertical,
  FileEdit,
  Copy,
  Check,
  Link as LinkIcon,
  Trash2,
  Layers,
  Shapes,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { sanitizarHTML } from "@/lib/sanitizer";
import type { ItemRepo } from "@/lib/repo";

interface CartaoLousaVisualProps {
  item: ItemRepo;
  titulo: string;
  visao?: "grade" | "lista";
  onClick: () => void;
  onEditar?: () => void;
  onDuplicar?: (e: React.MouseEvent) => void;
  onExcluir?: (e: React.MouseEvent) => void;
  copiado?: boolean;
  onCopiarMencao?: (e: React.MouseEvent) => void;
}

export function CartaoLousaVisual({
  item,
  titulo,
  visao = "grade",
  onClick,
  onEditar,
  onDuplicar,
  onExcluir,
  copiado = false,
  onCopiarMencao,
}: CartaoLousaVisualProps) {
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [visivel, setVisivel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse dos dados do Excalidraw
  const { elementos, totalElementos, qtdFormas, qtdTextos, qtdConexoes, corFundo } =
    useMemo(() => {
      try {
        let corpo = item.doc?.corpo || item.texto || "";
        corpo = corpo.trim();
        let parsed: any = null;

        if (corpo.startsWith("{")) {
          parsed = JSON.parse(corpo);
        } else if (item.doc?.dados?.tipo === "lousa" && corpo) {
          const matchJson = corpo.match(/\{[\s\S]*\}/);
          if (matchJson) parsed = JSON.parse(matchJson[0]);
        }

        const elements: any[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.elements)
          ? parsed.elements
          : [];

        const validos = elements.filter((el) => !el.isDeleted);
        const formas = validos.filter((el) =>
          ["rectangle", "ellipse", "diamond", "freedraw"].includes(el.type)
        ).length;
        const textos = validos.filter((el) => el.type === "text").length;
        const conexoes = validos.filter((el) =>
          ["arrow", "line"].includes(el.type)
        ).length;

        const bg =
          parsed?.appState?.viewBackgroundColor ||
          item.doc?.dados?.fundo ||
          "#ffffff";

        return {
          elementos: validos,
          totalElementos: validos.length,
          qtdFormas: formas,
          qtdTextos: textos,
          qtdConexoes: conexoes,
          corFundo: bg,
        };
      } catch {
        return {
          elementos: [],
          totalElementos: 0,
          qtdFormas: 0,
          qtdTextos: 0,
          qtdConexoes: 0,
          corFundo: "#ffffff",
        };
      }
    }, [item]);

  // Carrega preview somente quando visível na tela
  useEffect(() => {
    const elemento = containerRef.current;
    if (!elemento) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) {
          setVisivel(true);
          observador.disconnect();
        }
      },
      { rootMargin: "250px" }
    );
    observador.observe(elemento);

    return () => {
      observador.disconnect();
    };
  }, []);

  // Gera SVG da cena do Excalidraw
  useEffect(() => {
    if (!visivel || elementos.length === 0) return;

    let cancelado = false;

    async function renderizarSvg() {
      try {
        const { exportToSvg } = await import("@excalidraw/excalidraw");
        const svgEl = await exportToSvg({
          elements: elementos,
          appState: {
            exportBackground: false,
            viewBackgroundColor: corFundo,
            exportWithDarkMode: document.documentElement.classList.contains("dark"),
          },
          files: {},
        });

        if (!cancelado && svgEl) {
          svgEl.setAttribute("width", "100%");
          svgEl.setAttribute("height", "100%");
          svgEl.style.maxWidth = "100%";
          svgEl.style.maxHeight = "100%";
          svgEl.style.objectFit = "contain";
          setSvgHtml(svgEl.outerHTML);
        }
      } catch {
        // Usa preview simplificado
      }
    }

    renderizarSvg();

    return () => {
      cancelado = true;
    };
  }, [visivel, elementos, corFundo]);

  // ── VISÃO LISTA ────────────────────────────────────────────────────────────
  if (visao === "lista") {
    return (
      <div
        ref={containerRef}
        onClick={onClick}
        className="group flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border/80 bg-card/90 hover:bg-card hover:border-cyan-500/40 hover:shadow-xs transition-all duration-150 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
            <Layout size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                {titulo}
              </span>

              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
                <Layers size={10} />
                {totalElementos} {totalElementos === 1 ? "elemento" : "elementos"}
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
              {qtdFormas > 0 && `${qtdFormas} formas `}
              {qtdConexoes > 0 && `• ${qtdConexoes} conexões `}
              {qtdTextos > 0 && `• ${qtdTextos} textos`}
              {totalElementos === 0 && "Lousa em branco"}
            </p>
          </div>
        </div>

        {/* Menu de Ações */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Opções da lousa"
              >
                <MoreVertical size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1 shadow-xl border-border" align="end">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                onClick={onEditar || onClick}
              >
                <FileEdit size={13} />
                <span>Editar</span>
              </button>
              {onDuplicar && (
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                  onClick={onDuplicar}
                >
                  <Copy size={13} />
                  <span>Duplicar</span>
                </button>
              )}
              {onCopiarMencao && (
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                  onClick={onCopiarMencao}
                >
                  {copiado ? (
                    <Check size={13} className="text-emerald-500" />
                  ) : (
                    <LinkIcon size={13} />
                  )}
                  <span>{copiado ? "Copiado!" : "Copiar @menção"}</span>
                </button>
              )}
              {onExcluir && (
                <>
                  <div className="h-px bg-border/50 my-1" />
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
                    onClick={onExcluir}
                  >
                    <Trash2 size={13} />
                    <span>Excluir</span>
                  </button>
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }

  // ── VISÃO GRADE (CARD RICO COM PREVIEW VETORIAL) ──────────────────────────
  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className="group relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card hover:border-cyan-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden select-none"
    >
      {/* Área de Preview Visual do Canvas */}
      <div className="relative h-40 w-full overflow-hidden bg-accent/20 border-b border-border/50 flex items-center justify-center p-3">
        {/* Fundo com textura quadriculada sutil estilo lousa */}
        <div
          className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
            backgroundSize: "16px 16px",
          }}
        />

        {/* Miniatura do Desenho */}
        {svgHtml ? (
          <div
            className="w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-300 group-hover:scale-105"
            dangerouslySetInnerHTML={{ __html: sanitizarHTML(svgHtml) }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground/50 gap-2 pointer-events-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <Shapes size={24} />
            </div>
            <span className="text-[11px] font-medium tracking-tight">
              {totalElementos > 0
                ? `${totalElementos} elementos desenhados`
                : "Lousa em branco"}
            </span>
          </div>
        )}

        {/* Badge Flutuante no Canto Superior: Elementos */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-background/90 text-foreground border border-border/60 shadow-xs backdrop-blur-md">
            <Layers size={10} className="text-cyan-500" />
            {totalElementos} {totalElementos === 1 ? "item" : "itens"}
          </span>
        </div>

        {/* Menu Popover no Canto Superior Direito */}
        <div
          className="absolute top-2.5 right-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="p-1.5 rounded-xl bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground border border-border/60 shadow-xs backdrop-blur-md transition-all"
                title="Opções da lousa"
              >
                <MoreVertical size={14} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-44 p-1 shadow-xl border-border"
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                onClick={onEditar || onClick}
              >
                <FileEdit size={13} />
                <span>Editar</span>
              </button>

              {onDuplicar && (
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                  onClick={onDuplicar}
                >
                  <Copy size={13} />
                  <span>Duplicar</span>
                </button>
              )}

              {onCopiarMencao && (
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                  onClick={onCopiarMencao}
                >
                  {copiado ? (
                    <Check size={13} className="text-emerald-500" />
                  ) : (
                    <LinkIcon size={13} />
                  )}
                  <span>{copiado ? "Copiado!" : "Copiar @menção"}</span>
                </button>
              )}

              {onExcluir && (
                <>
                  <div className="h-px bg-border/50 my-1" />
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
                    onClick={onExcluir}
                  >
                    <Trash2 size={13} />
                    <span>Excluir</span>
                  </button>
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Conteúdo Inferior do Cartão */}
      <div className="p-4 flex flex-col justify-between flex-1 gap-2">
        <div>
          <h3 className="font-bold text-sm text-foreground leading-snug truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            {titulo}
          </h3>
          <p className="text-[11px] text-muted-foreground/80 mt-1 truncate">
            {qtdFormas > 0 && `${qtdFormas} formas `}
            {qtdConexoes > 0 && `• ${qtdConexoes} setas `}
            {qtdTextos > 0 && `• ${qtdTextos} notas`}
            {totalElementos === 0 && "Mapa mental vazio"}
          </p>
        </div>

        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground/70 font-medium">
          <span className="flex items-center gap-1">
            <Layout size={11} className="text-cyan-500/80" />
            Excalidraw
          </span>

          <span className="flex items-center gap-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 font-semibold transition-colors">
            Abrir editor →
          </span>
        </div>
      </div>
    </div>
  );
}
