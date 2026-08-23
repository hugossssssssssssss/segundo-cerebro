import { cn } from "@/lib/utils";

interface PrismasFocoProps {
  estimativa: number;
  concluido: number;
  rodando?: boolean;
  tamanho?: number;
  className?: string;
}

export function PrismasFoco({
  estimativa,
  concluido,
  rodando = false,
  tamanho = 16,
  className,
}: PrismasFocoProps) {
  if (!estimativa || estimativa <= 0) return null;

  // Limita a exibição visual a no máximo 10 prismas para manter a harmonia da interface
  const total = Math.min(estimativa, 10);
  const concluidoLimpo = Math.min(concluido, total);

  return (
    <div 
      className={cn("flex items-center gap-1", className)} 
      title={`${concluido}/${estimativa} focos concluídos`}
    >
      {Array.from({ length: total }).map((_, idx) => {
        const isConcluido = idx < concluidoLimpo;
        const isProximoAtivo = idx === concluidoLimpo && rodando;

        return (
          <svg
            key={idx}
            width={tamanho}
            height={tamanho}
            viewBox="0 0 20 20"
            className={cn(
              "overflow-visible transition-all duration-300 select-none",
              isConcluido && "drop-shadow-[0_0_4px_rgba(139,92,246,0.35)]",
              isProximoAtivo && "scale-105"
            )}
          >
            <defs>
              <linearGradient id={`grad-prisma-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <polygon
              points="10,2 17,6 17,14 10,18 3,14 3,6"
              className={cn(
                "transition-all duration-300 stroke-[1.5] stroke-linejoin-round",
                isConcluido
                  ? "fill-[url(#grad-prisma-" + idx + ")] stroke-indigo-400"
                  : isProximoAtivo
                  ? "fill-indigo-500/10 stroke-indigo-500 animate-pulse"
                  : "fill-muted/20 stroke-muted-foreground/30"
              )}
            />
          </svg>
        );
      })}
    </div>
  );
}
