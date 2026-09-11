/**
 * Fundo e Filtros Ópticos de Vidro Líquido (Apple Liquid Glass Engine)
 * - Fundo neutro e limpo (sem esferas coloridas intrusivas)
 * - Filtros SVG de fusão viscosa/derretimento (Gooey / Liquid Refraction)
 */
export function FundoLiquidGlass() {
  return (
    <>
      {/* Filtros SVG Globais para Fusão Viscosa / Efeito Derretendo */}
      <svg
        className="absolute w-0 h-0 pointer-events-none opacity-0 overflow-hidden"
        aria-hidden="true"
      >
        <defs>
          {/* Efeito de fusão de gotas líquidas / Dynamic Island Gooey */}
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

          {/* Refração e micro-dispersão óptica de vidro líquido */}
          <filter id="klaus-liquid-refract">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.03"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Iluminação ambiente Apple ultra-limpa e sutil (apenas 2% de gradiente atmosférico) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      >
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/[0.025] to-transparent dark:from-primary/[0.04]" />
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-primary/[0.02] to-transparent dark:from-primary/[0.03]" />
      </div>
    </>
  );
}
