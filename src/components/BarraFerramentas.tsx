import React from "react";
import { Search } from "lucide-react";
import { Campo } from "@/components/ui";
import { cn } from "@/lib/utils";

interface BarraFerramentasProps {
  busca?: string;
  aoMudarBusca?: (val: string) => void;
  placeholderBusca?: string;
  filtros?: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
}

/**
 * Componente padronizado para barra de ferramentas de filtragem, busca e controles de visão.
 */
export function BarraFerramentas({
  busca,
  aoMudarBusca,
  placeholderBusca = "Buscar...",
  filtros,
  acoes,
  className,
}: BarraFerramentasProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80 shadow-2xs",
        className
      )}
    >
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5 min-w-0">
        {aoMudarBusca !== undefined && (
          <div className="relative w-full sm:w-72 shrink-0">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Campo
              value={busca || ""}
              onChange={(e) => aoMudarBusca(e.target.value)}
              placeholder={placeholderBusca}
              className="pl-9 text-xs sm:text-sm"
            />
          </div>
        )}
        {filtros}
      </div>

      {acoes && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {acoes}
        </div>
      )}
    </div>
  );
}
