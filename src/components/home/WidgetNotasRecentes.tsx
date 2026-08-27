import { FileText } from "lucide-react";

export interface NotaItemHome {
  caminho: string;
  sha?: string;
  titulo: string;
  corpo?: string;
  tags?: string[];
  atualizadoEm?: string;
}

interface WidgetNotasRecentesProps {
  notas: NotaItemHome[];
  aoAbrirNota: (caminho: string) => void;
}

export function WidgetNotasRecentes({
  notas,
  aoAbrirNota,
}: WidgetNotasRecentesProps) {
  const recentes = notas.slice(0, 4);

  return (
    <div className="space-y-2 flex-1">
      {recentes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <p className="text-xs font-semibold text-foreground">Nenhuma nota recente</p>
          <p className="text-[11px] text-muted-foreground/70">
            Crie sua primeira nota usando o botão acima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {recentes.map((n) => {
            const previewCorpo = n.corpo
              ? n.corpo.replace(/^[#>\s-]+/gm, "").slice(0, 90).trim()
              : "";

            return (
              <div
                key={n.caminho}
                onClick={() => aoAbrirNota(n.caminho)}
                className="group flex flex-col justify-between p-3 rounded-2xl border border-border/60 bg-background/50 hover:bg-card hover:border-blue-500/40 hover:shadow-md transition-all duration-200 cursor-pointer min-h-[96px]"
              >
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors line-clamp-1">
                    {n.titulo || "Nota sem título"}
                  </h4>
                  {previewCorpo && (
                    <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
                      {previewCorpo}
                    </p>
                  )}
                </div>

                {n.tags && n.tags.length > 0 && (
                  <div className="flex items-center gap-1 pt-1.5 flex-wrap">
                    {n.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-medium text-muted-foreground/70 bg-secondary/50 px-1.5 py-0.5 rounded-md"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
