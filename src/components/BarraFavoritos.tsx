import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Globe,
  Plus,
  ChevronsRight,
  ExternalLink,
  AppWindow,
  Pencil,
  Palette,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { lerConfig, configCompleta } from "@/lib/settings";
import {
  carregarFavoritos,
  lerFavoritosLocal,
  salvarFavoritosLocal,
  agendarPersistenciaRemota,
  flushPersistenciaPendente,
  normalizarUrl,
  extrairDominio,
  obterFaviconGoogle,
  EVENTO_FAVORITOS_ATUALIZADOS,
  type FavoritoItem,
} from "@/lib/favoritos";
import { cn } from "@/lib/utils";
import {
  RenderizadorIconeItem,
  SeletorGradeIcones,
} from "@/components/ModalSelecionarIconeFavorito";
import { sugerirIconePorUrl } from "@/lib/catalogoIconesMarcas";

/* ------------------------------------------------------------------ Ícone */

function FaviconIcone({
  url,
  nome,
  iconeCustomizado,
}: {
  url: string;
  nome?: string;
  iconeCustomizado?: string;
}) {
  const [erro, setErro] = useState(false);
  const src = useMemo(() => obterFaviconGoogle(url), [url]);

  // Reseta estado de erro se a URL mudar
  useEffect(() => {
    setErro(false);
  }, [src, url, iconeCustomizado]);

  // 1. Se o usuário selecionou um ícone customizado explicitamente
  if (iconeCustomizado) {
    return (
      <RenderizadorIconeItem
        iconeId={iconeCustomizado}
        tamanho={14}
        className="w-3.5 h-3.5"
      />
    );
  }

  // 2. Sugestão automática inteligente para serviços famosos (YouTube Music, WhatsApp, Gmail, Drive, etc.)
  const iconeSugerido = sugerirIconePorUrl(url);
  if (iconeSugerido && !erro) {
    return (
      <RenderizadorIconeItem
        iconeId={iconeSugerido}
        tamanho={14}
        className="w-3.5 h-3.5"
      />
    );
  }

  // 3. Favicon padrão do Google
  if (erro || !src) {
    return <Globe size={14} className="shrink-0 text-muted-foreground/80" />;
  }

  return (
    <img
      src={src}
      alt={nome || url}
      onError={() => setErro(true)}
      className="w-3.5 h-3.5 rounded-xs shrink-0 object-contain pointer-events-none"
      loading="lazy"
    />
  );
}

/* ----------------------------------------------------------- Item Sortable */

interface ItemFavoritoProps {
  item: FavoritoItem;
  onRegistrarLargura: (id: string, largura: number) => void;
  onNavegar: (url: string) => void;
  onEditar: (item: FavoritoItem) => void;
  onExcluir: (id: string) => void;
  onSalvarIcone: (id: string, iconeCustomizado?: string) => void;
}

