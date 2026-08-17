import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Sparkles,
  Clock,
  Tag,
  Archive,
  WifiOff,
  RotateCcw,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, type ItemRepo } from "@/lib/repo";
import {
  compilarItensInbox,
  compilarNotasInativas,
  carregarEstadoInbox,
  salvarEstadoInboxLocal,
  gravarEstadoInbox,
  enviarNotificacaoTelegram,
  enviarNotificacaoEmailGoogle,
  precisaEscalationInatividade,
  formatarTagLembrete,
  adiarDataHora,
  type MapaEstadoInbox,
} from "@/lib/inbox";
import { extrairLembretesComIA } from "@/lib/gemini";
import type { ItemInbox } from "@/lib/tipos";
import { Botao, Cartao, Selo, Aviso, Vazio, Carregando, Modal } from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { CartaoItem } from "@/components/CartaoItem";
import { SeloStatus } from "@/components/SeloStatus";
import { ModalLembrete } from "@/components/ModalLembrete";
import { Calendario } from "@/components/Calendario";
import { useSalvar } from "@/lib/useSalvar";
import { lerMarkdown, escreverMarkdown } from "@/lib/markdown";
import { comoTarefa } from "@/lib/entidades";
import { toast } from "@/lib/toast";
import { lerParametroCriar, formatarDataPtBR } from "@/lib/utils";
import {
  obterRascunhosLocais,
  removerRascunhoLocal,
  sincronizarFilaOffline,
} from "@/lib/offlineQueue";

