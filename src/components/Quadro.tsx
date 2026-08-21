import { useState } from "react";
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
import { Timer, GripVertical } from "lucide-react";
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
import { Botao, Cartao, Selo } from "@/components/ui";
import { cn } from "@/lib/utils";

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

function ConteudoDoCartao({ t }: { t: Tarefa }) {
  const u = urgencia(t);
  const min = minutosRegistrados(t.corpo);
  const passos = progressoSubtarefas(t.corpo);

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
      {(u !== "nenhuma" || min > 0 || passos.total > 0 || t.tags.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {u !== "nenhuma" && <Selo tom={CORES_URGENCIA[u]}>{textoPrazo(t)}</Selo>}
          {min > 0 && <Selo>🍅 {min}min</Selo>}
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

function CartaoArrastavel({
  t,
  aoAbrir,
  aoCronometrar,
  gravando,
}: {
  t: Tarefa;
  aoAbrir: (t: Tarefa) => void;
  aoCronometrar: (t: Tarefa) => void;
  gravando: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: t.caminho });

  return (
    <Cartao
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-start gap-1.5 p-3",
        // some o original enquanto a cópia está na mão, senão parece que
        // existem duas tarefas iguais
        isDragging && "opacity-40",
        gravando && "opacity-60",
      )}
    >
      {/* A alça é só dela: o cartão inteiro arrastável impedia o toque de
          abrir a tarefa no celular, onde não existe "clicar sem arrastar". */}
      <button
        {...attributes}
        {...listeners}
        className="-ml-1 shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground/50 hover:bg-accent hover:text-muted-foreground active:cursor-grabbing"
        aria-label={`Mover ${t.titulo}`}
      >
        <GripVertical size={16} />
      </button>

      <button
        onClick={() => aoAbrir(t)}
        onPointerDown={(e) => e.stopPropagation()}
        className="min-w-0 flex-1 text-left"
      >
        <ConteudoDoCartao t={t} />
      </button>

      {t.status !== "feito" && (
        <Botao
          variante="fantasma"
          tamanho="icone"
          onClick={() => aoCronometrar(t)}
          onPointerDown={(e) => e.stopPropagation()}
          title="Iniciar pomodoro"
        >
          <Timer size={16} />
        </Botao>
      )}
    </Cartao>
  );
}

function Coluna({
  status,
  tarefas,
  aoAbrir,
  aoCronometrar,
  gravandoCaminho,
}: {
  status: Status;
  tarefas: Tarefa[];
  aoAbrir: (t: Tarefa) => void;
  aoCronometrar: (t: Tarefa) => void;
  gravandoCaminho: string | null;
}) {
  // `useDroppable` na coluna inteira, e não só na lista de cartões: sem isso
  // uma coluna VAZIA não aceitaria nada, que é justamente quando você mais
  // precisa soltar algo nela.
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[260px] flex-1 flex-col rounded-2xl border border-border bg-secondary/40 p-2.5 transition-colors",
        isOver && "border-primary/40 bg-accent",
      )}
    >
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span className={cn("h-2 w-2 rounded-full", COR_COLUNA[status])} />
        <p className="text-sm font-semibold">{ROTULO_STATUS[status]}</p>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {tarefas.length}
        </span>
      </div>

      <SortableContext
        items={tarefas.map((t) => t.caminho)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-16 flex-col gap-2">
          {tarefas.map((t) => (
            <CartaoArrastavel
              key={t.caminho}
              t={t}
              aoAbrir={aoAbrir}
              aoCronometrar={aoCronometrar}
              gravando={gravandoCaminho === t.caminho}
            />
          ))}
          {tarefas.length === 0 && (
            <p className="px-1 py-4 text-center text-xs text-muted-foreground">
              Arraste algo para cá
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function Quadro({
  tarefas,
  aoAbrir,
  aoCronometrar,
  aoMudarStatus,
  gravandoCaminho,
}: {
  tarefas: Tarefa[];
  aoAbrir: (t: Tarefa) => void;
  aoCronometrar: (t: Tarefa) => void;
  aoMudarStatus: (t: Tarefa, novo: Status) => void;
  gravandoCaminho: string | null;
}) {
  const [arrastando, setArrastando] = useState<Tarefa | null>(null);

  const sensores = useSensors(
    // 6px de folga antes de considerar arrasto: sem isso, um toque com o dedo
    // trêmulo no celular virava arrasto e a tarefa nunca abria
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function aoComecar(e: DragStartEvent) {
    setArrastando(tarefas.find((t) => t.caminho === e.active.id) ?? null);
  }

  function aoTerminar(e: DragEndEvent) {
    setArrastando(null);
    const { active, over } = e;
    if (!over) return;

    const movida = tarefas.find((t) => t.caminho === active.id);
    if (!movida) return;

    // O alvo pode ser a coluna (id = status) ou um cartão dentro dela — nesse
    // caso o destino é o status DAQUELE cartão.
    const destino = STATUS.includes(over.id as Status)
      ? (over.id as Status)
      : tarefas.find((t) => t.caminho === over.id)?.status;

    if (!destino || destino === movida.status) return;
    aoMudarStatus(movida, destino);
  }

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCorners}
      onDragStart={aoComecar}
      onDragEnd={aoTerminar}
      onDragCancel={() => setArrastando(null)}
    >
      {/* rola na horizontal no celular, onde três colunas não cabem */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STATUS.map((s) => (
          <Coluna
            key={s}
            status={s}
            tarefas={tarefas.filter((t) => t.status === s)}
            aoAbrir={aoAbrir}
            aoCronometrar={aoCronometrar}
            gravandoCaminho={gravandoCaminho}
          />
        ))}
      </div>

      {/* a cópia que segue o dedo/cursor */}
      <DragOverlay>
        {arrastando && (
          <Cartao className="cursor-grabbing p-3 shadow-lg">
            <ConteudoDoCartao t={arrastando} />
          </Cartao>
        )}
      </DragOverlay>
    </DndContext>
  );
}
