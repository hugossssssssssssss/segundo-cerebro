import { useState, useMemo, useEffect } from "react";
import { X, Search, Check, Sparkles } from "lucide-react";
import { CATALOGO_ICONES, CATEGORIAS_ICONES, obterIconePorNome } from "@/lib/icones";
import { cn } from "@/lib/utils";
import { gerenciadorCamadas, NIVEIS_CAMADAS } from "@/lib/camadas";

interface GaleriaIconesModalProps {
  aberta: boolean;
  aoFechar: () => void;
  aoSelecionarIcone: (nomeIcone: string) => void;
  iconeAtual: string;
  corAtual?: string;
}

export function GaleriaIconesModal({
  aberta,
  aoFechar,
  aoSelecionarIcone,
  iconeAtual,
  corAtual,
}: GaleriaIconesModalProps) {
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("Todos");

  useEffect(() => {
    if (!aberta) return;
    const limpar = gerenciadorCamadas.registrar({
      id: "galeria-icones-modal",
      nivel: NIVEIS_CAMADAS.MODAIS_GLOBAIS + 10,
      temBackdrop: true,
      aoFechar: aoFechar,
    });
    return () => limpar();
  }, [aberta, aoFechar]);

  const [selecionadoTemporario, setSelecionadoTemporario] = useState(iconeAtual);

  const iconesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return CATALOGO_ICONES.filter((item) => {
      const bateCategoria = categoriaAtiva === "Todos" || item.categoria === categoriaAtiva;
      if (!bateCategoria) return false;

      if (!termo) return true;
      const bateNome = item.nome.toLowerCase().includes(termo);
      const bateRotulo = item.rotulo.toLowerCase().includes(termo);
      return bateNome || bateRotulo;
    });
  }, [busca, categoriaAtiva]);

  if (!aberta) return null;

  const IconePreview = obterIconePorNome(selecionadoTemporario);

  const confirmarSelecao = () => {
    aoSelecionarIcone(selecionadoTemporario);
    aoFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Galeria de Ícones</h2>
              <p className="text-xs text-muted-foreground">Escolha o ícone ideal para o seu menu</p>
            </div>
          </div>
          <button
            onClick={aoFechar}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Fechar galeria"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Busca & Filtros */}
        <div className="p-4 border-b border-border space-y-3 bg-background">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou palavra-chave (ex: estrela, tarefas, pasta)..."
              className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition-all"
              autoFocus
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Abas de Categorias */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIAS_ICONES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaAtiva(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border shrink-0",
                  categoriaAtiva === cat
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Ícones */}
        <div className="flex-1 overflow-y-auto p-4 bg-background/50">
          {iconesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-2">
              <Search size={36} className="opacity-40" />
              <p className="text-sm font-medium">Nenhum ícone encontrado para "{busca}"</p>
              <p className="text-xs">Tente buscar por termos mais genéricos como 'nota', 'lista' ou 'design'.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {iconesFiltrados.map(({ nome, rotulo, Icone }) => {
                const ativo = selecionadoTemporario === nome;
                return (
                  <button
                    key={nome}
                    onClick={() => setSelecionadoTemporario(nome)}
                    title={`${nome} (${rotulo})`}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border transition-all relative group text-center aspect-square",
                      ativo
                        ? "bg-primary/10 border-primary text-primary shadow-xs ring-2 ring-primary/30"
                        : "bg-card border-border/80 text-foreground hover:border-primary/50 hover:bg-accent/60"
                    )}
                  >
                    <Icone
                      size={24}
                      style={{ color: ativo && corAtual ? corAtual : undefined }}
                      className="shrink-0 transition-transform group-hover:scale-110"
                    />
                    <span className="mt-1 text-[10px] font-mono font-medium truncate w-full opacity-80 group-hover:opacity-100">
                      {nome}
                    </span>
                    {ativo && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px]">
                        <Check size={10} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé com Preview & Ação */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-accent/40">
              <IconePreview size={22} style={{ color: corAtual }} />
            </div>
            <div>
              <span className="text-xs font-semibold text-foreground block">
                Selecionado: <span className="text-primary font-mono">{selecionadoTemporario}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                {CATALOGO_ICONES.find((i) => i.nome === selecionadoTemporario)?.rotulo || "Ícone personalizado"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={aoFechar}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-border bg-card text-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarSelecao}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-md transition-all"
            >
              <Check size={14} />
              Confirmar Ícone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
