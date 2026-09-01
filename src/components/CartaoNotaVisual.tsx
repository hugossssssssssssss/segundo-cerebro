import React, { useMemo } from "react";
import {
  FileText,
  Clock,
  Calendar,
  Check,
  Link as LinkIcon,
  Folder,
  Sparkles,
  Pin,
  MoreHorizontal,
  CheckSquare,
  Image as ImageIcon,
} from "lucide-react";
import { TagChip } from "@/components/TagChip";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Nota } from "@/lib/tipos";

interface CartaoNotaVisualProps {
  nota: Nota;
  tituloNota: string;
  subtitulo?: string;
  selecionado?: boolean;
  visao?: "grade" | "lista" | "mural";
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onToggleFixar?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  draggable?: boolean;
  className?: string;
  totalTarefas?: { concluidas: number; total: number };
  totalMoodboard?: number;
}

/**
 * Limpa marcações markdown para gerar um trecho (snippet) limpo e legível.
 */
export function extrairSnippetMarkdown(corpo: string, tamanhoMax = 160): string {
  if (!corpo) return "";
  let limpo = corpo
    // Remove blocos de código
    .replace(/```[\s\S]*?```/g, "")
    // Remove tags HTML
    .replace(/<[^>]+>/g, "")
    // Remove imagens ![](...)
    .replace(/!\[.*?\]\(.*?\)/g, "")
    // Converte links [texto](url) para texto
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    // Remove cabeçalhos #
    .replace(/^#{1,6}\s+/gm, "")
    // Remove listas - * + 1.
    .replace(/^[\s*-+]+(?:\d+\.)?\s+/gm, "")
    // Remove citações >
    .replace(/^>\s+/gm, "")
    // Remove negrito e itálico
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Remove traços horizontais
    .replace(/^-{3,}$/gm, "")
    // Remove quebras de linha múltiplas
    .replace(/\n+/g, " ")
    .trim();

  if (limpo.length > tamanhoMax) {
    limpo = limpo.slice(0, tamanhoMax).trim() + "…";
  }
  return limpo;
}

/**
 * Estima o tempo de leitura e quantidade de palavras.
 */
export function estimarTempoLeitura(corpo: string): { palavras: number; minutos: number } {
  if (!corpo) return { palavras: 0, minutos: 1 };
  const palavras = corpo.trim().split(/\s+/).filter(Boolean).length;
  const minutos = Math.max(1, Math.ceil(palavras / 180));
  return { palavras, minutos };
}

/**
 * Formata data curta amigável (Hoje, Ontem, ou DD/MM).
 */
export function formatarDataNota(dataIso?: string): string {
  if (!dataIso) return "";
  try {
    const data = new Date(dataIso.includes("T") ? dataIso : `${dataIso}T00:00:00`);
    if (Number.isNaN(data.getTime())) return dataIso;

    const hoje = new Date();
    const ehHoje =
      data.getDate() === hoje.getDate() &&
      data.getMonth() === hoje.getMonth() &&
      data.getFullYear() === hoje.getFullYear();

    if (ehHoje) return "Hoje";

    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    const ehOntem =
      data.getDate() === ontem.getDate() &&
      data.getMonth() === ontem.getMonth() &&
      data.getFullYear() === ontem.getFullYear();

    if (ehOntem) return "Ontem";

    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return dataIso;
  }
}

export const CartaoNotaVisual = React.forwardRef<HTMLDivElement, CartaoNotaVisualProps>(
  (
    {
      nota,
      tituloNota,
      subtitulo,
      selecionado = false,
      visao = "grade",
      onClick,
      onContextMenu,
      onToggleFixar,
      onDragStart,
      onDragEnd,
      draggable = true,
      className,
      totalTarefas,
      totalMoodboard,
    },
    ref
  ) => {
    const [copiado, setCopiado] = React.useState(false);

    const snippet = useMemo(
      () => extrairSnippetMarkdown(nota.corpo, visao === "mural" ? 240 : 140),
      [nota.corpo, visao]
    );

    const { palavras, minutos } = useMemo(
      () => estimarTempoLeitura(nota.corpo),
      [nota.corpo]
    );

    const dataExibicao = useMemo(() => {
      const dataRaw =
        (nota.bruto?.atualizado_em as string) ||
        nota.atualizado ||
        (nota.bruto?.criado_em as string) ||
        (nota.bruto?.criado as string);
      return formatarDataNota(dataRaw);
    }, [nota]);

    const copiarMencao = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(`@${tituloNota}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    };

    const temTags = nota.tags && nota.tags.length > 0;
    const ehNotaIA = Boolean(nota.bruto?.ia_sugeriu);

    // ── VISÃO LISTA ────────────────────────────────────────────────────────────
    if (visao === "lista") {
      return (
        <div
          ref={ref}
          data-cartao
          draggable={draggable}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={onClick}
          onContextMenu={onContextMenu}
          className={cn(
            "group relative flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all duration-150 select-none cursor-pointer",
            "bg-card hover:bg-accent/40 border-border/70 hover:border-border",
            selecionado && "border-primary bg-primary/10 ring-2 ring-primary/30",
            className
          )}
        >
          {/* Lado Esquerdo: Ícone + Título + Snippet */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                selecionado
                  ? "bg-primary text-primary-foreground font-bold text-xs"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}
            >
              {selecionado ? (
                <Check size={14} strokeWidth={3} />
              ) : (
                <FileText size={16} />
              )}
            </div>

            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                  {tituloNota}
                </span>

                {ehNotaIA && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0 font-medium">
                    <Sparkles size={10} /> IA
                  </span>
                )}

                {subtitulo && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground shrink-0 max-w-[120px] truncate">
                    <Folder size={10} /> {subtitulo}
                  </span>
                )}

                {totalTarefas && totalTarefas.total > 0 && (
                  <Tooltip conteudo={`${totalTarefas.concluidas} de ${totalTarefas.total} tarefas concluídas`}>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground shrink-0 cursor-default">
                      <CheckSquare size={10} className="text-emerald-500" />
                      <span>{totalTarefas.concluidas}/{totalTarefas.total}</span>
                    </span>
                  </Tooltip>
                )}

                {totalMoodboard !== undefined && totalMoodboard > 0 && (
                  <Tooltip conteudo={`${totalMoodboard} referências visuais`}>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground shrink-0 cursor-default">
                      <ImageIcon size={10} className="text-purple-500" />
                      <span>{totalMoodboard}</span>
                    </span>
                  </Tooltip>
                )}
              </div>

              {snippet && (
                <span className="text-xs text-muted-foreground/80 truncate hidden md:inline-block flex-1">
                  — {snippet}
                </span>
              )}
            </div>
          </div>

          {/* Lado Direito: Tags + Data + Ações */}
          <div className="flex items-center gap-3 shrink-0">
            {temTags && (
              <div className="hidden lg:flex items-center gap-1">
                {nota.tags.slice(0, 2).map((t) => (
                  <TagChip key={t} tag={t} />
                ))}
                {nota.tags.length > 2 && (
                  <span className="text-[10px] text-muted-foreground font-semibold px-1.5 py-0.5 rounded-md bg-secondary/70">
                    +{nota.tags.length - 2}
                  </span>
                )}
              </div>
            )}

            {dataExibicao && (
              <span className="text-[11px] text-muted-foreground/80 font-medium whitespace-nowrap flex items-center gap-1">
                <Calendar size={11} className="opacity-60" /> {dataExibicao}
              </span>
            )}

            {onToggleFixar && (
              <Tooltip conteudo={nota.fixado ? "Desafixar do topo" : "Fixar no topo"}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFixar();
                  }}
                  aria-label={nota.fixado ? "Desafixar do topo" : "Fixar no topo"}
                  className={cn(
                    "p-1.5 rounded-lg hover:bg-accent transition-all cursor-pointer",
                    nota.fixado
                      ? "text-amber-500 opacity-100"
                      : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Pin size={13} className={nota.fixado ? "fill-amber-500/40 rotate-12" : ""} />
                </button>
              </Tooltip>
            )}

            <Tooltip conteudo="Copiar @menção">
              <button
                type="button"
                onClick={copiarMencao}
                aria-label="Copiar @menção"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {copiado ? (
                  <Check size={13} className="text-emerald-500" />
                ) : (
                  <LinkIcon size={13} />
                )}
              </button>
            </Tooltip>

            {onContextMenu && (
              <Tooltip conteudo="Mais opções da nota">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onContextMenu(e);
                  }}
                  aria-label="Mais opções da nota"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <MoreHorizontal size={14} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      );
    }

    // ── VISÃO GRADE / MURAL ──────────────────────────────────────────────────
    return (
      <div
        ref={ref}
        data-cartao
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onClick}
        onContextMenu={onContextMenu}
        className={cn(
          "group relative flex flex-col justify-between rounded-2xl border transition-colors duration-150 select-none cursor-pointer overflow-hidden p-4",
          "bg-card hover:bg-accent/20 border-border/80 hover:border-border",
          selecionado &&
            "border-primary bg-primary/5 ring-2 ring-primary/30",
          visao === "grade" && "min-h-[170px]",
          visao === "mural" && "mb-3",
          className
        )}
      >
        {/* Topo do Cartão */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                  selecionado
                    ? "bg-primary text-primary-foreground"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                )}
              >
                {selecionado ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <FileText size={15} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-foreground leading-snug truncate">
                  {tituloNota}
                </h3>
                {subtitulo && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/90 font-medium truncate mt-0.5">
                    <Folder size={10} className="shrink-0 opacity-70" />
                    <span className="truncate">{subtitulo}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ações rápidas no topo do cartão */}
            <div className="flex items-center gap-0.5 shrink-0">
              {nota.fixado && !onToggleFixar && (
                <Tooltip conteudo="Nota fixada">
                  <span className="text-amber-500 p-1">
                    <Pin size={13} className="fill-amber-500/40 rotate-12" />
                  </span>
                </Tooltip>
              )}

              {onToggleFixar && (
                <Tooltip conteudo={nota.fixado ? "Desafixar do topo" : "Fixar no topo"}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFixar();
                    }}
                    aria-label={nota.fixado ? "Desafixar do topo" : "Fixar no topo"}
                    className={cn(
                      "p-1.5 rounded-lg hover:bg-accent transition-all cursor-pointer",
                      nota.fixado
                        ? "text-amber-500 opacity-100"
                        : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Pin size={13} className={nota.fixado ? "fill-amber-500/40 rotate-12" : ""} />
                  </button>
                </Tooltip>
              )}

              <Tooltip conteudo="Copiar @menção">
                <button
                  type="button"
                  onClick={copiarMencao}
                  aria-label="Copiar @menção"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copiado ? (
                    <Check size={13} className="text-emerald-500" />
                  ) : (
                    <LinkIcon size={13} />
                  )}
                </button>
              </Tooltip>

              {onContextMenu && (
                <Tooltip conteudo="Mais opções da nota">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onContextMenu(e);
                    }}
                    aria-label="Mais opções da nota"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Snippet / Trecho do Markdown */}
          {snippet ? (
            <p
              className={cn(
                "mt-3 text-xs text-muted-foreground/90 leading-relaxed font-normal",
                visao === "mural" ? "line-clamp-6" : "line-clamp-3"
              )}
            >
              {snippet}
            </p>
          ) : (
            <p className="mt-3 text-[11px] text-muted-foreground/40 italic">
              Nota sem conteúdo de texto.
            </p>
          )}
        </div>

        {/* Rodapé do Cartão */}
        <div className="mt-4 pt-3 border-t border-border/40 flex flex-col gap-2">
          {/* Tags */}
          {temTags && (
            <div className="flex items-center gap-1 flex-wrap">
              {nota.tags.slice(0, 3).map((t) => (
                <TagChip key={t} tag={t} />
              ))}
              {nota.tags.length > 3 && (
                <span className="text-[9px] text-muted-foreground font-semibold px-1 py-0.5 rounded bg-secondary">
                  +{nota.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Metadados: Data + Leitura + Vínculos */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-medium">
            <div className="flex items-center gap-1.5">
                {totalTarefas && totalTarefas.total > 0 && (
                  <Tooltip conteudo={`${totalTarefas.concluidas} de ${totalTarefas.total} tarefas concluídas`}>
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium cursor-default">
                      <CheckSquare size={10} className="text-emerald-500" />
                      <span>{totalTarefas.concluidas}/{totalTarefas.total}</span>
                    </span>
                  </Tooltip>
                )}

                {totalMoodboard !== undefined && totalMoodboard > 0 && (
                  <Tooltip conteudo={`${totalMoodboard} referências visuais`}>
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium cursor-default">
                      <ImageIcon size={10} className="text-purple-500" />
                      <span>{totalMoodboard}</span>
                    </span>
                  </Tooltip>
                )}
              <span className="flex items-center gap-1">
                <Calendar size={11} className="opacity-60" />
                {dataExibicao || "Recente"}
              </span>
            </div>

            <span className="flex items-center gap-1 opacity-70">
              <Clock size={10} />
              {minutos} min ({palavras} pal.)
            </span>
          </div>
        </div>
      </div>
    );
  }
);

CartaoNotaVisual.displayName = "CartaoNotaVisual";
