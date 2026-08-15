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
  Layers,
  ChevronDown,
  GripVertical,
} from "lucide-react";

import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, daPasta, invalidarCache } from "@/lib/repo";
import { gravar, apagar } from "@/lib/github";
import { tituloProvavel, escreverMarkdown } from "@/lib/markdown";
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
import type { Processo, CardProcesso, EtapaProcesso, ComentarioCard } from "@/lib/tipos";

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

  const [novoCardTitulo, setNovoCardTitulo] = useState("");
  const [novoCardCliente, setNovoCardCliente] = useState("");
  const [novoCardValor, setNovoCardValor] = useState("");

  const [novoComentarioTexto, setNovoComentarioTexto] = useState("");
  const [dragCardAtivo, setDragCardAtivo] = useState<CardProcesso | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const carregar = useCallback(async () => {
    if (!pronto) return;
    setCarregando(true);
    setErro("");

    try {
      const todos = await carregarRepo(cfg);
      const arqProcessos = daPasta(todos, "processos").filter((i) => !i.caminho.startsWith("processos/cards/"));
      const arqCards = daPasta(todos, "processos/cards");

      const listaProc = arqProcessos.map((i) => comoProcesso(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome)));
      const listaCards = arqCards.map((i) => comoCardProcesso(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome)));

      setProcessos(listaProc);
      setCards(listaCards);

      if (listaProc.length > 0 && !processoAtivoId) {
        setProcessoAtivoId(listaProc[0].id);
      }
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

  const criarModeloProcessoPadrao = async (modeloIndex: number) => {
    const mod = MODELOS_PROCESSO_PADRAO[modeloIndex];
    if (!mod) return;

    setCarregando(true);
    try {
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

      const texto = escreverMarkdown({
        dados: processoParaFrontmatter(novoProc),
        corpo: `Processo de ${mod.titulo}`,
      });

      await gravar(cfg, caminho, texto);
      invalidarCache();
      setProcessoAtivoId(id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  };

  const salvarCard = async (cardAtualizado: CardProcesso) => {
    try {
      const texto = escreverMarkdown({
        dados: cardProcessoParaFrontmatter(cardAtualizado),
        corpo: cardAtualizado.corpo,
      });

      const sha = await gravar(cfg, cardAtualizado.caminho, texto, cardAtualizado.sha || undefined);
      invalidarCache();
      setCardEmEdicao((prev) => (prev && prev.id === cardAtualizado.id ? { ...cardAtualizado, sha } : prev));
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  };

  const criarNovoCard = async () => {
    if (!novoCardTitulo.trim() || !processoAtivo) return;

    try {
      const id = `card_${Date.now()}`;
      const caminho = `processos/cards/${id}.md`;

      // Preencher checklists padrão da etapa
      const etapaObj = processoAtivo.etapas.find((e) => e.id === etapaNovoCard) || processoAtivo.etapas[0];
      const checklistsIniciais: Record<string, boolean> = {};
      etapaObj?.checklistsPadrao.forEach((chk) => {
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
            texto: `Projeto criado na etapa '${etapaObj.nome}'.`,
          },
        ],
        tags: [],
        urgente: false,
        atualizadoEm: new Date().toISOString(),
      };

      const texto = escreverMarkdown({
        dados: cardProcessoParaFrontmatter(novoCard),
        corpo: "",
      });

      await gravar(cfg, caminho, texto);
      invalidarCache();

      setNovoCardTitulo("");
      setNovoCardCliente("");
      setNovoCardValor("");
      setModalNovoCardAberto(false);
      await carregar();
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

    setCardEmEdicao(cardAtualizado);
    setNovoComentarioTexto("");
    await salvarCard(cardAtualizado);
  };

  const apagarCardAtual = async () => {
    if (!cardEmEdicao) return;
    try {
      await apagar(cfg, cardEmEdicao.caminho, cardEmEdicao.sha);
      invalidarCache();
      setCardEmEdicao(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
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

    // Verificar se over.id é uma etapa do processo
    const etapaExiste = processoAtivo.etapas.some((et) => et.id === etapaDestinoId);
    if (!etapaExiste) return;

    const res = executarRegrasAoMudarEtapa(card, processoAtivo, card.etapaId, etapaDestinoId);
    setCards((prev) => prev.map((c) => (c.caminho === cardId ? res.cardAtualizado : c)));
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
            Gerencie projetos, checklists por etapa e automações flexíveis.
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
            <Button
              size="sm"
              onClick={() => {
                setEtapaNovoCard(processoAtivo.etapas[0]?.id || "");
                setModalNovoCardAberto(true);
              }}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus size={15} />
              <span>Novo Projeto</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => criarModeloProcessoPadrao(0)}
            className="gap-1.5 text-xs font-medium"
            title="Criar novo processo usando o modelo de Identidade Visual"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>+ Modelo Branding</span>
          </Button>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{erro}</span>
        </div>
      )}

      {/* Estado sem nenhum processo cadastrado */}
      {processos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-2xl bg-card/40 space-y-4">
          <div className="p-4 rounded-2xl bg-primary/10 text-primary">
            <Layers size={32} />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="font-bold text-lg text-foreground">Nenhum processo criado ainda</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Crie seu primeiro funil de trabalho a partir de nossos modelos prontos para Identidade Visual, Social Media ou Orçamentos.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            {MODELOS_PROCESSO_PADRAO.map((mod, idx) => (
              <Button key={mod.titulo} onClick={() => criarModeloProcessoPadrao(idx)} variant="outline" size="sm" className="gap-2 text-xs">
                <Sparkles size={14} className="text-amber-500" />
                <span>{mod.titulo}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : (
        /* Quadro Kanban de Colunas */
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={aoArrastarInicio} onDragEnd={aoArrastarFim}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start">
            {processoAtivo?.etapas.map((etapa) => {
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

      {/* Modal de Detalhes do Cartão / Projeto */}
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
                      <User size={12} /> Cliente
                    </span>
                    <p className="text-xs font-bold text-foreground">{cardEmEdicao.cliente}</p>
                  </div>
                )}

                {cardEmEdicao.valor !== undefined && (
                  <div className="p-3 rounded-xl border border-border bg-card/50 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <DollarSign size={12} /> Valor do Projeto
                    </span>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      R$ {cardEmEdicao.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              {/* Checklists por Etapa */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-primary" />
                    Checklists da Etapa
                  </h3>
                </div>

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
                    placeholder="Adicionar nota ou comentário sobre o projeto..."
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

      {/* Modal de Criar Novo Cartão / Projeto */}
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
              <h3 className="font-bold text-sm text-foreground">Novo Cartão de Projeto</h3>
              <button onClick={() => setModalNovoCardAberto(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Título do Projeto *</label>
                <input
                  type="text"
                  value={novoCardTitulo}
                  onChange={(e) => setNovoCardTitulo(e.target.value)}
                  placeholder="Ex: Redesign de Logo Acme Corp"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Nome do Cliente</label>
                <input
                  type="text"
                  value={novoCardCliente}
                  onChange={(e) => setNovoCardCliente(e.target.value)}
                  placeholder="Ex: Fulano de Tal"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Valor Estimado (R$)</label>
                <input
                  type="number"
                  value={novoCardValor}
                  onChange={(e) => setNovoCardValor(e.target.value)}
                  placeholder="Ex: 2500"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <Button onClick={criarNovoCard} className="w-full text-xs font-semibold py-5 rounded-xl mt-2">
                Criar Cartão no Funil
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
