import { GitMerge, Layers } from "lucide-react";

export interface ProcessoItemHome {
  caminho: string;
  titulo: string;
  etapasTotal?: number;
  cardsTotal?: number;
}

interface WidgetProcessosCRMProps {
  processos: ProcessoItemHome[];
  aoAbrirProcesso: (caminho: string) => void;
}

export function WidgetProcessosCRM({
  processos,
  aoAbrirProcesso,
}: WidgetProcessosCRMProps) {
  const lista = processos.slice(0, 3);

  return (
    <div className="space-y-2 flex-1">
      {lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2">
          <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <GitMerge size={20} />
          </div>
          <p className="text-xs font-semibold text-foreground">Nenhum processo ativo</p>
          <p className="text-[11px] text-muted-foreground/70">
            Crie pipelines de clientes e projetos na aba Processos.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {lista.map((p) => (
            <div
              key={p.caminho}
              onClick={() => aoAbrirProcesso(p.caminho)}
              className="group p-2.5 rounded-2xl border border-border/50 bg-background/50 hover:bg-card hover:border-indigo-500/40 transition-all cursor-pointer flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <Layers size={13} />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-indigo-500 transition-colors truncate">
                  {p.titulo}
                </span>
              </div>

              <span className="text-[10px] font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-md shrink-0">
                Funil Ativo
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
