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
import { VERSAO_APP } from "@/lib/versao";
import {
  carregarMenuPersonalizado,
  EVENTO_MENU_ATUALIZADO,
  type GrupoMenuPersonalizado,
} from "@/lib/menuPersonalizado";
import { obterIconePorNome } from "@/lib/icones";
import { ModalPersonalizarMenu } from "./ModalPersonalizarMenu";

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
  const [escuro, setEscuro] = useState(() => {
    const salvo = localStorage.getItem("tema");
    if (salvo) return salvo === "escuro";
    return matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [grupos, setGrupos] = useState<GrupoMenuPersonalizado[]>(carregarMenuPersonalizado);
  const [modalPersonalizarAberta, setModalPersonalizarAberta] = useState(false);

  const atualizarMenu = useCallback(() => {
    setGrupos(carregarMenuPersonalizado());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", escuro);
    localStorage.setItem("tema", escuro ? "escuro" : "claro");
  }, [escuro]);

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
                onClick={aoNavegar}
                className="flex items-center gap-2 font-semibold tracking-tight text-foreground truncate min-w-0"
              >
                <LogoKlaus tamanho={28} />
                <span className="truncate text-base font-bold tracking-tight">Klaus</span>
                <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-primary border border-primary/20">
                  v{VERSAO_APP}
                </span>
              </NavLink>
              <button
                onClick={() => setColapsada(true)}
                className="hidden sm:flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Recolher barra lateral (⌘B)"
                aria-label="Recolher barra lateral"
              >
                <ChevronLeft size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setColapsada(false)}
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={`Expandir barra lateral (Klaus v${VERSAO_APP})`}
              aria-label="Expandir barra lateral"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Corpo da Navegação */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {grupos.map((grupo) => {
            const itensVisiveis = grupo.itens.filter((item) => !item.oculto);
            if (itensVisiveis.length === 0) return null;

            return (
              <div key={grupo.id} className="space-y-1">
                {!colapsada && (
                  <h3 className="px-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase truncate">
                    {grupo.titulo}
                  </h3>
                )}
                <nav className="space-y-0.5">
                  {itensVisiveis.map((item) => {
                    const Icone = obterIconePorNome(item.iconeNome);
                    return (
                      <NavLink
                        key={item.id}
                        to={item.para}
                        onClick={aoNavegar}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors relative group",
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
                          <span className="truncate flex-1">{item.rotulo}</span>
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
            onClick={() => setEscuro((v) => !v)}
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
