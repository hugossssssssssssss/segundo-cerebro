import { useState } from "react";
import { Globe } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WebSearchBar } from "@/components/WebSearchBar";
import { cn } from "@/lib/utils";

export interface WebSearchHeaderProps {
  className?: string;
}

export function WebSearchHeader({ className }: WebSearchHeaderProps) {
  const [aberto, setAberto] = useState(false);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "rounded-lg p-1.5 sm:p-2 transition-colors relative flex items-center justify-center cursor-pointer",
            aberto
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
            className
          )}
          title="Busca Web Avançada (Google, Bing, DuckDuckGo)"
          aria-label="Busca Web Avançada"
        >
          <Globe size={18} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[92vw] sm:w-[480px] p-3 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Globe size={14} className="text-primary" />
              Busca Web Externa
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Operadores & Dorks
            </span>
          </div>

          <WebSearchBar
            modo="header"
            autoFocus={true}
            aoSubmeter={() => setAberto(false)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
