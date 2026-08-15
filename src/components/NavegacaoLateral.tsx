import { NavLink } from "react-router-dom";
import {
  Home as HomeIcon,
  CheckSquare,
  FileText,
  Image,
  Layout,
  Target,
  MessageCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  FileCheck,
  RefreshCw,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { LogoKlaus } from "./LogoKlaus";

export interface ItemNavegacao {
  para: string;
  rotulo: string;
  Icone: React.ComponentType<{ size?: number; className?: string }>;
  destaque?: boolean;
}

export interface GrupoNavegacao {
  titulo: string;
  itens: ItemNavegacao[];
}

export const gruposNavegacao: GrupoNavegacao[] = [
  {
    titulo: "Dia a Dia",
    itens: [
      { para: "/home", rotulo: "Início", Icone: HomeIcon },
      { para: "/tarefas", rotulo: "Tarefas", Icone: CheckSquare },
      { para: "/notas", rotulo: "Notas", Icone: FileText },
    ],
  },
  {
    titulo: "Criação & Ferramentas",
    itens: [
      { para: "/lousas", rotulo: "Excalidraw", Icone: Layout },
      { para: "/referencias", rotulo: "Pinterest", Icone: Image },
      { para: "/pdf", rotulo: "iLovePDF", Icone: FileCheck },
      { para: "/conversor", rotulo: "Conversor", Icone: RefreshCw },
    ],
  },
  {
    titulo: "Evolução & IA",
    itens: [
      { para: "/pdi", rotulo: "Carreira (PDI)", Icone: Target },
      { para: "/transcritor", rotulo: "Transcrição de Áudio", Icone: Mic },
      { para: "/chat", rotulo: "Conversar", Icone: MessageCircle, destaque: true },
    ],
  },
];

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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", escuro);
    localStorage.setItem("tema", escuro ? "escuro" : "claro");
  }, [escuro]);

  if (colapsada) return null;

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out select-none shrink-0 w-60",
        className
      )}
    >
      {/* Topo da Sidebar: Marca e Toggle */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-border/60">
        {!colapsada && (
          <NavLink
            to="/home"
            onClick={aoNavegar}
            className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground truncate"
          >
            <LogoKlaus tamanho={28} />
            <span className="truncate text-base font-bold tracking-tight">Klaus</span>
          </NavLink>
        )}

        {colapsada && (
          <NavLink
            to="/home"
            onClick={aoNavegar}
            className="mx-auto flex items-center justify-center p-1 rounded-xl hover:opacity-80 transition-opacity"
            title="Klaus"
          >
            <LogoKlaus tamanho={28} />
          </NavLink>
        )}

        <button
          onClick={() => setColapsada((v) => !v)}
          className={cn(
            "hidden sm:flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            colapsada && "mx-auto"
          )}
          title={colapsada ? "Expandir barra lateral (⌘B)" : "Recolher barra lateral (⌘B)"}
          aria-label={colapsada ? "Expandir barra lateral" : "Recolher barra lateral"}
        >
          {colapsada ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Corpo da Navegação */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {gruposNavegacao.map((grupo) => (
          <div key={grupo.titulo} className="space-y-1">
            {!colapsada && (
              <h3 className="px-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                {grupo.titulo}
              </h3>
            )}
            <nav className="space-y-0.5">
              {grupo.itens.map(({ para, rotulo, Icone, destaque }) => (
                <NavLink
                  key={para}
                  to={para}
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
                  title={colapsada ? rotulo : undefined}
                >
                  <Icone size={18} className="shrink-0" />
                  {!colapsada && (
                    <span className="truncate flex-1">{rotulo}</span>
                  )}
                  {!colapsada && destaque && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                      <Sparkles size={10} />
                      IA
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Rodapé da Sidebar */}
      <div className="border-t border-border/60 p-2 space-y-1">
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
  );
}
