import { useState } from "react";
import { Check, Plus, X, ChevronDown, ChevronRight, ListChecks } from "lucide-react";
import {
  lerSubtarefas,
  alternarSubtarefa,
  adicionarSubtarefa,
  removerSubtarefa,
  progressoSubtarefas,
} from "@/lib/tarefas";
import { Campo } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Lista de subtarefas de uma tarefa (dobrável/minimizável).
 */
export function Subtarefas({
  corpo,
  onChange,
}: {
  corpo: string;
  onChange: (corpo: string) => void;
}) {
  const [nova, setNova] = useState("");
  const [recolhido, setRecolhido] = useState(false);
  const subs = lerSubtarefas(corpo);
  const { feitas, total, porcento } = progressoSubtarefas(corpo);

  function acrescentar() {
    if (!nova.trim()) return;
    onChange(adicionarSubtarefa(corpo, nova));
    setNova("");
  }

  return (
    <div className="space-y-2 border-t border-border/40 pt-3 mt-3">
      {/* Cabeçalho dobrável */}
      <div className="flex items-center justify-between group">
        <button
          type="button"
          onClick={() => setRecolhido(!recolhido)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {recolhido ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          <ListChecks size={14} />
          <span>Passos e Subtarefas</span>
          {total > 0 && (
            <span className="text-[11px] font-normal text-muted-foreground/80">
              ({feitas}/{total} concluídos • {porcento}%)
            </span>
          )}
        </button>

        {total > 0 && (
          <div className="flex items-center gap-2 w-32">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${porcento}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground font-medium">
              {feitas}/{total}
            </span>
          </div>
        )}
      </div>

      {/* Conteúdo recolhível */}
      {!recolhido && (
        <div className="space-y-2 pt-1 pl-1">
          <ul className="space-y-1">
            {subs.map((s) => (
              <li key={`${s.texto}-${s.linha}`} className="group flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => onChange(alternarSubtarefa(corpo, s.texto, s.feita))}
                  className="-m-1.5 shrink-0 p-1.5"
                  aria-label={s.feita ? "Desmarcar" : "Marcar como feita"}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border-2 transition-colors",
                      s.feita
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary",
                    )}
                  >
                    {s.feita && <Check size={11} strokeWidth={3} />}
                  </span>
                </button>

                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm",
                    s.feita && "text-muted-foreground line-through",
                  )}
                >
                  {s.texto}
                </span>

                <button
                  type="button"
                  onClick={() => onChange(removerSubtarefa(corpo, s.texto, s.feita))}
                  className="-m-1.5 shrink-0 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                  aria-label="Remover subtarefa"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 pt-1">
            <Plus size={14} className="shrink-0 text-muted-foreground" />
            <Campo
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  acrescentar();
                }
              }}
              onBlur={acrescentar}
              placeholder="Adicionar um passo…"
              className="h-8 border-0 bg-transparent px-0 text-xs focus-visible:ring-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
