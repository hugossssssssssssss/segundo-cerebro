import { NavLink } from "react-router-dom";
import {
  X,
  Sparkles,
  Settings,
  Moon,
  Sun,
  Palette,
  Smartphone,
  Search,
  ChevronRight,
} from "lucide-react";
import {
  carregarMenuPersonalizado,
  EVENTO_MENU_ATUALIZADO,
  ehItemMenuValido,
  type GrupoMenuPersonalizado,
} from "@/lib/menuPersonalizado";
import { obterIconePorNome } from "@/lib/icones";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback, useMemo } from "react";
import { LogoKlaus } from "./LogoKlaus";
import { ModalPersonalizarMenu } from "./ModalPersonalizarMenu";
import { ModalInstalarPwa } from "./ModalInstalarPwa";
import { alternarTema, lerTemaSalvo, type Tema } from "@/lib/tema";
import { VERSAO_APP } from "@/lib/versao";

interface GavetaMaisProps {
  aberta: boolean;
  aoFechar: () => void;
}

export function GavetaMais({ aberta, aoFechar }: GavetaMaisProps) {
  const [tema, setTema] = useState<Tema>(lerTemaSalvo);
  const [modalInstalarAberta, setModalInstalarAberta] = useState(false);
  const [arrastoY, setArrastoY] = useState(0);
  const [toqueInicialY, setToqueInicialY] = useState<number | null>(null);
  const [buscaMenu, setBuscaMenu] = useState("");

  const lidarTouchStart = (e: React.TouchEvent) => {
    setToqueInicialY(e.touches[0].clientY);
  };

  const lidarTouchMove = (e: React.TouchEvent) => {
    if (toqueInicialY === null) return;
    const deltaY = e.touches[0].clientY - toqueInicialY;
    if (deltaY > 0) {
      setArrastoY(deltaY);
    }
  };

  const lidarTouchEnd = () => {
    if (arrastoY > 75) {
      aoFechar();
    }
    setArrastoY(0);
    setToqueInicialY(null);
  };

  useEffect(() => {
    const aoMudar = () => setTema(lerTemaSalvo());
    window.addEventListener("tema-alterado", aoMudar);
    return () => window.removeEventListener("tema-alterado", aoMudar);
  }, []);

  const escuro = tema === "escuro";
  const toggleTema = () => {
    const novo = alternarTema();
    setTema(novo);
  };

  const [grupos, setGrupos] = useState<GrupoMenuPersonalizado[]>(carregarMenuPersonalizado);
  const [modalPersonalizarAberta, setModalPersonalizarAberta] = useState(false);

  const atualizarMenu = useCallback(() => {
    try {
      setGrupos(carregarMenuPersonalizado());
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    window.addEventListener(EVENTO_MENU_ATUALIZADO, atualizarMenu);
    return () => window.removeEventListener(EVENTO_MENU_ATUALIZADO, atualizarMenu);
  }, [atualizarMenu]);

  useEffect(() => {
    if (!aberta) {
      setBuscaMenu("");
      return;
    }
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [aberta, aoFechar]);

  // Filtragem dos grupos de itens pelo campo de busca
  const gruposFiltrados = useMemo(() => {
    const termo = buscaMenu.trim().toLowerCase();
    if (!termo) {
      return (grupos || []).filter((g) => g && Array.isArray(g.itens));
    }
    return (grupos || [])
      .map((g) => {
        const itens = (g.itens || []).filter((item) => {
          if (!item || item.oculto || !ehItemMenuValido(item)) return false;
          const r = (item.rotulo || "").toLowerCase();
          return r.includes(termo);
        });
        return { ...g, itens };
      })
      .filter((g) => g.itens.length > 0);
  }, [grupos, buscaMenu]);

  if (!aberta) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 sm:hidden backdrop-blur-xs animate-in fade-in duration-200 overscroll-none select-none">
        {/* Fundo clicável para fechar */}
        <div className="flex-1" onClick={aoFechar} />

        {/* Conteúdo do Menu estilo Bottom Sheet com suporte a arrastar para baixo */}
        <div
          style={{
            transform: arrastoY > 0 ? `translateY(${arrastoY}px)` : undefined,
            transition: arrastoY === 0 ? "transform 0.2s ease" : "none",
          }}
          className="rounded-t-3xl border-t border-border bg-card/95 p-4 pb-[max(env(safe-area-inset-bottom),16px)] shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto backdrop-blur-xl animate-in slide-in-from-bottom duration-250 touch-pan-y"
        >
          {/* Puxador com área de toque ampliada */}
          <div
            onTouchStart={lidarTouchStart}
            onTouchMove={lidarTouchMove}
            onTouchEnd={lidarTouchEnd}
            className="w-full py-1.5 -mt-2 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center touch-none"
          >
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 select-none hover:bg-muted-foreground/50 transition-colors" />
          </div>

          {/* Topo do Menu com Logo e Versão */}
          <div
            onTouchStart={lidarTouchStart}
            onTouchMove={lidarTouchMove}
            onTouchEnd={lidarTouchEnd}
            className="flex items-center justify-between pb-2 border-b border-border/60 touch-none"
          >
            <div className="flex items-center gap-2.5">
              <LogoKlaus tamanho={28} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-foreground">
                    Menu Klaus
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">
                    v{VERSAO_APP}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Navegação e ferramentas rápidas</p>
              </div>
            </div>
            <button
              onClick={aoFechar}
              className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Campo de Busca Rápida no Menu */}
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none"
            />
            <input
              type="text"
              value={buscaMenu}
              onChange={(e) => setBuscaMenu(e.target.value)}
              placeholder="Buscar funcionalidades e telas..."
              className="w-full pl-10 pr-9 py-2.5 text-sm rounded-2xl border border-border/80 bg-background/80 focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
            />
            {buscaMenu && (
              <button
                type="button"
                onClick={() => setBuscaMenu("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Atalhos Rápidos Principais */}
          <div className="grid grid-cols-4 gap-2">
            <NavLink
              to="/config"
              onClick={aoFechar}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-2xl border transition-all text-center touch-manipulation min-h-[58px]",
                  isActive
                    ? "bg-primary/10 border-primary/40 text-primary font-bold shadow-xs"
                    : "bg-secondary/40 border-border/60 text-foreground hover:bg-accent"
                )
              }
            >
              <Settings size={18} className="text-primary shrink-0" />
              <span className="text-[11px] font-medium truncate w-full">Ajustes</span>
            </NavLink>

            <button
              type="button"
              onClick={() => {
                setModalPersonalizarAberta(true);
              }}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl border border-border/60 bg-secondary/40 text-foreground hover:bg-accent transition-all text-center touch-manipulation min-h-[58px] cursor-pointer"
            >
              <Palette size={18} className="text-purple-500 shrink-0" />
              <span className="text-[11px] font-medium truncate w-full">Personalizar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalInstalarAberta(true);
              }}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl border border-border/60 bg-secondary/40 text-foreground hover:bg-accent transition-all text-center touch-manipulation min-h-[58px] cursor-pointer"
            >
              <Smartphone size={18} className="text-emerald-500 shrink-0" />
              <span className="text-[11px] font-medium truncate w-full">Instalar</span>
            </button>

            <button
              type="button"
              onClick={toggleTema}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl border border-border/60 bg-secondary/40 text-foreground hover:bg-accent transition-all text-center touch-manipulation min-h-[58px] cursor-pointer"
            >
              {escuro ? (
                <Sun size={18} className="text-amber-500 shrink-0" />
              ) : (
                <Moon size={18} className="text-blue-500 shrink-0" />
              )}
              <span className="text-[11px] font-medium truncate w-full">
                {escuro ? "Claro" : "Escuro"}
              </span>
            </button>
          </div>

          {/* Lista de Telas Categorizadas */}
          <div className="space-y-4 pt-1">
            {gruposFiltrados.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma funcionalidade encontrada para &quot;{buscaMenu}&quot;.
              </div>
            ) : (
              gruposFiltrados.map((grupo) => {
                const itensVisiveis = (grupo.itens || []).filter(
                  (item) => item && typeof item === "object" && !item.oculto && ehItemMenuValido(item)
                );
                if (itensVisiveis.length === 0) return null;

                return (
                  <div key={grupo.id || grupo.titulo} className="space-y-2">
                    <h3 className="px-1 text-[11px] font-bold text-muted-foreground/80 tracking-wider uppercase truncate">
                      {grupo.titulo}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {itensVisiveis.map((item) => {
                        const Icone = obterIconePorNome(item.iconeNome || "HelpCircle");
                        return (
                          <NavLink
                            key={item.id || item.para}
                            to={item.para || "/home"}
                            onClick={aoFechar}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-2.5 rounded-2xl p-2.5 text-xs font-medium border transition-all touch-manipulation min-h-[52px]",
                                isActive
                                  ? "bg-primary/10 border-primary/40 text-primary font-bold shadow-xs ring-1 ring-primary/20"
                                  : "bg-card border-border/70 text-foreground hover:bg-accent active:bg-accent"
                              )
                            }
                          >
                            <div
                              className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 bg-secondary/80 border border-border/40"
                              style={item.cor ? { color: item.cor } : undefined}
                            >
                              <Icone size={17} className="shrink-0" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold leading-tight">
                                {item.rotulo || "Item"}
                              </p>
                            </div>
                            {item.destaque ? (
                              <Sparkles size={13} className="text-amber-500 shrink-0" />
                            ) : (
                              <ChevronRight size={14} className="text-muted-foreground/40 shrink-0" />
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de Personalização */}
      <ModalPersonalizarMenu
        aberta={modalPersonalizarAberta}
        aoFechar={() => {
          setModalPersonalizarAberta(false);
          aoFechar();
        }}
      />

      {/* Modal de Instalação do App */}
      <ModalInstalarPwa
        aberta={modalInstalarAberta}
        aoFechar={() => setModalInstalarAberta(false)}
      />
    </>
  );
}
