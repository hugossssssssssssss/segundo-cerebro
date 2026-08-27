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
} from "lucide-react";
import {
  type MapaEstadoInbox,
  carregarEstadoInbox,
  gravarEstadoInbox,
  compilarItensInbox,
} from "@/lib/inbox";
import type { ItemInbox } from "@/lib/tipos";
import { carregarRepo } from "@/lib/repo";
import { lerConfig, configCompleta } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ModalLembrete } from "@/components/ModalLembrete";
import { toast } from "@/lib/toast";

type FiltroNotificacao = "semana" | "nao_vistos" | "todos";

export function PainelNotificacoesHeader() {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [itens, setItens] = useState<ItemInbox[]>([]);
  const [mapaEstado, setMapaEstado] = useState<MapaEstadoInbox>({});
  const [shaEstado, setShaEstado] = useState<string | undefined>();
  const [filtro, setFiltro] = useState<FiltroNotificacao>("semana");
  const [modalLembreteAberto, setModalLembreteAberto] = useState(false);

  const cfg = useMemo(() => lerConfig(), []);
  const pronto = configCompleta(cfg);
  const navegar = useNavigate();

  // Carrega notificações e compromissos
  const carregarNotificacoes = useCallback(async () => {
    if (!pronto) return;
    try {
      setCarregando(true);
      const todos = await carregarRepo(cfg, { memoria: 20_000 });
      const estadoRes = await carregarEstadoInbox(cfg, todos);
      setMapaEstado(estadoRes.mapa);
      setShaEstado(estadoRes.sha);

      const agora = new Date();
      const todosItens = compilarItensInbox(todos, estadoRes.mapa, agora);

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

  // Contagem de não vistos
  const naoVistosCount = useMemo(() => {
    return itens.filter((i) => !i.visto).length;
  }, [itens]);

  // Filtragem por aba
  const itensFiltradosAba = useMemo(() => {
    const agora = new Date();
    const seteDiasFrenteMs = 7 * 24 * 60 * 60 * 1000;
    const agoraMs = agora.getTime();

    if (filtro === "nao_vistos") {
      return itens.filter((i) => !i.visto);
    }

    if (filtro === "semana") {
      return itens.filter((i) => {
        if (!i.dataVencimento) return !i.visto;
        const d = new Date(i.dataVencimento);
        if (isNaN(d.getTime())) return true;
        const diff = d.getTime() - agoraMs;
        // Compromissos entre hoje e próximos 7 dias ou atrasados pendentes
        return diff >= -24 * 60 * 60 * 1000 && diff <= seteDiasFrenteMs;
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
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "rounded-xl p-2 transition-all relative cursor-pointer flex items-center justify-center border",
              aberto
                ? "bg-accent border-border/80 text-foreground shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-accent/80 hover:text-foreground"
            )}
            title={naoVistosCount > 0 ? `${naoVistosCount} nova(s) notificação(ões)` : "Central de Notificações & Agenda"}
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

        <PopoverContent
          align="end"
          className="w-[390px] sm:w-[440px] p-0 shadow-2xl border-border/80 bg-card/95 backdrop-blur-2xl rounded-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
          sideOffset={8}
        >
          {/* Cabeçalho da Central de Notificações */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50 bg-secondary/30">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Bell size={15} />
              </div>
              <div>
                <h3 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  Notificações & Agenda
                  {naoVistosCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
                      {naoVistosCount}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-muted-foreground">Compromissos e avisos em tempo real</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  setModalLembreteAberto(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Agendar novo lembrete"
              >
                <Plus size={13} />
                <span>Lembrete</span>
              </button>

              {naoVistosCount > 0 && (
                <button
                  type="button"
                  onClick={marcarTodosComoLidos}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                  title="Marcar todas como lidas"
                  aria-label="Marcar todas como lidas"
                >
                  <CheckCheck size={16} />
                </button>
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
                const ehAtrasada = item.tipo === "tarefa_atrasada";

                return (
                  <div
                    key={item.id}
                    onClick={() => aoAbrirItem(item)}
                    className={cn(
                      "p-3.5 transition-all cursor-pointer group flex flex-col gap-1.5 relative",
                      ehNovo
                        ? "bg-card hover:bg-accent/40 border-l-4 border-l-primary"
                        : "bg-secondary/20 hover:bg-secondary/40 opacity-80 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {ehAtrasada ? (
                          <AlertTriangle size={13} className="text-rose-500 shrink-0" />
                        ) : ehNovo ? (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                        ) : (
                          <Clock size={13} className="text-muted-foreground/60 shrink-0" />
                        )}
                        <p
                          className={cn(
                            "text-xs truncate",
                            ehNovo ? "font-bold text-foreground" : "font-medium text-foreground/80"
                          )}
                        >
                          {item.titulo}
                        </p>
                      </div>

                      {item.dataVencimento && (
                        <span
                          className={cn(
                            "text-[10px] shrink-0 font-mono px-1.5 py-0.5 rounded-md",
                            ehAtrasada
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold"
                              : "text-muted-foreground bg-secondary/50"
                          )}
                        >
                          {item.dataVencimento}
                        </span>
                      )}
                    </div>

                    {item.descricao && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.descricao}
                      </p>
                    )}

                    {/* Rodapé com botões de Ação por item */}
                    <div className="flex items-center justify-between pt-1.5 mt-0.5 border-t border-border/20">
                      <span className="text-[10px] text-muted-foreground/70 font-medium truncate max-w-[150px]">
                        {item.tituloOrigem || "Klaus"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {ehNovo && (
                          <button
                            type="button"
                            onClick={(e) => marcarComoLido(item.id, e)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Marcar como lido"
                          >
                            <Check size={11} />
                            <span>Lido</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => limparItem(item.id, e)}
                          className="p-1 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Limpar notificação"
                          aria-label="Limpar notificação"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
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
