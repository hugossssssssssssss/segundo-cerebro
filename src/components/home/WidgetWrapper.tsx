import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TamanhoWidget } from "./types";

interface WidgetWrapperProps {
  id: string;
  titulo: string;
  subtitulo?: string;
  icone: any;
  corIcone?: string;
  tamanho: TamanhoWidget;
  linkVerMais?: string;
  acoes?: ReactNode;
  modoEdicao?: boolean;
  aoRemover?: () => void;
  aoMudarTamanho?: (novoTamanho: TamanhoWidget) => void;
  children: ReactNode;
  className?: string;
}

export function WidgetWrapper({
  titulo,
  subtitulo,
  icone: Icone,
  corIcone = "text-primary bg-primary/10",
  tamanho,
  linkVerMais,
  acoes,
  modoEdicao = false,
  aoRemover,
  aoMudarTamanho,
  children,
  className,
}: WidgetWrapperProps) {
  // Mapeamento responsivo para grid de 4 colunas (Bento Grid)
  const classesTamanho = {
    compacto: "col-span-1 md:col-span-1 lg:col-span-1",
    medio: "col-span-1 md:col-span-2 lg:col-span-2",
    largo: "col-span-1 md:col-span-2 lg:col-span-3",
    destaque: "col-span-1 md:col-span-2 lg:col-span-4",
  }[tamanho];

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card/75 backdrop-blur-xl p-5 shadow-xs transition-all duration-300 hover:shadow-lg hover:border-border overflow-hidden",
        classesTamanho,
        modoEdicao && "ring-2 ring-primary/40 ring-dashed",
        className
      )}
    >
      {/* Barra de Controles de Edição (Visível no Modo de Edição) */}
      {modoEdicao && (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-card/95 border border-border p-1 rounded-xl shadow-lg backdrop-blur-md animate-in fade-in zoom-in duration-150">
          <div className="flex items-center gap-0.5 px-1">
            {(["compacto", "medio", "largo", "destaque"] as TamanhoWidget[]).map((tam) => (
              <button
                key={tam}
                type="button"
                onClick={() => aoMudarTamanho?.(tam)}
                className={cn(
                  "px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer",
                  tamanho === tam
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                title={`Mudar tamanho para ${tam}`}
              >
                {tam === "compacto" ? "1x" : tam === "medio" ? "2x" : tam === "largo" ? "3x" : "Full"}
              </button>
            ))}
          </div>

          <div className="h-3 w-px bg-border/80" />

          {aoRemover && (
            <button
              type="button"
              onClick={aoRemover}
              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              title="Ocultar widget"
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
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-1 text-xs font-medium"
              title="Ver tudo"
            >
              <span className="hidden sm:inline text-[11px]">Ver mais</span>
              <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* Conteúdo do Widget */}
      <div className="flex-1 pt-3.5 flex flex-col">{children}</div>
    </div>
  );
}
