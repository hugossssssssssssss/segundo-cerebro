import { useEffect, useRef, useState } from "react";
import {
  Globe,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RotateCcw,
  HelpCircle,
} from "lucide-react";
import {
  useMotorBuscaWeb,
  construirQueryWeb,
  executarBuscaWeb,
  contarFiltrosAtivos,
  MOTORES_BUSCA,
  FILTROS_EXTRAS_POR_MOTOR,
  type WebSearchFilters,
  type WebSearchEngine,
} from "@/lib/buscaWeb";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FORMATOS_PRE_CADASTRADOS = [
  { valor: "", rotulo: "Qualquer tipo de arquivo" },
  { valor: "pdf", rotulo: "PDF (.pdf)" },
  { valor: "docx", rotulo: "Word (.docx)" },
  { valor: "xlsx", rotulo: "Excel (.xlsx)" },
  { valor: "pptx", rotulo: "PowerPoint (.pptx)" },
  { valor: "svg", rotulo: "Vetor SVG (.svg)" },
  { valor: "json", rotulo: "JSON (.json)" },
  { valor: "txt", rotulo: "Texto Puro (.txt)" },
  { valor: "custom", rotulo: "Outro formato..." },
];

export interface ModalBuscaWebProps {
  aberta: boolean;
  aoFechar: () => void;
}

/**
 * Modal centralizado de Busca Web do Klaus.
 * Renderiza centralizado no meio da tela com backdrop e blur,
 * exatamente no mesmo padrão visual da Busca Global do Klaus.
 */
