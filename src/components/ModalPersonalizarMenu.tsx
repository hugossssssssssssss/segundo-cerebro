import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Palette,
  Edit3,
} from "lucide-react";
import {
  carregarMenuPersonalizado,
  salvarMenuPersonalizado,
  restaurarMenuPadrao,
  PRESETS_CORES_ICONE,
  type GrupoMenuPersonalizado,
  type ItemMenuPersonalizado,
} from "@/lib/menuPersonalizado";
import { obterIconePorNome } from "@/lib/icones";
import { GaleriaIconesModal } from "./GaleriaIconesModal";
import { cn } from "@/lib/utils";

interface ModalPersonalizarMenuProps {
  aberta: boolean;
  aoFechar: () => void;
}

export function ModalPersonalizarMenu({ aberta, aoFechar }: ModalPersonalizarMenuProps) {
  const [grupos, setGrupos] = useState<GrupoMenuPersonalizado[]>([]);
  const [itemEmEdicaoIcone, setItemEmEdicaoIcone] = useState<{
    idxGrupo: number;
    idxItem: number;
  } | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState("");

  useEffect(() => {
    if (aberta) {
      setGrupos(carregarMenuPersonalizado());
    }
  }, [aberta]);

  if (!aberta) return null;

  const atualizarTituloGrupo = (idxGrupo: number, novoTitulo: string) => {
    const copia = [...grupos];
    copia[idxGrupo] = { ...copia[idxGrupo], titulo: novoTitulo };
    setGrupos(copia);
  };

  const atualizarItem = (
    idxGrupo: number,
    idxItem: number,
    campos: Partial<ItemMenuPersonalizado>
  ) => {
    const copia = [...grupos];
    const grupo = { ...copia[idxGrupo] };
    const itens = [...grupo.itens];
    itens[idxItem] = { ...itens[idxItem], ...campos };
    grupo.itens = itens;
    copia[idxGrupo] = grupo;
    setGrupos(copia);
  };

  const moverItem = (idxGrupo: number, idxItem: number, direcao: "cima" | "baixo") => {
    const copia = [...grupos];
    const grupo = { ...copia[idxGrupo] };
    const itens = [...grupo.itens];
    const novoIdx = direcao === "cima" ? idxItem - 1 : idxItem + 1;

    if (novoIdx < 0 || novoIdx >= itens.length) return;

    const temp = itens[idxItem];
    itens[idxItem] = itens[novoIdx];
    itens[novoIdx] = temp;
    grupo.itens = itens;
    copia[idxGrupo] = grupo;
    setGrupos(copia);
  };

  const alternarOculto = (idxGrupo: number, idxItem: number) => {
    const item = grupos[idxGrupo].itens[idxItem];
    atualizarItem(idxGrupo, idxItem, { oculto: !item.oculto });
  };

  const salvar = () => {
    salvarMenuPersonalizado(grupos);
    setSucessoMsg("Menu personalizado salvo com sucesso!");
    setTimeout(() => {
      setSucessoMsg("");
      aoFechar();
    }, 1000);
  };

  const resetar = () => {
    if (window.confirm("Deseja restaurar os nomes, cores e ícones padrões do menu?")) {
      restaurarMenuPadrao();
      setGrupos(carregarMenuPersonalizado());
      setSucessoMsg("Padrões restaurados!");
      setTimeout(() => setSucessoMsg(""), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Palette size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Personalizar Menu Lateral</h2>
              <p className="text-xs text-muted-foreground">
                Altere nomes das categorias, nomes dos itens, cores e ícones do menu
              </p>
            </div>
          </div>
          <button
            onClick={aoFechar}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mensagem de sucesso */}
        {sucessoMsg && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 text-xs font-semibold flex items-center gap-2">
            <Check size={16} />
            <span>{sucessoMsg}</span>
          </div>
        )}

        {/* Conteúdo scrollável com grupos */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-background">
          {grupos.map((grupo, idxGrupo) => (
            <div key={grupo.id} className="rounded-xl border border-border bg-card p-4 space-y-4">
              {/* Título da Categoria */}
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2 flex-1">
                  <Edit3 size={14} className="text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={grupo.titulo}
                    onChange={(e) => atualizarTituloGrupo(idxGrupo, e.target.value)}
                    placeholder="Nome da categoria..."
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-hidden px-1 py-0.5 w-full max-w-xs transition-colors"
                  />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/70">
                  {grupo.itens.filter((i) => !i.oculto).length} visíveis
                </span>
              </div>

              {/* Lista de Itens do Grupo */}
              <div className="space-y-3">
                {grupo.itens.map((item, idxItem) => {
                  const IconeComp = obterIconePorNome(item.iconeNome);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all",
                        item.oculto
                          ? "bg-muted/20 border-border/40 opacity-60"
                          : "bg-card border-border hover:border-primary/40 shadow-xs"
                      )}
                    >
                      {/* Lado Esquerdo: Ícone + Input de Nome */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Botão de escolha do Ícone */}
                        <button
                          type="button"
                          onClick={() => setItemEmEdicaoIcone({ idxGrupo, idxItem })}
                          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/50 hover:bg-accent hover:scale-105 transition-all group"
                          title="Clique para escolher um novo ícone na Galeria"
                        >
                          <IconeComp size={20} style={{ color: item.cor }} />
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] shadow-xs group-hover:scale-110 transition-transform">
                            <Sparkles size={10} />
                          </span>
                        </button>

                        {/* Input do Nome do Item */}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.rotulo}
                            onChange={(e) =>
                              atualizarItem(idxGrupo, idxItem, { rotulo: e.target.value })
                            }
                            placeholder="Nome do item..."
                            className="w-full text-sm font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-hidden px-1 py-0.5 transition-colors"
                          />
                          <span className="text-[10px] font-mono text-muted-foreground px-1 block truncate">
                            Rota: {item.para} • Ícone: {item.iconeNome}
                          </span>
                        </div>
                      </div>

                      {/* Lado Direito: Seletor de Cores & Ações */}
                      <div className="flex items-center gap-2 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                        {/* Paleta de Cores */}
                        <div className="flex items-center gap-1 bg-accent/40 p-1 rounded-lg border border-border/60">
                          {/* Sem cor */}
                          <button
                            type="button"
                            onClick={() => atualizarItem(idxGrupo, idxItem, { cor: undefined })}
                            className={cn(
                              "h-5 w-5 rounded-full border border-border flex items-center justify-center text-[9px] transition-transform",
                              !item.cor && "ring-2 ring-primary scale-110 font-bold"
                            )}
                            title="Cor padrão do sistema"
                          >
                            ✓
                          </button>

                          {/* Presets */}
                          {PRESETS_CORES_ICONE.map((preset) => (
                            <button
                              key={preset.hex}
                              type="button"
                              onClick={() => atualizarItem(idxGrupo, idxItem, { cor: preset.hex })}
                              style={{ backgroundColor: preset.hex }}
                              className={cn(
                                "h-5 w-5 rounded-full transition-transform hover:scale-110 border border-black/10",
                                item.cor === preset.hex && "ring-2 ring-primary ring-offset-1 scale-110"
                              )}
                              title={preset.nome}
                            />
                          ))}

                          {/* Color Picker Livre */}
                          <input
                            type="color"
                            value={item.cor || "#3b82f6"}
                            onChange={(e) =>
                              atualizarItem(idxGrupo, idxItem, { cor: e.target.value })
                            }
                            className="h-5 w-5 rounded-full border-0 p-0 cursor-pointer bg-transparent"
                            title="Escolher cor personalizada..."
                          />
                        </div>

                        {/* Reordenar Cima / Baixo */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moverItem(idxGrupo, idxItem, "cima")}
                            disabled={idxItem === 0}
                            className="p-1 rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                            title="Mover para cima"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moverItem(idxGrupo, idxItem, "baixo")}
                            disabled={idxItem === grupo.itens.length - 1}
                            className="p-1 rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                            title="Mover para baixo"
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>

                        {/* Ocultar / Mostrar */}
                        <button
                          type="button"
                          onClick={() => alternarOculto(idxGrupo, idxItem)}
                          className={cn(
                            "p-1.5 rounded-lg border transition-colors",
                            item.oculto
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : "bg-card text-muted-foreground border-border hover:text-foreground"
                          )}
                          title={item.oculto ? "Mostrar item no menu" : "Ocultar item do menu"}
                        >
                          {item.oculto ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé com Restauração e Salvamento */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-card">
          <button
            type="button"
            onClick={resetar}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
          >
            <RotateCcw size={14} />
            Restaurar Padrões
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={aoFechar}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-border bg-card text-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-md transition-all"
            >
              <Check size={14} />
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>

      {/* Modal da Galeria de Ícones se algum item estiver em edição de ícone */}
      {itemEmEdicaoIcone && (
        <GaleriaIconesModal
          aberta={Boolean(itemEmEdicaoIcone)}
          aoFechar={() => setItemEmEdicaoIcone(null)}
          iconeAtual={
            grupos[itemEmEdicaoIcone.idxGrupo].itens[itemEmEdicaoIcone.idxItem].iconeNome
          }
          corAtual={grupos[itemEmEdicaoIcone.idxGrupo].itens[itemEmEdicaoIcone.idxItem].cor}
          aoSelecionarIcone={(novoIcone) => {
            atualizarItem(itemEmEdicaoIcone.idxGrupo, itemEmEdicaoIcone.idxItem, {
              iconeNome: novoIcone,
            });
          }}
        />
      )}
    </div>
  );
}
