import { useState } from "react";
import { Volume2, CloudRain, Wind, Flame, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WidgetSonsFocoProps {
  aoAbrirPopup?: () => void;
}

export function WidgetSonsFoco({ aoAbrirPopup }: WidgetSonsFocoProps) {
  const [tocando, setTocando] = useState<string | null>(null);

  const sons = [
    { id: "chuva", nome: "Chuva", icone: CloudRain },
    { id: "vento", nome: "Vento", icone: Wind },
    { id: "fogueira", nome: "Fogueira", icone: Flame },
    { id: "cafe", nome: "Cafeteria", icone: Coffee },
  ];

  const alternarSom = (id: string) => {
    if (tocando === id) {
      setTocando(null);
    } else {
      setTocando(id);
    }
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {sons.map((s) => {
          const Icone = s.icone;
          const ativo = tocando === s.id;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => alternarSom(s.id)}
              className={`p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                ativo
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background/50 border-border/60 hover:bg-secondary/40 hover:border-border text-foreground"
              }`}
            >
              <Icone size={16} />
              <span className="text-[11px] font-semibold">{s.nome}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Volume2 size={13} />
          <span>{tocando ? `Tocando som de ${tocando}` : "Nenhum som ativo"}</span>
        </div>

        {aoAbrirPopup && (
          <Button
            size="sm"
            variant="ghost"
            onClick={aoAbrirPopup}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Abrir Player Completo
          </Button>
        )}
      </div>
    </div>
  );
}
