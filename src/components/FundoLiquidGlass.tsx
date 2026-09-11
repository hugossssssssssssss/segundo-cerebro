/**
 * Filtros Ópticos de Vidro Líquido
 * Fornece filtros SVG para refração de luz e efeitos ópticos no app.
 */
export function FundoLiquidGlass() {
  return (
    <svg
      className="absolute w-0 h-0 pointer-events-none opacity-0 overflow-hidden"
      aria-hidden="true"
    >
      <defs>
        <filter id="klaus-liquid-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}
