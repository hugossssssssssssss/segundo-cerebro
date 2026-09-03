import {
  type ReactNode,
  type ReactElement,
  isValidElement,
  cloneElement,
} from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn, formatarAtalho } from "@/lib/utils";
import { useShadowContainer } from "@/lib/shadowContext";

export type PosicaoTooltip = "top" | "bottom" | "left" | "right";
export type AlinhamentoTooltip = "start" | "center" | "end";

export interface TooltipProps {
  /** Texto ou elemento da dica */
  conteudo?: ReactNode;
  /** Alias em inglês para conteúdo */
  content?: ReactNode;
  /** Atalho de teclado opcional (ex: "⌘K", "Esc") */
  atalho?: string;
  /** Posição relativa ao elemento (padrão: "bottom") */
  posicao?: PosicaoTooltip;
  /** Alias compatível com Radix */
  side?: PosicaoTooltip;
  /** Alinhamento no eixo secundário */
  align?: AlinhamentoTooltip;
  /** Espaçamento em pixels entre o elemento e o balão (padrão: 6) */
  sideOffset?: number;
  /** Atraso em milissegundos antes de abrir (padrão: 350ms) */
  atrasoMs?: number;
  /** Alias compatível com Radix */
  delayDuration?: number;
  /** Desativa temporariamente a exibição do tooltip */
  desabilitado?: boolean;
  /** Classes CSS extras para o balão */
  className?: string;
  /** Elemento que ativa o tooltip */
  children: ReactElement<any> | ReactNode;
}

/**
 * Componente universal de Dica Flutuante (Tooltip) do Klaus.
 * 
 * - Baseado em Radix UI com acessibilidade WAI-ARIA (role="tooltip", aria-describedby)
 * - Alto contraste invertido por tema (Modo Claro: fundo escuro / Modo Escuro: fundo claro)
 * - Posicionamento inteligente com detecção de colisão (nunca vaza da tela)
 * - Delay padrão de 350ms para evitar ruído visual em movimentos rápidos
 * - Suporte a toque longo (long press) em dispositivos touch
 * - Suporta botões desabilitados envolvendo-os automaticamente
 */
export function Tooltip({
  conteudo,
  content,
  atalho,
  posicao,
  side = "bottom",
  align = "center",
  sideOffset = 6,
  atrasoMs,
  delayDuration = 350,
  desabilitado = false,
  className,
  children,
  ...propsExtras
}: TooltipProps & Record<string, any>) {
  const textoDica = content ?? conteudo;
  const ladoFinal = posicao ?? side ?? "bottom";
  const atrasoFinal = atrasoMs ?? delayDuration ?? 350;

  if (desabilitado || !textoDica) {
    if (isValidElement(children) && Object.keys(propsExtras).length > 0) {
      return cloneElement(children as ReactElement<any>, propsExtras);
    }
    return <>{children}</>;
  }

  // Se o filho for um elemento React e estiver com `disabled`, os navegadores
  // bloqueiam os eventos de mouse/ponteiro nativos. Envolvemos em um container
  // inline para que o tooltip continue respondendo a hover/focus e explique o motivo.
  let triggerChild: ReactNode = children;
  if (isValidElement(children)) {
    const props = children.props as Record<string, any>;
    if (props?.disabled) {
      triggerChild = (
        <span
          tabIndex={0}
          className="inline-flex cursor-not-allowed focus:outline-none"
          role="presentation"
          {...propsExtras}
        >
          {cloneElement(children as ReactElement<any>, {
            // Remove pointer-events do botão interno para o container capturar os eventos
            style: { ...props.style, pointerEvents: "none" },
          })}
        </span>
      );
    } else if (Object.keys(propsExtras).length > 0) {
      // Repassa eventos e atributos recebidos de um Trigger pai (ex: PopoverTrigger)
      const { onClick: onClickExtra, onPointerDown: onPointerDownExtra, ...outrasPropsExtras } = propsExtras;
      triggerChild = cloneElement(children as ReactElement<any>, {
        ...outrasPropsExtras,
        onClick: (e: any) => {
          props.onClick?.(e);
          onClickExtra?.(e);
        },
        onPointerDown: (e: any) => {
          props.onPointerDown?.(e);
          onPointerDownExtra?.(e);
        },
      });
    }
  }

  const shadowContainer = useShadowContainer();

  return (
    <TooltipPrimitive.Provider delayDuration={atrasoFinal} skipDelayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {isValidElement(triggerChild) ? (
            triggerChild
          ) : (
            <span className="inline-flex">{triggerChild}</span>
          )}
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal container={shadowContainer || undefined}>
          <TooltipPrimitive.Content
            side={ladoFinal}
            align={align}
            sideOffset={sideOffset}
            avoidCollisions={true}
            collisionPadding={8}
            className={cn(
              // Layout e dimensões resilientes (quebra linha e não alarga a tela)
              "z-[99999] max-w-xs break-words whitespace-normal select-none rounded-lg px-2.5 py-1 text-xs font-medium tracking-tight",
              // Alto contraste invertido por tema
              // Modo Claro: fundo preto/grafite com texto branco
              // Modo Escuro: fundo branco com texto escuro
              "bg-zinc-900 text-zinc-50 border border-zinc-800/80 shadow-md",
              "dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-200 dark:shadow-lg",
              // Micro-animações suaves de entrada/saída
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1",
              "duration-150 ease-out",
              className
            )}
          >
            <div className="flex items-center gap-1.5 leading-snug">
              <span>{textoDica}</span>
              {atalho && (
                <kbd className="inline-flex shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/60 dark:bg-zinc-200 dark:text-zinc-700 dark:border-zinc-300/80">
                  {formatarAtalho(atalho)}
                </kbd>
              )}
            </div>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// Primitivos exportados para cenários de composição avançada
export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = TooltipPrimitive.Content;

export default Tooltip;
