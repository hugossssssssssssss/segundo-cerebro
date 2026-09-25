import { cn } from "@/lib/utils";

interface LogoKlausProps {
  tamanho?: number;
  className?: string;
  comTexto?: boolean;
}

/**
 * Logo oficial do Klaus (Segundo Cérebro).
 * Utiliza gradiente vibrante via classes CSS (evitando bugs de colisão de <defs> SVG no mobile)
 * e o monograma "K" em linhas geométricas brancas de alta nitidez.
 */
export function LogoKlaus({ tamanho = 28, className, comTexto = false }: LogoKlausProps) {
  // Proporção de raio e padding conforme o tamanho
  const raio = Math.max(6, Math.round(tamanho * 0.28));

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <div
        style={{
          width: tamanho,
          height: tamanho,
          borderRadius: `${raio}px`,
        }}
        className="shrink-0 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-xs flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95"
        aria-label="Logo Klaus"
      >
        <svg
          width={Math.round(tamanho * 0.65)}
          height={Math.round(tamanho * 0.65)}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-xs"
        >
          {/* Haste Vertical do K */}
          <rect x="6" y="6" width="6.5" height="28" rx="3.25" fill="#FFFFFF" />

          {/* Braço Superior do K */}
          <path
            d="M 10 20 L 26.5 7.5 C 28.5 6 31 8 29.5 10 L 15.5 22 Z"
            fill="#FFFFFF"
          />

          {/* Braço Inferior do K */}
          <path
            d="M 12 18.5 L 28 32 C 29.8 33.5 28 35.5 26 34 L 10.5 21 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {comTexto && (
        <span className="font-bold tracking-tight text-foreground text-base">
          Klaus
        </span>
      )}
    </div>
  );
}
