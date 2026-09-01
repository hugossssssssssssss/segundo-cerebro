import { useState, useEffect, useCallback } from "react";
import { lerConfig, salvarConfig } from "@/lib/settings";

export type WebSearchEngine = "google" | "bing" | "duckduckgo";

export interface WebSearchFilters {
  // Categorias Principais (suportadas por todos)
  site?: string;
  filetype?: string;
  exata?: string;
  excluir?: string;

  // Google
  intext?: string;
  before?: string;
  after?: string;

  // Bing / DuckDuckGo / Google compartilhados
  intitle?: string;
  inurl?: string;
  inbody?: string;
  loc?: string;
}

export interface InfoCampoFiltro {
  chave: keyof WebSearchFilters;
  rotulo: string;
  dica: string;
  placeholder: string;
  tipo?: "text" | "date";
  exemplo: string;
  iconeNome?: string;
}

export const MOTORES_BUSCA: {
  id: WebSearchEngine;
  nome: string;
  urlBase: string;
  placeholder: string;
  descricao: string;
  corAcento: string;
}[] = [
  {
    id: "google",
    nome: "Google",
    urlBase: "https://www.google.com/search?q=",
    placeholder: "O que você deseja pesquisar na web?",
    descricao: "Maior acervo de resultados e maior suporte a filtros de data e texto.",
    corAcento: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  },
  {
    id: "bing",
    nome: "Bing",
    urlBase: "https://www.bing.com/search?q=",
    placeholder: "Pesquise no Bing com filtros inteligentes...",
    descricao: "Excelente para buscas acadêmicas, técnicas e segmentação geográfica.",
    corAcento: "text-teal-500 bg-teal-500/10 border-teal-500/30",
  },
  {
    id: "duckduckgo",
    nome: "DuckDuckGo",
    urlBase: "https://duckduckgo.com/?q=",
    placeholder: "Pesquise com privacidade no DuckDuckGo...",
    descricao: "Foco em privacidade, sem rastreamento ou bolha de resultados.",
    corAcento: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  },
];

export const FILTROS_PRINCIPAIS: InfoCampoFiltro[] = [
  {
    chave: "site",
    rotulo: "Apenas neste site ou domínio",
    dica: "Limita a busca a um único portal (ex: buscar só no GitHub ou Wikipédia)",
    placeholder: "ex: github.com, wikipedia.org, gov.br",
    exemplo: "site:github.com",
    iconeNome: "Globe",
  },
  {
    chave: "filetype",
    rotulo: "Tipo / Formato de arquivo",
    dica: "Filtra apenas documentos disponíveis para download direto",
    placeholder: "ex: pdf, docx, xlsx, svg, json",
    exemplo: "filetype:pdf",
    iconeNome: "FileText",
  },
  {
    chave: "exata",
    rotulo: "Frase ou expressão exata",
    dica: "O buscador só trará páginas que contenham este texto exatamente nessa ordem",
    placeholder: 'ex: "design tokens" ou "inteligência artificial"',
    exemplo: '"design system"',
    iconeNome: "Target",
  },
  {
    chave: "excluir",
    rotulo: "Excluir estas palavras",
    dica: "Ignora qualquer página que contenha os termos digitados aqui",
    placeholder: "ex: anuncio patrocinado comprar",
    exemplo: "-anuncio",
    iconeNome: "MinusCircle",
  },
];

