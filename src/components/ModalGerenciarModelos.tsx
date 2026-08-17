import { useState } from "react";
import { Star, Plus, Trash2, Check, FileText } from "lucide-react";
import { Modal, Botao, EntradaTexto } from "@/components/ui";
import {
  obterTodosModelos,
  obterModeloPadraoId,
  definirModeloPadraoId,
  salvarModelosPersonalizados,
  type TemplateItem,
} from "@/lib/templates";

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

  // Formulário de novo modelo
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<"design" | "reuniao" | "tarefa" | "pdi">("design");
  const [novasTagsStr, setNovasTagsStr] = useState("");
  const [novoCorpo, setNovoCorpo] = useState("");

  function alternarPadrao(id: string) {
    const novoId = padraoId === id ? null : id;
    setPadraoId(novoId);
    definirModeloPadraoId(novoId);
    aoAtualizar();
  }

  function salvarNovoModelo() {
    if (!novoTitulo.trim()) return;
    const novoItem: TemplateItem = {
      id: `custom_${Date.now()}`,
      titulo: novoTitulo.trim(),
      categoria: novaCategoria,
      descricao: "Modelo personalizado",
      frontmatter: {
        tipo: "nota",
        tags: novasTagsStr
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean),
      },
      corpoPadrao: novoCorpo,
    };

    const apenasCustom = modelos.filter((m) => m.id.startsWith("custom_"));
    const novosCustom = [...apenasCustom, novoItem];
    salvarModelosPersonalizados(novosCustom);

    const todos = obterTodosModelos();
    setModelos(todos);
    setCriando(false);
    setNovoTitulo("");
    setNovasTagsStr("");
    setNovoCorpo("");
    aoAtualizar();
  }

  function excluirModelo(id: string) {
    const apenasCustom = modelos.filter((m) => m.id.startsWith("custom_") && m.id !== id);
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
            const ehCustom = m.id.startsWith("custom_");
            return (
              <div
                key={m.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                  ehPadrao
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
                    <Botao
                      variante="fantasma"
                      tamanho="icone"
                      onClick={() => excluirModelo(m.id)}
                      title="Excluir este modelo"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={14} />
                    </Botao>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Formulário de Criação de Modelo */}
        {criando ? (
          <div className="p-3.5 rounded-xl border border-primary/40 bg-card space-y-3 animate-in fade-in-50">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText size={14} className="text-primary" /> Criar Novo Modelo Personalizado
            </h4>

            <EntradaTexto
              rotulo="Título do Modelo"
              placeholder="Ex: Briefing de Redes Sociais"
              valor={novoTitulo}
              aoMudar={setNovoTitulo}
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Categoria
                </label>
                <select
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                >
                  <option value="design">Design</option>
                  <option value="reuniao">Reunião</option>
                  <option value="tarefa">Tarefa</option>
                  <option value="pdi">Carreira / PDI</option>
                </select>
              </div>

              <EntradaTexto
                rotulo="Tags (separadas por vírgula)"
                placeholder="design, briefing, cliente"
                valor={novasTagsStr}
                aoMudar={setNovasTagsStr}
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Corpo Padrão em Markdown
              </label>
              <textarea
                value={novoCorpo}
                onChange={(e) => setNovoCorpo(e.target.value)}
                placeholder="## Tópicos do modelo..."
                rows={4}
                className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-foreground font-mono focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Botao variante="neutro" tamanho="pequeno" onClick={() => setCriando(false)}>
                Cancelar
              </Botao>
              <Botao variante="primario" tamanho="pequeno" onClick={salvarNovoModelo} className="gap-1">
                <Check size={14} /> Salvar Modelo
              </Botao>
            </div>
          </div>
        ) : (
          <Botao
            variante="neutro"
            tamanho="pequeno"
            onClick={() => setCriando(true)}
            className="w-full border-dashed gap-1.5 py-2.5"
          >
            <Plus size={14} /> Criar Modelo Customizado
          </Botao>
        )}
      </div>
    </Modal>
  );
}
