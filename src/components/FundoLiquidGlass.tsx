/**
 * Fundo de Malha Ambiente Fluida (Liquid Glass Atmosphere)
 * Cria uma atmosfera óptica suave no fundo da tela, permitindo que todos
 * os elementos de vidro líquido (liquid glass) refratem e emitam brilho especular real,
 * especialmente em telas de computador (desktop).
 */
export function FundoLiquidGlass() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* Orb Superior Esquerdo (Violeta / Índigo) */}
      <div className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] min-w-[320px] min-h-[320px] max-w-[850px] max-h-[850px] rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/8 to-transparent dark:from-indigo-500/15 dark:via-purple-600/10 dark:to-transparent blur-[90px] sm:blur-[140px] transform-gpu animate-pulse [animation-duration:12s]" />

      {/* Orb Centro / Superior Direito (Ciano / Azul Oceano) */}
      <div className="absolute top-[10%] -right-[15%] w-[50vw] h-[50vw] min-w-[300px] min-h-[300px] max-w-[750px] max-h-[750px] rounded-full bg-gradient-to-bl from-cyan-400/10 via-sky-500/8 to-transparent dark:from-sky-500/12 dark:via-teal-500/8 dark:to-transparent blur-[80px] sm:blur-[130px] transform-gpu" />

      {/* Orb Inferior Centro (Esmeralda / Âmbar Sutil) */}
      <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] min-w-[350px] min-h-[350px] max-w-[900px] max-h-[900px] rounded-full bg-gradient-to-tr from-violet-400/8 via-fuchsia-400/5 to-transparent dark:from-purple-900/15 dark:via-indigo-950/10 dark:to-transparent blur-[100px] sm:blur-[160px] transform-gpu" />
    </div>
  );
}
