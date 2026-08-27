/**
 * PainelNotificacoesHeader — Central de Notificações Pop-up (estilo Facebook/Notion)
 *
 * Exibida ao clicar no ícone de sino no topo do Klaus.
 * Mostra os 6 principais compromissos e lembretes da semana:
 * - Itens não lidos com destaque visual (branco mais claro)
 * - Itens já vistos com tom neutro/mais escuro
 * - Botão "Marcar como lido" e "Limpar" em cada notificação
 * - Link "Ver todos os lembretes" para a página /inbox
 * - Lembretes com mais de 15 dias no passado expiram automaticamente
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

export function PainelNotificacoesHeader() {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [itens, setItens] = useState<ItemInbox[]>([]);
  const [mapaEstado, setMapaEstado] = useState<MapaEstadoInbox>({});
  const [shaEstado, setShaEstado] = useState<string | undefined>();
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

      // Ordenar: primeiro não lidos, depois mais recentes
      itensFiltrados.sort((a, b) => {
        if (a.visto !== b.visto) return a.visto ? 1 : -1;
        return (b.dataVencimento || "").localeCompare(a.dataVencimento || "");
      });

      setItens(itensFiltrados);
    } catch {
      // Silencioso no header
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

  // Principais 6 itens para exibição no popup
  const itensExibidos = useMemo(() => {
    return itens.slice(0, 6);
  }, [itens]);

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
              "rounded-lg p-1.5 sm:p-2 transition-colors relative cursor-pointer flex items-center justify-center",
              aberto
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            title={naoVistosCount > 0 ? `${naoVistosCount} nova(s) notificação(ões)` : "Central de Notificações"}
            aria-label="Notificações e Lembretes"
          >
            <Bell size={18} />
            {naoVistosCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-[380px] sm:w-[420px] p-0 shadow-2xl border-border bg-card/95 backdrop-blur-xl rounded-2xl overflow-hidden"
          sideOffset={8}
        >
          {/* Cabeçalho da Central de Notificações */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/30">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Bell size={15} className="text-primary" />
                Notificações & Agenda
              </span>
              {naoVistosCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/20 text-primary">
                  {naoVistosCount} nova{naoVistosCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  setModalLembreteAberto(true);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Agendar novo lembrete"
              >
                <Plus size={14} />
                <span className="text-[11px] font-medium hidden sm:inline">Lembrete</span>
              </button>

              {naoVistosCount > 0 && (
                <button
                  type="button"
                  onClick={marcarTodosComoLidos}
                  className="p-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline transition-colors cursor-pointer"
                >
                  Ler todas
                </button>
              )}
            </div>
          </div>

          {/* Lista de Notificações (Até 6 itens) */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/30">
            {carregando ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Atualizando compromissos...</span>
              </div>
            ) : itensExibidos.length === 0 ? (
              <div className="py-10 px-4 text-center text-muted-foreground flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground/60">
                  <Bell size={20} />
                </div>
                <p className="text-xs font-semibold text-foreground">Tudo em dia!</p>
                <p className="text-[11px] text-muted-foreground/80 max-w-xs">
                  Você não possui compromissos pendentes ou lembretes para esta semana.
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
                      "p-3.5 transition-all cursor-pointer group flex flex-col gap-1.5",
                      ehNovo
                        ? "bg-card hover:bg-accent/40 border-l-4 border-l-primary"
                        : "bg-muted/25 hover:bg-muted/45 opacity-80 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {ehAtrasada ? (
                          <AlertTriangle size={13} className="text-destructive shrink-0" />
                        ) : (
                          <Clock size={13} className="text-primary/70 shrink-0" />
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
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
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
                      <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                        {item.tituloOrigem || "Klaus"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {ehNovo && (
                          <button
                            type="button"
                            onClick={(e) => marcarComoLido(item.id, e)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Marcar como lido"
                          >
                            <Check size={11} />
                            Marcar lido
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => limparItem(item.id, e)}
                          className="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Limpar notificação"
                        >
                          <Trash2 size={11} />
                          Limpar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé: Mostrar mais / Ver Caixa de Entrada completa */}
          <div className="p-2.5 bg-secondary/40 border-t border-border/50 text-center">
            <Link
              to="/inbox"
              onClick={() => setAberto(false)}
              className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Mostrar mais e gerenciar caixa de entrada</span>
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
