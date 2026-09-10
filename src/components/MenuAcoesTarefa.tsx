import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Timer,
  Target,
  Copy,
  Share2,
  Trash2,
  MoreVertical,
  Globe,
  ChevronRight,
  ChevronDown,
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
  aoExcluirGoogleCalendar?: () => void;
  aoSincronizarGoogleCalendar?: () => void;
  aoRemoverGoogleCalendar?: () => void;
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
  aoExcluirGoogleCalendar,
  aoSincronizarGoogleCalendar,
  aoRemoverGoogleCalendar,
  className,
  triggerVisivelSempre = false,
}: MenuAcoesTarefaProps) {
  const [aberto, setAberto] = useState(false);
  const [menuAdiarAberto, setMenuAdiarAberto] = useState(false);
  const feita = tarefa.status === "feito";

  return (
    <Popover open={aberto} onOpenChange={(val) => {
      setAberto(val);
      if (!val) setMenuAdiarAberto(false);
    }}>
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
          {/* Adiar Prazo (Botão Único com Submenu / Dropdown) */}
          {aoAdiarPrazo && (
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setMenuAdiarAberto(!menuAdiarAberto)}
                className={cn(
                  "flex items-center justify-between px-2.5 py-2 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-left touch-manipulation min-h-[36px]",
                  menuAdiarAberto && "bg-accent/70 font-medium"
                )}
                aria-expanded={menuAdiarAberto}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar size={14} className="text-amber-500 shrink-0" />
                  <span>Adiar</span>
                </div>
                {menuAdiarAberto ? (
                  <ChevronDown size={13} className="text-muted-foreground" />
                ) : (
                  <ChevronRight size={13} className="text-muted-foreground" />
                )}
              </button>

              {menuAdiarAberto && (
                <div className="pl-6 pr-1 py-1 flex flex-col gap-0.5 border-l-2 border-primary/30 ml-3.5 my-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setAberto(false);
                      setMenuAdiarAberto(false);
                      aoAdiarPrazo(1);
                    }}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                  >
                    <span>Amanhã</span>
                    <span className="text-[10px] text-muted-foreground">+1 dia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAberto(false);
                      setMenuAdiarAberto(false);
                      aoAdiarPrazo(3);
                    }}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                  >
                    <span>3 dias</span>
                    <span className="text-[10px] text-muted-foreground">+3 dias</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAberto(false);
                      setMenuAdiarAberto(false);
                      aoAdiarPrazo(7);
                    }}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                  >
                    <span>1 semana</span>
                    <span className="text-[10px] text-muted-foreground">+7 dias</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAberto(false);
                      setMenuAdiarAberto(false);
                      aoAdiarPrazo(30);
                    }}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                  >
                    <span>1 mês</span>
                    <span className="text-[10px] text-muted-foreground">+30 dias</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Registrar como Entrega no PDI */}
          {aoRegistrarEntregaPDI && (
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                aoRegistrarEntregaPDI();
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent transition-colors cursor-pointer text-left touch-manipulation min-h-[36px]"
            >
              <Target size={14} className="text-purple-500 shrink-0" />
              <span className="font-medium">Registrar entrega no PDI</span>
            </button>
          )}

          {/* Sincronização Google Calendar */}
          {aoSincronizarGoogleCalendar && (
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                aoSincronizarGoogleCalendar();
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent transition-colors cursor-pointer text-left touch-manipulation min-h-[36px]"
            >
              <Globe size={14} className="text-blue-500 shrink-0" />
              <span className="font-medium">
                {tarefa.googleCalendarId ? "Atualizar no Google Calendar" : "Enviar p/ Google Calendar"}
              </span>
            </button>
          )}

          {aoRemoverGoogleCalendar && tarefa.googleCalendarId && (
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                aoRemoverGoogleCalendar();
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-accent hover:text-accent-foreground active:bg-accent transition-colors cursor-pointer text-left touch-manipulation min-h-[36px]"
            >
              <Globe size={14} className="shrink-0 text-amber-500" />
              <span className="font-medium">Desvincular do Calendar</span>
            </button>
          )}

          {/* Excluir no Google Calendar */}
          {aoExcluirGoogleCalendar && tarefa.googleCalendarId && (
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                aoExcluirGoogleCalendar();
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-destructive font-medium hover:bg-destructive/15 active:bg-destructive/25 transition-colors cursor-pointer text-left touch-manipulation min-h-[36px]"
            >
              <Globe size={14} className="shrink-0 text-destructive" />
              <span className="font-semibold">Excluir no Google Calendar</span>
            </button>
          )}

          {/* Excluir Tarefa */}
          {aoExcluir && (
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                aoExcluir();
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-colors cursor-pointer text-left touch-manipulation min-h-[36px]"
            >
              <Trash2 size={14} className="shrink-0" />
              <span className="font-medium">
                {tarefa.googleCalendarId ? "Excluir somente no Klaus" : "Excluir tarefa"}
              </span>
            </button>
          )}

          {/* Barra de Ações Rápidas por Ícones na Parte Inferior */}
          <div className="pt-1 mt-1 border-t border-border/60">
            <div className="flex items-center justify-around bg-muted/40 rounded-lg p-1">
              {/* Marcar como Feito / Reabrir */}
              {aoAlternarStatus && (
                <Tooltip conteudo={feita ? "Reabrir tarefa" : "Marcar como feita"} posicao="top">
                  <button
                    type="button"
                    onClick={() => {
                      setAberto(false);
                      aoAlternarStatus();
                    }}
                    aria-label={feita ? "Reabrir tarefa" : "Marcar como feita"}
                    className={cn(
                      "p-2 rounded-md transition-colors cursor-pointer flex items-center justify-center hover:bg-background",
                      feita
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                    )}
                  >
                    {feita ? <Circle size={15} /> : <CheckCircle2 size={15} />}
                  </button>
                </Tooltip>
              )}

              {/* Foco Pomodoro */}
              {aoCronometrar && (
                <Tooltip conteudo="Iniciar foco (Pomodoro)" posicao="top">
                  <button
                    type="button"
                    onClick={() => {
                      setAberto(false);
                      aoCronometrar();
                    }}
                    aria-label="Iniciar foco (Pomodoro)"
                    className="p-2 rounded-md text-primary hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <Timer size={15} />
                  </button>
                </Tooltip>
              )}

              {/* Duplicar Tarefa */}
              {aoDuplicar && (
                <Tooltip conteudo="Duplicar tarefa" posicao="top">
                  <button
                    type="button"
                    onClick={() => {
                      setAberto(false);
                      aoDuplicar();
                    }}
                    aria-label="Duplicar tarefa"
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <Copy size={15} />
                  </button>
                </Tooltip>
              )}

              {/* Compartilhar */}
              <Tooltip conteudo="Compartilhar" posicao="top">
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
                  aria-label="Compartilhar"
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Share2 size={15} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
