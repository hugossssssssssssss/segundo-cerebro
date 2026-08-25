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
          "flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out select-none shrink-0",
          colapsada ? "w-16" : "w-60",
          className
        )}
      >
        {/* Topo da Sidebar: Marca e Toggle */}
        <div className="flex h-14 items-center justify-between px-3 border-b border-border/60">
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
              <button
                onClick={() => setColapsada(true)}
                className="hidden sm:flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                title="Recolher barra lateral (⌘B)"
                aria-label="Recolher barra lateral"
              >
                <ChevronLeft size={18} />
              </button>
            </>
          ) : (
            <div className="relative mx-auto flex items-center justify-center">
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
                  "flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer",
                  workspaceAberto && "hover:text-primary"
                )}
                aria-label="Expandir barra lateral"
              >
                <ChevronRight size={18} />
              </button>

              {/* Aviso flutuante que acompanha o mouse onde o usuário clica/passa */}
              {workspaceAberto && avisoVisivel && mousePos && (
                <div
                  style={{
                    position: "fixed",
                    left: `${mousePos.x + 12}px`,
                    top: `${mousePos.y - 14}px`,
                    zIndex: 99999,
                  }}
                  className="pointer-events-none flex items-center gap-1.5 rounded-lg border border-border/90 bg-popover/95 px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-2xl backdrop-blur-md animate-in fade-in duration-100 whitespace-nowrap"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                  <span>Para expandir a barra, saia do modo tela cheia</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Corpo da Navegação */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {(grupos || []).filter((g) => g && Array.isArray(g.itens)).map((grupo) => {
            const itensVisiveis = (grupo.itens || []).filter((item) => item && typeof item === "object" && !item.oculto);
            if (itensVisiveis.length === 0) return null;

            return (
              <div key={grupo.id || grupo.titulo} className="space-y-1">
                {!colapsada && (
                  <h3 className="px-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase truncate">
                    {grupo.titulo}
                  </h3>
                )}
                <nav className="space-y-0.5">
                  {itensVisiveis.map((item) => {
                    const Icone = obterIconePorNome(item.iconeNome || "HelpCircle");
                    return (
                      <NavLink
                        key={item.id || item.para}
                        to={item.para || "/home"}
                        onClick={lidarCliqueItem}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors relative group cursor-pointer",
                            isActive
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
                            colapsada && "justify-center px-0"
                          )
                        }
                        title={colapsada ? item.rotulo : undefined}
                      >
                        <Icone
                          size={18}
                          style={{ color: item.cor }}
                          className="shrink-0 transition-transform group-hover:scale-105"
                        />
                        {!colapsada && (
                          <span className="truncate flex-1">{item.rotulo || "Item"}</span>
                        )}
                        {!colapsada && item.destaque && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                            <Sparkles size={10} />
                            IA
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Rodapé da Sidebar */}
        <div className="border-t border-border/60 p-2 space-y-1">
          {/* Botão para Personalizar Menu */}
          <button
            onClick={() => setModalPersonalizarAberta(true)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors group",
              colapsada && "justify-center px-0"
            )}
            title={colapsada ? "Personalizar Menu" : undefined}
          >
            <Palette size={18} className="shrink-0 group-hover:rotate-12 transition-transform" />
            {!colapsada && <span className="truncate">Personalizar Menu</span>}
          </button>

          <NavLink
            to="/config"
            onClick={aoNavegar}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
                colapsada && "justify-center px-0"
              )
            }
            title={colapsada ? "Ajustes" : undefined}
          >
            <Settings size={18} className="shrink-0" />
            {!colapsada && <span>Ajustes</span>}
          </NavLink>

          <button
            onClick={toggleTema}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-colors",
              colapsada && "justify-center px-0"
            )}
            title={colapsada ? (escuro ? "Modo claro" : "Modo escuro") : undefined}
          >
            {escuro ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
            {!colapsada && <span>{escuro ? "Modo Claro" : "Modo Escuro"}</span>}
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
