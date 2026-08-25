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
  Minimize2,
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
import { useWorkspace, type WorkspaceAba } from "./WorkspaceContext";
import { cn } from "@/lib/utils";

function obterIconeTipo(rotulo: string, caminho?: string) {
  const r = (rotulo || "").toLowerCase();
  const c = (caminho || "").toLowerCase();

  if (r.includes("tarefa") || c.startsWith("tarefas/")) {
    return <CheckSquare size={14} className="text-emerald-500 shrink-0" />;
  }
  if (r.includes("meta") || c.startsWith("pdi/metas") || c.startsWith("metas/")) {
    return <Target size={14} className="text-blue-500 shrink-0" />;
  }
  if (r.includes("entrega") || c.startsWith("pdi/entregas/")) {
    return <Sparkles size={14} className="text-purple-500 shrink-0" />;
  }
  if (r.includes("referencia") || c.startsWith("referencias/")) {
    return <ImageIcon size={14} className="text-pink-500 shrink-0" />;
  }
  if (r.includes("contato") || c.startsWith("contatos/")) {
    return <User size={14} className="text-cyan-500 shrink-0" />;
  }
  return <FileText size={14} className="text-amber-500 shrink-0" />;
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  const [menuAberto, setMenuAberto] = React.useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group relative flex items-center gap-2 border-r border-border/70 px-3.5 py-2 text-xs font-medium cursor-pointer select-none transition-all max-w-[200px] sm:max-w-[240px] shrink-0",
        ativa
          ? "bg-card text-foreground border-b-2 border-b-primary shadow-xs font-semibold"
          : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground border-b border-b-border"
      )}
      onClick={onSelecionar}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuAberto(true);
      }}
    >
      <div {...listeners} className="flex items-center gap-1.5 min-w-0 flex-1">
        {obterIconeTipo(aba.rotuloTipo, aba.caminho)}
        <span className="truncate" title={aba.titulo || "Sem título"}>
          {aba.titulo || "Sem título"}
        </span>
      </div>

      {/* Indicador de Status (Salvando / Modificado) */}
      {aba.salvando ? (
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping shrink-0" title="Salvando..." />
      ) : aba.temMudancas ? (
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Modificado (Salva automaticamente)" />
      ) : null}

      {/* Menu dropdown de opções da aba */}
      <Popover open={menuAberto} onOpenChange={setMenuAberto}>
        <PopoverTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className={cn(
              "rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-opacity shrink-0",
              ativa ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-70 hover:!opacity-100"
            )}
            title="Opções da aba"
          >
            <MoreVertical size={13} />
          </button>
        </PopoverTrigger>
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
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X size={14} className="shrink-0" />
              <span>Fechar aba</span>
            </button>

            <button
              onClick={() => {
                setMenuAberto(false);
                onMigrarPopup();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-accent transition-colors"
            >
              <Square size={14} className="shrink-0 opacity-70" />
              <span>Abrir em modo pop-up</span>
            </button>

            <button
              onClick={() => {
                setMenuAberto(false);
                onAbrirNovaGuia();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-accent transition-colors"
            >
              <ExternalLink size={14} className="shrink-0 opacity-70" />
              <span>Abrir em outra guia</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Botão de Fechar Aba */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFechar();
        }}
        className={cn(
          "rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all shrink-0",
          ativa ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-70 hover:!opacity-100"
        )}
        title="Fechar aba"
      >
        <X size={13} />
      </button>
    </div>
  );
});

export function WorkspaceBarraAbas() {
  const {
    abas,
    abaAtivaId,
    selecionarAba,
    fecharAba,
    fecharWorkspace,
    reordenarAbas,
    migrarParaPopup,
    setBuscaGlobalAberta,
  } = useWorkspace();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
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
    <div className="flex items-center justify-between border-b border-border bg-muted/40 px-2 select-none shrink-0 h-10 overflow-hidden">
      {/* Lista de Abas com drag-and-drop */}
      <div className="flex items-center min-w-0 flex-1 overflow-x-auto no-scrollbar">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={lidarDragEnd}>
          <SortableContext items={abas.map((a) => a.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex items-center">
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
        <button
          onClick={() => setBuscaGlobalAberta(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/80 rounded-md transition-colors shrink-0 ml-1"
          title="Abrir ou pesquisar documento (⌘K)"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Abrir</span>
        </button>
      </div>

      {/* Controles do Workspace */}
      <div className="flex items-center gap-1 shrink-0 pl-2">
        <button
          onClick={fecharWorkspace}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Minimizar / Fechar tela cheia"
        >
          <Minimize2 size={15} />
        </button>
      </div>
    </div>
  );
}
