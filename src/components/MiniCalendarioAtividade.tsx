import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  FileText,
  Target,
  Bookmark,
  Bell,
  X,
  ExternalLink,
  Flame,
  Sparkles,
} from "lucide-react";
import {
  compilarHistoricoAtividades,
  calcularNivelIntensidade,
} from "@/lib/historicoAtividade";
import type { ItemRepo } from "@/lib/repo";
import { ImagemPrivada } from "@/components/ImagemPrivada";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface MiniCalendarioAtividadeProps {
  acervo: ItemRepo[];
  aoAbrirItem: (caminho: string) => void;
  className?: string;
}

const CORES_NIVEL = {
  0: "bg-muted/40 border-border/30 hover:border-border/80 hover:bg-muted/70",
  1: "bg-purple-400/25 dark:bg-purple-500/25 border-purple-400/30 hover:bg-purple-400/40",
  2: "bg-purple-500/50 dark:bg-purple-500/45 border-purple-500/50 hover:bg-purple-500/65",
  3: "bg-purple-600/80 dark:bg-purple-600/80 border-purple-400 hover:bg-purple-600",
  4: "bg-purple-700 dark:bg-purple-500 border-purple-300 hover:scale-110 shadow-xs shadow-purple-500/30",
};

const ICONES_TIPO = {
  nota: { Icone: FileText, cor: "text-amber-500", bg: "bg-amber-500/10", rotulo: "Nota" },
  tarefa: { Icone: CheckSquare, cor: "text-blue-500", bg: "bg-blue-500/10", rotulo: "Tarefa" },
  meta: { Icone: Target, cor: "text-purple-500", bg: "bg-purple-500/10", rotulo: "Meta PDI" },
  entrega: { Icone: Sparkles, cor: "text-emerald-500", bg: "bg-emerald-500/10", rotulo: "Entrega PDI" },
  referencia: { Icone: Bookmark, cor: "text-pink-500", bg: "bg-pink-500/10", rotulo: "Referência" },
  lembrete: { Icone: Bell, cor: "text-sky-500", bg: "bg-sky-500/10", rotulo: "Lembrete" },
};

