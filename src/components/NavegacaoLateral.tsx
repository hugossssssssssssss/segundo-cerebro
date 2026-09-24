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
import {
  alternarTema,
  lerTemaSalvo,
  lerTamanhoFonteMenuSalvo,
  EVENTO_PERSONALIZACAO_ALTERADA,
  type Tema,
  type TamanhoFonteMenu,
} from "@/lib/tema";
import { VERSAO_APP } from "@/lib/versao";
import { obterWorkspaceAtivo, EVENTO_WORKSPACE_ALTERADO } from "@/lib/workspaces";

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
  const [tamanhoFonteMenu, setTamanhoFonteMenu] = useState<TamanhoFonteMenu>(lerTamanhoFonteMenuSalvo);
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
    }, 160);
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
    const aoMudarTema = () => setTema(lerTemaSalvo());
    const aoMudarPersonalizacao = () => setTamanhoFonteMenu(lerTamanhoFonteMenuSalvo());

    window.addEventListener("tema-alterado", aoMudarTema);
    window.addEventListener(EVENTO_PERSONALIZACAO_ALTERADA, aoMudarPersonalizacao);

    return () => {
      window.removeEventListener("tema-alterado", aoMudarTema);
      window.removeEventListener(EVENTO_PERSONALIZACAO_ALTERADA, aoMudarPersonalizacao);
    };
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

  const [workspaceAtivo, setWorkspaceAtivo] = useState(obterWorkspaceAtivo);

  useEffect(() => {
    const aoMudarWorkspace = () => {
      setWorkspaceAtivo(obterWorkspaceAtivo());
      atualizarMenu();
    };
    window.addEventListener(EVENTO_WORKSPACE_ALTERADO, aoMudarWorkspace);
    window.addEventListener(EVENTO_MENU_ATUALIZADO, atualizarMenu);
    window.addEventListener("klaus-preferencias-atualizadas", atualizarMenu);
    window.addEventListener("klaus-settings-atualizadas", atualizarMenu);
    return () => {
      window.removeEventListener(EVENTO_WORKSPACE_ALTERADO, aoMudarWorkspace);
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

  // Mapeamento do tamanho de fonte escolhido pelo usuário
  const classeFonteItem =
    tamanhoFonteMenu === "compacta"
      ? "text-[11px]"
      : tamanhoFonteMenu === "media"
        ? "text-[13px]"
        : tamanhoFonteMenu === "grande"
          ? "text-sm"
          : "text-xs";

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
        {/* Topo da Sidebar: Coluna de 64px fixa para o logo + texto expansível */}
        <div className="h-14 flex items-center w-60 border-b border-border/30 shrink-0 overflow-hidden relative">
          <NavLink
            to="/home"
            onClick={lidarCliqueItem}
            className="flex items-center w-full h-full min-w-0 group hover:opacity-90 transition-opacity"
            title={!visualmenteExpandida ? "Klaus Início" : undefined}
          >
            {/* Coluna fixa de 64px (w-16): logo rigorosamente centrado sempre */}
            <div className="w-16 h-14 flex items-center justify-center shrink-0">
              <div className="w-9 h-9 flex items-center justify-center rounded-xl group-hover:bg-accent/40 transition-colors">
                <LogoKlaus tamanho={24} />
              </div>
            </div>

            {/* Texto da Marca Klaus + Versão */}
            <div
              className={cn(
                "flex-1 min-w-0 flex items-baseline gap-1.5 overflow-hidden whitespace-nowrap transition-sidebar-content",
                !visualmenteExpandida
                  ? "opacity-0 -translate-x-3 pointer-events-none"
                  : "opacity-100 translate-x-0"
              )}
            >
              <span className="truncate text-sm font-bold tracking-tight text-foreground">
                Klaus
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60 font-medium select-none">
                v{VERSAO_APP}
              </span>
            </div>
          </NavLink>

          {/* Botão de recolher/fixar à direita quando expandida */}
          <div
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 transition-sidebar-content shrink-0",
              !visualmenteExpandida
                ? "opacity-0 scale-75 pointer-events-none"
                : "opacity-100 scale-100"
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

        {/* Corpo da Navegação */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2 w-60 space-y-3">
          {(grupos || []).filter((g) => g && Array.isArray(g.itens)).map((grupo, idx) => {
            const itensVisiveis = (grupo.itens || []).filter((item) => {
              if (!item || typeof item !== "object" || item.oculto) return false;
              if (workspaceAtivo.tipo === "equipe" && (item.id === "pdi" || item.para === "/pdi")) {
                return false;
              }
              return true;
            });
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
                  <h3 className="px-4 text-[10px] font-semibold text-muted-foreground/60 tracking-wider uppercase truncate">
                    {grupo.titulo}
                  </h3>
                </div>

                {/* Divisor sutil entre grupos quando minimizada */}
                {!visualmenteExpandida && idx > 0 && (
                  <div className="my-1.5 w-8 mx-4 border-t border-border/30 transition-opacity duration-200" />
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
                            "flex items-center w-60 h-10 font-medium relative group cursor-pointer transition-colors duration-150",
                            classeFonteItem,
                            isActive
                              ? "text-foreground font-semibold"
                              : "text-muted-foreground hover:text-foreground"
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {/* Coluna fixa de 64px (w-16): ícone centralizado com precisão matemática */}
                            <div className="w-16 h-10 flex items-center justify-center shrink-0">
                              <div
                                className={cn(
                                  "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150",
                                  isActive
                                    ? "liquid-glass-pill shadow-2xs bg-accent/70 dark:bg-accent/40 text-foreground"
                                    : "group-hover:bg-accent/40"
                                )}
                              >
                                <Icone
                                  size={18}
                                  style={{ color: item.cor }}
                                  className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                                />
                              </div>
                            </div>

                            {/* Coluna do texto com máscara e fade */}
                            <div
                              className={cn(
                                "flex-1 min-w-0 pr-4 flex items-center justify-between gap-1.5 overflow-hidden whitespace-nowrap transition-sidebar-content",
                                !visualmenteExpandida
                                  ? "opacity-0 -translate-x-2 pointer-events-none"
                                  : "opacity-100 translate-x-0"
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
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Rodapé da Sidebar: mesma coluna de 64px para alinhamento 100% simétrico */}
        <div className="border-t border-border/30 py-2 space-y-0.5 shrink-0 w-60 overflow-hidden">
          {/* Botão para Personalizar Menu */}
          <button
            onClick={() => setModalPersonalizarAberta(true)}
            title={!visualmenteExpandida ? "Personalizar Menu" : undefined}
            className={cn(
              "flex items-center w-60 h-10 font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 group cursor-pointer",
              classeFonteItem
            )}
          >
            <div className="w-16 h-10 flex items-center justify-center shrink-0">
              <div className="w-9 h-9 flex items-center justify-center rounded-xl group-hover:bg-accent/40 transition-colors">
                <Palette size={18} className="shrink-0 opacity-70 group-hover:rotate-12 transition-transform duration-200" />
              </div>
            </div>
            <div
              className={cn(
                "flex-1 min-w-0 pr-4 overflow-hidden whitespace-nowrap transition-sidebar-content text-left",
                !visualmenteExpandida
                  ? "opacity-0 -translate-x-2 pointer-events-none"
                  : "opacity-100 translate-x-0"
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
                "flex items-center w-60 h-10 font-medium transition-colors duration-150 group cursor-pointer",
                classeFonteItem,
                isActive
                  ? "text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="w-16 h-10 flex items-center justify-center shrink-0">
                  <div
                    className={cn(
                      "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "group-hover:bg-accent/40"
                    )}
                  >
                    <Settings size={18} className="shrink-0 opacity-70 group-hover:rotate-45 transition-transform duration-200" />
                  </div>
                </div>
                <div
                  className={cn(
                    "flex-1 min-w-0 pr-4 overflow-hidden whitespace-nowrap transition-sidebar-content text-left",
                    !visualmenteExpandida
                      ? "opacity-0 -translate-x-2 pointer-events-none"
                      : "opacity-100 translate-x-0"
                  )}
                >
                  <span className="truncate">Configurações</span>
                </div>
              </>
            )}
          </NavLink>

          {/* Modo Claro / Escuro */}
          <button
            onClick={toggleTema}
            title={!visualmenteExpandida ? (escuro ? "Modo Claro (⇧⌘L)" : "Modo Escuro (⇧⌘L)") : undefined}
            className={cn(
              "flex items-center w-60 h-10 font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 group cursor-pointer",
              classeFonteItem
            )}
          >
            <div className="w-16 h-10 flex items-center justify-center shrink-0">
              <div className="w-9 h-9 flex items-center justify-center rounded-xl group-hover:bg-accent/40 transition-colors">
                {escuro ? (
                  <Sun size={18} className="shrink-0 opacity-70 group-hover:rotate-45 transition-transform duration-200" />
                ) : (
                  <Moon size={18} className="shrink-0 opacity-70 group-hover:-rotate-12 transition-transform duration-200" />
                )}
              </div>
            </div>
            <div
              className={cn(
                "flex-1 min-w-0 pr-4 overflow-hidden whitespace-nowrap transition-sidebar-content text-left",
                !visualmenteExpandida
                  ? "opacity-0 -translate-x-2 pointer-events-none"
                  : "opacity-100 translate-x-0"
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
