import { useState, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColunasWidget } from "./types";

interface WidgetWrapperProps {
  id: string;
  titulo: string;
  subtitulo?: string;
  icone: any;
  colunas: ColunasWidget; // 1 a 12
  alturaPx?: number;
  linkVerMais?: string;
  aoAbrirPopup?: () => void;
  acoes?: ReactNode;
  modoEdicao?: boolean;
  aoRemover?: () => void;
  aoMudarDimensoes?: (colunas: ColunasWidget, alturaPx: number) => void;
  children: ReactNode;
  className?: string;
}

export function WidgetWrapper({
  titulo,
  subtitulo,
  icone: Icone,
  colunas = 6,
  alturaPx = 320,
  linkVerMais,
  aoAbrirPopup,
  acoes,
  modoEdicao = false,
  aoRemover,
  aoMudarDimensoes,
  children,
  className,
}: WidgetWrapperProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [redimensionando, setRedimensionando] = useState(false);
  const [alturaLocal, setAlturaLocal] = useState(alturaPx);
  const [colunasLocal, setColunasLocal] = useState<ColunasWidget>(colunas);

  // Mapeamento de 12 colunas para malha com total liberdade
  const classesColunas: Record<number, string> = {
    1: "col-span-12 sm:col-span-3 lg:col-span-1",
    2: "col-span-12 sm:col-span-4 lg:col-span-2",
    3: "col-span-12 sm:col-span-6 lg:col-span-3",
    4: "col-span-12 sm:col-span-6 lg:col-span-4",
    5: "col-span-12 sm:col-span-6 lg:col-span-5",
    6: "col-span-12 sm:col-span-6 lg:col-span-6",
    7: "col-span-12 lg:col-span-7",
    8: "col-span-12 lg:col-span-8",
    9: "col-span-12 lg:col-span-9",
    10: "col-span-12 lg:col-span-10",
    11: "col-span-12 lg:col-span-11",
    12: "col-span-12",
  };

  const classeGrid = classesColunas[colunasLocal] || "col-span-12 lg:col-span-6";

  // Arrastar no canto para redimensionar largura e altura livremente
  const iniciarArrasto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRedimensionando(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startHeight = cardRef.current ? cardRef.current.offsetHeight : alturaLocal;
    const parentWidth = cardRef.current?.parentElement?.offsetWidth || window.innerWidth;
    const colWidth = parentWidth / 12;
    const startCols = colunasLocal;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // 1. Altura contínua em pixels
      const novaAltura = Math.max(90, Math.min(900, startHeight + deltaY));
      setAlturaLocal(novaAltura);

      // 2. Largura em passos da malha de 12 colunas
      const deltaCols = Math.round(deltaX / colWidth);
      const novaCol = Math.max(1, Math.min(12, startCols + deltaCols)) as ColunasWidget;
      setColunasLocal(novaCol);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setRedimensionando(false);

      const deltaX = upEvent.clientX - startX;
      const deltaY = upEvent.clientY - startY;
      const novaAltura = Math.max(90, Math.min(900, startHeight + deltaY));
      const deltaCols = Math.round(deltaX / colWidth);
      const novaCol = Math.max(1, Math.min(12, startCols + deltaCols)) as ColunasWidget;

      aoMudarDimensoes?.(novaCol, novaAltura);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      ref={cardRef}
      style={{
        minHeight: typeof window !== "undefined" && window.innerWidth < 640 ? "auto" : `${alturaLocal}px`,
      }}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 transition-all duration-150 overflow-hidden",
        classeGrid,
        modoEdicao && "ring-1 ring-primary/40",
        redimensionando && "select-none ring-2 ring-primary shadow-2xl opacity-95",
        className
      )}
    >
      {/* Indicador Flutuante de Dimensões durante o Arraste */}
      {redimensionando && (
        <div className="absolute top-2 left-2 z-30 bg-primary text-primary-foreground font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow">
          {colunasLocal}/12 colunas ({Math.round((colunasLocal / 12) * 100)}%) × {alturaLocal}px
        </div>
      )}

      {/* Controles de Edição no Modo Grade */}
      {modoEdicao && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-background/95 border border-border p-1 rounded-lg shadow-md">
          <span className="text-[10px] text-muted-foreground font-mono px-1 font-semibold">
            {colunasLocal}/12 col
          </span>

          <div className="h-3 w-px bg-border/60 mx-0.5" />

          {aoRemover && (
            <button
              type="button"
              onClick={aoRemover}
              className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              title="Remover widget"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Cabeçalho do Widget */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-muted-foreground">
            <Icone size={15} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-foreground truncate">
              {titulo}
            </h3>
            {subtitulo && (
              <p className="text-[10px] text-muted-foreground truncate">{subtitulo}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {acoes}

          {aoAbrirPopup && !modoEdicao && (
            <button
              type="button"
              onClick={aoAbrirPopup}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 p-1 rounded hover:bg-accent transition-colors cursor-pointer"
              title="Abrir em janela flutuante"
            >
              <span>Abrir</span>
              <ArrowUpRight size={11} />
            </button>
          )}

          {linkVerMais && !aoAbrirPopup && !modoEdicao && (
            <Link
              to={linkVerMais}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 p-1 rounded hover:bg-accent transition-colors"
            >
              <span>Ver mais</span>
              <ArrowUpRight size={11} />
            </Link>
          )}
        </div>
      </div>

      {/* Conteúdo do Widget */}
      <div className="flex-1 pt-3 flex flex-col overflow-hidden">{children}</div>

      {/* Alça de Arraste Livre no Canto Inferior Direito */}
      <div
        onMouseDown={iniciarArrasto}
        className={cn(
          "absolute bottom-0 right-0 w-6 h-6 flex items-end justify-end p-1.5 cursor-se-resize select-none transition-opacity",
          modoEdicao ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-40 hover:opacity-100 text-muted-foreground"
        )}
        title="Arraste para redimensionar na malha de 12 colunas"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <circle cx="8" cy="8" r="1.2" />
          <circle cx="4" cy="8" r="1.2" />
          <circle cx="8" cy="4" r="1.2" />
        </svg>
      </div>
    </div>
  );
}
