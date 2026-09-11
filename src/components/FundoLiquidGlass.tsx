/**
 * Motor de Fundo Óptico Liquid Glass e Filtros de Fusão Viscosa
 * - Malha de refração fluida contínua (dá profundidade real ao vidro líquido sem poluição)
 * - Filtros SVG de fusão viscosa (Gooey Melting / Refração Líquida)
 */
export function FundoLiquidGlass() {
  return (
    <>
      {/* Filtros SVG Globais para Fusão Viscosa / Derretimento */}
      <svg
        className="absolute w-0 h-0 pointer-events-none opacity-0 overflow-hidden"
        aria-hidden="true"
      >
        <defs>
          {/* Fusão de gotas líquidas / Dynamic Island Gooey */}
          <filter id="klaus-liquid-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>

          {/* Refração e dispersão cromática de vidro líquido */}
          <filter id="klaus-liquid-refract">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="3"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Malha fluida de vidro líquido contínua (Apple Liquid Mesh) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      >
        {/* Onda de luz fluida superior */}
        <div className="absolute -top-[10%] left-1/4 w-[60vw] h-[400px] rounded-full bg-gradient-to-b from-indigo-500/[0.07] via-sky-400/[0.04] to-transparent dark:from-indigo-500/[0.12] dark:via-purple-600/[0.06] dark:to-transparent blur-[80px] transform-gpu animate-pulse [animation-duration:8s]" />

        {/* Onda de luz fluida inferior */}
        <div className="absolute -bottom-[10%] right-1/4 w-[50vw] h-[350px] rounded-full bg-gradient-to-t from-cyan-400/[0.06] via-violet-500/[0.04] to-transparent dark:from-cyan-500/[0.1] dark:via-indigo-900/[0.08] dark:to-transparent blur-[90px] transform-gpu" />

        {/* Gradiente de profundidade sutil */}
        <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/[0.02] dark:to-black/[0.25]" />
      </div>
    </>
  );
}
