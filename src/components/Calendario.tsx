import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Cartao, Selo } from "@/components/ui";
import { cn } from "@/lib/utils";
import { urgencia, type Tarefa } from "@/lib/tarefas";

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
    <div className="space-y-6 md:grid md:grid-cols-[1fr_300px] md:gap-6 md:space-y-0">
      <Cartao className="p-4 flex justify-center">
        <style>{`
          .rdp {
            --rdp-cell-size: 40px;
            --rdp-accent-color: var(--color-primary);
            --rdp-background-color: var(--color-primary);
            --rdp-accent-color-dark: var(--color-primary);
            --rdp-background-color-dark: var(--color-primary);
            --rdp-outline: 2px solid var(--color-primary);
            --rdp-outline-selected: 2px solid var(--color-primary);
            margin: 0;
          }
          .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
            background-color: var(--color-primary);
            color: var(--color-primary-foreground);
            font-weight: bold;
          }
          .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
            background-color: var(--color-accent);
          }
          .rdp-day {
            border-radius: 8px;
            position: relative;
          }
          .rdp-nav_button {
            border-radius: 8px;
          }
          .day-overdue::after { content: ''; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; border-radius: 50%; background-color: var(--color-destructive); }
          .day-pending::after { content: ''; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; border-radius: 50%; background-color: var(--color-primary); }
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
            <h3 className="text-sm font-medium text-muted-foreground">
              {doDia.length === 0
                ? "Nada para " + format(selecionado, "dd/MM")
                : `${doDia.length} tarefa${doDia.length > 1 ? "s" : ""} em ${format(selecionado, "dd/MM")}`}
            </h3>
            {doDia.length > 0 ? (
              <div className="grid gap-2">
                {doDia.map((t) => (
                  <Cartao
                    key={t.caminho}
                    className="cursor-pointer p-3 transition-colors hover:bg-accent border-l-2"
                    style={{ borderLeftColor: t.status === "feito" ? 'var(--color-muted)' : 'var(--color-primary)' }}
                    onClick={() => aoAbrir(t)}
                  >
                    <p
                      className={cn(
                        "text-sm font-medium",
                        t.status === "feito" && "text-muted-foreground line-through",
                      )}
                    >
                      {t.titulo}
                    </p>
                  </Cartao>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                Dia livre!
              </div>
            )}
          </div>
        )}

        {semData.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Sem data marcada ({semData.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {semData.slice(0, 10).map((t) => (
                <button key={t.caminho} onClick={() => aoAbrir(t)} className="text-left">
                  <Selo className="hover:bg-primary/20 transition-colors cursor-pointer">{t.titulo}</Selo>
                </button>
              ))}
              {semData.length > 10 && (
                <Selo>e mais {semData.length - 10}</Selo>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
