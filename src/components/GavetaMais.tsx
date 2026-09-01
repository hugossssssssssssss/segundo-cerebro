import { NavLink } from "react-router-dom";
import { X, Sparkles, Settings, Moon, Sun, Palette, Smartphone } from "lucide-react";
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
import { ModalInstalarPwa } from "./ModalInstalarPwa";
import { Tooltip } from "@/components/ui/tooltip";

import { alternarTema, lerTemaSalvo, type Tema } from "@/lib/tema";

interface GavetaMaisProps {
  aberta: boolean;
  aoFechar: () => void;
}

export function GavetaMais({ aberta, aoFechar }: GavetaMaisProps) {
  const [tema, setTema] = useState<Tema>(lerTemaSalvo);
  const [modalInstalarAberta, setModalInstalarAberta] = useState(false);

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

  useEffect(() => {
    if (!aberta) return;
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [aberta, aoFechar]);

  if (!aberta) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 sm:hidden backdrop-blur-xs animate-in fade-in duration-200">
        {/* Fundo clicável para fechar */}
        <div className="flex-1" onClick={aoFechar} />

        {/* Conteúdo da Gaveta estilo Bottom Sheet */}
        <div className="rounded-t-3xl border-t border-border bg-card/95 p-4 pb-[max(env(safe-area-inset-bottom),16px)] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto backdrop-blur-xl animate-in slide-in-from-bottom duration-200">
          {/* Puxador nativo de Bottom Sheet */}
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-2 select-none" />

          {/* Topo da Gaveta */}
          <div className="flex items-center justify-between pb-2 border-b border-border/80">
            <div className="flex items-center gap-2">
              <LogoKlaus tamanho={24} />
              <span className="font-bold text-sm tracking-tight text-foreground">
                Menu do Klaus
              </span>
            </div>
            <button
              onClick={aoFechar}
              className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Grupos de Links */}
          <div className="space-y-4">
            {(grupos || []).filter((g) => g && Array.isArray(g.itens)).map((grupo) => {
              const itensVisiveis = (grupo.itens || []).filter((item) => item && typeof item === "object" && !item.oculto);
              if (itensVisiveis.length === 0) return null;

              return (
                <div key={grupo.id || grupo.titulo} className="space-y-1">
                  <h3 className="px-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase truncate">
                    {grupo.titulo}
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {itensVisiveis.map((item) => {
                      const Icone = obterIconePorNome(item.iconeNome || "HelpCircle");
                      return (
                        <NavLink
                          key={item.id || item.para}
                          to={item.para || "/home"}
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
                          <span className="truncate flex-1">{item.rotulo || "Item"}</span>
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

          {/* Rodapé da Gaveta: Instalar App, Personalizar Menu, Ajustes e Tema */}
          <div className="pt-2 border-t border-border grid grid-cols-4 gap-1.5">
            <Tooltip conteudo="Instalar Klaus no celular">
              <button
                onClick={() => setModalInstalarAberta(true)}
                className="flex items-center justify-center gap-1 rounded-xl p-2 text-xs font-medium border border-border bg-card text-foreground hover:bg-accent transition-colors cursor-pointer"
                aria-label="Instalar Klaus no celular"
              >
                <Smartphone size={15} className="text-primary shrink-0" />
                <span className="truncate">App</span>
              </button>
            </Tooltip>

            <button
              onClick={() => setModalPersonalizarAberta(true)}
              className="flex items-center justify-center gap-1 rounded-xl p-2 text-xs font-medium border border-border bg-card text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <Palette size={15} className="text-primary shrink-0" />
              <span className="truncate">Menu</span>
            </button>

            <NavLink
              to="/config"
              onClick={aoFechar}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-center gap-1 rounded-xl p-2 text-xs font-medium border transition-colors",
                  isActive
                    ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                    : "bg-card border-border text-foreground hover:bg-accent"
                )
              }
            >
              <Settings size={15} className="shrink-0" />
              <span className="truncate">Ajustes</span>
            </NavLink>

            <button
              onClick={toggleTema}
              className="flex items-center justify-center gap-1 rounded-xl p-2 text-xs font-medium border border-border bg-card text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              {escuro ? <Sun size={15} className="shrink-0" /> : <Moon size={15} className="shrink-0" />}
              <span className="truncate">{escuro ? "Claro" : "Escuro"}</span>
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

      {/* Modal de Instalação do App */}
      <ModalInstalarPwa
        aberta={modalInstalarAberta}
        aoFechar={() => setModalInstalarAberta(false)}
      />
    </>
  );
}
