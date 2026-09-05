import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Wrench,
  Ruler,
  Maximize2,
  Eye,
  Type,
  AlignLeft,
  Sparkles,
  QrCode,
  FileCode2,
  KeyRound,
  Copy,
  Download,
  ArrowLeft,
  Search,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  converterUnidades,
  type UnidadeMedida,
  calcularAspectRatio,
  PRESETS_ASPECT_RATIO,
  verificarContrasteWCAG,
  converterTextoCases,
  analisarEstatisticasTexto,
  limparTexto,
  gerarLoremIpsum,
  gerarSvgQrCode,
  gerarPngDataUrlQrCode,
  gerarUUID,
  textoParaBase64,
  base64ParaTexto,
  gerarHashSHA256,
  formatarJSON,
  minificarJSON,
} from "@/lib/itTools";

export type CategoriaITTools = "todas" | "design" | "texto" | "geradores";

export interface InfoFerramentaIT {
  id: string;
  titulo: string;
  descricao: string;
  categoria: "design" | "texto" | "geradores";
  icone: any;
  corIcone: string;
  palavrasChave: string[];
}

export const LISTA_IT_TOOLS: InfoFerramentaIT[] = [
  // ── Design & Medidas ──
  {
    id: "conversor_unidades",
    titulo: "Conversor de Unidades (px / rem / pt)",
    descricao: "Converta medidas entre pixels, rem, em, pt, cm e polegadas com base flexível.",
    categoria: "design",
    icone: Ruler,
    corIcone: "text-amber-500 bg-amber-500/10",
    palavrasChave: ["px", "rem", "em", "pt", "cm", "unidades", "medidas", "tamanho", "font-size", "css"],
  },
  {
    id: "aspect_ratio",
    titulo: "Calculadora de Aspect Ratio",
    descricao: "Calcule proporções de vídeo e tela (16:9, 4:3, 1:1, 9:16) com preview visual.",
    categoria: "design",
    icone: Maximize2,
    corIcone: "text-blue-500 bg-blue-500/10",
    palavrasChave: ["aspect ratio", "proporcao", "resolucao", "16:9", "4:3", "9:16", "tela", "dimensao"],
  },
  {
    id: "contraste_wcag",
    titulo: "Verificador de Contraste WCAG",
    descricao: "Teste acessibilidade de cores e valide conformidade AA e AAA em tempo real.",
    categoria: "design",
    icone: Eye,
    corIcone: "text-emerald-500 bg-emerald-500/10",
    palavrasChave: ["contraste", "wcag", "acessibilidade", "cores", "aa", "aaa", "color", "hex"],
  },

  // ── Texto & Slugs ──
  {
    id: "case_converter",
    titulo: "Conversor de Case & Slugs",
    descricao: "Transforme texto em kebab-case, snake_case, camelCase, slug limpo e MAIÚSCULAS.",
    categoria: "texto",
    icone: Type,
    corIcone: "text-purple-500 bg-purple-500/10",
    palavrasChave: ["case", "slug", "kebab", "snake", "camel", "pascal", "maiusculas", "nomes de arquivo"],
  },
  {
    id: "estatisticas_texto",
    titulo: "Estatísticas & Contador de Palavras",
    descricao: "Contagem de caracteres, palavras, parágrafos, tempo de leitura e densidade.",
    categoria: "texto",
    icone: AlignLeft,
    corIcone: "text-cyan-500 bg-cyan-500/10",
    palavrasChave: ["contador", "caracteres", "palavras", "linhas", "tempo de leitura", "estatisticas"],
  },
  {
    id: "limpador_texto",
    titulo: "Limpador & Formatador de Texto",
    descricao: "Remova quebras duplicadas, espaços extras, acentos e tags HTML.",
    categoria: "texto",
    icone: Trash2,
    corIcone: "text-rose-500 bg-rose-500/10",
    palavrasChave: ["limpar", "formatar", "espacos", "acentos", "html", "quebras"],
  },

  // ── Geradores & Código ──
  {
    id: "qr_code",
    titulo: "Gerador de QR Code Vetorial",
    descricao: "Gere QR Codes personalizáveis com download instantâneo em SVG e PNG.",
    categoria: "geradores",
    icone: QrCode,
    corIcone: "text-pink-500 bg-pink-500/10",
    palavrasChave: ["qr code", "qrcode", "codigo qr", "link", "svg", "png", "vetor"],
  },
  {
    id: "lorem_ipsum",
    titulo: "Gerador de Lorem Ipsum",
    descricao: "Gere texto de preenchimento por parágrafos, frases ou palavras sob medida.",
    categoria: "geradores",
    icone: Sparkles,
    corIcone: "text-indigo-500 bg-indigo-500/10",
    palavrasChave: ["lorem ipsum", "texto falso", "preenchimento", "placeholder", "dummy text"],
  },
  {
    id: "json_formatter",
    titulo: "Formatador & Validador de JSON",
    descricao: "Indente, embeleze ou minifique código JSON com validação instantânea.",
    categoria: "geradores",
    icone: FileCode2,
    corIcone: "text-orange-500 bg-orange-500/10",
    palavrasChave: ["json", "formatar", "minificar", "validar", "indentar", "codigo"],
  },
  {
    id: "hash_base64",
    titulo: "UUID, Base64 & Hash SHA-256",
    descricao: "Gerador de UUID v4, codificador/decodificador Base64 e hash seguro.",
    categoria: "geradores",
    icone: KeyRound,
    corIcone: "text-teal-500 bg-teal-500/10",
    palavrasChave: ["uuid", "base64", "hash", "sha256", "criptografia", "token"],
  },
];

