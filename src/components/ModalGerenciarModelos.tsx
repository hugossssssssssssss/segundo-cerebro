import { useState } from "react";
import { Star, Plus, Trash2, Check, FileText, Pencil, X, Tag, Type } from "lucide-react";
import { Modal, Botao, EntradaTexto, AreaTexto } from "@/components/ui";
import {
  obterTodosModelos,
  obterModeloPadraoId,
  definirModeloPadraoId,
  salvarModelosPersonalizados,
  ehModeloCustom,
  type TemplateItem,
  type TemplateCategoria,
} from "@/lib/templates";

const CATEGORIAS: { id: TemplateCategoria; rotulo: string }[] = [
  { id: "design", rotulo: "Design" },
  { id: "reuniao", rotulo: "Reunião" },
  { id: "tarefa", rotulo: "Tarefa" },
  { id: "pdi", rotulo: "Carreira / PDI" },
];

export function ModalGerenciarModelos({
  aberto,
  aoFechar,
  aoAtualizar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoAtualizar: () => void;
}) {
  const [modelos, setModelos] = useState<TemplateItem[]>(obterTodosModelos());
  const [padraoId, setPadraoId] = useState<string | null>(obterModeloPadraoId());
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Formulário de novo/edição de modelo
  const [formTitulo, setFormTitulo] = useState("");
  const [formCategoria, setFormCategoria] = useState<TemplateCategoria>("design");
  const [formTagsStr, setFormTagsStr] = useState("");
  const [formCorpo, setFormCorpo] = useState("");

  function alternarPadrao(id: string) {
    const novoId = padraoId === id ? null : id;
    setPadraoId(novoId);
    definirModeloPadraoId(novoId);
    aoAtualizar();
  }

  function abrirCriacao() {
    setEditandoId(null);
    setFormTitulo("");
    setFormCategoria("design");
    setFormTagsStr("");
    setFormCorpo("");
    setCriando(true);
  }

  function abrirEdicao(m: TemplateItem) {
    setCriando(true);
    setEditandoId(m.id);
    setFormTitulo(m.titulo);
    setFormCategoria(m.categoria);
    setFormTagsStr((m.frontmatter.tags as string[] | undefined)?.join(", ") || "");
    setFormCorpo(m.corpoPadrao);
  }

  function cancelarForm() {
    setCriando(false);
    setEditandoId(null);
  }

  function salvarForm() {
    if (!formTitulo.trim()) return;
    const tags = formTagsStr
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const dados = {
      titulo: formTitulo.trim(),
      categoria: formCategoria,
      descricao: "Modelo personalizado",
      frontmatter: {
        tipo: "nota",
        tags,
      },
      corpoPadrao: formCorpo,
    };

    const apenasCustom = modelos.filter((m) => ehModeloCustom(m.id));

    if (editandoId) {
      const atualizados = apenasCustom.map((m) =>
        m.id === editandoId ? { ...m, ...dados, id: editandoId } : m,
      );
      salvarModelosPersonalizados(atualizados);
    } else {
      const novoItem: TemplateItem = {
        ...dados,
        id: `custom_${Date.now()}`,
      };
      salvarModelosPersonalizados([...apenasCustom, novoItem]);
    }

    setModelos(obterTodosModelos());
    cancelarForm();
    aoAtualizar();
  }

  function excluirModelo(id: string) {
    const apenasCustom = modelos.filter((m) => ehModeloCustom(m.id) && m.id !== id);
    salvarModelosPersonalizados(apenasCustom);
    if (padraoId === id) {
      definirModeloPadraoId(null);
      setPadraoId(null);
    }
    setModelos(obterTodosModelos());
    aoAtualizar();
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Gerenciar Modelos de Nota" tamanho="largo">
      <div className="space-y-4 p-4 max-h-[75dvh] overflow-y-auto">
        <p className="text-xs text-muted-foreground">
          Configure seus modelos de anotações (estilo Notion) e escolha um <strong>Modelo Padrão ⭐</strong> para ser aplicado automaticamente ao clicar em "Nova Nota".
        </p>

        {/* Lista de Modelos */}
        <div className="space-y-2">
          {modelos.map((m) => {
            const ehPadrao = padraoId === m.id;
            const ehCustom = ehModeloCustom(m.id);
            return (
              <div
                key={m.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${ehPadrao
                  ? "border-amber-500/50 bg-amber-500/5 shadow-xs"
                  : "border-border/80 bg-card hover:bg-accent/40"
                  }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {m.titulo}
                    </span>
                    {ehPadrao && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1">
                        <Star size={10} className="fill-amber-500" /> Padrão
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {m.descricao || "Modelo de anotação"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Botao
                    variante={ehPadrao ? "primario" : "neutro"}
                    tamanho="pequeno"
                    onClick={() => alternarPadrao(m.id)}
                    title={ehPadrao ? "Desmarcar modelo padrão" : "Definir como modelo padrão"}
                    className="gap-1 text-[11px]"
                  >
                    <Star size={12} className={ehPadrao ? "fill-current" : ""} />
                    {ehPadrao ? "Padrão" : "Tornar Padrão"}
                  </Botao>

                  {ehCustom && (
                    <>
                      <Botao
                        variante="fantasma"
                        tamanho="icone"
                        onClick={() => abrirEdicao(m)}
                        title="Editar este modelo"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil size={14} />
                      </Botao>
                      <Botao
                        variante="fantasma"
                        tamanho="icone"
                        onClick={() => excluirModelo(m.id)}
                        title="Excluir este modelo"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={14} />
                      </Botao>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Formulário de Criação/Edição de Modelo — estilo nota */}
        {criando ? (
          <div className="rounded-xl border border-primary/40 bg-card overflow-hidden animate-in fade-in-50">
            {/* Cabeçalho do formulário */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                {editandoId ? "Editar Modelo Personalizado" : "Criar Novo Modelo Personalizado"}
              </h4>
              <Botao
                variante="fantasma"
                tamanho="icone"
                onClick={cancelarForm}
                className="h-8 w-8"
                title="Cancelar"
              >
                <X size={16} />
              </Botao>
            </div>

            <div className="p-4 space-y-4">
              {/* Título */}
              <div>
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                  <Type size={13} className="text-muted-foreground" /> Título do Modelo
                </label>
                <EntradaTexto
                  placeholder="Ex: Briefing de Redes Sociais"
                  valor={formTitulo}
                  aoMudar={setFormTitulo}
                  className="text-sm"
                />
              </div>

              {/* Categoria + Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                    <FileText size={13} className="text-muted-foreground" /> Categoria
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value as TemplateCategoria)}
                    className="w-full h-11 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.id} value={c.id}>{c.rotulo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                    <Tag size={13} className="text-muted-foreground" /> Tags (separadas por vírgula)
                  </label>
                  <EntradaTexto
                    placeholder="design, briefing, cliente"
                    valor={formTagsStr}
                    aoMudar={setFormTagsStr}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Corpo em Markdown */}
              <div>
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                  <FileText size={13} className="text-muted-foreground" /> Corpo Padrão em Markdown
                </label>
                <AreaTexto
                  value={formCorpo}
                  onChange={(e) => setFormCorpo(e.target.value)}
                  placeholder={`## Tópicos do modelo...\n\n- [ ] Tarefa 1\n- [ ] Tarefa 2`}
                  rows={8}
                  className="font-mono text-xs leading-relaxed"
                />
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Botao variante="neutro" tamanho="pequeno" onClick={cancelarForm}>
                  <X size={14} /> Cancelar
                </Botao>
                <Botao variante="primario" tamanho="pequeno" onClick={salvarForm} className="gap-1">
                  <Check size={14} /> {editandoId ? "Salvar Alterações" : "Salvar Modelo"}
                </Botao>
              </div>
            </div>
          </div>
        ) : (
          <Botao
            variante="neutro"
            tamanho="pequeno"
            onClick={abrirCriacao}
            className="w-full border-dashed gap-1.5 py-2.5"
          >
            <Plus size={14} /> Criar Modelo Customizado
          </Botao>
        )}
      </div>
    </Modal>
  );
}