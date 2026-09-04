import { type ResumoMeta } from "@/lib/pdi";
import { formatarDataPtBR } from "@/lib/utils";

interface WidgetMetasPDIProps {
  resumos: ResumoMeta[];
  aoAbrirMeta: (caminho: string) => void;
}

export function WidgetMetasPDI({
  resumos,
  aoAbrirMeta,
}: WidgetMetasPDIProps) {
  const ativas = resumos.slice(0, 4);

  return (
    <div className="space-y-2 flex-1 overflow-y-auto">
      {ativas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-1.5">
          <p className="text-xs font-medium text-foreground">Nenhuma meta ativa</p>
          <p className="text-[11px] text-muted-foreground">Adicione metas na aba PDI.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {ativas.map((r) => {
            const totalEntregas = r.entregas.length;

            return (
              <div
                key={r.meta.caminho}
                onClick={() => aoAbrirMeta(r.meta.caminho)}
                className="group p-2 rounded-xl hover:bg-secondary/40 transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {r.meta.titulo}
                  </p>
                  {r.meta.indicador && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {r.meta.indicador}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-[10px] text-muted-foreground text-right">
                  <span>{totalEntregas} entrega{totalEntregas === 1 ? "" : "s"}</span>
                  {r.meta.prazo && <p className="opacity-70">{formatarDataPtBR(r.meta.prazo)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
