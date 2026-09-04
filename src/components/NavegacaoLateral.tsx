import { NavLink } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  Settings,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { LogoKlaus } from "./LogoKlaus";
import { versao } from "@/lib/versao";
import {
  carregarMenuPersonalizado,
  EVENTO_MENU_ATUALIZADO,
  type GrupoMenuPersonalizado,
} from "@/lib/menuPersonalizado";
import { obterIconePorNome } from "@/lib/icones";
import { ModalPersonalizarMenu } from "./ModalPersonalizarMenu";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

import { alternarTema, lerTemaSalvo, type Tema } from "@/lib/tema";
import { Tooltip } from "@/components/ui/tooltip";

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
  let workspace: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    workspace = useWorkspace();
  } catch {}

  const workspaceAberto = !!workspace?.workspaceAberto;

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [avisoVisivel, setAvisoVisivel] = useState(false);

  const lidarToggleColapsada = (e: React.MouseEvent) => {
    if (colapsada && workspaceAberto) {
      setMousePos({ x: e.clientX, y: e.clientY });
      setAvisoVisivel(true);
      setTimeout(() => setAvisoVisivel(false), 2500);
      return;
    }
    setColapsada((v) => !v);
  };

  const lidarCliqueItem = () => {
    if (workspaceAberto && workspace?.fecharWorkspace) {
      workspace.fecharWorkspace();
    }
    if (aoNavegar) aoNavegar();
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

  return (
    <>
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out select-none shrink-0 overflow-x-hidden",
          colapsada ? "w-16" : "w-60",
          className
        )}
      >
        {/* Topo da Sidebar: Marca e Toggle */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-border/60 transition-all",
            colapsada ? "justify-center px-0" : "justify-between px-3"
          )}
        >
          {!colapsada ? (
            <>
              <NavLink
                to="/home"
                onClick={lidarCliqueItem}
                className="flex items-center gap-2 font-semibold tracking-tight text-foreground truncate min-w-0"
              >
                <LogoKlaus tamanho={28} />
                <span className="truncate text-base font-bold tracking-tight">Klaus</span>
                <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-primary border border-primary/20">
                  v{versao}
                </span>
              </NavLink>
              <Tooltip conteudo="Recolher barra lateral" atalho="⌘B" posicao="bottom">
                <button
                  onClick={() => setColapsada(true)}
                  className="hidden sm:flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Recolher barra lateral"
                >
                  <ChevronLeft size={18} />
                </button>
              </Tooltip>
            </>
          ) : (
            <div className="relative flex items-center justify-center">
              <Tooltip conteudo="Expandir barra lateral" atalho="⌘B" posicao="right" desabilitado={workspaceAberto}>
                <button
                  onClick={lidarToggleColapsada}
                  onMouseEnter={(e) => {
                    if (workspaceAberto) {
                      setMousePos({ x: e.clientX, y: e.clientY });
                      setAvisoVisivel(true);
                    }
                  }}
                  onMouseMove={(e) => {
                    if (workspaceAberto && avisoVisivel) {
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }
                  }}
                  onMouseLeave={() => setAvisoVisivel(false)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer",
                    workspaceAberto && "hover:text-primary"
                  )}
                  aria-label="Expandir barra lateral"
                >
                  <ChevronRight size={18} />
                </button>
              </Tooltip>

              {/* Aviso flutuante que acompanha o mouse e NUNCA fica por baixo de nada */}
              {workspaceAberto && avisoVisivel && mousePos && typeof document !== "undefined" && createPortal(
                <div
                  style={{
                    position: "fixed",
                    left: `${mousePos.x + 14}px`,
                    top: `${mousePos.y - 12}px`,
                    zIndex: 9999999,
                  }}
                  className="pointer-events-none flex items-center gap-1.5 rounded-lg border border-border bg-popover/98 px-3 py-1.5 text-xs font-semibold text-popover-foreground shadow-[0_10px_38px_rgba(0,0,0,0.5)] backdrop-blur-md animate-in fade-in duration-100 whitespace-nowrap"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                  <span>Para expandir a barra, saia do modo tela cheia</span>
                </div>,
                document.body
              )}
            </div>
          )}
        </div>

        {/* Corpo da Navegação */}
        <div
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            colapsada ? "px-2" : "px-2.5"
          )}
        >
          {(grupos || []).filter((g) => g && Array.isArray(g.itens)).map((grupo, idx) => {
            const itensVisiveis = (grupo.itens || []).filter((item) => item && typeof item === "object" && !item.oculto);
            if (itensVisiveis.length === 0) return null;

            return (
              <div key={grupo.id || grupo.titulo} className="space-y-1">
                {!colapsada ? (
                  <h3 className="px-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase truncate">
                    {grupo.titulo}
                  </h3>
                ) : (
                  idx > 0 && <div className="w-6 h-px bg-border/50 mx-auto my-1.5" />
                )}
                <nav className={cn("space-y-1", colapsada && "flex flex-col items-center")}>
                  {itensVisiveis.map((item) => {
                    const Icone = obterIconePorNome(item.iconeNome || "HelpCircle");
                    return (
                      <Tooltip
                        key={item.id || item.para}
                        conteudo={item.rotulo || "Item"}
                        posicao="right"
                        desabilitado={!colapsada}
                      >
                        <NavLink
                          to={item.para || "/home"}
                          onClick={lidarCliqueItem}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center text-sm font-medium transition-colors relative group cursor-pointer",
                              colapsada
                                ? "h-10 w-10 justify-center rounded-xl mx-auto shrink-0"
                                : "w-full gap-2.5 rounded-lg px-2.5 py-2",
                              isActive
                                ? "bg-primary/10 text-primary font-semibold shadow-2xs"
                                : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                            )
                          }
                        >
                          <Icone
                            size={18}
                            style={{ color: item.cor }}
                            className="shrink-0 transition-transform group-hover:scale-110"
                          />
                          {!colapsada && (
                            <span className="truncate flex-1 text-left">{item.rotulo || "Item"}</span>
                          )}
                          {!colapsada && item.destaque && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                              <Sparkles size={10} />
                              IA
                            </span>
                          )}
                          {colapsada && item.destaque && (
                            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          )}
                        </NavLink>
                      </Tooltip>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Rodapé da Sidebar */}
        <div
          className={cn(
            "border-t border-border/60 space-y-1 shrink-0",
            colapsada ? "p-2 flex flex-col items-center" : "p-2"
          )}
        >
          {/* Botão para Personalizar Menu */}
          <Tooltip conteudo="Personalizar Menu" posicao="right" desabilitado={!colapsada}>
            <button
              onClick={() => setModalPersonalizarAberta(true)}
              className={cn(
                "flex items-center text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors group cursor-pointer",
                colapsada
                  ? "h-10 w-10 justify-center rounded-xl mx-auto shrink-0"
                  : "w-full gap-2.5 rounded-lg px-2.5 py-2"
              )}
              aria-label="Personalizar Menu"
            >
              <Palette size={18} className="shrink-0 group-hover:rotate-12 transition-transform" />
              {!colapsada && <span className="truncate text-left flex-1">Personalizar Menu</span>}
            </button>
          </Tooltip>

          <Tooltip conteudo="Ajustes e Conexões" posicao="right" desabilitado={!colapsada}>
            <NavLink
              to="/config"
              onClick={aoNavegar}
              className={({ isActive }) =>
                cn(
                  "flex items-center text-sm font-medium transition-colors cursor-pointer",
                  colapsada
                    ? "h-10 w-10 justify-center rounded-xl mx-auto shrink-0"
                    : "w-full gap-2.5 rounded-lg px-2.5 py-2",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-2xs"
                    : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                )
              }
              aria-label="Ajustes"
            >
              <Settings size={18} className="shrink-0 transition-transform hover:rotate-45" />
              {!colapsada && <span className="truncate text-left flex-1">Ajustes</span>}
            </NavLink>
          </Tooltip>

          <Tooltip
            conteudo={escuro ? "Alternar para Tema Claro" : "Alternar para Tema Escuro"}
            posicao="right"
            desabilitado={!colapsada}
          >
            <button
              onClick={toggleTema}
              className={cn(
                "flex items-center text-sm font-medium text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-colors cursor-pointer",
                colapsada
                  ? "h-10 w-10 justify-center rounded-xl mx-auto shrink-0"
                  : "w-full gap-2.5 rounded-lg px-2.5 py-2"
              )}
              aria-label={escuro ? "Modo claro" : "Modo escuro"}
            >
              {escuro ? <Sun size={18} className="shrink-0 text-amber-400" /> : <Moon size={18} className="shrink-0 text-indigo-400" />}
              {!colapsada && <span className="truncate text-left flex-1">{escuro ? "Modo Claro" : "Modo Escuro"}</span>}
            </button>
          </Tooltip>
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
