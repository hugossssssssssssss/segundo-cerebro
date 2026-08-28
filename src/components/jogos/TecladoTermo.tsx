import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapaStatusTeclado, StatusLetra } from "@/lib/jogos/termoEngine";

interface TecladoTermoProps {
  statusTeclado: MapaStatusTeclado;
  aoPressionarLetra: (letra: string) => void;
  aoConfirmar: () => void;
  aoApagar: () => void;
  desabilitado?: boolean;
}

const LINHAS_TECLADO = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ç"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
];

export function TecladoTermo({
  statusTeclado,
  aoPressionarLetra,
  aoConfirmar,
  aoApagar,
  desabilitado = false,
}: TecladoTermoProps) {
  const obterEstiloStatus = (st?: StatusLetra) => {
    switch (st) {
      case "correta":
        return "bg-emerald-600 dark:bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xs";
      case "existe":
        return "bg-amber-500 dark:bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-xs";
      case "errada":
        return "bg-muted/80 dark:bg-zinc-800 text-muted-foreground/60 dark:text-zinc-500 opacity-60";
      case "vazio":
      default:
        return "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-foreground font-semibold shadow-xs";
    }
  };

  const lidarCliqueTecla = (tecla: string) => {
    if (desabilitado) return;
    if (tecla === "ENTER") {
      aoConfirmar();
    } else if (tecla === "BACKSPACE") {
      aoApagar();
    } else {
      aoPressionarLetra(tecla);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full max-w-lg mx-auto select-none px-1 pt-2">
      {LINHAS_TECLADO.map((linha, lIdx) => (
        <div key={`linha-teclado-${lIdx}`} className="flex justify-center gap-1 sm:gap-1.5 w-full">
          {linha.map((tecla) => {
            const ehEspecial = tecla === "ENTER" || tecla === "BACKSPACE";
            const status = statusTeclado[tecla];

            return (
              <button
                key={`tecla-${tecla}`}
                type="button"
                onClick={() => lidarCliqueTecla(tecla)}
                disabled={desabilitado}
                className={cn(
                  "flex items-center justify-center rounded-lg sm:rounded-xl text-xs sm:text-sm font-sans transition-all active:scale-95 duration-100 cursor-pointer",
                  ehEspecial
                    ? "px-2.5 sm:px-3 h-12 sm:h-13 text-[11px] sm:text-xs font-bold tracking-tight bg-secondary/90 hover:bg-secondary text-foreground"
                    : "flex-1 min-w-[28px] max-w-[42px] h-12 sm:h-13 uppercase font-bold",
                  !ehEspecial && obterEstiloStatus(status),
                  desabilitado && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
                aria-label={tecla === "BACKSPACE" ? "Apagar letra" : tecla === "ENTER" ? "Confirmar palavra" : `Letra ${tecla}`}
              >
                {tecla === "BACKSPACE" ? (
                  <Delete size={18} className="stroke-[2.2]" />
                ) : tecla === "ENTER" ? (
                  <span>ENTER</span>
                ) : (
                  <span>{tecla}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