export function MiniCalendarioAtividade({
  acervo,
  aoAbrirItem,
  className,
}: MiniCalendarioAtividadeProps) {
  const hoje = useMemo(() => new Date(), []);
  const [mesReferencia, setMesReferencia] = useState<Date>(hoje);
  const [diaModalAberto, setDiaModalAberto] = useState<string | null>(null);

  // Compila o histórico completo de todas as atividades por dia
  const mapaAtividades = useMemo(() => compilarHistoricoAtividades(acervo), [acervo]);

  // Gera a matriz de dias do mês atual preenchendo as semanas de Seg a Dom
  const diasDoGrid = useMemo(() => {
    const inicioMes = startOfMonth(mesReferencia);
    const fimMes = endOfMonth(mesReferencia);
    const inicioGrade = startOfWeek(inicioMes, { weekStartsOn: 1 }); // Começa na Segunda
    const fimGrade = endOfWeek(fimMes, { weekStartsOn: 1 }); // Termina no Domingo

    return eachDayOfInterval({ start: inicioGrade, end: fimGrade });
  }, [mesReferencia]);

  // Estatística total de atividades do mês atual exibido
  const totalAtividadesMes = useMemo(() => {
    const inicioMesStr = format(startOfMonth(mesReferencia), "yyyy-MM");
    let total = 0;
    for (const [dataIso, lista] of Object.entries(mapaAtividades)) {
      if (dataIso.startsWith(inicioMesStr)) {
        total += lista.length;
      }
    }
    return total;
  }, [mapaAtividades, mesReferencia]);

  // Itens do dia aberto no modal
  const itensDoDia = useMemo(() => {
    if (!diaModalAberto) return [];
    return mapaAtividades[diaModalAberto] || [];
  }, [mapaAtividades, diaModalAberto]);

  // Data formatada para o cabeçalho do modal
  const dataModalFormatada = useMemo(() => {
    if (!diaModalAberto) return "";
    const [y, m, d] = diaModalAberto.split("-").map(Number);
    const dataObj = new Date(y, m - 1, d);
    return format(dataObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }, [diaModalAberto]);

  return (
    <>
      {/* Mini Bloco Compacto que se integra ao Resumo da Semana */}
      <div className={cn("p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-border/70 bg-card/80 shadow-2xs backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 select-none", className)}>
        {/* Lado Esquerdo: Título & Navegação Mensal Minimalista */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Flame size={13} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-foreground">Histórico</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                ({totalAtividadesMes})
              </span>
            </div>
          </div>

          {/* Setas Minimalistas */}
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <button
              type="button"
              onClick={() => setMesReferencia((m) => subMonths(m, 1))}
              className="p-1 rounded-md hover:text-foreground hover:bg-accent/70 transition-colors cursor-pointer"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={13} />
            </button>

            <span className="text-[11px] font-semibold text-foreground px-1.5 capitalize text-center">
              {format(mesReferencia, "MMM yyyy", { locale: ptBR })}
            </span>

            <button
              type="button"
              onClick={() => setMesReferencia((m) => addMonths(m, 1))}
              className="p-1 rounded-md hover:text-foreground hover:bg-accent/70 transition-colors cursor-pointer"
              aria-label="Próximo mês"
            >
              <ChevronRight size={13} />
            </button>

            {!isSameMonth(mesReferencia, hoje) && (
              <button
                type="button"
                onClick={() => setMesReferencia(new Date())}
                className="text-[9px] font-bold text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded transition-colors cursor-pointer ml-1"
              >
                Hoje
              </button>
            )}
          </div>
        </div>

        {/* Centro / Lado Direito: Grade com Mini Quadradinhos (Heatmap GitHub) */}
        <div className="flex items-center gap-3">
          {/* Matriz de Mini Quadradinhos */}
          <div className="grid grid-flow-col grid-rows-7 gap-[2.5px] sm:gap-[3px]">
            {diasDoGrid.map((dia) => {
              const diaIso = format(dia, "yyyy-MM-dd");
              const pertenceAoMes = isSameMonth(dia, mesReferencia);
              const ehHoje = isSameDay(dia, hoje);
              const atividades = mapaAtividades[diaIso] || [];
              const qtd = atividades.length;
              const nivel = calcularNivelIntensidade(qtd);

              // Resumo para o Tooltip
              const resumoTooltip = (() => {
                const dataFmt = format(dia, "dd/MM");
                if (qtd === 0) return `${dataFmt}: Sem atividades`;
                const contagemTipos: Record<string, number> = {};
                for (const a of atividades) {
                  contagemTipos[a.tipo] = (contagemTipos[a.tipo] || 0) + 1;
                }
                const partes = Object.entries(contagemTipos).map(([tp, count]) => {
                  const rot = ICONES_TIPO[tp as keyof typeof ICONES_TIPO]?.rotulo || tp;
                  return `${count} ${rot.toLowerCase()}${count > 1 ? "s" : ""}`;
                });
                return `${dataFmt}: ${qtd} ${qtd === 1 ? "ação" : "ações"} (${partes.join(", ")})`;
              })();

              return (
                <Tooltip key={diaIso} conteudo={resumoTooltip} posicao="top">
                  <button
                    type="button"
                    onClick={() => setDiaModalAberto(diaIso)}
                    className={cn(
                      "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2.5px] border transition-all cursor-pointer",
                      CORES_NIVEL[nivel],
                      !pertenceAoMes && "opacity-15",
                      ehHoje && "ring-1 ring-primary ring-offset-0.5 ring-offset-card"
                    )}
                    aria-label={resumoTooltip}
                  />
                </Tooltip>
              );
            })}
          </div>

          {/* Mini Legenda Discreta */}
          <div className="hidden md:flex items-center gap-1 text-[9px] text-muted-foreground/70 pl-1 border-l border-border/40">
            <span>-</span>
            <span className="w-2 h-2 rounded-[2px] bg-muted/40 border border-border/30 inline-block" />
            <span className="w-2 h-2 rounded-[2px] bg-purple-400/25 border border-purple-400/30 inline-block" />
            <span className="w-2 h-2 rounded-[2px] bg-purple-500/50 border border-purple-500/50 inline-block" />
            <span className="w-2 h-2 rounded-[2px] bg-purple-600/80 border border-purple-400 inline-block" />
            <span className="w-2 h-2 rounded-[2px] bg-purple-700 border border-purple-300 inline-block" />
            <span>+</span>
          </div>
        </div>
      </div>

      {/* Modal de Histórico do Dia Clicado */}
      {diaModalAberto && (
        <div
          className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setDiaModalAberto(null)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] bg-background border border-border rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/60 bg-card/60">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-foreground capitalize truncate">
                    {dataModalFormatada}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {itensDoDia.length} {itensDoDia.length === 1 ? "atividade registrada" : "atividades registradas"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDiaModalAberto(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer shrink-0"
                aria-label="Fechar histórico"
              >
                <X size={16} />
              </button>
            </div>

            {/* Conteúdo com os Itens do Dia */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
              {itensDoDia.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Nenhuma atividade registrada nesta data</p>
                  <p className="text-[11px]">Crie notas, conclua tarefas ou salve referências para acompanhar seu histórico.</p>
                </div>
              ) : (
                itensDoDia.map((item) => {
                  const infoTipo = ICONES_TIPO[item.tipo] || ICONES_TIPO.nota;
                  const Icone = infoTipo.Icone;

                  return (
                    <div
                      key={`${item.id}-${item.acao}`}
                      onClick={() => {
                        setDiaModalAberto(null);
                        aoAbrirItem(item.caminho);
                      }}
                      className="p-3 rounded-xl sm:rounded-2xl border border-border/70 bg-card/70 hover:bg-accent/40 hover:border-border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.imagem ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-border shrink-0 bg-black/5 dark:bg-black/20">
                            <ImagemPrivada
                              caminho={item.imagem}
                              alt={item.titulo}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className={cn("p-2 rounded-xl shrink-0", infoTipo.bg, infoTipo.cor)}>
                            <Icone size={16} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            {item.acao}
                          </span>
                          <h4 className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                            {item.titulo}
                          </h4>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {item.tags.slice(0, 3).map((tg) => (
                                <span key={tg} className="text-[9px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground font-mono">
                                  #{tg}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <ExternalLink size={14} className="text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