export function ModalBuscaWeb({ aberta, aoFechar }: ModalBuscaWebProps) {
  const [motor, setMotor] = useMotorBuscaWeb();
  const [termo, setTermo] = useState("");
  const [filtros, setFiltros] = useState<WebSearchFilters>({});
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [verMaisAberto, setVerMaisAberto] = useState(false);
  const [formatoCustomAtivo, setFormatoCustomAtivo] = useState(false);
  const entradaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberta) {
      setTimeout(() => entradaRef.current?.focus(), 50);
    }
  }, [aberta]);

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        aoFechar();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta, aoFechar]);

  if (!aberta) return null;

  const infoMotor = MOTORES_BUSCA.find((m) => m.id === motor) || MOTORES_BUSCA[0];
  const totalFiltros = contarFiltrosAtivos(filtros, motor);
  const queryFinal = construirQueryWeb(termo, filtros, motor);
  const camposExtras = FILTROS_EXTRAS_POR_MOTOR[motor] || [];

  const atualizarFiltro = (campo: keyof WebSearchFilters, valor: string) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  const limparFiltros = () => {
    setFiltros({});
    setFormatoCustomAtivo(false);
  };

  const handleSubmeter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryFinal.trim()) return;
    executarBuscaWeb(termo, filtros, motor);
    aoFechar();
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center bg-black/60 p-0 pt-0 sm:p-4 sm:pt-20 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={aoFechar}
    >
      <div
        className="flex max-h-[100dvh] w-full flex-col border-border bg-card shadow-2xl sm:max-h-[85dvh] sm:max-w-2xl sm:rounded-2xl sm:border overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de Entrada Principal */}
        <form onSubmit={handleSubmeter} className="flex shrink-0 items-center gap-2 border-b border-border p-3 sm:p-3.5 bg-card">
          <Globe size={18} className="shrink-0 text-blue-500 ml-1" />

          <input
            ref={entradaRef}
            type="text"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder={`Pesquisar no ${infoMotor.nome}...`}
            className="flex-1 border-0 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground outline-none px-1 font-medium"
            autoFocus
          />

          {termo && (
            <button
              type="button"
              onClick={() => {
                setTermo("");
                entradaRef.current?.focus();
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              title="Limpar texto"
            >
              <X size={16} />
            </button>
          )}

          {/* Botão de Filtros */}
          <button
            type="button"
            onClick={() => setFiltrosAbertos(!filtrosAbertos)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0",
              filtrosAbertos || totalFiltros > 0
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground hover:text-foreground border-border/60 hover:bg-accent"
            )}
            title="Filtros avançados"
          >
            <SlidersHorizontal size={13} />
            <span>Filtros</span>
            {totalFiltros > 0 && (
              <Badge variant="default" className="h-4 min-w-4 px-1 rounded-full text-[10px]">
                {totalFiltros}
              </Badge>
            )}
          </button>

          {/* Botão Fechar Modal */}
          <button
            type="button"
            onClick={aoFechar}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </form>

        {/* Corpo: Painel de Propriedades (Estilo Notion / Klaus) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[65vh]">
          {/* Seção de Propriedades dos Filtros */}
          {filtrosAbertos && (
            <div className="space-y-2 border-b border-border/50 pb-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Propriedades
                </span>
                {totalFiltros > 0 && (
                  <button
                    type="button"
                    onClick={limparFiltros}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    <span>Limpar</span>
                  </button>
                )}
              </div>

              {/* 1. Site */}
              <div className="flex items-center gap-3 py-1 text-xs">
                <Tooltip conteudo="Procura apenas dentro deste domínio. Ex: site:github.com">
                  <span className="w-24 text-muted-foreground font-semibold flex items-center gap-1 cursor-help shrink-0">
                    <span>Site:</span>
                    <HelpCircle size={11} />
                  </span>
                </Tooltip>
                <input
                  type="text"
                  value={filtros.site || ""}
                  onChange={(e) => atualizarFiltro("site", e.target.value)}
                  placeholder="ex: github.com ou wikipedia.org"
                  className="flex-1 h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary"
                />
              </div>

              {/* 2. Tipo */}
              <div className="flex items-center gap-3 py-1 text-xs">
                <Tooltip conteudo="Filtra apenas documentos para download. Ex: filetype:pdf">
                  <span className="w-24 text-muted-foreground font-semibold flex items-center gap-1 cursor-help shrink-0">
                    <span>Tipo:</span>
                    <HelpCircle size={11} />
                  </span>
                </Tooltip>
                <div className="flex-1 flex gap-2">
                  <select
                    value={
                      formatoCustomAtivo
                        ? "custom"
                        : FORMATOS_PRE_CADASTRADOS.some((f) => f.valor === (filtros.filetype || ""))
                        ? filtros.filetype || ""
                        : "custom"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setFormatoCustomAtivo(true);
                      } else {
                        setFormatoCustomAtivo(false);
                        atualizarFiltro("filetype", val);
                      }
                    }}
                    className="flex-1 h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-primary cursor-pointer"
                  >
                    {FORMATOS_PRE_CADASTRADOS.map((fmt) => (
                      <option key={fmt.valor} value={fmt.valor}>
                        {fmt.rotulo}
                      </option>
                    ))}
                  </select>

                  {(formatoCustomAtivo || (!FORMATOS_PRE_CADASTRADOS.some((f) => f.valor === (filtros.filetype || "")) && filtros.filetype)) && (
                    <input
                      type="text"
                      value={filtros.filetype || ""}
                      onChange={(e) => atualizarFiltro("filetype", e.target.value)}
                      placeholder="ext (ex: csv)"
                      className="w-24 h-8 px-2 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-primary font-mono"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* 3. Exatamente */}
              <div className="flex items-center gap-3 py-1 text-xs">
                <Tooltip conteudo='Busca o termo exatamente nesta sequência. Ex: "design system"'>
                  <span className="w-24 text-muted-foreground font-semibold flex items-center gap-1 cursor-help shrink-0">
                    <span>Exato:</span>
                    <HelpCircle size={11} />
                  </span>
                </Tooltip>
                <input
                  type="text"
                  value={filtros.exata || ""}
                  onChange={(e) => atualizarFiltro("exata", e.target.value)}
                  placeholder='ex: "design tokens"'
                  className="flex-1 h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary"
                />
              </div>

              {/* 4. Excluir */}
              <div className="flex items-center gap-3 py-1 text-xs">
                <Tooltip conteudo="Exclui qualquer página com estas palavras. Ex: -anuncio">
                  <span className="w-24 text-muted-foreground font-semibold flex items-center gap-1 cursor-help shrink-0">
                    <span>Excluir:</span>
                    <HelpCircle size={11} />
                  </span>
                </Tooltip>
                <input
                  type="text"
                  value={filtros.excluir || ""}
                  onChange={(e) => atualizarFiltro("excluir", e.target.value)}
                  placeholder="ex: anuncio patrocinado"
                  className="flex-1 h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary"
                />
              </div>

              {/* Mais Operadores */}
              {camposExtras.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setVerMaisAberto(!verMaisAberto)}
                    className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <span>Mais operadores ({infoMotor.nome})</span>
                    {verMaisAberto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {verMaisAberto && (
                    <div className="space-y-1.5 pt-2 animate-in fade-in">
                      {camposExtras.map((f) => (
                        <div key={f.chave} className="flex items-center gap-3 py-1 text-xs">
                          <Tooltip conteudo={`${f.dica}. Ex: ${f.exemplo}`}>
                            <span className="w-24 text-muted-foreground font-semibold flex items-center gap-1 cursor-help shrink-0 truncate">
                              <span>{f.rotulo}:</span>
                              <HelpCircle size={11} />
                            </span>
                          </Tooltip>
                          <input
                            type={f.tipo || "text"}
                            value={filtros[f.chave] || ""}
                            onChange={(e) => atualizarFiltro(f.chave, e.target.value)}
                            placeholder={f.placeholder}
                            className="flex-1 h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Prévia da Busca */}
          {queryFinal && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
              <span className="font-mono text-foreground truncate flex-1 pr-2">
                {queryFinal}
              </span>
              <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0 font-medium">
                {infoMotor.nome}
              </Badge>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between border-t border-border p-3 sm:px-4 bg-muted/10 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Buscador:</span>
            <select
              value={motor}
              onChange={(e) => setMotor(e.target.value as WebSearchEngine)}
              className="text-xs font-medium rounded-md bg-muted px-1.5 py-0.5 border border-border outline-none cursor-pointer text-foreground"
            >
              {MOTORES_BUSCA.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            onClick={() => handleSubmeter()}
            disabled={!queryFinal.trim()}
            size="sm"
            className="gap-1.5 text-xs font-semibold rounded-lg h-8 px-3 cursor-pointer"
          >
            <span>Buscar</span>
            <ArrowRight size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}
