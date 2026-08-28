import React, { useState, useMemo, useEffect } from "react";
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
  obterUrlsSimpleIcon,
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

export function IconeSimpleIcon({
  slug,
  tamanho = 18,
  cor,
  className,
}: {
  slug: string;
  tamanho?: number;
  cor?: string;
  className?: string;
}) {
  const [fonteIdx, setFonteIdx] = useState(0);
  const [falhouTudo, setFalhouTudo] = useState(false);

  const fontes = useMemo(() => {
    return obterUrlsSimpleIcon(slug, cor);
  }, [slug, cor]);

  useEffect(() => {
    setFonteIdx(0);
    setFalhouTudo(false);
  }, [slug, cor]);

  if (falhouTudo || fonteIdx >= fontes.length) {
    return <Globe size={tamanho} className={cn("text-muted-foreground", className)} />;
  }

  return (
    <img
      src={fontes[fonteIdx]}
      alt={slug}
      className={cn(
        "shrink-0 object-contain transition-transform",
        (cor === "#000000" || cor === "#181717" || cor === "#191919" || cor === "#0A0A0A") &&
          "dark:invert",
        className,
      )}
      style={{ width: tamanho, height: tamanho }}
      onError={() => {
        if (fonteIdx + 1 < fontes.length) {
          setFonteIdx((prev) => prev + 1);
        } else {
          setFalhouTudo(true);
        }
      }}
      loading="lazy"
    />
  );
}

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
    const itemCatalogo = CATALOGO_ICONES_MARCAS.find((it) => it.slug === slug);
    return (
      <IconeSimpleIcon
        slug={slug}
        cor={itemCatalogo?.cor}
        tamanho={tamanho}
        className={className}
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

export function SeletorGradeIcones({
  iconeAtual,
  onSelecionar,
  onRestaurar,
  onFechar,
  titulo,
  tamanhoPequeno = false,
}: {
  iconeAtual?: string;
  onSelecionar: (item: ItemIconeCatalogo) => void;
  onRestaurar?: () => void;
  onFechar?: () => void;
  titulo?: string;
  tamanhoPequeno?: boolean;
}) {
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

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Cabeçalho do Seletor */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Palette size={14} className="text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">
            {titulo || "Alterar Ícone"}
          </span>
        </div>
        {iconeAtual && onRestaurar && (
          <button
            type="button"
            onClick={onRestaurar}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors cursor-pointer shrink-0"
            title="Voltar ao favicon automático da página"
          >
            <RotateCcw size={11} />
            <span>Favicon original</span>
          </button>
        )}
      </div>

      {/* Campo de Busca */}
      <div className="relative mt-2 shrink-0">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar ícone (ex: YouTube Music, Gmail, WhatsApp)..."
          className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
          autoFocus
        />
      </div>

      {/* Categorias (Pills horizontais) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 mt-2 scrollbar-none shrink-0">
        {CATEGORIAS_ICONES_MARCAS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoriaAtiva(cat)}
            className={cn(
              "px-2 py-0.5 text-[11px] rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0",
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
      <div
        className={cn(
          "flex-1 overflow-y-auto mt-2 pr-1",
          tamanhoPequeno ? "max-h-[250px] min-h-[180px]" : "max-h-[320px] min-h-[220px]",
        )}
      >
        {iconesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs">
            <Search size={22} className="opacity-40 mb-1.5" />
            <p>Nenhum ícone para "{busca}".</p>
          </div>
        ) : (
          <div className={cn("grid gap-1.5", tamanhoPequeno ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6")}>
            {iconesFiltrados.map((item) => {
              const selecionado = iconeAtual === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelecionar(item)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer group relative text-center",
                    selecionado
                      ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40"
                      : "bg-card/70 hover:bg-accent border-border/60 hover:border-border",
                  )}
                  title={item.nome}
                >
                  {selecionado && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check size={9} strokeWidth={3} />
                    </span>
                  )}

                  <div className="h-6 w-6 flex items-center justify-center mb-1 transition-transform group-hover:scale-115">
                    <RenderizadorIconeItem iconeId={item.id} tamanho={18} />
                  </div>

                  <span className="text-[10px] font-medium text-foreground truncate w-full px-0.5">
                    {item.nome}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé informativo */}
      <div className="pt-2 border-t border-border/40 mt-2 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
        <span>{iconesFiltrados.length} marcas e ícones</span>
        {onFechar && (
          <button
            type="button"
            onClick={onFechar}
            className="px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            Fechar
          </button>
        )}
      </div>
    </div>
  );
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
  if (!favorito) return null;

  return (
    <Dialog open={aberto} onOpenChange={aoFechar}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-5">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Alterar Ícone do Favorito
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Escolha o logo oficial para <strong className="text-foreground">{favorito.nome || favorito.url}</strong>.
          </p>
        </DialogHeader>

        <SeletorGradeIcones
          iconeAtual={favorito.iconeCustomizado}
          onSelecionar={(item) => {
            aoSalvarIcone(favorito.id, item.id);
            aoFechar();
          }}
          onRestaurar={() => {
            aoSalvarIcone(favorito.id, undefined);
            aoFechar();
          }}
          onFechar={aoFechar}
        />
      </DialogContent>
    </Dialog>
  );
}
