import { useState, useRef, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RotateCcw,
  ExternalLink,
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
  { valor: "", rotulo: "Qualquer tipo de arquivo" },
  { valor: "pdf", rotulo: "PDF (.pdf) — Documentos e relatórios" },
  { valor: "docx", rotulo: "Word (.docx) — Textos editáveis" },
  { valor: "xlsx", rotulo: "Excel (.xlsx) — Planilhas e dados" },
  { valor: "pptx", rotulo: "PowerPoint (.pptx) — Apresentações" },
  { valor: "svg", rotulo: "Vetor SVG (.svg) — Ícones e ilustrações" },
  { valor: "json", rotulo: "JSON (.json) — Estruturas de dados" },
  { valor: "txt", rotulo: "Texto Puro (.txt) — Anotações simples" },
  { valor: "custom", rotulo: "Outro formato personalizado..." },
];

export interface WebSearchBarProps {
  /** Modo visual de exibição */
  modo?: "widget" | "modal" | "compacto";
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
  const [formatoCustomAtivo, setFormatoCustomAtivo] = useState(false);
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
    <div className={cn("w-full space-y-4", modo === "modal" && "max-w-full", className)}>
      {/* Barra de Pesquisa Principal */}
      <form
        onSubmit={handleBuscar}
        className="relative flex items-center gap-2 rounded-2xl border border-border/80 bg-card text-foreground shadow-xs px-3.5 h-13 sm:h-14 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/60 transition-all"
      >
        <Search size={20} className="text-muted-foreground shrink-0 ml-1" />

        <input
          ref={inputRef}
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder={placeholderAtual}
          className="flex-1 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 outline-none px-2 min-w-0 font-medium"
        />

        {/* Botão Limpar Texto */}
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
        <Button
          type="button"
          variant={filtrosAbertos || totalFiltrosAtivos > 0 ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFiltrosAbertos(!filtrosAbertos)}
          className={cn(
            "h-9 sm:h-10 px-3 gap-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shrink-0",
            (filtrosAbertos || totalFiltrosAtivos > 0) && "bg-primary/10 text-primary border-primary/30"
          )}
          title="Filtros avançados (Site, Formato, Termo exato)"
        >
          <SlidersHorizontal size={15} />
          <span>Filtros</span>
          {totalFiltrosAtivos > 0 && (
            <Badge variant="default" className="h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold">
              {totalFiltrosAtivos}
            </Badge>
          )}
        </Button>

        {/* Botão de Buscar */}
        <Button
          type="submit"
          disabled={!queryPreview.trim()}
          size="sm"
          className="h-9 sm:h-10 px-4 sm:px-5 gap-2 rounded-xl font-bold text-xs sm:text-sm shrink-0 cursor-pointer shadow-xs"
        >
          <span>Buscar</span>
          <ArrowRight size={15} />
        </Button>
      </form>

