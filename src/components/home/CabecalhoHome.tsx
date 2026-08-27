import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  SlidersHorizontal,
  Sparkles,
  Clock,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CabecalhoHomeProps {
  nomeUsuario: string;
  aoAbrirCatalogo: () => void;
  modoEdicao: boolean;
  aoAlternarModoEdicao: () => void;
  aoRestaurarPadrao: () => void;
}

export function CabecalhoHome({
  nomeUsuario,
  aoAbrirCatalogo,
  modoEdicao,
  aoAlternarModoEdicao,
  aoRestaurarPadrao,
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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
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

      {/* Ações de Layout & Widgets */}
      <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
        {modoEdicao && (
          <Button
            variant="ghost"
            size="sm"
            onClick={aoRestaurarPadrao}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-9 rounded-xl"
            title="Restaurar layout padrão dos widgets"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Restaurar Padrão</span>
          </Button>
        )}

        <Button
          variant={modoEdicao ? "default" : "outline"}
          size="sm"
          onClick={aoAlternarModoEdicao}
          className={cn(
            "gap-1.5 text-xs font-semibold rounded-xl h-9 shadow-2xs transition-all",
            !modoEdicao && "bg-card/80 border-border/80 hover:text-foreground"
          )}
          title="Alternar controles de tamanho e exclusão nos cartões"
        >
          <SlidersHorizontal size={14} />
          <span>{modoEdicao ? "Concluir Ajustes" : "Ajustar Tamanhos"}</span>
        </Button>

        <Button
          size="sm"
          onClick={aoAbrirCatalogo}
          className="gap-1.5 text-xs font-semibold rounded-xl h-9 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus size={15} />
          <span>Adicionar Widgets</span>
        </Button>
      </div>
    </div>
  );
}
