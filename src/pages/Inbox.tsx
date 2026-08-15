import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Trash2,
  Check,
  Filter,
  Plus,
  RefreshCw,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, type ItemRepo } from "@/lib/repo";
import {
  compilarItensInbox,
  carregarEstadoInbox,
  gravarEstadoInbox,
  enviarNotificacaoTelegram,
  enviarNotificacaoEmailGoogle,
  precisaEscalationInatividade,
  formatarTagLembrete,
  type MapaEstadoInbox,
} from "@/lib/inbox";
import { Botao, Cartao, Selo, Aviso, Vazio, Carregando } from "@/components/ui";
import { ModalLembrete } from "@/components/ModalLembrete";
import { useSalvar } from "@/lib/useSalvar";
import { lerMarkdown, escreverMarkdown } from "@/lib/markdown";

type AbaFiltro = "nao_vistos" | "lembretes" | "atrasadas" | "todas" | "arquivados";

export default function Inbox() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const navegar = useNavigate();
  const { salvarTexto } = useSalvar(cfg);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acervo, setAcervo] = useState<ItemRepo[]>([]);
  const [mapaEstado, setMapaEstado] = useState<MapaEstadoInbox>({});
  const [shaEstado, setShaEstado] = useState<string | undefined>(undefined);
  const [aba, setAba] = useState<AbaFiltro>("nao_vistos");
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Carrega repositório e estado da Inbox
  const carregar = useCallback(async () => {
    if (!pronto) return;
    setCarregando(true);
    setErro(null);

    try {
      const [todos, estadoRes] = await Promise.all([
        carregarRepo(cfg),
        carregarEstadoInbox(cfg),
      ]);
      setAcervo(todos);
      setMapaEstado(estadoRes.mapa);
      setShaEstado(estadoRes.sha);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar Caixa de Entrada.");
    } finally {
      setCarregando(false);
    }
  }, [pronto, cfg.githubToken, cfg.repoOwner, cfg.repoName, cfg.branch]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Lista compilada de itens da Inbox
  const itensCompilados = useMemo(() => {
    return compilarItensInbox(acervo, mapaEstado);
  }, [acervo, mapaEstado]);

  // Checagem automática de regras de escalonamento Telegram / Email
  useEffect(() => {
    if (!itensCompilados.length || !cfg.inboxTelegramAtivo) return;

    const verificarEscalation = async () => {
      let alterado = false;
      const novoMapa = { ...mapaEstado };

      for (const item of itensCompilados) {
        if (precisaEscalationInatividade(item, cfg.inboxEscalaHoras)) {
          const mensagem = `⚠️ *Klaus - Lembrete Não Visto*\n\n📌 *${item.titulo}*\n📅 Venceu em: ${item.dataVencimento}\n📄 Origem: ${item.tituloOrigem}`;

          if (cfg.inboxTelegramAtivo && cfg.telegramBotToken && cfg.telegramChatId) {
            const enviou = await enviarNotificacaoTelegram(
              cfg.telegramBotToken,
              cfg.telegramChatId,
              mensagem,
            );
            if (enviou) {
              novoMapa[item.id] = { ...novoMapa[item.id], notificadoTelegram: true };
              alterado = true;
            }
          }

          if (cfg.googleEmailAtivo && cfg.googleAppsScriptUrl) {
            const enviouEmail = await enviarNotificacaoEmailGoogle(
              cfg.googleAppsScriptUrl,
              `[Klaus] Lembrete Atrasado: ${item.titulo}`,
              mensagem,
            );
            if (enviouEmail) {
              novoMapa[item.id] = { ...novoMapa[item.id], notificadoEmail: true };
              alterado = true;
            }
          }
        }
      }

      if (alterado) {
        setMapaEstado(novoMapa);
        const novoSha = await gravarEstadoInbox(cfg, novoMapa, shaEstado);
        if (novoSha) setShaEstado(novoSha);
      }
    };

    verificarEscalation();
  }, [itensCompilados, cfg.inboxTelegramAtivo, cfg.inboxEscalaHoras, cfg.telegramBotToken, cfg.telegramChatId, cfg.googleEmailAtivo, cfg.googleAppsScriptUrl]);

  // Marcar item como visto / não visto
  const alternarVisto = async (id: string) => {
    const atual = mapaEstado[id]?.visto;
    const novoMapa: MapaEstadoInbox = {
      ...mapaEstado,
      [id]: {
        ...mapaEstado[id],
        visto: !atual,
        vistoEm: !atual ? new Date().toISOString() : undefined,
      },
    };
    setMapaEstado(novoMapa);
    const novoSha = await gravarEstadoInbox(cfg, novoMapa, shaEstado);
    if (novoSha) setShaEstado(novoSha);
  };

  // Marcar todos como vistos
  const marcarTodosComoVistos = async () => {
    const agoraIso = new Date().toISOString();
    const novoMapa: MapaEstadoInbox = { ...mapaEstado };

    for (const item of itensCompilados) {
      novoMapa[item.id] = {
        ...novoMapa[item.id],
        visto: true,
        vistoEm: agoraIso,
      };
    }

    setMapaEstado(novoMapa);
    const novoSha = await gravarEstadoInbox(cfg, novoMapa, shaEstado);
    if (novoSha) setShaEstado(novoSha);
    setMensagemSucesso("Todos os itens foram marcados como lidos!");
    setTimeout(() => setMensagemSucesso(null), 3000);
  };

  // Descartar/Arquivar um item
  const descartarItem = async (id: string) => {
    const novoMapa: MapaEstadoInbox = {
      ...mapaEstado,
      [id]: {
        ...mapaEstado[id],
        descartado: true,
      },
    };
    setMapaEstado(novoMapa);
    const novoSha = await gravarEstadoInbox(cfg, novoMapa, shaEstado);
    if (novoSha) setShaEstado(novoSha);
  };

  // Criar um novo lembrete e anexar na nota/tarefa padrão ou ativa
  const salvarNovoLembrete = async (
    titulo: string,
    dataHora: string,
    canais: ("inbox" | "telegram" | "email")[],
  ) => {
    // Escolhe nota para salvar (primeira nota em notas/ ou cria uma)
    const notaAlvo = acervo.find((i) => i.caminho.startsWith("notas/")) || acervo[0];
    if (!notaAlvo) return;

    const tag = formatarTagLembrete(titulo, dataHora);
    const doc = lerMarkdown(notaAlvo.texto);
    const corpoAtualizado = doc.corpo ? `${doc.corpo}\n\n${tag}` : tag;
    const novoTexto = escreverMarkdown({ dados: doc.dados, corpo: corpoAtualizado });

    await salvarTexto(notaAlvo.caminho, novoTexto, notaAlvo.sha, `adicionar lembrete: ${titulo}`);

    // Disparar Telegram imediato se configurado
    if (canais.includes("telegram") && cfg.telegramBotToken && cfg.telegramChatId) {
      await enviarNotificacaoTelegram(
        cfg.telegramBotToken,
        cfg.telegramChatId,
        `📌 *Novo Lembrete Agendado no Klaus*\n\n*${titulo}*\n📅 Data: ${dataHora}`,
      );
    }

    setMensagemSucesso(`Lembrete "${titulo}" criado com sucesso!`);
    setTimeout(() => setMensagemSucesso(null), 3000);
    carregar();
  };



  // Filtragem dos itens exibidos
  const itensExibidos = useMemo(() => {
    return itensCompilados.filter((item) => {
      if (aba === "nao_vistos") return !item.visto;
      if (aba === "lembretes") return item.tipo === "lembrete" && !item.visto;
      if (aba === "atrasadas") return item.tipo === "tarefa_atrasada" && !item.visto;
      if (aba === "todas") return true;
      if (aba === "arquivados") return item.visto;
      return true;
    });
  }, [itensCompilados, aba]);

  const contagemNaoVistos = itensCompilados.filter((i) => !i.visto).length;
  const contagemAtrasadas = itensCompilados.filter((i) => i.tipo === "tarefa_atrasada" && !i.visto).length;
  const contagemLembretes = itensCompilados.filter((i) => i.tipo === "lembrete" && !i.visto).length;

  const navegarParaOrigem = (caminho: string) => {
    let pasta = "notas";
    if (caminho.startsWith("tarefas/")) pasta = "tarefas";
    else if (caminho.startsWith("processos/")) pasta = "processos";
    else if (caminho.startsWith("pdi/")) pasta = "pdi";
    else if (caminho.startsWith("referencias/")) pasta = "referencias";

    navegar(`/${pasta}?abrir=${encodeURIComponent(caminho)}`);
  };

  if (!pronto) {
    return (
      <Aviso tom="erro">
        Para usar a Caixa de Entrada, preencha o Token do GitHub e as informações do repositório na tela de Ajustes.
      </Aviso>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Caixa de Entrada</h1>
            {contagemNaoVistos > 0 && (
              <span className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground">
                {contagemNaoVistos} {contagemNaoVistos === 1 ? "novo" : "novos"}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Lembretes agendados e alertas de tarefas que precisam da sua atenção.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Botao variante="neutro" tamanho="pequeno" onClick={() => carregar()}>
            <RefreshCw size={14} className={carregando ? "animate-spin" : ""} />
            Atualizar
          </Botao>

          <Botao variante="primario" tamanho="pequeno" onClick={() => setModalNovoAberto(true)}>
            <Plus size={16} />
            Novo Lembrete
          </Botao>
        </div>
      </div>

      {mensagemSucesso && <Aviso tom="sucesso">{mensagemSucesso}</Aviso>}
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {/* Abas e Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setAba("nao_vistos")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              aba === "nao_vistos"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Bell size={14} />
            Não Vistas ({contagemNaoVistos})
          </button>

          <button
            onClick={() => setAba("atrasadas")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              aba === "atrasadas"
                ? "bg-destructive text-destructive-foreground font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <AlertTriangle size={14} />
            Tarefas Atrasadas ({contagemAtrasadas})
          </button>

          <button
            onClick={() => setAba("lembretes")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              aba === "lembretes"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Calendar size={14} />
            Lembretes ({contagemLembretes})
          </button>

          <button
            onClick={() => setAba("todas")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              aba === "todas"
                ? "bg-secondary text-secondary-foreground font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Filter size={14} />
            Todas ({itensCompilados.length})
          </button>

          <button
            onClick={() => setAba("arquivados")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              aba === "arquivados"
                ? "bg-secondary text-secondary-foreground font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <CheckCheck size={14} />
            Arquivadas
          </button>
        </div>

        {contagemNaoVistos > 0 && (
          <button
            onClick={marcarTodosComoVistos}
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline px-2 py-1"
          >
            <CheckCheck size={14} />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Lista de Conteúdo */}
      {carregando ? (
        <Carregando texto="Buscando lembretes e tarefas..." />
      ) : itensExibidos.length === 0 ? (
        <Vazio
          titulo="Nenhum item nesta caixa de entrada"
          descricao={
            aba === "nao_vistos"
              ? "Você está em dia! Todos os lembretes e tarefas atrasadas foram lidos."
              : "Não há itens correspondentes a este filtro."
          }
          acao={
            <Botao variante="primario" tamanho="pequeno" onClick={() => setModalNovoAberto(true)}>
              <Plus size={16} /> Criar Lembrete
            </Botao>
          }
        />
      ) : (
        <div className="space-y-3">
          {itensExibidos.map((item) => {
            const ehAtrasada = item.tipo === "tarefa_atrasada";
            return (
              <Cartao
                key={item.id}
                className={`p-4 transition-all hover:shadow-md ${
                  !item.visto
                    ? ehAtrasada
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-primary/40 bg-primary/5"
                    : "opacity-75"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`rounded-xl p-2.5 shrink-0 ${
                        ehAtrasada
                          ? "bg-destructive/15 text-destructive"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {ehAtrasada ? <AlertTriangle size={20} /> : <Bell size={20} />}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-base text-foreground leading-snug">
                          {item.titulo}
                        </h3>
                        <Selo tom={ehAtrasada ? "perigo" : "primario"}>
                          {ehAtrasada ? "Tarefa Atrasada" : "Lembrete"}
                        </Selo>
                        {item.notificadoTelegram && (
                          <Selo tom="sucesso">Telegram Enviado</Selo>
                        )}
                      </div>

                      {item.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.descricao}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar size={12} /> {item.dataVencimento}
                        </span>
                        <span>•</span>
                        <button
                          onClick={() => navegarParaOrigem(item.caminhoOrigem)}
                          className="flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          <ExternalLink size={12} /> {item.tituloOrigem}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ações do item */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end">
                    <Botao
                      variante={item.visto ? "neutro" : "primario"}
                      tamanho="pequeno"
                      onClick={() => alternarVisto(item.id)}
                      title={item.visto ? "Marcar como não visto" : "Marcar como visto"}
                    >
                      <Check size={14} />
                      {item.visto ? "Lido" : "Marcar Lido"}
                    </Botao>

                    <Botao
                      variante="neutro"
                      tamanho="pequeno"
                      onClick={() => navegarParaOrigem(item.caminhoOrigem)}
                    >
                      <ExternalLink size={14} />
                      Abrir
                    </Botao>

                    <Botao
                      variante="fantasma"
                      tamanho="icone"
                      onClick={() => descartarItem(item.id)}
                      title="Arquivar"
                    >
                      <Trash2 size={16} className="text-muted-foreground hover:text-destructive" />
                    </Botao>
                  </div>
                </div>
              </Cartao>
            );
          })}
        </div>
      )}

      {/* Modal de criação */}
      <ModalLembrete
        aberto={modalNovoAberto}
        aoFechar={() => setModalNovoAberto(false)}
        aoSalvar={salvarNovoLembrete}
      />
    </div>
  );
}
