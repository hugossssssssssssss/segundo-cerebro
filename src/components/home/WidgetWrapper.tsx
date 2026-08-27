import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LarguraWidget } from "./types";

interface WidgetWrapperProps {
  id: string;
  titulo: string;
  subtitulo?: string;
  icone: any;
  corIcone?: string;
  colunas: LarguraWidget;
  linkVerMais?: string;
  acoes?: ReactNode;
  modoEdicao?: boolean;
  aoRemover?: () => void;
  aoMudarColunas?: (novasColunas: LarguraWidget) => void;
  children: ReactNode;
  className?: string;
}

export function WidgetWrapper({
  titulo,
  subtitulo,
  icone: Icone,
  corIcone = "text-primary bg-primary/10",
  colunas = 2,
  linkVerMais,
  acoes,
  modoEdicao = false,
  aoRemover,
  aoMudarColunas,
  children,
  className,
}: WidgetWrapperProps) {
  // Mapeamento responsivo para grid de 4 colunas (Bento Grid com total liberdade)
  const classesColunas = {
    1: "col-span-1 md:col-span-1 lg:col-span-1",
    2: "col-span-1 md:col-span-2 lg:col-span-2",
    3: "col-span-1 md:col-span-2 lg:col-span-3",
    4: "col-span-1 md:col-span-2 lg:col-span-4",
  }[colunas] || "col-span-1 md:col-span-2 lg:col-span-2";

  const proximoTamanho = (atual: LarguraWidget): LarguraWidget => {
    if (atual === 1) return 2;
    if (atual === 2) return 3;
    if (atual === 3) return 4;
    return 1;
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card/75 backdrop-blur-xl p-5 shadow-xs transition-all duration-300 hover:shadow-xl hover:border-border overflow-hidden",
        classesColunas,
        modoEdicao && "ring-2 ring-primary/40 ring-dashed",
        className
      )}
    >
      {/* Barra de Controles Rápidos de Largura (Visível no Modo de Ajuste) */}
      {modoEdicao && (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-card/95 border border-border p-1 rounded-xl shadow-lg backdrop-blur-md animate-in fade-in zoom-in duration-150">
          <div className="flex items-center gap-0.5 px-1">
            {([1, 2, 3, 4] as LarguraWidget[]).map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => aoMudarColunas?.(col)}
                className={cn(
                  "px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer",
                  colunas === col
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                title={`Mudar para ${col} coluna${col > 1 ? "s" : ""}`}
              >
                {col === 4 ? "Full" : `${col}x`}
              </button>
            ))}
          </div>

          <div className="h-3 w-px bg-border/80" />

          {aoRemover && (
            <button
              type="button"
              onClick={aoRemover}
              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              title="Ocultar widget da tela inicial"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Cabeçalho do Widget */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border border-border/40 transition-transform duration-200 group-hover:scale-105",
              corIcone
            )}
          >
            <Icone size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-tight text-foreground truncate flex items-center gap-1.5">
              {titulo}
            </h3>
            {subtitulo && (
              <p className="text-[11px] text-muted-foreground truncate">{subtitulo}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {acoes}

          {linkVerMais && !modoEdicao && (
            <Link
              to={linkVerMais}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
              title="Abrir página completa"
            >
              <span className="hidden sm:inline text-[11px]">Ver mais</span>
              <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* Conteúdo Interno do Widget */}
      <div className="flex-1 pt-3.5 flex flex-col">{children}</div>

      {/* Alça de Redimensionamento Rápido no Canto Inferior Direito */}
      {modoEdicao && (
        <button
          type="button"
          onClick={() => aoMudarColunas?.(proximoTamanho(colunas))}
          className="absolute bottom-1.5 right-1.5 p-1 rounded-md text-muted-foreground/50 hover:text-primary hover:bg-accent/60 transition-all cursor-pointer opacity-75 hover:opacity-100"
          title={`Clique para alternar tamanho (atual: ${colunas === 4 ? 'Full' : colunas + 'x'})`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="opacity-70">
            <circle cx="8" cy="8" r="1.2" />
            <circle cx="4" cy="8" r="1.2" />
            <circle cx="8" cy="4" r="1.2" />
          </svg>
        </button>
      )}
    </div>
  );
}
