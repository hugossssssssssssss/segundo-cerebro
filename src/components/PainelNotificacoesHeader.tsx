/**
 * PainelNotificacoesHeader — Central de Notificações Pop-up (Top-tier UX)
 *
 * Exibida ao clicar no sino do topo.
 * - Abas: Esta Semana, Não Lidos, Todos
 * - Destaque visual: itens novos têm fundo claro radiante com badge luminoso e texto destacado; itens já vistos têm tom neutro suave.
 * - Ações diretas: "Marcar lido" e "Limpar" por notificação.
 * - Lembretes com mais de 15 dias no passado são arquivados automaticamente.
 * - Atalho para /inbox e botão de "Agendar Lembrete" com visual de propriedades Notion.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  Trash2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Plus,
  CalendarDays,
  CalendarCheck,
  Inbox,
  CheckCheck,
  CheckSquare,
  FileText,
  Target,
  Sparkles,
  Bookmark,
  Globe,
  ExternalLink,
  X,
} from "lucide-react";
import {
  type MapaEstadoInbox,
  carregarEstadoInbox,
  gravarEstadoInbox,
  compilarItensInbox,
  compilarEventosGoogleParaInbox,
} from "@/lib/inbox";
import type { ItemInbox } from "@/lib/tipos";
import { carregarRepo } from "@/lib/repo";
import { lerConfig, configCompleta } from "@/lib/settings";
import { cn, normalizarDataISO, hojeISO } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { ModalLembrete } from "@/components/ModalLembrete";
import { toast } from "@/lib/toast";
import { buscarEventosGoogleSilencioso, temTokenGoogleValido } from "@/lib/googleCalendar";
import { startOfWeek, endOfWeek, addDays } from "date-fns";

type FiltroNotificacao = "semana" | "nao_vistos" | "todos";

function obterInfoDocumento(item: ItemInbox) {
  if (item.tipo === "google_calendar" || item.id.startsWith("google-")) {
    return {
      Icone: Globe,
      cor: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
      corHex: item.corHex || "#3b82f6",
    };
  }
  const caminho = (item.caminhoOrigem || "").toLowerCase();
  if (caminho.startsWith("tarefas/") || item.tipo === "tarefa_atrasada") {
    return { Icone: CheckSquare, cor: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", corHex: undefined };
  }
  if (caminho.startsWith("pdi/metas/")) {
    return { Icone: Target, cor: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", corHex: undefined };
  }
  if (caminho.startsWith("pdi/entregas/")) {
    return { Icone: Sparkles, cor: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10", corHex: undefined };
  }
  if (caminho.startsWith("referencias/")) {
    return { Icone: Bookmark, cor: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10", corHex: undefined };
  }
  if (caminho.startsWith("notas/") || item.tipo === "nota_inativa") {
    return { Icone: FileText, cor: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", corHex: undefined };
  }
  return { Icone: Bell, cor: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", corHex: undefined };
}

export function PainelNotificacoesHeader() {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [itens, setItens] = useState<ItemInbox[]>([]);
  const [mapaEstado, setMapaEstado] = useState<MapaEstadoInbox>({});
  const [shaEstado, setShaEstado] = useState<string | undefined>();
  const [filtro, setFiltro] = useState<FiltroNotificacao>("semana");
  const [modalLembreteAberto, setModalLembreteAberto] = useState(false);
  const [ehMobile, setEhMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const handleResize = () => setEhMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const cfg = useMemo(() => lerConfig(), []);
  const pronto = configCompleta(cfg);
  const navegar = useNavigate();

  // Carrega notificações, compromissos e eventos do Google Agenda
  const carregarNotificacoes = useCallback(async () => {
    if (!pronto) return;
    try {
      setCarregando(true);
      const todos = await carregarRepo(cfg, { memoria: 20_000 });
      const estadoRes = await carregarEstadoInbox(cfg, todos);
      setMapaEstado(estadoRes.mapa);
      setShaEstado(estadoRes.sha);

      const agora = new Date();
      const todosItens = compilarItensInbox(todos, estadoRes.mapa, agora, true);

      // Busca eventos do Google Calendar silenciosamente se autenticado
      if (temTokenGoogleValido()) {
        try {
          const inicioGoogle = startOfWeek(agora, { weekStartsOn: 0 });
          const fimGoogle = endOfWeek(addDays(agora, 14), { weekStartsOn: 0 });
          const resGoogle = await buscarEventosGoogleSilencioso(inicioGoogle, fimGoogle);
          if (resGoogle.eventos.length > 0) {
            const itensGoogle = compilarEventosGoogleParaInbox(resGoogle.eventos, estadoRes.mapa, agora);
            todosItens.push(...itensGoogle);
          }
        } catch {
          // Erro silencioso do Google Calendar
        }
      }

      // Regra: filtrar lembretes com mais de 15 dias no passado
      const limite15DiasMs = 15 * 24 * 60 * 60 * 1000;
      const agoraMs = agora.getTime();

      const itensFiltrados = todosItens.filter((item) => {
        if (!item.dataVencimento) return true;
        const dataItem = new Date(item.dataVencimento);
        if (isNaN(dataItem.getTime())) return true;
        const diffMs = agoraMs - dataItem.getTime();
        // Se já venceu há mais de 15 dias, expira da lista ativa
        if (diffMs > limite15DiasMs) return false;
        return true;
      });

      // Ordenação inteligente: primeiro itens não lidos, depois mais recentes
      itensFiltrados.sort((a, b) => {
        if (a.visto !== b.visto) return a.visto ? 1 : -1;
        return (b.dataVencimento || "").localeCompare(a.dataVencimento || "");
      });

      setItens(itensFiltrados);
    } catch {
      // Silencioso no cabeçalho
    } finally {
      setCarregando(false);
    }
  }, [cfg, pronto]);

  useEffect(() => {
    carregarNotificacoes();
    window.addEventListener("acervo-atualizado", carregarNotificacoes);
    return () => window.removeEventListener("acervo-atualizado", carregarNotificacoes);
  }, [carregarNotificacoes]);

  // Contagem de não vistos: apenas itens que começaram até hoje (nunca itens puramente futuros)
  const naoVistosCount = useMemo(() => {
    const hojeStr = hojeISO();
    return itens.filter((i) => {
      if (i.visto) return false;
      const inicioIso = i.dataInicioIso || normalizarDataISO(i.dataVencimento);
      if (!inicioIso) return true;
      return inicioIso <= hojeStr;
    }).length;
  }, [itens]);

  // Filtragem por aba
  const itensFiltradosAba = useMemo(() => {
    const agora = new Date();
    const hojeStr = hojeISO();
    const seteDiasFrenteMs = 7 * 24 * 60 * 60 * 1000;
    const agoraMs = agora.getTime();

    if (filtro === "nao_vistos") {
      return itens.filter((i) => {
        if (i.visto) return false;
        const inicioIso = i.dataInicioIso || normalizarDataISO(i.dataVencimento);
        if (!inicioIso) return true;
        return inicioIso <= hojeStr;
      });
    }

    if (filtro === "semana") {
      return itens.filter((i) => {
        const inicioIso = i.dataInicioIso || normalizarDataISO(i.dataVencimento);
        const fimIso = i.dataFimIso || inicioIso;
        if (!inicioIso) return !i.visto;

        const dInicio = new Date(`${inicioIso}T00:00:00`);
        const dFim = new Date(`${fimIso || inicioIso}T23:59:59`);
        if (isNaN(dInicio.getTime()) || isNaN(dFim.getTime())) return true;

        const fimJanela = agoraMs + seteDiasFrenteMs;
        const inicioJanela = agoraMs - 24 * 60 * 60 * 1000;

        return dInicio.getTime() <= fimJanela && dFim.getTime() >= inicioJanela;
      });
    }

    return itens;
  }, [itens, filtro]);

  // Exibe até 6 itens no popup para manter a lista compacta e rápida
  const itensExibidos = useMemo(() => {
    return itensFiltradosAba.slice(0, 6);
  }, [itensFiltradosAba]);

  // Marcar como visto / lido
  const marcarComoLido = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const novoMapa: MapaEstadoInbox = {
      ...mapaEstado,
      [id]: {
        ...mapaEstado[id],
        visto: true,
        vistoEm: new Date().toISOString(),
      },
    };
    setMapaEstado(novoMapa);
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, visto: true, vistoEm: new Date().toISOString() } : i)));
    await gravarEstadoInbox(cfg, novoMapa, shaEstado);
  };

  // Limpar / Descartar
  const limparItem = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const novoMapa: MapaEstadoInbox = {
      ...mapaEstado,
      [id]: {
        ...mapaEstado[id],
        visto: true,
        descartado: true,
        vistoEm: new Date().toISOString(),
      },
    };
    setMapaEstado(novoMapa);
    setItens((prev) => prev.filter((i) => i.id !== id));
    await gravarEstadoInbox(cfg, novoMapa, shaEstado);
    toast("Notificação removida.");
  };

  // Marcar todos como lidos
  const marcarTodosComoLidos = async () => {
    const novoMapa: MapaEstadoInbox = { ...mapaEstado };
    const agoraIso = new Date().toISOString();
    itens.forEach((i) => {
      novoMapa[i.id] = {
        ...novoMapa[i.id],
        visto: true,
        vistoEm: agoraIso,
      };
    });
    setMapaEstado(novoMapa);
    setItens((prev) => prev.map((i) => ({ ...i, visto: true, vistoEm: agoraIso })));
    await gravarEstadoInbox(cfg, novoMapa, shaEstado);
    toast("Todas as notificações marcadas como lidas.");
  };

  const aoAbrirItem = (item: ItemInbox) => {
    marcarComoLido(item.id);
    setAberto(false);
    if (item.tipo === "google_calendar" || item.id.startsWith("google-")) {
      navegar("/tarefas");
      return;
    }
    if (item.caminhoOrigem) {
      const pasta = item.caminhoOrigem.split("/")[0]?.toLowerCase() || "";
      let rota = "/notas";
      if (pasta === "tarefas") rota = "/tarefas";
      else if (pasta === "referencias") rota = "/referencias";
      else if (pasta === "pdi" || pasta === "metas") rota = "/pdi";
      else if (pasta === "lousas") rota = "/lousas";
      navegar(`${rota}?abrir=${encodeURIComponent(item.caminhoOrigem)}`);
    } else {
      navegar("/inbox");
    }
  };

  return (
    <>
      <Popover open={!ehMobile && aberto} onOpenChange={(val) => { if (!ehMobile) setAberto(val); }}>
        <Tooltip conteudo={naoVistosCount > 0 ? `${naoVistosCount} nova(s) notificação(ões)` : "Central de Notificações & Agenda"}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={() => {
                if (ehMobile) setAberto((prev) => !prev);
              }}
              className={cn(
                "rounded-xl p-2 transition-all relative cursor-pointer flex items-center justify-center border",
                aberto
                  ? "bg-accent border-border/80 text-foreground shadow-xs"
                  : "border-transparent text-muted-foreground hover:bg-accent/80 hover:text-foreground"
              )}
              aria-label="Notificações e Lembretes"
            >
              <Bell size={18} />
              {naoVistosCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary ring-2 ring-background"></span>
                </span>
              )}
            </button>
          </PopoverTrigger>
        </Tooltip>

        <PopoverContent
          align="end"
          className="hidden sm:block sm:w-[440px] max-w-[440px] p-0 shadow-2xl border-border/80 bg-card/95 backdrop-blur-2xl rounded-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
          sideOffset={8}
        >
          {/* Cabeçalho da Central de Notificações */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50 bg-secondary/30">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  Notificações & Agenda
                  {naoVistosCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
                      {naoVistosCount}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">Compromissos e avisos em tempo real</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Tooltip conteudo="Agendar novo lembrete">
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false);
                    setModalLembreteAberto(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  aria-label="Novo Lembrete"
                >
                  <Plus size={14} />
                  <span className="hidden xs:inline">Novo</span>
                </button>
              </Tooltip>

              {naoVistosCount > 0 && (
                <Tooltip conteudo="Marcar todas como lidas">
                  <button
                    type="button"
                    onClick={marcarTodosComoLidos}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                    aria-label="Marcar todas como lidas"
                  >
                    <CheckCheck size={18} />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Abas de Filtragem Rápida */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/40 bg-secondary/15 text-xs">
            <button
              type="button"
              onClick={() => setFiltro("semana")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                filtro === "semana"
                  ? "bg-background text-foreground font-bold shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <CalendarDays size={13} className={filtro === "semana" ? "text-primary" : ""} />
              <span>Esta Semana</span>
            </button>

            <button
              type="button"
              onClick={() => setFiltro("nao_vistos")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                filtro === "nao_vistos"
                  ? "bg-background text-foreground font-bold shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Clock size={13} className={filtro === "nao_vistos" ? "text-primary" : ""} />
              <span>Não Lidos</span>
              {naoVistosCount > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setFiltro("todos")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                filtro === "todos"
                  ? "bg-background text-foreground font-bold shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Inbox size={13} className={filtro === "todos" ? "text-primary" : ""} />
              <span>Todos</span>
            </button>
          </div>

          {/* Lista de Itens (Até 6 itens) */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/25">
            {carregando ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Atualizando compromissos...</span>
              </div>
            ) : itensExibidos.length === 0 ? (
              <div className="py-12 px-4 text-center text-muted-foreground flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-2xl bg-secondary/80 flex items-center justify-center text-muted-foreground/60 mb-1">
                  <CalendarCheck size={20} />
                </div>
                <p className="text-xs font-bold text-foreground">Tudo organizado!</p>
                <p className="text-[11px] text-muted-foreground/80 max-w-xs leading-relaxed">
                  {filtro === "nao_vistos"
                    ? "Você não possui notificações não lidas pendentes."
                    : "Nenhum compromisso agendado para o período selecionado."}
                </p>
              </div>
            ) : (
              itensExibidos.map((item) => {
                const ehNovo = !item.visto;
                const dataFimCalculada = item.dataFimIso || normalizarDataISO(item.dataVencimento);
                const ehAtrasada = item.tipo === "tarefa_atrasada" || (dataFimCalculada ? dataFimCalculada < hojeISO() && item.tipo !== "google_calendar" : false);
                const ehGoogle = item.tipo === "google_calendar" || item.id.startsWith("google-");
                const infoDoc = obterInfoDocumento(item);
                const IconeDoc = infoDoc.Icone;

                return (
                  <div
                    key={item.id}
                    onClick={() => aoAbrirItem(item)}
                    className={cn(
                      "p-3.5 transition-all cursor-pointer group flex items-center justify-between gap-3 relative min-h-[56px] touch-manipulation",
                      ehNovo
                        ? "bg-card hover:bg-accent/40 border-l-4 border-l-primary"
                        : "bg-secondary/20 hover:bg-secondary/40 opacity-85 hover:opacity-100"
                    )}
                  >
                    {/* Lado esquerdo: Ícone do documento + Título */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border border-border/30",
                          infoDoc.bg,
                          infoDoc.cor
                        )}
                        style={
                          infoDoc.corHex
                            ? {
                                color: infoDoc.corHex,
                                backgroundColor: `${infoDoc.corHex}15`,
                                borderColor: `${infoDoc.corHex}35`,
                              }
                            : undefined
                        }
                      >
                        <IconeDoc size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {ehAtrasada && (
                            <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                          )}
                          <p
                            className={cn(
                              "text-xs sm:text-sm truncate",
                              ehNovo ? "font-bold text-foreground" : "font-medium text-foreground/90"
                            )}
                          >
                            {item.titulo}
                          </p>
                        </div>
                        {item.descricao && (
                          <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                            {item.descricao}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Lado direito: Data de vencimento + Ações (Link, Lido, Limpar) */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {item.link && (
                        <Tooltip conteudo="Abrir no Google Calendar">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-accent transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </Tooltip>
                      )}

                      {item.dataVencimento && (
                        <span
                          className={cn(
                            "text-xs font-mono px-2 py-0.5 rounded-md",
                            ehAtrasada
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold"
                              : ehGoogle
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                              : "text-muted-foreground bg-secondary/60"
                          )}
                        >
                          {item.dataInicioIso && item.dataFimIso && item.dataInicioIso !== item.dataFimIso
                            ? `${item.dataInicioIso.slice(8, 10)}/${item.dataInicioIso.slice(5, 7)} → ${item.dataFimIso.slice(8, 10)}/${item.dataFimIso.slice(5, 7)}`
                            : item.dataVencimento.includes("→") || item.dataVencimento.includes(" a ")
                            ? item.dataVencimento
                            : item.dataVencimento.replace(/(\d{4})-(\d{2})-(\d{2})/, "$3/$2/$1").slice(0, 10)}
                        </span>
                      )}

                      {ehNovo && (
                        <Tooltip conteudo="Marcar como lido">
                          <button
                            type="button"
                            onClick={(e) => marcarComoLido(item.id, e)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer ml-1 min-h-[32px]"
                            aria-label="Marcar como lido"
                          >
                            <Check size={13} />
                            <span>Lido</span>
                          </button>
                        </Tooltip>
                      )}

                      <Tooltip conteudo="Limpar notificação">
                        <button
                          type="button"
                          onClick={(e) => limparItem(item.id, e)}
                          className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center ml-0.5"
                          aria-label="Limpar notificação"
                        >
                          <Trash2 size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé: Mostrar mais e link para Inbox completa */}
          <div className="p-2.5 bg-secondary/40 border-t border-border/50 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground font-medium px-2">
              {itens.length} item(ns) no total
            </span>
            <Link
              to="/inbox"
              onClick={() => setAberto(false)}
              className="py-1.5 px-3 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Caixa de Entrada</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {/* Drawer / Bottom Sheet Nativo para Celular (Mobile First, espaçoso e confortável) */}
      {ehMobile && aberto && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop para fechar */}
          <div className="fixed inset-0" onClick={() => setAberto(false)} />

          <div className="relative z-10 w-full max-h-[88vh] bg-card border-t border-border rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 pb-safe">
            {/* Puxador touch */}
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Cabeçalho do Drawer */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    Notificações & Agenda
                    {naoVistosCount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                        {naoVistosCount}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">Compromissos e avisos</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {naoVistosCount > 0 && (
                  <button
                    type="button"
                    onClick={marcarTodosComoLidos}
                    className="h-10 w-10 rounded-xl bg-secondary/80 text-muted-foreground hover:text-foreground active:scale-95 flex items-center justify-center cursor-pointer"
                    aria-label="Marcar todas como lidas"
                  >
                    <CheckCheck size={20} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="h-10 w-10 rounded-xl bg-secondary/80 text-muted-foreground hover:text-foreground active:scale-95 flex items-center justify-center cursor-pointer"
                  aria-label="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Abas de Filtragem Rápida Mobile */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-secondary/20 shrink-0">
              <button
                type="button"
                onClick={() => setFiltro("semana")}
                className={cn(
                  "flex-1 h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  filtro === "semana"
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground bg-card/40"
                )}
              >
                <CalendarDays size={16} className={filtro === "semana" ? "text-primary" : ""} />
                <span>Semana</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltro("nao_vistos")}
                className={cn(
                  "flex-1 h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  filtro === "nao_vistos"
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground bg-card/40"
                )}
              >
                <Clock size={16} className={filtro === "nao_vistos" ? "text-primary" : ""} />
                <span>Não Lidos</span>
                {naoVistosCount > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}
              </button>

              <button
                type="button"
                onClick={() => setFiltro("todos")}
                className={cn(
                  "flex-1 h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  filtro === "todos"
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground bg-card/40"
                )}
              >
                <Inbox size={16} className={filtro === "todos" ? "text-primary" : ""} />
                <span>Todos</span>
              </button>
            </div>

            {/* Lista de Notificações Mobile */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
              {carregando ? (
                <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
                  <div className="h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span>Carregando notificações...</span>
                </div>
              ) : itensFiltradosAba.length === 0 ? (
                <div className="py-16 px-4 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-secondary/80 flex items-center justify-center text-muted-foreground/60 mb-1">
                    <CalendarCheck size={28} />
                  </div>
                  <p className="text-base font-bold text-foreground">Tudo organizado!</p>
                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    {filtro === "nao_vistos"
                      ? "Você não possui notificações pendentes."
                      : "Nenhum compromisso agendado para o período selecionado."}
                  </p>
                </div>
              ) : (
                itensFiltradosAba.map((item) => {
                  const ehNovo = !item.visto;
                  const dataFimCalculada = item.dataFimIso || normalizarDataISO(item.dataVencimento);
                  const ehAtrasada =
                    item.tipo === "tarefa_atrasada" ||
                    (dataFimCalculada ? dataFimCalculada < hojeISO() && item.tipo !== "google_calendar" : false);
                  const ehGoogle = item.tipo === "google_calendar" || item.id.startsWith("google-");
                  const infoDoc = obterInfoDocumento(item);
                  const IconeDoc = infoDoc.Icone;

                  return (
                    <div
                      key={item.id}
                      onClick={() => aoAbrirItem(item)}
                      className={cn(
                        "p-4 rounded-2xl transition-all border flex flex-col gap-3 cursor-pointer",
                        ehNovo
                          ? "bg-card border-primary/40 shadow-sm"
                          : "bg-secondary/30 border-border/40 opacity-90"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border border-border/30",
                            infoDoc.bg,
                            infoDoc.cor
                          )}
                          style={
                            infoDoc.corHex
                              ? {
                                  color: infoDoc.corHex,
                                  backgroundColor: `${infoDoc.corHex}15`,
                                  borderColor: `${infoDoc.corHex}35`,
                                }
                              : undefined
                          }
                        >
                          <IconeDoc size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {ehAtrasada && <AlertTriangle size={16} className="text-rose-500 shrink-0" />}
                            <p
                              className={cn(
                                "text-base leading-snug",
                                ehNovo ? "font-bold text-foreground" : "font-medium text-foreground/90"
                              )}
                            >
                              {item.titulo}
                            </p>
                          </div>
                          {item.descricao && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {item.descricao}
                            </p>
                          )}
                          {item.dataVencimento && (
                            <div className="mt-2">
                              <span
                                className={cn(
                                  "text-xs font-mono px-2.5 py-1 rounded-lg inline-flex items-center gap-1",
                                  ehAtrasada
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold"
                                    : ehGoogle
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                                    : "text-muted-foreground bg-secondary/80 font-medium"
                                )}
                              >
                                <Clock size={12} />
                                {item.dataVencimento.replace(/(\d{4})-(\d{2})-(\d{2})/, "$3/$2/$1")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ações em linha com botões táteis no mobile */}
                      <div
                        className="flex items-center justify-end gap-2 pt-2 border-t border-border/30"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="h-10 px-3 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 flex items-center gap-1.5"
                          >
                            <ExternalLink size={14} />
                            <span>Google</span>
                          </a>
                        )}
                        {ehNovo && (
                          <button
                            type="button"
                            onClick={(e) => marcarComoLido(item.id, e)}
                            className="h-10 px-4 rounded-xl text-xs font-bold bg-primary/15 text-primary active:bg-primary/25 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check size={15} />
                            <span>Marcar Lido</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => limparItem(item.id, e)}
                          className="h-10 w-10 rounded-xl text-muted-foreground/70 hover:text-destructive active:bg-destructive/10 flex items-center justify-center bg-secondary/60 cursor-pointer"
                          aria-label="Excluir notificação"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé do Mobile */}
            <div className="p-4 bg-secondary/30 border-t border-border/40 flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false);
                    setModalLembreteAberto(true);
                  }}
                  className="flex-1 h-12 rounded-2xl bg-secondary text-foreground hover:bg-secondary/80 active:scale-[0.98] font-bold text-sm flex items-center justify-center gap-2 border border-border/50 cursor-pointer"
                >
                  <Plus size={18} />
                  <span>Novo Lembrete</span>
                </button>
                <Link
                  to="/inbox"
                  onClick={() => setAberto(false)}
                  className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] font-bold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>Caixa de Entrada</span>
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agendar Lembrete Rápido */}
      <ModalLembrete
        aberto={modalLembreteAberto}
        aoFechar={() => setModalLembreteAberto(false)}
        aoSalvar={async (titulo, dataHora) => {
          toast(`Lembrete "${titulo}" agendado para ${dataHora}!`, { tipo: "sucesso" });
          carregarNotificacoes();
        }}
      />
    </>
  );
}
