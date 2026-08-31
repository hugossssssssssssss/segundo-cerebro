/**
 * Captura de página da web, em Markdown limpo.
 *
 * Duas partes, na mesma ordem que o Web Clipper oficial do Obsidian
 * (github.com/obsidianmd/obsidian-clipper, MIT) faz:
 *
 * 1. **Readability + Turndown** tiram menu, banner e rodapé e devolvem só o
 *    artigo, já em Markdown.
 * 2. **Metadados e modelos** pegam autor, data e descrição do cabeçalho da
 *    página e os encaixam num molde com `{{variáveis}}`.
 *
 * O passo 2 é o que faltava: sem ele a captura chegava sem autor nem data, e
 * um link salvo em janeiro virava um texto órfão em julho.
 */

import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { sanitizarHTML } from "./sanitizer";

/* -------------------------------------------------------------- metadados */

export type Metadados = {
  titulo: string;
  autor?: string;
  /** Data de publicação em AAAA-MM-DD */
  publicado?: string;
  descricao?: string;
  imagem?: string;
  /** Só o domínio, ex: "smashingmagazine.com" */
  dominio?: string;
  url?: string;
};

/** Lê `<meta name="x">` ou `<meta property="x">`, o que existir. */
function meta(doc: Document, nome: string): string | undefined {
  const el =
    doc.querySelector(`meta[property="${nome}"]`) ??
    doc.querySelector(`meta[name="${nome}"]`);
  return el?.getAttribute("content")?.trim() || undefined;
}

/** Normaliza qualquer data reconhecível para AAAA-MM-DD. */
export function comoData(valor: unknown): string | undefined {
  if (typeof valor !== "string" || !valor.trim()) return undefined;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

/**
 * Autor pode vir como texto, como objeto `{name}` ou como lista de qualquer
 * um dos dois — os três formatos existem no schema.org e aparecem em sites
 * reais.
 */
function comoAutor(valor: unknown): string | undefined {
  if (typeof valor === "string") return valor.trim() || undefined;
  if (Array.isArray(valor)) {
    const nomes = valor.map(comoAutor).filter(Boolean);
    return nomes.length ? nomes.join(", ") : undefined;
  }
  if (valor && typeof valor === "object") {
    const nome = (valor as { name?: unknown }).name;
    return typeof nome === "string" ? nome.trim() || undefined : undefined;
  }
  return undefined;
}

/**
 * Dados do bloco `application/ld+json`, quando o site publica um.
 *
 * É a fonte mais confiável de autor e data — as tags `<meta>` mentem com
 * frequência, repetindo o nome do site no lugar do autor.
 */
function doJsonLd(doc: Document): Partial<Metadados> {
  const scripts = Array.from(
    doc.querySelectorAll('script[type="application/ld+json"]'),
  );
  for (const script of scripts) {
    try {
      const cru = JSON.parse(script.textContent || "");
      // pode ser um objeto, uma lista, ou vir embrulhado em @graph
      const candidatos: unknown[] = Array.isArray(cru)
        ? cru
        : Array.isArray((cru as { "@graph"?: unknown[] })?.["@graph"])
          ? (cru as { "@graph": unknown[] })["@graph"]
          : [cru];

      for (const item of candidatos) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const titulo = o.headline ?? o.name;
        const achado: Partial<Metadados> = {
          titulo: typeof titulo === "string" ? titulo.trim() : undefined,
          autor: comoAutor(o.author),
          publicado: comoData(o.datePublished ?? o.dateCreated),
          descricao:
            typeof o.description === "string" ? o.description.trim() : undefined,
        };
        // só vale se trouxe algo que as meta tags não dariam de graça
        if (achado.autor || achado.publicado) return achado;
      }
    } catch {
      // JSON-LD quebrado é comum. Seguir para a próxima fonte é melhor que
      // derrubar a captura inteira.
    }
  }
  return {};
}

export function extrairMetadados(doc: Document, url?: string): Metadados {
  const ld = doJsonLd(doc);

  let dominio: string | undefined;
  try {
    if (url) dominio = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    dominio = undefined;
  }

  return {
    titulo: ld.titulo || meta(doc, "og:title") || doc.title?.trim() || "Captura da Web",
    autor: ld.autor || meta(doc, "author") || meta(doc, "article:author"),
    publicado:
      ld.publicado ||
      comoData(meta(doc, "article:published_time")) ||
      comoData(meta(doc, "date")),
    descricao: ld.descricao || meta(doc, "og:description") || meta(doc, "description"),
    imagem: meta(doc, "og:image") || meta(doc, "twitter:image"),
    dominio,
    url,
  };
}

/* ----------------------------------------------------------------- modelos */

/**
 * Filtros que um `{{campo}}` aceita, no espírito dos do obsidian-clipper.
 *
 * `nome_seguro` existe porque título de site vem cheio de `/` e `:`, que
 * quebram nome de arquivo.
 */
const FILTROS: Record<string, (v: string) => string> = {
  minuscula: (v) => v.toLowerCase(),
  maiuscula: (v) => v.toUpperCase(),
  nome_seguro: (v) => v.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim(),
  primeira_linha: (v) => v.split("\n")[0].trim(),
};

/**
 * Troca `{{campo}}` e `{{campo|filtro}}` pelos valores.
 *
 * Campo ausente vira vazio, e a linha que sobrou só com o rótulo é removida —
 * senão capturar um site sem autor gravava "Autor:" pelado no texto, que é
 * pior que não ter o campo.
 */