const ItemFavorito = memo(function ItemFavorito({
  item,
  onRegistrarLargura,
  onNavegar,
  onEditar,
  onExcluir,
  onSalvarIcone,
}: ItemFavoritoProps) {
  const elementoRef = useRef<HTMLDivElement | null>(null);
  const [popoverAberto, setPopoverAberto] = useState(false);
  const [modoVisao, setModoVisao] = useState<"menu" | "icone">("menu");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? "none" : transition || "transform 150ms ease",
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const refCombinada = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    elementoRef.current = el;
  };

  useEffect(() => {
    if (elementoRef.current) {
      const rect = elementoRef.current.getBoundingClientRect();
      onRegistrarLargura(item.id, rect.width);
    }
  }, [item.id, item.nome, onRegistrarLargura]);

  const textoTooltip = item.nome ? `${item.nome} • ${item.url}` : item.url;

  const lidarClique = (e: React.MouseEvent) => {
    // Clique com o botão esquerdo: navega na mesma guia substituindo o Klaus
    if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onNavegar(item.url);
    }
  };

  const lidarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModoVisao("menu");
    setPopoverAberto(true);
  };

  return (
    <Popover
      open={popoverAberto}
      onOpenChange={(aberto) => {
        setPopoverAberto(aberto);
        if (!aberto) setModoVisao("menu");
      }}
    >
      <PopoverAnchor asChild>
        <div
          ref={refCombinada}
          style={style}
          {...attributes}
          {...listeners}
          className={cn(
            "group relative flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium cursor-pointer select-none touch-none shrink-0 transition-colors border border-transparent",
            "text-muted-foreground hover:text-foreground hover:bg-accent/70 hover:border-border/50",
            isDragging && "shadow-md bg-accent text-foreground ring-1 ring-primary/30",
            popoverAberto && "bg-accent text-foreground",
          )}
          onClick={lidarClique}
          onContextMenu={lidarContextMenu}
        >
          <Tooltip conteudo={textoTooltip} posicao="bottom">
            <div className="flex items-center gap-1.5 min-w-0">
              <FaviconIcone
                url={item.url}
                nome={item.nome}
                iconeCustomizado={item.iconeCustomizado}
              />
              {item.nome && (
                <span className="truncate max-w-[120px] text-xs font-normal tracking-tight">
                  {item.nome}
                </span>
              )}
            </div>
          </Tooltip>
        </div>
      </PopoverAnchor>

      {/* Popover Ancorado diretamente no ícone selecionado via botão direito */}
      <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "shadow-2xl bg-card border border-border rounded-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-100",
            modoVisao === "icone" ? "w-80 sm:w-96 p-3" : "w-48 p-1",
          )}
        >
          {modoVisao === "menu" ? (
            <div className="space-y-0.5">
              <div className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground truncate border-b border-border/40 mb-1">
                {item.nome || extrairDominio(item.url) || "Opções"}
              </div>

              <button
                type="button"
                onClick={() => setModoVisao("icone")}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left font-medium"
              >
                <Palette size={13} className="shrink-0 opacity-70 text-primary" />
                <span>Alterar ícone</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPopoverAberto(false);
                  onEditar(item);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
              >
                <Pencil size={13} className="shrink-0 opacity-70" />
                <span>Editar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPopoverAberto(false);
                  window.open(item.url, "_blank");
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
              >
                <ExternalLink size={13} className="shrink-0 opacity-70" />
                <span>Abrir em nova guia</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPopoverAberto(false);
                  window.open(
                    item.url,
                    "_blank",
                    "location=yes,status=yes,scrollbars=yes",
                  );
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
              >
                <AppWindow size={13} className="shrink-0 opacity-70" />
                <span>Abrir em nova janela</span>
              </button>

              <div className="h-px bg-border/40 my-1" />

              <button
                type="button"
                onClick={() => {
                  setPopoverAberto(false);
                  onExcluir(item.id);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
              >
                <Trash2 size={13} className="shrink-0 opacity-70" />
                <span>Excluir</span>
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <button
                  type="button"
                  onClick={() => setModoVisao("menu")}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  <ArrowLeft size={12} />
                  <span>Voltar</span>
                </button>
              </div>
              <SeletorGradeIcones
                iconeAtual={item.iconeCustomizado}
                titulo={item.nome || item.url}
                tamanhoPequeno={true}
                onSelecionar={(novoIcone) => {
                  onSalvarIcone(item.id, novoIcone.id);
                  setPopoverAberto(false);
                }}
                onRestaurar={() => {
                  onSalvarIcone(item.id, undefined);
                  setPopoverAberto(false);
                }}
                onFechar={() => setPopoverAberto(false)}
              />
            </div>
          )}
        </PopoverContent>
      </Popover>
  );
});

/* -------------------------------------------------- Item no Menu Overflow */

