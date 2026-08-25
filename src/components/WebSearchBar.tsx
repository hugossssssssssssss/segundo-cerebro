import { useState, useRef, useEffect } from "react";
import {
  Globe,
  SlidersHorizontal,
  X,
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
  type WebSearchEngine,
  type WebSearchFilters,
} from "@/lib/buscaWeb";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FORMATOS_PRE_CADASTRADOS = [
  { valor: "", rotulo: "Qualquer formato de arquivo" },
  { valor: "pdf", rotulo: "PDF (.pdf)" },
  { valor: "docx", rotulo: "Word (.docx)" },
  { valor: "xlsx", rotulo: "Excel (.xlsx)" },
  { valor: "pptx", rotulo: "PowerPoint (.pptx)" },
  { valor: "svg", rotulo: "Vetor SVG (.svg)" },
  { valor: "json", rotulo: "JSON (.json)" },
  { valor: "txt", rotulo: "Texto Puro (.txt)" },
  { valor: "custom", rotulo: "Outro formato..." },
];

export interface WebSearchBarProps {
  modo?: "widget" | "modal" | "compacto";
  placeholder?: string;
  className?: string;
  aoSubmeter?: (query: string, motor: WebSearchEngine) => void;
  autoFocus?: boolean;
}

export function WebSearchBar({
  modo = "widget",
  placeholder,
  className,
  aoSubmeter,
  autoFocus = false,
}: WebSearchBarProps) {
  const [motor, setMotor] = useMotorBuscaWeb();
  const [termo, setTermo] = useState("");
  const [filtros, setFiltros] = useState<WebSearchFilters>({});
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [verMaisAberto, setVerMaisAberto] = useState(false);
  const [formatoCustomAtivo, setFormatoCustomAtivo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const totalFiltrosAtivos = contarFiltrosAtivos(filtros, motor);
  const infoMotorAtual = MOTORES_BUSCA.find((m) => m.id === motor) || MOTORES_BUSCA[0];
  const placeholderAtual = placeholder || `Pesquisar no ${infoMotorAtual.nome}...`;

  const atualizarFiltro = (campo: keyof WebSearchFilters, valor: string) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const limparFiltros = () => {
    setFiltros({});
    setFormatoCustomAtivo(false);
  };

  const handleBuscar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = construirQueryWeb(termo, filtros, motor);
    if (!query.trim()) return;

    if (aoSubmeter) {
      aoSubmeter(query, motor);
    }
    executarBuscaWeb(termo, filtros, motor);
  };

  const queryPreview = construirQueryWeb(termo, filtros, motor);
  const camposExtras = FILTROS_EXTRAS_POR_MOTOR[motor] || [];

  return (
    <div className={cn("w-full space-y-3", modo === "modal" && "max-w-full", className)}>
      {/* Barra de Pesquisa */}
      <form
        onSubmit={handleBuscar}
        className="relative flex items-center gap-2 rounded-xl border border-border/80 bg-background text-foreground shadow-xs px-3 h-11 sm:h-12 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
      >
        <Globe size={18} className="text-blue-500 shrink-0 ml-0.5" />

        <input
          ref={inputRef}
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder={placeholderAtual}
          className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none px-1 min-w-0 font-medium"
        />

        {termo && (
          <button
            type="button"
            onClick={() => {
              setTermo("");
              inputRef.current?.focus();
            }}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Limpar texto"
          >
            <X size={15} />
          </button>
        )}

        {/* Botão de Filtros */}
        <button
          type="button"
          onClick={() => setFiltrosAbertos(!filtrosAbertos)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0",
            filtrosAbertos || totalFiltrosAtivos > 0
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-muted-foreground hover:text-foreground border-border/60 hover:bg-accent"
          )}
          title="Filtros avançados (Site, Formato, Termo exato)"
        >
          <SlidersHorizontal size={13} />
          <span>Filtros</span>
          {totalFiltrosAtivos > 0 && (
            <Badge variant="default" className="h-4 min-w-4 px-1 rounded-full text-[10px]">
              {totalFiltrosAtivos}
            </Badge>
          )}
        </button>

        {/* Botão Buscar */}
        <Button
          type="submit"
          disabled={!queryPreview.trim()}
          size="sm"
          className="h-8 px-3.5 gap-1.5 rounded-lg font-bold text-xs shrink-0 cursor-pointer"
        >
          <span>Buscar</span>
          <ArrowRight size={13} />
        </Button>
      </form>

      {/* Painel de Propriedades Compacto */}
      {filtrosAbertos && (
        <div className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Propriedades do Filtro
            </span>
            {totalFiltrosAtivos > 0 && (
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
          <div className="flex items-center gap-3 py-0.5 text-xs">
            <Tooltip conteudo="Procura apenas dentro deste domínio. Ex: site:github.com">
              <span className="w-20 text-muted-foreground font-semibold flex items-center gap-1 cursor-help shrink-0">
                <span>Site:</span>
                <HelpCircle size={11} />
              </span>
            </Tooltip>
            <input
              type="text"
              value={filtros.site || ""}
              onChange={(e) => atualizarFiltro("site", e.target.value)}
              placeholder="ex: github.com ou wikipedia.org"
              className="flex-1 h-7 sm:h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary"
            />
          </div>

          {/* 2. Tipo */}
          <div className="flex items-center gap-3 py-0.5 text-xs">
            <Tooltip conteudo="Filtra apenas documentos para download. Ex: filetype:pdf">
              <span className="w-20 text-muted-foreground font-semibold flex items-center gap-1 cursor-help shrink-0">
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
                className="flex-1 h-7 sm:h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-primary cursor-pointer"
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
                  className="w-24 h-7 sm:h-8 px-2 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-primary font-mono"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* 3. Exato */}
          <div className="flex items-center gap-3 py-0.5 text-xs">
            <Tooltip conteudo='Busca o termo exatamente nesta sequência. Ex: "design system"'>
              <span className="w-20 text-muted-foreground font-semibold flex items-center gap-1 cursor-help shrink-0">
                <span>Exato:</span>
                <HelpCircle size={11} />
              </span>
            </Tooltip>
            <input
              type="text"
              value={filtros.exata || ""}
              onChange={(e) => atualizarFiltro("exata", e.target.value)}
              placeholder='ex: "design tokens"'
              className="flex-1 h-7 sm:h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary"
            />
          </div>

          {/* 4. Excluir */}
          <div className="flex items-center gap-3 py-0.5 text-xs">
            <Tooltip conteudo="Exclui qualquer página com estas palavras. Ex: -anuncio">
              <span className="w-20 text-muted-foreground font-semibold flex items-center gap-1 cursor-help shrink-0">
                <span>Excluir:</span>
                <HelpCircle size={11} />
              </span>
            </Tooltip>
            <input
              type="text"
              value={filtros.excluir || ""}
              onChange={(e) => atualizarFiltro("excluir", e.target.value)}
              placeholder="ex: anuncio patrocinado"
              className="flex-1 h-7 sm:h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary"
            />
          </div>

          {/* Mais Operadores */}
          {camposExtras.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setVerMaisAberto(!verMaisAberto)}
                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <span>Mais operadores ({infoMotorAtual.nome})</span>
                {verMaisAberto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {verMaisAberto && (
                <div className="space-y-1.5 pt-1.5 animate-in fade-in">
                  {camposExtras.map((f) => (
                    <div key={f.chave} className="flex items-center gap-3 py-0.5 text-xs">
                      <Tooltip conteudo={`${f.dica}. Ex: ${f.exemplo}`}>
                        <span className="w-20 text-muted-foreground font-semibold flex items-center gap-1 cursor-help shrink-0 truncate">
                          <span>{f.rotulo}:</span>
                          <HelpCircle size={11} />
                        </span>
                      </Tooltip>
                      <input
                        type={f.tipo || "text"}
                        value={filtros[f.chave] || ""}
                        onChange={(e) => atualizarFiltro(f.chave, e.target.value)}
                        placeholder={f.placeholder}
                        className="flex-1 h-7 sm:h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rodapé dos Filtros */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>Buscador:</span>
              <select
                value={motor}
                onChange={(e) => setMotor(e.target.value as WebSearchEngine)}
                className="text-xs font-semibold rounded-md bg-background px-1.5 py-0.5 border border-border outline-none cursor-pointer text-foreground"
              >
                {MOTORES_BUSCA.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            {queryPreview && (
              <span className="font-mono text-primary truncate max-w-[200px] sm:max-w-[300px]">
                {queryPreview}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
