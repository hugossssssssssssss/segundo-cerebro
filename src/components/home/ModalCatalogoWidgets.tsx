import {
  X,
  Check,
  Plus,
  CheckSquare,
  FileText,
  ImageIcon,
  Target,
  Layers,
  GitMerge,
  Layout,
  Globe,
  Edit3,
} from "lucide-react";
import {
  CATALOGO_WIDGETS,
  type WidgetConfig,
  type InfoWidgetCatalogo,
} from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModalCatalogoWidgetsProps {
  aberto: boolean;
  aoFechar: () => void;
  configWidgets: WidgetConfig[];
  aoAlternarWidget: (info: InfoWidgetCatalogo) => void;
}

const ICONES_MAP: Record<string, any> = {
  CheckSquare,
  FileText,
  ImageIcon,
  Target,
  Layers,
  GitMerge,
  Layout,
  Globe,
  Edit3,
};

export function ModalCatalogoWidgets({
  aberto,
  aoFechar,
  configWidgets,
  aoAlternarWidget,
}: ModalCatalogoWidgetsProps) {
  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={aoFechar}
    >
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Adicionar Widgets
            </h2>
            <p className="text-xs text-muted-foreground">
              Escolha os blocos que deseja exibir na sua tela inicial
            </p>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Grade de Widgets */}
        <div className="p-4 max-h-[60vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATALOGO_WIDGETS.map((w) => {
            const Icone = ICONES_MAP[w.icone] || Layers;
            const configAtual = configWidgets.find((c) => c.id === w.id);
            const estaAtivo = Boolean(configAtual?.ativo);

            return (
              <div
                key={w.id}
                onClick={() => aoAlternarWidget(w)}
                className={cn(
                  "p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none",
                  estaAtivo
                    ? "bg-secondary/40 border-primary/40 ring-1 ring-primary/20"
                    : "bg-background border-border/70 hover:border-border hover:bg-secondary/20"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-secondary text-foreground shrink-0">
                    <Icone size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-foreground truncate">
                      {w.titulo}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {w.resumo}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {estaAtivo ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                      <Check size={12} strokeWidth={3} />
                      <span>Ativo</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md hover:text-foreground">
                      <Plus size={12} />
                      <span>Adicionar</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé simples */}
        <div className="p-3 border-t border-border flex items-center justify-end">
          <Button size="sm" onClick={aoFechar} className="text-xs font-semibold h-8 px-4 rounded-lg">
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
}
