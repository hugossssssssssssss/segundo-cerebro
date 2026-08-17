import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Sparkles,
  AlertTriangle,
  ChevronDown,
  GripVertical,
  Settings2,
  Zap,
  Search,
  Check,
  LayoutGrid,
  List,
  ArrowRight,
} from "lucide-react";

import { lerConfig, configCompleta, nomeExibido } from "@/lib/settings";
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
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carregando, Vazio } from "@/components/ui";
import { cn } from "@/lib/utils";

const CORES_ETAPAS = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500", text: "text-blue-500", header: "bg-blue-500" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500", text: "text-purple-500", header: "bg-purple-500" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500", text: "text-amber-500", header: "bg-amber-500" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500", text: "text-emerald-500", header: "bg-emerald-500" },
  indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500", text: "text-indigo-500", header: "bg-indigo-500" },
  rose: { bg: "bg-rose-500/10", border: "border-rose-500", text: "text-rose-500", header: "bg-rose-500" },
  slate: { bg: "bg-slate-500/10", border: "border-slate-500", text: "text-slate-500", header: "bg-slate-500" },
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
  const pctChecklist = totalChecklists > 0 ? Math.round((concluidosChecklists / totalChecklists) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => aoClicar(card)}
      className="group relative flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5 shadow-xs hover:border-primary/50 hover:shadow-md transition-all cursor-pointer select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
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

      {/* Barra de Progresso do Checklist */}
      {totalChecklists > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <CheckSquare size={11} className={pctChecklist === 100 ? "text-emerald-500" : "text-amber-500"} />
              Checklist ({concluidosChecklists}/{totalChecklists})
            </span>
            <span className="font-bold">{pctChecklist}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full transition-all duration-300", pctChecklist === 100 ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${pctChecklist}%` }}
            />
          </div>
        </div>
      )}

      {/* Badges de Urgência e Comentários */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
        <div>
          {card.urgente && (
            <Badge variant="destructive" className="text-[9px] py-0 px-1.5 font-bold">
              ⚡ Urgente
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 font-medium">
          {card.comentarios.length > 0 && (
            <span className="flex items-center gap-1">
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

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card/60 p-3.5 h-full min-h-[520px] transition-all border-t-4",
        estiloCor.border,
        isOver && "border-primary bg-primary/5 shadow-lg"
      )}
    >
      {/* Cabeçalho da Coluna CRM */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-bold text-xs uppercase tracking-wider text-foreground truncate">{etapa.nome}</h3>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold shrink-0">
            {cards.length}
          </Badge>
        </div>

        <button
          onClick={() => aoAdicionarCard(etapa.id)}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Adicionar novo Card nesta etapa"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Lista de Cards da Etapa */}
      <SortableContext items={cards.map((c) => c.caminho)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto min-h-[120px]">
          {cards.map((card) => (
            <CartaoSortable key={card.caminho} card={card} aoClicar={aoClicarCard} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function Processos() {
  const cfg = useMemo(() => lerConfig(), []);
  const pronto = configCompleta(cfg);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [cards, setCards] = useState<CardProcesso[]>([]);
  const [processoAtivoId, setProcessoAtivoId] = useState<string>("");

  // Alternador de Visão (Kanban vs Tabela)
  const [modoVisao, setModoVisao] = useState<"kanban" | "tabela">("kanban");

  const [cardEmEdicao, setCardEmEdicao] = useState<CardProcesso | null>(null);
  const [modalNovoCardAberto, setModalNovoCardAberto] = useState(false);
  const [etapaNovoCard, setEtapaNovoCard] = useState<string>("");

  const [modalConfigProcessoAberto, setModalConfigProcessoAberto] = useState(false);
  const [modalAutomacoesAberto, setModalAutomacoesAberto] = useState(false);
  const [modalNovoProcessoAberto, setModalNovoProcessoAberto] = useState(false);

  // Modal de Exclusão com Motivo
  const [cardParaExcluir, setCardParaExcluir] = useState<CardProcesso | null>(null);
  const [motivoExclusao, setMotivoExclusao] = useState<string>("Concluído com Sucesso");

  // Pesquisa
  const [pesquisaCard, setPesquisaCard] = useState("");

  // Formulários
  const [novoCardTitulo, setNovoCardTitulo] = useState("");
  const [novoProcessoTitulo, setNovoProcessoTitulo] = useState("");
  const [novoProcessoDescricao, setNovoProcessoDescricao] = useState("");

  const [novaEtapaNome, setNovaEtapaNome] = useState("");
  const [novaEtapaCor, setNovaEtapaCor] = useState<EtapaProcesso["cor"]>("blue");
  const [novoChecklistTexto, setNovoChecklistTexto] = useState("");
  const [etapaSelecionadaChecklist, setEtapaSelecionadaChecklist] = useState<string>("");

  // Regras de automação
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

        const texto = escreverMarkdown({
          dados: processoParaFrontmatter(novoProc),
          corpo: `Processo de ${mod.titulo}`,
        });

        const sha = await gravar(cfg, caminho, texto, undefined, `Criar processo inicial: ${mod.titulo}`);
        const doc = lerMarkdown(texto);
        atualizarCacheLocal(caminho, texto, doc, sha);
        invalidarCache();
        const novoProcComSha = { ...novoProc, sha };
        listaProc = [novoProcComSha];
        setProcessos([novoProcComSha]);
        setProcessoAtivoId(id);
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
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch, processoAtivoId]);

  useEffect(() => {
    carregar();
    const aoAtualizar = () => carregar();
    window.addEventListener("acervo-atualizado", aoAtualizar);
    return () => window.removeEventListener("acervo-atualizado", aoAtualizar);
  }, [carregar]);

  const processoAtivo = processos.find((p) => p.id === processoAtivoId) || processos[0];

  const cardsFiltrados = cards
    .filter((c) => c.processoId === (processoAtivo?.id || ""))
    .filter((c) => {
      if (!pesquisaCard) return true;
      const q = pesquisaCard.toLowerCase();
      return c.titulo.toLowerCase().includes(q) || c.corpo?.toLowerCase().includes(q);
    });

  const timerDebounceCardRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const timerDebounceProcRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const salvarProcessoAtivo = async (procAtualizado: Processo, debounced = false) => {
    setProcessos((prev) => prev.map((p) => (p.id === procAtualizado.id ? procAtualizado : p)));

    if (debounced) {
      if (timerDebounceProcRef.current[procAtualizado.id]) {
        clearTimeout(timerDebounceProcRef.current[procAtualizado.id]);
      }
      timerDebounceProcRef.current[procAtualizado.id] = setTimeout(async () => {
        try {
          const texto = escreverMarkdown({
            dados: processoParaFrontmatter(procAtualizado),
            corpo: procAtualizado.corpo || `Processo de ${procAtualizado.titulo}`,
          });

          const sha = await gravar(cfg, procAtualizado.caminho, texto, procAtualizado.sha || undefined);
          atualizarCacheLocal(procAtualizado.caminho, texto, lerMarkdown(texto), sha);
          setProcessos((prev) => prev.map((p) => (p.id === procAtualizado.id ? { ...procAtualizado, sha } : p)));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setErro(msg);
          toast(`Erro ao salvar processo no GitHub: ${msg}`, { tipo: "erro" });
        }
      }, 2500);
      return;
    }

    try {
      const texto = escreverMarkdown({
        dados: processoParaFrontmatter(procAtualizado),
        corpo: procAtualizado.corpo || `Processo de ${procAtualizado.titulo}`,
      });

      const sha = await gravar(cfg, procAtualizado.caminho, texto, procAtualizado.sha || undefined);
      atualizarCacheLocal(procAtualizado.caminho, texto, lerMarkdown(texto), sha);
      setProcessos((prev) => prev.map((p) => (p.id === procAtualizado.id ? { ...procAtualizado, sha } : p)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErro(msg);
      toast(`Erro ao salvar processo no GitHub: ${msg}`, { tipo: "erro" });
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
        { id: "e1", nome: "A Fazer", cor: "blue", checklistsPadrao: [] },
        { id: "e2", nome: "Em Andamento", cor: "amber", checklistsPadrao: [] },
        { id: "e3", nome: "Concluído", cor: "emerald", checklistsPadrao: [] },
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
      setProcessos((prev) => prev.filter((p) => p.id !== id));
      const msg = e instanceof Error ? e.message : String(e);
      setErro(msg);
      toast(`Erro ao criar processo no GitHub: ${msg}`, { tipo: "erro" });
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
      setProcessos((prev) => prev.filter((p) => p.id !== id));
      const msg = e instanceof Error ? e.message : String(e);
      setErro(msg);
      toast(`Erro ao criar modelo de processo no GitHub: ${msg}`, { tipo: "erro" });
    }
  };

  const salvarCard = async (cardAtualizado: CardProcesso, debounced = false) => {
    setCards((prev) => prev.map((c) => (c.id === cardAtualizado.id ? cardAtualizado : c)));
    setCardEmEdicao((prev) => (prev && prev.id === cardAtualizado.id ? cardAtualizado : prev));

    if (debounced) {
      if (timerDebounceCardRef.current[cardAtualizado.id]) {
        clearTimeout(timerDebounceCardRef.current[cardAtualizado.id]);
      }
      timerDebounceCardRef.current[cardAtualizado.id] = setTimeout(async () => {
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
      }, 2500);
      return;
    }

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
      corpo: "",
      checklists: checklistsIniciais,
      comentarios: [
        {
          id: `com_${Date.now()}`,
          data: new Date().toISOString(),
          autor: "Klaus Bot",
          texto: `Card criado na etapa '${etapaObj.nome}'.`,
        },
      ],
      tags: [],
      urgente: false,
      atualizadoEm: new Date().toISOString(),
    };

    setCards((prev) => [...prev, novoCard]);
    setNovoCardTitulo("");
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
      setCards((prev) => prev.filter((c) => c.id !== id));
      const msg = e instanceof Error ? e.message : String(e);
      setErro(msg);
      toast(`Erro ao criar card no GitHub: ${msg}`, { tipo: "erro" });
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
      // Vai gravado no arquivo, então tem de ser quem realmente escreveu —
      // num repositório compartilhado o comentário é assinado para valer.
      autor: nomeExibido(lerConfig()),
      texto: novoComentarioTexto.trim(),
    };

    const cardAtualizado = {
      ...cardEmEdicao,
      comentarios: [novoComentario, ...cardEmEdicao.comentarios],
    };

    setNovoComentarioTexto("");
    await salvarCard(cardAtualizado);
  };

  const confirmarExclusaoCard = async () => {
    if (!cardParaExcluir) return;
    const cardAlvo = cardParaExcluir;
    setCardParaExcluir(null);

    try {
      await apagar(cfg, cardAlvo.caminho, cardAlvo.sha);
      setCardEmEdicao(null);
      setCards((prev) => prev.filter((c) => c.id !== cardAlvo.id));
      invalidarCache();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErro(msg);
      toast(`Erro ao excluir card no GitHub: ${msg}`, { tipo: "erro" });
    }
  };

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
        descricao="Conecte seu GitHub nos Ajustes para gerenciar seus fluxos de trabalho."
        acao={
          <Link to="/config">
            <Button>Ir para Ajustes</Button>
          </Link>
        }
      />
    );
  }

  if (carregando && processos.length === 0) {
    return <Carregando texto="Carregando suíte de processos..." />;
  }

  return (
    <div className="flex-1 space-y-6 animate-in fade-in duration-300 w-full pb-10">
      {/* Topo no Estilo CRM Profissional (Pipefy / HubSpot Layout) */}
      <div className="flex flex-col gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GitMerge className="h-6 w-6 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Pipeline de Processos & Tarefas
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Gerenciador visual de etapas, transições e automações.
            </p>
          </div>

          {/* Seletor de Pipeline + Alternador de Visão + Ações */}
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

            {/* Alternador de Visão (Kanban vs Tabela) */}
            <div className="flex items-center rounded-xl border border-border bg-muted/40 p-0.5">
              <button
                onClick={() => setModoVisao("kanban")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  modoVisao === "kanban" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
                title="Visão Quadro Kanban"
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Quadro</span>
              </button>

              <button
                onClick={() => setModoVisao("tabela")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  modoVisao === "tabela" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
                title="Visão Tabela de Dados CRM"
              >
                <List size={14} />
                <span className="hidden sm:inline">Tabela</span>
              </button>
            </div>

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
                  <span>Novo Card</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalConfigProcessoAberto(true)}
                  className="gap-1.5 text-xs font-medium"
                  title="Configurar etapas e colunas deste pipeline"
                >
                  <Settings2 size={14} />
                  <span>Estrutura</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalAutomacoesAberto(true)}
                  className="gap-1.5 text-xs font-medium text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                  title="Configurar regras de automação"
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
              <span>Novo Funil</span>
            </Button>
          </div>
        </div>

        {/* Pesquisa & Contador */}
        {processoAtivo && (
          <div className="pt-3 border-t border-border flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={pesquisaCard}
                onChange={(e) => setPesquisaCard(e.target.value)}
                placeholder="Pesquisar Cards no pipeline..."
                className="w-full rounded-xl border border-border bg-background px-3 py-1.5 pl-9 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <span className="text-xs text-muted-foreground font-medium">
              Total: <strong className="text-foreground">{cardsFiltrados.length}</strong> {cardsFiltrados.length === 1 ? "Card" : "Cards"}
            </span>
          </div>
        )}
      </div>

      {erro && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{erro}</span>
        </div>
      )}

      {/* MODALIDADE 1: VISÃO QUADRO KANBAN */}
      {modoVisao === "kanban" && processoAtivo && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={aoArrastarInicio} onDragEnd={aoArrastarFim}>
          <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start overflow-x-auto pb-4">
            {processoAtivo.etapas.map((etapa) => {
              const cardsDaEtapa = cardsFiltrados.filter((c) => c.etapaId === etapa.id);
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
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* MODALIDADE 2: VISÃO TABELA CRM COMPACTA */}
      {modoVisao === "tabela" && processoAtivo && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Título do Card</th>
                  <th className="py-3 px-4">Etapa Atual</th>
                  <th className="py-3 px-4">Checklist</th>
                  <th className="py-3 px-4">Status / Prioridade</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cardsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
                      Nenhum Card encontrado neste processo.
                    </td>
                  </tr>
                ) : (
                  cardsFiltrados.map((card) => {
                    const etapaObj = processoAtivo.etapas.find((e) => e.id === card.etapaId);
                    const totalChk = Object.keys(card.checklists).length;
                    const concluidosChk = Object.values(card.checklists).filter(Boolean).length;

                    return (
                      <tr
                        key={card.caminho}
                        onClick={() => setCardEmEdicao(card)}
                        className="hover:bg-accent/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-foreground">{card.titulo}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {etapaObj?.nome || "Etapa"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {totalChk > 0 ? `${concluidosChk}/${totalChk}` : "-"}
                        </td>
                        <td className="py-3 px-4">
                          {card.urgente ? (
                            <Badge variant="destructive" className="text-[9px]">⚡ Urgente</Badge>
                          ) : (
                            <span className="text-muted-foreground font-medium">Normal</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button size="sm" variant="ghost" className="h-7 text-xs">
                            Abrir ➔
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAINEL / MODAL DE DETALHES DO CARD (ESTILO DEAL VIEW DO HUBSPOT/PIPEFY COM STEPPER HORIZONTAL) */}
      {cardEmEdicao && processoAtivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setCardEmEdicao(null)}
        >
          <div
            className="flex max-h-[90dvh] w-full max-w-3xl flex-col border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Card com Botão de Fechar */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3 bg-muted/20">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Detalhes do Card
              </span>
              <button
                onClick={() => setCardEmEdicao(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* STEPPER HORIZONTAL DE PROGRESSO DE ETAPAS (ESTILO HUBSPOT / PIPEFY) */}
            <div className="px-5 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {processoAtivo.etapas.map((et, idx) => {
                  const ehAtivo = et.id === cardEmEdicao.etapaId;
                  return (
                    <div key={et.id} className="flex items-center shrink-0">
                      <button
                        onClick={() => {
                          const res = executarRegrasAoMudarEtapa(cardEmEdicao, processoAtivo, cardEmEdicao.etapaId, et.id);
                          salvarCard(res.cardAtualizado);
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                          ehAtivo
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/40 text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {ehAtivo && <Check size={12} />}
                        <span>{idx + 1}. {et.nome}</span>
                      </button>
                      {idx < processoAtivo.etapas.length - 1 && (
                        <ArrowRight size={12} className="text-muted-foreground/40 mx-1 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Conteúdo em 2 Colunas (Estilo Deal Detail View) */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Coluna Principal (2/3 - Conteúdo, Checklists e Comentários) */}
              <div className="md:col-span-2 p-6 space-y-6">
                {/* Título Editável */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Título do Card
                  </label>
                  <input
                    type="text"
                    value={cardEmEdicao.titulo}
                    onChange={(e) => salvarCard({ ...cardEmEdicao, titulo: e.target.value }, true)}
                    className="w-full text-base sm:text-lg font-bold text-foreground bg-background border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Título do Card..."
                  />
                </div>

                {/* Descrição / Notas do Card */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Descrição & Anotações
                  </label>
                  <textarea
                    value={cardEmEdicao.corpo}
                    onChange={(e) => salvarCard({ ...cardEmEdicao, corpo: e.target.value }, true)}
                    placeholder="Adicione detalhes, rascunhos ou anotações desta tarefa..."
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed resize-y"
                  />
                </div>

                {/* Checklists Interativos com Barra de Progresso */}
                <div className="space-y-3">
                  {(() => {
                    const totalChk = Object.keys(cardEmEdicao.checklists).length;
                    const concluidosChk = Object.values(cardEmEdicao.checklists).filter(Boolean).length;
                    const pctChk = totalChk > 0 ? Math.round((concluidosChk / totalChk) * 100) : 0;

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <CheckSquare size={14} className="text-primary" />
                            Checklists da Etapa ({concluidosChk}/{totalChk})
                          </h3>
                          <span className="text-xs font-bold text-muted-foreground">{pctChk}%</span>
                        </div>

                        {totalChk > 0 && (
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full transition-all duration-300", pctChk === 100 ? "bg-emerald-500" : "bg-primary")}
                              style={{ width: `${pctChk}%` }}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="space-y-2 pt-1">
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

                {/* Comentários & Histórico */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-primary" />
                    Histórico & Comentários
                  </h3>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novoComentarioTexto}
                      onChange={(e) => setNovoComentarioTexto(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && adicionarComentarioCard()}
                      placeholder="Adicionar nota..."
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button size="sm" onClick={adicionarComentarioCard} className="text-xs font-semibold shrink-0">
                      Enviar
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

              {/* Coluna Lateral de Atributos (1/3) */}
              <div className="p-6 bg-muted/10 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Atributos do Card</h3>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground block">Prioridade</label>
                    <button
                      onClick={() => salvarCard({ ...cardEmEdicao, urgente: !cardEmEdicao.urgente })}
                      className={cn(
                        "w-full text-xs py-2 px-3 rounded-xl font-bold border transition-colors flex items-center justify-center gap-2",
                        cardEmEdicao.urgente
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                          : "bg-background text-muted-foreground border-border hover:text-foreground"
                      )}
                    >
                      {cardEmEdicao.urgente ? "⚡ Urgente Marcado" : "Marcar como Urgente"}
                    </button>
                  </div>

                  {/* Campos CRM & Negócios */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <h4 className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">Dados do Negócio</h4>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold block mb-1">Cliente / Prospect</label>
                      <input
                        type="text"
                        value={cardEmEdicao.cliente || ""}
                        onChange={(e) => salvarCard({ ...cardEmEdicao, cliente: e.target.value })}
                        placeholder="Nome do cliente..."
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold block mb-1">Empresa</label>
                      <input
                        type="text"
                        value={cardEmEdicao.empresa || ""}
                        onChange={(e) => salvarCard({ ...cardEmEdicao, empresa: e.target.value })}
                        placeholder="Nome da empresa..."
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold block mb-1">Telefone</label>
                        <input
                          type="text"
                          value={cardEmEdicao.telefone || ""}
                          onChange={(e) => salvarCard({ ...cardEmEdicao, telefone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold block mb-1">Valor (R$)</label>
                        <input
                          type="number"
                          value={cardEmEdicao.valor || ""}
                          onChange={(e) => salvarCard({ ...cardEmEdicao, valor: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="0,00"
                          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold block mb-1">E-mail</label>
                      <input
                        type="email"
                        value={cardEmEdicao.email || ""}
                        onChange={(e) => salvarCard({ ...cardEmEdicao, email: e.target.value })}
                        placeholder="contato@cliente.com"
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCardParaExcluir(cardEmEdicao)}
                    className="w-full text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>Excluir / Arquivar Card</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão / Arquivamento com Motivo */}
      {cardParaExcluir && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setCardParaExcluir(null)}
        >
          <div
            className="flex w-full max-w-md flex-col border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4 bg-destructive/10">
              <h3 className="font-bold text-sm text-destructive flex items-center gap-2">
                <Trash2 size={16} /> Confirmar Exclusão de Card
              </h3>
              <button onClick={() => setCardParaExcluir(null)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">
                Você está prestes a excluir o Card <strong className="text-foreground">{cardParaExcluir.titulo}</strong>. Selecione a razão da finalização:
              </p>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Motivo</label>
                <select
                  value={motivoExclusao}
                  onChange={(e) => setMotivoExclusao(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Concluído com Sucesso">Concluído com Sucesso</option>
                  <option value="Cancelado / Desistido">Cancelado / Desistido</option>
                  <option value="Fora de escopo / Duplicado">Fora de escopo / Duplicado</option>
                  <option value="Outro motivo">Outro motivo</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setCardParaExcluir(null)} className="text-xs">
                  Cancelar
                </Button>
                <Button variant="destructive" size="sm" onClick={confirmarExclusaoCard} className="text-xs font-semibold">
                  Confirmar Exclusão
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Novo Card */}
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
              <h3 className="font-bold text-sm text-foreground">Novo Card no Processo</h3>
              <button onClick={() => setModalNovoCardAberto(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Título do Card *</label>
                <input
                  type="text"
                  value={novoCardTitulo}
                  onChange={(e) => setNovoCardTitulo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && criarNovoCard()}
                  placeholder="Digite o título do Card..."
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

              <Button onClick={criarNovoCard} className="w-full text-xs font-semibold py-5 rounded-xl mt-2">
                Criar Card
              </Button>
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
            className="flex max-h-[90dvh] w-full max-w-xl flex-col border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Settings2 size={16} /> Configurar Etapas do Processo
              </h3>
              <button onClick={() => setModalConfigProcessoAberto(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Nome do Processo</label>
                <input
                  type="text"
                  value={processoAtivo.titulo}
                  onChange={(e) => salvarProcessoAtivo({ ...processoAtivo, titulo: e.target.value }, true)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Etapas Atuais</h4>

                <div className="space-y-3">
                  {processoAtivo.etapas.map((etapa) => (
                    <div key={etapa.id} className="p-3 rounded-xl border border-border bg-card/50 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={etapa.nome}
                          onChange={(e) =>
                            salvarProcessoAtivo(
                              {
                                ...processoAtivo,
                                etapas: processoAtivo.etapas.map((et) => (et.id === etapa.id ? { ...et, nome: e.target.value } : et)),
                              },
                              true
                            )
                          }
                          className="font-bold text-xs bg-transparent border-b border-border focus:outline-none focus:border-primary px-1 py-0.5 flex-1"
                        />

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
                            placeholder="Adicionar checklist padrão..."
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

              <div className="pt-3 border-t border-border space-y-2">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">+ Nova Etapa</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaEtapaNome}
                    onChange={(e) => setNovaEtapaNome(e.target.value)}
                    placeholder="Nome da coluna/etapa..."
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

      {/* Modal de Automações */}
      {modalAutomacoesAberto && processoAtivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setModalAutomacoesAberto(false)}
        >
          <div
            className="flex max-h-[90dvh] w-full max-w-xl flex-col border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
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
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Regras Ativas</h4>

                {processoAtivo.regras.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhuma regra configurada ainda.</p>
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
                              ? `mover Card para '${processoAtivo.etapas.find((e) => e.id === regra.parametros.etapaDestinoId)?.nome || regra.parametros.etapaDestinoId}'`
                              : regra.acao === "marcar_urgente"
                              ? "marcar Card como urgente"
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

              <div className="pt-3 border-t border-border space-y-3">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">+ Criar Regra de Automação</h4>

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
                      <option value="mudar_etapa">Mover Card para outra Etapa</option>
                      <option value="marcar_urgente">Marcar Card como Urgente</option>
                      <option value="adicionar_comentario">Adicionar Comentário Automático</option>
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
                        placeholder="Ex: Card movido automaticamente..."
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
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Nome do Processo *</label>
                <input
                  type="text"
                  value={novoProcessoTitulo}
                  onChange={(e) => setNovoProcessoTitulo(e.target.value)}
                  placeholder="Ex: Tarefas da Casa / Estudos / Projetos"
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
                  placeholder="Ex: Acompanhamento das etapas do meu fluxo"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="pt-2">
                <Button onClick={criarProcessoEmBranco} className="w-full text-xs font-semibold py-5 rounded-xl">
                  Criar Processo em Branco
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
