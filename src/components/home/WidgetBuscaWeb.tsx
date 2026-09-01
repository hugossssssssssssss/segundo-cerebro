import { useState, useRef } from "react";
import { Search, ArrowRight } from "lucide-react";
import { useMotorBuscaWeb, type WebSearchEngine } from "@/lib/buscaWeb";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function WidgetBuscaWeb() {
  const [motor, setMotor] = useMotorBuscaWeb();
  const [termo, setTermo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const executarBusca = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termo.trim()) return;

    let url = "";
    const q = encodeURIComponent(termo.trim());

    if (motor === "bing") {
      url = `https://www.bing.com/search?q=${q}`;
    } else if (motor === "duckduckgo") {
      url = `https://duckduckgo.com/?q=${q}`;
    } else {
      url = `https://www.google.com/search?q=${q}`;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <form
      onSubmit={executarBusca}
      className="w-full flex items-center justify-between gap-3 p-1.5 px-3 rounded-xl bg-background/80 border border-border/80 focus-within:border-foreground/40 transition-colors"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder={`Buscar na web com ${motor === "bing" ? "Bing" : motor === "duckduckgo" ? "DuckDuckGo" : "Google"}...`}
          className="w-full text-xs text-foreground bg-transparent placeholder:text-muted-foreground/50 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Seletor Minimalista de Motor de Busca */}
        <select
          value={motor}
          onChange={(e) => setMotor(e.target.value as WebSearchEngine)}
          className="text-[11px] text-muted-foreground bg-transparent border-0 focus:outline-none cursor-pointer hover:text-foreground font-medium py-1"
        >
          <option value="google">Google</option>
          <option value="bing">Bing</option>
          <option value="duckduckgo">DuckDuckGo</option>
        </select>

        <Tooltip conteudo="Pesquisar">
          <button
            type="submit"
            disabled={!termo.trim()}
            className={cn(
              "p-1.5 rounded-lg text-xs transition-colors flex items-center justify-center cursor-pointer",
              termo.trim()
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground opacity-30 cursor-not-allowed"
            )}
            aria-label="Pesquisar"
          >
            <ArrowRight size={13} />
          </button>
        </Tooltip>
      </div>
    </form>
  );
}
