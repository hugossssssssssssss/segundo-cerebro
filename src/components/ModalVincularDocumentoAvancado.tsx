import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  X,
  FileText,
  CheckSquare,
  Target,
  Users,
  Image as ImageIcon,
  Layout,
  Folder,
  Tag,
  ArrowRight,
} from "lucide-react";
import { Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  type DocumentoVinculavel,
  type CategoriaDocumento,
  filtrarDocumentosVinculaveis,
  montarEstruturaPastas,
} from "@/lib/vincularDocumentos";

interface ModalVincularDocumentoAvancadoProps {
  aberto: boolean;
  aoFechar: () => void;
  documentos: DocumentoVinculavel[];
  aoSelecionar: (doc: DocumentoVinculavel) => void;
  categoriaInicial?: CategoriaDocumento | "todas";
}

export function ModalVincularDocumentoAvancado({
  aberto,
  aoFechar,
  documentos,
  aoSelecionar,
  categoriaInicial = "todas",
}: ModalVincularDocumentoAvancadoProps) {
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaDocumento | "todas">(categoriaInicial);
  const [subpastaAtiva, setSubpastaAtiva] = useState<string>("todos");
  const [tagAtiva, setTagAtiva] = useState<string>("");
  const [indiceSelecionado, setIndiceSelecionado] = useState(0);

  const inputBuscaRef = useRef<HTMLInputElement>(null);

  // Reseta estados quando o modal abre
  useEffect(() => {
    if (aberto) {
      setBusca("");
      setCategoriaAtiva(categoriaInicial);
      setSubpastaAtiva("todos");
      setTagAtiva("");
      setIndiceSelecionado(0);
      setTimeout(() => {
        inputBuscaRef.current?.focus();
      }, 50);
    }
  }, [aberto, categoriaInicial]);

  // Estrutura de pastas e contagens
  const pastas = useMemo(() => montarEstruturaPastas(documentos), [documentos]);

  // Subpastas disponíveis para a categoria ativa
  const subpastasDisponiveis = useMemo(() => {
    if (categoriaAtiva === "todas") return [];
    const pastaCat = pastas.find((p) => p.id === categoriaAtiva);
    return pastaCat?.subpastas || [];
  }, [pastas, categoriaAtiva]);

  // Todas as tags únicas
  const todasTags = useMemo(() => {
    const conjunto = new Set<string>();
    for (const doc of documentos) {
      if (categoriaAtiva !== "todas" && doc.categoria !== categoriaAtiva) continue;
      doc.tags.forEach((t) => conjunto.add(t));
    }
    return Array.from(conjunto);
  }, [documentos, categoriaAtiva]);

  // Filtragem dos documentos
  const documentosFiltrados = useMemo(() => {
    let resultado = filtrarDocumentosVinculaveis(documentos, {
      categoria: categoriaAtiva,
      subpastaOuStatus: subpastaAtiva,
      termo: busca,
      limite: 100,
    });

    if (tagAtiva) {
      resultado = resultado.filter((d) => d.tags.includes(tagAtiva));
    }

    return resultado;
  }, [documentos, categoriaAtiva, subpastaAtiva, busca, tagAtiva]);

  // Ajusta índice selecionado
  useEffect(() => {
    setIndiceSelecionado(0);
  }, [documentosFiltrados.length, categoriaAtiva, subpastaAtiva]);

  // Atalhos de teclado no modal
  const lidarKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceSelecionado((prev) =>
        prev < documentosFiltrados.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceSelecionado((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (documentosFiltrados[indiceSelecionado]) {
        aoSelecionar(documentosFiltrados[indiceSelecionado]);
        aoFechar();
      }
    } else if (e.key === "Escape") {
      aoFechar();
    }
  };

  if (!aberto) return null;

  const obterIconeCategoria = (cat: CategoriaDocumento) => {
    switch (cat) {
      case "notas":
        return <FileText size={15} className="text-amber-500" />;
      case "tarefas":
        return <CheckSquare size={15} className="text-blue-500" />;
      case "pdi":
        return <Target size={15} className="text-purple-500" />;
      case "contatos":
        return <Users size={15} className="text-emerald-500" />;
      case "referencias":
        return <ImageIcon size={15} className="text-pink-500" />;
      case "lousas":
        return <Layout size={15} className="text-indigo-500" />;
      default:
        return <FileText size={15} className="text-muted-foreground" />;
    }
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Filtrar Documentos"
      tamanho="largo"
    >
      <div className="space-y-4" onKeyDown={lidarKeyDown}>
        {/* Campo de Busca Principal */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            ref={inputBuscaRef}
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por título, pasta, status ou tags..."
            className="w-full pl-10 pr-10 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/60"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categorias Principais (Pastas Macro) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setCategoriaAtiva("todas");
              setSubpastaAtiva("todos");
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 border",
              categoriaAtiva === "todas"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/60 hover:bg-muted text-muted-foreground border-border/60 hover:text-foreground"
            )}
          >
            <span>Todas</span>
            <span className="text-[10px] opacity-70">({documentos.length})</span>
          </button>

          {pastas.map((pasta) => (
            <button
              key={pasta.id}
              type="button"
              onClick={() => {
                setCategoriaAtiva(pasta.categoria);
                setSubpastaAtiva("todos");
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 border",
                categoriaAtiva === pasta.categoria
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/60 hover:bg-muted text-muted-foreground border-border/60 hover:text-foreground"
              )}
            >
              {obterIconeCategoria(pasta.categoria)}
              <span>{pasta.titulo}</span>
              <span className="text-[10px] opacity-70">({pasta.total})</span>
            </button>
          ))}
        </div>

        {/* Subpastas / Status específicos da Categoria */}
        {subpastasDisponiveis.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 border-t border-border/40">
            <span className="text-[11px] text-muted-foreground font-medium shrink-0 mr-1 flex items-center gap-1">
              <Folder size={12} /> Filtro:
            </span>

            <button
              type="button"
              onClick={() => setSubpastaAtiva("todos")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer border",
                subpastaAtiva === "todos"
                  ? "bg-secondary text-foreground border-border font-semibold shadow-2xs"
                  : "bg-transparent hover:bg-muted/40 text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              Todas as subpastas
            </button>

            {subpastasDisponiveis.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubpastaAtiva(sub.valorFiltro)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer border",
                  subpastaAtiva === sub.valorFiltro
                    ? "bg-secondary text-foreground border-border font-semibold shadow-2xs"
                    : "bg-transparent hover:bg-muted/40 text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {sub.titulo} ({sub.total})
              </button>
            ))}
          </div>
        )}

        {/* Tags Filtro (se houver) */}
        {todasTags.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
            <span className="text-muted-foreground/70 flex items-center gap-0.5 shrink-0 mr-1">
              <Tag size={10} /> Tags:
            </span>
            {todasTags.slice(0, 8).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTagAtiva(tagAtiva === t ? "" : t)}
                className={cn(
                  "px-2 py-0.5 rounded-full font-medium transition-colors border",
                  tagAtiva === t
                    ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                    : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground"
                )}
              >
                #{t}
              </button>
            ))}
            {tagAtiva && (
              <button
                type="button"
                onClick={() => setTagAtiva("")}
                className="text-muted-foreground hover:text-foreground underline ml-1"
              >
                Limpar tag
              </button>
            )}
          </div>
        )}

        {/* Lista de Resultados */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card divide-y divide-border/40 max-h-[340px] overflow-y-auto">
          {documentosFiltrados.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-xs">
              <p>Nenhum documento encontrado com os filtros selecionados.</p>
            </div>
          ) : (
            documentosFiltrados.map((doc, idx) => {
              const ehSelecionado = idx === indiceSelecionado;
              return (
                <div
                  key={doc.caminho}
                  onClick={() => {
                    aoSelecionar(doc);
                    aoFechar();
                  }}
                  onMouseEnter={() => setIndiceSelecionado(idx)}
                  className={cn(
                    "px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors text-left",
                    ehSelecionado
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-accent/40 text-foreground/90"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-1.5 rounded-lg bg-muted/60 shrink-0">
                      {obterIconeCategoria(doc.categoria)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate text-foreground">
                          @{doc.titulo}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0">
                          {doc.subpastaOuStatusRotulo || doc.categoriaRotulo}
                        </span>
                      </div>

                      {doc.snippet && (
                        <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                          {doc.snippet}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc.tags.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1">
                        {doc.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    <span
                      className={cn(
                        "text-[10px] flex items-center gap-1 font-medium transition-opacity",
                        ehSelecionado ? "opacity-100 text-primary font-semibold" : "opacity-0"
                      )}
                    >
                      Vincular <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé informativo */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 px-1">
          <span>
            {documentosFiltrados.length}{" "}
            {documentosFiltrados.length === 1 ? "documento disponível" : "documentos disponíveis"}
          </span>
          <span>
            Use as setas <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">↓</kbd> e <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">Enter</kbd> para selecionar
          </span>
        </div>
      </div>
    </Modal>
  );
}
