import { useState } from "react";
import { Play, Pause, RotateCcw, X, Settings, Headphones } from "lucide-react";
import { Botao, Cartao } from "@/components/ui";
import { useCronometro, LISTA_SONS_AMBIENTE } from "@/components/ContextoCronometro";
import { PrismasFoco } from "@/components/PrismasFoco";
import { minutosRegistrados } from "@/lib/tarefas";

function formatar(segundos: number): string {
  const m = Math.floor(Math.max(0, segundos) / 60);
  const s = Math.max(0, segundos) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Pomodoro() {
  const {
    tarefa,
    rodando,
    modo,
    restante,
    total,
    config,
    metaDiaria,
    concluidosHoje,
    somAmbiente,
    setSomAmbiente,
    pausar,
    retomar,
    reiniciar,
    parar,
    salvarConfig,
  } = useCronometro();

  const [abertoConfig, setAbertoConfig] = useState(false);
  const [abertoSom, setAbertoSom] = useState(false);
  const [tempoFocoTemp, setTempoFocoTemp] = useState(config.tempoFoco);
  const [tempoPausaTemp, setTempoPausaTemp] = useState(config.tempoPausa);

  // Se não houver tarefa cronometrando, não renderiza o painel flutuante
  if (!tarefa) return null;

  const progresso = ((total - Math.max(0, restante)) / total) * 100;
  const ciclosConcluidos = Math.floor(minutosRegistrados(tarefa.corpo) / 25);

  function aplicarConfig() {
    salvarConfig({
      tempoFoco: Math.max(1, tempoFocoTemp),
      tempoPausa: Math.max(1, tempoPausaTemp),
    });
    setAbertoConfig(false);
  }

  return (
    <Cartao className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:w-80 z-50 p-4 shadow-xl border border-border/80 bg-card/95 backdrop-blur rounded-2xl animate-in slide-in-from-bottom-3 duration-200">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${modo === "foco" ? "bg-indigo-500 animate-pulse" : "bg-emerald-500"}`} />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              {modo === "foco" ? "Foco Ativo" : "Descanso / Pausa"}
            </p>
          </div>
          <p className="truncate text-xs font-semibold text-foreground select-none" title={tarefa.titulo}>
            {tarefa.titulo}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              setAbertoConfig(false);
              setAbertoSom((v) => !v);
            }}
            className={`rounded-lg p-1.5 transition-colors cursor-pointer ${abertoSom ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`}
            title="Sons ambiente para imersão"
          >
            <Headphones size={15} />
          </button>
          <button
            onClick={() => {
              setAbertoSom(false);
              setTempoFocoTemp(config.tempoFoco);
              setTempoPausaTemp(config.tempoPausa);
              setAbertoConfig((v) => !v);
            }}
            className={`rounded-lg p-1.5 transition-colors cursor-pointer ${abertoConfig ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`}
            title="Ajustes de tempo"
          >
            <Settings size={15} />
          </button>
          <button
            onClick={parar}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors cursor-pointer"
            title="Parar foco atual"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Ajustes de Configuração */}
      {abertoConfig ? (
        <div className="mt-3 space-y-3 bg-secondary/30 p-3 rounded-xl border border-border/60">
          <p className="text-xs font-semibold text-foreground">Ajustes de Tempo (minutos)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-muted-foreground block mb-1 font-medium">Tempo Foco</label>
              <input
                type="number"
                min={1}
                max={120}
                value={tempoFocoTemp}
                onChange={(e) => setTempoFocoTemp(Math.max(1, Number(e.target.value)))}
                className="w-full h-8 px-2 rounded-lg border border-input bg-card text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground block mb-1 font-medium">Pausa</label>
              <input
                type="number"
                min={1}
                max={60}
                value={tempoPausaTemp}
                onChange={(e) => setTempoPausaTemp(Math.max(1, Number(e.target.value)))}
                className="w-full h-8 px-2 rounded-lg border border-input bg-card text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
          <Botao tamanho="pequeno" variante="neutro" onClick={aplicarConfig} className="w-full text-xs">
            Salvar Ajustes
          </Botao>
        </div>
      ) : abertoSom ? (
        // Menu de Som Ambiente
        <div className="mt-3 space-y-3 bg-secondary/30 p-3 rounded-xl border border-border/60 animate-in fade-in duration-200">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 select-none">
            <Headphones size={13} className="text-indigo-500" />
            Som de Fundo (Foco)
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSomAmbiente(null)}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors cursor-pointer select-none ${
                somAmbiente === null
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-card hover:bg-accent border-border text-muted-foreground"
              }`}
            >
              Silêncio
            </button>
            {LISTA_SONS_AMBIENTE.map((som) => (
              <button
                key={som.id}
                onClick={() => setSomAmbiente(som.id)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors cursor-pointer select-none ${
                  somAmbiente === som.id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-card hover:bg-accent border-border text-muted-foreground"
                }`}
              >
                {som.nome}
              </button>
            ))}
          </div>
          <Botao tamanho="pequeno" variante="neutro" onClick={() => setAbertoSom(false)} className="w-full text-xs">
            Fechar
          </Botao>
        </div>
      ) : (
        <>
          {/* Cronômetro */}
          <p className="mt-3 text-center text-4xl font-bold tracking-tight tabular-nums text-foreground select-none">
            {formatar(restante)}
          </p>

          {/* Prismas de Concentração da Tarefa */}
          <div className="mt-2 flex justify-center">
            <PrismasFoco
              estimativa={tarefa.Pomodoro || 0}
              concluido={ciclosConcluidos}
              fraturados={tarefa.fraturados || 0}
              rodando={rodando && modo === "foco"}
              tamanho={14}
            />
          </div>

          {/* Meta Diária Dinâmica */}
          <p className="mt-1.5 text-center text-[10px] font-medium text-muted-foreground select-none">
            Hoje: {concluidosHoje} / {metaDiaria} {metaDiaria === 1 ? "prisma" : "prismas"}
          </p>

          {/* Barra de Progresso */}
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${modo === "foco" ? "bg-indigo-500" : "bg-emerald-500"}`}
              style={{ width: `${progresso}%` }}
            />
          </div>

          {/* Controles de Play / Pause */}
          <div className="mt-4 flex gap-2">
            <Botao
              tamanho="pequeno"
              onClick={rodando ? pausar : retomar}
              className={`flex-1 font-semibold text-xs transition-all cursor-pointer ${
                rodando 
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {rodando ? <Pause size={14} /> : <Play size={14} />}
              {rodando ? "Pausar" : modo === "foco" ? "Iniciar Foco" : "Iniciar Descanso"}
            </Botao>
            <Botao 
              variante="neutro" 
              tamanho="pequeno" 
              onClick={reiniciar} 
              title="Reiniciar ciclo"
              className="hover:bg-accent transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
            </Botao>
          </div>
        </>
      )}
    </Cartao>
  );
}
