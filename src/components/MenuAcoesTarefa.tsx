import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Calendar,
  CalendarPlus,
  Timer,
  Target,
  Copy,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Tarefa } from "@/lib/tarefas";

interface MenuAcoesTarefaProps {
  tarefa: Tarefa;
  aoAlternarStatus?: () => void;
  aoAdiarPrazo?: (dias: number) => void;
  aoCronometrar?: () => void;
  aoDuplicar?: () => void;
  aoRegistrarEntregaPDI?: () => void;
  aoExcluir?: () => void;
  className?: string;
  triggerVisivelSempre?: boolean;
}

export function MenuAcoesTarefa({
  tarefa,
  aoAlternarStatus,
  aoAdiarPrazo,
  aoCronometrar,
  aoDuplicar,
  aoRegistrarEntregaPDI,
  aoExcluir,
  className,
  triggerVisivelSempre = false,
}: MenuAcoesTarefaProps) {
  const [aberto, setAberto] = useState(false);
  const feita = tarefa.status === "feito";

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <Tooltip conteudo="Opções da tarefa">
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className={cn(
              "p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors shrink-0 cursor-pointer",
              triggerVisivelSempre ? "opacity-100" : "opacity-0 group-hover:opacity-100 sm:opacity-0 focus:opacity-100",
              aberto && "opacity-100 bg-muted/80 text-foreground",
              className
            )}
            title="Opções da tarefa"
            aria-label={`Opções para ${tarefa.titulo}`}
          >
            <MoreVertical size={14} />
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        align="end"
        sideOffset={4}
        className="w-52 p-1.5 shadow-xl border border-border bg-popover/95 backdrop-blur-md rounded-xl z-50 select-none animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-0.5 text-xs">
          {/* Alternar Status */}
          {aoAlternarStatus && (
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                aoAlternarStatus();
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-left"
            >
              {feita ? (
                <>
                  <Circle size={13} className="text-muted-foreground" />
                  <span>Reabrir tarefa</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Marcar como feita</span>
                </>
              )}
            </button>
          )}

          {/* Focar no Pomodoro */}
          {aoCronometrar && (
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                aoCronometrar();
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-left"
            >
              <Timer size={13} className="text-primary" />
              <span>Iniciar foco (Pomodoro)</span>
            </button>
          )}

          {/* Adiar Prazo */}
          {aoAdiarPrazo && (
            <>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  aoAdiarPrazo(1);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-left"
              >
                <Calendar size={13} className="text-amber-500" />
                <span>Adiar para amanhã (+1 dia)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  aoAdiarPrazo(7);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-left"
              >
                <CalendarPlus size={13} className="text-blue-500" />
                <span>Adiar 1 semana (+7 dias)</span>
              </button>
            </>
          )}

          {/* Registrar como Entrega no PDI */}
          {aoRegistrarEntregaPDI && (
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                aoRegistrarEntregaPDI();
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-left"
            >
              <Target size={13} className="text-purple-500" />
              <span>Registrar entrega no PDI</span>
            </button>
          )}

          {/* Duplicar Tarefa */}
          {aoDuplicar && (
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                aoDuplicar();
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-left"
            >
              <Copy size={13} className="text-muted-foreground" />
              <span>Duplicar tarefa</span>
            </button>
          )}

          {/* Divisor */}
          {aoExcluir && <div className="h-px bg-border/60 my-1" />}

          {/* Excluir Tarefa */}
          {aoExcluir && (
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                aoExcluir();
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
            >
              <Trash2 size={13} />
              <span>Excluir tarefa</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
