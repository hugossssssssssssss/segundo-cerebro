import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Cartao } from "@/components/ui";
import { SeloStatus } from "@/components/SeloStatus";
import { cn } from "@/lib/utils";
import { urgencia, type Tarefa } from "@/lib/tarefas";
import { Calendar, Clock, ArrowRight } from "lucide-react";

export function Calendario({
  tarefas,
  aoAbrir,
}: {
  tarefas: Tarefa[];
  aoAbrir: (t: Tarefa) => void;
}) {
  const hoje = new Date();
  const [selecionado, setSelecionado] = useState<Date | undefined>(hoje);

  // Create a map of tasks by date for fast lookup
  const porDia = new Map<string, Tarefa[]>();
  for (const t of tarefas) {
    if (!t.prazo) continue;
    const lista = porDia.get(t.prazo) ?? [];
    lista.push(t);
    porDia.set(t.prazo, lista);
  }

  // Get tasks for selected date
  const selectedStr = selecionado ? format(selecionado, "yyyy-MM-dd") : null;
  const doDia = selectedStr ? (porDia.get(selectedStr) ?? []) : [];
  const semData = tarefas.filter((t) => !t.prazo && t.status !== "feito");

  return (
    <div className="space-y-6 md:grid md:grid-cols-[1fr_320px] md:gap-6 md:space-y-0">
      <Cartao className="p-4 flex justify-center border border-border/80 shadow-sm bg-card rounded-2xl">
        <style>{`
          .rdp {
            --rdp-cell-size: 42px;
            --rdp-accent-color: var(--color-primary);
            --rdp-background-color: var(--color-primary);
            --rdp-accent-color-dark: var(--color-primary);
            --rdp-background-color-dark: var(--color-primary);
            --rdp-outline: 2px solid var(--color-primary);
            --rdp-outline-selected: 2px solid var(--color-primary);
            margin: 0;
          }
          .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
            background-color: var(--color-primary) !important;
            color: var(--color-primary-foreground) !important;
            font-weight: bold;
            border-radius: 10px;
          }
          .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
            background-color: var(--color-accent);
            border-radius: 10px;
          }
          .rdp-day {
            border-radius: 10px;
            position: relative;
          }
          .rdp-nav_button {
            border-radius: 10px;
          }
          .day-overdue::after { content: ''; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 5px; height: 5px; border-radius: 50%; background-color: var(--color-destructive); }
          .day-pending::after { content: ''; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 5px; height: 5px; border-radius: 50%; background-color: var(--color-primary); }
        `}</style>
        <DayPicker
          mode="single"
          selected={selecionado}
          onSelect={setSelecionado}
          locale={ptBR}
          modifiers={{
            hasTask: (date) => porDia.has(format(date, "yyyy-MM-dd")),
            hasOverdue: (date) => {
              const tasks = porDia.get(format(date, "yyyy-MM-dd")) ?? [];
              return tasks.some(t => t.status !== "feito" && urgencia(t) === "atrasada");
            },
            hasPending: (date) => {
              const tasks = porDia.get(format(date, "yyyy-MM-dd")) ?? [];
              return tasks.some(t => t.status !== "feito" && urgencia(t) !== "atrasada");
            }
          }}
          modifiersClassNames={{
            hasTask: "font-semibold",
            hasOverdue: "day-overdue",
            hasPending: "day-pending"
          }}
        />
      </Cartao>

      <div className="space-y-6">
        {selecionado && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Calendar size={14} /> {format(selecionado, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              <span className="text-xs font-bold text-primary">
                {doDia.length} {doDia.length === 1 ? "tarefa" : "tarefas"}
              </span>
            </div>

            {doDia.length > 0 ? (
              <div className="grid gap-2.5">
                {doDia.map((t) => {
                  const ehFeito = t.status === "feito";
                  const ehFazendo = t.status === "fazendo";
                  const urg = urgencia(t);

                  return (
                    <div
                      key={t.caminho}
                      onClick={() => aoAbrir(t)}
                      className={cn(
                        "p-3.5 rounded-xl border border-border/80 bg-card hover:bg-accent/70 hover:border-primary/50 transition-all cursor-pointer shadow-2xs group space-y-2",
                        ehFeito && "opacity-60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn("text-xs font-semibold group-hover:text-primary transition-colors leading-snug", ehFeito && "line-through text-muted-foreground")}>
                          {t.titulo}
                        </span>
                        <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        <SeloStatus
                          rotulo={ehFeito ? "Concluída" : ehFazendo ? "Em andamento" : "A fazer"}
                          tom={ehFeito ? "sucesso" : ehFazendo ? "primario" : "neutro"}
                        />
                        {urg === "atrasada" && (
                          <SeloStatus rotulo="Atrasada" tom="perigo" />
                        )}
                        {t.tags?.map((tag) => (
                          <span key={tag} className="text-muted-foreground font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground/80">Dia sem tarefas marcadas 🎉</p>
                <p>Nenhuma pendência agendada para esta data.</p>
              </div>
            )}
          </div>
        )}

        {semData.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Clock size={14} /> Sem prazo definido ({semData.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {semData.slice(0, 10).map((t) => (
                <button
                  key={t.caminho}
                  onClick={() => aoAbrir(t)}
                  className="px-2.5 py-1 rounded-lg border border-border/70 bg-secondary/50 hover:bg-accent text-xs font-medium text-foreground transition-all cursor-pointer"
                >
                  {t.titulo}
                </button>
              ))}
              {semData.length > 10 && (
                <span className="text-xs text-muted-foreground font-medium self-center">
                  +{semData.length - 10} mais
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
