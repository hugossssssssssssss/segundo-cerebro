import { NavLink } from "react-router-dom";
import {
  ChevronLeft,
  Sun,
  Moon,
  Sparkles,
  Settings,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback, useRef } from "react";
import { LogoKlaus } from "./LogoKlaus";
import {
  carregarMenuPersonalizado,
  EVENTO_MENU_ATUALIZADO,
  type GrupoMenuPersonalizado,
} from "@/lib/menuPersonalizado";
import { obterIconePorNome } from "@/lib/icones";
import { ModalPersonalizarMenu } from "./ModalPersonalizarMenu";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { alternarTema, lerTemaSalvo, type Tema } from "@/lib/tema";
import { VERSAO_APP } from "@/lib/versao";

interface NavegacaoLateralProps {
  colapsada: boolean;
  setColapsada: React.Dispatch<React.SetStateAction<boolean>>;
  aoNavegar?: () => void;
  className?: string;
}

export function NavegacaoLateral({
  colapsada,
  setColapsada,
  aoNavegar,
  className,
}: NavegacaoLateralProps) {
  const [tema, setTema] = useState<Tema>(lerTemaSalvo);
  const [hoverExpandida, setHoverExpandida] = useState(false);
  const timeoutHoverRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  let workspace: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    workspace = useWorkspace();
  } catch {}

  const workspaceAberto = !!workspace?.workspaceAberto;

  // Expande no hover se estiver colapsada (e não em modo workspace)
  const visualmenteExpandida = !colapsada || (hoverExpandida && !workspaceAberto);

  const lidarMouseEnter = () => {
    if (timeoutHoverRef.current) {
      clearTimeout(timeoutHoverRef.current);
      timeoutHoverRef.current = null;
    }
    if (colapsada && !workspaceAberto) {
      setHoverExpandida(true);
    }
  };

  const lidarMouseLeave = () => {
    if (timeoutHoverRef.current) {
      clearTimeout(timeoutHoverRef.current);
    }
    timeoutHoverRef.current = setTimeout(() => {
      setHoverExpandida(false);
    }, 150);
  };

  const lidarCliqueItem = () => {
    if (workspaceAberto && workspace?.fecharWorkspace) {
      workspace.fecharWorkspace();
    }
    if (aoNavegar) aoNavegar();
    if (colapsada) {
      setHoverExpandida(false);
    }
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
    window.addEventListener("klaus-preferencias-atualizadas", atualizarMenu);
    window.addEventListener("klaus-settings-atualizadas", atualizarMenu);
    return () => {
      window.removeEventListener(EVENTO_MENU_ATUALIZADO, atualizarMenu);
      window.removeEventListener("klaus-preferencias-atualizadas", atualizarMenu);
      window.removeEventListener("klaus-settings-atualizadas", atualizarMenu);
    };
  }, [atualizarMenu]);

  useEffect(() => {
    return () => {
      if (timeoutHoverRef.current) {
        clearTimeout(timeoutHoverRef.current);
      }
    };
  }, []);

  return (
    <>
      <aside
        onMouseEnter={lidarMouseEnter}
        onMouseLeave={lidarMouseLeave}
        className={cn(
          "flex flex-col liquid-glass-sidebar transition-sidebar select-none shrink-0 z-30 overflow-hidden",
          visualmenteExpandida ? "w-60 shadow-xl sm:shadow-none" : "w-16",
          className
        )}
      >
        {/* Topo da Sidebar: Marca e Botão de Recolher/Expandir */}
        <div className="flex h-14 items-center px-2 border-b border-border/30 shrink-0 overflow-hidden relative">
          <div
            className={cn(
              "flex items-center min-w-0 transition-all duration-200",
              visualmenteExpandida ? "justify-between w-full px-1" : "justify-center w-full"
            )}
          >
            <NavLink
              to="/home"
              onClick={lidarCliqueItem}
              className={cn(
                "flex items-center rounded-xl transition-colors duration-150 group cursor-pointer",
                visualmenteExpandida
                  ? "gap-2.5 min-w-0 hover:opacity-90 pl-1"
                  : "w-10 h-10 justify-center hover:bg-accent/60"
              )}
              title={!visualmenteExpandida ? "Klaus Início" : undefined}
            >
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <LogoKlaus tamanho={24} />
              </div>

              <div
                className={cn(
                  "overflow-hidden whitespace-nowrap transition-sidebar-content flex items-baseline gap-1.5 min-w-0",
                  !visualmenteExpandida
                    ? "w-0 max-w-0 opacity-0 -translate-x-3 pointer-events-none"
                    : "flex-1 max-w-[130px] opacity-100 translate-x-0"
                )}
              >
                <span className="truncate text-sm font-bold tracking-tight text-foreground group-hover:opacity-80 transition-opacity">
                  Klaus
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60 font-medium select-none">
                  v{VERSAO_APP}
                </span>
              </div>
            </NavLink>

            {/* Botão de fixar/recolher visível quando expandida */}
            <div
              className={cn(
                "transition-sidebar-content shrink-0",
                !visualmenteExpandida
                  ? "w-0 max-w-0 opacity-0 scale-75 overflow-hidden pointer-events-none"
                  : "max-w-[36px] opacity-100 scale-100"
              )}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setColapsada((v) => !v);
                  setHoverExpandida(false);
                }}
                className="hidden sm:flex items-center justify-center rounded-xl p-1.5 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer"
                title={colapsada ? "Fixar barra lateral aberta" : "Recolher barra lateral (⌘B)"}
                aria-label="Alternar fixação da barra lateral"
              >
                <ChevronLeft
                  size={16}
                  className={cn("transition-transform duration-200", colapsada && "rotate-180")}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Corpo da Navegação */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 px-2 space-y-3">
          {(grupos || []).filter((g) => g && Array.isArray(g.itens)).map((grupo, idx) => {
            const itensVisiveis = (grupo.itens || []).filter((item) => item && typeof item === "object" && !item.oculto);
            if (itensVisiveis.length === 0) return null;

            return (
              <div key={grupo.id || grupo.titulo} className="space-y-0.5">
                {/* Título de seção com fade suave */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] select-none",
                    !visualmenteExpandida
                      ? "max-h-0 opacity-0 -translate-y-1 mb-0 pointer-events-none"
                      : "max-h-6 opacity-100 translate-y-0 mb-1"
                  )}
                >
                  <h3 className="px-2.5 text-[10px] font-semibold text-muted-foreground/60 tracking-wider uppercase truncate">
                    {grupo.titulo}
                  </h3>
                </div>

                {/* Divisor sutil entre grupos quando minimizada */}
                {!visualmenteExpandida && idx > 0 && (
                  <div className="my-1.5 mx-auto w-5 border-t border-border/30 transition-opacity duration-200" />
                )}

                <nav className="space-y-0.5">
                  {itensVisiveis.map((item) => {
                    const Icone = obterIconePorNome(item.iconeNome || "HelpCircle");
                    return (
                      <NavLink
                        key={item.id || item.para}
                        to={item.para || "/home"}
                        onClick={lidarCliqueItem}
                        title={!visualmenteExpandida ? item.rotulo : undefined}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center rounded-xl text-xs font-medium relative group cursor-pointer transition-colors duration-150 h-10",
                            !visualmenteExpandida
                              ? "w-10 h-10 mx-auto justify-center p-0"
                              : "w-full px-2.5 gap-2.5",
                            isActive
                              ? "liquid-glass-pill text-foreground font-semibold shadow-2xs bg-accent/70 dark:bg-accent/40"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                          )
                        }
                      >
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                          <Icone
                            size={18}
                            style={{ color: item.cor }}
                            className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                          />
                        </div>

                        <div
                          className={cn(
                            "overflow-hidden whitespace-nowrap transition-sidebar-content flex items-center gap-1.5 min-w-0",
                            !visualmenteExpandida
                              ? "w-0 max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                              : "flex-1 max-w-[160px] opacity-100 translate-x-0"
                          )}
                        >
                          <span className="truncate flex-1">{item.rotulo || "Item"}</span>
                          {item.destaque && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0">
                              <Sparkles size={10} />
                              IA
                            </span>
                          )}
                        </div>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Rodapé da Sidebar */}
        <div className="border-t border-border/30 p-2 space-y-1 shrink-0">
          {/* Botão para Personalizar Menu */}
          <button
            onClick={() => setModalPersonalizarAberta(true)}
            title={!visualmenteExpandida ? "Personalizar Menu" : undefined}
            className={cn(
              "flex items-center rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors duration-150 group cursor-pointer h-10",
              !visualmenteExpandida ? "w-10 h-10 mx-auto justify-center p-0" : "w-full px-2.5 gap-2.5"
            )}
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <Palette size={18} className="shrink-0 opacity-70 group-hover:rotate-12 transition-transform duration-200" />
            </div>
            <div
              className={cn(
                "overflow-hidden whitespace-nowrap transition-sidebar-content min-w-0",
                !visualmenteExpandida
                  ? "w-0 max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                  : "flex-1 max-w-[160px] opacity-100 translate-x-0"
              )}
            >
              <span className="truncate">Personalizar Menu</span>
            </div>
          </button>

          {/* Configurações */}
          <NavLink
            to="/config"
            onClick={lidarCliqueItem}
            title={!visualmenteExpandida ? "Configurações" : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-xl text-xs font-medium transition-colors duration-150 group cursor-pointer h-10",
                !visualmenteExpandida ? "w-10 h-10 mx-auto justify-center p-0" : "w-full px-2.5 gap-2.5",
                isActive
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )
            }
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <Settings size={18} className="shrink-0 opacity-70 group-hover:rotate-45 transition-transform duration-200" />
            </div>
            <div
              className={cn(
                "overflow-hidden whitespace-nowrap transition-sidebar-content min-w-0",
                !visualmenteExpandida
                  ? "w-0 max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                  : "flex-1 max-w-[160px] opacity-100 translate-x-0"
              )}
            >
              <span className="truncate">Configurações</span>
            </div>
          </NavLink>

          {/* Modo Claro / Escuro */}
          <button
            onClick={toggleTema}
            title={!visualmenteExpandida ? (escuro ? "Modo Claro (⇧⌘L)" : "Modo Escuro (⇧⌘L)") : undefined}
            className={cn(
              "flex items-center rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors duration-150 group cursor-pointer h-10",
              !visualmenteExpandida ? "w-10 h-10 mx-auto justify-center p-0" : "w-full px-2.5 gap-2.5"
            )}
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {escuro ? (
                <Sun size={18} className="shrink-0 opacity-70 group-hover:rotate-45 transition-transform duration-200" />
              ) : (
                <Moon size={18} className="shrink-0 opacity-70 group-hover:-rotate-12 transition-transform duration-200" />
              )}
            </div>
            <div
              className={cn(
                "overflow-hidden whitespace-nowrap transition-sidebar-content min-w-0",
                !visualmenteExpandida
                  ? "w-0 max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                  : "flex-1 max-w-[160px] opacity-100 translate-x-0"
              )}
            >
              <span className="truncate">{escuro ? "Modo Claro" : "Modo Escuro"}</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Modal de Personalização */}
      <ModalPersonalizarMenu
        aberta={modalPersonalizarAberta}
        aoFechar={() => setModalPersonalizarAberta(false)}
      />
    </>
  );
}
