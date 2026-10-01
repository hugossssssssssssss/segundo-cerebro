import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Home,
  Coffee,
  Palette,
  Brush,
  PenTool,
  Layers,
  Crop,
  Image as ImageIcon,
  Camera,
  Headphones,
  Music,
  Video,
  Film,
  Mic,
  Tv,
  BookOpen,
  Book,
  GraduationCap,
  Newspaper,
  Code,
  Terminal,
  Cpu,
  Database,
  Server,
  Cloud,
  Smartphone,
  Laptop,
  Monitor,
  Bot,
  Zap,
  Flame,
  Sun,
  Moon,
  Lock,
  Key,
  Shield,
  Link as LinkIcon,
  Compass,
  MapPin,
  Map,
  Plane,
  Car,
  Bike,
  ShoppingCart,
  ShoppingBag,
  Package,
  Tag,
  CreditCard,
  DollarSign,
  Wallet,
  TrendingUp,
  BarChart3,
  PieChart,
  Briefcase,
  Trophy,
  Flag,
  Clock,
  Bell,
  Rocket,
  MessageSquare,
  Users,
  Loader2,
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
  buscarIconesIconify,
} from "@/lib/catalogoIconesMarcas";
import type { FavoritoItem } from "@/lib/favoritos";
import { Tooltip } from "@/components/ui/tooltip";
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
  Home,
  Search,
  Coffee,
  Palette,
  Brush,
  PenTool,
  Layers,
  Crop,
  Image: ImageIcon,
  Camera,
  Headphones,
  Music,
  Video,
  Film,
  Mic,
  Tv,
  BookOpen,
  Book,
  GraduationCap,
  Newspaper,
  Code,
  Terminal,
  Cpu,
  Database,
  Server,
  Cloud,
  Smartphone,
  Laptop,
  Monitor,
  Bot,
  Zap,
  Flame,
  Sun,
  Moon,
  Lock,
  Key,
  Shield,
  Link: LinkIcon,
  Compass,
  MapPin,
  Map,
  Plane,
  Car,
  Bike,
  ShoppingCart,
  ShoppingBag,
  Package,
  Tag,
  CreditCard,
  DollarSign,
  Wallet,
  TrendingUp,
  BarChart3,
  PieChart,
  Briefcase,
  Trophy,
  Flag,
  Clock,
  Bell,
  Rocket,
  MessageSquare,
  Users,
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

  // 1. Emoji direto (ex: "emoji:🎨" ou se for emoji puro)
  if (iconeId.startsWith("emoji:")) {
    const char = iconeId.replace("emoji:", "");
    return (
      <span
        style={{ fontSize: `${tamanho}px`, lineHeight: 1 }}
        className={cn("inline-flex items-center justify-center select-none font-normal shrink-0", className)}
      >
        {char}
      </span>
    );
  }

  // 2. Simple Icons (ex: "si:figma")
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

  // 3. Lucide Icons nativos
  if (iconeId.startsWith("lucide:")) {
    const nome = iconeId.replace("lucide:", "");
    const Componente = MAPA_LUCIDE[nome];
    if (Componente) {
      return <Componente size={tamanho} className={cn("shrink-0 text-foreground", className)} />;
    }
    // Fallback gracioso para Iconify Lucide SVG
    const nomeKebab = nome.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    return (
      <img
        src={`https://api.iconify.design/lucide/${nomeKebab}.svg`}
        alt={nome}
        style={{ width: tamanho, height: tamanho }}
        className={cn("shrink-0 object-contain dark:invert", className)}
        loading="lazy"
      />
    );
  }

  // 4. Iconify genérico (ex: "iconify:tabler:coffee" ou "iconify:mdi:brush")
  if (iconeId.startsWith("iconify:")) {
    const parte = iconeId.replace("iconify:", "");
    const [prefixo, ...resto] = parte.split(":");
    const nome = resto.join(":");
    return (
      <img
        src={`https://api.iconify.design/${prefixo}/${nome}.svg`}
        alt={nome}
        style={{ width: tamanho, height: tamanho }}
        className={cn("shrink-0 object-contain dark:invert", className)}
        loading="lazy"
      />
    );
  }

  // 5. URL direta de imagem (ex: "url:https://..." ou "https://...")
  if (iconeId.startsWith("http://") || iconeId.startsWith("https://") || iconeId.startsWith("url:")) {
    const url = iconeId.startsWith("url:") ? iconeId.replace("url:", "") : iconeId;
    return (
      <img
        src={url}
        alt="ícone"
        style={{ width: tamanho, height: tamanho }}
        className={cn("shrink-0 object-contain rounded-xs", className)}
        loading="lazy"
      />
    );
  }

  // 6. Se o valor for um emoji puro (sem prefixo)
  if (/\p{Extended_Pictographic}/u.test(iconeId) && iconeId.length <= 4) {
    return (
      <span
        style={{ fontSize: `${tamanho}px`, lineHeight: 1 }}
        className={cn("inline-flex items-center justify-center select-none font-normal shrink-0", className)}
      >
        {iconeId}
      </span>
    );
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

  // Busca online na API do Iconify
  const [iconesWeb, setIconesWeb] = useState<ItemIconeCatalogo[]>([]);
  const [carregandoWeb, setCarregandoWeb] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filtro no catálogo local
  const iconesLocais = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return CATALOGO_ICONES_MARCAS.filter((item) => {
      // Compatibilidade de categorias ("Genéricos" mapeia para "Símbolos & UI")
      const bateCategoria =
        categoriaAtiva === "Todos" ||
        item.categoria === categoriaAtiva ||
        (categoriaAtiva === "Símbolos & UI" && item.categoria === "Genéricos");
      if (!bateCategoria) return false;

      if (!termo) return true;
      const bateNome = item.nome.toLowerCase().includes(termo);
      const bateSlug = item.slug?.toLowerCase().includes(termo) ?? false;
      const bateEmoji = item.emoji ? item.emoji.includes(termo) : false;
      const bateTag = item.tags?.some((t) => t.toLowerCase().includes(termo)) ?? false;
      return bateNome || bateSlug || bateEmoji || bateTag;
    });
  }, [busca, categoriaAtiva]);

  // Efeito de busca assíncrona com debounce na Iconify API
  useEffect(() => {
    const termoLimpo = busca.trim();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (termoLimpo.length < 2) {
      setIconesWeb([]);
      setCarregandoWeb(false);
      return;
    }

    setCarregandoWeb(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const resultados = await buscarIconesIconify(termoLimpo, 24, controller.signal);
        if (!controller.signal.aborted) {
          setIconesWeb(resultados);
          setCarregandoWeb(false);
        }
      } catch (_err) {
        if (!controller.signal.aborted) {
          setIconesWeb([]);
          setCarregandoWeb(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [busca]);

  // Detecção se o que foi digitado é um emoji puro
  const emojiDigitado = useMemo(() => {
    const b = busca.trim();
    if (/\p{Extended_Pictographic}/u.test(b) && b.length <= 4) {
      return b;
    }
    return null;
  }, [busca]);

  // Detecção se o que foi digitado é uma URL
  const urlDigitada = useMemo(() => {
    const b = busca.trim();
    if (b.startsWith("http://") || b.startsWith("https://")) {
      return b;
    }
    return null;
  }, [busca]);

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
          <Tooltip conteudo="Voltar ao favicon automático da página">
            <button
              type="button"
              onClick={onRestaurar}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors cursor-pointer shrink-0"
              aria-label="Favicon original"
            >
              <RotateCcw size={11} />
              <span>Favicon original</span>
            </button>
          </Tooltip>
        )}
      </div>

      {/* Campo de Busca Unificada */}
      <div className="relative mt-2 shrink-0">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar ícone, marca ou emoji (ex: Café, Figma, 🎨, Camera)..."
          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
          autoFocus
        />
        {carregandoWeb && (
          <Loader2
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin pointer-events-none"
          />
        )}
      </div>

      {/* Atalho Inteligente para Emoji Digitado */}
      {emojiDigitado && (
        <div className="mt-2 p-2 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between gap-2 shrink-0 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg leading-none">{emojiDigitado}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Emoji detectado</p>
              <p className="text-[10px] text-muted-foreground">Usar este emoji como ícone do favorito</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onSelecionar({
                id: `emoji:${emojiDigitado}`,
                nome: `Emoji ${emojiDigitado}`,
                emoji: emojiDigitado,
                categoria: "Emojis",
              })
            }
            className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            Aplicar
          </button>
        </div>
      )}

      {/* Atalho Inteligente para URL de Imagem Digitada */}
      {urlDigitada && (
        <div className="mt-2 p-2 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between gap-2 shrink-0 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center gap-2 min-w-0">
            <img src={urlDigitada} alt="Preview" className="w-5 h-5 object-contain rounded-xs shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">Imagem externa</p>
              <p className="text-[10px] text-muted-foreground truncate">{urlDigitada}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onSelecionar({
                id: `url:${urlDigitada}`,
                nome: "Imagem Customizada",
                categoria: "Genéricos",
              })
            }
            className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            Usar URL
          </button>
        </div>
      )}

      {/* Categorias (Pills horizontais) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 mt-2 scrollbar-none shrink-0">
        {CATEGORIAS_ICONES_MARCAS.filter((cat) => cat !== "Genéricos").map((cat) => (
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
          "flex-1 overflow-y-auto mt-2 pr-1 space-y-3",
          tamanhoPequeno ? "max-h-[260px] min-h-[190px]" : "max-h-[340px] min-h-[230px]",
        )}
      >
        {/* 1. Resultados Locais */}
        {iconesLocais.length > 0 && (
          <div>
            {busca && (
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-0.5">
                Biblioteca Klaus ({iconesLocais.length})
              </div>
            )}
            <div className={cn("grid gap-1.5", tamanhoPequeno ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6")}>
              {iconesLocais.map((item) => {
                const selecionado = iconeAtual === item.id;
                return (
                  <Tooltip key={item.id} conteudo={item.nome}>
                    <button
                      type="button"
                      onClick={() => onSelecionar(item)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer group relative text-center",
                        selecionado
                          ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40"
                          : "bg-card/70 hover:bg-accent border-border/60 hover:border-border",
                      )}
                      title={item.nome}
                      aria-label={item.nome}
                    >
                      {selecionado && (
                        <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check size={9} strokeWidth={3} />
                        </span>
                      )}

                      <div className="h-6 w-6 flex items-center justify-center mb-1 transition-transform group-hover:scale-115">
                        <RenderizadorIconeItem iconeId={item.id} tamanho={18} />
                      </div>

                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground truncate w-full">
                        {item.nome}
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Resultados da Web via Iconify */}
        {iconesWeb.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                <Globe size={11} />
                <span>Web Global (Iconify • {iconesWeb.length})</span>
              </span>
              <span className="text-[10px] text-muted-foreground">Tabler, Lucide, Material, etc.</span>
            </div>
            <div className={cn("grid gap-1.5", tamanhoPequeno ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6")}>
              {iconesWeb.map((item) => {
                const selecionado = iconeAtual === item.id;
                return (
                  <Tooltip key={item.id} conteudo={item.nome}>
                    <button
                      type="button"
                      onClick={() => onSelecionar(item)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer group relative text-center",
                        selecionado
                          ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40"
                          : "bg-card/70 hover:bg-accent border-border/60 hover:border-border",
                      )}
                      title={item.nome}
                      aria-label={item.nome}
                    >
                      {selecionado && (
                        <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check size={9} strokeWidth={3} />
                        </span>
                      )}

                      <div className="h-6 w-6 flex items-center justify-center mb-1 transition-transform group-hover:scale-115">
                        <RenderizadorIconeItem iconeId={item.id} tamanho={18} />
                      </div>

                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground truncate w-full">
                        {item.nome.split(" (")[0]}
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Vazio */}
        {iconesLocais.length === 0 && iconesWeb.length === 0 && !carregandoWeb && (
          <div className="flex flex-col items-center justify-center h-36 text-muted-foreground text-xs p-4 text-center">
            <Search size={24} className="opacity-40 mb-2" />
            <p className="font-medium text-foreground">Nenhum ícone encontrado para "{busca}"</p>
            <p className="text-[11px] mt-1 text-muted-foreground max-w-xs">
              Tente buscar termos em inglês ou português (ex: "coffee", "design", "star", "camera") ou cole um emoji direto!
            </p>
          </div>
        )}
      </div>

      {/* Rodapé informativo */}
      <div className="pt-2 border-t border-border/40 mt-2 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
        <span>
          {iconesLocais.length + iconesWeb.length} ícones disponíveis
          {carregandoWeb && " • Buscando na web..."}
        </span>
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
            Escolha o logo oficial, símbolo ou emoji para <strong className="text-foreground">{favorito.nome || favorito.url}</strong>.
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
