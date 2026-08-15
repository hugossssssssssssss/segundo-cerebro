import { cn } from "@/lib/utils";

interface LogoKlausProps {
  tamanho?: number;
  className?: string;
  comTexto?: boolean;
}

export function LogoKlaus({ tamanho = 28, className, comTexto = false }: LogoKlausProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <svg
        width={tamanho}
        height={tamanho}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm transition-transform duration-200 hover:scale-105"
        aria-label="Logo Klaus"
      >
        <defs>
          <linearGradient id="klaus-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#D946EF" />
          </linearGradient>
          <linearGradient id="klaus-k-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F1F5F9" />
          </linearGradient>
        </defs>

        {/* Fundo com gradiente vibrante */}
        <rect width="64" height="64" rx="16" fill="url(#klaus-bg-grad)" />

        {/* Haste Vertical da letra K */}
        <rect x="16" y="16" width="8" height="32" rx="4" fill="url(#klaus-k-grad)" />

        {/* Braço Superior da letra K */}
        <path
          d="M 21 31 L 39.5 16.5 C 41.5 15 44 17 42.5 19 L 27 33.5 Z"
          fill="url(#klaus-k-grad)"
        />

        {/* Braço Inferior da letra K */}
        <path
          d="M 23 30 L 41.5 45 C 43.5 46.5 41.5 49 39.5 47.5 L 21 32.5 Z"
          fill="url(#klaus-k-grad)"
        />

        {/* Detalhe de acento visual (ponto minimalista no topo) */}
        <circle cx="45" cy="18" r="3" fill="#FFFFFF" opacity="0.9" />
      </svg>

      {comTexto && (
        <span className="font-bold tracking-tight text-foreground text-base">
          Klaus
        </span>
      )}
    </div>
  );
}
