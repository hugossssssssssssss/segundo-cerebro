import { cn } from "@/lib/utils";
import type { TabuleiroCruzadinha } from "@/lib/jogos/cruzadinha/bancoCruzadinhas";
import type { DirecaoPista } from "@/lib/jogos/cruzadinha/cruzadinhaEngine";

interface ListaPistasCruzadinhaProps {
  tabuleiro: TabuleiroCruzadinha;
  direcaoAtiva: DirecaoPista;
  pistaAtivaNum: number | null;
  aoSelecionarPista: (direcao: DirecaoPista, numero: number) => void;
}

export function ListaPistasCruzadinha({
  tabuleiro,
  direcaoAtiva,
  pistaAtivaNum,
  aoSelecionarPista,
}: ListaPistasCruzadinhaProps) {
  const pistasAcross = Object.values(tabuleiro.across).sort((a, b) => a.numero - b.numero);
  const pistasDown = Object.values(tabuleiro.down).sort((a, b) => a.numero - b.numero);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full text-xs">
      {/* Pistas Horizontais */}
      <div className="space-y-2 p-3 rounded-2xl bg-secondary/30 border border-border/60 flex flex-col">
        <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
          <span>Horizontais (Across)</span>
        </h4>
        <div className="space-y-1 max-h-64 sm:max-h-80 lg:max-h-[500px] xl:max-h-[560px] overflow-y-auto pr-1 flex-1">
          {pistasAcross.map((p) => {
            const ehAtiva = direcaoAtiva === "across" && pistaAtivaNum === p.numero;
            return (
              <button
                key={`pista-across-${p.numero}`}
                type="button"
                onClick={() => aoSelecionarPista("across", p.numero)}
                className={cn(
                  "w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-start gap-2 text-xs",
                  ehAtiva
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="font-mono font-bold shrink-0">{p.numero}.</span>
                <span className="leading-snug">{p.pista}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pistas Verticais */}
      <div className="space-y-2 p-3 rounded-2xl bg-secondary/30 border border-border/60 flex flex-col">
        <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
          <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
          <span>Verticais (Down)</span>
        </h4>
        <div className="space-y-1 max-h-64 sm:max-h-80 lg:max-h-[500px] xl:max-h-[560px] overflow-y-auto pr-1 flex-1">
          {pistasDown.map((p) => {
            const ehAtiva = direcaoAtiva === "down" && pistaAtivaNum === p.numero;
            return (
              <button
                key={`pista-down-${p.numero}`}
                type="button"
                onClick={() => aoSelecionarPista("down", p.numero)}
                className={cn(
                  "w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-start gap-2 text-xs",
                  ehAtiva
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="font-mono font-bold shrink-0">{p.numero}.</span>
                <span className="leading-snug">{p.pista}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
