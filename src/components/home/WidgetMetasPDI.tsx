import { Target } from "lucide-react";
import { type ResumoMeta } from "@/lib/pdi";

interface WidgetMetasPDIProps {
  resumos: ResumoMeta[];
  aoAbrirMeta: (caminho: string) => void;
}

export function WidgetMetasPDI({
  resumos,
  aoAbrirMeta,
}: WidgetMetasPDIProps) {
  const ativas = resumos.slice(0, 3);

  return (
    <div className="space-y-3 flex-1">
      {ativas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2">
          <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Target size={20} />
          </div>
          <p className="text-xs font-semibold text-foreground">Nenhuma meta ativa</p>
          <p className="text-[11px] text-muted-foreground/70">
            Defina suas metas de carreira na aba PDI.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {ativas.map((r) => {
            const concluida = r.meta.status === "concluida";
            const totalEntregas = r.entregas.length;

            return (
              <div
                key={r.meta.caminho}
                onClick={() => aoAbrirMeta(r.meta.caminho)}
                className="group p-2.5 rounded-2xl border border-border/50 bg-background/50 hover:bg-card hover:border-border transition-all cursor-pointer space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground group-hover:text-rose-500 transition-colors truncate">
                    {r.meta.titulo}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded-md">
                    {concluida ? "Concluída" : "Em andamento"}
                  </span>
                </div>

                <div className="w-full bg-secondary/60 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: concluida ? "100%" : totalEntregas > 0 ? "50%" : "20%" }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{totalEntregas} entrega{totalEntregas === 1 ? "" : "s"} registrada{totalEntregas === 1 ? "" : "s"}</span>
                  {r.meta.prazo && <span>Prazo: {r.meta.prazo}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
