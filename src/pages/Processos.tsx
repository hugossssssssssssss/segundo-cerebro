import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  GitMerge,
  Plus,
  Trash2,
  X,
  CheckSquare,
  MessageSquare,
  DollarSign,
  User,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  GripVertical,
  Settings2,
  Zap,
} from "lucide-react";

import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, daPasta, invalidarCache, atualizarCacheLocal } from "@/lib/repo";
import { gravar, apagar } from "@/lib/github";
import { tituloProvavel, escreverMarkdown, lerMarkdown } from "@/lib/markdown";
import {
  comoProcesso,
  processoParaFrontmatter,
  comoCardProcesso,
  cardProcessoParaFrontmatter,
  MODELOS_PROCESSO_PADRAO,
} from "@/lib/processos";
import {
  executarRegrasAoChecklist,
  executarRegrasAoMudarEtapa,
} from "@/lib/automacoesProcesso";
import type { Processo, CardProcesso, EtapaProcesso, RegraAutomacao, ComentarioCard } from "@/lib/tipos";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carregando, Vazio } from "@/components/ui";
import { cn } from "@/lib/utils";

const CORES_ETAPAS = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-500", header: "bg-blue-500" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-500", header: "bg-purple-500" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-500", header: "bg-amber-500" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-500", header: "bg-emerald-500" },
  indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-500", header: "bg-indigo-500" },
  rose: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-500", header: "bg-rose-500" },
  slate: { bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-500", header: "bg-slate-500" },
};

