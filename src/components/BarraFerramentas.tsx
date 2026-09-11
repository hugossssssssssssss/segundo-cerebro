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
        "flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-card/60 dark:bg-card/40 p-2.5 sm:p-3 rounded-xl border border-border/40 backdrop-blur-xs",
        className
      )}
    >
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
        {aoMudarBusca !== undefined && (
          <div className="relative w-full sm:w-80 md:w-96 min-w-0 sm:min-w-[320px] shrink-0">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 pointer-events-none"
            />
            <Campo
              value={busca || ""}
              onChange={(e) => aoMudarBusca(e.target.value)}
              placeholder={placeholderBusca}
              className="pl-9 pr-8 text-xs sm:text-sm bg-background/80 border-border/50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
            />
            {busca && (
              <Tooltip conteudo="Limpar busca">
                <button
                  type="button"
                  onClick={() => aoMudarBusca("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Limpar busca"
                >
                  <X size={14} />
                </button>
              </Tooltip>
            )}
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
