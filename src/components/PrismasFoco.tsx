import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

interface PrismasFocoProps {
  estimativa?: number; // Mapeia para a propriedade "Pomodoro" do frontmatter (1 a 5)
  concluido: number; // Ciclos concluídos inteiros (tempo focado / 25min)
  fraturados?: number; // Ciclos interrompidos
  rodando?: boolean; // Se o timer está rodando
  tamanho?: number; // Largura/altura em pixels
  className?: string;
}

export function PrismasFoco({
  estimativa = 0,
  concluido,
  fraturados = 0,
  rodando = false,
  tamanho = 16,
  className,
}: PrismasFocoProps) {
  const totalSlots = 5;
  const estimativaLimpa = Math.min(Math.max(0, estimativa), totalSlots);
  const concluidoLimpo = Math.min(Math.max(0, concluido), totalSlots);
  
  // Limita as fraturas para não transbordar o total de slots restantes
  const fraturadosLimpos = Math.min(Math.max(0, fraturados), totalSlots - concluidoLimpo);

  const descricaoTooltip = `${concluidoLimpo} completos, ${fraturadosLimpos} quebrados de ${estimativaLimpa} estimados`;

  return (
    <Tooltip conteudo={descricaoTooltip}>
      <div 
        className={cn("flex items-center gap-1.5 cursor-default", className)} 
        aria-label={descricaoTooltip}
      >
      {Array.from({ length: totalSlots }).map((_, idx) => {
        const isConcluido = idx < concluidoLimpo;
        const isFraturado = !isConcluido && idx < (concluidoLimpo + fraturadosLimpos);
        const isProximoAtivo = !isConcluido && !isFraturado && idx === (concluidoLimpo + fraturadosLimpos) && rodando;
        const isEstimado = idx < estimativaLimpa;

        return (
          <svg
            key={idx}
            width={tamanho}
            height={tamanho}
            viewBox="0 0 20 20"
            className={cn(
              "overflow-visible transition-all duration-300 select-none",
              isConcluido && "drop-shadow-[0_0_4px_rgba(99,102,241,0.35)]",
              isFraturado && "drop-shadow-[0_0_2px_rgba(239,68,68,0.2)]",
              isProximoAtivo && "scale-105"
            )}
          >
            <defs>
              <linearGradient id={`grad-prisma-ativo-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>

            {isFraturado ? (
              // Prisma Fraturado: Duas metades separadas por uma fissura e levemente desalinhadas (rotacionadas)
              <g className="transition-all duration-300 origin-center">
                {/* Metade Esquerda */}
                <polygon
                  points="9,2 2,5.5 2,13.5 8.5,17.5"
                  className="fill-rose-500/10 stroke-rose-400 stroke-[1.2] stroke-linejoin-round"
                  style={{ transform: "rotate(-3deg)", transformOrigin: "9px 10px" }}
                />
                {/* Metade Direita */}
                <polygon
                  points="11,2.5 18,6 18,14 11.5,17.5"
                  className="fill-rose-500/10 stroke-rose-400 stroke-[1.2] stroke-linejoin-round"
                  style={{ transform: "rotate(3deg)", transformOrigin: "11px 10px" }}
                />
              </g>
            ) : (
              // Prisma Inteiro: Renderiza o hexágono vertical clássico
              <polygon
                points="10,2 17,6 17,14 10,18 3,14 3,6"
                className={cn(
                  "transition-all duration-300 stroke-[1.5] stroke-linejoin-round",
                  isConcluido
                    ? "fill-[url(#grad-prisma-ativo-" + idx + ")] stroke-indigo-400"
                    : isProximoAtivo
                    ? "fill-indigo-500/10 stroke-indigo-500 animate-pulse"
                    : isEstimado
                    ? "fill-muted/5 stroke-muted-foreground/30"
                    : "fill-none stroke-muted-foreground/15" // Apagado (não estimado)
                )}
              />
            )}
          </svg>
        );
      })}
      </div>
    </Tooltip>
  );
}
