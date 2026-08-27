import { useState, useEffect } from "react";
import { FilePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WidgetScratchpadProps {
  aoConverterEmNota: (conteudo: string) => void;
}

export function WidgetScratchpad({ aoConverterEmNota }: WidgetScratchpadProps) {
  const [texto, setTexto] = useState(() => {
    return localStorage.getItem("klaus_home_scratchpad") || "";
  });
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    localStorage.setItem("klaus_home_scratchpad", texto);
    setSalvo(true);
    const timer = setTimeout(() => setSalvo(false), 1500);
    return () => clearTimeout(timer);
  }, [texto]);

  const handleConverter = () => {
    if (!texto.trim()) return;
    aoConverterEmNota(texto);
    setTexto("");
    localStorage.removeItem("klaus_home_scratchpad");
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Digite um pensamento rápido, link ou ideia instantânea..."
        className="w-full flex-1 min-h-[110px] resize-none bg-background/50 border border-border/60 rounded-2xl p-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 leading-relaxed shadow-2xs"
      />

      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
        <span className="opacity-70 font-mono">
          {salvo ? "Salvo" : `${texto.length} caracteres`}
        </span>

        <div className="flex items-center gap-1.5">
          {texto && (
            <button
              type="button"
              onClick={() => setTexto("")}
              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Limpar rascunho"
            >
              <Trash2 size={13} />
            </button>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={handleConverter}
            disabled={!texto.trim()}
            className="h-7 px-2 text-[11px] gap-1 font-semibold rounded-lg shadow-2xs cursor-pointer disabled:opacity-40"
          >
            <FilePlus size={12} className="text-amber-500" />
            <span>Virar Nota</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
