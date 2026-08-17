import React from "react";
import { cn } from "@/lib/utils";

export type TomSelo = "neutro" | "sucesso" | "aviso" | "perigo" | "primario" | "info";

interface SeloStatusProps {
  rotulo: React.ReactNode;
  tom?: TomSelo;
  comPonto?: boolean;
  className?: string;
}

const TONS_CLASSES: Record<TomSelo, { bg: string; text: string; dot: string; border: string }> = {
  neutro: {
    bg: "bg-muted/80",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/60",
    border: "border-border/60",
  },
  sucesso: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    border: "border-emerald-500/30",
  },
  aviso: {
    bg: "bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    border: "border-amber-500/30",
  },
  perigo: {
    bg: "bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
    border: "border-rose-500/30",
  },
  primario: {
    bg: "bg-primary/15",
    text: "text-primary",
    dot: "bg-primary",
    border: "border-primary/30",
  },
  info: {
    bg: "bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500",
    border: "border-sky-500/30",
  },
};

/**
 * Selo de status unificado para tarefas, metas, contatos e avisos.
 */
export function SeloStatus({
  rotulo,
  tom = "neutro",
  comPonto = true,
  className,
}: SeloStatusProps) {
  const estilo = TONS_CLASSES[tom] || TONS_CLASSES.neutro;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-all select-none",
        estilo.bg,
        estilo.text,
        estilo.border,
        className
      )}
    >
      {comPonto && (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", estilo.dot)} />
      )}
      <span>{rotulo}</span>
    </span>
  );
}
