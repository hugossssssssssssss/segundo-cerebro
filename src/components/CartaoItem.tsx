import React from "react";
import { Cartao } from "@/components/ui";
import { TagChip } from "@/components/TagChip";
import { cn } from "@/lib/utils";
import { gerarPropsArrasto } from "@/lib/arrastoItem";

interface CartaoItemProps {
  icone?: React.ReactNode;
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  badge?: React.ReactNode;
  tags?: string[];
  acoes?: React.ReactNode;
  ativo?: boolean;
  selecionado?: boolean;
  caminhoItem?: string;
  rotuloTipo?: string;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Cartão de item unificado para exibição de Notas, Tarefas, Contatos, Metas, Lousas, etc.
 */
export function CartaoItem({
  icone,
  titulo,
  subtitulo,
  badge,
  tags,
  acoes,
  ativo = false,
  selecionado = false,
  caminhoItem,
  rotuloTipo,
  onClick,
  onContextMenu,
  className,
  children,
}: CartaoItemProps) {
  const temTags = tags && tags.length > 0;
  const propsArrasto = caminhoItem
    ? gerarPropsArrasto({
        caminho: caminhoItem,
        titulo: typeof titulo === "string" ? titulo : undefined,
        rotuloTipo,
      })
    : {};

  return (
    <Cartao
      onClick={onClick}
      onContextMenu={onContextMenu}
      {...propsArrasto}
      className={cn(
        "p-4 sm:p-5 transition-fluid-fast group relative flex flex-col justify-between border-border/40 bg-card hover:border-border/80 hover:bg-accent/15 hover:shadow-md rounded-2xl",
        onClick && "cursor-pointer",
        ativo && "border-foreground/30 bg-accent/30 ring-1 ring-foreground/20",
        selecionado &&
        "border-primary bg-primary/5 ring-1 ring-primary/30",
        className
      )}
    >
      {/* Indicador de seleção */}
      {selecionado && (
        <div className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {icone && (
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors group-hover:text-foreground",
              )}
            >
              {icone}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm sm:text-base text-foreground leading-snug truncate transition-colors">
                {titulo}
              </h3>
              {badge}
            </div>
            {subtitulo && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {subtitulo}
              </p>
            )}
          </div>
        </div>

        {acoes && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
          >
            {acoes}
          </div>
        )}
      </div>

      {children && <div className="mt-3">{children}</div>}

      {temTags && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {tags.map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>
      )}
    </Cartao>
  );
}