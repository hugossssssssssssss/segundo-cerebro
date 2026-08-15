import { NavLink } from "react-router-dom";
import { X, Sparkles, Settings, Moon, Sun, Palette } from "lucide-react";
import {
  carregarMenuPersonalizado,
  EVENTO_MENU_ATUALIZADO,
  type GrupoMenuPersonalizado,
} from "@/lib/menuPersonalizado";
import { obterIconePorNome } from "@/lib/icones";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { LogoKlaus } from "./LogoKlaus";
import { ModalPersonalizarMenu } from "./ModalPersonalizarMenu";

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

  if (!aberta) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 sm:hidden backdrop-blur-xs animate-in fade-in duration-200">
        {/* Fundo clicável para fechar */}
        <div className="flex-1" onClick={aoFechar} />

        {/* Conteúdo da Gaveta estilo Bottom Sheet */}
        <div className="rounded-t-2xl border-t border-border bg-background p-4 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
          {/* Topo da Gaveta */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <LogoKlaus tamanho={24} />
              <span className="font-bold text-sm tracking-tight text-foreground">
                Menu do Klaus
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
            {grupos.map((grupo) => {
              const itensVisiveis = grupo.itens.filter((item) => !item.oculto);
              if (itensVisiveis.length === 0) return null;

              return (
                <div key={grupo.id} className="space-y-1">
                  <h3 className="px-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase truncate">
                    {grupo.titulo}
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {itensVisiveis.map((item) => {
                      const Icone = obterIconePorNome(item.iconeNome);
                      return (
                        <NavLink
                          key={item.id}
                          to={item.para}
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
                          <Icone
                            size={18}
                            style={{ color: item.cor }}
                            className="shrink-0 text-primary"
                          />
                          <span className="truncate flex-1">{item.rotulo}</span>
                          {item.destaque && (
                            <Sparkles size={12} className="text-amber-500 shrink-0" />
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé da Gaveta: Personalizar Menu, Ajustes e Tema */}
          <div className="pt-2 border-t border-border grid grid-cols-3 gap-2">
            <button
              onClick={() => setModalPersonalizarAberta(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-medium border border-border bg-card text-foreground hover:bg-accent transition-colors"
            >
              <Palette size={16} className="text-primary" />
              <span>Menu</span>
            </button>

            <NavLink
              to="/config"
              onClick={aoFechar}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-medium border transition-colors",
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
              className="flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-medium border border-border bg-card text-foreground hover:bg-accent transition-colors"
            >
              {escuro ? <Sun size={16} /> : <Moon size={16} />}
              <span>{escuro ? "Claro" : "Escuro"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Personalização */}
      <ModalPersonalizarMenu
        aberta={modalPersonalizarAberta}
        aoFechar={() => {
          setModalPersonalizarAberta(false);
          aoFechar();
        }}
      />
    </>
  );
}