function CartaoSortable({
  card,
  aoClicar,
}: {
  card: CardProcesso;
  aoClicar: (c: CardProcesso) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.caminho,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const totalChecklists = Object.keys(card.checklists).length;
  const concluidosChecklists = Object.values(card.checklists).filter(Boolean).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => aoClicar(card)}
      className="group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs hover:border-primary/40 transition-all cursor-pointer select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {card.titulo}
        </h4>
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="p-1 text-muted-foreground/30 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors shrink-0"
        >
          <GripVertical size={14} />
        </div>
      </div>

      {card.cliente && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <User size={12} className="text-primary" />
          <span>{card.cliente}</span>
        </p>
      )}

      {card.valor !== undefined && card.valor > 0 && (
        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
          <span>R$ {card.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        </div>
      )}

      {/* Progresso de Checklists e Comentários */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-[10px] text-muted-foreground">
        {totalChecklists > 0 ? (
          <div className="flex items-center gap-1 font-medium">
            <CheckSquare size={12} className={concluidosChecklists === totalChecklists ? "text-emerald-500" : "text-amber-500"} />
            <span>
              {concluidosChecklists}/{totalChecklists}
            </span>
          </div>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {card.urgente && (
            <Badge variant="destructive" className="text-[9px] py-0 px-1.5 font-semibold">
              Urgente
            </Badge>
          )}
          {card.comentarios.length > 0 && (
            <span className="flex items-center gap-1 font-medium">
              <MessageSquare size={11} />
              {card.comentarios.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ColunaEtapa({
  etapa,
  cards,
  aoClicarCard,
  aoAdicionarCard,
}: {
  etapa: EtapaProcesso;
  cards: CardProcesso[];
  aoClicarCard: (c: CardProcesso) => void;
  aoAdicionarCard: (etapaId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id });
  const estiloCor = CORES_ETAPAS[etapa.cor] || CORES_ETAPAS.blue;

  const valorTotalEtapa = cards.reduce((acc, c) => acc + (c.valor || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-2xl border border-border/80 bg-card/60 p-3 h-full min-h-[500px] transition-all",
        isOver && "border-primary bg-primary/5 shadow-md"
      )}
    >
      {/* Topo da Coluna */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("h-3 w-3 rounded-full shrink-0", estiloCor.header)} />
          <h3 className="font-bold text-xs text-foreground truncate">{etapa.nome}</h3>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
            {cards.length}
          </Badge>
        </div>

        <button
          onClick={() => aoAdicionarCard(etapa.id)}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Adicionar cartão nesta etapa"
        >
          <Plus size={15} />
        </button>
      </div>

      {valorTotalEtapa > 0 && (
        <div className="pb-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          Total: R$ {valorTotalEtapa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </div>
      )}

      {/* Lista de Cartões */}
      <SortableContext items={cards.map((c) => c.caminho)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[100px]">
          {cards.map((card) => (
            <CartaoSortable key={card.caminho} card={card} aoClicar={aoClicarCard} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function Processos() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [cards, setCards] = useState<CardProcesso[]>([]);
  const [processoAtivoId, setProcessoAtivoId] = useState<string>("");

  const [cardEmEdicao, setCardEmEdicao] = useState<CardProcesso | null>(null);
  const [modalNovoCardAberto, setModalNovoCardAberto] = useState(false);
  const [etapaNovoCard, setEtapaNovoCard] = useState<string>("");

  const [modalConfigProcessoAberto, setModalConfigProcessoAberto] = useState(false);
  const [modalAutomacoesAberto, setModalAutomacoesAberto] = useState(false);
  const [modalNovoProcessoAberto, setModalNovoProcessoAberto] = useState(false);

  // Estados dos formulários
  const [novoCardTitulo, setNovoCardTitulo] = useState("");
  const [novoCardCliente, setNovoCardCliente] = useState("");
  const [novoCardValor, setNovoCardValor] = useState("");

  const [novoProcessoTitulo, setNovoProcessoTitulo] = useState("");
  const [novoProcessoDescricao, setNovoProcessoDescricao] = useState("");

  const [novaEtapaNome, setNovaEtapaNome] = useState("");
  const [novaEtapaCor, setNovaEtapaCor] = useState<EtapaProcesso["cor"]>("blue");
  const [novoChecklistTexto, setNovoChecklistTexto] = useState("");
  const [etapaSelecionadaChecklist, setEtapaSelecionadaChecklist] = useState<string>("");

  // Estado para adicionar automação
  const [novaRegraGatilho, setNovaRegraGatilho] = useState<RegraAutomacao["gatilho"]>("ao_concluir_checklist");
  const [novaRegraChecklistId, setNovaRegraChecklistId] = useState("");
  const [novaRegraEtapaOrigemId, setNovaRegraEtapaOrigemId] = useState("");
  const [novaRegraAcao, setNovaRegraAcao] = useState<RegraAutomacao["acao"]>("mudar_etapa");
  const [novaRegraEtapaDestinoId, setNovaRegraEtapaDestinoId] = useState("");
  const [novaRegraComentario, setNovaRegraComentario] = useState("");

  const [novoComentarioTexto, setNovoComentarioTexto] = useState("");
  const [dragCardAtivo, setDragCardAtivo] = useState<CardProcesso | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const carregar = useCallback(async () => {
    if (!pronto) return;
    setErro("");

    try {
      const todos = await carregarRepo(cfg);
      const arqProcessos = daPasta(todos, "processos").filter((i) => !i.caminho.startsWith("processos/cards/"));
      const arqCards = daPasta(todos, "processos/cards");

      let listaProc = arqProcessos.map((i) => comoProcesso(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome)));
      const listaCards = arqCards.map((i) => comoCardProcesso(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome)));

      // Se o repositório não tiver nenhum processo ainda, inicializar com o Kanban Geral automaticamente
      if (listaProc.length === 0) {
        const mod = MODELOS_PROCESSO_PADRAO[0];
        const id = `proc_${Date.now()}`;
        const caminho = `processos/${id}.md`;
        const novoProc: Processo = {
          caminho,
          sha: "",
          bruto: {},
          id,
          titulo: mod.titulo,
          corpo: "",
          descricao: mod.descricao,
          etapas: mod.etapas,
          regras: mod.regras,
          atualizadoEm: new Date().toISOString(),
        };

        listaProc = [novoProc];
        setProcessos([novoProc]);
        setProcessoAtivoId(id);

        const texto = escreverMarkdown({
          dados: processoParaFrontmatter(novoProc),
          corpo: `Processo de ${mod.titulo}`,
        });
        gravar(cfg, caminho, texto).then((sha) => {
          atualizarCacheLocal(caminho, texto, lerMarkdown(texto), sha);
        });
      } else {
        setProcessos(listaProc);
        if (!processoAtivoId) {
          setProcessoAtivoId(listaProc[0].id);
        }
      }

      setCards(listaCards);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, [pronto, cfg, processoAtivoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const processoAtivo = processos.find((p) => p.id === processoAtivoId) || processos[0];
  const cardsDoProcesso = cards.filter((c) => c.processoId === (processoAtivo?.id || ""));

  const salvarProcessoAtivo = async (procAtualizado: Processo) => {
    setProcessos((prev) => prev.map((p) => (p.id === procAtualizado.id ? procAtualizado : p)));

    try {
      const texto = escreverMarkdown({
        dados: processoParaFrontmatter(procAtualizado),
        corpo: procAtualizado.corpo || `Processo de ${procAtualizado.titulo}`,
      });

      const sha = await gravar(cfg, procAtualizado.caminho, texto, procAtualizado.sha || undefined);
      atualizarCacheLocal(procAtualizado.caminho, texto, lerMarkdown(texto), sha);
      setProcessos((prev) => prev.map((p) => (p.id === procAtualizado.id ? { ...procAtualizado, sha } : p)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  };

  const criarProcessoEmBranco = async () => {
    if (!novoProcessoTitulo.trim()) return;

    const id = `proc_${Date.now()}`;
    const caminho = `processos/${id}.md`;
    const novoProc: Processo = {
      caminho,
      sha: "",
      bruto: {},
      id,
      titulo: novoProcessoTitulo.trim(),
      corpo: "",
      descricao: novoProcessoDescricao.trim(),
      etapas: [
        { id: "e1", nome: "Etapa 1", cor: "blue", checklistsPadrao: [] },
        { id: "e2", nome: "Etapa 2", cor: "amber", checklistsPadrao: [] },
        { id: "e3", nome: "Etapa 3", cor: "emerald", checklistsPadrao: [] },
      ],
      regras: [],
      atualizadoEm: new Date().toISOString(),
    };

    setProcessos((prev) => [...prev, novoProc]);
    setProcessoAtivoId(id);
    setNovoProcessoTitulo("");
    setNovoProcessoDescricao("");
    setModalNovoProcessoAberto(false);

    try {
      const texto = escreverMarkdown({
        dados: processoParaFrontmatter(novoProc),
        corpo: `Processo de ${novoProc.titulo}`,
      });

      const sha = await gravar(cfg, caminho, texto);
      atualizarCacheLocal(caminho, texto, lerMarkdown(texto), sha);
      setProcessos((prev) => prev.map((p) => (p.id === id ? { ...p, sha } : p)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  };

  const criarModeloProcessoPadrao = async (modeloIndex: number) => {
    const mod = MODELOS_PROCESSO_PADRAO[modeloIndex];
    if (!mod) return;

    const id = `proc_${Date.now()}`;
    const caminho = `processos/${id}.md`;
    const novoProc: Processo = {
      caminho,
      sha: "",
      bruto: {},
      id,
      titulo: mod.titulo,
      corpo: "",
      descricao: mod.descricao,
      etapas: mod.etapas,
      regras: mod.regras,
      atualizadoEm: new Date().toISOString(),
    };

    setProcessos((prev) => [...prev, novoProc]);
    setProcessoAtivoId(id);

    try {
      const texto = escreverMarkdown({
        dados: processoParaFrontmatter(novoProc),
        corpo: `Processo de ${mod.titulo}`,
      });

      const sha = await gravar(cfg, caminho, texto);
      atualizarCacheLocal(caminho, texto, lerMarkdown(texto), sha);
      setProcessos((prev) => prev.map((p) => (p.id === id ? { ...p, sha } : p)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  };

  const salvarCard = async (cardAtualizado: CardProcesso) => {
    setCards((prev) => prev.map((c) => (c.id === cardAtualizado.id ? cardAtualizado : c)));
    setCardEmEdicao((prev) => (prev && prev.id === cardAtualizado.id ? cardAtualizado : prev));

    try {
      const texto = escreverMarkdown({
        dados: cardProcessoParaFrontmatter(cardAtualizado),
        corpo: cardAtualizado.corpo,
      });

      const sha = await gravar(cfg, cardAtualizado.caminho, texto, cardAtualizado.sha || undefined);
      atualizarCacheLocal(cardAtualizado.caminho, texto, lerMarkdown(texto), sha);
      const cardComSha = { ...cardAtualizado, sha };
      setCards((prev) => prev.map((c) => (c.id === cardAtualizado.id ? cardComSha : c)));
      setCardEmEdicao((prev) => (prev && prev.id === cardAtualizado.id ? cardComSha : prev));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  };

  const criarNovoCard = async () => {
    if (!novoCardTitulo.trim() || !processoAtivo) return;

    const id = `card_${Date.now()}`;
    const caminho = `processos/cards/${id}.md`;

    const etapaObj =
      processoAtivo.etapas.find((e) => e.id === etapaNovoCard) || processoAtivo.etapas[0] || {
        id: "etapa_padrao",
        nome: "Etapa",
        cor: "blue",
        checklistsPadrao: [],
      };

    const checklistsIniciais: Record<string, boolean> = {};
    etapaObj.checklistsPadrao?.forEach((chk) => {
      checklistsIniciais[chk.id] = false;
    });

    const novoCard: CardProcesso = {
      caminho,
      sha: "",
      bruto: {},
      id,
      processoId: processoAtivo.id,
      etapaId: etapaObj.id,
      titulo: novoCardTitulo.trim(),
      cliente: novoCardCliente.trim() || undefined,
      valor: novoCardValor ? parseFloat(novoCardValor) : undefined,
      corpo: "",
      checklists: checklistsIniciais,
      comentarios: [
        {
          id: `com_${Date.now()}`,
          data: new Date().toISOString(),
          autor: "Klaus Bot",
          texto: `Cartão criado na etapa '${etapaObj.nome}'.`,
        },
      ],
      tags: [],
      urgente: false,
      atualizadoEm: new Date().toISOString(),
    };

    setCards((prev) => [...prev, novoCard]);
    setNovoCardTitulo("");
    setNovoCardCliente("");
    setNovoCardValor("");
    setModalNovoCardAberto(false);

    try {
      const texto = escreverMarkdown({
        dados: cardProcessoParaFrontmatter(novoCard),
        corpo: "",
      });

      const sha = await gravar(cfg, caminho, texto);
      atualizarCacheLocal(caminho, texto, lerMarkdown(texto), sha);
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, sha } : c)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  };

  const alternarChecklistCard = async (checklistId: string, atual: boolean) => {
    if (!cardEmEdicao || !processoAtivo) return;

    const res = executarRegrasAoChecklist(cardEmEdicao, processoAtivo, checklistId, !atual);
    setCardEmEdicao(res.cardAtualizado);
    await salvarCard(res.cardAtualizado);
  };

  const adicionarComentarioCard = async () => {
    if (!cardEmEdicao || !novoComentarioTexto.trim()) return;

    const novoComentario: ComentarioCard = {
      id: `com_${Date.now()}`,
      data: new Date().toISOString(),
      autor: "Hugo",
      texto: novoComentarioTexto.trim(),
    };

    const cardAtualizado = {
      ...cardEmEdicao,
      comentarios: [novoComentario, ...cardEmEdicao.comentarios],
    };

    setNovoComentarioTexto("");
    await salvarCard(cardAtualizado);
  };

  const apagarCardAtual = async () => {
    if (!cardEmEdicao) return;
    const cardParaApagar = cardEmEdicao;
    setCardEmEdicao(null);
    setCards((prev) => prev.filter((c) => c.id !== cardParaApagar.id));

    try {
      await apagar(cfg, cardParaApagar.caminho, cardParaApagar.sha);
      invalidarCache();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  };

  // Funções de Gestão de Etapas
  const adicionarEtapa = async () => {
    if (!novaEtapaNome.trim() || !processoAtivo) return;

    const novaEtapa: EtapaProcesso = {
      id: `etapa_${Date.now()}`,
      nome: novaEtapaNome.trim(),
      cor: novaEtapaCor,
      checklistsPadrao: [],
    };

    const procAtualizado = {
      ...processoAtivo,
      etapas: [...processoAtivo.etapas, novaEtapa],
    };

    setNovaEtapaNome("");
    await salvarProcessoAtivo(procAtualizado);
  };

  const removerEtapa = async (etapaId: string) => {
    if (!processoAtivo || processoAtivo.etapas.length <= 1) return;

    const procAtualizado = {
      ...processoAtivo,
      etapas: processoAtivo.etapas.filter((e) => e.id !== etapaId),
    };

    await salvarProcessoAtivo(procAtualizado);
  };

  const adicionarChecklistPadraoEtapa = async (etapaId: string) => {
    if (!novoChecklistTexto.trim() || !processoAtivo) return;

    const novoItem = {
      id: `chk_${Date.now()}`,
      texto: novoChecklistTexto.trim(),
    };

    const procAtualizado = {
      ...processoAtivo,
      etapas: processoAtivo.etapas.map((et) =>
        et.id === etapaId
          ? { ...et, checklistsPadrao: [...et.checklistsPadrao, novoItem] }
          : et
      ),
    };

    setNovoChecklistTexto("");
    await salvarProcessoAtivo(procAtualizado);
  };

  // Funções de Gestão de Regras de Automação
  const adicionarRegraAutomacao = async () => {
    if (!processoAtivo) return;

    const novaRegra: RegraAutomacao = {
      id: `regra_${Date.now()}`,
      gatilho: novaRegraGatilho,
      condicao: {
        checklistId: novaRegraGatilho === "ao_concluir_checklist" ? novaRegraChecklistId : undefined,
        etapaOrigemId: novaRegraGatilho === "ao_mudar_etapa" ? novaRegraEtapaOrigemId : undefined,
      },
      acao: novaRegraAcao,
      parametros: {
        etapaDestinoId: novaRegraAcao === "mudar_etapa" ? novaRegraEtapaDestinoId : undefined,
        mensagemComentario: novaRegraAcao === "adicionar_comentario" ? novaRegraComentario : undefined,
      },
    };

    const procAtualizado = {
      ...processoAtivo,
      regras: [...processoAtivo.regras, novaRegra],
    };

    await salvarProcessoAtivo(procAtualizado);
  };

  const removerRegraAutomacao = async (regraId: string) => {
    if (!processoAtivo) return;

    const procAtualizado = {
      ...processoAtivo,
      regras: processoAtivo.regras.filter((r) => r.id !== regraId),
    };

    await salvarProcessoAtivo(procAtualizado);
  };

  const aoArrastarInicio = (e: DragStartEvent) => {
    const cardEncontrado = cards.find((c) => c.caminho === e.active.id);
    if (cardEncontrado) setDragCardAtivo(cardEncontrado);
  };

  const aoArrastarFim = async (e: DragEndEvent) => {
    setDragCardAtivo(null);
    const { active, over } = e;
    if (!over || !processoAtivo) return;

    const cardId = active.id as string;
    const etapaDestinoId = over.id as string;

    const card = cards.find((c) => c.caminho === cardId);
    if (!card || card.etapaId === etapaDestinoId) return;

    const etapaExiste = processoAtivo.etapas.some((et) => et.id === etapaDestinoId);
    if (!etapaExiste) return;

    const res = executarRegrasAoMudarEtapa(card, processoAtivo, card.etapaId, etapaDestinoId);
    await salvarCard(res.cardAtualizado);
  };

  if (!pronto) {
    return (
      <Vazio
        titulo="Construtor de Processos do Klaus"
        descricao="Conecte seu GitHub nos Ajustes para criar e gerenciar seus funis de trabalho."
        acao={
          <Link to="/config">
            <Button>Ir para Ajustes</Button>
          </Link>
        }
      />
    );
  }

  if (carregando && processos.length === 0) {
    return <Carregando texto="Carregando seus processos e pipelines..." />;
  }

  return (
    <div className="flex-1 space-y-6 animate-in fade-in duration-300 w-full pb-10">
      {/* Topo do Construtor de Processos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GitMerge className="h-6 w-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Construtor de Processos & Pipelines
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie qualquer tipo de funil de trabalho, checklists por etapa e automações.
          </p>
        </div>

        {/* Seletor de Processo & Ações */}
        <div className="flex items-center gap-2 flex-wrap">
          {processos.length > 0 && (
            <div className="relative">
              <select
                value={processoAtivoId}
                onChange={(e) => setProcessoAtivoId(e.target.value)}
                className="appearance-none bg-accent/60 border border-border text-foreground font-bold text-xs rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {processos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          )}

          {processoAtivo && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setEtapaNovoCard(processoAtivo.etapas[0]?.id || "");
                  setModalNovoCardAberto(true);
                }}
                className="gap-1.5 text-xs font-semibold"
              >
                <Plus size={15} />
                <span>Novo Cartão</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalConfigProcessoAberto(true)}
                className="gap-1.5 text-xs font-medium"
                title="Configurar etapas e checklists deste processo"
              >
                <Settings2 size={14} />
                <span>Configurar</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalAutomacoesAberto(true)}
                className="gap-1.5 text-xs font-medium text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                title="Configurar automações e regras de transição"
              >
                <Zap size={14} />
                <span>Automações</span>
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setModalNovoProcessoAberto(true)}
            className="gap-1.5 text-xs font-medium"
          >
            <Plus size={14} />
            <span>Criar Processo</span>
          </Button>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{erro}</span>
        </div>
      )}

      {/* Quadro Kanban de Colunas */}
      {processoAtivo && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={aoArrastarInicio} onDragEnd={aoArrastarFim}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
            {processoAtivo.etapas.map((etapa) => {
              const cardsDaEtapa = cardsDoProcesso.filter((c) => c.etapaId === etapa.id);
              return (
                <ColunaEtapa
                  key={etapa.id}
                  etapa={etapa}
                  cards={cardsDaEtapa}
                  aoClicarCard={(c) => setCardEmEdicao(c)}
                  aoAdicionarCard={(eId) => {
                    setEtapaNovoCard(eId);
                    setModalNovoCardAberto(true);
                  }}
                />
              );
            })}
          </div>

          <DragOverlay>
            {dragCardAtivo && (
              <div className="p-3.5 rounded-xl border border-primary bg-card shadow-2xl opacity-90">
                <p className="font-bold text-xs text-foreground">{dragCardAtivo.titulo}</p>
                {dragCardAtivo.cliente && <p className="text-[10px] text-muted-foreground">{dragCardAtivo.cliente}</p>}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal de Criar Novo Cartão / Item */}
      {modalNovoCardAberto && processoAtivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setModalNovoCardAberto(false)}
        >
          <div
            className="flex w-full max-w-md flex-col border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-bold text-sm text-foreground">Novo Cartão no Funil</h3>
              <button onClick={() => setModalNovoCardAberto(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Título do Cartão *</label>
                <input
                  type="text"
                  value={novoCardTitulo}
                  onChange={(e) => setNovoCardTitulo(e.target.value)}
                  placeholder="Ex: Tarefa / Assunto / Cliente / Projeto"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Etapa Inicial</label>
                <select
                  value={etapaNovoCard}
                  onChange={(e) => setEtapaNovoCard(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {processoAtivo.etapas.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Cliente ou Pessoa (Opcional)</label>
                <input
                  type="text"
                  value={novoCardCliente}
                  onChange={(e) => setNovoCardCliente(e.target.value)}
                  placeholder="Ex: Nome da pessoa ou empresa"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Valor Estimado em R$ (Opcional)</label>
                <input
                  type="number"
                  value={novoCardValor}
                  onChange={(e) => setNovoCardValor(e.target.value)}
                  placeholder="Ex: 1500"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <Button onClick={criarNovoCard} className="w-full text-xs font-semibold py-5 rounded-xl mt-2">
                Criar Cartão
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Cartão */}
      {cardEmEdicao && processoAtivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setCardEmEdicao(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Cartão */}
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/20">
              <div className="space-y-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">
                    {processoAtivo.etapas.find((e) => e.id === cardEmEdicao.etapaId)?.nome || "Etapa"}
                  </Badge>
                  {cardEmEdicao.urgente && <Badge variant="destructive" className="text-[10px]">Urgente</Badge>}
                </div>
                <h2 className="font-bold text-base text-foreground truncate">{cardEmEdicao.titulo}</h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={apagarCardAtual}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Excluir este cartão"
                >
                  <Trash2 size={16} />
                </button>

                <button
                  onClick={() => setCardEmEdicao(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Conteúdo do Cartão */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
              {/* Informações Básicas */}
              <div className="grid grid-cols-2 gap-4">
                {cardEmEdicao.cliente && (
                  <div className="p-3 rounded-xl border border-border bg-card/50 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <User size={12} /> Cliente / Pessoa
                    </span>
                    <p className="text-xs font-bold text-foreground">{cardEmEdicao.cliente}</p>
                  </div>
                )}

                {cardEmEdicao.valor !== undefined && (
                  <div className="p-3 rounded-xl border border-border bg-card/50 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <DollarSign size={12} /> Valor
                    </span>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      R$ {cardEmEdicao.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              {/* Checklists por Etapa */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-primary" />
                  Checklists da Etapa
                </h3>

                <div className="space-y-2">
                  {processoAtivo.etapas
                    .find((e) => e.id === cardEmEdicao.etapaId)
                    ?.checklistsPadrao.map((chk) => {
                      const concluido = Boolean(cardEmEdicao.checklists[chk.id]);
                      return (
                        <label
                          key={chk.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={concluido}
                            onChange={() => alternarChecklistCard(chk.id, concluido)}
                            className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                          />
                          <span className={cn("text-xs font-medium", concluido && "line-through text-muted-foreground")}>
                            {chk.texto}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Seção de Comentários & Histórico */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-primary" />
                  Comentários & Histórico
                </h3>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novoComentarioTexto}
                    onChange={(e) => setNovoComentarioTexto(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && adicionarComentarioCard()}
                    placeholder="Adicionar nota ou comentário..."
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button size="sm" onClick={adicionarComentarioCard} className="text-xs font-semibold shrink-0">
                    Comentar
                  </Button>
                </div>

                <div className="space-y-2 pt-2">
                  {cardEmEdicao.comentarios.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl border border-border/80 bg-card/40 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-bold text-foreground">{c.autor}</span>
                        <span>{new Date(c.data).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{c.texto}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configurar Etapas do Processo */}
      {modalConfigProcessoAberto && processoAtivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setModalConfigProcessoAberto(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-xl flex-col border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Settings2 size={16} /> Configurar Etapas & Checklists
              </h3>
              <button onClick={() => setModalConfigProcessoAberto(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Nome e Descrição */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Nome do Processo</label>
                  <input
                    type="text"
                    value={processoAtivo.titulo}
                    onChange={(e) => salvarProcessoAtivo({ ...processoAtivo, titulo: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Lista de Etapas Existentes */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Etapas Atuais</h4>

                <div className="space-y-3">
                  {processoAtivo.etapas.map((etapa) => (
                    <div key={etapa.id} className="p-3 rounded-xl border border-border bg-card/50 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={etapa.nome}
                            onChange={(e) =>
                              salvarProcessoAtivo({
                                ...processoAtivo,
                                etapas: processoAtivo.etapas.map((et) => (et.id === etapa.id ? { ...et, nome: e.target.value } : et)),
                              })
                            }
                            className="font-bold text-xs bg-transparent border-b border-border focus:outline-none focus:border-primary px-1 py-0.5 flex-1"
                          />
                        </div>

                        {processoAtivo.etapas.length > 1 && (
                          <button
                            onClick={() => removerEtapa(etapa.id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            title="Excluir etapa"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Checklists Padrão da Etapa */}
                      <div className="pl-2 space-y-1 border-l-2 border-primary/20">
                        <span className="text-[10px] font-semibold text-muted-foreground">Checklists Padrão da Etapa:</span>
                        {etapa.checklistsPadrao.map((chk) => (
                          <div key={chk.id} className="text-xs text-foreground flex items-center justify-between">
                            <span>• {chk.texto}</span>
                          </div>
                        ))}

                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={etapaSelecionadaChecklist === etapa.id ? novoChecklistTexto : ""}
                            onChange={(e) => {
                              setEtapaSelecionadaChecklist(etapa.id);
                              setNovoChecklistTexto(e.target.value);
                            }}
                            placeholder="Adicionar item de checklist padrão..."
                            className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-[11px]"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => adicionarChecklistPadraoEtapa(etapa.id)}
                            className="text-[11px] h-7 px-2"
                          >
                            + Adicionar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adicionar Nova Etapa */}
              <div className="pt-3 border-t border-border space-y-2">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">+ Nova Etapa</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaEtapaNome}
                    onChange={(e) => setNovaEtapaNome(e.target.value)}
                    placeholder="Nome da nova coluna/etapa..."
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={novaEtapaCor}
                    onChange={(e) => setNovaEtapaCor(e.target.value as any)}
                    className="rounded-xl border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="blue">Azul</option>
                    <option value="purple">Roxo</option>
                    <option value="amber">Amarelo</option>
                    <option value="emerald">Verde</option>
                    <option value="indigo">Índigo</option>
                    <option value="rose">Rosa</option>
                    <option value="slate">Cinza</option>
                  </select>
                  <Button onClick={adicionarEtapa} size="sm" className="text-xs font-semibold">
                    Adicionar Coluna
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Automações do Processo */}
      {modalAutomacoesAberto && processoAtivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setModalAutomacoesAberto(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-xl flex-col border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4 bg-amber-500/10">
              <h3 className="font-bold text-sm text-amber-500 flex items-center gap-2">
                <Zap size={16} /> Automações do Processo
              </h3>
              <button onClick={() => setModalAutomacoesAberto(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Regras Ativas */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Regras Ativas</h4>

                {processoAtivo.regras.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhuma regra de automação configurada ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {processoAtivo.regras.map((regra) => (
                      <div key={regra.id} className="p-3 rounded-xl border border-border bg-card/60 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <span className="font-bold text-primary">SE</span>{" "}
                          <span>
                            {regra.gatilho === "ao_concluir_checklist" ? "concluir checklist" : "mover de etapa"}
                          </span>{" "}
                          <span className="font-bold text-emerald-500">ENTÃO</span>{" "}
                          <span>
                            {regra.acao === "mudar_etapa"
                              ? `mover para '${processoAtivo.etapas.find((e) => e.id === regra.parametros.etapaDestinoId)?.nome || regra.parametros.etapaDestinoId}'`
                              : regra.acao === "marcar_urgente"
                              ? "marcar como urgente"
                              : `comentar '${regra.parametros.mensagemComentario}'`}
                          </span>
                        </div>

                        <button
                          onClick={() => removerRegraAutomacao(regra.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Criar Nova Regra */}
              <div className="pt-3 border-t border-border space-y-3">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">+ Criar Nova Regra</h4>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Gatilho (Quando isso acontecer)</label>
                    <select
                      value={novaRegraGatilho}
                      onChange={(e) => setNovaRegraGatilho(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="ao_concluir_checklist">Ao Concluir um Checklist</option>
                      <option value="ao_mudar_etapa">Ao Mudar de Etapa</option>
                    </select>
                  </div>

                  {novaRegraGatilho === "ao_concluir_checklist" && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Qual Checklist?</label>
                      <select
                        value={novaRegraChecklistId}
                        onChange={(e) => setNovaRegraChecklistId(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Qualquer checklist da etapa</option>
                        {processoAtivo.etapas.flatMap((et) =>
                          et.checklistsPadrao.map((chk) => (
                            <option key={chk.id} value={chk.id}>
                              {et.nome} → {chk.texto}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}

                  {novaRegraGatilho === "ao_mudar_etapa" && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Qual Etapa de Origem?</label>
                      <select
                        value={novaRegraEtapaOrigemId}
                        onChange={(e) => setNovaRegraEtapaOrigemId(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Qualquer Etapa</option>
                        {processoAtivo.etapas.map((et) => (
                          <option key={et.id} value={et.id}>
                            {et.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Ação (Faça isso automaticamente)</label>
                    <select
                      value={novaRegraAcao}
                      onChange={(e) => setNovaRegraAcao(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="mudar_etapa">Mover Cartão para outra Etapa</option>
                      <option value="marcar_urgente">Marcar Cartão como Urgente</option>
                      <option value="adicionar_comentario">Adicionar Comentario / Nota Automática</option>
                    </select>
                  </div>

                  {novaRegraAcao === "mudar_etapa" && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Etapa de Destino</label>
                      <select
                        value={novaRegraEtapaDestinoId}
                        onChange={(e) => setNovaRegraEtapaDestinoId(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Selecione a Etapa...</option>
                        {processoAtivo.etapas.map((et) => (
                          <option key={et.id} value={et.id}>
                            {et.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {novaRegraAcao === "adicionar_comentario" && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Mensagem do Comentário</label>
                      <input
                        type="text"
                        value={novaRegraComentario}
                        onChange={(e) => setNovaRegraComentario(e.target.value)}
                        placeholder="Ex: Etapa iniciada automaticamente..."
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}

                  <Button onClick={adicionarRegraAutomacao} className="w-full text-xs font-semibold py-4 rounded-xl mt-2">
                    Salvar Automação
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Novo Processo em Branco */}
      {modalNovoProcessoAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setModalNovoProcessoAberto(false)}
        >
          <div
            className="flex w-full max-w-md flex-col border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-bold text-sm text-foreground">Criar Novo Processo</h3>
              <button onClick={() => setModalNovoProcessoAberto(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Nome do Processo / Funil *</label>
                <input
                  type="text"
                  value={novoProcessoTitulo}
                  onChange={(e) => setNovoProcessoTitulo(e.target.value)}
                  placeholder="Ex: Atendimento de Clientes / Projetos Pessoais"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Descrição (Opcional)</label>
                <input
                  type="text"
                  value={novoProcessoDescricao}
                  onChange={(e) => setNovoProcessoDescricao(e.target.value)}
                  placeholder="Ex: Acompanhamento de propostas e entregas"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="pt-2">
                <Button onClick={criarProcessoEmBranco} className="w-full text-xs font-semibold py-5 rounded-xl">
                  Criar Processo
                </Button>
              </div>

              <div className="pt-3 border-t border-border">
                <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-2">Ou escolha um modelo pronto:</span>
                <div className="space-y-2">
                  {MODELOS_PROCESSO_PADRAO.map((mod, idx) => (
                    <button
                      key={mod.titulo}
                      onClick={() => {
                        criarModeloProcessoPadrao(idx);
                        setModalNovoProcessoAberto(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl border border-border hover:bg-accent transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-foreground block">{mod.titulo}</span>
                        <span className="text-[10px] text-muted-foreground">{mod.descricao}</span>
                      </div>
                      <Sparkles size={14} className="text-amber-500 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
