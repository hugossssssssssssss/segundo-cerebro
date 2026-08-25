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
  Globe,
  FileText,
  Target,
  MinusCircle,
  Heading,
  Link as LinkIcon,
  AlignLeft,
  Calendar,
  MapPin,
  Check,
} from "lucide-react";
import {
  useMotorBuscaWeb,
  construirQueryWeb,
  executarBuscaWeb,
  contarFiltrosAtivos,
  MOTORES_BUSCA,
  FILTROS_PRINCIPAIS,
  FILTROS_EXTRAS_POR_MOTOR,
  ATALHOS_DORKS_RAPIDOS,
  type WebSearchEngine,
  type WebSearchFilters,
} from "@/lib/buscaWeb";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SUGESTOES_FORMATOS = [
  { ext: "pdf", label: "PDF" },
  { ext: "docx", label: "Word (DOCX)" },
  { ext: "xlsx", label: "Excel (XLSX)" },
  { ext: "pptx", label: "PowerPoint" },
  { ext: "svg", label: "Vetor SVG" },
  { ext: "json", label: "JSON" },
];

function obterIconeCampo(nome?: string) {
  switch (nome) {
    case "Globe":
      return <Globe size={15} className="text-blue-500" />;
    case "FileText":
      return <FileText size={15} className="text-purple-500" />;
    case "Target":
      return <Target size={15} className="text-emerald-500" />;
    case "MinusCircle":
      return <MinusCircle size={15} className="text-rose-500" />;
    case "Heading":
      return <Heading size={15} className="text-amber-500" />;
    case "Link":
      return <LinkIcon size={15} className="text-indigo-500" />;
    case "AlignLeft":
      return <AlignLeft size={15} className="text-teal-500" />;
    case "Calendar":
      return <Calendar size={15} className="text-orange-500" />;
    case "MapPin":
      return <MapPin size={15} className="text-red-500" />;
    default:
      return <Sparkles size={15} className="text-primary" />;
  }
}

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

  const aplicarAtalho = (filtrosAtalho: Partial<WebSearchFilters>) => {
    setFiltros((prev) => ({
      ...prev,
      ...filtrosAtalho,
    }));
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

  // ── FORMULÁRIO DE FILTROS AVANÇADOS (DIDÁTICO E AREJADO) ─────────────────────
  const renderPainelFiltros = () => (
    <div className="space-y-6">
      {/* Cabeçalho do Painel */}
      <div className="flex items-start justify-between border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                Filtros Avançados de Busca
                <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/30 text-primary font-bold">
                  {infoMotorAtual.nome}
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Preencha os campos para buscar com precisão sem precisar memorizar comandos (Dorks).
              </p>
            </div>
          </div>
        </div>

        {totalFiltrosAtivos > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={limparFiltros}
            className="text-xs text-muted-foreground hover:text-destructive gap-1.5 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Limpar filtros</span>
          </Button>
        )}
      </div>

      {/* 1. Atalhos Rápidos (1 clique) */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles size={13} className="text-amber-500" />
          <span>Filtros Prontos Populares</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ATALHOS_DORKS_RAPIDOS.map((a) => {
            const estaAtivo = Object.entries(a.filtros).every(
              ([k, v]) => filtros[k as keyof WebSearchFilters] === v
            );
            return (
              <button
                key={a.rotulo}
                type="button"
                onClick={() => aplicarAtalho(a.filtros)}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-medium",
                  estaAtivo
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                    : "bg-muted/40 hover:bg-accent border-border/70 text-foreground hover:border-primary/40"
                )}
              >
                <span>{a.icone}</span>
                <span>{a.rotulo}</span>
                {estaAtivo && <Check size={13} className="ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Categorias Principais (Universal) */}
      <div className="space-y-4">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Filtros Principais
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FILTROS_PRINCIPAIS.map((f) => (
            <div
              key={f.chave}
              className="p-3.5 rounded-2xl border border-border/70 bg-card/60 hover:bg-card/90 transition-colors space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-muted/60">
                    {obterIconeCampo(f.iconeNome)}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block">
                      {f.rotulo}
                    </label>
                    <span className="text-[11px] text-muted-foreground block">
                      {f.dica}
                    </span>
                  </div>
                </div>
                <code className="text-[10px] text-muted-foreground font-mono bg-muted/70 px-1.5 py-0.5 rounded-md border border-border/40 shrink-0 hidden sm:inline">
                  {f.exemplo}
                </code>
              </div>

              <input
                type="text"
                value={filtros[f.chave] || ""}
                onChange={(e) => atualizarFiltro(f.chave, e.target.value)}
                placeholder={f.placeholder}
                className="w-full h-9 px-3 rounded-xl border border-border/80 bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />

              {/* Chips Rápidos para Tipo de Arquivo */}
              {f.chave === "filetype" && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGESTOES_FORMATOS.map((fmt) => (
                    <button
                      key={fmt.ext}
                      type="button"
                      onClick={() => atualizarFiltro("filetype", fmt.ext)}
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-lg border font-mono transition-all cursor-pointer",
                        filtros.filetype === fmt.ext
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                          : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-accent hover:text-foreground"
                      )}
                    >
                      .{fmt.ext}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Seção "Ver Mais" (Específica do Buscador) */}
      {camposExtras.length > 0 && (
        <div className="border-t border-border/60 pt-4 space-y-3">
          <button
            type="button"
            onClick={() => setVerMaisAberto(!verMaisAberto)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/60 transition-colors cursor-pointer text-xs font-bold text-foreground"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-primary" />
              <span>Operadores Específicos para o {infoMotorAtual.nome}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold">
                {camposExtras.length} adicionais
              </Badge>
            </div>
            {verMaisAberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {verMaisAberto && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {camposExtras.map((f) => (
                <div
                  key={f.chave}
                  className="p-3.5 rounded-2xl border border-border/70 bg-card/60 hover:bg-card/90 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-muted/60">
                        {obterIconeCampo(f.iconeNome)}
                      </div>
                      <div>
                        <label className="text-xs font-bold text-foreground block">
                          {f.rotulo}
                        </label>
                        <span className="text-[11px] text-muted-foreground block">
                          {f.dica}
                        </span>
                      </div>
                    </div>
                    <code className="text-[10px] text-muted-foreground font-mono bg-muted/70 px-1.5 py-0.5 rounded-md border border-border/40 shrink-0 hidden sm:inline">
                      {f.exemplo}
                    </code>
                  </div>

                  <input
                    type={f.tipo || "text"}
                    value={filtros[f.chave] || ""}
                    onChange={(e) => atualizarFiltro(f.chave, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full h-9 px-3 rounded-xl border border-border/80 bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Prévia e Botão de Ação */}
      <div className="border-t border-border/60 pt-4 space-y-3">
        {queryPreview ? (
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Como sua pesquisa será enviada ao {infoMotorAtual.nome}:
            </span>
            <p className="text-xs sm:text-sm font-mono text-primary font-semibold break-all">
              {queryPreview}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic text-center">
            Digite um termo na barra de busca ou preencha qualquer filtro acima para pesquisar.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          {modo !== "widget" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFiltrosAbertos(false)}
              className="text-xs rounded-xl"
            >
              Fechar
            </Button>
          )}

          <Button
            type="button"
            onClick={() => {
              setFiltrosAbertos(false);
              handleBuscar();
            }}
            disabled={!queryPreview.trim()}
            className="gap-2 text-xs font-bold rounded-xl h-10 px-5 shadow-sm cursor-pointer"
          >
            <span>Pesquisar no {infoMotorAtual.nome}</span>
            <ExternalLink size={15} />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "w-full space-y-3",
        modo === "header" && "max-w-xl",
        className
      )}
    >
      {/* Seletor de Buscadores em Abas (Estilo moderno com destaque visual) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60">
          {MOTORES_BUSCA.map((m) => {
            const selecionado = motor === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMotor(m.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  selecionado
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", selecionado ? "bg-primary" : "bg-muted-foreground/40")} />
                <span>{m.nome}</span>
              </button>
            );
          })}
        </div>

        {modo === "widget" && (
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Pressione <kbd className="font-mono bg-muted/60 px-1.5 py-0.5 rounded border text-[10px]">Enter</kbd> para buscar
          </span>
        )}
      </div>

      {/* Barra de Pesquisa Principal Imponente */}
      <form
        onSubmit={handleBuscar}
        className={cn(
          "relative flex items-center gap-2 rounded-2xl border transition-all bg-card text-foreground shadow-xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/60",
          modo === "header" ? "h-11 px-3 border-border/80" : "h-13 sm:h-14 px-3 sm:px-4 border-border"
        )}
      >
        <Search
          size={modo === "header" ? 17 : 20}
          className="text-muted-foreground shrink-0"
        />

        <input
          ref={inputRef}
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder={placeholderAtual}
          className={cn(
            "flex-1 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 outline-none min-w-0 font-medium",
            modo === "header" && "text-xs sm:text-sm"
          )}
        />

        {termo && (
          <button
            type="button"
            onClick={() => {
              setTermo("");
              inputRef.current?.focus();
            }}
            className="p-1.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            title="Limpar texto"
          >
            <X size={16} />
          </button>
        )}

        {/* Botão de Filtros Avançados */}
        {modo === "widget" ? (
          <Button
            type="button"
            variant={filtrosAbertos || totalFiltrosAtivos > 0 ? "secondary" : "outline"}
            size="sm"
            onClick={() => setFiltrosAbertos(!filtrosAbertos)}
            className={cn(
              "h-9 sm:h-10 px-3 gap-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shrink-0",
              (filtrosAbertos || totalFiltrosAtivos > 0) && "bg-primary/10 text-primary border-primary/30"
            )}
            title="Abrir construtor de filtros avançados"
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filtros Dorks</span>
            {totalFiltrosAtivos > 0 && (
              <Badge variant="default" className="h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold">
                {totalFiltrosAtivos}
              </Badge>
            )}
          </Button>
        ) : (
          <Popover open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={totalFiltrosAtivos > 0 ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-8 px-2.5 gap-1.5 rounded-xl text-xs font-semibold cursor-pointer shrink-0",
                  totalFiltrosAtivos > 0 && "bg-primary/10 text-primary border-primary/30"
                )}
                title="Abrir construtor de filtros avançados"
              >
                <SlidersHorizontal size={14} />
                <span className="hidden md:inline">Filtros</span>
                {totalFiltrosAtivos > 0 && (
                  <Badge variant="default" className="h-4 min-w-4 px-1 rounded-full text-[10px]">
                    {totalFiltrosAtivos}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={10}
              className="w-[92vw] sm:w-[560px] max-h-[80vh] overflow-y-auto p-5 rounded-3xl border border-border bg-card/98 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95"
            >
              {renderPainelFiltros()}
            </PopoverContent>
          </Popover>
        )}

        {/* Botão de Busca */}
        <Button
          type="submit"
          disabled={!queryPreview.trim()}
          size="sm"
          className={cn(
            "gap-2 rounded-xl font-bold shrink-0 cursor-pointer shadow-xs",
            modo === "header" ? "h-8 px-3 text-xs" : "h-9 sm:h-10 px-4 sm:px-5 text-xs sm:text-sm"
          )}
        >
          <span>Buscar</span>
          <ArrowRight size={15} />
        </Button>
      </form>

      {/* No Modo Widget: Painel de Filtros Inline Expansível e Arejado */}
      {modo === "widget" && filtrosAbertos && (
        <div className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card/90 backdrop-blur-md shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          {renderPainelFiltros()}
        </div>
      )}
    </div>
  );
}