function ItemOverflow({
  item,
  onNavegar,
  onEditar,
  onExcluir,
  onSalvarIcone,
  onFecharOverflow,
}: {
  item: FavoritoItem;
  onNavegar: (url: string) => void;
  onEditar: (item: FavoritoItem) => void;
  onExcluir: (id: string) => void;
  onSalvarIcone: (id: string, iconeCustomizado?: string) => void;
  onFecharOverflow: () => void;
}) {
  const [popoverAberto, setPopoverAberto] = useState(false);
  const [modoVisao, setModoVisao] = useState<"menu" | "icone">("menu");

  return (
    <Popover
      open={popoverAberto}
      onOpenChange={(aberto) => {
        setPopoverAberto(aberto);
        if (!aberto) setModoVisao("menu");
      }}
    >
      <PopoverAnchor asChild>
        <div
          onClick={(e) => {
            if (e.button === 0) {
              onFecharOverflow();
              onNavegar(item.url);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setModoVisao("menu");
            setPopoverAberto(true);
          }}
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent transition-colors cursor-pointer group",
            popoverAberto && "bg-accent",
          )}
        >
          <FaviconIcone
            url={item.url}
            nome={item.nome}
            iconeCustomizado={item.iconeCustomizado}
          />
          <Tooltip conteudo={item.nome || item.url}>
            <span className="truncate flex-1">
              {item.nome || extrairDominio(item.url) || item.url}
            </span>
          </Tooltip>
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="end"
        side="right"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "shadow-2xl bg-card border border-border rounded-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-100",
          modoVisao === "icone" ? "w-80 sm:w-96 p-3" : "w-48 p-1",
        )}
      >
          {modoVisao === "menu" ? (
            <div className="space-y-0.5">
              <div className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground truncate border-b border-border/40 mb-1">
                {item.nome || extrairDominio(item.url) || "Opções"}
              </div>

              <button
                type="button"
                onClick={() => setModoVisao("icone")}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left font-medium"
              >
                <Palette size={13} className="shrink-0 opacity-70 text-primary" />
                <span>Alterar ícone</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPopoverAberto(false);
                  onFecharOverflow();
                  onEditar(item);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
              >
                <Pencil size={13} className="shrink-0 opacity-70" />
                <span>Editar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPopoverAberto(false);
                  onFecharOverflow();
                  window.open(item.url, "_blank");
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
              >
                <ExternalLink size={13} className="shrink-0 opacity-70" />
                <span>Abrir em nova guia</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPopoverAberto(false);
                  onFecharOverflow();
                  window.open(
                    item.url,
                    "_blank",
                    "location=yes,status=yes,scrollbars=yes",
                  );
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
              >
                <AppWindow size={13} className="shrink-0 opacity-70" />
                <span>Abrir em nova janela</span>
              </button>

              <div className="h-px bg-border/40 my-1" />

              <button
                type="button"
                onClick={() => {
                  setPopoverAberto(false);
                  onExcluir(item.id);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
              >
                <Trash2 size={13} className="shrink-0 opacity-70" />
                <span>Excluir</span>
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <button
                  type="button"
                  onClick={() => setModoVisao("menu")}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  <ArrowLeft size={12} />
                  <span>Voltar</span>
                </button>
              </div>
              <SeletorGradeIcones
                iconeAtual={item.iconeCustomizado}
                titulo={item.nome || item.url}
                tamanhoPequeno={true}
                onSelecionar={(novoIcone) => {
                  onSalvarIcone(item.id, novoIcone.id);
                  setPopoverAberto(false);
                  onFecharOverflow();
                }}
                onRestaurar={() => {
                  onSalvarIcone(item.id, undefined);
                  setPopoverAberto(false);
                  onFecharOverflow();
                }}
                onFechar={() => setPopoverAberto(false)}
              />
            </div>
          )}
        </PopoverContent>
      </Popover>
  );
}

/* ----------------------------------------------------- Barra de Favoritos */

