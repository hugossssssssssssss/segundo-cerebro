import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import { Botao, Cartao } from "@/components/ui";

/**
 * Pomodoro. Roda inteiro no navegador — não fala com a rede.
 *
 * Conta pelo relógio (timestamp) e não somando segundos, porque o navegador
 * congela timers em aba de fundo e no celular com a tela apagada. Somando
 * segundos, o timer atrasaria; pelo relógio, fica certo.
 */

const FOCO = 25 * 60;
const PAUSA = 5 * 60;

function formatar(segundos: number): string {
  const m = Math.floor(Math.max(0, segundos) / 60);
  const s = Math.max(0, segundos) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Pomodoro({
  tarefa,
  aoConcluirCiclo,
  aoFechar,
}: {
  tarefa: string;
  /** Chamado quando um ciclo de foco termina, com os minutos trabalhados */
  aoConcluirCiclo: (minutos: number) => void;
  aoFechar: () => void;
}) {
  const [modo, setModo] = useState<"foco" | "pausa">("foco");
  const [rodando, setRodando] = useState(false);
  const [restante, setRestante] = useState(FOCO);

  // Momento em que o ciclo atual deve acabar (ms). Fonte da verdade do timer.
  const fimEm = useRef<number | null>(null);
  const jaAvisou = useRef(false);

  const total = modo === "foco" ? FOCO : PAUSA;

  useEffect(() => {
    if (!rodando) return;

    const tick = () => {
      if (fimEm.current === null) return;
      const falta = Math.round((fimEm.current - Date.now()) / 1000);
      setRestante(falta);

      if (falta <= 0 && !jaAvisou.current) {
        jaAvisou.current = true;
        setRodando(false);

        if (modo === "foco") {
          aoConcluirCiclo(FOCO / 60);
          setModo("pausa");
          setRestante(PAUSA);
        } else {
          setModo("foco");
          setRestante(FOCO);
        }

        // Aviso discreto; se o navegador bloquear, não faz diferença
        try {
          new Audio(
            "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
          ).play();
        } catch {
          /* sem som, tudo bem */
        }
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [rodando, modo, aoConcluirCiclo]);

  function alternar() {
    if (rodando) {
      setRodando(false);
      fimEm.current = null;
      return;
    }
    jaAvisou.current = false;
    fimEm.current = Date.now() + restante * 1000;
    setRodando(true);
  }

  function reiniciar() {
    setRodando(false);
    fimEm.current = null;
    jaAvisou.current = false;
    setRestante(total);
  }

  const progresso = ((total - Math.max(0, restante)) / total) * 100;

  return (
    <Cartao className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:w-80 z-40 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {modo === "foco" ? "Foco" : "Pausa"}
          </p>
          <p className="truncate text-sm font-medium">{tarefa}</p>
        </div>
        <button
          onClick={aoFechar}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      <p className="mt-3 text-center text-4xl font-semibold tabular-nums">
        {formatar(restante)}
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${progresso}%` }}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Botao tamanho="pequeno" onClick={alternar} className="flex-1">
          {rodando ? <Pause size={15} /> : <Play size={15} />}
          {rodando ? "Pausar" : "Começar"}
        </Botao>
        <Botao variante="neutro" tamanho="pequeno" onClick={reiniciar}>
          <RotateCcw size={15} />
        </Botao>
      </div>
    </Cartao>
  );
}
