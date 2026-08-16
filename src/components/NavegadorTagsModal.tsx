import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Hash, FileText, CheckSquare, Image as ImageIcon, X } from "lucide-react";
import { Modal, Campo, Selo } from "@/components/ui";
import type { ItemRepo } from "@/lib/repo";
import { lerMarkdown, tituloProvavel } from "@/lib/markdown";

export function NavegadorTagsModal({
  aberto,
  aoFechar,
  acervo,
}: {
  aberto: boolean;
  aoFechar: () => void;
  acervo: ItemRepo[];
}) {
  const navegar = useNavigate();
  const [filtroTag, setFiltroTag] = useState("");
  const [tagSelecionada, setTagSelecionada] = useState<string | null>(null);

  // Mapeia todas as tags com contagem no acervo
  const tagsComContagem = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const item of acervo) {
      if (!item.texto) continue;
      const doc = lerMarkdown(item.texto);
      const tags = Array.isArray(doc.dados.tags) ? (doc.dados.tags as string[]) : [];
      for (const t of tags) {
        const limpa = String(t).trim().toLowerCase().replace(/^#/, "");
        if (!limpa) continue;
        mapa.set(limpa, (mapa.get(limpa) || 0) + 1);
      }
    }

    return Array.from(mapa.entries())
      .map(([tag, total]) => ({ tag, total }))
      .sort((a, b) => b.total - a.total);
  }, [acervo]);

  const tagsFiltradas = useMemo(() => {
    if (!filtroTag.trim()) return tagsComContagem;
    const termo = filtroTag.toLowerCase().replace(/^#/, "");
    return tagsComContagem.filter((t) => t.tag.includes(termo));
  }, [tagsComContagem, filtroTag]);

  // Itens associados à tag selecionada
  const itensDaTag = useMemo(() => {
    if (!tagSelecionada) return [];
    const resultados: Array<{ caminho: string; titulo: string; pasta: string }> = [];

    for (const item of acervo) {
      if (!item.texto) continue;
      const doc = lerMarkdown(item.texto);
      const tags = Array.isArray(doc.dados.tags)
        ? (doc.dados.tags as string[]).map((t) => String(t).trim().toLowerCase().replace(/^#/, ""))
        : [];

      if (tags.includes(tagSelecionada)) {
        const pasta = item.caminho.split("/")[0];
        const titulo = tituloProvavel(doc, item.nome);
        resultados.push({ caminho: item.caminho, titulo, pasta });
      }
    }

    return resultados;
  }, [acervo, tagSelecionada]);

  const abrirItem = (caminho: string, pasta: string) => {
    aoFechar();
    let rota = `/notas?abrir=${encodeURIComponent(caminho)}`;
    if (pasta === "tarefas") rota = `/tarefas?abrir=${encodeURIComponent(caminho)}`;
    if (pasta === "referencias") rota = `/referencias?abrir=${encodeURIComponent(caminho)}`;
    if (pasta === "lousas") rota = `/lousas?abrir=${encodeURIComponent(caminho)}`;
    if (pasta === "pdi") rota = `/pdi?abrir=${encodeURIComponent(caminho)}`;
    navegar(rota);
  };

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="🏷️ Navegador de Tags Universais">
      <div className="space-y-5">
        <div className="relative">
          <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Campo
            value={filtroTag}
            onChange={(e) => setFiltroTag(e.target.value)}
            placeholder="Filtrar por tag (ex: tipografia, cliente, briefing)..."
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Nuvem de Tags */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Nuvem de Tags ({tagsFiltradas.length})
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 border border-border/60 rounded-xl bg-card">
            {tagsFiltradas.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">Nenhuma tag encontrada com esse filtro.</p>
            ) : (
              tagsFiltradas.map(({ tag, total }) => {
                const ativa = tagSelecionada === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setTagSelecionada(ativa ? null : tag)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      ativa
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                  >
                    <span>#{tag}</span>
                    <span className="text-[10px] opacity-70">({total})</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Itens da Tag Selecionada */}
        {tagSelecionada && (
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Tag size={14} className="text-primary" />
                <span>Documentos com #{tagSelecionada} ({itensDaTag.length})</span>
              </p>
              <button
                onClick={() => setTagSelecionada(null)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X size={13} /> Limpar seleção
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {itensDaTag.map((item) => (
                <div
                  key={item.caminho}
                  onClick={() => abrirItem(item.caminho, item.pasta)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-card hover:bg-accent/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    {item.pasta === "tarefas" ? (
                      <CheckSquare size={15} className="text-blue-500 shrink-0" />
                    ) : item.pasta === "referencias" ? (
                      <ImageIcon size={15} className="text-purple-500 shrink-0" />
                    ) : (
                      <FileText size={15} className="text-amber-500 shrink-0" />
                    )}
                    <span className="text-xs font-medium truncate text-foreground">{item.titulo}</span>
                  </div>
                  <Selo>{item.pasta}</Selo>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
