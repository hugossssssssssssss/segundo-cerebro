import React, { memo } from "react";
import {
  X,
  Plus,
  MoreVertical,
  FileText,
  CheckSquare,
  Target,
  Image as ImageIcon,
  User,
  ExternalLink,
  Square,
  Sparkles,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { useWorkspace, type WorkspaceAba } from "./WorkspaceContext";
import { cn, formatarTituloAmigavel } from "@/lib/utils";

function obterIconeTipo(rotulo: string, caminho?: string) {
  const r = (rotulo || "").toLowerCase();
  const c = (caminho || "").toLowerCase();

  if (r.includes("tarefa") || c.startsWith("tarefas/")) {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
        <CheckSquare size={13} />
      </div>
    );
  }
  if (r.includes("meta") || c.startsWith("pdi/metas") || c.startsWith("metas/")) {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
        <Target size={13} />
      </div>
    );
  }
  if (r.includes("entrega") || c.startsWith("pdi/entregas/")) {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
        <Sparkles size={13} />
      </div>
    );
  }
  if (r.includes("referencia") || c.startsWith("referencias/")) {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 shrink-0">
        <ImageIcon size={13} />
      </div>
    );
  }
  if (r.includes("contato") || c.startsWith("contatos/")) {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
        <User size={13} />
      </div>
    );
  }
  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
      <FileText size={13} />
    </div>
  );
}

interface AbaItemProps {
  aba: WorkspaceAba;
  ativa: boolean;
  onSelecionar: () => void;
  onFechar: () => void;
  onMigrarPopup: () => void;
  onAbrirNovaGuia: () => void;
}

const AbaItem = memo(function AbaItem({
  aba,
  ativa,
  onSelecionar,
  onFechar,
  onMigrarPopup,
  onAbrirNovaGuia,
}: AbaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: aba.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? "none" : transition || "transform 150ms cubic-bezier(0.25, 1, 0.5, 1)",
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const [menuAberto, setMenuAberto] = React.useState(false);
  const tituloLimpo = formatarTituloAmigavel(aba.titulo, aba.caminho?.split("/").pop());

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group relative flex items-center gap-2 px-3 py-1.5 text-xs font-medium cursor-pointer select-none touch-none will-change-transform transition-colors duration-150 max-w-[200px] sm:max-w-[240px] shrink-0",
        ativa
          ? "bg-card text-foreground border-t-2 border-t-primary border-x border-x-border/70 border-b-transparent shadow-xs font-semibold rounded-t-xl -mb-[1px] z-10"
          : "bg-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground border border-transparent rounded-lg my-1",
        isDragging && "shadow-xl bg-card/90 ring-1 ring-primary/30 rounded-xl"
      )}
      onClick={onSelecionar}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuAberto(true);
      }}
    >
      <div {...listeners} className="flex items-center gap-1.5 min-w-0 flex-1">
        {obterIconeTipo(aba.rotuloTipo, aba.caminho)}
        <Tooltip conteudo={tituloLimpo}>
          <span className="truncate cursor-default">
            {tituloLimpo}
          </span>
        </Tooltip>
      </div>

      {/* Indicador de Status (Salvando / Modificado) */}
      {aba.salvando ? (
        <Tooltip conteudo="Salvando alterações no repositório..." posicao="bottom">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping shrink-0" />
        </Tooltip>
      ) : aba.temMudancas ? (
        <Tooltip conteudo="Alterações salvas localmente (gravando no Git...)" posicao="bottom">
          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
        </Tooltip>
      ) : null}

      {/* Menu dropdown de opções da aba */}
      <Popover open={menuAberto} onOpenChange={setMenuAberto}>
        <Tooltip conteudo="Opções da aba" posicao="bottom">
          <PopoverTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className={cn(
                "rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-opacity shrink-0 cursor-pointer",
                ativa ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-70 hover:!opacity-100"
              )}
              aria-label="Opções da aba"
            >
              <MoreVertical size={13} />
            </button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent
          className="w-52 p-1 shadow-xl border-border"
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => {
                setMenuAberto(false);
                onFechar();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            >
              <X size={14} className="shrink-0" />
              <span>Fechar aba</span>
            </button>

            <button
              onClick={() => {
                setMenuAberto(false);
                onMigrarPopup();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <Square size={14} className="shrink-0 opacity-70" />
              <span>Abrir em modo pop-up</span>
            </button>

            <button
              onClick={() => {
                setMenuAberto(false);
                onAbrirNovaGuia();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <ExternalLink size={14} className="shrink-0 opacity-70" />
              <span>Abrir em outra guia</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Botão de Fechar Aba */}
      <Tooltip conteudo="Fechar esta aba" posicao="bottom">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFechar();
          }}
          className={cn(
            "rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all shrink-0 cursor-pointer",
            ativa ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-70 hover:!opacity-100"
          )}
          aria-label="Fechar aba"
        >
          <X size={13} />
        </button>
      </Tooltip>
    </div>
  );
});

export function WorkspaceBarraAbas({ className }: { className?: string }) {
  const {
    abas,
    abaAtivaId,
    selecionarAba,
    fecharAba,
    reordenarAbas,
    migrarParaPopup,
    setBuscaGlobalAberta,
  } = useWorkspace();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const lidarDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const indexAntigo = abas.findIndex((a) => a.id === active.id);
      const indexNovo = abas.findIndex((a) => a.id === over.id);
      if (indexAntigo !== -1 && indexNovo !== -1) {
        reordenarAbas(indexAntigo, indexNovo);
      }
    }
  };

  const abrirEmNovaGuiaNavegador = (aba: WorkspaceAba) => {
    if (!aba.caminho) return;
    const pasta = aba.caminho.split("/")[0]?.toLowerCase() || "";
    let rota = "/notas";
    if (pasta === "tarefas") rota = "/tarefas";
    else if (pasta === "referencias") rota = "/referencias";
    else if (pasta === "pdi" || pasta === "metas") rota = "/pdi";
    else if (pasta === "lousas") rota = "/lousas";
    else if (pasta === "contatos") rota = "/contatos";

    const url = `${window.location.origin}${window.location.pathname}#${rota}?abrir=${encodeURIComponent(aba.caminho)}`;
    window.open(url, "_blank");
  };

  return (
    <div className={cn("flex items-end min-w-0 flex-1 overflow-x-auto no-scrollbar h-full", className)}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={lidarDragEnd}>
        <SortableContext items={abas.map((a) => a.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex items-end gap-1">
            {abas.map((aba) => (
              <AbaItem
                key={aba.id}
                aba={aba}
                ativa={aba.id === abaAtivaId}
                onSelecionar={() => selecionarAba(aba.id)}
                onFechar={() => fecharAba(aba.id)}
                onMigrarPopup={() => migrarParaPopup(aba.id)}
                onAbrirNovaGuia={() => abrirEmNovaGuiaNavegador(aba)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Botão de Adicionar / Abrir Documento */}
      <Tooltip conteudo="Abrir outro documento em nova aba" atalho="⌘K" posicao="bottom">
        <button
          onClick={() => setBuscaGlobalAberta(true)}
          className="flex items-center gap-1.5 h-8 px-2.5 mb-0.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card border border-border/40 hover:border-border/80 rounded-lg transition-all shrink-0 ml-1 shadow-2xs cursor-pointer"
          aria-label="Abrir documento em nova aba"
        >
          <Plus size={13} />
          <span className="hidden sm:inline">Nova aba</span>
        </button>
      </Tooltip>
    </div>
  );
}
