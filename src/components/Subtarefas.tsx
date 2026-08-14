import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
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
 * Lista de subtarefas de uma tarefa.
 *
 * Elas vivem no corpo em Markdown (`- [ ] texto`), então este componente só
 * edita o texto — não existe estado paralelo que possa divergir do arquivo.
 */
export function Subtarefas({
  corpo,
  onChange,
}: {
  corpo: string;
  onChange: (corpo: string) => void;
}) {
  const [nova, setNova] = useState("");
  const subs = lerSubtarefas(corpo);
  const { feitas, total, porcento } = progressoSubtarefas(corpo);

  function acrescentar() {
    if (!nova.trim()) return;
    onChange(adicionarSubtarefa(corpo, nova));
    setNova("");
  }

  return (
    <div className="space-y-2">
      {total > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${porcento}%` }}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {feitas}/{total}
          </span>
        </div>
      )}

      <ul className="space-y-1">
        {subs.map((s) => (
          <li key={s.linha} className="group flex items-start gap-2">
            {/* -m-1.5 p-1.5 amplia a área de toque sem mexer no layout */}
            <button
              type="button"
              onClick={() => onChange(alternarSubtarefa(corpo, s.linha))}
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
              onClick={() => onChange(removerSubtarefa(corpo, s.linha))}
              className="-m-1.5 shrink-0 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus:opacity-100"
              aria-label="Remover subtarefa"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
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
          className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
