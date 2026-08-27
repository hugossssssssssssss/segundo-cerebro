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

  // Filtra e prioriza tarefas de hoje, atrasadas e pendentes
  const tarefasPrioritarias = tarefas
    .filter((t) => t.status !== "feito")
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
    <div className="flex flex-col justify-between h-full space-y-3">
      {/* Lista de Tarefas */}
      <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[260px] pr-1">
        {tarefasPrioritarias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Check size={20} />
            </div>
            <p className="text-xs font-semibold text-foreground">Tudo em dia por aqui!</p>
            <p className="text-[11px] text-muted-foreground/70 max-w-[200px]">
              Nenhuma tarefa pendente para hoje.
            </p>
          </div>
        ) : (
          tarefasPrioritarias.map((t) => {
            const nivelUrgencia = urgencia(t);
            const prazoInfo = textoPrazo(t);
            const ehAtrasada = t.prazo && t.prazo < hoje;

            return (
              <div
                key={t.caminho}
                onClick={() => aoAbrirTarefa(t)}
                className="group flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-border/50 bg-background/50 hover:bg-accent/60 hover:border-border transition-all cursor-pointer shadow-2xs"
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
                        : "border-border/80 hover:border-emerald-500 bg-card"
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
          placeholder="+ Adicionar tarefa rápida..."
          className="w-full text-xs bg-background/60 border border-border/70 rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-2xs"
        />
      </form>
    </div>
  );
}
