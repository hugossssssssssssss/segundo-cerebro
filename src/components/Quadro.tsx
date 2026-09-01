import { useState, useMemo, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
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
  Timer,
  GripVertical,
  Pause,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronsRight,
  Folder,
  Sparkles,
  CheckCircle2,
  Circle,
  Plus,
} from "lucide-react";
import {
  urgencia,
  textoPrazo,
  minutosRegistrados,
  progressoSubtarefas,
  ROTULO_STATUS,
  STATUS,
  type Tarefa,
  type Status,
} from "@/lib/tarefas";
import { Cartao, Selo, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { PrismasFoco } from "@/components/PrismasFoco";
import { MenuAcoesTarefa } from "@/components/MenuAcoesTarefa";

/**
 * Quadro de tarefas em colunas — a fazer, fazendo, feito.
 *
 * O que a lista não mostrava: onde o trabalho está EMPILHADO. Ver oito itens
 * parados em "Fazendo" é a informação que faz você parar de começar coisa
 * nova, e ela não aparece numa lista ordenada por prazo.
 *
 * Arrastar entre colunas é o mesmo que trocar o status — ou seja, grava uma
 * linha no frontmatter do `.md`. Não existe ordem manual dentro da coluna de
 * propósito: guardá-la exigiria um campo de posição em cada arquivo, que
 * divergiria no dia em que você editasse um item direto pelo GitHub.
 *
 * Acessibilidade vem do @dnd-kit: dá para mover com o teclado (Tab até o
 * cartão, Espaço para pegar, setas para mover, Espaço para soltar), e é por
 * isso que ele foi escolhido no lugar do `react-beautiful-dnd`, abandonado.
 */

const CORES_URGENCIA = {
  atrasada: "perigo",
  hoje: "aviso",
  proxima: "primario",
  tranquila: "neutro",
  nenhuma: "neutro",
} as const;

/** Cor da faixa no topo de cada coluna, para diferenciar de relance. */
const COR_COLUNA: Record<Status, string> = {
  "a-fazer": "bg-muted-foreground/30",
  fazendo: "bg-[var(--primary)]",
  feito: "bg-[var(--success)]",
};

const LIMITE_PADRAO_COLUNA = 8;

function ConteudoDoCartao({ t }: { t: Tarefa }) {
  const u = urgencia(t);
  const min = minutosRegistrados(t.corpo);
  const passos = progressoSubtarefas(t.corpo);
  const focosConcluidos = Math.floor(min / 25);

  const pedacosCaminho = t.caminho ? t.caminho.split("/").slice(1, -1) : [];
  const subpasta = pedacosCaminho.length > 0 ? pedacosCaminho.join(" › ") : null;

  return (
    <>
      <p
        className={cn(
          "font-medium leading-snug",
          t.status === "feito" && "text-muted-foreground line-through",
        )}
      >
        {t.titulo}
      </p>

      {/* Prismas de Foco do Hugo (5 slots fixos) */}
      <PrismasFoco
        estimativa={t.Pomodoro || 0}
        concluido={focosConcluidos}
        fraturados={t.fraturados || 0}
        className="mt-1.5"
        tamanho={13}
      />

      {(u !== "nenhuma" || min > 0 || passos.total > 0 || t.tags.length > 0 || subpasta || Boolean(t.bruto?.ia_sugeriu)) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {Boolean(t.bruto?.ia_sugeriu) && (
            <Selo tom="aviso" className="flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
              <Sparkles size={10} /> IA
            </Selo>
          )}
          {subpasta && (
            <Selo className="opacity-75 flex items-center gap-1 text-[10px]">
              <Folder size={10} />
              <span>{subpasta}</span>
            </Selo>
          )}
          {u !== "nenhuma" && <Selo tom={CORES_URGENCIA[u]}>{textoPrazo(t)}</Selo>}
          {min > 0 && (
            <Selo className="flex items-center gap-1">
              <Timer size={10} className="opacity-70" />
              <span>{min}min</span>
            </Selo>
          )}
          {passos.total > 0 && (
            <Selo tom={passos.porcento === 100 ? "sucesso" : "neutro"}>
              {passos.feitas}/{passos.total} passos
            </Selo>
          )}
          {t.tags.map((tag) => (
            <Selo key={tag}>#{tag}</Selo>
          ))}
        </div>
      )}
    </>
  );
}

