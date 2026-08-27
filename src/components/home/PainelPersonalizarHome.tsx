import { X, RotateCcw, Sparkles, SlidersHorizontal, Eye, EyeOff } from "lucide-react";
import { CATALOGO_WIDGETS, type WidgetConfig, type TamanhoWidget, type CategoriaWidget } from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PainelPersonalizarHomeProps {
  aberto: boolean;
  aoFechar: () => void;
  configWidgets: WidgetConfig[];
  aoMudarConfig: (novaConfig: WidgetConfig[]) => void;
  aoRestaurarPadrao: () => void;
  modoEdicaoRapida: boolean;
  aoAlternarModoEdicao: () => void;
}

export function PainelPersonalizarHome({
  aberto,
  aoFechar,
  configWidgets,
  aoMudarConfig,
  aoRestaurarPadrao,
  modoEdicaoRapida,
  aoAlternarModoEdicao,
}: PainelPersonalizarHomeProps) {
  if (!aberto) return null;

  const categorias: { id: CategoriaWidget; rotulo: string }[] = [
    { id: "foco", rotulo: "Foco & Produtividade" },
    { id: "conhecimento", rotulo: "Conhecimento & Mídia" },
    { id: "carreira", rotulo: "Carreira & Processos" },
    { id: "ferramentas", rotulo: "Ferramentas & Integrações" },
  ];

  const alternarAtivo = (id: string) => {
    const existe = configWidgets.find((c) => c.id === id);
    if (existe) {
      aoMudarConfig(
        configWidgets.map((c) => (c.id === id ? { ...c, ativo: !c.ativo } : c))
      );
    } else {
      const info = CATALOGO_WIDGETS.find((c) => c.id === id);
      if (info) {
        aoMudarConfig([
          ...configWidgets,
          { id, ativo: true, tamanho: info.tamanhoPadrao, ordem: configWidgets.length },
        ]);
      }
    }
  };

  const mudarTamanho = (id: string, tamanho: TamanhoWidget) => {
    aoMudarConfig(
      configWidgets.map((c) => (c.id === id ? { ...c, tamanho } : c))
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-full bg-card border-l border-border shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Personalizar Dashboard</h2>
                <p className="text-xs text-muted-foreground">Escolha os widgets visíveis e seus tamanhos</p>
              </div>
            </div>

            <button
              type="button"
              onClick={aoFechar}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Toggle Modo de Edição Rápida */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/80 bg-secondary/30">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Alças de ajuste nos cartões</p>
              <p className="text-[11px] text-muted-foreground">Exibe controles de redimensionamento na tela</p>
            </div>
            <button
              type="button"
              onClick={aoAlternarModoEdicao}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                modoEdicaoRapida
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {modoEdicaoRapida ? "Ativado" : "Desativado"}
            </button>
          </div>

          {/* Lista Categorizada de Widgets */}
          <div className="space-y-6">
            {categorias.map((cat) => {
              const widgetsDaCat = CATALOGO_WIDGETS.filter((w) => w.categoria === cat.id);
              if (widgetsDaCat.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-2.5">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {cat.rotulo}
                  </h3>

                  <div className="space-y-2">
                    {widgetsDaCat.map((w) => {
                      const cfgWidget = configWidgets.find((c) => c.id === w.id);
                      const ativo = cfgWidget ? cfgWidget.ativo : false;
                      const tamanhoAtual = cfgWidget ? cfgWidget.tamanho : w.tamanhoPadrao;

                      return (
                        <div
                          key={w.id}
                          className={cn(
                            "p-3 rounded-2xl border transition-all space-y-2.5",
                            ativo
                              ? "bg-card border-border shadow-xs"
                              : "bg-secondary/20 border-border/40 opacity-70"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={cn("p-1.5 rounded-lg border", w.corIcone)}>
                                <Sparkles size={13} />
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{w.titulo}</p>
                                <p className="text-[10px] text-muted-foreground line-clamp-1">{w.descricao}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => alternarAtivo(w.id)}
                              className={cn(
                                "h-6 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1",
                                ativo
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-secondary text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {ativo ? <Eye size={12} /> : <EyeOff size={12} />}
                              <span>{ativo ? "Ativo" : "Oculto"}</span>
                            </button>
                          </div>

                          {ativo && (
                            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                              <span className="text-muted-foreground font-medium">Tamanho no Grid:</span>
                              <div className="flex items-center gap-1">
                                {w.tamanhosPermitidos.map((tam) => (
                                  <button
                                    key={tam}
                                    type="button"
                                    onClick={() => mudarTamanho(w.id, tam)}
                                    className={cn(
                                      "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                                      tamanhoAtual === tam
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    {tam === "compacto"
                                      ? "1 Col"
                                      : tam === "medio"
                                      ? "2 Cols"
                                      : tam === "largo"
                                      ? "3 Cols"
                                      : "Full (4 Cols)"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé */}
        <div className="pt-6 border-t border-border flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={aoRestaurarPadrao}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw size={13} />
            <span>Restaurar Padrão</span>
          </Button>

          <Button size="sm" onClick={aoFechar} className="px-5 font-semibold">
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
}
