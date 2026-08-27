import { useState } from "react";
import {
  X,
  Check,
  Plus,
  Sparkles,
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
  type LarguraWidget,
} from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ModalCatalogoWidgetsProps {
  aberto: boolean;
  aoFechar: () => void;
  configWidgets: WidgetConfig[];
  aoAlternarWidget: (info: InfoWidgetCatalogo) => void;
  aoMudarTamanho: (id: string, colunas: LarguraWidget) => void;
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
  aoMudarTamanho,
}: ModalCatalogoWidgetsProps) {
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("todos");

  if (!aberto) return null;

  const abas: { id: string; rotulo: string }[] = [
    { id: "todos", rotulo: "Todos os Widgets" },
    { id: "foco", rotulo: "Foco & Tarefas" },
    { id: "conhecimento", rotulo: "Conhecimento & Mídia" },
    { id: "carreira", rotulo: "Carreira & Processos" },
    { id: "ferramentas", rotulo: "Ferramentas" },
  ];

  const widgetsFiltrados = CATALOGO_WIDGETS.filter((w) => {
    if (categoriaAtiva === "todos") return true;
    return w.categoria === categoriaAtiva;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={aoFechar}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Catálogo */}
        <div className="p-6 pb-4 border-b border-border/60 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-foreground">
                Galeria de Widgets
              </h2>
              <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                {CATALOGO_WIDGETS.length} disponíveis
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Personalize sua tela inicial adicionando e ajustando os blocos que você mais usa.
            </p>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            title="Fechar galeria"
          >
            <X size={20} />
          </button>
        </div>

        {/* Abas de Categorias */}
        <div className="px-6 py-2.5 bg-secondary/20 border-b border-border/40 flex items-center gap-1.5 overflow-x-auto">
          {abas.map((aba) => (
            <button
              key={aba.id}
              type="button"
              onClick={() => setCategoriaAtiva(aba.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                categoriaAtiva === aba.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {aba.rotulo}
            </button>
          ))}
        </div>

        {/* Grid de Cards dos Widgets */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgetsFiltrados.map((w) => {
            const Icone = ICONES_MAP[w.icone] || Sparkles;
            const configAtual = configWidgets.find((c) => c.id === w.id);
            const estaAtivo = Boolean(configAtual?.ativo);
            const colunasAtuais = configAtual?.colunas || w.colunasPadrao;

            return (
              <div
                key={w.id}
                className={cn(
                  "relative rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between gap-4 group",
                  estaAtivo
                    ? "bg-card border-primary/40 shadow-sm ring-1 ring-primary/20"
                    : "bg-secondary/15 border-border/70 hover:border-border hover:bg-card/60"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={cn(
                        "h-11 w-11 rounded-2xl flex items-center justify-center border shadow-2xs transition-transform group-hover:scale-105",
                        w.corIcone
                      )}
                    >
                      <Icone size={22} />
                    </div>

                    <div className="flex items-center gap-1">
                      {w.tagDestaque && (
                        <Badge variant="outline" className="text-[10px] font-bold text-amber-500 border-amber-500/30">
                          {w.tagDestaque}
                        </Badge>
                      )}
                      {estaAtivo && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Check size={11} strokeWidth={3} />
                          <span>No Painel</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {w.titulo}
                    </h3>
                    <p className="text-[10px] font-medium text-muted-foreground/80">
                      {w.subtitulo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {w.descricao}
                    </p>
                  </div>
                </div>

                {/* Controles de Tamanho e Ação de Adicionar/Remover */}
                <div className="pt-3 border-t border-border/50 flex flex-col gap-2">
                  {estaAtivo && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">Largura:</span>
                      <div className="flex items-center gap-1">
                        {([1, 2, 3, 4] as LarguraWidget[]).map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => aoMudarTamanho(w.id, col)}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer",
                              colunasAtuais === col
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-secondary/70 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {col === 4 ? "Full" : `${col}x`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant={estaAtivo ? "secondary" : "default"}
                    size="sm"
                    onClick={() => aoAlternarWidget(w)}
                    className={cn(
                      "w-full h-8 text-xs font-semibold rounded-xl gap-1.5 shadow-2xs cursor-pointer transition-all",
                      estaAtivo
                        ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 border"
                        : "hover:scale-[1.01]"
                    )}
                  >
                    {estaAtivo ? (
                      <>
                        <X size={13} />
                        <span>Remover do Painel</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Adicionar ao Painel</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé Didático com Botão Concluir */}
        <div className="p-4 px-6 bg-secondary/30 border-t border-border/60 flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Dica: Você pode redimensionar os blocos diretamente na tela a qualquer momento.
          </p>

          <Button
            size="sm"
            onClick={aoFechar}
            className="px-6 h-9 rounded-xl font-bold ml-auto shadow-xs cursor-pointer"
          >
            Concluir & Voltar à Tela Inicial
          </Button>
        </div>
      </div>
    </div>
  );
}
