import { cn } from "@/lib/utils";
import type {
  InfoCelula,
  DirecaoPista,
} from "@/lib/jogos/cruzadinha/cruzadinhaEngine";

interface GradeCruzadinhaProps {
  matriz: InfoCelula[][];
  celulaFoco: { linha: number; coluna: number } | null;
  direcaoAtiva: DirecaoPista;
  pistaAtivaNum: number | null;
  aoClicarCelula: (linha: number, coluna: number) => void;
}

export function GradeCruzadinha({
  matriz,
  celulaFoco,
  direcaoAtiva,
  pistaAtivaNum,
  aoClicarCelula,
}: GradeCruzadinhaProps) {
  const numColunas = matriz[0]?.length || 0;

  return (
    <div className="flex items-center justify-center p-2 sm:p-3 overflow-x-auto select-none">
      <div
        className="grid gap-1 sm:gap-1.5 p-2 rounded-2xl bg-card border-2 border-border/80 shadow-sm"
        style={{
          gridTemplateColumns: `repeat(${numColunas}, minmax(0, 1fr))`,
        }}
      >
        {matriz.map((linhaArr, r) =>
          linhaArr.map((cel, c) => {
            if (cel.bloqueada) {
              return (
                <div
                  key={`cel-block-${r}-${c}`}
                  className="h-8 w-8 sm:h-11 sm:w-11 xl:h-12 xl:w-12 rounded-lg bg-zinc-800/90 dark:bg-zinc-950/80 border border-zinc-700/50 dark:border-zinc-800"
                />
              );
            }

            const ehFoco = celulaFoco?.linha === r && celulaFoco?.coluna === c;
            const pertencePistaAtiva =
              pistaAtivaNum !== null &&
              ((direcaoAtiva === "across" && cel.pistaAcross === pistaAtivaNum) ||
                (direcaoAtiva === "down" && cel.pistaDown === pistaAtivaNum));

            const letra = cel.letraDigitada || "";
            const status = cel.statusVerificacao || "neutro";

            return (
              <button
                key={`cel-${r}-${c}`}
                type="button"
                onClick={() => aoClicarCelula(r, c)}
                className={cn(
                  "relative flex items-center justify-center h-8 w-8 sm:h-11 sm:w-11 xl:h-12 xl:w-12 rounded-lg border font-bold uppercase transition-all duration-150 cursor-pointer text-sm sm:text-lg xl:text-xl select-none",
                  // Status de Verificação
                  status === "correta"
                    ? "bg-[#3aa394]/25 border-[#3aa394] text-[#3aa394] dark:text-[#3aa394]"
                    : status === "incorreta"
                    ? "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400"
                    : ehFoco
                    ? "bg-primary/20 border-primary ring-2 ring-primary/50 text-foreground scale-102 z-10"
                    : pertencePistaAtiva
                    ? "bg-primary/10 border-primary/40 text-foreground"
                    : "bg-card border-border text-foreground hover:bg-accent/60"
                )}
                aria-label={`Linha ${r + 1}, Coluna ${c + 1}, letra ${letra || "vazia"}`}
              >
                {/* Número da Pista no Canto */}
                {cel.numero !== undefined && (
                  <span className="absolute top-0.5 left-1 text-[9px] sm:text-[10px] font-mono font-extrabold text-muted-foreground/80 leading-none pointer-events-none">
                    {cel.numero}
                  </span>
                )}

                {/* Letra preenchida */}
                <span className="mt-1 sm:mt-0 font-extrabold leading-none">{letra}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
