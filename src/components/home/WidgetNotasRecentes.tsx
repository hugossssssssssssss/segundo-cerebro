import { FileText, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { obterEstiloTagChip } from "@/components/TagChip";

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
          <p className="text-xs font-semibold text-foreground">Acervo vazio</p>
          <p className="text-[11px] text-muted-foreground/70">
            Suas notas e ideias aparecerão organizadas aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {recentes.map((n) => {
            const previewCorpo = n.corpo
              ? n.corpo.replace(/^[#>\s-]+/gm, "").slice(0, 85).trim()
              : "";

            return (
              <div
                key={n.caminho}
                onClick={() => aoAbrirNota(n.caminho)}
                className="group relative flex flex-col justify-between p-3.5 rounded-2xl border border-border/60 bg-card hover:bg-accent/40 hover:border-border transition-colors duration-150 cursor-pointer min-h-[105px] overflow-hidden"
              >
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground transition-colors line-clamp-1">
                    {n.titulo || "Nota sem título"}
                  </h4>
                  {previewCorpo && (
                    <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
                      {previewCorpo}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <div className="flex items-center gap-1 flex-wrap">
                    {n.tags && n.tags.length > 0 ? (
                      n.tags.slice(0, 2).map((t) => {
                        const estilo = obterEstiloTagChip(t);
                        const nomeLimpo = t.startsWith("#") ? t.slice(1) : t;
                        return (
                          <span
                            key={t}
                            className={cn(
                              "text-[9px] font-semibold px-1.5 py-0.5 rounded-md border",
                              estilo
                                ? cn(estilo.bg, estilo.text, estilo.border)
                                : "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"
                            )}
                          >
                            #{nomeLimpo}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60">Nota</span>
                    )}
                  </div>

                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    Abrir <ArrowRight size={10} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
