import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Zap,
  SlidersHorizontal,
  Sparkles,
  Search,
  CheckSquare,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CabecalhoHomeProps {
  nomeUsuario?: string;
  aoAbrirCapturaRapida: () => void;
  aoCriarNota: () => void;
  aoCriarTarefa: () => void;
  aoAbrirPersonalizar: () => void;
  aoAbrirBusca: () => void;
}

export function CabecalhoHome({
  nomeUsuario = "Hugo",
  aoAbrirCapturaRapida,
  aoCriarNota,
  aoCriarTarefa,
  aoAbrirPersonalizar,
  aoAbrirBusca,
}: CabecalhoHomeProps) {
  const agora = new Date();

  const saudacao = useMemo(() => {
    const hora = agora.getHours();
    if (hora >= 5 && hora < 12) return "Bom dia";
    if (hora >= 12 && hora < 18) return "Boa tarde";
    return "Boa noite";
  }, [agora]);

  const dataFormatada = useMemo(() => {
    const diaSemana = format(agora, "EEEE", { locale: ptBR });
    const diaMes = format(agora, "d 'de' MMMM", { locale: ptBR });
    return `${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, ${diaMes}`;
  }, [agora]);

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-border/50">
      {/* Saudação e Data */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <span>{saudacao},</span>
            <span className="text-primary">{nomeUsuario}</span>
            <Sparkles size={20} className="text-amber-400 fill-amber-400 inline" />
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-2">
          <Clock size={14} className="opacity-70" />
          <span>{dataFormatada}</span>
        </p>
      </div>

      {/* Barra de Ações Rápidas do Topo */}
      <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
        {/* Atalho de Busca Global */}
        <Button
          variant="outline"
          size="sm"
          onClick={aoAbrirBusca}
          className="gap-2 text-xs text-muted-foreground hover:text-foreground bg-card/80 border-border/80 shadow-2xs rounded-xl h-9"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Buscar no acervo...</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-muted text-muted-foreground rounded border border-border">
            ⌘K
          </kbd>
        </Button>

        {/* Captura Rápida */}
        <Button
          variant="secondary"
          size="sm"
          onClick={aoAbrirCapturaRapida}
          className="gap-1.5 text-xs font-semibold rounded-xl h-9 shadow-2xs hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Zap size={14} className="text-amber-500 fill-amber-500" />
          <span>Captura</span>
        </Button>

        {/* Nova Tarefa */}
        <Button
          variant="outline"
          size="sm"
          onClick={aoCriarTarefa}
          className="gap-1.5 text-xs font-medium rounded-xl h-9 shadow-2xs bg-card/80 border-border/80 hover:text-foreground"
        >
          <CheckSquare size={14} className="text-emerald-500" />
          <span className="hidden sm:inline">Nova Tarefa</span>
        </Button>

        {/* Nova Nota */}
        <Button
          size="sm"
          onClick={aoCriarNota}
          className="gap-1.5 text-xs font-semibold rounded-xl h-9 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={14} />
          <span>Nova Nota</span>
        </Button>

        {/* Personalizar Painel */}
        <Button
          variant="ghost"
          size="icon"
          onClick={aoAbrirPersonalizar}
          className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
          title="Personalizar Widgets do Dashboard"
          aria-label="Personalizar Widgets do Dashboard"
        >
          <SlidersHorizontal size={16} />
        </Button>
      </div>
    </div>
  );
}
