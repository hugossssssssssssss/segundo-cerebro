import { useState, type ReactNode } from "react";
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
 * Renderiza formatações inline de Markdown em subtarefas:
 * **negrito**, *itálico*, `código`, ~~tachado~~ e @menções.
 */
export function renderizarMarkdownInline(texto: string): ReactNode {
  if (!texto) return null;

  // Se não contém nenhum caractere de formatação, devolve o texto puro diretamente
  if (!/[*_~`@\[]/.test(texto)) {
    return texto;
  }

  // Regex que busca tokens inline de markdown
  const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3|(~~)(.*?)\5|(`)(.*?)\7|\[(.*?)\]\((.*?)\)|(?<![\w.@-])@([a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ][a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ0-9_\- \t]{1,40}?)(?=[^a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ0-9_\- \t]|$)/g;

  const partes: ReactNode[] = [];
  let ultimoIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(texto)) !== null) {
    if (match.index > ultimoIndex) {
      partes.push(texto.slice(ultimoIndex, match.index));
    }

    if (match[1] && match[2]) {
      // Negrito: **texto** ou __texto__
      partes.push(
        <strong key={`b-${match.index}`} className="font-bold text-foreground">
          {renderizarMarkdownInline(match[2])}
        </strong>
      );
    } else if (match[3] && match[4]) {
      // Itálico: *texto* ou _texto_
      partes.push(
        <em key={`i-${match.index}`} className="italic">
          {match[4]}
        </em>
      );
    } else if (match[5] && match[6]) {
      // Tachado: ~~texto~~
      partes.push(
        <del key={`d-${match.index}`} className="line-through opacity-80">
          {match[6]}
        </del>
      );
    } else if (match[7] && match[8]) {
      // Código: `código`
      partes.push(
        <code
          key={`c-${match.index}`}
          className="rounded bg-muted/80 px-1 py-0.5 font-mono text-[12px] text-primary"
        >
          {match[8]}
        </code>
      );
    } else if (match[9] && match[10]) {
      // Link: [texto](url)
      partes.push(
        <a
          key={`a-${match.index}`}
          href={match[10]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-primary hover:underline font-medium"
        >
          {match[9]}
        </a>
      );
    } else if (match[11]) {
      // Menção: @alvo
      const mencao = match[11].trim();
      partes.push(
        <span
          key={`m-${match.index}`}
          className="font-medium text-primary hover:underline"
        >
          @{mencao}
        </span>
      );
    } else {
      partes.push(match[0]);
    }

    ultimoIndex = regex.lastIndex;
  }

  if (ultimoIndex < texto.length) {
    partes.push(texto.slice(ultimoIndex));
  }

  return <>{partes}</>;
}

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
                  onClick={() => onChange(alternarSubtarefa(corpo, s.linha, s.feita))}
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
                    "min-w-0 flex-1 text-sm leading-relaxed",
                    s.feita && "text-muted-foreground line-through",
                  )}
                >
                  {renderizarMarkdownInline(s.texto)}
                </span>

                <button
                  type="button"
                  onClick={() => onChange(removerSubtarefa(corpo, s.linha, s.feita))}
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
