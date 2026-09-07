import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Bell, 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

export interface DadosDataAvancada {
  dataInicio?: string;
  dataFim?: string;
  horario?: string;
  lembrete?: string;
}

const OPCOES_LEMBRETE = [
  { id: "nenhum", rotulo: "Sem lembrete" },
  { id: "no-momento", rotulo: "No momento do evento" },
  { id: "5-min", rotulo: "5 minutos antes" },
  { id: "15-min", rotulo: "15 minutos antes" },
  { id: "1-hora", rotulo: "1 hora antes" },
  { id: "1-dia", rotulo: "1 dia antes" },
];

interface SeletorDataAvancadaProps {
  dados: DadosDataAvancada;
  aoSalvar: (novosDados: DadosDataAvancada) => void;
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  children: React.ReactNode;
}

export function SeletorDataAvancada({
  dados,
  aoSalvar,
  aberto,
  aoMudarAberto,
  children,
}: SeletorDataAvancadaProps) {
  const [temIntervalo, setTemIntervalo] = useState(Boolean(dados.dataFim));
  const [temHorario, setTemHorario] = useState(Boolean(dados.horario));
  const [horaInput, setHoraInput] = useState(dados.horario || "09:00");
  const [lembreteSelecionado, setLembreteSelecionado] = useState(dados.lembrete || "nenhum");

  useEffect(() => {
    if (aberto) {
      setTemIntervalo(Boolean(dados.dataFim));
      setTemHorario(Boolean(dados.horario));
      setHoraInput(dados.horario || "09:00");
      setLembreteSelecionado(dados.lembrete || "nenhum");
    }
  }, [aberto, dados]);

  const dateInicioObj = dados.dataInicio
    ? new Date(dados.dataInicio.includes("T") ? dados.dataInicio : `${dados.dataInicio}T00:00:00`)
    : undefined;

  const dateFimObj = dados.dataFim
    ? new Date(dados.dataFim.includes("T") ? dados.dataFim : `${dados.dataFim}T00:00:00`)
    : undefined;

  const rangeObj: DateRange | undefined = dateInicioObj
    ? { from: dateInicioObj, to: dateFimObj || dateInicioObj }
    : undefined;

  const handleSelectDataUnica = (d: Date | undefined) => {
    if (d) {
      const formatada = format(d, "yyyy-MM-dd");
      aoSalvar({
        ...dados,
        dataInicio: formatada,
        dataFim: undefined,
        horario: temHorario ? horaInput : undefined,
        lembrete: lembreteSelecionado !== "nenhum" ? lembreteSelecionado : undefined,
      });
    } else {
      aoSalvar({ ...dados, dataInicio: undefined, dataFim: undefined });
    }
  };

  const handleSelectRange = (range: DateRange | undefined) => {
    if (range?.from) {
      const ini = format(range.from, "yyyy-MM-dd");
      const fim = range.to ? format(range.to, "yyyy-MM-dd") : undefined;
      aoSalvar({
        ...dados,
        dataInicio: ini,
        dataFim: fim !== ini ? fim : undefined,
        horario: temHorario ? horaInput : undefined,
        lembrete: lembreteSelecionado !== "nenhum" ? lembreteSelecionado : undefined,
      });
    } else {
      aoSalvar({ ...dados, dataInicio: undefined, dataFim: undefined });
    }
  };

  const handleToggleIntervalo = (ativar: boolean) => {
    setTemIntervalo(ativar);
    if (!ativar) {
      aoSalvar({ ...dados, dataFim: undefined });
    }
  };

  const handleToggleHorario = (ativar: boolean) => {
    setTemHorario(ativar);
    aoSalvar({
      ...dados,
      horario: ativar ? horaInput : undefined,
    });
  };

  const handleHoraChange = (novaHora: string) => {
    setHoraInput(novaHora);
    if (temHorario && dados.dataInicio) {
      aoSalvar({
        ...dados,
        horario: novaHora,
      });
    }
  };

  const handleLembreteChange = (novoLembrete: string) => {
    setLembreteSelecionado(novoLembrete);
    aoSalvar({
      ...dados,
      lembrete: novoLembrete !== "nenhum" ? novoLembrete : undefined,
    });
  };

  const limpar = () => {
    aoSalvar({
      dataInicio: undefined,
      dataFim: undefined,
      horario: undefined,
      lembrete: undefined,
    });
    aoMudarAberto(false);
  };

  return (
    <Popover open={aberto} onOpenChange={aoMudarAberto}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 shadow-2xl border-border divide-y divide-border/50"
        align="start"
        onInteractOutside={() => aoMudarAberto(false)}
      >
        <div className="p-1">
          {temIntervalo ? (
            <Calendar
              mode="range"
              selected={rangeObj}
              onSelect={handleSelectRange}
              locale={ptBR}
            />
          ) : (
            <Calendar
              mode="single"
              selected={dateInicioObj}
              onSelect={handleSelectDataUnica}
              locale={ptBR}
            />
          )}
        </div>

        {/* Controles de Intervalo, Horário e Lembrete */}
        <div className="p-3 space-y-2.5 bg-accent/20 text-xs">
          {/* Toggle Data Final / Intervalo */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-foreground">
              <CalendarIcon size={13} className="text-muted-foreground" />
              <span>Incluir data final (intervalo)</span>
            </label>
            <input
              type="checkbox"
              checked={temIntervalo}
              onChange={(e) => handleToggleIntervalo(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          {/* Toggle Horário */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-foreground">
              <Clock size={13} className="text-muted-foreground" />
              <span>Incluir horário</span>
            </label>
            <input
              type="checkbox"
              checked={temHorario}
              onChange={(e) => handleToggleHorario(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          {temHorario && (
            <div className="flex items-center gap-2 pl-5 pt-0.5">
              <span className="text-[11px] text-muted-foreground">Hora:</span>
              <input
                type="time"
                value={horaInput}
                onChange={(e) => handleHoraChange(e.target.value)}
                className="bg-card border border-border text-xs px-2 py-0.5 rounded outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          )}

          {/* Lembrete */}
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Bell size={13} className="text-muted-foreground" />
              <span>Lembrete</span>
            </div>
            <select
              value={lembreteSelecionado}
              onChange={(e) => handleLembreteChange(e.target.value)}
              className="bg-card border border-border text-[11px] px-2 py-0.5 rounded outline-none cursor-pointer focus:ring-1 focus:ring-primary"
            >
              {OPCOES_LEMBRETE.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-2 flex items-center justify-between bg-card">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={limpar}
            className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2"
          >
            Limpar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => aoMudarAberto(false)}
            className="h-7 text-xs px-3"
          >
            Concluir
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function formatarDataExibicao(
  dataInicio?: string,
  dataFim?: string,
  horario?: string
): { texto: string; ehVazio: boolean } {
  if (!dataInicio) return { texto: "Vazio", ehVazio: true };

  try {
    const parsedIni = parseISO(dataInicio.includes("T") ? dataInicio : `${dataInicio}T00:00:00`);
    const strIni = format(parsedIni, "dd 'de' MMM, yyyy", { locale: ptBR });

    if (dataFim && dataFim !== dataInicio) {
      const parsedFim = parseISO(dataFim.includes("T") ? dataFim : `${dataFim}T00:00:00`);
      const strFim = format(parsedFim, "dd 'de' MMM, yyyy", { locale: ptBR });
      return {
        texto: `${strIni} → ${strFim}${horario ? ` às ${horario}` : ""}`,
        ehVazio: false,
      };
    }

    return {
      texto: `${strIni}${horario ? ` às ${horario}` : ""}`,
      ehVazio: false,
    };
  } catch {
    return { texto: dataInicio, ehVazio: false };
  }
}
