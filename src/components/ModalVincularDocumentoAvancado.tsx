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
  ArrowRight,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type DocumentoVinculavel,
  type CategoriaDocumento,
  DEFINICOES_FILTRO_DOCUMENTOS,
  filtrarDocumentosVinculaveis,
  montarEstruturaPastas,
} from "@/lib/vincularDocumentos";
import {
  BarraFiltrosAvancados,
  type RegraFiltro,
} from "@/components/BarraFiltrosAvancados";
import { renderizarMarkdownInline } from "@/lib/markdownInline";

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
  const [regrasFiltro, setRegrasFiltro] = useState<RegraFiltro[]>([]);
  const [indiceSelecionado, setIndiceSelecionado] = useState(0);

  const inputBuscaRef = useRef<HTMLInputElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  // Reseta estados quando abre
  useEffect(() => {
    if (aberto) {
      setBusca("");
      setCategoriaAtiva(categoriaInicial);
      setSubpastaAtiva("todos");
      setRegrasFiltro([]);
      setIndiceSelecionado(0);
      setTimeout(() => {
        inputBuscaRef.current?.focus();
      }, 30);
    }
  }, [aberto, categoriaInicial]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const lidarCliqueFora = (e: MouseEvent) => {
      if (painelRef.current && !painelRef.current.contains(e.target as Node)) {
        // Se não clicou dentro de um popover aberto (como o de filtros)
        const ehPopover = (e.target as HTMLElement).closest("[data-radix-popper-content-wrapper]");
        if (!ehPopover) {
          aoFechar();
        }
      }
    };
    document.addEventListener("mousedown", lidarCliqueFora);
    return () => document.removeEventListener("mousedown", lidarCliqueFora);
  }, [aberto, aoFechar]);

  // Estrutura de pastas e contagens
  const pastas = useMemo(() => montarEstruturaPastas(documentos), [documentos]);

  // Subpastas disponíveis para a categoria ativa
  const subpastasDisponiveis = useMemo(() => {
    if (categoriaAtiva === "todas") return [];
    const pastaCat = pastas.find((p) => p.id === categoriaAtiva);
    return pastaCat?.subpastas || [];
  }, [pastas, categoriaAtiva]);

  // Filtragem dos documentos
  const documentosFiltrados = useMemo(() => {
    return filtrarDocumentosVinculaveis(documentos, {
      categoria: categoriaAtiva,
      subpastaOuStatus: subpastaAtiva,
      termo: busca,
      regras: regrasFiltro,
      limite: 100,
    });
  }, [documentos, categoriaAtiva, subpastaAtiva, busca, regrasFiltro]);

  // Ajusta índice selecionado
  useEffect(() => {
    setIndiceSelecionado(0);
  }, [documentosFiltrados.length, categoriaAtiva, subpastaAtiva]);

  // Atalhos de teclado
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
      e.preventDefault();
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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 p-3 sm:p-4 bg-background/20 backdrop-blur-xs animate-in fade-in duration-150"
      onKeyDown={lidarKeyDown}
    >
      <div
        ref={painelRef}
        className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[82vh]"
      >
        {/* Barra Superior: Campo Buscar + Filtro Avançado + Fechar */}
        <div className="p-3 sm:p-4 border-b border-border/70 flex items-center gap-2 bg-card/90">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              ref={inputBuscaRef}
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar documento para vincular..."
              className="w-full pl-10 pr-9 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/60"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro Avançado com Sistema por Propriedades */}
          <div className="shrink-0">
            <BarraFiltrosAvancados
              propriedadesDisponiveis={DEFINICOES_FILTRO_DOCUMENTOS}
              regras={regrasFiltro}
              aoMudarRegras={setRegrasFiltro}
            />
          </div>

          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar busca"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Barra de Localização / Telas */}
        <div className="px-3 sm:px-4 py-2 border-b border-border/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-muted/20">
          <button
            type="button"
            onClick={() => {
              setCategoriaAtiva("todas");
              setSubpastaAtiva("todos");
            }}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 border",
              categoriaAtiva === "todas"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/80 hover:bg-muted text-muted-foreground border-border/60 hover:text-foreground"
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
                "px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 border",
                categoriaAtiva === pasta.categoria
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background/80 hover:bg-muted text-muted-foreground border-border/60 hover:text-foreground"
              )}
            >
              {obterIconeCategoria(pasta.categoria)}
              <span>{pasta.titulo}</span>
              <span className="text-[10px] opacity-70">({pasta.total})</span>
            </button>
          ))}
        </div>

        {/* Subpastas / Status específicos */}
        {subpastasDisponiveis.length > 0 && (
          <div className="px-3 sm:px-4 py-1.5 border-b border-border/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-muted/10">
            <span className="text-[10px] text-muted-foreground font-medium shrink-0 flex items-center gap-1">
              <Folder size={11} /> Filtro:
            </span>

            <button
              type="button"
              onClick={() => setSubpastaAtiva("todos")}
              className={cn(
                "px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer border",
                subpastaAtiva === "todos"
                  ? "bg-secondary text-foreground border-border font-semibold"
                  : "bg-transparent hover:bg-muted/40 text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              Todas
            </button>

            {subpastasDisponiveis.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubpastaAtiva(sub.valorFiltro)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer border",
                  subpastaAtiva === sub.valorFiltro
                    ? "bg-secondary text-foreground border-border font-semibold"
                    : "bg-transparent hover:bg-muted/40 text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {sub.titulo} ({sub.total})
              </button>
            ))}
          </div>
        )}

        {/* Lista de Documentos Encontrados */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40 min-h-[140px]">
          {documentosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              <p>Nenhum documento encontrado com os filtros atuais.</p>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold truncate text-foreground">
                          @{doc.titulo}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0">
                          {doc.subpastaOuStatusRotulo || doc.categoriaRotulo}
                        </span>
                        {doc.data && (
                          <span className="text-[10px] text-muted-foreground/70 flex items-center gap-0.5 shrink-0">
                            <Calendar size={10} /> {doc.data}
                          </span>
                        )}
                      </div>

                      {doc.snippet && (
                        <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                          {renderizarMarkdownInline(doc.snippet)}
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
                            className="text-[9px] px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground font-medium"
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

        {/* Rodapé Minimalista */}
        <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground bg-card">
          <span>
            {documentosFiltrados.length}{" "}
            {documentosFiltrados.length === 1 ? "documento disponível" : "documentos disponíveis"}
          </span>
          <span>
            Navegue com <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">↓</kbd> e vincule com <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">Enter</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
