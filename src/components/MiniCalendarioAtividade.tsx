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
  0: "bg-muted/40 border-border/30 hover:border-border hover:bg-muted/70",
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

  // Gera a matriz de dias do mês em grade de calendário tradicional (Seg a Dom)
  const diasDoGrid = useMemo(() => {
    const inicioMes = startOfMonth(mesReferencia);
    const fimMes = endOfMonth(mesReferencia);
    const inicioGrade = startOfWeek(inicioMes, { weekStartsOn: 1 }); // Começa na Segunda
    const fimGrade = endOfWeek(fimMes, { weekStartsOn: 1 }); // Termina no Domingo

    return eachDayOfInterval({ start: inicioGrade, end: fimGrade });
  }, [mesReferencia]);

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
      {/* Grade de Calendário sem margens próprias e ultra compacta */}
      <div className={cn("w-full flex items-center justify-center gap-1 select-none py-1", className)}>
        {/* Seta minimalista Mês Anterior colada à grade */}
        <Tooltip conteudo="Mês anterior" posicao="top">
          <button
            type="button"
            onClick={() => setMesReferencia((m) => subMonths(m, 1))}
            className="p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer shrink-0"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={13} />
          </button>
        </Tooltip>

        {/* Grade de Mini Quadradinhos Compactos estilo GitHub */}
        <div className="grid grid-cols-7 gap-[2px]">
          {diasDoGrid.map((dia) => {
            const diaIso = format(dia, "yyyy-MM-dd");
            const pertenceAoMes = isSameMonth(dia, mesReferencia);
            const ehHoje = isSameDay(dia, hoje);
            const atividades = mapaAtividades[diaIso] || [];
            const qtd = atividades.length;
            const nivel = calcularNivelIntensidade(qtd);

            // Resumo dinâmico para o Tooltip
            const resumoTooltip = (() => {
              const dataFmt = format(dia, "dd/MM");
              if (qtd === 0) return `${dataFmt}: Nenhuma atividade`;
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
                    "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] border transition-all cursor-pointer relative",
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

        {/* Seta minimalista Próximo Mês colada à grade */}
        <Tooltip conteudo="Próximo mês" posicao="top">
          <button
            type="button"
            onClick={() => setMesReferencia((m) => addMonths(m, 1))}
            className="p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer shrink-0"
            aria-label="Próximo mês"
          >
            <ChevronRight size={13} />
          </button>
        </Tooltip>
      </div>

      {/* Modal de Histórico do Dia Clicado */}
      {diaModalAberto && (
        <div
          className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setDiaModalAberto(null)}
        >
          <div
            className="w-full max-w-md max-h-[85vh] bg-background border border-border rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between p-4 border-b border-border/60 bg-card/60">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-foreground capitalize truncate">
                    {dataModalFormatada}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {itensDoDia.length} {itensDoDia.length === 1 ? "atividade" : "atividades"}
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
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
              {itensDoDia.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhuma atividade registrada nesta data.
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
                      className="p-2.5 rounded-xl border border-border/70 bg-card/70 hover:bg-accent/40 hover:border-border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.imagem ? (
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-border shrink-0 bg-black/5 dark:bg-black/20">
                            <ImagemPrivada
                              caminho={item.imagem}
                              alt={item.titulo}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className={cn("p-1.5 rounded-lg shrink-0", infoTipo.bg, infoTipo.cor)}>
                            <Icone size={14} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            {item.acao}
                          </span>
                          <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                            {item.titulo}
                          </h4>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {item.tags.slice(0, 2).map((tg) => (
                                <span key={tg} className="text-[8px] px-1 rounded bg-secondary text-muted-foreground font-mono">
                                  #{tg}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <ExternalLink size={13} className="text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
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