import { useCronometro } from "@/components/ContextoCronometro";

function CartaoArrastavel({
  t,
  aoAbrir,
  aoCronometrar,
  aoAlternarStatus,
  aoAdiarPrazo,
  aoDuplicar,
  aoRegistrarEntregaPDI,
  aoExcluir,
  gravando,
}: {
  t: Tarefa;
  aoAbrir: (t: Tarefa) => void;
  aoCronometrar: (t: Tarefa) => void;
  aoAlternarStatus?: (t: Tarefa) => void;
  aoAdiarPrazo?: (t: Tarefa, dias: number) => void;
  aoDuplicar?: (t: Tarefa) => void;
  aoRegistrarEntregaPDI?: (t: Tarefa) => void;
  aoExcluir?: (t: Tarefa) => void;
  gravando: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: t.caminho });

  const { tarefa: tarefaAtiva, rodando, pausar, retomar } = useCronometro();
  const isAtivo = tarefaAtiva?.caminho === t.caminho;

  const aoClicarCronometro = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAtivo) {
      if (rodando) pausar();
      else retomar();
    } else {
      aoCronometrar(t);
    }
  };

  const estilo = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <Cartao
      ref={setNodeRef}
      style={estilo}
      className={cn(
        "group relative flex flex-col gap-1.5 p-3 text-xs select-none cursor-pointer transition-colors hover:bg-accent/30",
        isDragging && "opacity-30",
        gravando && "animate-pulse border-primary",
        isAtivo && "border-primary/60 bg-primary/5",
      )}
      onClick={() => aoAbrir(t)}
    >
      {isAtivo && (
        <span
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 rounded-r bg-primary",
            rodando && "animate-pulse",
          )}
        />
      )}

      <div className="flex items-start gap-2">
        {/* Checkbox circular de conclusão direta */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (aoAlternarStatus) aoAlternarStatus(t);
          }}
          className="mt-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground/70 hover:text-primary transition-colors cursor-pointer"
          title={t.status === "feito" ? "Reabrir tarefa" : "Marcar como feita"}
          aria-label={t.status === "feito" ? `Reabrir ${t.titulo}` : `Concluir ${t.titulo}`}
        >
          {t.status === "feito" ? (
            <CheckCircle2 size={15} className="text-emerald-500 fill-emerald-500/20" />
          ) : (
            <Circle size={15} className="hover:text-primary transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <ConteudoDoCartao t={t} />
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {/* Menu de ações rápidas (...) */}
          <MenuAcoesTarefa
            tarefa={t}
            aoAlternarStatus={aoAlternarStatus ? () => aoAlternarStatus(t) : undefined}
            aoAdiarPrazo={aoAdiarPrazo ? (dias) => aoAdiarPrazo(t, dias) : undefined}
            aoCronometrar={() => aoCronometrar(t)}
            aoDuplicar={aoDuplicar ? () => aoDuplicar(t) : undefined}
            aoRegistrarEntregaPDI={aoRegistrarEntregaPDI ? () => aoRegistrarEntregaPDI(t) : undefined}
            aoExcluir={aoExcluir ? () => aoExcluir(t) : undefined}
          />

          {/* Alça de arrasto visível no hover */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing rounded"
            title="Arrastar tarefa"
            aria-label={`Mover ${t.titulo}`}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} />
          </button>
        </div>
      </div>

      {/* Botão de foco rápido */}
      {t.status !== "feito" && (
        <div className="mt-0.5 flex justify-end">
          <button
            type="button"
            onClick={aoClicarCronometro}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer",
              isAtivo
                ? rodando
                  ? "bg-primary/20 text-primary font-semibold"
                  : "bg-muted text-muted-foreground"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
            )}
            title={isAtivo ? (rodando ? "Pausar pomodoro" : "Retomar pomodoro") : "Iniciar pomodoro"}
          >
            {isAtivo && rodando ? (
              <>
                <Pause size={11} className="animate-pulse" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Timer size={11} />
                <span>{isAtivo ? "Retomar" : "Focar"}</span>
              </>
            )}
          </button>
        </div>
      )}
    </Cartao>
  );
}

