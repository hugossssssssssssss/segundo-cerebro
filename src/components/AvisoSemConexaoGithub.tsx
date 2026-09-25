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
        "flex items-center justify-between gap-2 px-3 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 text-foreground transition-all duration-200 select-none",
        compacto ? "py-1" : "py-1.5",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <GitBranch size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-[11px] sm:text-xs font-medium text-foreground/85 truncate">
          {mensagem}
        </p>
      </div>

      <Link
        to="/config"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 text-[11px] font-semibold shrink-0 transition-colors cursor-pointer active:scale-95 touch-manipulation"
      >
        <Settings size={11} className="shrink-0" />
        <span>Conectar</span>
      </Link>
    </div>
  );
}
