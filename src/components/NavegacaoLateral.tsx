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
import { VERSAO_APP } from "@/lib/versao";
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
          "flex flex-col liquid-glass-sidebar transition-sidebar select-none shrink-0 z-30 overflow-hidden",
          colapsada ? "w-16" : "w-60",
          className
        )}
      >
        {/* Topo da Sidebar: Marca e Botão de Recolher/Expandir */}
        <div className="flex h-14 items-center justify-between px-2.5 border-b border-border/30 shrink-0 overflow-hidden relative">
          <Tooltip
            conteudo="Expandir barra lateral"
            atalho="⌘B"
            desabilitado={!colapsada}
            side="right"
            sideOffset={14}
          >
            <div
              onClick={() => {
                if (colapsada) lidarToggleColapsada();
              }}
              className={cn(
                "flex items-center min-w-0 rounded-xl transition-colors duration-150",
                colapsada
                  ? "cursor-pointer justify-center w-full h-10 hover:bg-accent/60"
                  : "justify-start pl-1 gap-2.5 cursor-default"
              )}
            >
              <NavLink
                to="/home"
                onClick={(e) => {
                  if (colapsada) {
                    e.preventDefault();
                    lidarToggleColapsada();
                  } else {
                    lidarCliqueItem();
                  }
                }}
                className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg hover:opacity-85 transition-opacity cursor-pointer"
                aria-label="Klaus Home"
              >
                <LogoKlaus tamanho={24} />
              </NavLink>

              <NavLink
                to="/home"
                onClick={lidarCliqueItem}
                className={cn(
                  "overflow-hidden whitespace-nowrap transition-sidebar-content flex items-baseline gap-1.5 group min-w-0",
                  colapsada
                    ? "max-w-0 opacity-0 -translate-x-3 pointer-events-none"
                    : "max-w-[140px] opacity-100 translate-x-0"
                )}
              >
                <span className="truncate text-sm font-bold tracking-tight text-foreground group-hover:opacity-80 transition-opacity">
                  Klaus
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60 font-medium select-none">
                  v{VERSAO_APP}
                </span>
              </NavLink>
            </div>
          </Tooltip>

          {/* Botão para recolher quando expandida */}
          <div
            className={cn(
              "transition-sidebar-content shrink-0",
              colapsada
                ? "max-w-0 opacity-0 scale-75 overflow-hidden pointer-events-none"
                : "max-w-[36px] opacity-100 scale-100"
            )}
          >
            <Tooltip conteudo="Recolher barra lateral" atalho="⌘B" side="bottom">
              <button
                onClick={lidarToggleColapsada}
                className="hidden sm:flex items-center justify-center rounded-xl p-1.5 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer"
                aria-label="Recolher barra lateral"
              >
                <ChevronLeft size={16} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Corpo da Navegação */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 px-2 space-y-3">
          {(grupos || []).filter((g) => g && Array.isArray(g.itens)).map((grupo, idx) => {
            const itensVisiveis = (grupo.itens || []).filter((item) => item && typeof item === "object" && !item.oculto);
            if (itensVisiveis.length === 0) return null;

            return (
              <div key={grupo.id || grupo.titulo} className="space-y-0.5">
                {/* Título de seção que encolhe suavemente */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] select-none",
                    colapsada
                      ? "max-h-0 opacity-0 -translate-y-1 mb-0 pointer-events-none"
                      : "max-h-6 opacity-100 translate-y-0 mb-1"
                  )}
                >
                  <h3 className="px-2.5 text-[10px] font-semibold text-muted-foreground/60 tracking-wider uppercase truncate">
                    {grupo.titulo}
                  </h3>
                </div>

                {/* Divisor sutil quando colapsada entre seções */}
                {colapsada && idx > 0 && (
                  <div className="my-1.5 mx-auto w-5 border-t border-border/30 transition-opacity duration-200" />
                )}

                <nav className="space-y-0.5">
                  {itensVisiveis.map((item) => {
                    const Icone = obterIconePorNome(item.iconeNome || "HelpCircle");
                    return (
                      <Tooltip
                        key={item.id || item.para}
                        conteudo={item.rotulo}
                        desabilitado={!colapsada}
                        side="right"
                        sideOffset={14}
                      >
                        <NavLink
                          to={item.para || "/home"}
                          onClick={lidarCliqueItem}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center rounded-xl text-xs font-medium relative group cursor-pointer transition-colors duration-150 h-9",
                              colapsada ? "justify-center px-0 w-full" : "px-2.5 gap-2.5 w-full",
                              isActive
                                ? "liquid-glass-pill text-foreground font-semibold shadow-2xs bg-accent/70 dark:bg-accent/40"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                            )
                          }
                        >
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            <Icone
                              size={16}
                              style={{ color: item.cor }}
                              className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                            />
                          </div>

                          <div
                            className={cn(
                              "flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden whitespace-nowrap transition-sidebar-content",
                              colapsada
                                ? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                                : "max-w-[160px] opacity-100 translate-x-0"
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
                      </Tooltip>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Rodapé da Sidebar */}
        <div className="border-t border-border/30 p-2 space-y-0.5 shrink-0">
          {/* Botão para Personalizar Menu */}
          <Tooltip conteudo="Personalizar Menu" desabilitado={!colapsada} side="right" sideOffset={14}>
            <button
              onClick={() => setModalPersonalizarAberta(true)}
              className={cn(
                "flex w-full items-center rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors duration-150 group cursor-pointer h-9",
                colapsada ? "justify-center px-0" : "px-2.5 gap-2.5"
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <Palette size={16} className="shrink-0 opacity-70 group-hover:rotate-12 transition-transform duration-200" />
              </div>
              <div
                className={cn(
                  "overflow-hidden whitespace-nowrap transition-sidebar-content",
                  colapsada
                    ? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                    : "max-w-[160px] opacity-100 translate-x-0"
                )}
              >
                <span className="truncate">Personalizar Menu</span>
              </div>
            </button>
          </Tooltip>

          {/* Configurações */}
          <Tooltip conteudo="Configurações" desabilitado={!colapsada} side="right" sideOffset={14}>
            <NavLink
              to="/config"
              onClick={lidarCliqueItem}
              className={({ isActive }) =>
                cn(
                  "flex w-full items-center rounded-xl text-xs font-medium transition-colors duration-150 group cursor-pointer h-9",
                  colapsada ? "justify-center px-0" : "px-2.5 gap-2.5",
                  isActive
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )
              }
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <Settings size={16} className="shrink-0 opacity-70 group-hover:rotate-45 transition-transform duration-200" />
              </div>
              <div
                className={cn(
                  "overflow-hidden whitespace-nowrap transition-sidebar-content",
                  colapsada
                    ? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                    : "max-w-[160px] opacity-100 translate-x-0"
                )}
              >
                <span className="truncate">Configurações</span>
              </div>
            </NavLink>
          </Tooltip>

          {/* Modo Claro / Escuro */}
          <Tooltip
            conteudo={escuro ? "Modo Claro" : "Modo Escuro"}
            atalho="⇧⌘L"
            desabilitado={!colapsada}
            side="right"
            sideOffset={14}
          >
            <button
              onClick={toggleTema}
              className={cn(
                "flex w-full items-center rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors duration-150 group cursor-pointer h-9",
                colapsada ? "justify-center px-0" : "px-2.5 gap-2.5"
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {escuro ? (
                  <Sun size={16} className="shrink-0 opacity-70 group-hover:rotate-45 transition-transform duration-200" />
                ) : (
                  <Moon size={16} className="shrink-0 opacity-70 group-hover:-rotate-12 transition-transform duration-200" />
                )}
              </div>
              <div
                className={cn(
                  "overflow-hidden whitespace-nowrap transition-sidebar-content",
                  colapsada
                    ? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                    : "max-w-[160px] opacity-100 translate-x-0"
                )}
              >
                <span className="truncate">{escuro ? "Modo Claro" : "Modo Escuro"}</span>
              </div>
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
