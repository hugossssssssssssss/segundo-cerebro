import { Search, X } from "lucide-react";
import { Campo } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip";
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
        "flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 liquid-glass-card p-2 sm:p-2.5 rounded-2xl",
        className
      )}
    >
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
        {aoMudarBusca !== undefined && (
          <div className="relative w-full sm:w-72 md:w-80 shrink-0">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none"
            />
            <Campo
              value={busca || ""}
              onChange={(e) => aoMudarBusca(e.target.value)}
              placeholder={placeholderBusca}
              className="pl-9 pr-8 text-sm h-10 bg-background/90 border-border/40 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/15 rounded-xl transition-fluid-fast"
            />
            {busca && (
              <Tooltip conteudo="Limpar busca">
                <button
                  type="button"
                  onClick={() => aoMudarBusca("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Limpar busca"
                >
                  <X size={15} />
                </button>
              </Tooltip>
            )}
          </div>
        )}
        {filtros && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 min-w-0 w-full sm:w-auto">
            {filtros}
          </div>
        )}
      </div>

      {acoes && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-border/30">
          {acoes}
        </div>
      )}
    </div>
  );
}
