import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, RotateCcw } from "lucide-react";
import { inscreverToasts, removerToast, type ItemToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function ToastsContainer() {
  const [toasts, setToasts] = useState<ItemToast[]>([]);

  useEffect(() => {
    return inscreverToasts((novos) => setToasts(novos));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      {toasts.map((t) => {
        const Icone =
          t.tipo === "sucesso"
            ? CheckCircle2
            : t.tipo === "erro"
            ? AlertCircle
            : t.tipo === "aviso"
            ? AlertTriangle
            : Info;

        const corBorda =
          t.tipo === "sucesso"
            ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            : t.tipo === "erro"
            ? "border-destructive/40 text-destructive"
            : t.tipo === "aviso"
            ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
            : "border-blue-500/40 text-blue-600 dark:text-blue-400";

        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center justify-between gap-3 rounded-xl border bg-card/95 backdrop-blur-md p-3.5 shadow-xl transition-all animate-in slide-in-from-bottom-2 duration-200",
              corBorda
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icone size={18} className="shrink-0" />
              <span className="text-xs font-medium text-foreground truncate">{t.mensagem}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              {t.aoDesfazer && (
                <button
                  onClick={() => {
                    t.aoDesfazer?.();
                    removerToast(t.id);
                  }}
                  className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-accent/80 transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>Desfazer</span>
                </button>
              )}

              <button
                onClick={() => removerToast(t.id)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
