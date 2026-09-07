import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Calendar,
  CalendarPlus,
  Timer,
  Target,
  Copy,
  Share2,
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
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent transition-colors cursor-pointer text-left touch-manipulation min-h-[38px]"
            >
              {feita ? (
                <>
                  <Circle size={14} className="text-muted-foreground shrink-0" />
                  <span className="font-medium">Reabrir tarefa</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span className="font-medium">Marcar como feita</span>
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
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent transition-colors cursor-pointer text-left touch-manipulation min-h-[38px]"
            >
              <Timer size={14} className="text-primary shrink-0" />
              <span className="font-medium">Iniciar foco (Pomodoro)</span>
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
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent transition-colors cursor-pointer text-left touch-manipulation min-h-[38px]"
              >
                <Calendar size={14} className="text-amber-500 shrink-0" />
                <span className="font-medium">Adiar para amanhã (+1 dia)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  aoAdiarPrazo(7);
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent transition-colors cursor-pointer text-left touch-manipulation min-h-[38px]"
              >
                <CalendarPlus size={14} className="text-blue-500 shrink-0" />
                <span className="font-medium">Adiar 1 semana (+7 dias)</span>
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
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent transition-colors cursor-pointer text-left touch-manipulation min-h-[38px]"
            >
              <Target size={14} className="text-purple-500 shrink-0" />
              <span className="font-medium">Registrar entrega no PDI</span>
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
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent transition-colors cursor-pointer text-left touch-manipulation min-h-[38px]"
            >
              <Copy size={14} className="text-muted-foreground shrink-0" />
              <span className="font-medium">Duplicar tarefa</span>
            </button>
          )}

          {/* Compartilhar Tarefa */}
          <button
            type="button"
            onClick={async () => {
              setAberto(false);
              const { compartilharTarefa } = await import("@/lib/compartilhar");
              const { toast } = await import("@/lib/toast");
              const res = await compartilharTarefa(tarefa);
              if (res.metodo === "copiado" && res.sucesso) {
                toast("Tarefa copiada para a área de transferência!", { tipo: "sucesso" });
              }
            }}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent transition-colors cursor-pointer text-left touch-manipulation min-h-[38px]"
          >
            <Share2 size={14} className="text-muted-foreground shrink-0" />
            <span className="font-medium">Compartilhar</span>
          </button>

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
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-colors cursor-pointer text-left touch-manipulation min-h-[38px]"
            >
              <Trash2 size={14} className="shrink-0" />
              <span className="font-medium">Excluir tarefa</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
