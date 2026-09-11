import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

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
        "flex items-center rounded-xl liquid-glass-pill p-1 shadow-minimal max-w-full overflow-x-auto select-none",
        className
      )}
    >
      {opcoes.map((opcao) => {
        const ativa = valorAtivo === opcao.id;
        return (
          <Tooltip
            key={opcao.id}
            conteudo={`Alternar para visão ${opcao.rotulo}`}
          >
            <button
              type="button"
              onClick={() => aoAlternar(opcao.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-medium rounded-lg liquid-press cursor-pointer select-none whitespace-nowrap shrink-0",
                ativa
                  ? "bg-card text-foreground shadow-xs font-semibold border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              )}
            >
              {opcao.icone}
              <span className="text-[11px] sm:text-xs">{opcao.rotulo}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
