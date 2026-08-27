import { useState, useMemo } from "react";
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
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { SeloStatus } from "@/components/SeloStatus";
import { cn } from "@/lib/utils";
import { urgencia, extrairIntervaloTarefa, type Tarefa } from "@/lib/tarefas";
import { CORES_NOTION, lerConfigPropriedadesGlobais } from "@/components/PropriedadesNotion";

type FiltroStatusCalendario = "todas" | "pendentes" | "atrasadas" | "concluidas";

/**
 * Obtém o estilo de cor para a tarefa no calendário baseado em sua tag primária.
 * Se houver cor personalizada em coresTags ou CORES_NOTION, aplica ela.
 * Se não houver tag, usa a cor padrão do Klaus.
 */
function obterEstiloTagCalendario(t: Tarefa): { bg: string; text: string; border: string; dot: string; tagNome?: string } {
  const primeiraTag = t.tags && t.tags.length > 0 ? t.tags[0] : null;
  if (!primeiraTag) {
    return {
      bg: "bg-primary/15",
      text: "text-primary",
      border: "border-primary/25",
      dot: "bg-primary",
    };
  }

  const globalConfig = lerConfigPropriedadesGlobais();
  const corNome = (t.bruto?._coresTags as any)?.[primeiraTag] || globalConfig.coresTags?.[primeiraTag];

  const dotMap: Record<string, string> = {
    cinza: "bg-stone-500",
    azul: "bg-blue-500",
    verde: "bg-emerald-500",
    amarelo: "bg-amber-500",
    vermelho: "bg-rose-500",
    roxo: "bg-purple-500",
    rosa: "bg-pink-500",
    laranja: "bg-orange-500",
  };

  if (corNome && CORES_NOTION[corNome]) {
    const cnCor = CORES_NOTION[corNome];
    return {
      bg: cnCor.bg,
      text: cnCor.text,
      border: cnCor.border,
      dot: dotMap[corNome] || "bg-primary",
      tagNome: primeiraTag,
    };
  }

  // Cor determinística baseada no nome da tag
  const nomesCores = Object.keys(CORES_NOTION);
  let hash = 0;
  for (let i = 0; i < primeiraTag.length; i++) {
    hash = (hash << 5) - hash + primeiraTag.charCodeAt(i);
    hash |= 0;
  }
  const corEscolhida = nomesCores[Math.abs(hash) % nomesCores.length];
  const cnCor = CORES_NOTION[corEscolhida];

  return {
    bg: cnCor.bg,
    text: cnCor.text,
    border: cnCor.border,
    dot: dotMap[corEscolhida] || "bg-primary",
    tagNome: primeiraTag,
  };
}