export const FILTROS_EXTRAS_POR_MOTOR: Record<WebSearchEngine, InfoCampoFiltro[]> = {
  google: [
    {
      chave: "intitle",
      rotulo: "Aparece no Título da página",
      dica: "A palavra deve estar destacada no título principal da aba",
      placeholder: "ex: react tutorial",
      exemplo: "intitle:react",
      iconeNome: "Heading",
    },
    {
      chave: "inurl",
      rotulo: "Aparece no Link / URL",
      dica: "O endereço da página precisa conter este caminho",
      placeholder: "ex: blog, docs, release",
      exemplo: "inurl:docs",
      iconeNome: "Link",
    },
    {
      chave: "intext",
      rotulo: "Aparece no Corpo do texto",
      dica: "Obriga que o termo esteja dentro do artigo ou conteúdo",
      placeholder: "ex: arquitetura de software",
      exemplo: "intext:arquitetura",
      iconeNome: "AlignLeft",
    },
    {
      chave: "after",
      rotulo: "Publicado Depois de",
      dica: "Resultados mais recentes que esta data",
      placeholder: "AAAA-MM-DD",
      tipo: "date",
      exemplo: "after:2024-01-01",
      iconeNome: "Calendar",
    },
    {
      chave: "before",
      rotulo: "Publicado Antes de",
      dica: "Resultados históricos anteriores a esta data",
      placeholder: "AAAA-MM-DD",
      tipo: "date",
      exemplo: "before:2025-01-01",
      iconeNome: "Calendar",
    },
  ],
  bing: [
    {
      chave: "intitle",
      rotulo: "Aparece no Título da página",
      dica: "O título da página no Bing precisa ter este termo",
      placeholder: "ex: relatorio financeiro",
      exemplo: "intitle:relatorio",
      iconeNome: "Heading",
    },
    {
      chave: "inbody",
      rotulo: "Aparece no Corpo da página",
      dica: "O texto principal do site precisa conter a palavra",
      placeholder: "ex: guia completo",
      exemplo: "inbody:guia",
      iconeNome: "AlignLeft",
    },
    {
      chave: "loc",
      rotulo: "Região / País dos resultados",
      dica: "Prioriza páginas de um país específico (ex: br para Brasil, us para EUA)",
      placeholder: "ex: br, us, pt, uk",
      exemplo: "loc:br",
      iconeNome: "MapPin",
    },
  ],
  duckduckgo: [
    {
      chave: "intitle",
      rotulo: "Aparece no Título da página",
      dica: "A palavra deve estar presente no título da página",
      placeholder: "ex: documentacao oficial",
      exemplo: "intitle:documentacao",
      iconeNome: "Heading",
    },
    {
      chave: "inurl",
      rotulo: "Aparece na URL / Link",
      dica: "O endereço web precisa conter este trecho",
      placeholder: "ex: api, tutorial",
      exemplo: "inurl:api",
      iconeNome: "Link",
    },
    {
      chave: "inbody",
      rotulo: "Aparece no Corpo da página",
      dica: "O texto interno da página deve conter o termo",
      placeholder: "ex: seguranca",
      exemplo: "inbody:seguranca",
      iconeNome: "AlignLeft",
    },
  ],
};

export interface AtalhoDorkRapido {
  rotulo: string;
  icone: string;
  filtros: Partial<WebSearchFilters>;
}

export const ATALHOS_DORKS_RAPIDOS: AtalhoDorkRapido[] = [
  {
    rotulo: "Documentos em PDF",
    icone: "FileText",
    filtros: { filetype: "pdf" },
  },
  {
    rotulo: "Repositórios GitHub",
    icone: "Code",
    filtros: { site: "github.com" },
  },
  {
    rotulo: "Artigos da Wikipédia",
    icone: "BookOpen",
    filtros: { site: "wikipedia.org" },
  },
  {
    rotulo: "Planilhas Excel",
    icone: "FileSpreadsheet",
    filtros: { filetype: "xlsx" },
  },
  {
    rotulo: "Apresentações PPT",
    icone: "Presentation",
    filtros: { filetype: "pptx" },
  },
];

/**
 * Retorna as chaves de filtros suportadas pelo motor selecionado.
 */
export function obterChavesSuportadas(motor: WebSearchEngine): (keyof WebSearchFilters)[] {
  const principais: (keyof WebSearchFilters)[] = ["site", "filetype", "exata", "excluir"];
  const extras = FILTROS_EXTRAS_POR_MOTOR[motor].map((f) => f.chave);
  return [...principais, ...extras];
}

/**
 * Constrói a string de query com todos os operadores aplicáveis para o motor de busca.
 */