export function BarraFavoritos({ className }: { className?: string }) {
  const [favoritos, setFavoritos] = useState<FavoritoItem[]>(() => {
    return [];
  });

  // Modal de Adicionar / Editar
  const [modalAberto, setModalAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState<FavoritoItem | null>(null);
  const [formUrl, setFormUrl] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formErro, setFormErro] = useState("");

  // Popover de Overflow (>>)
  const [overflowAberto, setOverflowAberto] = useState(false);

  // Medição de largura e cálculo de overflow
  const containerRef = useRef<HTMLDivElement>(null);
  const largurasRef = useRef<Map<string, number>>(new Map());
  const [larguraContainer, setLarguraContainer] = useState(0);
  const [quantidadeVisivel, setQuantidadeVisivel] = useState(favoritos.length);

  const cfg = useMemo(() => lerConfig(), []);
  const pronto = configCompleta(cfg);

  // Salvar ícone customizado selecionado
  const lidarSalvarIconeCustomizado = (id: string, iconeCustomizado?: string) => {
    const novaLista = favoritos.map((f) =>
      f.id === id ? { ...f, iconeCustomizado } : f,
    );
    setFavoritos(novaLista);
    agendarPersistenciaRemota(cfg, novaLista, 300);
  };

  // Carregar favoritos iniciais e sincronizar com eventos locais
  useEffect(() => {
    let cancelado = false;

    // Carrega do cache local de imediato
    const locais = lerFavoritosLocal();
    if (locais && locais.length > 0) {
      setFavoritos(locais);
    }

    // Se estiver configurado, busca do GitHub apenas uma vez no carregamento
    if (pronto) {
      carregarFavoritos(cfg).then((res) => {
        if (!cancelado && res.itens && res.itens.length > 0) {
          setFavoritos(res.itens);
        }
      });
    }

    // Atualiza o estado quando os favoritos locais mudarem (sem refazer requisições de rede ao GitHub!)
    const atualizarDaChave = (e: Event) => {
      if (cancelado) return;
      const custom = e as CustomEvent<FavoritoItem[]>;
      if (custom.detail && Array.isArray(custom.detail)) {
        setFavoritos(custom.detail);
      } else {
        setFavoritos(lerFavoritosLocal());
      }
    };

    window.addEventListener(EVENTO_FAVORITOS_ATUALIZADOS, atualizarDaChave);
    return () => {
      cancelado = true;
      window.removeEventListener(EVENTO_FAVORITOS_ATUALIZADOS, atualizarDaChave);
    };
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  // Salva imediatamente qualquer alteração pendente se o usuário fechar a aba ou janela
  useEffect(() => {
    const aoSair = () => {
      flushPersistenciaPendente(cfg);
    };
    window.addEventListener("beforeunload", aoSair);
    window.addEventListener("pagehide", aoSair);
    return () => {
      window.removeEventListener("beforeunload", aoSair);
      window.removeEventListener("pagehide", aoSair);
    };
  }, [cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  const navegarParaUrl = useCallback(
    (url: string) => {
      flushPersistenciaPendente(cfg);
      if (url.startsWith("/") || url.startsWith("#")) {
        const rota = url.replace(/^\/?#?\/?/, "");
        window.open(`https://hugossssssssssssss.github.io/segundo-cerebro/#/${rota}`, "_blank");
      } else {
        window.location.href = url;
      }
    },
    [cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch],
  );

  // Observer de redimensionamento do container para cálculo de overflow
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setLarguraContainer(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const registrarLarguraItem = useCallback((id: string, largura: number) => {
    largurasRef.current.set(id, largura);
  }, []);

  // Recalcular quantidade de itens visíveis
  useEffect(() => {
    if (!larguraContainer || favoritos.length === 0) {
      setQuantidadeVisivel(favoritos.length);
      return;
    }

    const larguraBotaoAdicionar = 28;
    const larguraBotaoOverflow = 30;
    const espacamento = 4;

    let larguraAcumulada = larguraBotaoAdicionar + espacamento;
    let cabem = 0;

    for (let i = 0; i < favoritos.length; i++) {
      const id = favoritos[i].id;
      const larguraEstimada = largurasRef.current.get(id) || 75;

      const precisaDeOverflowParaRestante = i < favoritos.length - 1;
      const margemOverflow = precisaDeOverflowParaRestante
        ? larguraBotaoOverflow + espacamento
        : 0;

      if (larguraAcumulada + larguraEstimada + margemOverflow <= larguraContainer) {
        larguraAcumulada += larguraEstimada + espacamento;
        cabem++;
      } else {
        break;
      }
    }

    setQuantidadeVisivel(Math.max(1, cabem));
  }, [larguraContainer, favoritos]);

  const itensVisiveis = useMemo(() => {
    return favoritos.slice(0, quantidadeVisivel);
  }, [favoritos, quantidadeVisivel]);

  const itensOverflow = useMemo(() => {
    return favoritos.slice(quantidadeVisivel);
  }, [favoritos, quantidadeVisivel]);

  const idsVisiveis = useMemo(() => {
    return itensVisiveis.map((f) => f.id);
  }, [itensVisiveis]);

  // Sensores de arrastar e soltar (Pointer com distância mínima para não interferir em cliques)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const lidarDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const indexAntigo = favoritos.findIndex((f) => f.id === active.id);
    const indexNovo = favoritos.findIndex((f) => f.id === over.id);

    if (indexAntigo !== -1 && indexNovo !== -1) {
      const novaLista = [...favoritos];
      const [removido] = novaLista.splice(indexAntigo, 1);
      novaLista.splice(indexNovo, 0, removido);

      setFavoritos(novaLista);
      salvarFavoritosLocal(novaLista);
      agendarPersistenciaRemota(cfg, novaLista, 2000);
    }
  };

  // Abrir Modal de Adicionar
  const abrirModalAdicionar = () => {
    setItemEditando(null);
    setFormUrl("");
    setFormNome("");
    setFormErro("");
    setModalAberto(true);
  };

  // Abrir Modal de Edição
  const abrirModalEditar = (item: FavoritoItem) => {
    setItemEditando(item);
    setFormUrl(item.url);
    setFormNome(item.nome || "");
    setFormErro("");
    setModalAberto(true);
  };

  // Excluir favorito
  const excluirFavorito = (id: string) => {
    const novaLista = favoritos.filter((f) => f.id !== id);
    setFavoritos(novaLista);
    agendarPersistenciaRemota(cfg, novaLista, 300);
  };

  // Submissão do formulário de salvar/adicionar
  const salvarFormulario = (e: React.FormEvent) => {
    e.preventDefault();
    const urlLimpa = formUrl.trim();
    if (!urlLimpa) {
      setFormErro("Informe a URL do site.");
      return;
    }

    const urlNormalizada = normalizarUrl(urlLimpa);
    const nomeLimpo = formNome.trim() || undefined;

    if (itemEditando) {
      // Editar existente
      const novaLista = favoritos.map((f) =>
        f.id === itemEditando.id ? { ...f, url: urlNormalizada, nome: nomeLimpo } : f,
      );
      setFavoritos(novaLista);
      agendarPersistenciaRemota(cfg, novaLista, 300);
    } else {
      // Novo item
      const novoItem: FavoritoItem = {
        id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url: urlNormalizada,
        nome: nomeLimpo,
        criadoEm: new Date().toISOString(),
      };
      const novaLista = [...favoritos, novoItem];
      setFavoritos(novaLista);
      agendarPersistenciaRemota(cfg, novaLista, 300);
    }

    setModalAberto(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center gap-1 min-w-0 h-8 overflow-hidden select-none",
        className,
      )}
    >
      {/* Botão de Adicionar Rápido */}
      <Tooltip conteudo="Adicionar link aos favoritos" posicao="bottom">
        <button
          type="button"
          onClick={abrirModalAdicionar}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0 cursor-pointer"
          aria-label="Adicionar favorito"
        >
          <Plus size={14} />
        </button>
      </Tooltip>

      {/* Lista de Favoritos com Drag-and-Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={lidarDragEnd}
      >
        <SortableContext items={idsVisiveis} strategy={horizontalListSortingStrategy}>
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            {itensVisiveis.map((item) => (
              <ItemFavorito
                key={item.id}
                item={item}
                onRegistrarLargura={registrarLarguraItem}
                onNavegar={navegarParaUrl}
                onEditar={abrirModalEditar}
                onExcluir={excluirFavorito}
                onSalvarIcone={lidarSalvarIconeCustomizado}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Botão de Overflow (>>) quando há itens ocultos */}
      {itensOverflow.length > 0 && (
        <Popover open={overflowAberto} onOpenChange={setOverflowAberto}>
          <Tooltip conteudo={`Mais ${itensOverflow.length} favoritos`} posicao="bottom">
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex h-7 px-1.5 items-center gap-1 rounded-md text-xs font-semibold shrink-0 cursor-pointer transition-colors",
                  overflowAberto
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                aria-label="Mais favoritos"
              >
                <ChevronsRight size={14} />
                <span className="text-[10px] font-mono opacity-80">
                  {itensOverflow.length}
                </span>
              </button>
            </PopoverTrigger>
          </Tooltip>

          <PopoverContent
            align="start"
            side="bottom"
            sideOffset={4}
            className="w-56 p-1.5 shadow-xl bg-card border border-border rounded-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150 max-h-80 overflow-y-auto"
          >
            <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground border-b border-border/40 mb-1">
              Favoritos Adicionais
            </div>
            <div className="space-y-0.5">
              {itensOverflow.map((it) => (
                <ItemOverflow
                  key={it.id}
                  item={it}
                  onNavegar={navegarParaUrl}
                  onEditar={abrirModalEditar}
                  onExcluir={excluirFavorito}
                  onSalvarIcone={lidarSalvarIconeCustomizado}
                  onFecharOverflow={() => setOverflowAberto(false)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Modal / Dialog de Adicionar e Editar Favorito */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {itemEditando ? "Editar Favorito" : "Adicionar Favorito"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={salvarFormulario} className="space-y-4 pt-2">
            <div>
              <label
                htmlFor="fav-url"
                className="block text-xs font-medium text-foreground mb-1"
              >
                URL do site <span className="text-destructive">*</span>
              </label>
              <input
                id="fav-url"
                type="text"
                value={formUrl}
                onChange={(e) => {
                  setFormUrl(e.target.value);
                  setFormErro("");
                }}
                placeholder="ex: github.com ou https://notion.so"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
              {formErro && (
                <p className="mt-1 text-xs text-destructive">{formErro}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="fav-nome"
                className="block text-xs font-medium text-foreground mb-1"
              >
                Nome de exibição (opcional)
              </label>
              <input
                id="fav-nome"
                type="text"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="ex: GitHub (se vazio, exibe apenas o ícone)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Se deixar o nome vazio, o favorito aparecerá na barra apenas como um ícone minimalista.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm cursor-pointer font-semibold"
              >
                {itemEditando ? "Salvar Alterações" : "Adicionar"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
