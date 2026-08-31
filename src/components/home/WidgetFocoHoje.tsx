import { useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { type Tarefa, urgencia, textoPrazo } from "@/lib/tarefas";
import { cn, hojeISO } from "@/lib/utils";

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
  const hoje = hojeISO();

  const pendentes = tarefas.filter((t) => t.status !== "feito");

  const prioritarias = [...pendentes]
    .sort((a, b) => {
      const urgA = urgencia(a) === "atrasada" ? 3 : urgencia(a) === "hoje" ? 2 : urgencia(a) === "proxima" ? 1 : 0;
      const urgB = urgencia(b) === "atrasada" ? 3 : urgencia(b) === "hoje" ? 2 : urgencia(b) === "proxima" ? 1 : 0;
      return urgB - urgA;
    })
    .slice(0, 6);

  const handleCriar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;
    aoCriarRapida(novoTitulo.trim());
    setNovoTitulo("");
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-2.5">
      {/* Lista Limpa de Tarefas */}
      <div className="space-y-1 flex-1 overflow-y-auto pr-0.5">
        {prioritarias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-1.5">
            <p className="text-xs font-medium text-foreground">Nenhuma tarefa pendente</p>
            <p className="text-[11px] text-muted-foreground">Tudo em dia por hoje.</p>
          </div>
        ) : (
          prioritarias.map((t) => {
            const prazoInfo = textoPrazo(t);
            const ehAtrasada = t.prazo && t.prazo < hoje;

            return (
              <div
                key={t.caminho}
                onClick={() => aoAbrirTarefa(t)}
                className="group flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-secondary/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      aoAlternarConclusao(t);
                    }}
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0",
                      t.status === "feito"
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border hover:border-foreground bg-card"
                    )}
                  >
                    {t.status === "feito" && <Check size={10} strokeWidth={3} />}
                  </button>

                  <span
                    className={cn(
                      "text-xs text-foreground truncate group-hover:text-primary transition-colors",
                      t.status === "feito" && "line-through opacity-40"
                    )}
                  >
                    {t.titulo}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-[10px]">
                  {ehAtrasada ? (
                    <span className="text-destructive font-medium flex items-center gap-0.5">
                      <AlertCircle size={10} />
                      Atrasada
                    </span>
                  ) : prazoInfo ? (
                    <span className="text-muted-foreground">{prazoInfo}</span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input de Nova Tarefa */}
      <form onSubmit={handleCriar} className="pt-1.5 border-t border-border/40">
        <input
          type="text"
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          placeholder="+ Adicionar tarefa..."
          className="w-full text-xs bg-background/50 border border-border/60 rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border transition-colors"
        />
      </form>
    </div>
  );
}