type AbaFiltro = "nao_vistos" | "lembretes" | "atrasadas" | "inativas" | "rascunhos" | "todas" | "arquivados";

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
  const [tagSelecionada, setTagSelecionada] = useState<string | null>(null);
  const [diaFiltro, setDiaFiltro] = useState<string | null>(null);
  const [modalCalendarioAberto, setModalCalendarioAberto] = useState(false);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [extraindoIA, setExtraindoIA] = useState(false);
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
    const aoAtualizar = () => carregar();
    window.addEventListener("acervo-atualizado", aoAtualizar);
    return () => window.removeEventListener("acervo-atualizado", aoAtualizar);
  }, [carregar]);

  const location = useLocation();
  const processouUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const urlAtual = `${location.pathname}${location.search}${location.hash}`;
    if (processouUrlRef.current === urlAtual) return;
    if (lerParametroCriar(location, ["novo", "nova"])) {
      processouUrlRef.current = urlAtual;
      setModalNovoAberto(true);
    }
  }, [location.pathname, location.search, location.hash]);

  // Lista compilada de itens da Inbox
  const itensCompilados = useMemo(() => {
    return compilarItensInbox(acervo, mapaEstado);
  }, [acervo, mapaEstado]);

  // Extrai todas as tags únicas dos itens
  const todasTags = useMemo(() => {
    const tagsSet = new Set<string>();
    for (const item of itensCompilados) {
      if (item.tags) {
        for (const t of item.tags) tagsSet.add(t);
      }
    }
    return Array.from(tagsSet);
  }, [itensCompilados]);

  // Cálculo da Visão Semanal (próximos 7 dias)
  const visaoSemanal = useMemo(() => {
    const dias = [];
    const hoje = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const diaDaSemana = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      const total = itensCompilados.filter((item) => item.dataVencimento.startsWith(iso) && !item.visto).length;

      dias.push({
        dataIso: iso,
        diaDaSemana,
        diaNumero: d.getDate(),
        total,
        ehHoje: i === 0,
      });
    }

    return dias;
  }, [itensCompilados]);

  // Checagem automática de regras de escalonamento Telegram / Email
  useEffect(() => {
    if (!itensCompilados.length || (!cfg.inboxTelegramAtivo && !cfg.googleEmailAtivo)) return;

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
        const res = await gravarEstadoInbox(cfg, novoMapa, shaEstado);
        if (res.ok && res.sha) setShaEstado(res.sha);
      }
    };

    verificarEscalation();
  }, [itensCompilados, cfg.inboxTelegramAtivo, cfg.inboxEscalaHoras, cfg.telegramBotToken, cfg.telegramChatId, cfg.googleEmailAtivo, cfg.googleAppsScriptUrl]);

  // Alternar visto/não visto
  const alternarVisto = async (id: string) => {
    const mapaAnterior = { ...mapaEstado };
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
    const res = await gravarEstadoInbox(cfg, novoMapa, shaEstado);
    if (res.ok && res.sha) {
      setShaEstado(res.sha);
    } else if (!res.ok) {
      setMapaEstado(mapaAnterior);
      salvarEstadoInboxLocal(mapaAnterior);
      toast(`Erro ao sincronizar com GitHub: ${res.erro || "Falha na gravação"}`, { tipo: "erro" });
    }
  };

  // Snooze / Adiar lembrete em 1 clique (Ideia 1)
  const adiarItem = async (
    item: ItemInbox,
    opcao: "1h" | "amanha" | "3dias" | "proxima_segunda",
  ) => {
    const novaDataHora = adiarDataHora(item.dataVencimento, opcao);

    // Se tiver arquivo de origem e tag de lembrete bruta, atualiza o arquivo no GitHub
    if (item.lembreteBruto && item.caminhoOrigem) {
      const docAlvo = acervo.find((i) => i.caminho === item.caminhoOrigem);
      if (!docAlvo || !docAlvo.texto) {
        toast(`Nota de origem (${item.caminhoOrigem}) não encontrada para adiar.`, { tipo: "erro" });
        return;
      }

      const doc = lerMarkdown(docAlvo.texto);
      const novaTag = formatarTagLembrete(item.titulo, novaDataHora);
      const corpoAtualizado = doc.corpo.replace(item.lembreteBruto, novaTag);
      const novoTexto = escreverMarkdown({ dados: doc.dados, corpo: corpoAtualizado });

      try {
        await salvarTexto(docAlvo.caminho, novoTexto, docAlvo.sha, `adiar lembrete: ${item.titulo}`);
        setMensagemSucesso(`Lembrete adiado para ${novaDataHora}!`);
        setTimeout(() => setMensagemSucesso(null), 3000);
        carregar();
      } catch (err: any) {
        toast(`Erro ao adiar lembrete no GitHub: ${err?.message || "Falha na gravação"}`, { tipo: "erro" });
      }
    } else if (item.caminhoOrigem && item.caminhoOrigem.startsWith("tarefas/")) {
      const docAlvo = acervo.find((i) => i.caminho === item.caminhoOrigem);
      if (!docAlvo || !docAlvo.texto) {
        toast(`Tarefa de origem (${item.caminhoOrigem}) não encontrada para adiar.`, { tipo: "erro" });
        return;
      }

      const doc = lerMarkdown(docAlvo.texto);
      const novaDataPrazo = novaDataHora.split(" ")[0];
      const novoTexto = escreverMarkdown({
        dados: { ...doc.dados, prazo: novaDataPrazo },
        corpo: doc.corpo,
      });

      try {
        await salvarTexto(docAlvo.caminho, novoTexto, docAlvo.sha, `adiar prazo de tarefa: ${item.titulo}`);
        setMensagemSucesso(`Prazo de tarefa adiado para ${novaDataPrazo}!`);
        setTimeout(() => setMensagemSucesso(null), 3000);
        carregar();
      } catch (err: any) {
        toast(`Erro ao adiar prazo da tarefa no GitHub: ${err?.message || "Falha na gravação"}`, { tipo: "erro" });
      }
    } else {
      // Para tarefas ou itens sem tag, atualiza o mapa de estado com visto
      const mapaAnterior = { ...mapaEstado };
      const novoMapa: MapaEstadoInbox = {
        ...mapaEstado,
        [item.id]: {
          ...mapaEstado[item.id],
          visto: true,
          vistoEm: new Date().toISOString(),
        },
      };
      setMapaEstado(novoMapa);
      const res = await gravarEstadoInbox(cfg, novoMapa, shaEstado);
      if (res.ok && res.sha) {
        setShaEstado(res.sha);
        setMensagemSucesso(`Lembrete marcado como visto e adiado!`);
        setTimeout(() => setMensagemSucesso(null), 3000);
        carregar();
      } else {
        setMapaEstado(mapaAnterior);
        salvarEstadoInboxLocal(mapaAnterior);
        toast(`Erro ao salvar no GitHub: ${res.erro || "Falha na gravação"}`, { tipo: "erro" });
      }
    }
  };

  // Marcar todos como vistos
  const marcarTodosComoVistos = async () => {
    const mapaAnterior = { ...mapaEstado };
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
    const res = await gravarEstadoInbox(cfg, novoMapa, shaEstado);
    if (res.ok && res.sha) {
      setShaEstado(res.sha);
      setMensagemSucesso("Todos os itens foram marcados como lidos!");
      setTimeout(() => setMensagemSucesso(null), 3000);
    } else {
      setMapaEstado(mapaAnterior);
      salvarEstadoInboxLocal(mapaAnterior);
      toast(`Erro ao sincronizar com o GitHub: ${res.erro || "Falha na gravação"}`, { tipo: "erro" });
    }
  };

  // Descartar/Arquivar um item
  const descartarItem = async (id: string) => {
    const mapaAnterior = { ...mapaEstado };
    const novoMapa: MapaEstadoInbox = {
      ...mapaEstado,
      [id]: {
        ...mapaEstado[id],
        descartado: true,
      },
    };
    setMapaEstado(novoMapa);
    const res = await gravarEstadoInbox(cfg, novoMapa, shaEstado);
    if (res.ok && res.sha) {
      setShaEstado(res.sha);
    } else {
      setMapaEstado(mapaAnterior);
      salvarEstadoInboxLocal(mapaAnterior);
      toast(`Erro ao arquivar item no GitHub: ${res.erro || "Falha na gravação"}`, { tipo: "erro" });
    }
  };

  // Extrair lembretes com a IA Gemini (Ideia 7)
  const executarExtracaoIA = async () => {
    if (!cfg.geminiKey) {
      toast("Configure a chave do Gemini na tela de Ajustes para usar esta função!", { tipo: "aviso" });
      return;
    }
    setExtraindoIA(true);

    try {
      let totalExtraidos = 0;
      // Examina até 5 notas recentes
      const notasRecentes = acervo.filter((i) => i.caminho.startsWith("notas/")).slice(0, 5);

      for (const item of notasRecentes) {
        const extraidos = await extrairLembretesComIA(cfg, item.texto);
        if (extraidos.length > 0) {
          const doc = lerMarkdown(item.texto);
          let corpoNovos = doc.corpo;
          for (const ext of extraidos) {
            const tag = formatarTagLembrete(ext.titulo, ext.dataHora);
            corpoNovos += `\n\n${tag}`;
            totalExtraidos++;
          }
          const novoTexto = escreverMarkdown({ dados: doc.dados, corpo: corpoNovos });
          await salvarTexto(item.caminho, novoTexto, item.sha, "IA: extrair lembretes automaticamente");
        }
      }

      if (totalExtraidos > 0) {
        setMensagemSucesso(`✨ A IA encontrou e agendou ${totalExtraidos} lembretes em seus documentos!`);
        carregar();
      } else {
        setMensagemSucesso("A IA analisou seus documentos recentes e não encontrou novos prazos pendentes.");
      }
    } catch (e) {
      setErro("Falha ao extrair lembretes com a IA.");
    } finally {
      setExtraindoIA(false);
      setTimeout(() => setMensagemSucesso(null), 4000);
    }
  };

  // Criar um novo lembrete
  const salvarNovoLembrete = async (
    titulo: string,
    dataHora: string,
    canais: ("inbox" | "telegram" | "email")[],
  ) => {
    const notaAlvo = acervo.find((i) => i.caminho.startsWith("notas/")) || acervo[0];
    if (!notaAlvo) return;

    const tag = formatarTagLembrete(titulo, dataHora);
    const doc = lerMarkdown(notaAlvo.texto);
    const corpoAtualizado = doc.corpo ? `${doc.corpo}\n\n${tag}` : tag;
    const novoTexto = escreverMarkdown({ dados: doc.dados, corpo: corpoAtualizado });

    await salvarTexto(notaAlvo.caminho, novoTexto, notaAlvo.sha, `adicionar lembrete: ${titulo}`);

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

  const notasInativas = useMemo(() => {
    return compilarNotasInativas(acervo, mapaEstado);
  }, [acervo, mapaEstado]);

  // Filtragem dos itens exibidos
  const itensExibidos = useMemo(() => {
    if (aba === "inativas") {
      return notasInativas.filter((item) => {
        if (tagSelecionada && (!item.tags || !item.tags.includes(tagSelecionada))) {
          return false;
        }
        return true;
      });
    }

    return itensCompilados.filter((item) => {
      // Filtro por Tag (Ideia 6)
      if (tagSelecionada && (!item.tags || !item.tags.includes(tagSelecionada))) {
        return false;
      }

      // Filtro por dia selecionado no painel semanal
      if (diaFiltro && item.dataVencimento.slice(0, 10) !== diaFiltro) {
        return false;
      }

      if (aba === "nao_vistos") return !item.visto && item.tipo !== "nota_inativa";
      if (aba === "lembretes") return item.tipo === "lembrete" && !item.visto;
      if (aba === "atrasadas") return item.tipo === "tarefa_atrasada" && !item.visto;
      if (aba === "todas") return true;
      if (aba === "arquivados") return item.visto;
      return true;
    });
  }, [itensCompilados, notasInativas, aba, tagSelecionada, diaFiltro]);

  const contagemNaoVistos = itensCompilados.filter((i) => !i.visto && i.tipo !== "nota_inativa").length;
  const contagemAtrasadas = itensCompilados.filter((i) => i.tipo === "tarefa_atrasada" && !i.visto).length;
  const contagemLembretes = itensCompilados.filter((i) => i.tipo === "lembrete" && !i.visto).length;
  const contagemInativas = notasInativas.length;

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
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Caixa de Entrada"
        descricao="Lembretes agendados, tarefas atrasadas e sugestões de organização."
        icone={<Bell size={20} />}
        corIcone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        badge={
          contagemNaoVistos > 0 ? (
            <span className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground">
              {contagemNaoVistos} {contagemNaoVistos === 1 ? "novo" : "novos"}
            </span>
          ) : undefined
        }
        acoes={
          <>
            <Botao
              variante="neutro"
              tamanho="pequeno"
              onClick={executarExtracaoIA}
              disabled={extraindoIA}
              title="Usar a IA Gemini para identificar compromissos nos documentos"
            >
              <Sparkles size={14} className={extraindoIA ? "animate-spin text-amber-500" : "text-amber-500"} />
              {extraindoIA ? "Analisando..." : "IA Extrair Prazos"}
            </Botao>

            <Botao variante="primario" tamanho="pequeno" onClick={() => setModalNovoAberto(true)}>
              <Plus size={16} />
              Novo Lembrete
            </Botao>
          </>
        }
      />

      {mensagemSucesso && <Aviso tom="sucesso">{mensagemSucesso}</Aviso>}
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {/* Visão Semanal / Linha do Tempo */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
            <Calendar size={14} /> Próximos 7 Dias
          </h2>
          <button
            onClick={() => setModalCalendarioAberto(true)}
            className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
            title="Abrir mapa de tarefas do mês em formato calendário"
          >
            <Calendar size={13} /> Visão Geral (Calendário Mês)
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {visaoSemanal.map((d) => {
            const estaAtivo = diaFiltro === d.dataIso;
            return (
              <button
                key={d.dataIso}
                onClick={() => setDiaFiltro(estaAtivo ? null : d.dataIso)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                  estaAtivo
                    ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs scale-102"
                    : d.ehHoje
                    ? "border-primary/60 bg-primary/10 font-bold hover:bg-primary/20"
                    : "border-border/60 bg-secondary/40 hover:bg-accent"
                }`}
                title={`Ver pendências do dia ${formatarDataPtBR(d.dataIso)}`}
              >
                <span className={`text-[10px] uppercase font-mono ${estaAtivo ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {d.diaDaSemana}
                </span>
                <span className="text-sm font-semibold">{d.diaNumero}</span>
                {d.total > 0 ? (
                  <span className={`mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${estaAtivo ? "bg-background text-foreground" : "bg-primary text-primary-foreground"}`}>
                    {d.total}
                  </span>
                ) : (
                  <span className="mt-1 text-[10px] opacity-40">-</span>
                )}
              </button>
            );
          })}
        </div>

        {diaFiltro && (
          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              Filtrando tarefas do dia <strong className="text-foreground">{formatarDataPtBR(diaFiltro)}</strong>
            </span>
            <button
              onClick={() => setDiaFiltro(null)}
              className="text-primary hover:underline font-semibold text-xs"
            >
              Limpar filtro de data
            </button>
          </div>
        )}
      </div>

      {/* Abas Principais */}
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
            onClick={() => setAba("inativas")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              aba === "inativas"
                ? "bg-amber-500 text-white font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Archive size={14} />
            Notas Inativas ({contagemInativas})
          </button>

          <button
            onClick={() => setAba("rascunhos")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              aba === "rascunhos"
                ? "bg-purple-600 text-white font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <WifiOff size={14} />
            Rascunhos Offline ({obterRascunhosLocais().length})
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

      {/* Filtro por Tags/Projetos (Ideia 6) */}
      {todasTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap py-1">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Tag size={12} /> Tags:
          </span>
          <button
            onClick={() => setTagSelecionada(null)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
              tagSelecionada === null
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-secondary/60 text-muted-foreground hover:bg-accent"
            }`}
          >
            Todas
          </button>
          {todasTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagSelecionada(t === tagSelecionada ? null : t)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                tagSelecionada === t
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-secondary/60 text-muted-foreground hover:bg-accent"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* Lista de Conteúdo */}
      {aba === "rascunhos" ? (
        (() => {
          const rascunhos = obterRascunhosLocais();
          if (rascunhos.length === 0) {
            return (
              <Vazio
                icone={<WifiOff size={24} />}
                titulo="Nenhum rascunho offline pendente"
                descricao="Todas as suas edições e arquivos já foram sincronizados com o repositório remoto."
              />
            );
          }
          return (
            <div className="space-y-3">
              {rascunhos.map((r) => (
                <CartaoItem
                  key={r.id}
                  icone={<WifiOff size={18} />}
                  titulo={r.caminho.split("/").pop() || r.caminho}
                  subtitulo={`Caminho: ${r.caminho} • Criado em ${r.criadoEm.slice(0, 10)}`}
                  badge={
                    <SeloStatus
                      rotulo={
                        r.status === "conflito"
                          ? "Conflito (409)"
                          : r.status === "erro"
                          ? "Erro no Envio"
                          : "Pendente"
                      }
                      tom={
                        r.status === "conflito"
                          ? "perigo"
                          : r.status === "erro"
                          ? "aviso"
                          : "primario"
                      }
                    />
                  }
                  acoes={
                    <div className="flex items-center gap-2">
                      <Botao
                        variante="primario"
                        tamanho="pequeno"
                        onClick={async () => {
                          const res = await sincronizarFilaOffline(cfg);
                          if (res.concluidos > 0) toast(`${res.concluidos} rascunho(s) sincronizados!`, { tipo: "sucesso" });
                          else if (res.falhas > 0) toast(`${res.falhas} rascunho(s) pendentes com falha ou conflito.`, { tipo: "erro" });
                          else toast("Nenhum rascunho para enviar.", { tipo: "info" });
                          carregar();
                        }}
                      >
                        <RotateCcw size={14} /> Sincronizar
                      </Botao>
                      <Botao
                        variante="fantasma"
                        tamanho="icone"
                        onClick={() => {
                          removerRascunhoLocal(r.id);
                          toast("Rascunho descartado localmente.", { tipo: "info" });
                          carregar();
                        }}
                        title="Descartar rascunho"
                      >
                        <Trash2 size={14} />
                      </Botao>
                    </div>
                  }
                >
                  {r.ultimoErro && (
                    <Aviso tom="erro">
                      {r.ultimoErro}
                    </Aviso>
                  )}
                </CartaoItem>
              ))}
            </div>
          );
        })()
      ) : carregando ? (
        <Carregando texto="Buscando lembretes e tarefas..." />
      ) : itensExibidos.length === 0 ? (
        <Vazio
          icone={<Bell size={24} />}
          titulo="Nenhum item nesta caixa de entrada"
          descricao={
            aba === "nao_vistos"
              ? "Você está em dia! Todos os lembretes e tarefas atrasadas foram visualizados."
              : "Não há lembretes ou pendências correspondentes a este filtro."
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
            const ehInativa = item.tipo === "nota_inativa";
            const dataExibicao = formatarDataPtBR(item.dataVencimento);

            return (
              <Cartao
                key={item.id}
                onClick={() => navegarParaOrigem(item.caminhoOrigem)}
                className={`p-4 transition-all hover:shadow-md cursor-pointer group ${
                  !item.visto
                    ? ehAtrasada
                      ? "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
                      : ehInativa
                      ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60"
                      : "border-primary/40 bg-primary/5 hover:border-primary/60"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`rounded-xl p-2.5 shrink-0 ${
                        ehAtrasada
                          ? "bg-destructive/15 text-destructive"
                          : ehInativa
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {ehAtrasada ? (
                        <AlertTriangle size={20} />
                      ) : ehInativa ? (
                        <Archive size={20} />
                      ) : (
                        <Bell size={20} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-base text-foreground leading-snug group-hover:text-primary transition-colors">
                          {item.titulo}
                        </h3>
                        <Selo tom={ehAtrasada ? "perigo" : ehInativa ? "aviso" : "primario"}>
                          {ehAtrasada ? "Tarefa Atrasada" : ehInativa ? "Nota Inativa" : "Lembrete"}
                        </Selo>
                        {item.notificadoTelegram && (
                          <Selo tom="sucesso">Telegram Enviado</Selo>
                        )}
                        {item.tags?.map((t) => (
                          <span key={t} className="text-[10px] font-mono text-muted-foreground">
                            #{t}
                          </span>
                        ))}
                      </div>

                      {item.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.descricao}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1 font-mono font-medium">
                          <Calendar size={12} /> {dataExibicao}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <ExternalLink size={12} /> {item.tituloOrigem}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações e Snooze em 1 Clique */}
                  <div
                    className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Botões rápidos de Snooze para lembretes */}
                    {!item.visto && !ehInativa && (
                      <div className="flex items-center gap-1.5 border-r border-border/60 pr-2 mr-1">
                        <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-0.5">
                          <Clock size={11} /> Adiar:
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            adiarItem(item, "1h");
                          }}
                          className="px-2 py-1 rounded bg-secondary text-[11px] font-semibold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                          title="Adiar 1 hora"
                        >
                          +1h
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            adiarItem(item, "amanha");
                          }}
                          className="px-2 py-1 rounded bg-secondary text-[11px] font-semibold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                          title="Adiar para Amanhã às 09:00"
                        >
                          Amanhã
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            adiarItem(item, "3dias");
                          }}
                          className="px-2 py-1 rounded bg-secondary text-[11px] font-semibold hover:bg-primary hover:text-primary-foreground transition-colors hidden sm:inline-block cursor-pointer"
                          title="Adiar 3 dias"
                        >
                          +3d
                        </button>
                      </div>
                    )}

                    <Botao
                      variante={item.visto ? "neutro" : "primario"}
                      tamanho="pequeno"
                      onClick={(e) => {
                        e.stopPropagation();
                        alternarVisto(item.id);
                      }}
                      title={item.visto ? "Restaurar como não visto" : "Marcar pendência como concluída"}
                    >
                      <Check size={14} />
                      {item.visto ? "Concluído" : "Marcar Concluído"}
                    </Botao>

                    <Botao
                      variante="fantasma"
                      tamanho="icone"
                      onClick={(e) => {
                        e.stopPropagation();
                        descartarItem(item.id);
                      }}
                      title="Arquivar alerta"
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

      {/* Modal do Calendário Completo do Mês */}
      <Modal
        aberto={modalCalendarioAberto}
        aoFechar={() => setModalCalendarioAberto(false)}
        titulo="Visão Geral do Calendário (Tarefas e Prazos do Mês)"
      >
        <div className="p-2 space-y-4">
          <Calendario
            tarefas={acervo.filter((i) => i.caminho.startsWith("tarefas/")).map((i) => comoTarefa(lerMarkdown(i.texto), i.caminho, i.sha, i.nome))}
            aoAbrir={(t) => {
              setModalCalendarioAberto(false);
              navegarParaOrigem(t.caminho);
            }}
          />
        </div>
      </Modal>

      {/* Modal de criação */}
      <ModalLembrete
        aberto={modalNovoAberto}
        aoFechar={() => setModalNovoAberto(false)}
        aoSalvar={salvarNovoLembrete}
      />
    </div>
  );
}
