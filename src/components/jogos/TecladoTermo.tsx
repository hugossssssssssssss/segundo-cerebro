import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapaStatusTecladoMulti, StatusLetra } from "@/lib/jogos/termoEngine";

interface TecladoTermoProps {
  statusTeclado: MapaStatusTecladoMulti;
  tabuleiros?: number;
  resolvidos?: boolean[];
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

function corBgStatus(st?: StatusLetra): string {
  switch (st) {
    case "correta":
      return "bg-emerald-600 dark:bg-emerald-600";
    case "existe":
      return "bg-amber-500 dark:bg-amber-500";
    case "errada":
      return "bg-zinc-700/90 dark:bg-zinc-800";
    case "vazio":
    default:
      return "bg-secondary/90 dark:bg-secondary/60";
  }
}

export function TecladoTermo({
  statusTeclado,
  tabuleiros = 1,
  resolvidos = [],
  aoPressionarLetra,
  aoConfirmar,
  aoApagar,
  desabilitado = false,
}: TecladoTermoProps) {
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
    <div className="flex flex-col items-center gap-1 sm:gap-1.5 w-full max-w-lg mx-auto select-none px-1 pt-2">
      {LINHAS_TECLADO.map((linha, lIdx) => (
        <div key={`linha-teclado-${lIdx}`} className="flex justify-center gap-1 sm:gap-1.5 w-full">
          {linha.map((tecla) => {
            const ehEspecial = tecla === "ENTER" || tecla === "BACKSPACE";
            const statuses = statusTeclado[tecla] || new Array(tabuleiros).fill("vazio");

            return (
              <button
                key={`tecla-${tecla}`}
                type="button"
                onClick={() => lidarCliqueTecla(tecla)}
                disabled={desabilitado}
                className={cn(
                  "relative overflow-hidden flex items-center justify-center rounded-lg sm:rounded-xl font-sans transition-all active:scale-95 duration-100 cursor-pointer border border-border/40 shadow-2xs",
                  ehEspecial
                    ? "px-2 sm:px-3 h-11 sm:h-12 text-[10px] sm:text-xs font-bold tracking-tight bg-secondary hover:bg-secondary/80 text-foreground"
                    : "flex-1 min-w-[28px] max-w-[42px] h-11 sm:h-12 uppercase font-bold text-xs sm:text-sm",
                  desabilitado && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
                aria-label={
                  tecla === "BACKSPACE"
                    ? "Apagar letra"
                    : tecla === "ENTER"
                    ? "Confirmar palavra"
                    : `Letra ${tecla}`
                }
              >
                {/* Renderização de Fundo: Modo 1 Tabuleiro */}
                {!ehEspecial && tabuleiros === 1 && (
                  <div
                    className={cn(
                      "absolute inset-0 transition-colors",
                      corBgStatus(statuses[0])
                    )}
                  />
                )}

                {/* Renderização de Fundo: Modo Dueto (2 Metades Verticais) */}
                {!ehEspecial && tabuleiros === 2 && (
                  <div className="absolute inset-0 flex">
                    <div
                      className={cn(
                        "w-1/2 h-full transition-colors border-r border-background/20",
                        corBgStatus(statuses[0]),
                        resolvidos[0] && statuses[0] !== "correta" && "opacity-40"
                      )}
                    />
                    <div
                      className={cn(
                        "w-1/2 h-full transition-colors",
                        corBgStatus(statuses[1]),
                        resolvidos[1] && statuses[1] !== "correta" && "opacity-40"
                      )}
                    />
                  </div>
                )}

                {/* Renderização de Fundo: Modo Quarteto (4 Quadrantes 2x2) */}
                {!ehEspecial && tabuleiros === 4 && (
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    <div
                      className={cn(
                        "transition-colors border-r border-b border-background/20",
                        corBgStatus(statuses[0]),
                        resolvidos[0] && statuses[0] !== "correta" && "opacity-40"
                      )}
                    />
                    <div
                      className={cn(
                        "transition-colors border-b border-background/20",
                        corBgStatus(statuses[1]),
                        resolvidos[1] && statuses[1] !== "correta" && "opacity-40"
                      )}
                    />
                    <div
                      className={cn(
                        "transition-colors border-r border-background/20",
                        corBgStatus(statuses[2]),
                        resolvidos[2] && statuses[2] !== "correta" && "opacity-40"
                      )}
                    />
                    <div
                      className={cn(
                        "transition-colors",
                        corBgStatus(statuses[3]),
                        resolvidos[3] && statuses[3] !== "correta" && "opacity-40"
                      )}
                    />
                  </div>
                )}

                {/* Conteúdo da Tecla (Letra / Ícone) */}
                <div className="relative z-10 flex items-center justify-center w-full h-full pointer-events-none drop-shadow-xs">
                  {tecla === "BACKSPACE" ? (
                    <Delete size={17} className="stroke-[2.2]" />
                  ) : tecla === "ENTER" ? (
                    <span>ENTER</span>
                  ) : (
                    <span
                      className={cn(
                        tabuleiros === 1 && statuses[0] !== "vazio" && "text-white",
                        tabuleiros > 1 &&
                          statuses.some((s) => s === "correta" || s === "existe") &&
                          "text-white font-extrabold"
                      )}
                    >
                      {tecla}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
