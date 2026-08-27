import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, SlidersHorizontal, RotateCcw } from "lucide-react";
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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
      {/* Saudação e Data sem emojis */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {saudacao}, {nomeUsuario}.
        </h1>
        <p className="text-xs text-muted-foreground font-normal">
          {dataFormatada}
        </p>
      </div>

      {/* Ações de Layout & Widgets */}
      <div className="flex items-center gap-2">
        {modoEdicao && (
          <Button
            variant="ghost"
            size="sm"
            onClick={aoRestaurarPadrao}
            className="text-xs text-muted-foreground hover:text-foreground h-8 rounded-lg"
          >
            <RotateCcw size={12} className="mr-1.5" />
            Restaurar Padrão
          </Button>
        )}

        <Button
          variant={modoEdicao ? "default" : "outline"}
          size="sm"
          onClick={aoAlternarModoEdicao}
          className={cn(
            "text-xs font-medium rounded-lg h-8 transition-all",
            !modoEdicao && "bg-card border-border/80 text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal size={13} className="mr-1.5" />
          {modoEdicao ? "Concluir Ajustes" : "Ajustar Grade"}
        </Button>

        <Button
          size="sm"
          onClick={aoAbrirCatalogo}
          className="text-xs font-semibold rounded-lg h-8 gap-1.5 shadow-2xs cursor-pointer"
        >
          <Plus size={14} />
          <span>Adicionar Widget</span>
        </Button>
      </div>
    </div>
  );
}
