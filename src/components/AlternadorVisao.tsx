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
        "flex items-center rounded-lg border border-border/40 bg-muted/40 p-0.5 shadow-2xs backdrop-blur-xs max-w-full overflow-x-auto select-none",
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
                "flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer select-none whitespace-nowrap shrink-0",
                ativa
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
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
