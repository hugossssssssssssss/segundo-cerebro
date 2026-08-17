import React from "react";
import { cn } from "@/lib/utils";

interface CabecalhoSecaoProps {
  titulo: string;
  contador?: number;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
}

/**
 * Cabeçalho de sub-seções padronizado para separar grupos de conteúdo nas páginas.
 */
export function CabecalhoSecao({
  titulo,
  contador,
  descricao,
  acoes,
  className,
}: CabecalhoSecaoProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2.5 pt-2",
        className
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-sm font-bold tracking-tight text-foreground uppercase text-muted-foreground/90">
          {titulo}
        </h2>
        {contador !== undefined && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            {contador}
          </span>
        )}
        {descricao && (
          <span className="text-xs text-muted-foreground hidden md:inline">
            • {descricao}
          </span>
        )}
      </div>

      {acoes && (
        <div className="flex items-center gap-2 shrink-0">
          {acoes}
        </div>
      )}
    </div>
  );
}
