import React from "react";
import { cn } from "@/lib/utils";

export interface OpcaoVisao<T extends string = string> {
  id: T;
  rotulo: string;
  icone?: React.ReactNode;
}

interface AlternadorVisaoProps<T extends string = string> {
  opcoes: OpcaoVisao<T>[];
  valorAtivo: T;
  aoAlternar: (novoValor: T) => void;
  className?: string;
}

/**
 * Componente padronizado para alternar visões (ex: Lista | Quadro | Calendário | Tabela)
 * com estilo segmentado profissional (segmented control).
 */
export function AlternadorVisao<T extends string = string>({
  opcoes,
  valorAtivo,
  aoAlternar,
  className,
}: AlternadorVisaoProps<T>) {
  return (
    <div
      className={cn(
        "flex items-center rounded-xl border border-border bg-card/80 p-1 shadow-2xs backdrop-blur-xs",
        className
      )}
    >
      {opcoes.map((opcao) => {
        const ativa = valorAtivo === opcao.id;
        return (
          <button
            key={opcao.id}
            type="button"
            onClick={() => aoAlternar(opcao.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none",
              ativa
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            )}
            title={`Visão ${opcao.rotulo}`}
          >
            {opcao.icone}
            <span>{opcao.rotulo}</span>
          </button>
        );
      })}
    </div>
  );
}
