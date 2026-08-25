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
  placeholder: string;
  descricao?: string;
  tipo?: "text" | "date";
  exemplo?: string;
}

export const MOTORES_BUSCA: {
  id: WebSearchEngine;
  nome: string;
  urlBase: string;
  placeholder: string;
}[] = [
  {
    id: "google",
    nome: "Google",
    urlBase: "https://www.google.com/search?q=",
    placeholder: "Pesquisar no Google com operadores...",
  },
  {
    id: "bing",
    nome: "Bing",
    urlBase: "https://www.bing.com/search?q=",
    placeholder: "Pesquisar no Bing com operadores...",
  },
  {
    id: "duckduckgo",
    nome: "DuckDuckGo",
    urlBase: "https://duckduckgo.com/?q=",
    placeholder: "Pesquisar no DuckDuckGo com operadores...",
  },
];

export const FILTROS_PRINCIPAIS: InfoCampoFiltro[] = [
  {
    chave: "site",
    rotulo: "Site Específico",
    placeholder: "ex: github.com ou wikipedia.org",
    exemplo: "site:github.com",
  },
  {
    chave: "filetype",
    rotulo: "Tipo de Arquivo",
    placeholder: "ex: pdf, docx, svg, json",
    exemplo: "filetype:pdf",
  },
  {
    chave: "exata",
    rotulo: "Palavra/Frase Exata",
    placeholder: "ex: design system token",
    exemplo: '"design system"',
  },
  {
    chave: "excluir",
    rotulo: "Excluir Palavra",
    placeholder: "ex: wordpress ou anuncio",
    exemplo: "-wordpress",
  },
];

export const FILTROS_EXTRAS_POR_MOTOR: Record<WebSearchEngine, InfoCampoFiltro[]> = {
  google: [
    {
      chave: "intitle",
      rotulo: "Título da Página",
      placeholder: "ex: tutorial react",
      exemplo: "intitle:react",
    },
    {
      chave: "inurl",
      rotulo: "URL da Página",
      placeholder: "ex: blog ou docs",
      exemplo: "inurl:blog",
    },
    {
      chave: "intext",
      rotulo: "Texto da Página",
      placeholder: "ex: arquitetura de software",
      exemplo: "intext:arquitetura",
    },
    {
      chave: "before",
      rotulo: "Antes da Data",
      placeholder: "YYYY-MM-DD",
      tipo: "date",
      exemplo: "before:2025-01-01",
    },
    {
      chave: "after",
      rotulo: "Depois da Data",
      placeholder: "YYYY-MM-DD",
      tipo: "date",
      exemplo: "after:2024-01-01",
    },
  ],
  bing: [
    {
      chave: "intitle",
      rotulo: "Título da Página",
      placeholder: "ex: relatorio anual",
      exemplo: "intitle:relatorio",
    },
    {
      chave: "inbody",
      rotulo: "Corpo da Página",
      placeholder: "ex: guia completo",
      exemplo: "inbody:guia",
    },
    {
      chave: "loc",
      rotulo: "Região/Local",
      placeholder: "ex: br ou us",
      exemplo: "loc:br",
    },
  ],
  duckduckgo: [
    {
      chave: "intitle",
      rotulo: "Título da Página",
      placeholder: "ex: documentacao",
      exemplo: "intitle:documentacao",
    },
    {
      chave: "inurl",
      rotulo: "URL da Página",
      placeholder: "ex: dev ou api",
      exemplo: "inurl:api",
    },
    {
      chave: "inbody",
      rotulo: "Corpo da Página",
      placeholder: "ex: seguranca",
      exemplo: "inbody:seguranca",
    },
  ],
};

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
