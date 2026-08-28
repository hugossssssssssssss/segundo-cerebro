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
  Trash2,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  salvarFavoritosLocal,
  agendarPersistenciaRemota,
  normalizarUrl,
  extrairDominio,
  obterFaviconGoogle,
  EVENTO_FAVORITOS_ATUALIZADOS,
  type FavoritoItem,
} from "@/lib/favoritos";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Ícone */

function FaviconIcone({ url, nome }: { url: string; nome?: string }) {
  const [erro, setErro] = useState(false);
  const src = useMemo(() => obterFaviconGoogle(url), [url]);

  // Reseta estado de erro se a URL mudar
  useEffect(() => {
    setErro(false);
  }, [src]);

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
  onContextMenu: (e: React.MouseEvent, item: FavoritoItem) => void;
  onRegistrarLargura: (id: string, largura: number) => void;
}

const ItemFavorito = memo(function ItemFavorito({
  item,
  onContextMenu,
  onRegistrarLargura,
}: ItemFavoritoProps) {
  const elementoRef = useRef<HTMLDivElement | null>(null);

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
      window.location.href = item.url;
    }
  };

  return (
    <div
      ref={refCombinada}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium cursor-pointer select-none touch-none shrink-0 transition-colors border border-transparent",
        "text-muted-foreground hover:text-foreground hover:bg-accent/70 hover:border-border/50",
        isDragging && "shadow-md bg-accent text-foreground ring-1 ring-primary/30",
      )}
      onClick={lidarClique}
      onContextMenu={(e) => onContextMenu(e, item)}
    >
      <Tooltip conteudo={textoTooltip} posicao="bottom">
        <div className="flex items-center gap-1.5 min-w-0">
          <FaviconIcone url={item.url} nome={item.nome} />
          {item.nome && (
            <span className="truncate max-w-[120px] text-xs font-normal tracking-tight">
              {item.nome}
            </span>
          )}
        </div>
      </Tooltip>
    </div>
  );
});

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

  // Menu de Contexto (botão direito)
  const [menuContexto, setMenuContexto] = useState<{
    aberto: boolean;
    x: number;
    y: number;
    item: FavoritoItem | null;
  }>({ aberto: false, x: 0, y: 0, item: null });

  // Popover de Overflow (>>)
  const [overflowAberto, setOverflowAberto] = useState(false);

  // Medição de largura e cálculo de overflow
  const containerRef = useRef<HTMLDivElement>(null);
  const largurasRef = useRef<Map<string, number>>(new Map());
  const [larguraContainer, setLarguraContainer] = useState(0);
  const [quantidadeVisivel, setQuantidadeVisivel] = useState(favoritos.length);

  const cfg = useMemo(() => lerConfig(), []);
  const pronto = configCompleta(cfg);

  // Carregar favoritos iniciais
  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const res = await carregarFavoritos(cfg);
      if (!cancelado) {
        setFavoritos(res.itens);
      }
    }

    carregar();

    const atualizarDaChave = () => {
      if (!cancelado) {
        carregarFavoritos(cfg).then((r) => {
          if (!cancelado) setFavoritos(r.itens);
        });
      }
    };

    window.addEventListener(EVENTO_FAVORITOS_ATUALIZADOS, atualizarDaChave);
    return () => {
      cancelado = true;
      window.removeEventListener(EVENTO_FAVORITOS_ATUALIZADOS, atualizarDaChave);
    };
  }, [pronto, cfg]);

  // Fechar menu de contexto ao clicar fora
  useEffect(() => {
    if (!menuContexto.aberto) return;
    const fechar = () => setMenuContexto((prev) => ({ ...prev, aberto: false }));
    window.addEventListener("click", fechar);
    window.addEventListener("contextmenu", fechar);
    return () => {
      window.removeEventListener("click", fechar);
      window.removeEventListener("contextmenu", fechar);
    };
  }, [menuContexto.aberto]);

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
    const gap = 4;

    // Espaço disponível descontando o botão "+"
    const espacoTotal = larguraContainer - larguraBotaoAdicionar;

    let larguraAcumulada = 0;
    let cabem = 0;

    for (let i = 0; i < favoritos.length; i++) {
      const it = favoritos[i];
      const w = largurasRef.current.get(it.id) || (it.nome ? 95 : 32);
      const precisaOverflow = i < favoritos.length - 1;
      const margemReserva = precisaOverflow ? larguraBotaoOverflow + gap : 0;

      if (larguraAcumulada + w + margemReserva <= espacoTotal) {
        larguraAcumulada += w + gap;
        cabem++;
      } else {
        break;
      }
    }

    setQuantidadeVisivel(Math.max(0, cabem));
  }, [larguraContainer, favoritos]);

  // Sensores de Drag-and-Drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const lidarDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const indexAntigo = favoritos.findIndex((f) => f.id === active.id);
      const indexNovo = favoritos.findIndex((f) => f.id === over.id);
      if (indexAntigo !== -1 && indexNovo !== -1) {
        const novaLista = [...favoritos];
        const [removido] = novaLista.splice(indexAntigo, 1);
        novaLista.splice(indexNovo, 0, removido);

        setFavoritos(novaLista);
        salvarFavoritosLocal(novaLista);
        agendarPersistenciaRemota(cfg, novaLista);
      }
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
    salvarFavoritosLocal(novaLista);
    agendarPersistenciaRemota(cfg, novaLista);
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
      salvarFavoritosLocal(novaLista);
      agendarPersistenciaRemota(cfg, novaLista);
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
      salvarFavoritosLocal(novaLista);
      agendarPersistenciaRemota(cfg, novaLista);
    }

    setModalAberto(false);
  };

  const lidarContextMenu = (e: React.MouseEvent, item: FavoritoItem) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuContexto({
      aberto: true,
      x: Math.min(e.clientX, window.innerWidth - 180),
      y: Math.min(e.clientY, window.innerHeight - 180),
      item,
    });
  };

  const itensVisiveis = useMemo(() => {
    return favoritos.slice(0, quantidadeVisivel);
  }, [favoritos, quantidadeVisivel]);

  const itensOverflow = useMemo(() => {
    return favoritos.slice(quantidadeVisivel);
  }, [favoritos, quantidadeVisivel]);

  const idsVisiveis = useMemo(() => itensVisiveis.map((f) => f.id), [itensVisiveis]);

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
                onContextMenu={lidarContextMenu}
                onRegistrarLargura={registrarLarguraItem}
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
                <div
                  key={it.id}
                  onClick={(e) => {
                    if (e.button === 0) {
                      setOverflowAberto(false);
                      window.location.href = it.url;
                    }
                  }}
                  onContextMenu={(e) => {
                    setOverflowAberto(false);
                    lidarContextMenu(e, it);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent transition-colors cursor-pointer group"
                >
                  <FaviconIcone url={it.url} nome={it.nome} />
                  <span className="truncate flex-1" title={it.nome || it.url}>
                    {it.nome || extrairDominio(it.url) || it.url}
                  </span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Menu de Contexto (botão direito) */}
      {menuContexto.aberto && menuContexto.item && (
        <div
          style={{ top: menuContexto.y, left: menuContexto.x }}
          className="fixed z-50 w-48 rounded-xl border border-border bg-card/95 p-1 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground truncate border-b border-border/40 mb-1">
            {menuContexto.item.nome || extrairDominio(menuContexto.item.url) || "Opções"}
          </div>

          <button
            type="button"
            onClick={() => {
              window.open(menuContexto.item!.url, "_blank");
              setMenuContexto((prev) => ({ ...prev, aberto: false }));
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
          >
            <ExternalLink size={13} className="shrink-0 opacity-70" />
            <span>Abrir em nova guia</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.open(
                menuContexto.item!.url,
                "_blank",
                "location=yes,status=yes,scrollbars=yes",
              );
              setMenuContexto((prev) => ({ ...prev, aberto: false }));
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
              const itemParaEditar = menuContexto.item!;
              setMenuContexto((prev) => ({ ...prev, aberto: false }));
              abrirModalEditar(itemParaEditar);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
          >
            <Pencil size={13} className="shrink-0 opacity-70" />
            <span>Editar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const id = menuContexto.item!.id;
              setMenuContexto((prev) => ({ ...prev, aberto: false }));
              excluirFavorito(id);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
          >
            <Trash2 size={13} className="shrink-0 opacity-70" />
            <span>Excluir</span>
          </button>
        </div>
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
                  if (formErro) setFormErro("");
                }}
                placeholder="ex: https://github.com ou figma.com"
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40",
                  formErro ? "border-destructive" : "border-border",
                )}
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