export function Calendario({
  tarefas,
  aoAbrir,
}: {
  tarefas: Tarefa[];
  aoAbrir: (t: Tarefa) => void;
}) {
  const [mesAtual, setMesAtual] = useState(new Date());
  const [selecionado, setSelecionado] = useState<Date>(new Date());
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusCalendario>("todas");

  // Filtra tarefas conforme botão de filtro ativo
  const tarefasFiltradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (filtroStatus === "pendentes") return t.status !== "feito";
      if (filtroStatus === "atrasadas") return t.status !== "feito" && urgencia(t) === "atrasada";
      if (filtroStatus === "concluidas") return t.status === "feito";
      return true;
    });
  }, [tarefas, filtroStatus]);

  // Mapa de tarefas agrupadas por data ISO (yyyy-MM-dd), cobrindo todo o intervalo de dias
  const porDia = useMemo(() => {
    const mapa = new Map<string, Tarefa[]>();
    for (const t of tarefasFiltradas) {
      const intervalo = extrairIntervaloTarefa(t);
      if (!intervalo) continue;

      const dias = eachDayOfInterval({ start: intervalo.inicio, end: intervalo.fim });
      for (const d of dias) {
        const chave = format(d, "yyyy-MM-dd");
        const lista = mapa.get(chave) ?? [];
        if (!lista.some((x) => x.caminho === t.caminho)) {
          lista.push(t);
        }
        mapa.set(chave, lista);
      }
    }

    // Ordenação consistente em todas as células para manter as barras na mesma linha horizontal
    for (const [, lista] of mapa.entries()) {
      lista.sort((a, b) => {
        const intA = extrairIntervaloTarefa(a);
        const intB = extrairIntervaloTarefa(b);
        const ehIntA = intA?.ehIntervalo ? 1 : 0;
        const ehIntB = intB?.ehIntervalo ? 1 : 0;

        if (ehIntA !== ehIntB) {
          return ehIntB - ehIntA; // Tarefas de múltiplos dias ficam no topo
        }
        if (intA && intB && ehIntA && ehIntB) {
          const tInicio = intA.inicio.getTime() - intB.inicio.getTime();
          if (tInicio !== 0) return tInicio;
          const durA = intA.fim.getTime() - intA.inicio.getTime();
          const durB = intB.fim.getTime() - intB.inicio.getTime();
          return durB - durA; // Intervalos mais longos primeiro
        }
        return a.titulo.localeCompare(b.titulo);
      });
    }

    return mapa;
  }, [tarefasFiltradas]);

  // Dias sem data marcada
  const semData = useMemo(() => {
    return tarefasFiltradas.filter((t) => !extrairIntervaloTarefa(t) && t.status !== "feito");
  }, [tarefasFiltradas]);

  // Gerador da grade de dias do mês
  const diasDaGrade = useMemo(() => {
    const inicioMes = startOfMonth(mesAtual);
    const fimMes = endOfMonth(mesAtual);
    const inicioGrade = startOfWeek(inicioMes, { weekStartsOn: 0 }); // Domingo
    const fimGrade = endOfWeek(fimMes, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: inicioGrade, end: fimGrade });
  }, [mesAtual]);

  // Tarefas da data selecionada
  const dataChaveSelecionada = format(selecionado, "yyyy-MM-dd");
  const tarefasDoDia = porDia.get(dataChaveSelecionada) ?? [];

  function proximoMes() {
    setMesAtual((m) => addMonths(m, 1));
  }

  function mesAnterior() {
    setMesAtual((m) => subMonths(m, 1));
  }

  function irParaHoje() {
    const agora = new Date();
    setMesAtual(agora);
    setSelecionado(agora);
  }

  const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6">
      {/* ── Barra Superior do Calendário ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border/60">
            <button
              onClick={mesAnterior}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={proximoMes}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <h2 className="text-lg font-bold text-foreground capitalize tracking-tight flex items-center gap-2">
            <CalendarIcon size={20} className="text-primary" />
            {format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>

          {!isSameMonth(mesAtual, new Date()) || !isSameDay(selecionado, new Date()) ? (
            <button
              onClick={irParaHoje}
              className="px-2.5 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
            >
              Hoje
            </button>
          ) : null}
        </div>

        {/* Filtros de Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-medium text-muted-foreground hidden md:flex items-center gap-1 mr-1">
            <Filter size={12} /> Mostrar:
          </span>
          {(
            [
              { id: "todas", rotulo: "Todas" },
              { id: "pendentes", rotulo: "Pendentes" },
              { id: "atrasadas", rotulo: "Atrasadas" },
              { id: "concluidas", rotulo: "Concluídas" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroStatus(f.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                filtroStatus === f.id
                  ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                  : "bg-secondary/40 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grade Principal e Painel Lateral ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Grade do Calendário */}
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-4 sm:p-5 space-y-3">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1 text-center border-b border-border/50 pb-2">
            {DIAS_SEMANA.map((dia) => (
              <span key={dia} className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {dia}
              </span>
            ))}
          </div>

          {/* Células dos Dias */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {diasDaGrade.map((d) => {
              const chave = format(d, "yyyy-MM-dd");
              const tarefasDia = porDia.get(chave) ?? [];
              const ehMesAtual = isSameMonth(d, mesAtual);
              const ehHoje = isToday(d);
              const ehSelecionado = isSameDay(d, selecionado);
              const diaSemana = d.getDay(); // 0 = Domingo, 6 = Sábado

              return (
                <div
                  key={chave}
                  onClick={() => {
                    setSelecionado(d);
                    if (!ehMesAtual) setMesAtual(d);
                  }}
                  className={cn(
                    "min-h-[72px] sm:min-h-[95px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group relative",
                    !ehMesAtual && "opacity-35 bg-secondary/10 border-transparent",
                    ehMesAtual && !ehSelecionado && "bg-card border-border/60 hover:border-primary/50 hover:bg-accent/40",
                    ehHoje && !ehSelecionado && "border-primary/70 bg-primary/5 font-bold",
                    ehSelecionado && "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm font-bold",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs font-semibold h-6 w-6 rounded-full flex items-center justify-center transition-colors",
                        ehHoje && "bg-primary text-primary-foreground font-bold",
                        ehSelecionado && !ehHoje && "bg-primary/20 text-primary font-bold",
                        !ehHoje && !ehSelecionado && "text-foreground group-hover:text-primary",
                      )}
                    >
                      {format(d, "d")}
                    </span>

                    {tarefasDia.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono">
                        {tarefasDia.length}
                      </span>
                    )}
                  </div>

                  {/* Indicadores Visuais de Tarefas no Dia com suporte a Intervalo Contínuo e Cores de Tags */}
                  <div className="space-y-1 mt-1">
                    {/* Exibe barra unificada contínua em telas médias/grandes */}
                    <div className="hidden sm:block space-y-1">
                      {tarefasDia.slice(0, 2).map((t) => {
                        const intervalo = extrairIntervaloTarefa(t);
                        const estiloTag = obterEstiloTagCalendario(t);
                        const ehFeito = t.status === "feito";
                        const ehAtrasada = !ehFeito && urgencia(t) === "atrasada";

                        let formaIntervalo = "rounded-md px-1.5";
                        let deveExibirTitulo = true;
                        let ehIntervalo = false;

                        if (intervalo && intervalo.ehIntervalo) {
                          ehIntervalo = true;
                          const ehInicio = isSameDay(d, intervalo.inicio);
                          const ehFim = isSameDay(d, intervalo.fim);
                          const ehInicioLinha = ehInicio || diaSemana === 0;
                          const ehFimLinha = ehFim || diaSemana === 6;

                          deveExibirTitulo = ehInicioLinha;

                          if (ehInicioLinha && ehFimLinha) {
                            formaIntervalo = "rounded-md px-1.5";
                          } else if (ehInicioLinha && !ehFimLinha) {
                            formaIntervalo = "rounded-l-md rounded-r-none border-r-0 mr-[-7px] sm:mr-[-9px] pr-2 px-1.5 z-10 relative";
                          } else if (!ehInicioLinha && ehFimLinha) {
                            formaIntervalo = "rounded-r-md rounded-l-none border-l-0 ml-[-7px] sm:ml-[-9px] pl-2 px-1 z-10 relative";
                          } else {
                            formaIntervalo = "rounded-none border-x-0 mx-[-7px] sm:mx-[-9px] px-0 z-10 relative";
                          }
                        }

                        return (
                          <div
                            key={t.caminho}
                            className={cn(
                              "h-5 flex items-center text-[10px] font-medium border leading-tight transition-all",
                              formaIntervalo,
                              ehFeito
                                ? "bg-secondary/40 text-muted-foreground border-transparent line-through opacity-65"
                                : ehAtrasada
                                ? "bg-destructive/15 text-destructive border-destructive/30"
                                : cn(estiloTag.bg, estiloTag.text, estiloTag.border),
                            )}
                            title={
                              ehIntervalo
                                ? `${t.titulo} (${intervalo?.textoFormatado})`
                                : t.titulo
                            }
                          >
                            {deveExibirTitulo ? (
                              <span className="truncate">{t.titulo}</span>
                            ) : (
                              <span className="invisible select-none">&nbsp;</span>
                            )}
                          </div>
                        );
                      })}
                      {tarefasDia.length > 2 && (
                        <p className="text-[9px] font-bold text-muted-foreground px-1">
                          +{tarefasDia.length - 2} mais
                        </p>
                      )}
                    </div>

                    {/* Indicador por pontos coloridos no celular */}
                    <div className="sm:hidden flex items-center gap-1 justify-center pt-1 flex-wrap">
                      {tarefasDia.slice(0, 4).map((t) => {
                        const estilo = obterEstiloTagCalendario(t);
                        const ehFeito = t.status === "feito";
                        const ehAtrasada = !ehFeito && urgencia(t) === "atrasada";
                        return (
                          <span
                            key={t.caminho}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full shrink-0",
                              ehFeito ? "bg-emerald-500" : ehAtrasada ? "bg-destructive" : estilo.dot,
                            )}
                            title={t.titulo}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Painel de Detalhes do Dia Selecionado ─────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Data selecionada
                </p>
                <h3 className="text-base font-bold text-foreground capitalize">
                  {format(selecionado, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
                {tarefasDoDia.length} {tarefasDoDia.length === 1 ? "tarefa" : "tarefas"}
              </span>
            </div>

            {tarefasDoDia.length > 0 ? (
              <div className="grid gap-2.5">
                {tarefasDoDia.map((t) => {
                  const ehFeito = t.status === "feito";
                  const ehFazendo = t.status === "fazendo";
                  const urg = urgencia(t);
                  const intervalo = extrairIntervaloTarefa(t);
                  const estiloTag = obterEstiloTagCalendario(t);

                  return (
                    <div
                      key={t.caminho}
                      onClick={() => aoAbrir(t)}
                      className={cn(
                        "p-3.5 rounded-xl border bg-card hover:bg-accent/40 hover:border-border transition-colors cursor-pointer space-y-2.5 group",
                        ehFeito ? "border-border/40 opacity-70" : "border-border/80",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-xs font-bold group-hover:text-primary transition-colors leading-snug",
                            ehFeito && "line-through text-muted-foreground font-normal",
                          )}
                        >
                          {t.titulo}
                        </p>
                        <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                      </div>

                      {/* Intervalo de Datas se houver */}
                      {intervalo?.ehIntervalo && (
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                          <CalendarIcon size={12} className="text-primary" />
                          <span>Período: <strong className="text-foreground">{intervalo.textoFormatado}</strong></span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        <SeloStatus
                          rotulo={ehFeito ? "Concluída" : ehFazendo ? "Fazendo" : "A fazer"}
                          tom={ehFeito ? "sucesso" : ehFazendo ? "primario" : "neutro"}
                        />
                        {urg === "atrasada" && !ehFeito && (
                          <SeloStatus rotulo="Atrasada" tom="perigo" />
                        )}
                        {t.tags?.map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              "px-2 py-0.5 rounded-md font-mono border text-[10px] font-medium",
                              cn(estiloTag.bg, estiloTag.text, estiloTag.border),
                            )}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground space-y-1.5">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500/80 mb-1" />
                <p className="font-bold text-foreground">Dia livre para esta data!</p>
                <p className="text-[11px]">Nenhuma tarefa agendada para {format(selecionado, "dd/MM")}.</p>
              </div>
            )}
          </div>

          {/* Tarefas Sem Data Marcada */}
          {semData.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/80 p-4 shadow-xs space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Clock size={14} /> Sem prazo definido ({semData.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {semData.slice(0, 8).map((t) => (
                  <button
                    key={t.caminho}
                    onClick={() => aoAbrir(t)}
                    className="px-2.5 py-1 rounded-lg border border-border/70 bg-secondary/40 hover:bg-accent text-xs font-medium text-foreground transition-all cursor-pointer text-left truncate max-w-[200px]"
                  >
                    {t.titulo}
                  </button>
                ))}
                {semData.length > 8 && (
                  <span className="text-xs text-muted-foreground font-medium self-center px-1">
                    +{semData.length - 8} mais
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

