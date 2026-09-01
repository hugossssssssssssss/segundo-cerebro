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
  Plus,
  Trash2,
  GripVertical,
  MoveHorizontal,
} from "lucide-react";
import {
  carregarMenuPersonalizado,
  salvarMenuPersonalizado,
  restaurarMenuPadrao,
  PRESETS_CORES_ICONE,
  GRUPOS_MENU_PADRAO,
  type GrupoMenuPersonalizado,
  type ItemMenuPersonalizado,
} from "@/lib/menuPersonalizado";
import { obterIconePorNome } from "@/lib/icones";
import { GaleriaIconesModal } from "./GaleriaIconesModal";
import { ModalConfirmacao } from "./ui";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { gerenciadorCamadas, NIVEIS_CAMADAS } from "@/lib/camadas";
import { lerConfig } from "@/lib/settings";

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

  // Estado para arrastar e soltar (Drag and Drop)
  const [dragItem, setDragItem] = useState<{ idxGrupo: number; idxItem: number } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<number | null>(null);
  const [confirmarReset, setConfirmarReset] = useState(false);
  const [categoriaParaRemoverIdx, setCategoriaParaRemoverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (aberta) {
      try {
        setGrupos(carregarMenuPersonalizado());
      } catch {
        setGrupos(GRUPOS_MENU_PADRAO);
      }
    }
  }, [aberta]);

  useEffect(() => {
    if (!aberta) return;
    const limpar = gerenciadorCamadas.registrar({
      id: "modal-personalizar-menu",
      nivel: NIVEIS_CAMADAS.MODAIS_GLOBAIS,
      temBackdrop: true,
      aoFechar: aoFechar,
    });
    return () => limpar();
  }, [aberta, aoFechar]);

  if (!aberta) return null;

  const atualizarTituloGrupo = (idxGrupo: number, novoTitulo: string) => {
    if (!grupos[idxGrupo]) return;
    const copia = [...grupos];
    copia[idxGrupo] = { ...copia[idxGrupo], titulo: novoTitulo };
    setGrupos(copia);
  };

  const adicionarCategoria = () => {
    const nova: GrupoMenuPersonalizado = {
      id: `categoria-${Date.now()}`,
      titulo: "Nova Categoria",
      itens: [],
    };
    setGrupos([...grupos, nova]);
  };

  const removerCategoria = (idxGrupo: number) => {
    if (grupos.length <= 1) {
      toast("Você precisa ter pelo menos uma categoria no menu.", { tipo: "aviso" });
      return;
    }

    const grupoARemover = grupos[idxGrupo];
    if (!grupoARemover) return;

    if (Array.isArray(grupoARemover.itens) && grupoARemover.itens.length > 0) {
      setCategoriaParaRemoverIdx(idxGrupo);
      return;
    }

    executarRemocaoCategoria(idxGrupo);
  };

  const executarRemocaoCategoria = (idxGrupo: number) => {
    const copia = [...grupos];
    const [removida] = copia.splice(idxGrupo, 1);

    if (removida && Array.isArray(removida.itens) && removida.itens.length > 0 && copia.length > 0) {
      copia[0] = {
        ...copia[0],
        itens: [...(copia[0].itens || []), ...removida.itens],
      };
    }

    setGrupos(copia);
    setCategoriaParaRemoverIdx(null);
  };

  const moverGrupo = (idxGrupo: number, direcao: "cima" | "baixo") => {
    const novoIdx = direcao === "cima" ? idxGrupo - 1 : idxGrupo + 1;
    if (novoIdx < 0 || novoIdx >= grupos.length) return;

    const copia = [...grupos];
    const temp = copia[idxGrupo];
    copia[idxGrupo] = copia[novoIdx];
    copia[novoIdx] = temp;
    setGrupos(copia);
  };

  const atualizarItem = (
    idxGrupo: number,
    idxItem: number,
    campos: Partial<ItemMenuPersonalizado>
  ) => {
    if (!grupos[idxGrupo] || !grupos[idxGrupo].itens?.[idxItem]) return;
    const copia = [...grupos];
    const grupo = { ...copia[idxGrupo] };
    const itens = [...(grupo.itens || [])];
    itens[idxItem] = { ...itens[idxItem], ...campos };
    grupo.itens = itens;
    copia[idxGrupo] = grupo;
    setGrupos(copia);
  };

  const moverItemMesmoGrupo = (idxGrupo: number, idxItem: number, direcao: "cima" | "baixo") => {
    if (!grupos[idxGrupo] || !grupos[idxGrupo].itens) return;
    const copia = [...grupos];
    const grupo = { ...copia[idxGrupo] };
    const itens = [...(grupo.itens || [])];
    const novoIdx = direcao === "cima" ? idxItem - 1 : idxItem + 1;

    if (novoIdx < 0 || novoIdx >= itens.length) return;

    const temp = itens[idxItem];
    itens[idxItem] = itens[novoIdx];
    itens[novoIdx] = temp;
    grupo.itens = itens;
    copia[idxGrupo] = grupo;
    setGrupos(copia);
  };

  const moverItemParaGrupo = (
    idxGrupoOrigem: number,
    idxItemOrigem: number,
    idxGrupoDestino: number,
    posicaoDestino?: number
  ) => {
    if (idxGrupoOrigem === idxGrupoDestino && posicaoDestino === undefined) return;
    if (!grupos[idxGrupoOrigem] || !grupos[idxGrupoDestino]) return;

    const copia = grupos.map((g) => ({ ...g, itens: [...(g.itens || [])] }));
    const item = copia[idxGrupoOrigem].itens.splice(idxItemOrigem, 1)[0];

    if (!item) return;

    if (posicaoDestino !== undefined) {
      copia[idxGrupoDestino].itens.splice(posicaoDestino, 0, item);
    } else {
      copia[idxGrupoDestino].itens.push(item);
    }

    setGrupos(copia);
  };

  const alternarOculto = (idxGrupo: number, idxItem: number) => {
    const item = grupos[idxGrupo]?.itens?.[idxItem];
    if (!item) return;
    atualizarItem(idxGrupo, idxItem, { oculto: !item.oculto });
  };

  const salvar = () => {
    const cfg = lerConfig();
    const ok = salvarMenuPersonalizado(grupos, cfg);
    if (!ok) {
      toast("Não foi possível salvar as alterações no navegador (armazenamento indisponível ou cota cheia).", { tipo: "erro" });
      return;
    }
    setSucessoMsg("Menu personalizado salvo com sucesso!");
    setTimeout(() => {
      setSucessoMsg("");
      aoFechar();
    }, 1000);
  };

  const resetar = () => {
    setConfirmarReset(true);
  };

  const executarReset = () => {
    const cfg = lerConfig();
    const ok = restaurarMenuPadrao(cfg);
    if (!ok) {
      toast("Não foi possível restaurar os padrões no navegador.", { tipo: "erro" });
      setConfirmarReset(false);
      return;
    }
    setGrupos(carregarMenuPersonalizado());
    setSucessoMsg("Padrões restaurados!");
    setConfirmarReset(false);
    setTimeout(() => setSucessoMsg(""), 1500);
  };

  // Handlers para Drag & Drop (HTML5 Native)
  const handleDragStart = (idxGrupo: number, idxItem: number) => {
    setDragItem({ idxGrupo, idxItem });
  };

  const handleDragOverCategory = (e: React.DragEvent, idxGrupo: number) => {
    e.preventDefault();
    setDragOverCategory(idxGrupo);
  };

  const handleDropOnCategory = (e: React.DragEvent, idxGrupoDestino: number) => {
    e.preventDefault();
    setDragOverCategory(null);
    if (!dragItem) return;

    moverItemParaGrupo(dragItem.idxGrupo, dragItem.idxItem, idxGrupoDestino);
    setDragItem(null);
  };

  const handleDropOnItem = (
    e: React.DragEvent,
    idxGrupoDestino: number,
    idxItemDestino: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategory(null);
    if (!dragItem) return;

    moverItemParaGrupo(
      dragItem.idxGrupo,
      dragItem.idxItem,
      idxGrupoDestino,
      idxItemDestino
    );
    setDragItem(null);
  };

  const itemEmEdicaoValido =
    itemEmEdicaoIcone &&
    grupos[itemEmEdicaoIcone.idxGrupo] &&
    grupos[itemEmEdicaoIcone.idxGrupo].itens?.[itemEmEdicaoIcone.idxItem];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Palette size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Personalizar Menu Lateral</h2>
              <p className="text-xs text-muted-foreground">
                Crie categorias, arraste e mova funcionalidades, escolha cores e ícones na galeria
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

        {/* Barra superior de ações */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-accent/30 border-b border-border text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
            <GripVertical size={14} className="text-primary" />
            <span>Dica: Arraste os itens pelo ícone para mover entre categorias</span>
          </span>
          <button
            onClick={adicionarCategoria}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-xs"
          >
            <Plus size={14} />
            Nova Categoria
          </button>
        </div>

        {/* Conteúdo scrollável com grupos */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-background">
          {grupos.filter(Boolean).map((grupo, idxGrupo) => {
            const itensDoGrupo = Array.isArray(grupo.itens) ? grupo.itens.filter(Boolean) : [];

            return (
              <div
                key={grupo.id || idxGrupo}
                onDragOver={(e) => handleDragOverCategory(e, idxGrupo)}
                onDrop={(e) => handleDropOnCategory(e, idxGrupo)}
                className={cn(
                  "rounded-xl border border-border bg-card p-4 space-y-4 transition-all",
                  dragOverCategory === idxGrupo && "ring-2 ring-primary border-primary bg-primary/5"
                )}
              >
                {/* Título da Categoria & Ações de Categoria */}
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Edit3 size={14} className="text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={grupo.titulo || ""}
                      onChange={(e) => atualizarTituloGrupo(idxGrupo, e.target.value)}
                      placeholder="Nome da categoria..."
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-hidden px-1 py-0.5 w-full max-w-xs transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground/70 hidden sm:inline">
                      {itensDoGrupo.filter((i) => !i.oculto).length} visíveis
                    </span>

                    {/* Reordenar Categoria Cima/Baixo */}
                    <button
                      type="button"
                      onClick={() => moverGrupo(idxGrupo, "cima")}
                      disabled={idxGrupo === 0}
                      className="p-1 rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                      title="Mover categoria para cima"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moverGrupo(idxGrupo, "baixo")}
                      disabled={idxGrupo === grupos.length - 1}
                      className="p-1 rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                      title="Mover categoria para baixo"
                    >
                      <ChevronDown size={16} />
                    </button>

                    {/* Excluir Categoria */}
                    <button
                      type="button"
                      onClick={() => removerCategoria(idxGrupo)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Excluir categoria"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Área para onde arrastar se a categoria estiver vazia */}
                {itensDoGrupo.length === 0 && (
                  <div className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center text-xs text-muted-foreground">
                    Arraste funcionalidades para esta categoria ou use o seletor de destino abaixo.
                  </div>
                )}

                {/* Lista de Itens do Grupo */}
                <div className="space-y-3">
                  {itensDoGrupo.map((item, idxItem) => {
                    const IconeComp = obterIconePorNome(item.iconeNome || "HelpCircle");
                    const dragginThis =
                      dragItem?.idxGrupo === idxGrupo && dragItem?.idxItem === idxItem;

                    return (
                      <div
                        key={item.id || idxItem}
                        draggable
                        onDragStart={() => handleDragStart(idxGrupo, idxItem)}
                        onDrop={(e) => handleDropOnItem(e, idxGrupo, idxItem)}
                        onDragOver={(e) => e.preventDefault()}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing",
                          item.oculto
                            ? "bg-muted/20 border-border/40 opacity-60"
                            : "bg-card border-border hover:border-primary/40 shadow-xs",
                          dragginThis && "opacity-40 border-dashed border-primary"
                        )}
                      >
                        {/* Lado Esquerdo: Grip + Ícone + Input de Nome */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <GripVertical size={16} className="text-muted-foreground/60 shrink-0" />

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
                              value={item.rotulo || ""}
                              onChange={(e) =>
                                atualizarItem(idxGrupo, idxItem, { rotulo: e.target.value })
                              }
                              placeholder="Nome do item..."
                              className="w-full text-sm font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-hidden px-1 py-0.5 transition-colors"
                            />
                            <span className="text-[10px] font-mono text-muted-foreground px-1 block truncate">
                              Rota: {item.para} • Ícone: {item.iconeNome || "HelpCircle"}
                            </span>
                          </div>
                        </div>

                        {/* Lado Direito: Seletor de Categoria Destino, Cores & Ações */}
                        <div className="flex items-center gap-2 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                          {/* Seletor "Mover para Categoria" */}
                          <div className="flex items-center gap-1 bg-accent/30 p-1 rounded-lg border border-border/60">
                            <MoveHorizontal size={12} className="text-muted-foreground ml-1" />
                            <select
                              value={idxGrupo}
                              onChange={(e) =>
                                moverItemParaGrupo(idxGrupo, idxItem, Number(e.target.value))
                              }
                              className="text-xs bg-transparent border-0 text-foreground font-medium focus:outline-hidden cursor-pointer max-w-[110px] sm:max-w-[130px] truncate"
                              title="Mover para outra categoria"
                            >
                              {grupos.map((gDest, gIdx) => (
                                <option key={gDest.id || gIdx} value={gIdx}>
                                  {gDest.titulo}
                                </option>
                              ))}
                            </select>
                          </div>

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
                              <Check size={11} />
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

                          {/* Reordenar Cima / Baixo no mesmo grupo */}
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => moverItemMesmoGrupo(idxGrupo, idxItem, "cima")}
                              disabled={idxItem === 0}
                              className="p-1 rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                              title="Mover para cima"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moverItemMesmoGrupo(idxGrupo, idxItem, "baixo")}
                              disabled={idxItem === itensDoGrupo.length - 1}
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
            );
          })}

          {/* Botão inferior para adicionar nova categoria */}
          <button
            type="button"
            onClick={adicionarCategoria}
            className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border-2 border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary font-semibold text-xs transition-colors"
          >
            <Plus size={16} />
            <span>Adicionar Nova Categoria</span>
          </button>
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
      {itemEmEdicaoValido && itemEmEdicaoIcone && (
        <GaleriaIconesModal
          aberta={Boolean(itemEmEdicaoIcone)}
          aoFechar={() => setItemEmEdicaoIcone(null)}
          iconeAtual={
            grupos[itemEmEdicaoIcone.idxGrupo]?.itens?.[itemEmEdicaoIcone.idxItem]?.iconeNome || "HelpCircle"
          }
          corAtual={grupos[itemEmEdicaoIcone.idxGrupo]?.itens?.[itemEmEdicaoIcone.idxItem]?.cor}
          aoSelecionarIcone={(novoIcone) => {
            if (itemEmEdicaoIcone) {
              atualizarItem(itemEmEdicaoIcone.idxGrupo, itemEmEdicaoIcone.idxItem, {
                iconeNome: novoIcone,
              });
            }
          }}
        />
      )}

      <ModalConfirmacao
        aberto={categoriaParaRemoverIdx !== null && Boolean(grupos[categoriaParaRemoverIdx])}
        titulo={`Remover categoria "${categoriaParaRemoverIdx !== null && grupos[categoriaParaRemoverIdx] ? grupos[categoriaParaRemoverIdx].titulo : ""}"?`}
        descricao={
          categoriaParaRemoverIdx !== null && grupos[categoriaParaRemoverIdx] && (grupos[categoriaParaRemoverIdx].itens?.length || 0) > 0
            ? `Esta categoria possui ${grupos[categoriaParaRemoverIdx].itens.length} itens. Todos os itens serão movidos para a primeira categoria.`
            : "A categoria será removida do menu."
        }
        textoConfirmar="Remover Categoria"
        varianteConfirmar="perigo"
        aoConfirmar={() => categoriaParaRemoverIdx !== null && executarRemocaoCategoria(categoriaParaRemoverIdx)}
        aoCancelar={() => setCategoriaParaRemoverIdx(null)}
      />

      <ModalConfirmacao
        aberto={confirmarReset}
        titulo="Restaurar Menu Padrão?"
        descricao="Deseja restaurar as categorias, nomes, cores e ícones padrões do menu original?"
        textoConfirmar="Restaurar Padrão"
        varianteConfirmar="perigo"
        aoConfirmar={executarReset}
        aoCancelar={() => setConfirmarReset(false)}
      />
    </div>
  );
}
