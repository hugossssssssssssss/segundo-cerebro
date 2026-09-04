import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { Botao } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface BarraAcoesLoteProps {
  /** Quantidade total de itens selecionados */
  totalSelecionados: number;
  /** Nome do item no singular (ex: "tarefa", "nota", "entrega", "referência"). Padrão: "item" */
  rotuloItem?: string;
  /** Função disparada para desmarcar todos os itens */
  aoLimparSelecao: () => void;
  /** Botões ou controles de ação a serem exibidos na barra */
  children: React.ReactNode;
  /** Conteúdo extra à esquerda ou à direita (ex: botão Selecionar Todos) */
  extraAcoes?: React.ReactNode;
  /** Classes CSS adicionais para o container */
  className?: string;
}

export interface BotaoAcaoLoteProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tooltip explicativo da ação */
  tooltip?: string;
  /** Variante visual do botão */
  variante?: "primario" | "neutro" | "fantasma" | "perigo";
  /** Ícone da ação */
  icone?: React.ReactNode;
  /** Rótulo textual opcional ao lado do ícone */
  rotulo?: string;
  /** Posição do tooltip (padrão: "top") */
  posicaoTooltip?: "top" | "bottom" | "left" | "right";
}

/**
 * Botão formatado para uso dentro da BarraAcoesLote.
 */
export function BotaoAcaoLote({
  tooltip,
  variante = "neutro",
  icone,
  rotulo,
  className,
  posicaoTooltip = "top",
  disabled,
  ...props
}: BotaoAcaoLoteProps) {
  const botao = (
    <Botao
      tamanho={rotulo ? "pequeno" : "icone"}
      variante={variante}
      disabled={disabled}
      className={cn(
        "h-8 transition-all shrink-0 text-xs font-medium",
        rotulo ? "px-2.5 gap-1.5" : "w-8 p-0",
        className
      )}
      {...props}
    >
      {icone}
      {rotulo && <span>{rotulo}</span>}
    </Botao>
  );

  if (tooltip && !disabled) {
    return (
      <Tooltip conteudo={tooltip} posicao={posicaoTooltip}>
        {botao}
      </Tooltip>
    );
  }

  return botao;
}

/**
 * Barra Flutuante Universal de Ações em Lote do Klaus (Design System).
 * Exibida dinamicamente quando há um ou mais itens selecionados em listas, quadros ou tabelas.
 */
export function BarraAcoesLote({
  totalSelecionados,
  rotuloItem = "item",
  aoLimparSelecao,
  children,
  extraAcoes,
  className,
}: BarraAcoesLoteProps) {
  // Atalho de teclado: tecla Esc desmarca a seleção ativa
  useEffect(() => {
    if (totalSelecionados <= 0) return;

    function lidarComTecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        aoLimparSelecao();
      }
    }

    window.addEventListener("keydown", lidarComTecla);
    return () => window.removeEventListener("keydown", lidarComTecla);
  }, [totalSelecionados, aoLimparSelecao]);

  if (totalSelecionados <= 0) {
    return null;
  }

  // Tratamento de pluralização amigável
  const plural = totalSelecionados > 1;
  const textoPluralItem =
    rotuloItem === "item"
      ? plural
        ? "itens"
        : "item"
      : rotuloItem.endsWith("m")
      ? plural
        ? `${rotuloItem.slice(0, -1)}ns`
        : rotuloItem
      : plural
      ? `${rotuloItem}s`
      : rotuloItem;

  const textoSufixo = rotuloItem.endsWith("a")
    ? plural
      ? "selecionadas"
      : "selecionada"
    : plural
    ? "selecionados"
    : "selecionado";

  return (
    <div
      role="toolbar"
      aria-label="Ações em lote"
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-2 rounded-2xl",
        "border border-border/80 bg-card/95 backdrop-blur-xl px-3.5 py-2 shadow-2xl",
        "animate-in fade-in slide-in-from-bottom-4 duration-200",
        "max-w-[calc(100vw-2rem)]",
        className
      )}
    >
      {/* Contador de itens selecionados */}
      <div className="flex items-center gap-1.5 px-1 shrink-0 select-none">
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold px-1.5">
          {totalSelecionados}
        </span>
        <span className="text-xs font-semibold text-foreground whitespace-nowrap hidden sm:inline">
          {textoPluralItem} {textoSufixo}
        </span>
      </div>

      <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />

      {/* Ações customizadas passadas pela tela */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
        {children}
      </div>

      {extraAcoes && (
        <>
          <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />
          <div className="flex items-center gap-1">{extraAcoes}</div>
        </>
      )}

      {/* Botão para desmarcar seleção */}
      <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />
      <Tooltip conteudo="Desmarcar seleção (Esc)" posicao="top">
        <button
          type="button"
          onClick={aoLimparSelecao}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 cursor-pointer"
          aria-label="Desmarcar seleção"
        >
          <X size={14} />
        </button>
      </Tooltip>
    </div>
  );
}
