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
  colunas: ColunasWidget;
  alturaPx?: number;
  linkVerMais?: string;
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
  colunas = 2,
  alturaPx = 340,
  linkVerMais,
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

  // Mapeamento responsivo de colunas
  const classesColunas = {
    1: "col-span-1 md:col-span-1 lg:col-span-1",
    2: "col-span-1 md:col-span-2 lg:col-span-2",
    3: "col-span-1 md:col-span-2 lg:col-span-3",
    4: "col-span-1 md:col-span-2 lg:col-span-4",
  }[colunasLocal] || "col-span-1 md:col-span-2 lg:col-span-2";

  // Arrastar no canto para redimensionar livremente largura e altura
  const iniciarArrasto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRedimensionando(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startHeight = cardRef.current ? cardRef.current.offsetHeight : alturaLocal;
    const startColunas = colunasLocal;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // 1. Ajuste vertical contínuo (mínimo 200px, máximo 800px)
      const novaAltura = Math.max(200, Math.min(800, startHeight + deltaY));
      setAlturaLocal(novaAltura);

      // 2. Ajuste horizontal por limiares
      let novaCol: ColunasWidget = startColunas;
      if (deltaX > 280) novaCol = 4;
      else if (deltaX > 140) novaCol = Math.min(4, startColunas + 1) as ColunasWidget;
      else if (deltaX < -280) novaCol = 1;
      else if (deltaX < -140) novaCol = Math.max(1, startColunas - 1) as ColunasWidget;

      setColunasLocal(novaCol);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setRedimensionando(false);

      const deltaX = upEvent.clientX - startX;
      const deltaY = upEvent.clientY - startY;
      const novaAltura = Math.max(200, Math.min(800, startHeight + deltaY));

      let novaCol: ColunasWidget = startColunas;
      if (deltaX > 280) novaCol = 4;
      else if (deltaX > 140) novaCol = Math.min(4, startColunas + 1) as ColunasWidget;
      else if (deltaX < -280) novaCol = 1;
      else if (deltaX < -140) novaCol = Math.max(1, startColunas - 1) as ColunasWidget;

      aoMudarDimensoes?.(novaCol, novaAltura);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      ref={cardRef}
      style={{ minHeight: `${alturaLocal}px` }}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-4 transition-all duration-150 overflow-hidden",
        classesColunas,
        modoEdicao && "ring-1 ring-primary/40",
        redimensionando && "select-none ring-2 ring-primary shadow-xl opacity-90",
        className
      )}
    >
      {/* Barra de Ajuste Rápido (Modo Edição) */}
      {modoEdicao && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-background/95 border border-border p-1 rounded-lg shadow-md">
          <div className="flex items-center gap-0.5">
            {([1, 2, 3, 4] as ColunasWidget[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColunasLocal(c);
                  aoMudarDimensoes?.(c, alturaLocal);
                }}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer",
                  colunasLocal === c
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {c === 4 ? "Full" : `${c}x`}
              </button>
            ))}
          </div>

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
          {linkVerMais && !modoEdicao && (
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
          "absolute bottom-0 right-0 w-5 h-5 flex items-end justify-end p-1 cursor-se-resize select-none transition-opacity",
          modoEdicao ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-40 hover:opacity-100 text-muted-foreground"
        )}
        title="Arraste para redimensionar largura e altura livremente"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
          <circle cx="6" cy="6" r="1" />
          <circle cx="2" cy="6" r="1" />
          <circle cx="6" cy="2" r="1" />
        </svg>
      </div>
    </div>
  );
}
