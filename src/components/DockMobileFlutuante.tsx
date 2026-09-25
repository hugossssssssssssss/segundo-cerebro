import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home as HomeIcon, CheckSquare, FileText, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface DockMobileFlutuanteProps {
  aoAbrirMenuPizza: () => void;
  menuPizzaAberto: boolean;
  ocultarTemporariamente?: boolean;
}

export function DockMobileFlutuante({
  aoAbrirMenuPizza,
  menuPizzaAberto,
  ocultarTemporariamente = false,
}: DockMobileFlutuanteProps) {
  const { pathname } = useLocation();
  const [visivel, setVisivel] = useState(false);
  const ultimoScrollY = useRef(0);

  useEffect(() => {
    // Monitora tanto o window quanto o elemento <main> onde o scroll pode ocorrer
    const elementoMain = document.querySelector("main");

    const verificarScroll = () => {
      const scrollYWindow = window.scrollY || document.documentElement.scrollTop || 0;
      const scrollYMain = elementoMain ? elementoMain.scrollTop : 0;
      const scrollAtual = Math.max(scrollYWindow, scrollYMain);

      // Ao rodar o scroll para baixo (passou de 20px), o dock surge
      if (scrollAtual > 25) {
        setVisivel(true);
      } else if (scrollAtual <= 8) {
        // Ao voltar ao topo extremo da tela, recolhe discretamente
        setVisivel(false);
      }
      ultimoScrollY.current = scrollAtual;
    };

    // Fallback: se a tela não tiver altura de rolagem (conteúdo curto),
    // torna o dock visível para o usuário não ficar sem navegação
    const verificarAlturaPagina = () => {
      const alturaJanela = window.innerHeight;
      const alturaCorpo = document.documentElement.scrollHeight;
      const alturaMain = elementoMain ? elementoMain.scrollHeight : 0;
      const temScroll = alturaCorpo > alturaJanela + 40 || (elementoMain && alturaMain > alturaJanela + 40);

      if (!temScroll) {
        setVisivel(true);
      }
    };

    const timer = setTimeout(verificarAlturaPagina, 500);

    window.addEventListener("scroll", verificarScroll, { passive: true });
    if (elementoMain) {
      elementoMain.addEventListener("scroll", verificarScroll, { passive: true });
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", verificarScroll);
      if (elementoMain) {
        elementoMain.removeEventListener("scroll", verificarScroll);
      }
    };
  }, [pathname]);

  if (ocultarTemporariamente || menuPizzaAberto) {
    return null;
  }

  const abas = [
    { para: "/home", rotulo: "Início", Icone: HomeIcon },
    { para: "/tarefas", rotulo: "Tarefas", Icone: CheckSquare },
    { para: "/notas", rotulo: "Notas", Icone: FileText },
  ];

  return (
    <div
      className={cn(
        "fixed bottom-[max(env(safe-area-inset-bottom),14px)] inset-x-0 z-40 flex items-center justify-center gap-2.5 px-4 pointer-events-none sm:hidden transition-all duration-300 ease-out select-none",
        visivel
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-16 opacity-0 scale-95"
      )}
    >
      {/* 1. Ilha Central Flutuante com cantos arredondados e apenas os ícones */}
      <nav
        aria-label="Navegação rápida móvel"
        className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-full bg-card/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-2xl ring-1 ring-black/5 dark:ring-white/5"
      >
        {abas.map(({ para, rotulo, Icone }) => (
          <NavLink
            key={para}
            to={para}
            title={rotulo}
            aria-label={rotulo}
            className={({ isActive }) =>
              cn(
                "h-11 w-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-85 touch-manipulation cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground font-bold shadow-md scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:bg-secondary"
              )
            }
          >
            <Icone size={20} className="shrink-0" />
          </NavLink>
        ))}
      </nav>

      {/* 2. Botão Circular Separado com o ícone de Menu */}
      <button
        type="button"
        onClick={aoAbrirMenuPizza}
        aria-label="Abrir menu de ferramentas"
        className="pointer-events-auto h-12 w-12 rounded-full bg-card/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-2xl ring-1 ring-black/5 dark:ring-white/5 flex items-center justify-center text-foreground hover:text-primary active:scale-85 transition-all duration-200 cursor-pointer touch-manipulation"
      >
        <Menu size={20} className="shrink-0" />
      </button>
    </div>
  );
}