function Coluna({
  status,
  tarefas,
  aoAbrir,
  aoCronometrar,
  aoAlternarStatus,
  aoAdiarPrazo,
  aoDuplicar,
  aoRegistrarEntregaPDI,
  aoExcluir,
  aoCriarRapido,
  gravandoCaminho,
  colapsada,
  aoAlternarColapso,
}: {
  status: Status;
  tarefas: Tarefa[];
  aoAbrir: (t: Tarefa) => void;
  aoCronometrar: (t: Tarefa) => void;
  aoAlternarStatus?: (t: Tarefa) => void;
  aoAdiarPrazo?: (t: Tarefa, dias: number) => void;
  aoDuplicar?: (t: Tarefa) => void;
  aoRegistrarEntregaPDI?: (t: Tarefa) => void;
  aoExcluir?: (t: Tarefa) => void;
  aoCriarRapido?: (status: Status, titulo: string) => Promise<void> | void;
  gravandoCaminho: string | null;
  colapsada: boolean;
  aoAlternarColapso: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [expandida, setExpandida] = useState(false);
  const [criandoInline, setCriandoInline] = useState(false);
  const [textoRapido, setTextoRapido] = useState("");
  const inputRapidoRef = useRef<HTMLInputElement>(null);

  const tarefasExibidas = expandida ? tarefas : tarefas.slice(0, LIMITE_PADRAO_COLUNA);
  const temMais = tarefas.length > LIMITE_PADRAO_COLUNA;

  const lidarEnviarCriacao = async (e: React.FormEvent) => {
    e.preventDefault();
    const titulo = textoRapido.trim();
    if (!titulo || !aoCriarRapido) return;
    setTextoRapido("");
    setCriandoInline(false);
    await aoCriarRapido(status, titulo);
  };

  if (colapsada) {
    return (
      <div
        ref={setNodeRef}
        onClick={aoAlternarColapso}
        className={cn(
          "flex w-12 shrink-0 flex-col items-center justify-between rounded-2xl border border-border bg-secondary/30 py-4 transition-all cursor-pointer hover:bg-accent/60 select-none",
          isOver && "border-primary/50 bg-primary/10",
        )}
        title={`Coluna ${ROTULO_STATUS[status]} recolhida. Clique para expandir.`}
      >
        <div className="flex flex-col items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", COR_COLUNA[status])} />
          <span className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-card shadow-2xs">
            {tarefas.length}
          </span>
        </div>

        <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-semibold text-muted-foreground tracking-wide py-2">
          {ROTULO_STATUS[status]}
        </span>

        <ChevronRight size={14} className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[84vw] sm:min-w-[280px] flex-1 flex-col rounded-2xl border border-border bg-secondary/40 p-2.5 transition-colors snap-center",
        isOver && "border-primary/40 bg-accent",
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", COR_COLUNA[status])} />
          <p className="text-sm font-semibold text-foreground">{ROTULO_STATUS[status]}</p>
          <span className="text-xs font-medium tabular-nums text-muted-foreground px-1.5 py-0.5 rounded-md bg-card/60">
            {tarefas.length}
          </span>
        </div>

        <Tooltip conteudo="Recolher coluna" posicao="top">
          <button
            onClick={aoAlternarColapso}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            aria-label={`Recolher coluna ${ROTULO_STATUS[status]}`}
          >
            <ChevronsRight size={14} />
          </button>
        </Tooltip>
      </div>

      <SortableContext
        items={tarefasExibidas.map((t) => t.caminho)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-16 flex-col gap-2">
          {tarefasExibidas.map((t) => (
            <CartaoArrastavel
              key={t.caminho}
              t={t}
              aoAbrir={aoAbrir}
              aoCronometrar={aoCronometrar}
              aoAlternarStatus={aoAlternarStatus}
              aoAdiarPrazo={aoAdiarPrazo}
              aoDuplicar={aoDuplicar}
              aoRegistrarEntregaPDI={aoRegistrarEntregaPDI}
              aoExcluir={aoExcluir}
              gravando={gravandoCaminho === t.caminho}
            />
          ))}

          {tarefas.length === 0 && !criandoInline && (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              Arraste algo para cá
            </p>
          )}

          {temMais && (
            <button
              onClick={() => setExpandida(!expandida)}
              className="w-full mt-1 py-1.5 text-center text-xs font-semibold text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              {expandida ? (
                <>
                  <ChevronUp size={13} />
                  <span>Mostrar menos</span>
                </>
              ) : (
                <>
                  <ChevronDown size={13} />
                  <span>Mostrar mais ({tarefas.length - LIMITE_PADRAO_COLUNA} tarefas)</span>
                </>
              )}
            </button>
          )}
        </div>
      </SortableContext>

      {/* Criação Rápida Inline no Rodapé da Coluna */}
      {aoCriarRapido && (
        <div className="mt-2 pt-1.5 border-t border-border/50">
          {criandoInline ? (
            <form onSubmit={lidarEnviarCriacao} className="space-y-1.5 animate-in fade-in duration-150">
              <input
                ref={inputRapidoRef}
                type="text"
                value={textoRapido}
                onChange={(e) => setTextoRapido(e.target.value)}
                placeholder={`Nova tarefa em ${ROTULO_STATUS[status]}...`}
                className="w-full text-xs rounded-lg border border-primary/50 bg-background px-2.5 py-1.5 shadow-2xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setCriandoInline(false);
                    setTextoRapido("");
                  }
                }}
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCriandoInline(false);
                    setTextoRapido("");
                  }}
                  className="px-2 py-1 text-[11px] rounded-md text-muted-foreground hover:bg-accent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!textoRapido.trim()}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
                >
                  Adicionar (Enter)
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCriandoInline(true);
                setTimeout(() => inputRapidoRef.current?.focus(), 50);
              }}
              className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-card/70 rounded-xl transition-colors cursor-pointer font-medium"
            >
              <Plus size={13} className="text-primary" />
              <span>Adicionar tarefa</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Quadro({
  tarefas,
  aoAbrir,
  aoCronometrar,
  aoMudarStatus,
  aoAlternarStatus,
  aoAdiarPrazo,
  aoDuplicar,
  aoRegistrarEntregaPDI,
  aoExcluir,
  aoCriarRapido,
  gravandoCaminho,
}: {
  tarefas: Tarefa[];
  aoAbrir: (t: Tarefa) => void;
  aoCronometrar: (t: Tarefa) => void;
  aoMudarStatus: (t: Tarefa, novo: Status) => void;
  aoAlternarStatus?: (t: Tarefa) => void;
  aoAdiarPrazo?: (t: Tarefa, dias: number) => void;
  aoDuplicar?: (t: Tarefa) => void;
  aoRegistrarEntregaPDI?: (t: Tarefa) => void;
  aoExcluir?: (t: Tarefa) => void;
  aoCriarRapido?: (status: Status, titulo: string) => Promise<void> | void;
  gravandoCaminho: string | null;
}) {
  const [arrastando, setArrastando] = useState<Tarefa | null>(null);
  const [colunaAtivaMobile, setColunaAtivaMobile] = useState<Status | "todas">("todas");
  const [filtroUrgencia, setFiltroUrgencia] = useState<"todas" | "atrasadas" | "hoje" | "urgentes">("todas");
  const [colapsadas, setColapsadas] = useState<Record<Status, boolean>>(() => {
    try {
      const salvo = localStorage.getItem("klaus_kanban_colapsadas");
      return salvo ? JSON.parse(salvo) : { "a-fazer": false, fazendo: false, feito: false };
    } catch {
      return { "a-fazer": false, fazendo: false, feito: false };
    }
  });

  // Alternador padrão de status caso não seja injetado externamente
  const lidarAlternarStatus = aoAlternarStatus || ((t: Tarefa) => {
    const novoStatus: Status = t.status === "feito" ? "a-fazer" : "feito";
    aoMudarStatus(t, novoStatus);
  });

  const alternarColapso = (s: Status) => {
    setColapsadas((prev) => {
      const proximo = { ...prev, [s]: !prev[s] };
      localStorage.setItem("klaus_kanban_colapsadas", JSON.stringify(proximo));
      return proximo;
    });
  };

  const tarefasFiltradas = useMemo(() => {
    if (filtroUrgencia === "todas") return tarefas;
    return tarefas.filter((t) => {
      const u = urgencia(t);
      if (filtroUrgencia === "atrasadas") return u === "atrasada";
      if (filtroUrgencia === "hoje") return u === "hoje";
      if (filtroUrgencia === "urgentes") return u === "atrasada" || u === "hoje" || u === "proxima";
      return true;
    });
  }, [tarefas, filtroUrgencia]);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function aoComecar(e: DragStartEvent) {
    setArrastando(tarefas.find((t) => t.caminho === e.active.id) ?? null);
  }

  function aoTerminar(e: DragEndEvent) {
    setArrastando(null);
    const { active, over } = e;
    if (!over) return;
    const destinoStatus = over.id as Status;
    const tarefaArrastada = tarefas.find((t) => t.caminho === active.id);
    if (!tarefaArrastada || tarefaArrastada.status === destinoStatus) return;
    aoMudarStatus(tarefaArrastada, destinoStatus);
  }

  const statusExibidos = colunaAtivaMobile === "todas" ? STATUS : [colunaAtivaMobile];

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCorners}
      onDragStart={aoComecar}
      onDragEnd={aoTerminar}
      onDragCancel={() => setArrastando(null)}
    >
      {/* Barra de Filtro Rápido por Urgência / Prazo */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Prazo:</span>
          {(
            [
              { id: "todas", rotulo: "Todas" },
              { id: "urgentes", rotulo: "🔥 Urgentes" },
              { id: "hoje", rotulo: "📅 Para Hoje" },
              { id: "atrasadas", rotulo: "⚠️ Atrasadas" },
            ] as const
          ).map((opcao) => (
            <button
              key={opcao.id}
              type="button"
              onClick={() => setFiltroUrgencia(opcao.id)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg transition-colors font-medium cursor-pointer",
                filtroUrgencia === opcao.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* Seletor rápido de coluna no mobile para visualização simplificada */}
      <div className="flex sm:hidden items-center gap-1 p-1 bg-card rounded-xl border border-border/80 mb-3 shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setColunaAtivaMobile("todas")}
          className={cn(
            "flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center whitespace-nowrap cursor-pointer",
            colunaAtivaMobile === "todas"
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Todas ({tarefasFiltradas.length})
        </button>
        {STATUS.map((s) => {
          const qtd = tarefasFiltradas.filter((t) => t.status === s).length;
          const ativa = colunaAtivaMobile === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setColunaAtivaMobile(s)}
              className={cn(
                "flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer",
                ativa
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", COR_COLUNA[s])} />
              <span>{ROTULO_STATUS[s]}</span>
              <span className="text-[10px] opacity-80">({qtd})</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 items-start snap-x snap-mandatory">
        {statusExibidos.map((s) => (
          <Coluna
            key={s}
            status={s}
            tarefas={tarefasFiltradas.filter((t) => t.status === s)}
            aoAbrir={aoAbrir}
            aoCronometrar={aoCronometrar}
            aoAlternarStatus={lidarAlternarStatus}
            aoAdiarPrazo={aoAdiarPrazo}
            aoDuplicar={aoDuplicar}
            aoRegistrarEntregaPDI={aoRegistrarEntregaPDI}
            aoExcluir={aoExcluir}
            aoCriarRapido={aoCriarRapido}
            gravandoCaminho={gravandoCaminho}
            colapsada={Boolean(colapsadas[s])}
            aoAlternarColapso={() => alternarColapso(s)}
          />
        ))}
      </div>

      <DragOverlay>
        {arrastando && (
          <Cartao className="cursor-grabbing p-3 shadow-xl ring-2 ring-primary/20 max-w-xs">
            <ConteudoDoCartao t={arrastando} />
          </Cartao>
        )}
      </DragOverlay>
    </DndContext>
  );
}