export function aplicarModelo(
  modelo: string,
  valores: Record<string, string | undefined>,
): string {
  const preenchido = modelo.replace(
    /\{\{\s*([a-z_]+)\s*(?:\|\s*([a-z_]+)\s*)?\}\}/gi,
    (_todo, campo: string, filtro?: string) => {
      const bruto = valores[campo.toLowerCase()];
      if (!bruto) return "";
      const fn = filtro ? FILTROS[filtro.toLowerCase()] : undefined;
      return fn ? fn(bruto) : bruto;
    },
  );

  return preenchido
    .split("\n")
    // descarta "Rótulo:" que ficou sem valor; preserva linha vazia de
    // parágrafo e qualquer linha que ainda tenha conteúdo
    .filter((linha) => !/^\s*>?\s*[a-zA-ZÀ-ÿ_ ]+:\s*$/.test(linha))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Molde do corpo de uma captura.
 *
 * É uma string comum, não um pedaço de programa: dá para mexer no formato
 * sem mexer em código.
 */
export const MODELO_PADRAO = `> Fonte: [{{titulo}}]({{url}})
> {{autor}}{{publicado}}

{{imagem_md}}

{{descricao}}

{{conteudo}}`;

/* ---------------------------------------------------------------- captura */

export type ResultadoClipping = {
  titulo: string;
  markdown: string;
  fonteUrl?: string;
  /** Campos prontos para entrar no frontmatter do `.md` */
  dados: Record<string, string>;
  metadados: Metadados;
};

/**
 * Converte HTML (ou trecho colado de um artigo) em Markdown limpo.
 *
 * Nunca estoura: se o Readability não reconhecer um artigo, cai para o HTML
 * inteiro convertido. Perder a limpeza é chato; perder o que você copiou,
 * não pode acontecer.
 */
export function converterHtmlParaMarkdown(
  html: string,
  urlOrigem?: string,
  modelo: string = MODELO_PADRAO,
): ResultadoClipping {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");

    // com `base`, os links relativos do artigo viram absolutos e continuam
    // funcionando depois de salvos
    if (urlOrigem) {
      const base = doc.createElement("base");
      base.href = urlOrigem;
      doc.head.appendChild(base);
    }

    // Os metadados são lidos ANTES do Readability: ele consome o documento e
    // depois dele o `<head>` já foi embora.
    const metadados = extrairMetadados(doc, urlOrigem);

    const artigo = new Readability(doc).parse();
    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });
    /**
     * Sanitiza ANTES do Turndown, e não o HTML de entrada lá em cima.
     *
     * A ordem importa: `sanitizarHTML` devolve só o `<body>` e remove os
     * `<script>` — inclusive o `application/ld+json`, que é justamente a
     * melhor fonte de autor e data. Limpar antes custaria os metadados.
     *
     * Aqui já passamos do `extrairMetadados` e do Readability, então o que
     * sobra é exatamente o que vai virar arquivo no seu repositório. Como esse
     * HTML costuma chegar por um proxy de terceiros (ver `capturarUrlWeb`), ele
     * é conteúdo não confiável por definição.
     */
    const conteudo = turndown.turndown(
      sanitizarHTML(artigo?.content || html),
    );

    const titulo = (artigo?.title || metadados.titulo).trim();

    const markdown = aplicarModelo(modelo, {
      titulo,
      url: metadados.url,
      autor: metadados.autor ? `por ${metadados.autor}` : undefined,
      publicado: metadados.publicado ? ` · ${metadados.publicado}` : undefined,
      descricao: metadados.descricao,
      dominio: metadados.dominio,
      imagem: metadados.imagem,
      imagem_md: metadados.imagem ? `![](${metadados.imagem})` : undefined,
      conteudo,
    });

    const dados: Record<string, string> = {};
    if (metadados.url) dados.fonte = metadados.url;
    if (metadados.autor) dados.autor = metadados.autor;
    if (metadados.publicado) dados.publicado = metadados.publicado;
    if (metadados.dominio) dados.site = metadados.dominio;
    if (metadados.imagem) dados.imagem = metadados.imagem;

    return { titulo, markdown, fonteUrl: urlOrigem, dados, metadados };
  } catch {
    // último recurso: devolve o que veio, sem perder nada
    return {
      titulo: "Captura da Web",
      markdown: html,
      fonteUrl: urlOrigem,
      dados: urlOrigem ? { fonte: urlOrigem } : {},
      metadados: { titulo: "Captura da Web", url: urlOrigem },
    };
  }
}

/**
 * Baixa o HTML de uma URL e converte.
 *
 * ATENÇÃO — isto não é 100% no navegador. O site quase sempre recusa a
 * requisição direta (política de CORS), então a URL cai para um proxy
 * público de terceiros. Na prática: **o endereço que você está capturando
 * passa pelo servidor de outra pessoa.** Para artigo público não tem
 * problema; para uma página interna do trabalho ou qualquer coisa atrás de
 * login, prefira copiar e colar o texto direto no app.
 */
export async function capturarUrlWeb(url: string): Promise<ResultadoClipping> {
  const urlLimpa = url.trim();
  if (!/^https?:\/\//i.test(urlLimpa)) {
    throw new Error("Informe uma URL válida começando com http:// ou https://");
  }

  const proxies = [
    (u: string) => u,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];

  let html = "";
  let ultimoErro = "";

  for (const montarUrl of proxies) {
    try {
      const resp = await fetch(montarUrl(urlLimpa), {
        headers: { Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) {
        html = await resp.text();
        if (html && html.includes("<")) break;
      }
    } catch (e) {
      ultimoErro = e instanceof Error ? e.message : String(e);
    }
  }

  if (!html) {
    throw new Error(
      `Não foi possível baixar o conteúdo da página (${ultimoErro || "bloqueio de rede"}). Tente copiar e colar o texto ou o HTML direto no app.`,
    );
  }

  return converterHtmlParaMarkdown(html, urlLimpa);
}
