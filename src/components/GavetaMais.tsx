import { NavLink } from "react-router-dom";
import { X, Sparkles, Settings, Moon, Sun } from "lucide-react";
import { gruposNavegacao } from "./NavegacaoLateral";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface GavetaMaisProps {
  aberta: boolean;
  aoFechar: () => void;
}

export function GavetaMais({ aberta, aoFechar }: GavetaMaisProps) {
  const [escuro, setEscuro] = useState(() => {
    const salvo = localStorage.getItem("tema");
    if (salvo) return salvo === "escuro";
    return matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", escuro);
    localStorage.setItem("tema", escuro ? "escuro" : "claro");
  }, [escuro]);

  if (!aberta) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity sm:hidden">
      {/* Clique fora fecha a gaveta */}
      <div className="flex-1" onClick={aoFechar} />

      {/* Conteúdo da Gaveta estilo Bottom Sheet */}
      <div className="rounded-t-2xl border-t border-border bg-background p-4 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        {/* Topo da Gaveta */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-xs">
              SC
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground">
              Menu do Segundo Cérebro
            </span>
          </div>
          <button
            onClick={aoFechar}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Grupos de Links */}
        <div className="space-y-4">
          {gruposNavegacao.map((grupo) => (
            <div key={grupo.titulo} className="space-y-1">
              <h3 className="px-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                {grupo.titulo}
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {grupo.itens.map(({ para, rotulo, Icone, destaque }) => (
                  <NavLink
                    key={para}
                    to={para}
                    onClick={aoFechar}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-xl p-3 text-xs font-medium border transition-colors",
                        isActive
                          ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                          : "bg-card/50 border-border text-foreground hover:bg-accent"
                      )
                    }
                  >
                    <Icone size={18} className="shrink-0 text-primary" />
                    <span className="truncate flex-1">{rotulo}</span>
                    {destaque && <Sparkles size={12} className="text-amber-500 shrink-0" />}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé da Gaveta: Ajustes e Tema */}
        <div className="pt-2 border-t border-border grid grid-cols-2 gap-2">
          <NavLink
            to="/config"
            onClick={aoFechar}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-medium border transition-colors",
                isActive
                  ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                  : "bg-card border-border text-foreground hover:bg-accent"
              )
            }
          >
            <Settings size={16} />
            <span>Ajustes</span>
          </NavLink>

          <button
            onClick={() => setEscuro((v) => !v)}
            className="flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-medium border border-border bg-card text-foreground hover:bg-accent transition-colors"
          >
            {escuro ? <Sun size={16} /> : <Moon size={16} />}
            <span>{escuro ? "Modo Claro" : "Modo Escuro"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
