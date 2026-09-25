import { NavLink, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  Sun,
  Moon,
  Sparkles,
  Settings,
  Palette,
  Search,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback, useRef } from "react";
import { LogoKlaus } from "./LogoKlaus";
import {
  carregarMenuPersonalizado,
  EVENTO_MENU_ATUALIZADO,
  ehItemMenuValido,
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

/**
 * Subitens dedicados com árvore / linha guia para seções com ferramentas internas
 * (estilo sub-menus expandidos do AIRecruit360)
 */
const SUBITENS_MAPA: Record<string, { rotulo: string; para: string; badge?: string }[]> = {
  "/pdf": [
    { rotulo: "Juntar PDFs", para: "/pdf?aba=juntar" },
    { rotulo: "Dividir PDF", para: "/pdf?aba=dividir" },
    { rotulo: "Comprimir PDF", para: "/pdf?aba=comprimir" },
    { rotulo: "Scanner / Foto", para: "/pdf?aba=digitalizar" },
  ],
  "/conversor": [
    { rotulo: "Converter Imagens", para: "/conversor?tipo=imagem" },
    { rotulo: "Converter Documentos", para: "/conversor?tipo=documento" },
    { rotulo: "Extrair Áudio MP3", para: "/conversor?tipo=audio" },
  ],
  "/pdi": [
    { rotulo: "Metas de Carreira", para: "/pdi" },
    { rotulo: "Registrar Conquista", para: "/pdi?acao=entrega", badge: "Novo" },
  ],
};

export function NavegacaoLateral({
  colapsada,
  setColapsada,
  aoNavegar,
  className,
}: NavegacaoLateralProps) {
  const location = useLocation();
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

  const abrirBuscaGlobal = () => {
    window.dispatchEvent(new CustomEvent("klaus-abrir-busca"));
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
          "flex flex-col select-none shrink-0 z-30 overflow-hidden bg-background/90 backdrop-blur-xl transition-all duration-300 ease-out",
          visualmenteExpandida ? "w-64 shadow-xl sm:shadow-none" : "w-18",
          className
        )}
      >
        {/* 1. TOPO DA SIDEBAR: Logo Klaus + Versão + Botão de Recolher */}
        <div className="h-16 flex items-center w-full px-3.5 shrink-0 overflow-hidden relative">
          <NavLink
            to="/home"
            onClick={lidarCliqueItem}
            className="flex items-center w-full h-full min-w-0 group cursor-pointer"
            title={!visualmenteExpandida ? "Klaus Início" : undefined}
          >
            {/* Logo */}
            <div className="w-10 h-10 flex items-center justify-center rounded-2xl group-hover:bg-secondary/70 transition-colors shrink-0">
              <LogoKlaus tamanho={26} />
            </div>

            {/* Texto da Marca Klaus + Versão */}
            <div
              className={cn(
                "flex-1 min-w-0 ml-3 flex items-baseline gap-1.5 overflow-hidden whitespace-nowrap transition-all duration-200",
                !visualmenteExpandida
                  ? "opacity-0 -translate-x-3 pointer-events-none"
                  : "opacity-100 translate-x-0"
              )}
            >
              <span className="truncate text-base font-bold tracking-tight text-foreground">
                Klaus
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/70 font-semibold px-1.5 py-0.5 rounded-full bg-secondary/80">
                v{VERSAO_APP}
              </span>
            </div>
          </NavLink>

          {/* Botão retrátil quando expandida */}
          {visualmenteExpandida && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setColapsada((v) => !v);
                setHoverExpandida(false);
              }}
              className="hidden sm:flex items-center justify-center rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer shrink-0 ml-1"
              title={colapsada ? "Fixar barra lateral aberta" : "Recolher barra lateral (⌘B)"}
              aria-label="Alternar fixação da barra lateral"
            >
              <ChevronLeft
                size={16}
                className={cn("transition-transform duration-200", colapsada && "rotate-180")}
              />
            </button>
          )}
        </div>

        {/* 2. CAMPO DE BUSCA RÁPIDA (Estilo AIRecruit360 [ 🔍 Search here..  / ]) */}
        <div className="px-3 pb-2 pt-0.5 shrink-0">
          {visualmenteExpandida ? (
            <button
              type="button"
              onClick={abrirBuscaGlobal}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-secondary/60 hover:bg-secondary border border-border/60 text-muted-foreground hover:text-foreground text-xs transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search size={14} className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="truncate font-medium">Buscar no Klaus...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded-md bg-card border border-border/80 text-[10px] font-mono text-muted-foreground shadow-2xs">
                /
              </kbd>
            </button>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={abrirBuscaGlobal}
                title="Buscar no Klaus (/)"
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-primary border border-border/60 transition-colors cursor-pointer"
              >
                <Search size={16} />
              </button>
            </div>
          )}
        </div>

        {/* 3. CORPO DA NAVEGAÇÃO COM PÍLULAS AZUIS ELÉTRICAS */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-1 space-y-4">
          {(grupos || []).filter((g) => g && Array.isArray(g.itens)).map((grupo, idx) => {
            const itensVisiveis = (grupo.itens || []).filter((item) => {
              if (!item || typeof item !== "object" || item.oculto) return false;
              if (!ehItemMenuValido(item)) return false;
              if (workspaceAtivo.tipo === "equipe" && (item.id === "pdi" || item.para === "/pdi")) {
                return false;
              }
              return true;
            });
            if (itensVisiveis.length === 0) return null;

            return (
              <div key={grupo.id || grupo.titulo} className="space-y-1">
                {/* Título de seção em caixa alta discreto */}
                {visualmenteExpandida && (
                  <div className="px-3 pt-1 pb-1">
                    <h3 className="text-[10px] font-bold text-muted-foreground/60 tracking-wider uppercase truncate">
                      {grupo.titulo}
                    </h3>
                  </div>
                )}

                {/* Divisor sutil entre grupos quando colapsada */}
                {!visualmenteExpandida && idx > 0 && (
                  <div className="my-2 w-8 mx-auto border-t border-border/50" />
                )}

                <nav className="space-y-1">
                  {itensVisiveis.map((item) => {
                    const Icone = obterIconePorNome(item.iconeNome || "HelpCircle");
                    const rotaItem = item.para || "/home";
                    const ehAtivo =
                      rotaItem === "/home"
                        ? location.pathname === "/" || location.pathname === "/home"
                        : location.pathname.startsWith(rotaItem);
                    const subitens = SUBITENS_MAPA[rotaItem];
                    const temSubitens = Boolean(subitens && subitens.length > 0 && visualmenteExpandida);

                    return (
                      <div key={item.id || item.para} className="space-y-0.5">
                        <NavLink
                          to={rotaItem}
                          onClick={lidarCliqueItem}
                          title={!visualmenteExpandida ? item.rotulo : undefined}
                          className={cn(
                            "flex items-center w-full rounded-2xl font-medium transition-all duration-200 cursor-pointer group select-none",
                            classeFonteItem,
                            visualmenteExpandida ? "px-3 py-2.5 gap-3" : "h-11 justify-center",
                            ehAtivo
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                          )}
                        >
                          {/* Ícone */}
                          <div className="flex items-center justify-center shrink-0">
                            <Icone
                              size={18}
                              style={{ color: ehAtivo ? "currentColor" : item.cor }}
                              className={cn(
                                "shrink-0 transition-transform duration-200 group-hover:scale-110",
                                ehAtivo && "text-primary-foreground"
                              )}
                            />
                          </div>

                          {/* Rótulo e Badges quando expandida */}
                          {visualmenteExpandida && (
                            <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5 overflow-hidden">
                              <span className="truncate font-semibold">{item.rotulo || "Item"}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.destaque && (
                                  <span
                                    className={cn(
                                      "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                                      ehAtivo
                                        ? "bg-white/20 text-white"
                                        : "bg-primary/10 text-primary"
                                    )}
                                  >
                                    <Sparkles size={10} />
                                    IA
                                  </span>
                                )}
                                {temSubitens && (
                                  <ChevronDown
                                    size={14}
                                    className={cn(
                                      "transition-transform duration-200",
                                      ehAtivo ? "rotate-180 text-primary-foreground/80" : "text-muted-foreground/60"
                                    )}
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </NavLink>

                        {/* 4. SUBITENS COM LINHA GUIA VERTICAL (Estilo Árvore AIRecruit360) */}
                        {temSubitens && ehAtivo && (
                          <div className="border-l-2 border-border/80 ml-6 pl-3 space-y-1 my-1 animate-in fade-in slide-in-from-left-1 duration-200">
                            {subitens!.map((sub) => {
                              const subAtivo =
                                location.pathname + location.search === sub.para ||
                                (sub.para.includes("?") && location.search.includes(sub.para.split("?")[1]));
                              return (
                                <NavLink
                                  key={sub.para}
                                  to={sub.para}
                                  onClick={lidarCliqueItem}
                                  className={cn(
                                    "flex items-center justify-between py-1.5 px-2.5 rounded-xl text-xs transition-all cursor-pointer",
                                    subAtivo
                                      ? "text-primary font-bold bg-primary/10"
                                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                  )}
                                >
                                  <span className="truncate">{sub.rotulo}</span>
                                  {sub.badge && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                      {sub.badge}
                                    </span>
                                  )}
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* 5. RODAPÉ DA SIDEBAR: Personalizar Menu, Configurações e Tema */}
        <div className="p-3 border-t border-border/40 space-y-1 shrink-0 bg-background/50">
          {/* Botão Personalizar Menu */}
          <button
            type="button"
            onClick={() => setModalPersonalizarAberta(true)}
            title={!visualmenteExpandida ? "Personalizar Menu" : undefined}
            className={cn(
              "flex items-center w-full rounded-2xl text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all duration-150 cursor-pointer",
              classeFonteItem,
              visualmenteExpandida ? "px-3 py-2 gap-3" : "h-10 justify-center"
            )}
          >
            <Palette size={17} className="shrink-0 text-muted-foreground" />
            {visualmenteExpandida && (
              <span className="truncate font-medium">Personalizar Menu</span>
            )}
          </button>

          {/* Configurações */}
          <NavLink
            to="/config"
            onClick={lidarCliqueItem}
            title={!visualmenteExpandida ? "Configurações" : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center w-full rounded-2xl transition-all duration-150 cursor-pointer",
                classeFonteItem,
                visualmenteExpandida ? "px-3 py-2 gap-3" : "h-10 justify-center",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
              )
            }
          >
            <Settings size={17} className="shrink-0" />
            {visualmenteExpandida && (
              <span className="truncate font-medium">Configurações</span>
            )}
          </NavLink>

          {/* Alternar Tema Claro / Escuro */}
          <button
            type="button"
            onClick={toggleTema}
            title={!visualmenteExpandida ? (escuro ? "Modo Claro" : "Modo Escuro") : undefined}
            className={cn(
              "flex items-center w-full rounded-2xl text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all duration-150 cursor-pointer",
              classeFonteItem,
              visualmenteExpandida ? "px-3 py-2 gap-3" : "h-10 justify-center"
            )}
          >
            {escuro ? (
              <Sun size={17} className="shrink-0 text-amber-500" />
            ) : (
              <Moon size={17} className="shrink-0 text-slate-600" />
            )}
            {visualmenteExpandida && (
              <span className="truncate font-medium">
                {escuro ? "Modo Claro" : "Modo Escuro"}
              </span>
            )}
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