export default function ITTools() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramFerramenta = searchParams.get("ferramenta") || searchParams.get("aba");

  const [ferramentaAtivaId, setFerramentaAtivaId] = useState<string | null>(paramFerramenta);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaITTools>("todas");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (paramFerramenta) {
      setFerramentaAtivaId(paramFerramenta);
    }
  }, [paramFerramenta]);

  const selecionarFerramenta = (id: string | null) => {
    setFerramentaAtivaId(id);
    if (id) {
      setSearchParams({ ferramenta: id });
    } else {
      setSearchParams({});
    }
  };

  const ferramentasFiltradas = useMemo(() => {
    return LISTA_IT_TOOLS.filter((f) => {
      const matchCategoria = categoriaAtiva === "todas" || f.categoria === categoriaAtiva;
      if (!matchCategoria) return false;
      if (!busca.trim()) return true;

      const q = busca.toLowerCase();
      const matchTitulo = f.titulo.toLowerCase().includes(q);
      const matchDesc = f.descricao.toLowerCase().includes(q);
      const matchKeywords = f.palavrasChave.some((k) => k.toLowerCase().includes(q));
      return matchTitulo || matchDesc || matchKeywords;
    });
  }, [categoriaAtiva, busca]);

  const ferramentaAtiva = LISTA_IT_TOOLS.find((f) => f.id === ferramentaAtivaId);

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 md:p-8 space-y-6">
      {/* Cabeçalho da Página */}
      <CabecalhoPagina
        titulo="IT-Tools"
        descricao="Canivete suíço de utilitários rápidos para design, texto, medidas e código."
        icone={<Wrench size={24} className="text-primary" />}
      />

      {/* Se nenhuma ferramenta estiver aberta: Mostra catálogo com filtros */}
      {!ferramentaAtiva ? (
        <div className="space-y-6">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Categorias */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60">
              {[
                { id: "todas", label: "Todas" },
                { id: "design", label: "📐 Design & Medidas" },
                { id: "texto", label: "✍️ Texto & Slugs" },
                { id: "geradores", label: "⚡ Geradores & Código" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCategoriaAtiva(tab.id as CategoriaITTools)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    categoriaAtiva === tab.id
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Input de busca rápida */}
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar ferramenta..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Grid de Ferramentas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ferramentasFiltradas.map((f) => {
              const Icone = f.icone;
              return (
                <div
                  key={f.id}
                  onClick={() => selecionarFerramenta(f.id)}
                  className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border/70 bg-card hover:bg-accent/40 hover:border-border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-105", f.corIcone)}>
                        <Icone size={20} />
                      </div>
                      <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                        {f.categoria}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm text-foreground tracking-tight group-hover:text-primary transition-colors">
                        {f.titulo}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {f.descricao}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-medium text-primary">
                    <span>Abrir ferramenta</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>
              );
            })}

            {ferramentasFiltradas.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
                Nenhuma ferramenta encontrada para &quot;{busca}&quot;.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Se uma ferramenta estiver selecionada: Exibe o painel interativo da ferramenta */
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Topo da Ferramenta com Voltar */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60">
            <button
              onClick={() => selecionarFerramenta(null)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Voltar para todas as ferramentas</span>
            </button>

            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", ferramentaAtiva.corIcone)}>
                <ferramentaAtiva.icone size={16} />
              </div>
              <span className="text-sm font-bold text-foreground">{ferramentaAtiva.titulo}</span>
            </div>
          </div>

          {/* Renderizador do Componente da Ferramenta Ativa */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
            {ferramentaAtiva.id === "conversor_unidades" && <PainelConversorUnidades />}
            {ferramentaAtiva.id === "aspect_ratio" && <PainelAspectRatio />}
            {ferramentaAtiva.id === "contraste_wcag" && <PainelContrasteWCAG />}
            {ferramentaAtiva.id === "case_converter" && <PainelCaseConverter />}
            {ferramentaAtiva.id === "estatisticas_texto" && <PainelEstatisticasTexto />}
            {ferramentaAtiva.id === "limpador_texto" && <PainelLimpadorTexto />}
            {ferramentaAtiva.id === "qr_code" && <PainelQRCode />}
            {ferramentaAtiva.id === "lorem_ipsum" && <PainelLoremIpsum />}
            {ferramentaAtiva.id === "json_formatter" && <PainelJSONFormatter />}
            {ferramentaAtiva.id === "hash_base64" && <PainelHashBase64 />}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES INDIVIDUAIS DE CADA FERRAMENTA DO IT-TOOLS
// ─────────────────────────────────────────────────────────────────────────────

/** 1. Conversor de Unidades */
function PainelConversorUnidades() {
  const [valor, setValor] = useState<number>(16);
  const [unidade, setUnidade] = useState<UnidadeMedida>("px");
  const [basePx, setBasePx] = useState<number>(16);

  const res = useMemo(() => {
    return converterUnidades(valor, unidade, basePx);
  }, [valor, unidade, basePx]);

  const copiar = (texto: string, rotulo: string) => {
    navigator.clipboard.writeText(texto);
    toast(`Copiado: ${texto} (${rotulo})`, { tipo: "sucesso" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Valor de Entrada</label>
          <input
            type="number"
            value={valor}
            onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Unidade de Origem</label>
          <select
            value={unidade}
            onChange={(e) => setUnidade(e.target.value as UnidadeMedida)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
          >
            <option value="px">Pixels (px)</option>
            <option value="rem">REM (rem)</option>
            <option value="em">EM (em)</option>
            <option value="pt">Pontos (pt)</option>
            <option value="cm">Centímetros (cm)</option>
            <option value="mm">Milímetros (mm)</option>
            <option value="in">Polegadas (in)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Tamanho Base (1rem = px)</label>
          <input
            type="number"
            value={basePx}
            onChange={(e) => setBasePx(parseFloat(e.target.value) || 16)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border/60">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Conversões Calculadas (Clique para copiar)
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { rotulo: "Pixels", valorStr: `${res.px}px` },
            { rotulo: "REM", valorStr: `${res.rem}rem` },
            { rotulo: "EM", valorStr: `${res.em}em` },
            { rotulo: "Pontos", valorStr: `${res.pt}pt` },
            { rotulo: "Centímetros", valorStr: `${res.cm}cm` },
            { rotulo: "Milímetros", valorStr: `${res.mm}mm` },
            { rotulo: "Polegadas", valorStr: `${res.in}in` },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => copiar(item.valorStr, item.rotulo)}
              className="p-3.5 rounded-xl border border-border bg-background/60 hover:bg-accent hover:border-border transition-all flex flex-col justify-between text-left group cursor-pointer"
            >
              <span className="text-[11px] text-muted-foreground font-medium">{item.rotulo}</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-base font-bold font-mono text-foreground group-hover:text-primary transition-colors">
                  {item.valorStr}
                </span>
                <Copy size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 2. Aspect Ratio */
function PainelAspectRatio() {
  const [larguraOriginal, setLarguraOriginal] = useState<number>(16);
  const [alturaOriginal, setAlturaOriginal] = useState<number>(9);
  const [novaLargura, setNovaLargura] = useState<number>(1920);

  const res = useMemo(() => {
    return calcularAspectRatio(larguraOriginal, alturaOriginal, novaLargura);
  }, [larguraOriginal, alturaOriginal, novaLargura]);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Presets Rápidos */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-2">Proporções Comuns</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS_ASPECT_RATIO.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setLarguraOriginal(p.largura);
                setAlturaOriginal(p.altura);
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer",
                larguraOriginal === p.largura && alturaOriginal === p.altura
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Proporção (Largura)</label>
          <input
            type="number"
            value={larguraOriginal}
            onChange={(e) => setLarguraOriginal(parseFloat(e.target.value) || 1)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono text-foreground"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Proporção (Altura)</label>
          <input
            type="number"
            value={alturaOriginal}
            onChange={(e) => setAlturaOriginal(parseFloat(e.target.value) || 1)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono text-foreground"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Largura Desejada (px)</label>
          <input
            type="number"
            value={novaLargura}
            onChange={(e) => setNovaLargura(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono text-foreground"
          />
        </div>
      </div>

      {/* Resultado & Preview */}
      <div className="p-4 rounded-xl border border-border/80 bg-background flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <p className="text-xs text-muted-foreground">Dimensão Resultante</p>
          <p className="text-2xl font-bold font-mono text-primary">
            {res.largura}px × {res.altura}px
          </p>
          <p className="text-xs text-muted-foreground">
            Formato: <span className="font-semibold text-foreground">{res.formatoSimplificado}</span> (Razão: {res.razao})
          </p>
        </div>

        {/* Mini Preview Gráfico */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            className="rounded-lg border-2 border-primary/50 bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary transition-all max-w-[140px] max-h-[100px]"
            style={{
              aspectRatio: `${res.largura} / ${res.altura}`,
              width: "120px",
            }}
          >
            {res.formatoSimplificado}
          </div>
          <span className="text-[10px] text-muted-foreground">Prévia visual</span>
        </div>
      </div>
    </div>
  );
}

/** 3. Contraste WCAG */
function PainelContrasteWCAG() {
  const [corTexto, setCorTexto] = useState("#000000");
  const [corFundo, setCorFundo] = useState("#ffffff");

  const res = useMemo(() => {
    return verificarContrasteWCAG(corTexto, corFundo);
  }, [corTexto, corFundo]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Cor do Texto (HEX)</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={corTexto}
              onChange={(e) => setCorTexto(e.target.value)}
              className="h-10 w-12 rounded-xl border border-border p-1 bg-background cursor-pointer"
            />
            <input
              type="text"
              value={corTexto}
              onChange={(e) => setCorTexto(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono text-foreground"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Cor do Fundo (HEX)</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={corFundo}
              onChange={(e) => setCorFundo(e.target.value)}
              className="h-10 w-12 rounded-xl border border-border p-1 bg-background cursor-pointer"
            />
            <input
              type="text"
              value={corFundo}
              onChange={(e) => setCorFundo(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Box de Exibição com as cores aplicadas */}
      <div
        className="p-6 rounded-2xl border border-border shadow-xs flex flex-col items-center justify-center text-center space-y-2 transition-colors"
        style={{ backgroundColor: corFundo, color: corTexto }}
      >
        <span className="text-3xl font-extrabold tracking-tight">Klaus Design System</span>
        <span className="text-sm opacity-90 max-w-md">
          Este é um exemplo ao vivo de como seu texto e contraste ficam para os usuários.
        </span>
      </div>

      {/* Resultados dos Padrões WCAG */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-3.5 rounded-xl border border-border bg-background flex flex-col justify-between">
          <span className="text-[11px] text-muted-foreground">Taxa de Contraste</span>
          <span className="text-xl font-bold font-mono text-foreground mt-1">{res.ratio}:1</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-background flex flex-col justify-between">
          <span className="text-[11px] text-muted-foreground">Texto Normal (AA)</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", res.textoNormalAA ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
              {res.textoNormalAA ? "✓ Aprovado" : "✕ Reprovado"}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-background flex flex-col justify-between">
          <span className="text-[11px] text-muted-foreground">Texto Normal (AAA)</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", res.textoNormalAAA ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
              {res.textoNormalAAA ? "✓ Aprovado" : "✕ Reprovado"}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-background flex flex-col justify-between">
          <span className="text-[11px] text-muted-foreground">Texto Grande (AA)</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", res.textoGrandeAA ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
              {res.textoGrandeAA ? "✓ Aprovado" : "✕ Reprovado"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 4. Case Converter & Slugs */
function PainelCaseConverter() {
  const [texto, setTexto] = useState("Design de Interface e Sistema de Tokens 2026");

  const cases = useMemo(() => {
    return converterTextoCases(texto);
  }, [texto]);

  const copiar = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    toast(`Copiado: ${label}`, { tipo: "sucesso" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Texto de Entrada</label>
        <textarea
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite seu texto aqui..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: "kebab-case", val: cases.kebabCase },
          { label: "snake_case", val: cases.snakeCase },
          { label: "camelCase", val: cases.camelCase },
          { label: "PascalCase", val: cases.pascalCase },
          { label: "CONSTANT_CASE", val: cases.constantCase },
          { label: "Slug para Arquivo", val: cases.slugLimpo },
          { label: "Title Case", val: cases.titleCase },
          { label: "MAIÚSCULAS", val: cases.maiusculas },
        ].map((item, idx) => (
          <div
            key={idx}
            onClick={() => copiar(item.val, item.label)}
            className="p-3 rounded-xl border border-border bg-background/60 hover:bg-accent transition-all cursor-pointer flex items-center justify-between gap-3 group"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">{item.label}</span>
              <p className="text-xs font-mono font-bold text-foreground truncate mt-0.5 group-hover:text-primary transition-colors">
                {item.val || "—"}
              </p>
            </div>
            <Copy size={14} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 5. Estatísticas de Texto */
function PainelEstatisticasTexto() {
  const [texto, setTexto] = useState(
    "O Klaus é um segundo cérebro elegante e poderoso construído para designers gráficos e profissionais que valorizam foco, clareza e produtividade máxima."
  );

  const stats = useMemo(() => {
    return analisarEstatisticasTexto(texto);
  }, [texto]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Insira o Texto para Análise</label>
        <textarea
          rows={6}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole seu texto ou artigo aqui..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-background">
          <span className="text-[11px] text-muted-foreground">Palavras</span>
          <p className="text-xl font-bold font-mono text-primary mt-1">{stats.palavras}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-background">
          <span className="text-[11px] text-muted-foreground">Caracteres (Total)</span>
          <p className="text-xl font-bold font-mono text-foreground mt-1">{stats.caracteresTotal}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-background">
          <span className="text-[11px] text-muted-foreground">Sem Espaços</span>
          <p className="text-xl font-bold font-mono text-foreground mt-1">{stats.caracteresSemEspaco}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-background">
          <span className="text-[11px] text-muted-foreground">Tempo de Leitura</span>
          <p className="text-xl font-bold font-mono text-foreground mt-1">~{stats.tempoLeituraMinutos} min</p>
        </div>
      </div>

      {stats.palavrasFrequentes.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-2">Palavras Mais Frequentes</label>
          <div className="flex flex-wrap gap-2">
            {stats.palavrasFrequentes.map((item, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium">
                <span className="text-foreground">{item.palavra}</span>{" "}
                <span className="text-muted-foreground text-[10px]">({item.contagem}x)</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 6. Limpador de Texto */
function PainelLimpadorTexto() {
  const [entrada, setEntrada] = useState("");
  const [opcoes, setOpcoes] = useState({
    removerEspacosExtras: true,
    removerQuebrasDuplicadas: true,
    removerAcentos: false,
    removerHtmlTags: true,
    removerLinhasVazias: false,
  });

  const saida = useMemo(() => {
    return limparTexto(entrada, opcoes);
  }, [entrada, opcoes]);

  const copiar = () => {
    navigator.clipboard.writeText(saida);
    toast("Texto limpo copiado!", { tipo: "sucesso" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Texto Original</label>
          <textarea
            rows={7}
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            placeholder="Cole o texto sujo aqui..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Resultado Limpo</label>
            <button
              onClick={copiar}
              disabled={!saida}
              className="text-xs text-primary hover:underline font-medium cursor-pointer disabled:opacity-50"
            >
              Copiar resultado
            </button>
          </div>
          <textarea
            rows={7}
            readOnly
            value={saida}
            placeholder="O resultado aparecerá aqui..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground font-mono"
          />
        </div>
      </div>

      {/* Checkboxes de opções */}
      <div className="p-4 rounded-xl border border-border/80 bg-background/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { key: "removerEspacosExtras", label: "Remover espaços duplos" },
          { key: "removerQuebrasDuplicadas", label: "Remover quebras excessivas" },
          { key: "removerHtmlTags", label: "Remover tags HTML (<p>, etc.)" },
          { key: "removerAcentos", label: "Remover acentuação" },
          { key: "removerLinhasVazias", label: "Remover linhas vazias" },
        ].map((op) => (
          <label key={op.key} className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={(opcoes as any)[op.key]}
              onChange={(e) => setOpcoes((prev) => ({ ...prev, [op.key]: e.target.checked }))}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>{op.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** 7. QR Code Vetorial */
function PainelQRCode() {
  const [texto, setTexto] = useState("https://klaus.app");
  const [corFrente, setCorFrente] = useState("#000000");
  const [corFundo, setCorFundo] = useState("#ffffff");
  const [svgStr, setSvgStr] = useState("");
  const [pngDataUrl, setPngDataUrl] = useState("");

  useEffect(() => {
    let cancelado = false;
    gerarSvgQrCode(texto, corFrente, corFundo, 280).then((res) => {
      if (!cancelado) setSvgStr(res);
    });
    gerarPngDataUrlQrCode(texto, corFrente, corFundo, 600).then((res) => {
      if (!cancelado) setPngDataUrl(res);
    });
    return () => {
      cancelado = true;
    };
  }, [texto, corFrente, corFundo]);

  const baixarSVG = () => {
    if (!svgStr) return;
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode-klaus.svg";
    a.click();
    URL.revokeObjectURL(url);
    toast("QR Code baixado em SVG!", { tipo: "sucesso" });
  };

  const baixarPNG = () => {
    if (!pngDataUrl) return;
    const a = document.createElement("a");
    a.href = pngDataUrl;
    a.download = "qrcode-klaus.png";
    a.click();
    toast("QR Code baixado em PNG de alta resolução!", { tipo: "sucesso" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Conteúdo / URL do QR Code</label>
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite o link ou texto..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Cor do Código</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={corFrente}
                  onChange={(e) => setCorFrente(e.target.value)}
                  className="h-9 w-10 rounded-lg border border-border p-1 bg-background cursor-pointer"
                />
                <input
                  type="text"
                  value={corFrente}
                  onChange={(e) => setCorFrente(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Cor do Fundo</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={corFundo}
                  onChange={(e) => setCorFundo(e.target.value)}
                  className="h-9 w-10 rounded-lg border border-border p-1 bg-background cursor-pointer"
                />
                <input
                  type="text"
                  value={corFundo}
                  onChange={(e) => setCorFundo(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={baixarSVG}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Download size={14} /> Baixar SVG Vetorial
            </button>
            <button
              onClick={baixarPNG}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background text-foreground font-medium text-xs hover:bg-accent transition-colors cursor-pointer"
            >
              <Download size={14} /> Baixar PNG
            </button>
          </div>
        </div>

        {/* Visualizador do QR Code */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-border bg-background/50">
          <div
            className="p-4 rounded-xl border border-border/80 shadow-xs"
            style={{ backgroundColor: corFundo }}
            dangerouslySetInnerHTML={{ __html: svgStr }}
          />
          <span className="text-xs text-muted-foreground mt-3 font-medium">Prévia ISO 100% Escaneável</span>
        </div>
      </div>
    </div>
  );
}

/** 8. Lorem Ipsum */
function PainelLoremIpsum() {
  const [qtd, setQtd] = useState(3);
  const [tipo, setTipo] = useState<"paragrafos" | "frases" | "palavras">("paragrafos");
  const [textoGerado, setTextoGerado] = useState(() => gerarLoremIpsum(3, "paragrafos"));

  const regerar = () => {
    setTextoGerado(gerarLoremIpsum(qtd, tipo));
  };

  const copiar = () => {
    navigator.clipboard.writeText(textoGerado);
    toast("Lorem Ipsum copiado!", { tipo: "sucesso" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Quantidade</label>
          <input
            type="number"
            min={1}
            max={50}
            value={qtd}
            onChange={(e) => setQtd(parseInt(e.target.value, 10) || 1)}
            className="w-24 px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono text-foreground"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground"
          >
            <option value="paragrafos">Parágrafos</option>
            <option value="frases">Frases</option>
            <option value="palavras">Palavras</option>
          </select>
        </div>

        <button
          onClick={regerar}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground hover:bg-accent transition-colors cursor-pointer"
        >
          <RefreshCw size={13} /> Gerar Novo
        </button>

        <button
          onClick={copiar}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Copy size={13} /> Copiar Texto
        </button>
      </div>

      <textarea
        rows={8}
        readOnly
        value={textoGerado}
        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground leading-relaxed font-serif"
      />
    </div>
  );
}

/** 9. JSON Formatter */
function PainelJSONFormatter() {
  const [codigo, setCodigo] = useState('{"projeto":"Klaus","versao":2.9,"status":"ativo","tags":["design","produtividade"]}');

  const resultadoFormatado = useMemo(() => {
    return formatarJSON(codigo, 2);
  }, [codigo]);

  const aplicarFormatacao = () => {
    if (resultadoFormatado.valido) {
      setCodigo(resultadoFormatado.formatado);
      toast("JSON formatado com sucesso!", { tipo: "sucesso" });
    } else {
      toast("Erro na formatação: JSON inválido.", { tipo: "erro" });
    }
  };

  const aplicarMinificacao = () => {
    const res = minificarJSON(codigo);
    if (res.valido) {
      setCodigo(res.minificado);
      toast("JSON minificado com sucesso!", { tipo: "sucesso" });
    } else {
      toast("Erro na minificação: JSON inválido.", { tipo: "erro" });
    }
  };

  const copiar = () => {
    navigator.clipboard.writeText(codigo);
    toast("JSON copiado!", { tipo: "sucesso" });
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[11px] font-bold px-2 py-0.5 rounded-md",
              resultadoFormatado.valido ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}
          >
            {resultadoFormatado.valido ? "✓ JSON Válido" : `✕ ${resultadoFormatado.erro}`}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={aplicarFormatacao}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-accent transition-colors cursor-pointer"
          >
            Embelezar (Indent 2)
          </button>
          <button
            onClick={aplicarMinificacao}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-accent transition-colors cursor-pointer"
          >
            Minificar
          </button>
          <button
            onClick={copiar}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Copiar
          </button>
        </div>
      </div>

      <textarea
        rows={10}
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="Cole seu JSON aqui..."
        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background font-mono text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

/** 10. UUID, Base64 & Hash */
function PainelHashBase64() {
  const [uuid, setUuid] = useState(() => gerarUUID());
  const [textoEntrada, setTextoEntrada] = useState("Segundo Cérebro Klaus");
  const [base64, setBase64] = useState(() => textoParaBase64("Segundo Cérebro Klaus"));
  const [hash, setHash] = useState("");

  useEffect(() => {
    gerarHashSHA256(textoEntrada).then(setHash);
  }, [textoEntrada]);

  const handleTextoChange = (t: string) => {
    setTextoEntrada(t);
    setBase64(textoParaBase64(t));
  };

  const handleBase64Change = (b: string) => {
    setBase64(b);
    setTextoEntrada(base64ParaTexto(b));
  };

  const copiar = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    toast(`Copiado: ${label}`, { tipo: "sucesso" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Gerador de UUID */}
      <div className="p-4 rounded-xl border border-border bg-background/50 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">Gerador de UUID v4</label>
          <button
            onClick={() => setUuid(gerarUUID())}
            className="text-xs text-primary hover:underline font-medium cursor-pointer"
          >
            Gerar outro
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={uuid}
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs text-foreground"
          />
          <button
            onClick={() => copiar(uuid, "UUID")}
            className="p-2 rounded-xl border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>

      {/* Codificador Base64 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Texto Puro</label>
          <textarea
            rows={4}
            value={textoEntrada}
            onChange={(e) => handleTextoChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Base64 Codificado</label>
            <button
              onClick={() => copiar(base64, "Base64")}
              className="text-[11px] text-primary hover:underline cursor-pointer"
            >
              Copiar Base64
            </button>
          </div>
          <textarea
            rows={4}
            value={base64}
            onChange={(e) => handleBase64Change(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Hash SHA-256 */}
      <div className="p-4 rounded-xl border border-border bg-background/50 space-y-2">
        <label className="text-xs font-semibold text-muted-foreground block">Hash SHA-256 do Texto</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={hash}
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs text-foreground truncate"
          />
          <button
            onClick={() => copiar(hash, "Hash SHA-256")}
            className="p-2 rounded-xl border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
