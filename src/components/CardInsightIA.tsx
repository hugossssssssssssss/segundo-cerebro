import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardInsightIAProps {
  titulo?: string;
  conteudo: ReactNode;
  rotulo?: string;
  className?: string;
  acao?: ReactNode;
}

export function CardInsightIA({
  titulo,
  conteudo,
  rotulo = "AI Insights",
  className,
  acao,
}: CardInsightIAProps) {
  return (
    <div
      className={cn(
        "ai-insight-box rounded-2xl p-3.5 sm:p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs transition-all",
        className
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="h-6 w-6 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <Sparkles size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              {rotulo}
            </span>
            {titulo && (
              <span className="text-xs font-semibold text-foreground truncate">
                {titulo}
              </span>
            )}
          </div>
          <div className="text-xs text-foreground/90 leading-relaxed font-medium">
            {conteudo}
          </div>
        </div>
      </div>

      {acao && <div className="shrink-0 flex items-center sm:ml-auto">{acao}</div>}
    </div>
  );
}
