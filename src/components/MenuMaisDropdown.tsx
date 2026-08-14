import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, Layout, Image, Target, MessageCircle, Sparkles } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const itensSecundarios = [
  { para: "/lousas", rotulo: "Lousas", Icone: Layout, desc: "Quadro visual e mapas de ideias" },
  { para: "/referencias", rotulo: "Referências", Icone: Image, desc: "Galeria e inspirações visuais" },
  { para: "/pdi", rotulo: "Carreira (PDI)", Icone: Target, desc: "Metas, entregas e plano de carreira" },
  { para: "/chat", rotulo: "Conversar com IA", Icone: MessageCircle, desc: "Assistente Gemini integrado", destaque: true },
];

export function MenuMaisDropdown() {
  const [aberto, setAberto] = useState(false);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-foreground",
            aberto && "bg-accent text-foreground"
          )}
          aria-label="Mais opções de navegação"
        >
          <span>Mais</span>
          <ChevronDown size={14} className={cn("transition-transform duration-200", aberto && "rotate-180")} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-2 bg-popover/95 backdrop-blur border-border shadow-xl rounded-xl space-y-1">
        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
          Ferramentas & Estúdio
        </div>

        {itensSecundarios.map(({ para, rotulo, Icone, desc, destaque }) => (
          <NavLink
            key={para}
            to={para}
            onClick={() => setAberto(false)}
            className={({ isActive }) =>
              cn(
                "flex items-start gap-3 rounded-lg p-2 transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-accent"
              )
            }
          >
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-accent/60 text-foreground shrink-0">
              <Icone size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="truncate">{rotulo}</span>
                {destaque && <Sparkles size={12} className="text-amber-500 shrink-0" />}
              </div>
              <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                {desc}
              </p>
            </div>
          </NavLink>
        ))}
      </PopoverContent>
    </Popover>
  );
}
