import { Link } from "react-router-dom";
import { CheckSquare, FileText, ImageIcon, Target, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PulseKPIsProps {
  tarefasHoje: number;
  tarefasUrgentes: number;
  totalNotas: number;
  totalReferencias: number;
  progressoPdi: number;
  metasAtivas: number;
}

export function PulseKPIs({
  tarefasHoje,
  tarefasUrgentes,
  totalNotas,
  totalReferencias,
  progressoPdi,
  metasAtivas,
}: PulseKPIsProps) {
  const kpis = [
    {
      titulo: "Foco de Hoje",
      valor: tarefasHoje,
      subtexto: tarefasUrgentes > 0 ? `${tarefasUrgentes} urgente${tarefasUrgentes > 1 ? "s" : ""}` : "Em dia",
      subtextoCor: tarefasUrgentes > 0 ? "text-amber-500 font-semibold" : "text-emerald-500 font-medium",
      icone: CheckSquare,
      corIcone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      link: "/tarefas",
    },
    {
      titulo: "Notas no Acervo",
      valor: totalNotas,
      subtexto: "Documentos e rascunhos",
      subtextoCor: "text-muted-foreground",
      icone: FileText,
      corIcone: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      link: "/notas",
    },
    {
      titulo: "Referências Visuais",
      valor: totalReferencias,
      subtexto: "Imagens e inspirações",
      subtextoCor: "text-muted-foreground",
      icone: ImageIcon,
      corIcone: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      link: "/referencias",
    },
    {
      titulo: "Progresso PDI",
      valor: `${progressoPdi}%`,
      subtexto: `${metasAtivas} meta${metasAtivas === 1 ? "" : "s"} em andamento`,
      subtextoCor: "text-muted-foreground",
      icone: Target,
      corIcone: "text-rose-500 bg-rose-500/10 border-rose-500/20",
      link: "/pdi",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((kpi, idx) => {
        const Icone = kpi.icone;
        return (
          <Link
            key={idx}
            to={kpi.link}
            className="group relative p-3.5 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md hover:bg-card hover:border-border hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                {kpi.titulo}
              </span>
              <div
                className={cn(
                  "p-1.5 rounded-xl border flex items-center justify-center transition-transform duration-200 group-hover:scale-105",
                  kpi.corIcone
                )}
              >
                <Icone size={14} />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {kpi.valor}
              </span>
              <span className={cn("text-[11px] truncate max-w-[120px]", kpi.subtextoCor)}>
                {kpi.subtexto}
              </span>
            </div>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowUpRight size={13} className="text-muted-foreground" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
