import * as React from "react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export { FundoLiquidGlass } from "./FundoLiquidGlass";

interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variante?: "padrao" | "elevado" | "painel" | "pill";
  spotlight?: boolean;
}

/**
 * Componente Container Liquid Glass
 * Aplica o sistema de refração óptica e brilho especular dinâmico (spotlight sob o cursor no desktop).
 */
export const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
  ({ children, className, variante = "padrao", spotlight = true, onMouseMove, onMouseLeave, ...props }, ref) => {
    const localRef = useRef<HTMLDivElement>(null);
    const resolvedRef = (ref || localRef) as React.RefObject<HTMLDivElement>;

    const lidarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (spotlight && resolvedRef.current) {
        const rect = resolvedRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        resolvedRef.current.style.setProperty("--mouse-x", `${x}px`);
        resolvedRef.current.style.setProperty("--mouse-y", `${y}px`);
      }
      if (onMouseMove) onMouseMove(e);
    };

    const lidarMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      if (spotlight && resolvedRef.current) {
        resolvedRef.current.style.removeProperty("--mouse-x");
        resolvedRef.current.style.removeProperty("--mouse-y");
      }
      if (onMouseLeave) onMouseLeave(e);
    };

    const varianteClasse =
      variante === "elevado"
        ? "liquid-glass-card"
        : variante === "painel"
          ? "liquid-glass"
          : variante === "pill"
            ? "liquid-glass-pill"
            : "liquid-glass-card";

    return (
      <div
        ref={resolvedRef}
        onMouseMove={lidarMouseMove}
        onMouseLeave={lidarMouseLeave}
        className={cn(
          varianteClasse,
          spotlight && "relative overflow-hidden group/liquid",
          className
        )}
        {...props}
      >
        {/* Spotlight dinâmico que segue o mouse suavemente em desktops */}
        {spotlight && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-px opacity-0 group-hover/liquid:opacity-100 transition-opacity duration-300 rounded-[inherit] hidden sm:block z-0"
            style={{
              background: `radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.12), transparent 80%)`,
            }}
          />
        )}
        <div className="relative z-1">{children}</div>
      </div>
    );
  }
);

LiquidGlass.displayName = "LiquidGlass";
