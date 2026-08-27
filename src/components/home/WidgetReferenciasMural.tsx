import { ImageIcon } from "lucide-react";
import { type Referencia } from "@/lib/referencias";
import { ImagemPrivada } from "@/components/ImagemPrivada";

interface WidgetReferenciasMuralProps {
  referencias: Referencia[];
  aoAbrirReferencia: (ref: Referencia) => void;
}

export function WidgetReferenciasMural({
  referencias,
  aoAbrirReferencia,
}: WidgetReferenciasMuralProps) {
  const recentes = referencias.slice(0, 4);

  return (
    <div className="flex-1">
      {recentes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
          <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <ImageIcon size={20} />
          </div>
          <p className="text-xs font-semibold text-foreground">Mural vazio</p>
          <p className="text-[11px] text-muted-foreground/70">
            Arraste ou cole (Ctrl+V) imagens para salvar referências visuais.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {recentes.map((r) => (
            <div
              key={r.caminho}
              onClick={() => aoAbrirReferencia(r)}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-border/70 bg-black/10 hover:border-purple-500/50 hover:shadow-xl transition-all duration-300 cursor-pointer"
            >
              {r.imagem ? (
                <ImagemPrivada
                  caminho={r.imagem}
                  alt={r.titulo}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 bg-secondary/30">
                  <ImageIcon size={20} />
                </div>
              )}

              {/* Overlay Glassmorphic com Título no Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 p-3 flex flex-col justify-end">
                <p className="text-[11px] font-bold text-white truncate drop-shadow-md">
                  {r.titulo}
                </p>
                {r.tags.length > 0 && (
                  <span className="text-[9px] text-purple-300 font-medium truncate">
                    #{r.tags[0]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
