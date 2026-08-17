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
import { urgencia, type Tarefa } from "@/lib/tarefas";

type FiltroStatusCalendario = "todas" | "pendentes" | "atrasadas" | "concluidas";

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

  // Mapa de tarefas agrupadas por data ISO (yyyy-MM-dd)
  const porDia = useMemo(() => {
    const mapa = new Map<string, Tarefa[]>();
    for (const t of tarefasFiltradas) {
      if (!t.prazo) continue;
      const chave = t.prazo.slice(0, 10);
      const lista = mapa.get(chave) ?? [];
      lista.push(t);
      mapa.set(chave, lista);
    }
    return mapa;
  }, [tarefasFiltradas]);

  // Dias sem data marcada
  const semData = useMemo(() => {
    return tarefasFiltradas.filter((t) => !t.prazo && t.status !== "feito");
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

              const temAtrasada = tarefasDia.some((t) => t.status !== "feito" && urgencia(t) === "atrasada");
              const temPendente = tarefasDia.some((t) => t.status !== "feito");

              return (
                <div
                  key={chave}
                  onClick={() => {
                    setSelecionado(d);
                    if (!ehMesAtual) setMesAtual(d);
                  }}
                  className={cn(
                    "min-h-[70px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden",
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

                  {/* Indicadores Visuais de Tarefas no Dia */}
                  <div className="space-y-1 mt-1">
                    {/* Exibe mini títulos em telas médias/grandes */}
                    <div className="hidden sm:block space-y-1">
                      {tarefasDia.slice(0, 2).map((t) => (
                        <div
                          key={t.caminho}
                          className={cn(
                            "truncate text-[10px] px-1.5 py-0.5 rounded-md font-medium border leading-tight",
                            t.status === "feito"
                              ? "bg-secondary/40 text-muted-foreground border-transparent line-through"
                              : urgencia(t) === "atrasada"
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                              : "bg-primary/15 text-primary border-primary/20",
                          )}
                          title={t.titulo}
                        >
                          {t.titulo}
                        </div>
                      ))}
                      {tarefasDia.length > 2 && (
                        <p className="text-[9px] font-bold text-muted-foreground px-1">
                          +{tarefasDia.length - 2} mais
                        </p>
                      )}
                    </div>

                    {/* Indicador por pontos no celular */}
                    <div className="sm:hidden flex items-center gap-1 justify-center pt-1">
                      {temAtrasada && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
                      {temPendente && !temAtrasada && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      {!temPendente && tarefasDia.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
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

                  return (
                    <div
                      key={t.caminho}
                      onClick={() => aoAbrir(t)}
                      className={cn(
                        "p-3.5 rounded-xl border bg-card hover:bg-accent/60 hover:border-primary/50 transition-all cursor-pointer space-y-2 group shadow-2xs",
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

                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        <SeloStatus
                          rotulo={ehFeito ? "Concluída" : ehFazendo ? "Fazendo" : "A fazer"}
                          tom={ehFeito ? "sucesso" : ehFazendo ? "primario" : "neutro"}
                        />
                        {urg === "atrasada" && !ehFeito && (
                          <SeloStatus rotulo="Atrasada" tom="perigo" />
                        )}
                        {t.tags?.map((tag) => (
                          <span key={tag} className="text-muted-foreground font-mono">
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
