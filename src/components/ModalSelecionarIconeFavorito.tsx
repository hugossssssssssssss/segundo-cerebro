import React, { useState, useMemo } from "react";
import {
  Search,
  Check,
  RotateCcw,
  Globe,
  Bookmark,
  Star,
  Heart,
  Sparkles,
  Folder,
  CheckSquare,
  FileText,
  Calendar,
  Mail,
  Music,
  Video,
  ShoppingCart,
  Code,
  Terminal,
  Palette,
  Zap,
  Lock,
  Link,
  Compass,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CATALOGO_ICONES_MARCAS,
  CATEGORIAS_ICONES_MARCAS,
  type CategoriaIconeMarca,
  type ItemIconeCatalogo,
  obterUrlSimpleIcon,
} from "@/lib/catalogoIconesMarcas";
import type { FavoritoItem } from "@/lib/favoritos";
import { cn } from "@/lib/utils";

const MAPA_LUCIDE: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Globe,
  Bookmark,
  Star,
  Heart,
  Sparkles,
  Folder,
  CheckSquare,
  FileText,
  Calendar,
  Mail,
  Music,
  Video,
  ShoppingCart,
  Code,
  Terminal,
  Palette,
  Zap,
  Lock,
  Link,
  Compass,
};

export function RenderizadorIconeItem({
  iconeId,
  tamanho = 18,
  className,
}: {
  iconeId?: string;
  tamanho?: number;
  className?: string;
}) {
  if (!iconeId) {
    return <Globe size={tamanho} className={cn("text-muted-foreground", className)} />;
  }

  if (iconeId.startsWith("si:")) {
    const slug = iconeId.replace("si:", "");
    return (
      <img
        src={obterUrlSimpleIcon(slug)}
        alt={slug}
        className={cn("shrink-0 object-contain", className)}
        style={{ width: tamanho, height: tamanho }}
        loading="lazy"
      />
    );
  }

  if (iconeId.startsWith("lucide:")) {
    const nome = iconeId.replace("lucide:", "");
    const Componente = MAPA_LUCIDE[nome] || Globe;
    return <Componente size={tamanho} className={cn("shrink-0 text-foreground", className)} />;
  }

  return <Globe size={tamanho} className={cn("text-muted-foreground", className)} />;
}

interface ModalSelecionarIconeFavoritoProps {
  aberto: boolean;
  aoFechar: () => void;
  favorito: FavoritoItem | null;
  aoSalvarIcone: (id: string, iconeCustomizado?: string) => void;
}

export function ModalSelecionarIconeFavorito({
  aberto,
  aoFechar,
  favorito,
  aoSalvarIcone,
}: ModalSelecionarIconeFavoritoProps) {
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaIconeMarca>("Todos");

  const iconesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return CATALOGO_ICONES_MARCAS.filter((item) => {
      const bateCategoria = categoriaAtiva === "Todos" || item.categoria === categoriaAtiva;
      if (!bateCategoria) return false;

      if (!termo) return true;
      const bateNome = item.nome.toLowerCase().includes(termo);
      const bateSlug = item.slug?.toLowerCase().includes(termo) ?? false;
      return bateNome || bateSlug;
    });
  }, [busca, categoriaAtiva]);

  if (!favorito) return null;

  const iconeAtual = favorito.iconeCustomizado;

  const selecionar = (item: ItemIconeCatalogo) => {
    aoSalvarIcone(favorito.id, item.id);
    aoFechar();
  };

  const restaurarOriginal = () => {
    aoSalvarIcone(favorito.id, undefined);
    aoFechar();
  };

  return (
    <Dialog open={aberto} onOpenChange={aoFechar}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-4">
            <span className="text-base font-bold">Alterar Ícone do Favorito</span>
            {iconeAtual && (
              <button
                type="button"
                onClick={restaurarOriginal}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer"
                title="Voltar ao favicon automático da página"
              >
                <RotateCcw size={13} />
                <span>Restaurar original</span>
              </button>
            )}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Escolha o logo oficial da empresa ou um ícone genérico para <strong className="text-foreground">{favorito.nome || favorito.url}</strong>.
          </p>
        </DialogHeader>

        {/* Campo de Busca */}
        <div className="relative mt-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por marca ou aplicativo (ex: WhatsApp, Gmail, Drive, Figma, Spotify)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
            autoFocus
          />
        </div>

        {/* Categorias (Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mt-3 scrollbar-none">
          {CATEGORIAS_ICONES_MARCAS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoriaAtiva(cat)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0",
                categoriaAtiva === cat
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grade de Ícones */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1 min-h-[260px] max-h-[360px]">
          {iconesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
              <Search size={28} className="opacity-40 mb-2" />
              <p>Nenhum ícone encontrado para "{busca}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {iconesFiltrados.map((item) => {
                const selecionado = iconeAtual === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selecionar(item)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer group relative text-center",
                      selecionado
                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40"
                        : "bg-card hover:bg-accent/80 border-border/70 hover:border-border",
                    )}
                    title={item.nome}
                  >
                    {selecionado && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}

                    <div className="h-7 w-7 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
                      <RenderizadorIconeItem iconeId={item.id} tamanho={22} />
                    </div>

                    <span className="text-[11px] font-medium text-foreground truncate w-full px-1">
                      {item.nome}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé informativo */}
        <div className="pt-3 border-t border-border/40 mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{iconesFiltrados.length} ícones disponíveis</span>
          <button
            type="button"
            onClick={aoFechar}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
