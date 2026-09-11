import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CabecalhoPaginaProps {
  titulo: string;
  descricao?: React.ReactNode;
  icone?: React.ReactNode;
  corIcone?: string;
  badge?: React.ReactNode;
  acoes?: React.ReactNode;
  trilha?: string[];
  className?: string;
}

/**
 * Componente de cabeçalho padronizado para todas as telas do Klaus.
 * Garante alinhamento, altura, tipografia e espaçamento idênticos.
 */
export function CabecalhoPagina({
  titulo,
  descricao,
  icone,
  corIcone = "bg-primary/10 text-primary",
  badge,
  acoes,
  trilha,
  className,
}: CabecalhoPaginaProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 border-b border-border/30 pb-4 sm:pb-5 pt-1 sm:pt-2",
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
        {icone && (
          <div
            className={cn(
              "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl transition-fluid shadow-minimal",
              corIcone
            )}
          >
            {icone}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {trilha && trilha.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70 mb-1 font-medium">
              {trilha.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight size={11} className="opacity-50 shrink-0" />}
                  <span className={cn(idx === trilha.length - 1 ? "text-foreground font-medium" : "")}>
                    {item}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
              {titulo}
            </h1>
            {badge}
          </div>
          {descricao && (
            <p className="mt-1 text-xs sm:text-[13px] text-muted-foreground/85 leading-relaxed font-normal">
              {descricao}
            </p>
          )}
        </div>
      </div>

      {acoes && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {acoes}
        </div>
      )}
    </div>
  );
}
