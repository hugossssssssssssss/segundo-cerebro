import { useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { type Tarefa, urgencia, textoPrazo } from "@/lib/tarefas";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface WidgetFocoHojeProps {
  tarefas: Tarefa[];
  aoAlternarConclusao: (tarefa: Tarefa) => void;
  aoAbrirTarefa: (tarefa: Tarefa) => void;
  aoCriarRapida: (titulo: string) => void;
}

export function WidgetFocoHoje({
  tarefas,
  aoAlternarConclusao,
  aoAbrirTarefa,
  aoCriarRapida,
}: WidgetFocoHojeProps) {
  const [novoTitulo, setNovoTitulo] = useState("");

  const hoje = new Date().toISOString().split("T")[0];

  const tarefasPendentes = tarefas.filter((t) => t.status !== "feito");
  const tarefasConcluidasHoje = tarefas.filter((t) => t.status === "feito");

  const totalTarefas = tarefasPendentes.length + tarefasConcluidasHoje.length;
  const percentual = totalTarefas > 0 ? Math.round((tarefasConcluidasHoje.length / totalTarefas) * 100) : 0;

  // Prioriza atrasadas, depois hoje, depois próximas
  const prioritarias = [...tarefasPendentes]
    .sort((a, b) => {
      const urgA = urgencia(a) === "atrasada" ? 3 : urgencia(a) === "hoje" ? 2 : urgencia(a) === "proxima" ? 1 : 0;
      const urgB = urgencia(b) === "atrasada" ? 3 : urgencia(b) === "hoje" ? 2 : urgencia(b) === "proxima" ? 1 : 0;
      return urgB - urgA;
    })
    .slice(0, 5);

  const handleCriar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;
    aoCriarRapida(novoTitulo.trim());
    setNovoTitulo("");
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-3.5">
      {/* Indicador Superior de Progresso Diário */}
      <div className="p-2.5 rounded-2xl bg-secondary/30 border border-border/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
            {percentual}%
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-foreground">
              {tarefasConcluidasHoje.length} de {totalTarefas} concluídas
            </p>
            <p className="text-[10px] text-muted-foreground">
              {tarefasPendentes.length === 0 ? "Tudo concluído por hoje!" : `${tarefasPendentes.length} pendentes`}
            </p>
          </div>
        </div>

        {/* Mini Barra de Progresso */}
        <div className="w-20 bg-secondary h-2 rounded-full overflow-hidden shrink-0">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${percentual}%` }}
          />
        </div>
      </div>

      {/* Lista de Tarefas Prioritárias */}
      <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[260px] pr-0.5">
        {prioritarias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Check size={20} />
            </div>
            <p className="text-xs font-semibold text-foreground">Foco do dia em dia!</p>
            <p className="text-[11px] text-muted-foreground/70 max-w-[220px]">
              Nenhuma tarefa pendente. Use o campo abaixo para registrar uma nova ação.
            </p>
          </div>
        ) : (
          prioritarias.map((t) => {
            const nivelUrgencia = urgencia(t);
            const prazoInfo = textoPrazo(t);
            const ehAtrasada = t.prazo && t.prazo < hoje;

            return (
              <div
                key={t.caminho}
                onClick={() => aoAbrirTarefa(t)}
                className="group flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-border/50 bg-background/50 hover:bg-card hover:border-emerald-500/30 transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      aoAlternarConclusao(t);
                    }}
                    className={cn(
                      "h-5 w-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0",
                      t.status === "feito"
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-border/80 hover:border-emerald-500 bg-card/80 hover:scale-105"
                    )}
                    title="Marcar como concluída"
                  >
                    {t.status === "feito" && <Check size={12} strokeWidth={3} />}
                  </button>

                  <span
                    className={cn(
                      "text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors",
                      t.status === "feito" && "line-through opacity-50"
                    )}
                  >
                    {t.titulo}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {ehAtrasada ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 gap-1 font-bold">
                      <AlertTriangle size={10} />
                      <span>Atrasada</span>
                    </Badge>
                  ) : prazoInfo ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium">
                      {prazoInfo}
                    </Badge>
                  ) : nivelUrgencia === "hoje" ? (
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Vence hoje" />
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input de Adição Rápida */}
      <form onSubmit={handleCriar} className="relative pt-1 border-t border-border/40">
        <input
          type="text"
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          placeholder="+ Adicionar tarefa rápida e pressionar Enter..."
          className="w-full text-xs bg-background/60 border border-border/70 rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-2xs"
        />
      </form>
    </div>
  );
}
