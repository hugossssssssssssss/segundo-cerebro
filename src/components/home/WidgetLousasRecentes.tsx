import { Layout, ArrowUpRight } from "lucide-react";

export interface LousaItemHome {
  caminho: string;
  titulo: string;
}

interface WidgetLousasRecentesProps {
  lousas: LousaItemHome[];
  aoAbrirLousa: (caminho: string) => void;
}

export function WidgetLousasRecentes({
  lousas,
  aoAbrirLousa,
}: WidgetLousasRecentesProps) {
  const lista = lousas.slice(0, 3);

  return (
    <div className="space-y-2 flex-1">
      {lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2">
          <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <Layout size={20} />
          </div>
          <p className="text-xs font-semibold text-foreground">Nenhuma lousa salva</p>
          <p className="text-[11px] text-muted-foreground/70">
            Crie mapas mentais visuais na aba Lousas.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {lista.map((l) => (
            <div
              key={l.caminho}
              onClick={() => aoAbrirLousa(l.caminho)}
              className="group p-2.5 rounded-2xl border border-border/50 bg-card hover:bg-accent/40 hover:border-border transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                  <Layout size={13} />
                </div>
                <span className="text-xs font-bold text-foreground transition-colors truncate">
                  {l.titulo}
                </span>
              </div>

              <ArrowUpRight size={13} className="text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
