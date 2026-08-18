import { useState } from "react";
import { Star, Plus, Trash2, Check, FileText, Pencil, X } from "lucide-react";
import { Modal, Botao, EntradaTexto } from "@/components/ui";
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
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Gerenciar Modelos de Nota">
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

        {/* Formulário de Criação/Edição de Modelo */}
        {criando ? (
          <div className="p-3.5 rounded-xl border border-primary/40 bg-card space-y-3 animate-in fade-in-50">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText size={14} className="text-primary" />
              {editandoId ? "Editar Modelo Personalizado" : "Criar Novo Modelo Personalizado"}
            </h4>

            <EntradaTexto
              rotulo="Título do Modelo"
              placeholder="Ex: Briefing de Redes Sociais"
              valor={formTitulo}
              aoMudar={setFormTitulo}
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Categoria
                </label>
                <select
                  value={formCategoria}
                  onChange={(e) => setFormCategoria(e.target.value as TemplateCategoria)}
                  className="w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.id} value={c.id}>{c.rotulo}</option>
                  ))}
                </select>
              </div>

              <EntradaTexto
                rotulo="Tags (separadas por vírgula)"
                placeholder="design, briefing, cliente"
                valor={formTagsStr}
                aoMudar={setFormTagsStr}
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Corpo Padrão em Markdown
              </label>
              <textarea
                value={formCorpo}
                onChange={(e) => setFormCorpo(e.target.value)}
                placeholder="## Tópicos do modelo..."
                rows={4}
                className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-foreground font-mono focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Botao variante="neutro" tamanho="pequeno" onClick={cancelarForm}>
                <X size={14} /> Cancelar
              </Botao>
              <Botao variante="primario" tamanho="pequeno" onClick={salvarForm} className="gap-1">
                <Check size={14} /> {editandoId ? "Salvar Alterações" : "Salvar Modelo"}
              </Botao>
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