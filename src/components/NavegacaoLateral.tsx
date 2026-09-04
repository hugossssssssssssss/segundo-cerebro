import { NavLink } from "react-router-dom";
import {
  ChevronLeft,
  Sun,
  Moon,
  Settings,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
import { Tooltip } from "@/components/ui/tooltip";

interface NavegacaoLateralProps {
  colapsada: boolean;
  setColapsada: React.Dispatch<React.SetStateAction<boolean>>;
  aoNavegar?: () => void;
  className?: string;
}

interface BotaoItemMenuProps {
  para?: string;
  aoClicar?: () => void;
  rotulo: string;
  icone: any;
  corIcone?: string;
  colapsada: boolean;
  ariaLabel?: string;
}

function BotaoItemMenu({
  para,
  aoClicar,
  rotulo,
  icone: Icone,
  corIcone,
  colapsada,
  ariaLabel,
}: BotaoItemMenuProps) {
  const classeBase = cn(
    "flex items-center rounded-xl text-sm font-medium transition-colors group cursor-pointer select-none shrink-0",
    colapsada ? "h-10 w-10 mx-auto justify-center p-0" : "h-10 w-full px-2.5 gap-3"
  );

  const conteudoInterno = (
    <>
      <Icone
        size={20}
        style={{ color: corIcone }}
        className="shrink-0 transition-transform duration-150 group-hover:scale-110"
      />
      {!colapsada && <span className="truncate flex-1 text-left">{rotulo}</span>}
    </>
  );

  return (
    <Tooltip conteudo={rotulo} posicao="right" desabilitado={!colapsada}>
      {para ? (
        <NavLink
          to={para}
          onClick={aoClicar}
          className={({ isActive }) =>
            cn(
              classeBase,
              isActive
                ? "bg-primary/15 text-primary font-semibold"
                : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
            )
          }
          aria-label={ariaLabel || rotulo}
        >
          {conteudoInterno}
        </NavLink>
      ) : (
        <button
          type="button"
          onClick={aoClicar}
          className={cn(classeBase, "text-muted-foreground hover:bg-accent/80 hover:text-foreground")}
          aria-label={ariaLabel || rotulo}
        >
          {conteudoInterno}
        </button>
      )}
    </Tooltip>
  );
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
          "flex flex-col border-r border-border bg-card transition-all duration-200 ease-in-out select-none shrink-0 overflow-hidden",
          colapsada ? "w-16" : "w-60",
          className
        )}
      >
        {/* Topo da Sidebar: Marca e Toggle */}
        <div className="relative flex h-14 items-center justify-center px-3 border-b border-border/60 transition-all shrink-0">
          {!colapsada ? (
            <>
              <NavLink
                to="/home"
                onClick={lidarCliqueItem}
                className="flex items-center justify-center gap-2.5 font-semibold tracking-tight text-foreground truncate hover:opacity-90 transition-opacity"
              >
                <LogoKlaus tamanho={28} />
                <span className="truncate text-base font-bold tracking-tight">Klaus</span>
              </NavLink>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <Tooltip conteudo="Recolher menu lateral" atalho="⌘B" posicao="bottom">
                  <button
                    type="button"
                    onClick={() => setColapsada(true)}
                    className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer shrink-0"
                    aria-label="Recolher menu lateral"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </Tooltip>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Tooltip conteudo="Expandir menu lateral" atalho="⌘B" posicao="right" desabilitado={workspaceAberto}>
                <button
                  type="button"
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
                    "flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer shrink-0",
                    workspaceAberto && "hover:text-primary"
                  )}
                  aria-label="Expandir menu lateral"
                >
                  <LogoKlaus tamanho={28} />
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
            "flex-1 overflow-y-auto overflow-x-hidden p-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            colapsada ? "space-y-2" : "space-y-4"
          )}
        >
          {(grupos || []).filter((g) => g && Array.isArray(g.itens)).map((grupo) => {
            const itensVisiveis = (grupo.itens || []).filter((item) => item && typeof item === "object" && !item.oculto);
            if (itensVisiveis.length === 0) return null;

            return (
              <div key={grupo.id || grupo.titulo} className="space-y-1.5">
                {!colapsada && (
                  <h3 className="px-2.5 pb-0.5 text-[11px] font-semibold text-muted-foreground/80 tracking-wider uppercase truncate">
                    {grupo.titulo}
                  </h3>
                )}
                <nav className="space-y-1.5">
                  {itensVisiveis.map((item) => (
                    <BotaoItemMenu
                      key={item.id || item.para}
                      para={item.para || "/home"}
                      aoClicar={lidarCliqueItem}
                      rotulo={item.rotulo || "Item"}
                      icone={obterIconePorNome(item.iconeNome || "HelpCircle")}
                      corIcone={item.cor}
                      colapsada={colapsada}
                    />
                  ))}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Rodapé da Sidebar */}
        <div className="border-t border-border/60 p-3 space-y-1.5 shrink-0">
          <BotaoItemMenu
            aoClicar={() => setModalPersonalizarAberta(true)}
            rotulo="Personalizar Menu"
            icone={Palette}
            colapsada={colapsada}
          />
          <BotaoItemMenu
            para="/config"
            aoClicar={lidarCliqueItem}
            rotulo="Configurações"
            icone={Settings}
            colapsada={colapsada}
          />
          <BotaoItemMenu
            aoClicar={toggleTema}
            rotulo={escuro ? "Modo Claro" : "Modo Escuro"}
            icone={escuro ? Sun : Moon}
            corIcone={escuro ? "#f59e0b" : "#818cf8"}
            colapsada={colapsada}
          />
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
