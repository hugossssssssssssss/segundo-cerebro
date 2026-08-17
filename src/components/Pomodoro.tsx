import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, X, Settings } from "lucide-react";
import { Botao, Cartao } from "@/components/ui";

/**
 * Pomodoro com configurações personalizáveis de tempo de Foco e Descanso.
 * Persiste preferências no localStorage ("pomodoro-config").
 */

interface ConfigPomodoro {
  tempoFoco: number; // minutos
  tempoPausa: number; // minutos
}

function carregarConfigPomodoro(): ConfigPomodoro {
  try {
    const salvo = localStorage.getItem("pomodoro-config");
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (typeof parsed.tempoFoco === "number" && typeof parsed.tempoPausa === "number") {
        return parsed;
      }
    }
  } catch {
    /* fallback */
  }
  return { tempoFoco: 25, tempoPausa: 5 };
}

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
  const [config, setConfig] = useState<ConfigPomodoro>(carregarConfigPomodoro);
  const [abertoConfig, setAbertoConfig] = useState(false);
  const [modo, setModo] = useState<"foco" | "pausa">("foco");
  const [rodando, setRodando] = useState(false);

  const focoSegundos = (config.tempoFoco || 25) * 60;
  const pausaSegundos = (config.tempoPausa || 5) * 60;

  const [restante, setRestante] = useState(focoSegundos);

  // Momento em que o ciclo atual deve acabar (ms). Fonte da verdade do timer.
  const fimEm = useRef<number | null>(null);
  const jaAvisou = useRef(false);

  const total = modo === "foco" ? focoSegundos : pausaSegundos;

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
          aoConcluirCiclo(config.tempoFoco);
          setModo("pausa");
          setRestante(pausaSegundos);
        } else {
          setModo("foco");
          setRestante(focoSegundos);
        }

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
  }, [rodando, modo, config.tempoFoco, config.tempoPausa, aoConcluirCiclo, focoSegundos, pausaSegundos]);

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

  function salvarConfig(novos: ConfigPomodoro) {
    setConfig(novos);
    localStorage.setItem("pomodoro-config", JSON.stringify(novos));
    if (!rodando) {
      const nTotal = modo === "foco" ? novos.tempoFoco * 60 : novos.tempoPausa * 60;
      setRestante(nTotal);
    }
  }

  const progresso = ((total - Math.max(0, restante)) / total) * 100;

  return (
    <Cartao className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:w-80 z-50 p-4 shadow-xl border border-border/80 bg-card rounded-2xl animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${modo === "foco" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {modo === "foco" ? "Foco Pomodoro" : "Descanso / Pausa"}
            </p>
          </div>
          <p className="truncate text-xs font-medium text-foreground">{tarefa}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAbertoConfig((v) => !v)}
            className={`rounded-lg p-1.5 transition-colors ${abertoConfig ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`}
            title="Ajustes de tempo do Pomodoro"
          >
            <Settings size={15} />
          </button>
          <button
            onClick={aoFechar}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Fechar timer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {abertoConfig ? (
        <div className="mt-3 space-y-3 bg-secondary/30 p-3 rounded-xl border border-border/60">
          <p className="text-xs font-semibold text-foreground">Configurações de Tempo (minutos)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1 font-medium">Tempo Foco (min)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={config.tempoFoco}
                onChange={(e) => salvarConfig({ ...config, tempoFoco: Math.max(1, Number(e.target.value)) })}
                className="w-full h-8 px-2 rounded-lg border border-input bg-card text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1 font-medium">Descanso (min)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={config.tempoPausa}
                onChange={(e) => salvarConfig({ ...config, tempoPausa: Math.max(1, Number(e.target.value)) })}
                className="w-full h-8 px-2 rounded-lg border border-input bg-card text-xs font-medium"
              />
            </div>
          </div>
          <Botao tamanho="pequeno" variante="neutro" onClick={() => setAbertoConfig(false)} className="w-full text-xs">
            Pronto
          </Botao>
        </div>
      ) : (
        <>
          <p className="mt-3 text-center text-4xl font-bold tracking-tight tabular-nums">
            {formatar(restante)}
          </p>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${modo === "foco" ? "bg-primary" : "bg-emerald-500"}`}
              style={{ width: `${progresso}%` }}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <Botao tamanho="pequeno" onClick={alternar} className="flex-1 font-semibold text-xs">
              {rodando ? <Pause size={15} /> : <Play size={15} />}
              {rodando ? "Pausar" : "Iniciar Foco"}
            </Botao>
            <Botao variante="neutro" tamanho="pequeno" onClick={reiniciar} title="Reiniciar ciclo">
              <RotateCcw size={15} />
            </Botao>
          </div>
        </>
      )}
    </Cartao>
  );
}
