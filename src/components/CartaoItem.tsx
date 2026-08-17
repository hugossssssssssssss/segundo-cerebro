import React from "react";
import { Cartao } from "@/components/ui";
import { TagChip } from "@/components/TagChip";
import { cn } from "@/lib/utils";

interface CartaoItemProps {
  icone?: React.ReactNode;
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  badge?: React.ReactNode;
  tags?: string[];
  acoes?: React.ReactNode;
  ativo?: boolean;
  onClick?: () => void;
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
  onClick,
  className,
  children,
}: CartaoItemProps) {
  return (
    <Cartao
      onClick={onClick}
      className={cn(
        "p-4 transition-all duration-200 group relative flex flex-col justify-between border-border/80 bg-card",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-xs",
        ativo && "border-primary bg-primary/5 ring-1 ring-primary/20",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {icone && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/60 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
              {icone}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm sm:text-base text-foreground leading-snug truncate group-hover:text-primary transition-colors">
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
            className="flex items-center gap-1.5 shrink-0"
          >
            {acoes}
          </div>
        )}
      </div>

      {children && <div className="mt-3">{children}</div>}

      {tags && tags.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {tags.map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>
      )}
    </Cartao>
  );
}
