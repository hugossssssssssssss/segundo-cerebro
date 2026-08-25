import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type ReactElement,
  cloneElement,
  isValidElement,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type PosicaoTooltip = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  conteudo: ReactNode;
  atalho?: string;
  posicao?: PosicaoTooltip;
  atrasoMs?: number;
  desabilitado?: boolean;
  className?: string;
  children: ReactElement<any>;
}

/**
 * Componente universal de Dica Flutuante (Tooltip) do Klaus.
 * Renderiza via React Portal no body com posicionamento inteligente,
 * suporte a atalhos de teclado e micro-animação suave.
 */
export function Tooltip({
  conteudo,
  atalho,
  posicao = "top",
  atrasoMs = 150,
  desabilitado = false,
  className,
  children,
}: TooltipProps) {
  const [visivel, setVisivel] = useState(false);
  const [coordenadas, setCoordenadas] = useState<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const calcularPosicao = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const espaco = 8;

    let x = 0;
    let y = 0;

    switch (posicao) {
      case "top":
        x = rect.left + rect.width / 2;
        y = rect.top - espaco;
        break;
      case "bottom":
        x = rect.left + rect.width / 2;
        y = rect.bottom + espaco;
        break;
      case "left":
        x = rect.left - espaco;
        y = rect.top + rect.height / 2;
        break;
      case "right":
        x = rect.right + espaco;
        y = rect.top + rect.height / 2;
        break;
    }

    setCoordenadas({ x, y });
  };

  const handleMouseEnter = () => {
    if (desabilitado || !conteudo) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      calcularPosicao();
      setVisivel(true);
    }, atrasoMs);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisivel(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Reposiciona caso haja scroll ou resize da janela enquanto visível
  useEffect(() => {
    if (!visivel) return;
    const handleScroll = () => calcularPosicao();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [visivel, posicao]);

  if (!isValidElement(children)) {
    return children;
  }

  const childProps = (children.props || {}) as Record<string, any>;

  // Clona o elemento filho para anexar os manipuladores de eventos e a referência
  const triggerElement = cloneElement(children as ReactElement<any>, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      // Preserva ref original se existir
      const { ref } = children as any;
      if (typeof ref === "function") ref(node);
      else if (ref && typeof ref === "object") (ref as any).current = node;
    },
    onMouseEnter: (e: React.MouseEvent) => {
      childProps.onMouseEnter?.(e);
      handleMouseEnter();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      childProps.onMouseLeave?.(e);
      handleMouseLeave();
    },
    onFocus: (e: React.FocusEvent) => {
      childProps.onFocus?.(e);
      handleMouseEnter();
    },
    onBlur: (e: React.FocusEvent) => {
      childProps.onBlur?.(e);
      handleMouseLeave();
    },
  } as any);

  const getTransformClass = () => {
    switch (posicao) {
      case "top":
        return "-translate-x-1/2 -translate-y-full";
      case "bottom":
        return "-translate-x-1/2 translate-y-0";
      case "left":
        return "-translate-x-full -translate-y-1/2";
      case "right":
        return "translate-x-0 -translate-y-1/2";
    }
  };

  return (
    <>
      {triggerElement}
      {visivel && coordenadas && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            left: `${coordenadas.x}px`,
            top: `${coordenadas.y}px`,
            zIndex: 9999999,
          }}
          className={cn(
            "pointer-events-none flex items-center gap-1.5 rounded-lg border border-border/80 bg-popover/95 px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap",
            getTransformClass(),
            className
          )}
        >
          <span>{conteudo}</span>
          {atalho && (
            <kbd className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground border border-border/60">
              {atalho}
            </kbd>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

export default Tooltip;
