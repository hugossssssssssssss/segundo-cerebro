import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
 * com estilo segmentado profissional (segmented control) e suporte a pistas visuais de rolagem horizontal.
 */
export function AlternadorVisao<T extends string = string>({
  opcoes,
  valorAtivo,
  aoAlternar,
  className,
}: AlternadorVisaoProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [podeRolarEsquerda, setPodeRolarEsquerda] = useState(false);
  const [podeRolarDireita, setPodeRolarDireita] = useState(false);

  const verificarScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const temOverflow = el.scrollWidth > el.clientWidth + 4;
    setPodeRolarEsquerda(el.scrollLeft > 4);
    setPodeRolarDireita(temOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    verificarScroll();
    window.addEventListener("resize", verificarScroll);
    return () => window.removeEventListener("resize", verificarScroll);
  }, [opcoes]);

  const rolarPara = (direcao: "esq" | "dir") => {
    const el = containerRef.current;
    if (!el) return;
    const quantia = direcao === "dir" ? 160 : -160;
    el.scrollBy({ left: quantia, behavior: "smooth" });
  };

  return (
    <div className="relative max-w-full group/alternador">
      {/* Indicador de rolagem à esquerda */}
      {podeRolarEsquerda && (
        <button
          type="button"
          onClick={() => rolarPara("esq")}
          aria-label="Rolar opções para esquerda"
          className="absolute left-0 inset-y-0 z-10 flex items-center justify-center w-6 rounded-l-xl bg-gradient-to-r from-background via-background/90 to-transparent text-muted-foreground hover:text-foreground cursor-pointer touch-manipulation"
        >
          <ChevronLeft size={14} />
        </button>
      )}

      <div
        ref={containerRef}
        onScroll={verificarScroll}
        className={cn(
          "flex items-center rounded-xl liquid-glass-pill p-1 shadow-minimal max-w-full overflow-x-auto select-none scroll-horizontal-suave touch-pan-x",
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
                  "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg liquid-press cursor-pointer select-none whitespace-nowrap shrink-0 transition-all",
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

      {/* Indicador de rolagem à direita */}
      {podeRolarDireita && (
        <button
          type="button"
          onClick={() => rolarPara("dir")}
          aria-label="Rolar opções para direita"
          className="absolute right-0 inset-y-0 z-10 flex items-center justify-center w-7 rounded-r-xl bg-gradient-to-l from-background via-background/90 to-transparent text-muted-foreground hover:text-foreground cursor-pointer touch-manipulation animate-pulse sm:animate-none"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
