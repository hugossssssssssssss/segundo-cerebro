import { useState, useRef, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  useMotorBuscaWeb,
  construirQueryWeb,
  executarBuscaWeb,
  contarFiltrosAtivos,
  MOTORES_BUSCA,
  FILTROS_PRINCIPAIS,
  FILTROS_EXTRAS_POR_MOTOR,
  type WebSearchEngine,
  type WebSearchFilters,
} from "@/lib/buscaWeb";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SUGESTOES_FILETYPE = ["pdf", "docx", "svg", "csv", "json", "png"];

export interface WebSearchBarProps {
  /** Modo visual de exibição */
  modo?: "widget" | "header" | "compacto";
  /** Placeholder customizado opcional */
  placeholder?: string;
  /** Classe CSS extra para o container */
  className?: string;
  /** Callback disparado após submeter a busca */
  aoSubmeter?: (query: string, motor: WebSearchEngine) => void;
  /** Focar automaticamente no input */
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const totalFiltrosAtivos = contarFiltrosAtivos(filtros, motor);
  const infoMotorAtual = MOTORES_BUSCA.find((m) => m.id === motor) || MOTORES_BUSCA[0];
  const placeholderAtual = placeholder || infoMotorAtual.placeholder;

  const atualizarFiltro = (campo: keyof WebSearchFilters, valor: string) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const limparFiltros = () => {
    setFiltros({});
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
    <div
      className={cn(
        "relative w-full flex flex-col gap-2",
        modo === "widget" && "w-full",
        modo === "header" && "w-full max-w-lg",
        className
      )}
    >
      <form
        onSubmit={handleBuscar}
        className={cn(
          "flex items-center gap-1.5 transition-all bg-card text-foreground border rounded-2xl p-1.5 shadow-xs focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50",
          modo === "header" ? "h-10 border-border/70 bg-background/80" : "border-border/80 bg-card p-2"
        )}
      >
        {/* Seletor do Motor de Busca */}
        <div className="relative shrink-0">
          <select
            value={motor}
            onChange={(e) => setMotor(e.target.value as WebSearchEngine)}
            className={cn(
              "h-8 sm:h-9 appearance-none rounded-xl bg-muted/60 hover:bg-accent/80 font-semibold text-xs text-foreground pl-2.5 pr-6 cursor-pointer border border-border/50 outline-none transition-colors",
              modo === "header" && "h-7 text-[11px] pl-2 pr-5"
            )}
            title="Escolher buscador padrão"
            aria-label="Escolher buscador"
          >
            {MOTORES_BUSCA.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
        </div>

        {/* Ícone de busca decorativo */}
        <Search
          size={modo === "header" ? 15 : 18}
          className="text-muted-foreground shrink-0 ml-1 hidden sm:block"
        />

        {/* Campo de Texto Principal */}
        <input
          ref={inputRef}
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder={placeholderAtual}
          className={cn(
            "flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none px-1 min-w-0",
            modo === "header" && "text-xs"
          )}
        />

        {/* Botão de Limpar Termo */}
        {termo && (
          <button
            type="button"
            onClick={() => {
              setTermo("");
              inputRef.current?.focus();
            }}
            className="p-1 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            title="Limpar busca"
          >
            <X size={14} />
          </button>
        )}

        {/* Popover de Filtros Avançados (Dorks) */}
        <Popover open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={totalFiltrosAtivos > 0 ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-8 sm:h-9 px-2 sm:px-2.5 gap-1.5 text-xs rounded-xl relative cursor-pointer",
                totalFiltrosAtivos > 0 && "bg-primary/15 text-primary border border-primary/20 hover:bg-primary/20",
                modo === "header" && "h-7 px-2 text-[11px]"
              )}
              title="Filtros avançados (site:, filetype:, etc.)"
            >
              <SlidersHorizontal size={modo === "header" ? 13 : 14} />
              <span className="hidden md:inline font-medium">Filtros</span>
              {totalFiltrosAtivos > 0 && (
                <Badge
                  variant="default"
                  className="h-4 min-w-4 px-1 text-[10px] rounded-full flex items-center justify-center font-bold"
                >
                  {totalFiltrosAtivos}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[90vw] sm:w-[420px] max-h-[80vh] overflow-y-auto p-4 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            {/* Cabeçalho dos Filtros */}
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    Filtros Avançados
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0 px-1.5">
                      {infoMotorAtual.nome}
                    </Badge>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Construtor visual de operadores de busca (Dorks)
                  </p>
                </div>
              </div>

              {totalFiltrosAtivos > 0 && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  title="Limpar todos os filtros preenchidos"
                >
                  <RotateCcw size={11} />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            {/* 1. Categorias Principais (Universal) */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Filtros Principais
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FILTROS_PRINCIPAIS.map((f) => (
                  <div key={f.chave} className="space-y-1">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>{f.rotulo}</span>
                      <code className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1 rounded">
                        {f.exemplo}
                      </code>
                    </label>
                    <input
                      type="text"
                      value={filtros[f.chave] || ""}
                      onChange={(e) => atualizarFiltro(f.chave, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full h-8 px-2.5 rounded-lg border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    />

                    {/* Chips rápidos para Tipo de Arquivo */}
                    {f.chave === "filetype" && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {SUGESTOES_FILETYPE.map((ext) => (
                          <button
                            key={ext}
                            type="button"
                            onClick={() => atualizarFiltro("filetype", ext)}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-md border font-mono transition-colors cursor-pointer",
                              filtros.filetype === ext
                                ? "bg-primary text-primary-foreground border-primary font-bold"
                                : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-accent hover:text-foreground"
                            )}
                          >
                            .{ext}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Seção "Ver Mais" (Dinâmica por buscador) */}
            {camposExtras.length > 0 && (
              <div className="border-t border-border/50 pt-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setVerMaisAberto(!verMaisAberto)}
                  className="w-full flex items-center justify-between text-xs font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <span>Operadores Específicos ({infoMotorAtual.nome})</span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      {camposExtras.length}
                    </Badge>
                  </span>
                  {verMaisAberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {verMaisAberto && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {camposExtras.map((f) => (
                      <div key={f.chave} className="space-y-1">
                        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span>{f.rotulo}</span>
                          <code className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1 rounded">
                            {f.exemplo}
                          </code>
                        </label>
                        <input
                          type={f.tipo || "text"}
                          value={filtros[f.chave] || ""}
                          onChange={(e) => atualizarFiltro(f.chave, e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full h-8 px-2.5 rounded-lg border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Preview da Query e Botão de Ação */}
            <div className="border-t border-border/50 pt-3 space-y-2.5">
              {queryPreview && (
                <div className="p-2 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Query montada:
                  </span>
                  <p className="text-xs font-mono text-foreground break-all line-clamp-2">
                    {queryPreview}
                  </p>
                </div>
              )}

              <Button
                type="button"
                onClick={() => {
                  setFiltrosAbertos(false);
                  handleBuscar();
                }}
                disabled={!queryPreview.trim()}
                className="w-full gap-2 text-xs font-bold rounded-xl h-9 cursor-pointer"
              >
                <span>Pesquisar no {infoMotorAtual.nome}</span>
                <ExternalLink size={14} />
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Botão de Submeter Busca */}
        <Button
          type="submit"
          disabled={!queryPreview.trim()}
          size="sm"
          className={cn(
            "h-8 sm:h-9 px-3 sm:px-4 gap-1.5 rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-2xs",
            modo === "header" && "h-7 px-2.5 text-[11px]"
          )}
        >
          <span className="hidden sm:inline">Buscar</span>
          <ArrowRight size={modo === "header" ? 13 : 14} />
        </Button>
      </form>
    </div>
  );
}
