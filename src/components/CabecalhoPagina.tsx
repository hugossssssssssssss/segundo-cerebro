import React from "react";
import { cn } from "@/lib/utils";

interface CabecalhoPaginaProps {
  titulo: string;
  descricao?: React.ReactNode;
  icone?: React.ReactNode;
  corIcone?: string;
  badge?: React.ReactNode;
  acoes?: React.ReactNode;
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
  className,
}: CabecalhoPaginaProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 border-b border-border/60 pb-3.5 sm:pb-5",
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        {icone && (
          <div
            className={cn(
              "flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-colors",
              corIcone
            )}
          >
            {icone}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
              {titulo}
            </h1>
            {badge}
          </div>
          {descricao && (
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground leading-normal">
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