      {/* Painel de Propriedades dos Filtros (Estilo Notion / Klaus) */}
      {filtrosAbertos && (
        <div className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card/90 backdrop-blur-md shadow-xs space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Cabeçalho das Propriedades */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Propriedades de Busca
            </span>

            {totalFiltrosAtivos > 0 && (
              <button
                type="button"
                onClick={limparFiltros}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                title="Limpar todos os filtros preenchidos"
              >
                <RotateCcw size={13} />
                <span>Limpar propriedades</span>
              </button>
            )}
          </div>

          {/* Grid de Propriedades em Lista Limpa e Espaçosa */}
          <div className="space-y-3.5">
            {/* 1. Propriedade: Site */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4 p-2.5 rounded-2xl hover:bg-muted/30 transition-colors">
              <div className="sm:col-span-1 flex items-center gap-1.5">
                <Tooltip
                  conteudo={
                    <div className="max-w-xs space-y-1 text-xs">
                      <p className="font-bold">Apenas neste site ou domínio</p>
                      <p className="text-muted-foreground">
                        Restringe todos os resultados exclusivamente a um endereço web.
                      </p>
                      <p className="font-mono text-primary text-[11px]">Exemplo: site:github.com ou site:wikipedia.org</p>
                    </div>
                  }
                >
                  <label className="text-xs font-bold text-foreground flex items-center gap-1 cursor-help select-none">
                    <span>Site:</span>
                    <HelpCircle size={13} className="text-muted-foreground" />
                  </label>
                </Tooltip>
              </div>

              <div className="sm:col-span-3">
                <input
                  type="text"
                  value={filtros.site || ""}
                  onChange={(e) => atualizarFiltro("site", e.target.value)}
                  placeholder="ex: github.com ou wikipedia.org"
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* 2. Propriedade: Tipo (Formato de Arquivo Pré-cadastrado) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4 p-2.5 rounded-2xl hover:bg-muted/30 transition-colors">
              <div className="sm:col-span-1 flex items-center gap-1.5">
                <Tooltip
                  conteudo={
                    <div className="max-w-xs space-y-1 text-xs">
                      <p className="font-bold">Formato de arquivo</p>
                      <p className="text-muted-foreground">
                        Filtra apenas documentos indexados para download direto.
                      </p>
                      <p className="font-mono text-primary text-[11px]">Exemplo: filetype:pdf ou filetype:docx</p>
                    </div>
                  }
                >
                  <label className="text-xs font-bold text-foreground flex items-center gap-1 cursor-help select-none">
                    <span>Tipo:</span>
                    <HelpCircle size={13} className="text-muted-foreground" />
                  </label>
                </Tooltip>
              </div>

              <div className="sm:col-span-3 space-y-2">
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
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-background text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
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
                    placeholder="Digite a extensão (ex: csv, epub, mp3)"
                    className="w-full h-8 px-3 rounded-xl border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* 3. Propriedade: Exatamente */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4 p-2.5 rounded-2xl hover:bg-muted/30 transition-colors">
              <div className="sm:col-span-1 flex items-center gap-1.5">
                <Tooltip
                  conteudo={
                    <div className="max-w-xs space-y-1 text-xs">
                      <p className="font-bold">Frase ou expressão exata</p>
                      <p className="text-muted-foreground">
                        Encontra resultados contendo este termo exatamente nesta ordem.
                      </p>
                      <p className="font-mono text-primary text-[11px]">Exemplo: "design system" ou "inteligência artificial"</p>
                    </div>
                  }
                >
                  <label className="text-xs font-bold text-foreground flex items-center gap-1 cursor-help select-none">
                    <span>Exatamente:</span>
                    <HelpCircle size={13} className="text-muted-foreground" />
                  </label>
                </Tooltip>
              </div>

              <div className="sm:col-span-3">
                <input
                  type="text"
                  value={filtros.exata || ""}
                  onChange={(e) => atualizarFiltro("exata", e.target.value)}
                  placeholder='ex: "design tokens" ou "inteligência artificial"'
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* 4. Propriedade: Sem as palavras (Excluir) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4 p-2.5 rounded-2xl hover:bg-muted/30 transition-colors">
              <div className="sm:col-span-1 flex items-center gap-1.5">
                <Tooltip
                  conteudo={
                    <div className="max-w-xs space-y-1 text-xs">
                      <p className="font-bold">Excluir palavras</p>
                      <p className="text-muted-foreground">
                        Remove dos resultados qualquer página que contenha estas palavras.
                      </p>
                      <p className="font-mono text-primary text-[11px]">Exemplo: -anuncio -patrocinado -comprar</p>
                    </div>
                  }
                >
                  <label className="text-xs font-bold text-foreground flex items-center gap-1 cursor-help select-none">
                    <span>Sem as palavras:</span>
                    <HelpCircle size={13} className="text-muted-foreground" />
                  </label>
                </Tooltip>
              </div>

              <div className="sm:col-span-3">
                <input
                  type="text"
                  value={filtros.excluir || ""}
                  onChange={(e) => atualizarFiltro("excluir", e.target.value)}
                  placeholder="ex: anuncio patrocinado comprar"
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* 5. Seção "Mais Operadores Específicos" */}
          {camposExtras.length > 0 && (
            <div className="border-t border-border/60 pt-3 space-y-3">
              <button
                type="button"
                onClick={() => setVerMaisAberto(!verMaisAberto)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/60 transition-colors cursor-pointer text-xs font-bold text-foreground"
              >
                <span>Mais operadores do {infoMotorAtual.nome}</span>
                {verMaisAberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {verMaisAberto && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150 pt-1">
                  {camposExtras.map((f) => (
                    <div
                      key={f.chave}
                      className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4 p-2.5 rounded-2xl hover:bg-muted/30 transition-colors"
                    >
                      <div className="sm:col-span-1 flex items-center gap-1.5">
                        <Tooltip
                          conteudo={
                            <div className="max-w-xs space-y-1 text-xs">
                              <p className="font-bold">{f.rotulo}</p>
                              <p className="text-muted-foreground">{f.dica}</p>
                              <p className="font-mono text-primary text-[11px]">Exemplo: {f.exemplo}</p>
                            </div>
                          }
                        >
                          <label className="text-xs font-bold text-foreground flex items-center gap-1 cursor-help select-none">
                            <span>{f.rotulo}:</span>
                            <HelpCircle size={13} className="text-muted-foreground" />
                          </label>
                        </Tooltip>
                      </div>

                      <div className="sm:col-span-3">
                        <input
                          type={f.tipo || "text"}
                          value={filtros[f.chave] || ""}
                          onChange={(e) => atualizarFiltro(f.chave, e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full h-9 px-3 rounded-xl border border-border/80 bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prévia da Busca e Botão de Ação */}
          <div className="border-t border-border/60 pt-4 space-y-3">
            {queryPreview && (
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Como sua busca será enviada ao {infoMotorAtual.nome}:
                </span>
                <p className="text-xs sm:text-sm font-mono text-primary font-semibold break-all">
                  {queryPreview}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              {/* Seletor discreto do buscador nas configurações dos filtros */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Buscador:</span>
                <select
                  value={motor}
                  onChange={(e) => setMotor(e.target.value as WebSearchEngine)}
                  className="text-xs font-semibold rounded-lg bg-muted/60 px-2 py-1 border border-border/60 outline-none cursor-pointer"
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
                onClick={() => handleBuscar()}
                disabled={!queryPreview.trim()}
                className="gap-2 text-xs font-bold rounded-xl h-10 px-5 shadow-xs cursor-pointer"
              >
                <span>Pesquisar no {infoMotorAtual.nome}</span>
                <ExternalLink size={15} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
