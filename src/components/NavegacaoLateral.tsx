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
import { useEffect, useState, useCallback } from "react";
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

  const lidarToggleColapsada = () => {
    if (colapsada && workspaceAberto) {
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
    window.addEventListener("klaus-preferencias-atualizadas", atualizarMenu);
    window.addEventListener("klaus-settings-atualizadas", atualizarMenu);
    return () => {
      window.removeEventListener(EVENTO_MENU_ATUALIZADO, atualizarMenu);
      window.removeEventListener("klaus-preferencias-atualizadas", atualizarMenu);
      window.removeEventListener("klaus-settings-atualizadas", atualizarMenu);
    };
  }, [atualizarMenu]);

  return (
    <>
      <aside
        className={cn(
          "flex flex-col border-r border-border/40 bg-card/70 dark:bg-card/40 backdrop-blur-xs transition-all duration-300 ease-in-out select-none shrink-0",
          colapsada ? "w-16" : "w-60",
          className
        )}
      >
        {/* Topo da Sidebar: Marca e Toggle */}
        <div className="flex h-14 items-center justify-between px-3.5 border-b border-border/40">
          {!colapsada ? (
            <>
              <NavLink
                to="/home"
                onClick={lidarCliqueItem}
                className="flex items-center gap-2 font-semibold tracking-tight text-foreground truncate min-w-0 group"
              >
                <LogoKlaus tamanho={26} />
                <span className="truncate text-sm font-bold tracking-tight">Klaus</span>
              </NavLink>
              <button
                onClick={() => setColapsada(true)}
                className="hidden sm:flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                title="Recolher barra lateral (⌘B)"
                aria-label="Recolher barra lateral"
              >
                <ChevronLeft size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={lidarToggleColapsada}
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              title="Expandir barra lateral"
              aria-label="Expandir barra lateral"
            >
              <LogoKlaus tamanho={24} />
            </button>
          )}
        </div>

        {/* Corpo da Navegação */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 px-2 space-y-4">
          {(grupos || []).filter((g) => g && Array.isArray(g.itens)).map((grupo) => {
            const itensVisiveis = (grupo.itens || []).filter((item) => item && typeof item === "object" && !item.oculto);
            if (itensVisiveis.length === 0) return null;

            return (
              <div key={grupo.id || grupo.titulo} className="space-y-0.5">
                {!colapsada && (
                  <h3 className="px-2.5 pb-1 text-[10px] font-semibold text-muted-foreground/70 tracking-wider uppercase truncate">
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
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 relative group cursor-pointer",
                            isActive
                              ? "bg-accent text-accent-foreground font-semibold shadow-2xs"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                            colapsada && "justify-center px-0 py-2"
                          )
                        }
                        title={colapsada ? item.rotulo : undefined}
                      >
                        <Icone
                          size={16}
                          style={{ color: item.cor }}
                          className="shrink-0 transition-transform group-hover:scale-105"
                        />
                        {!colapsada && (
                          <span className="truncate flex-1">{item.rotulo || "Item"}</span>
                        )}
                        {!colapsada && item.destaque && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
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
        <div className="border-t border-border/40 p-2 space-y-0.5">
          {/* Botão para Personalizar Menu */}
          <button
            onClick={() => setModalPersonalizarAberta(true)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors group cursor-pointer",
              colapsada && "justify-center px-0 py-2"
            )}
            title={colapsada ? "Personalizar Menu" : undefined}
          >
            <Palette size={16} className="shrink-0 opacity-70 group-hover:rotate-12 transition-transform" />
            {!colapsada && <span className="truncate">Personalizar Menu</span>}
          </button>

          <NavLink
            to="/config"
            onClick={lidarCliqueItem}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                colapsada && "justify-center px-0 py-2"
              )
            }
            title={colapsada ? "Configurações" : undefined}
          >
            <Settings size={16} className="shrink-0 opacity-70" />
            {!colapsada && <span>Configurações</span>}
          </NavLink>

          <button
            onClick={toggleTema}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer",
              colapsada && "justify-center px-0 py-2"
            )}
            title={colapsada ? (escuro ? "Modo claro" : "Modo escuro") : undefined}
          >
            {escuro ? <Sun size={16} className="shrink-0 opacity-70" /> : <Moon size={16} className="shrink-0 opacity-70" />}
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
