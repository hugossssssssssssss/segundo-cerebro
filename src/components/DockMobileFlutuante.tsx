import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home as HomeIcon, CheckSquare, FileText, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DockMobileFlutuanteProps {
  aoAbrirMenuPizza: () => void;
  aoAbrirCaptura: () => void;
  menuPizzaAberto: boolean;
  ocultarTemporariamente?: boolean;
}

export function DockMobileFlutuante({
  aoAbrirMenuPizza,
  aoAbrirCaptura,
  menuPizzaAberto,
  ocultarTemporariamente = false,
}: DockMobileFlutuanteProps) {
  const { pathname } = useLocation();
  // Visível por padrão ao abrir qualquer tela
  const [visivel, setVisivel] = useState(true);
  const ultimoScrollY = useRef(0);
  const timerInatividade = useRef<any>(null);

  useEffect(() => {
    // Garante que ao mudar de tela o dock esteja visível
    setVisivel(true);

    const elementoMain = document.querySelector("main");

    const verificarScroll = () => {
      const scrollYWindow = window.scrollY || document.documentElement.scrollTop || 0;
      const scrollYMain = elementoMain ? elementoMain.scrollTop : 0;
      const scrollAtual = Math.max(scrollYWindow, scrollYMain);
      const delta = scrollAtual - ultimoScrollY.current;

      // Se rolar para cima: reaparece imediatamente
      if (delta < -8) {
        setVisivel(true);
      } else if (delta > 25 && scrollAtual > 80) {
        // Se rolar para baixo com intenção clara: recolhe discretamente para dar espaço à leitura
        setVisivel(false);
      }

      ultimoScrollY.current = scrollAtual;

      // Ao parar de rolar por 1 segundo, reaparece suavemente
      clearTimeout(timerInatividade.current);
      timerInatividade.current = setTimeout(() => {
        setVisivel(true);
      }, 1200);
    };

    window.addEventListener("scroll", verificarScroll, { passive: true });
    if (elementoMain) {
      elementoMain.addEventListener("scroll", verificarScroll, { passive: true });
    }

    return () => {
      clearTimeout(timerInatividade.current);
      window.removeEventListener("scroll", verificarScroll);
      if (elementoMain) {
        elementoMain.removeEventListener("scroll", verificarScroll);
      }
    };
  }, [pathname]);

  if (ocultarTemporariamente || menuPizzaAberto) {
    return null;
  }

  // Ação contextual do botão (+) de acordo com a tela atual
  const lidarCliqueMais = () => {
    if (pathname === "/" || pathname === "/home") {
      aoAbrirCaptura();
    } else {
      // Dispara o evento padronizado que telas como Tarefas, Notas e Referências escutam
      window.dispatchEvent(new CustomEvent("klaus-acao-criar-dock"));
    }
  };

  const abas = [
    {
      para: "/home",
      rotulo: "Tela inicial",
      Icone: HomeIcon,
      ehAtiva: pathname === "/" || pathname === "/home",
    },
    {
      para: "/tarefas",
      rotulo: "Tarefas",
      Icone: CheckSquare,
      ehAtiva: pathname.startsWith("/tarefas"),
    },
    {
      para: "/notas",
      rotulo: "Notas",
      Icone: FileText,
      ehAtiva: pathname.startsWith("/notas"),
    },
  ];

  return (
    <div
      className={cn(
        "fixed bottom-[max(env(safe-area-inset-bottom),14px)] inset-x-0 z-40 flex items-center justify-center gap-2 px-3 pointer-events-none sm:hidden transition-all duration-300 ease-out select-none",
        visivel
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-16 opacity-0 scale-95"
      )}
    >
      {/* 1. Ilha Central Flutuante: expande apenas a aba ativa com o nome */}
      <nav
        aria-label="Navegação rápida móvel"
        className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full bg-card/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-2xl ring-1 ring-black/5 dark:ring-white/5"
      >
        {abas.map(({ para, rotulo, Icone, ehAtiva }) => (
          <NavLink
            key={para}
            to={para}
            title={rotulo}
            aria-label={rotulo}
            className={cn(
              "rounded-full flex items-center justify-center transition-all duration-300 ease-out touch-manipulation cursor-pointer active:scale-95",
              ehAtiva
                ? "h-11 px-3.5 bg-primary text-primary-foreground font-semibold shadow-md gap-1.5"
                : "h-11 w-11 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            )}
          >
            <Icone size={19} className="shrink-0" />
            {ehAtiva && (
              <span className="text-xs font-bold whitespace-nowrap animate-in fade-in slide-in-from-left-1 duration-200 tracking-tight">
                {rotulo}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 2. Botão de Menu Circular Separado */}
      <button
        type="button"
        onClick={aoAbrirMenuPizza}
        aria-label="Abrir menu pizza de ferramentas"
        className="pointer-events-auto h-12 w-12 rounded-full bg-card/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-2xl ring-1 ring-black/5 dark:ring-white/5 flex items-center justify-center text-foreground hover:text-primary active:scale-85 transition-all duration-200 cursor-pointer touch-manipulation shrink-0"
      >
        <Menu size={20} className="shrink-0" />
      </button>

      {/* 3. Botão de (+) Circular - No lado direito */}
      <button
        type="button"
        onClick={lidarCliqueMais}
        aria-label="Nova ação rápida"
        className="pointer-events-auto h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-105 active:scale-85 transition-all duration-200 cursor-pointer touch-manipulation shrink-0"
      >
        <Plus size={22} strokeWidth={2.5} className="shrink-0" />
      </button>
    </div>
  );
}
