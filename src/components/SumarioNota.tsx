import { useMemo, useState } from "react";
import { ListCollapse, ChevronDown, ChevronRight, Clock, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface SumarioNotaProps {
  corpo: string;
  className?: string;
}

interface ItemIndice {
  nivel: number;
  texto: string;
  id: string;
}

export function SumarioNota({ corpo, className }: SumarioNotaProps) {
  const [expandido, setExpandido] = useState(false);

  // Extrai títulos e calcula métricas de leitura
  const { itens, palavras, minutosLeitura } = useMemo(() => {
    if (!corpo) return { itens: [], palavras: 0, minutosLeitura: 0 };

    const linhas = corpo.split("\n");
    const encontrados: ItemIndice[] = [];

    for (const l of linhas) {
      const match = l.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const nivel = match[1].length;
        const texto = match[2].trim().replace(/[*_`~[\]]/g, "");
        const id = texto
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-");

        encontrados.push({ nivel, texto, id });
      }
    }

    const palavrasLimpas = corpo.replace(/[#*`_~[\]()-]/g, " ").trim().split(/\s+/).filter(Boolean).length;
    const minutos = Math.max(1, Math.ceil(palavrasLimpas / 180));

    return { itens: encontrados, palavras: palavrasLimpas, minutosLeitura: minutos };
  }, [corpo]);

  // Exibe o sumário apenas se houver seções com títulos para navegação
  if (itens.length < 2) return null;

  const rolarAteTitulo = (textoTitulo: string) => {
    // Procura o cabeçalho no DOM do BlockNote
    const elementos = document.querySelectorAll(".bn-block-content, h1, h2, h3, [data-content-type='heading']");
    for (let i = 0; i < elementos.length; i++) {
      const el = elementos[i];
      if (el.textContent?.trim().toLowerCase().includes(textoTitulo.toLowerCase())) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary/50", "rounded", "transition-all");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary/50", "rounded");
        }, 1500);
        break;
      }
    }
  };

  return (
    <div className={cn("rounded-xl border border-border/60 bg-muted/20 overflow-hidden text-xs", className)}>
      <div
        onClick={() => setExpandido(!expandido)}
        className="flex items-center justify-between px-3.5 py-2 hover:bg-muted/40 cursor-pointer select-none transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          {expandido ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <ListCollapse size={13} className="text-primary" />
            Sumário ({itens.length} seções)
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen size={11} className="opacity-70" />
            {palavras} palavras
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock size={11} className="opacity-70" />
            ~{minutosLeitura} min de leitura
          </span>
        </div>
      </div>

      {expandido && itens.length > 0 && (
        <nav className="p-3 pt-1 border-t border-border/40 space-y-1">
          {itens.map((it, idx) => (
            <button
              key={`${it.id}-${idx}`}
              type="button"
              onClick={() => rolarAteTitulo(it.texto)}
              style={{ paddingLeft: `${(it.nivel - 1) * 12 + 6}px` }}
              className="w-full text-left py-1 text-xs text-muted-foreground hover:text-primary hover:bg-accent/40 rounded transition-colors truncate block cursor-pointer"
            >
              <span className="opacity-60 mr-1.5">
                {it.nivel === 1 ? "•" : it.nivel === 2 ? "–" : "›"}
              </span>
              {it.texto}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
