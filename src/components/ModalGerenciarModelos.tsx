import { useState } from "react";
import { Star, Plus, Trash2, FileText, Pencil } from "lucide-react";
import { Modal, Botao } from "@/components/ui";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import {
  obterTodosModelos,
  obterModeloPadraoId,
  definirModeloPadraoId,
  salvarModelosPersonalizados,
  ehModeloCustom,
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
  const [editando, setEditando] = useState<TemplateItem | null>(null);
  const [criando, setCriando] = useState(false);

  // Estado do modelo em edição (estilo nota)
  const [formTitulo, setFormTitulo] = useState("");
  const [formCorpo, setFormCorpo] = useState("");
  const [formDados, setFormDados] = useState<Record<string, any>>({});
  const [modoVisao, setModoVisao] = useState<ModoVisaoNotion>("popup");

  function alternarPadrao(id: string) {
    const novoId = padraoId === id ? null : id;
    setPadraoId(novoId);
    definirModeloPadraoId(novoId);
    aoAtualizar();
  }

  function abrirCriacao() {
    setEditando(null);
    setFormTitulo("");
    setFormCorpo("");
    setFormDados({ tipo: "nota", tags: [] });
    setCriando(true);
  }

  function abrirEdicao(m: TemplateItem) {
    setEditando(m);
    setFormTitulo(m.titulo);
    setFormCorpo(m.corpoPadrao);
    setFormDados({ ...m.frontmatter });
    setCriando(true);
  }

  function cancelarForm() {
    setCriando(false);
    setEditando(null);
  }

  function salvarForm() {
    if (!formTitulo.trim()) return;
    const tags = Array.isArray(formDados.tags) ? formDados.tags : [];

    const dados = {
      titulo: formTitulo.trim(),
      categoria: (formDados.categoria as any) || "design",
      descricao: "Modelo personalizado",
      frontmatter: {
        ...formDados,
        tipo: "nota",
        tags,
      },
      corpoPadrao: formCorpo,
    };

    const apenasCustom = modelos.filter((m) => ehModeloCustom(m.id));

    if (editando) {
      const atualizados = apenasCustom.map((m) =>
        m.id === editando.id ? { ...m, ...dados, id: editando.id } : m,
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

        {/* Botão Criar Modelo */}
        {!criando && (
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

      {/* Editor de Modelo — idêntico à nota (PainelNotionBase) */}
      {criando && (
        <PainelNotionBase
          rotuloTipo={editando ? "Editar Modelo" : "Novo Modelo"}
          modoVisao={modoVisao}
          setModoVisao={setModoVisao}
          titulo={formTitulo}
          setTitulo={setFormTitulo}
          corpo={formCorpo}
          setCorpo={setFormCorpo}
          dadosProps={formDados}
          onChangeProps={setFormDados}
          camposFixosProps={{
            tipo: { icone: <FileText className="h-4 w-4 opacity-50 text-orange-500" />, tipo: "select", opcoes: ["nota", "referencia", "rascunho"] },
            tags: { icone: <FileText className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
          }}
          salvando={false}
          temMudancas={false}
          aoFechar={cancelarForm}
          aoSalvar={async () => {
            salvarForm();
          }}
          aoRemover={undefined}
        />
      )}
    </Modal>
  );
}