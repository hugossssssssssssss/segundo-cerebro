import { Link } from "react-router-dom";
import { GitBranch, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvisoSemConexaoGithubProps {
  className?: string;
  mensagem?: string;
  compacto?: boolean;
}

/**
 * Componente visual discreto e moderno para indicar ausência de conexão com o GitHub.
 * Substitui telas de erro vazias que bloqueavam o aplicativo inteiro.
 */
export function AvisoSemConexaoGithub({
  className,
  mensagem = "Repositório GitHub não conectado. Conecte em Ajustes para carregar e salvar suas notas e tarefas.",
  compacto = false,
}: AvisoSemConexaoGithubProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10 text-foreground transition-all duration-200 shadow-2xs backdrop-blur-xs select-none",
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
          <GitBranch size={16} />
        </div>
        <div className="min-w-0">
          <p className={cn("text-xs font-medium text-foreground/90 leading-tight", compacto ? "truncate" : "line-clamp-2 sm:line-clamp-1")}>
            {mensagem}
          </p>
          <span className="text-[10px] text-muted-foreground hidden sm:inline-block mt-0.5">
            Suas ferramentas locais continuam funcionando normalmente.
          </span>
        </div>
      </div>

      <Link
        to="/config"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 text-xs font-semibold shrink-0 transition-colors cursor-pointer active:scale-95 touch-manipulation"
      >
        <Settings size={13} className="shrink-0" />
        <span>Conectar</span>
      </Link>
    </div>
  );
}