export function construirQueryWeb(
  termo: string,
  filtros: WebSearchFilters,
  motor: WebSearchEngine
): string {
  const partes: string[] = [];
  const termoLimpo = termo.trim();
  if (termoLimpo) {
    partes.push(termoLimpo);
  }

  const chavesValidas = new Set(obterChavesSuportadas(motor));

  // 1. Filtros Principais
  if (filtros.site?.trim() && chavesValidas.has("site")) {
    const val = filtros.site.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (val) partes.push(`site:${val}`);
  }

  if (filtros.filetype?.trim() && chavesValidas.has("filetype")) {
    const val = filtros.filetype.trim().replace(/^\./, "");
    if (val) partes.push(`filetype:${val}`);
  }

  if (filtros.exata?.trim() && chavesValidas.has("exata")) {
    const val = filtros.exata.trim().replace(/^"+|"+$/g, "");
    if (val) partes.push(`"${val}"`);
  }

  if (filtros.excluir?.trim() && chavesValidas.has("excluir")) {
    const palavras = filtros.excluir.trim().split(/\s+/);
    for (const p of palavras) {
      const semHifen = p.replace(/^-+/, "");
      if (semHifen) partes.push(`-${semHifen}`);
    }
  }

  // 2. Filtros Extras específicos por motor
  if (filtros.intitle?.trim() && chavesValidas.has("intitle")) {
    partes.push(`intitle:${filtros.intitle.trim()}`);
  }

  if (filtros.inurl?.trim() && chavesValidas.has("inurl")) {
    partes.push(`inurl:${filtros.inurl.trim()}`);
  }

  if (filtros.intext?.trim() && chavesValidas.has("intext")) {
    partes.push(`intext:${filtros.intext.trim()}`);
  }

  if (filtros.inbody?.trim() && chavesValidas.has("inbody")) {
    partes.push(`inbody:${filtros.inbody.trim()}`);
  }

  if (filtros.loc?.trim() && chavesValidas.has("loc")) {
    partes.push(`loc:${filtros.loc.trim()}`);
  }

  if (filtros.before?.trim() && chavesValidas.has("before")) {
    partes.push(`before:${filtros.before.trim()}`);
  }

  if (filtros.after?.trim() && chavesValidas.has("after")) {
    partes.push(`after:${filtros.after.trim()}`);
  }

  return partes.join(" ");
}

/**
 * Gera a URL final para onde o navegador será redirecionado.
 */
export function gerarUrlBuscaWeb(
  termo: string,
  filtros: WebSearchFilters,
  motor: WebSearchEngine
): string {
  const query = construirQueryWeb(termo, filtros, motor);
  const infoMotor = MOTORES_BUSCA.find((m) => m.id === motor) || MOTORES_BUSCA[0];
  return `${infoMotor.urlBase}${encodeURIComponent(query)}`;
}

/**
 * Redireciona a aba atual do navegador para os resultados de busca.
 */
export function executarBuscaWeb(
  termo: string,
  filtros: WebSearchFilters,
  motor: WebSearchEngine
): void {
  const url = gerarUrlBuscaWeb(termo, filtros, motor);
  if (typeof window !== "undefined") {
    window.location.href = url;
  }
}

/**
 * Conta quantos filtros estão atualmente preenchidos e são compatíveis com o motor.
 */
export function contarFiltrosAtivos(
  filtros: WebSearchFilters,
  motor: WebSearchEngine
): number {
  const chavesValidas = obterChavesSuportadas(motor);
  let total = 0;
  for (const chave of chavesValidas) {
    if (filtros[chave] && filtros[chave]!.trim().length > 0) {
      total++;
    }
  }
  return total;
}

// ── PERSISTÊNCIA & SINCRONIZAÇÃO EM TEMPO REAL ───────────────────────────────

export const EVENTO_BUSCADOR_WEB_ALTERADO = "klaus:web-search-engine-alterado";

export function obterMotorBuscaWeb(): WebSearchEngine {
  const cfg = lerConfig();
  const motor = cfg.defaultWebSearchEngine;
  if (motor === "google" || motor === "bing" || motor === "duckduckgo") {
    return motor;
  }
  return "google";
}

export function salvarMotorBuscaWeb(novoMotor: WebSearchEngine): void {
  const cfg = lerConfig();
  if (cfg.defaultWebSearchEngine === novoMotor) return;

  salvarConfig({
    ...cfg,
    defaultWebSearchEngine: novoMotor,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENTO_BUSCADOR_WEB_ALTERADO, { detail: novoMotor })
    );
  }
}

/**
 * Hook do React para gerenciar o motor de busca padrão com sincronização
 * instantânea entre diferentes componentes da interface (Home e Header).
 */
export function useMotorBuscaWeb(): [WebSearchEngine, (novo: WebSearchEngine) => void] {
  const [motor, setMotor] = useState<WebSearchEngine>(obterMotorBuscaWeb);

  useEffect(() => {
    const aoMudar = (e: Event) => {
      const customEvent = e as CustomEvent<WebSearchEngine>;
      if (customEvent.detail) {
        setMotor(customEvent.detail);
      } else {
        setMotor(obterMotorBuscaWeb());
      }
    };

    window.addEventListener(EVENTO_BUSCADOR_WEB_ALTERADO, aoMudar);
    window.addEventListener("storage", aoMudar);

    return () => {
      window.removeEventListener(EVENTO_BUSCADOR_WEB_ALTERADO, aoMudar);
      window.removeEventListener("storage", aoMudar);
    };
  }, []);

  const atualizarMotor = useCallback((novo: WebSearchEngine) => {
    salvarMotorBuscaWeb(novo);
    setMotor(novo);
  }, []);

  return [motor, atualizarMotor];
}
