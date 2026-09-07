import {
  Link as LinkIcon,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ItemVinculadoDetalhe {
  caminho: string;
  titulo: string;
  tipo: string;
  status?: string;
  concluido?: boolean;
}

export interface MencaoBacklink {
  caminho: string;
  titulo: string;
  tipo: string;
  trecho?: string;
}

interface ResumoRelacaoRollupProps {
  itensVinculados: ItemVinculadoDetalhe[];
  mencoesBacklinks?: MencaoBacklink[];
  aoAbrirItem?: (caminho: string, titulo: string) => void;
  className?: string;
}

export function ResumoRelacaoRollup({
  itensVinculados = [],
  mencoesBacklinks = [],
  aoAbrirItem,
  className,
}: ResumoRelacaoRollupProps) {
  // Rollup de Tarefas: Total e Concluídas
  const tarefasVinculadas = itensVinculados.filter(
    (it) => it.tipo === "tarefa" || it.tipo === "entrega"
  );
  const totalTarefas = tarefasVinculadas.length;
  const concluidas = tarefasVinculadas.filter(
    (t) =>
      t.concluido ||
      t.status === "feito" ||
      t.status === "concluido" ||
      t.status === "finalizado"
  ).length;

  const porcentagem = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;

  if (itensVinculados.length === 0 && mencoesBacklinks.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3 pt-3 border-t border-border/60 text-xs", className)}>
      {/* 1. Rollup de Progresso de Tarefas Relacionadas */}
      {totalTarefas > 0 && (
        <div className="p-2.5 rounded-lg bg-accent/30 border border-border/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              Progresso das Tarefas Vinculadas
            </span>
            <span className="font-mono font-bold text-foreground">
              {concluidas}/{totalTarefas} ({porcentagem}%)
            </span>
          </div>

          <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${porcentagem}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Backlinks ("Mencionado Em") */}
      {mencoesBacklinks.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight size={12} />
            Mencionado em ({mencoesBacklinks.length})
          </span>

          <div className="flex flex-wrap gap-1.5">
            {mencoesBacklinks.map((m) => (
              <Badge
                key={m.caminho}
                variant="outline"
                onClick={() => aoAbrirItem && aoAbrirItem(m.caminho, m.titulo)}
                className="text-xs px-2 py-0.5 bg-card hover:bg-accent cursor-pointer transition-colors flex items-center gap-1 max-w-[220px]"
                title={m.trecho || m.titulo}
              >
                <LinkIcon size={10} className="text-muted-foreground shrink-0" />
                <span className="truncate">{m.titulo}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
