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
import { Badge } from "@/components/ui/badge";
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
  0: "bg-muted/30 border-border/40 text-muted-foreground/60 hover:border-border hover:bg-muted/60",
  1: "bg-purple-400/20 dark:bg-purple-500/20 border-purple-400/40 text-purple-700 dark:text-purple-300 hover:bg-purple-400/30",
  2: "bg-purple-500/45 dark:bg-purple-500/40 border-purple-500/60 text-purple-900 dark:text-purple-100 font-semibold hover:bg-purple-500/60",
  3: "bg-purple-600/80 dark:bg-purple-600/80 border-purple-400 text-white font-bold hover:bg-purple-600 shadow-2xs",
  4: "bg-purple-700 dark:bg-purple-500 border-purple-300 text-white font-extrabold shadow-sm shadow-purple-500/30 hover:scale-105",
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
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

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

  // Itens do dia selecionado
  const itensDoDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return [];
    return mapaAtividades[diaSelecionado] || [];
  }, [mapaAtividades, diaSelecionado]);

  // Data formatada para o cabeçalho de detalhes
  const dataSelecionadaFormatada = useMemo(() => {
    if (!diaSelecionado) return "";
    const [y, m, d] = diaSelecionado.split("-").map(Number);
    const dataObj = new Date(y, m - 1, d);
    return format(dataObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }, [diaSelecionado]);

  return (
    <div className={cn("rounded-2xl sm:rounded-3xl border border-border/80 bg-card/90 shadow-sm backdrop-blur-md p-3.5 sm:p-5 space-y-4", className)}>
      {/* Topo do Mini Calendário: Título, Navegação e Estatística */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Flame size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">Histórico de Atividades</h3>
              <Badge variant="secondary" className="text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 px-1.5 py-0">
                {totalAtividadesMes} {totalAtividadesMes === 1 ? "ação" : "ações"} em {format(mesReferencia, "MMMM", { locale: ptBR })}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Seu ritmo criativo e produção diária em tarefas, notas, metas e referências.
            </p>
          </div>
        </div>

        {/* Controles de Navegação Mensal */}
        <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border border-border/60 self-end sm:self-auto">
          <Tooltip conteudo="Mês anterior">
            <button
              type="button"
              onClick={() => setMesReferencia((m) => subMonths(m, 1))}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={14} />
            </button>
          </Tooltip>

          <span className="text-xs font-semibold text-foreground px-2 capitalize min-w-[110px] text-center select-none">
            {format(mesReferencia, "MMMM yyyy", { locale: ptBR })}
          </span>

          <Tooltip conteudo="Próximo mês">
            <button
              type="button"
              onClick={() => setMesReferencia((m) => addMonths(m, 1))}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              aria-label="Próximo mês"
            >
              <ChevronRight size={14} />
            </button>
          </Tooltip>

          {!isSameMonth(mesReferencia, hoje) && (
            <Tooltip conteudo="Ir para o mês atual">
              <button
                type="button"
                onClick={() => setMesReferencia(new Date())}
                className="text-[10px] font-bold text-primary hover:bg-primary/10 px-2 py-0.5 rounded-md transition-colors cursor-pointer border-l border-border/60 ml-1"
              >
                Hoje
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Grade de Dias do Mês (Estilo GitHub Heatmap) */}
      <div className="space-y-1.5">
        {/* Cabeçalho com os dias da semana */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[10px] font-semibold text-muted-foreground select-none pb-0.5">
          <span>Seg</span>
          <span>Ter</span>
          <span>Qua</span>
          <span>Qui</span>
          <span>Sex</span>
          <span>Sáb</span>
          <span>Dom</span>
        </div>

        {/* Quadradinhos dos Dias */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {diasDoGrid.map((dia) => {
            const diaIso = format(dia, "yyyy-MM-dd");
            const diaNum = format(dia, "d");
            const pertenceAoMes = isSameMonth(dia, mesReferencia);
            const ehHoje = isSameDay(dia, hoje);
            const atividades = mapaAtividades[diaIso] || [];
            const qtd = atividades.length;
            const nivel = calcularNivelIntensidade(qtd);
            const selecionado = diaSelecionado === diaIso;

            // Resumo para o Tooltip
            const resumoTooltip = (() => {
              if (qtd === 0) return `${format(dia, "dd/MM/yyyy")}: Nenhuma atividade registrada`;
              const contagemTipos: Record<string, number> = {};
              for (const a of atividades) {
                contagemTipos[a.tipo] = (contagemTipos[a.tipo] || 0) + 1;
              }
              const partes = Object.entries(contagemTipos).map(([tp, count]) => {
                const rot = ICONES_TIPO[tp as keyof typeof ICONES_TIPO]?.rotulo || tp;
                return `${count} ${rot.toLowerCase()}${count > 1 ? "s" : ""}`;
              });
              return `${format(dia, "dd/MM/yyyy")}: ${qtd} ${qtd === 1 ? "atividade" : "atividades"} (${partes.join(", ")})`;
            })();

            return (
              <Tooltip key={diaIso} conteudo={resumoTooltip}>
                <button
                  type="button"
                  onClick={() => {
                    setDiaSelecionado(selecionado ? null : diaIso);
                  }}
                  className={cn(
                    "aspect-square rounded-lg sm:rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center p-1 select-none relative group",
                    CORES_NIVEL[nivel],
                    !pertenceAoMes && "opacity-25 hover:opacity-50",
                    ehHoje && "ring-2 ring-primary ring-offset-1 ring-offset-card font-bold",
                    selecionado && "ring-2 ring-purple-400 dark:ring-purple-300 scale-105 shadow-md z-10 font-bold",
                    qtd > 0 && "hover:scale-105"
                  )}
                >
                  <span className={cn("text-[10px] sm:text-xs leading-none", qtd >= 3 && "text-white")}>
                    {diaNum}
                  </span>
                  {qtd > 0 && (
                    <span className="text-[8px] opacity-75 font-mono leading-none mt-0.5 hidden sm:inline">
                      {qtd}
                    </span>
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Legenda de Intensidade do Heatmap */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 select-none">
        <span className="text-[10px]">Clique em qualquer quadradinho para ver o que você fez naquele dia</span>

        <div className="flex items-center gap-1">
          <span className="text-[10px] mr-1">Menos</span>
          <span className="w-2.5 h-2.5 rounded-[3px] bg-muted/40 border border-border/40 inline-block" />
          <span className="w-2.5 h-2.5 rounded-[3px] bg-purple-400/25 border border-purple-400/40 inline-block" />
          <span className="w-2.5 h-2.5 rounded-[3px] bg-purple-500/50 border border-purple-500/60 inline-block" />
          <span className="w-2.5 h-2.5 rounded-[3px] bg-purple-600/80 border border-purple-400 inline-block" />
          <span className="w-2.5 h-2.5 rounded-[3px] bg-purple-700 border border-purple-300 inline-block" />
          <span className="text-[10px] ml-1">Mais</span>
        </div>
      </div>

      {/* Painel Expansível de Detalhes do Dia Selecionado */}
      {diaSelecionado && (
        <div className="mt-4 pt-4 border-t border-border/60 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500 inline-block" />
              <h4 className="font-bold text-xs sm:text-sm text-foreground capitalize">
                {dataSelecionadaFormatada}
              </h4>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {itensDoDiaSelecionado.length} {itensDoDiaSelecionado.length === 1 ? "registro" : "registros"}
              </Badge>
            </div>

            <button
              type="button"
              onClick={() => setDiaSelecionado(null)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              aria-label="Fechar detalhes do dia"
            >
              <X size={14} />
            </button>
          </div>

          {itensDoDiaSelecionado.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              Nenhuma atividade registrada nesta data.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {itensDoDiaSelecionado.map((item) => {
                const infoTipo = ICONES_TIPO[item.tipo] || ICONES_TIPO.nota;
                const Icone = infoTipo.Icone;

                return (
                  <div
                    key={`${item.id}-${item.acao}`}
                    onClick={() => aoAbrirItem(item.caminho)}
                    className="p-3 rounded-xl border border-border/70 bg-card hover:bg-accent/30 hover:border-border transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs group"
                  >
                    <div className="flex items-start gap-2.5">
                      {item.imagem ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-border shrink-0 bg-black/5 dark:bg-black/20">
                          <ImagemPrivada
                            caminho={item.imagem}
                            alt={item.titulo}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={cn("p-2 rounded-lg shrink-0", infoTipo.bg, infoTipo.cor)}>
                          <Icone size={15} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {item.acao}
                          </span>
                        </div>
                        <h5 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                          {item.titulo}
                        </h5>
                      </div>

                      <ExternalLink size={13} className="text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                    </div>

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                        {item.tags.map((tg) => (
                          <span key={tg} className="text-[9px] px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground font-mono">
                            #{tg}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
