import React, { useState, useMemo } from "react";
import {
  Plus,
  X,
  Search,
  Check,
  FileText,
  CheckSquare,
  Target,
  User,
  Image as ImageIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TipoItem } from "@/lib/busca";

export interface ItemRelacionavel {
  caminho: string;
  titulo: string;
  tipo: TipoItem;
  subtitulo?: string;
}

interface SeletorRelacaoNotionProps {
  relacionamentos: string[];
  opcoesDisponiveis: ItemRelacionavel[];
  aoAlternarRelacao: (tituloOuCaminho: string) => void;
  aoCriarNovoItem?: (titulo: string, tipo: TipoItem) => Promise<void> | void;
  aoClicarItem?: (titulo: string, caminho?: string) => void;
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  children?: React.ReactNode;
  maxItensExibir?: number;
}

const ICONES_TIPO: Record<string, React.ElementType> = {
  nota: FileText,
  tarefa: CheckSquare,
  meta: Target,
  entrega: Target,
  contato: User,
  referencia: ImageIcon,
  outro: FileText,
};

const ROTULOS_TIPO: Record<string, string> = {
  todas: "Todos",
  nota: "Notas",
  tarefa: "Tarefas",
  meta: "Metas PDI",
  contato: "Contatos",
  referencia: "Referências",
};

export function SeletorRelacaoNotion({
  relacionamentos = [],
  opcoesDisponiveis = [],
  aoAlternarRelacao,
  aoCriarNovoItem,
  aoClicarItem,
  aberto,
  aoMudarAberto,
  children,
  maxItensExibir = 6,
}: SeletorRelacaoNotionProps) {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todas");
  const [criando, setCriando] = useState(false);

  const normalizar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const termoBusca = normalizar(busca.replace(/^[@[]+/, ""));

  const opcoesFiltradas = useMemo(() => {
    return opcoesDisponiveis.filter((op) => {
      if (filtroTipo !== "todas") {
        if (filtroTipo === "meta" && (op.tipo === "meta" || op.tipo === "entrega")) {
          // match
        } else if (op.tipo !== filtroTipo) {
          return false;
        }
      }
      if (!termoBusca) return true;
      return (
        normalizar(op.titulo).includes(termoBusca) ||
        normalizar(op.caminho).includes(termoBusca)
      );
    });
  }, [opcoesDisponiveis, filtroTipo, termoBusca]);

  const existeExato = useMemo(() => {
    if (!termoBusca) return true;
    return opcoesDisponiveis.some(
      (op) => normalizar(op.titulo) === termoBusca
    );
  }, [opcoesDisponiveis, termoBusca]);

  const handleCriar = async (tipo: TipoItem) => {
    if (!busca.trim() || !aoCriarNovoItem) return;
    setCriando(true);
    try {
      await aoCriarNovoItem(busca.trim(), tipo);
      setBusca("");
    } finally {
      setCriando(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
      {/* Badges de itens já relacionados */}
      {relacionamentos.slice(0, maxItensExibir).map((rel) => {
        const tit = rel.startsWith("@") ? rel.slice(1) : rel;
        const itemObj = opcoesDisponiveis.find(
          (o) => normalizar(o.titulo) === normalizar(tit)
        );
        const Icone = itemObj ? ICONES_TIPO[itemObj.tipo] || FileText : FileText;

        return (
          <Badge
            key={rel}
            variant="secondary"
            className="text-xs px-2 py-0.5 border border-border/60 bg-accent hover:bg-accent/80 text-foreground flex items-center gap-1.5 transition-colors group/rel select-none"
          >
            <Icone size={11} className="text-primary shrink-0" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (aoClicarItem) aoClicarItem(tit, itemObj?.caminho);
              }}
              className="hover:underline truncate max-w-[140px] text-left cursor-pointer"
              title={`Abrir ${tit}`}
            >
              {tit}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                aoAlternarRelacao(rel);
              }}
              className="p-0.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 cursor-pointer opacity-70 group-hover/rel:opacity-100 transition-opacity"
              title={`Desvincular ${tit}`}
            >
              <X size={10} />
            </button>
          </Badge>
        );
      })}

      {relacionamentos.length > maxItensExibir && (
        <span className="text-[11px] text-muted-foreground font-medium">
          +{relacionamentos.length - maxItensExibir} outros
        </span>
      )}

      {/* Gatilho e Popover */}
      <Popover open={aberto} onOpenChange={aoMudarAberto}>
        <PopoverTrigger asChild>
          {children || (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                aoMudarAberto(true);
              }}
              className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus size={11} />
              <span>{relacionamentos.length === 0 ? "Vincular item..." : "Adicionar"}</span>
            </button>
          )}
        </PopoverTrigger>

        <PopoverContent
          className="w-80 p-0 shadow-2xl border-border divide-y divide-border/50"
          align="start"
          onInteractOutside={() => aoMudarAberto(false)}
        >
          {/* Cabeçalho de Busca */}
          <div className="p-2 space-y-2">
            <div className="flex items-center gap-2 bg-accent/40 border border-border px-2.5 py-1.5 rounded-md">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Buscar nota, tarefa, meta..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="p-0.5 text-muted-foreground hover:text-foreground rounded cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Abas de Filtro por Tipo */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
              {["todas", "nota", "tarefa", "meta", "contato"].map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setFiltroTipo(tp)}
                  className={cn(
                    "px-2 py-0.5 rounded-full whitespace-nowrap transition-colors cursor-pointer",
                    filtroTipo === tp
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-secondary/60 text-muted-foreground hover:bg-accent"
                  )}
                >
                  {ROTULOS_TIPO[tp]}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Resultados */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {opcoesFiltradas.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Nenhum item encontrado.
              </div>
            ) : (
              opcoesFiltradas.slice(0, 30).map((op) => {
                const Icone = ICONES_TIPO[op.tipo] || FileText;
                const selecionado = relacionamentos.some(
                  (r) =>
                    normalizar(r.startsWith("@") ? r.slice(1) : r) ===
                    normalizar(op.titulo)
                );

                return (
                  <button
                    key={op.caminho}
                    type="button"
                    onClick={() => aoAlternarRelacao(op.titulo)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors cursor-pointer",
                      selecionado
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Icone size={13} className="shrink-0 opacity-70 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{op.titulo}</p>
                        {op.subtitulo && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {op.subtitulo}
                          </p>
                        )}
                      </div>
                    </div>
                    {selecionado ? (
                      <Check size={13} className="shrink-0 text-primary" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground opacity-60 uppercase">
                        {op.tipo}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Criação Rápida caso o termo não exista */}
          {busca.trim() && !existeExato && aoCriarNovoItem && (
            <div className="p-2 bg-accent/20 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Criar novo item vinculado
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  disabled={criando}
                  onClick={() => handleCriar("tarefa")}
                  className="px-2 py-1 rounded bg-card border border-border hover:bg-accent text-[11px] font-medium text-foreground flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <CheckSquare size={11} className="text-primary" />
                  <span>+ Tarefa: &quot;{busca.trim()}&quot;</span>
                </button>
                <button
                  type="button"
                  disabled={criando}
                  onClick={() => handleCriar("nota")}
                  className="px-2 py-1 rounded bg-card border border-border hover:bg-accent text-[11px] font-medium text-foreground flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <FileText size={11} className="text-blue-500" />
                  <span>+ Nota: &quot;{busca.trim()}&quot;</span>
                </button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
