/**
 * Módulo de Notícias & Revista Digital para o Klaus.
 *
 * Adota a arquitetura comprovada de leitura dos leitores de feed open-source do GitHub (georapbox/rss-feed-reader + rss-parser).
 * Consome os campos `content` (HTML integral da matéria) e `body` (TabNews) para exibir matérias completas
 * e organizadas instantaneamente, com capas HD, 3 modos visuais e integrações com o repositório.
 */

import DOMPurify from "dompurify";
import type { Settings } from "./settings";
import { escreverMarkdown, nomeDeArquivo, lerMarkdown } from "./markdown";
import { atualizarCacheLocal } from "./repo";
import { salvarRascunhoLocal } from "./offlineQueue";
import { hojeISO } from "./utils";

export type CategoriaNoticia = "futebol" | "design" | "tech" | "brasil" | "curiosidades" | "personalizado";
export type ModoExibicao = "revista" | "cards" | "feed";

export interface ItemNoticia {
  id: string;
  titulo: string;
  link: string;
  fonte: string;
  categoria: CategoriaNoticia;
  imagemUrl: string;
  descricao?: string;
  conteudoCompleto: string;
  tempoLeituraMinutos: number;
  destaque?: boolean;
  data: string;
  curtido?: boolean;
  resumoIa?: string;
}

export interface FeedCustomizado {
  id: string;
  nome: string;
  url: string;
  categoria: CategoriaNoticia;
}

export interface CategoriaConfig {
  id: CategoriaNoticia;
  rotulo: string;
  icone: string;
  descricao: string;
  padraoAtivo: boolean;
}

export const CATEGORIAS_NOTICIAS: CategoriaConfig[] = [
  { id: "futebol", rotulo: "Futebol & Esportes", icone: "⚽", descricao: "Campeonatos, clubes e bastidores", padraoAtivo: true },
  { id: "design", rotulo: "Design & Arte", icone: "🎨", descricao: "UI/UX, branding, tendências e inspiração", padraoAtivo: true },
  { id: "tech", rotulo: "Tecnologia & IA", icone: "🤖", descricao: "Inteligência Artificial, gadgets e software", padraoAtivo: true },
  { id: "brasil", rotulo: "Brasil & Mundo", icone: "🇧🇷", descricao: "Principais manchetes e acontecimentos", padraoAtivo: true },
  { id: "curiosidades", rotulo: "Curiosidades", icone: "💡", descricao: "Ciência, inovação e fatos interessantes", padraoAtivo: true },
  { id: "personalizado", rotulo: "Meus Feeds", icone: "⭐", descricao: "Canais e blogs de sua escolha", padraoAtivo: false },
];

/** Capas em alta definição por categoria */
const IMAGENS_ILUSTRATIVAS: Record<CategoriaNoticia, string[]> = {
  futebol: [
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1200&q=80",
  ],
  design: [
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=1200&q=80",
  ],
  tech: [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
  ],
  brasil: [
    "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?auto=format&fit=crop&w=1200&q=80",
  ],
  curiosidades: [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1200&q=80",
  ],
  personalizado: [
    "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80",
  ],
};

const CHAVE_CURTIDOS = "klaus_noticias_curtidas";
const CHAVE_MODO_EXIBICAO = "klaus_noticias_modo";
const CHAVE_CATEGORIAS_ATIVAS = "klaus_noticias_categorias_ativas";
const CHAVE_FEEDS_CUSTOM = "klaus_noticias_custom_feeds";

/** Seleciona uma imagem de alta definição temática */
export function obterImagemIlustrativa(categoria: CategoriaNoticia, urlOpcional?: string): string {
  if (
    urlOpcional &&
    typeof urlOpcional === "string" &&
    urlOpcional.startsWith("http") &&
    !urlOpcional.includes("1x1") &&
    !urlOpcional.includes("pixel") &&
    !urlOpcional.endsWith(".ico")
  ) {
    return urlOpcional;
  }
  const lista = IMAGENS_ILUSTRATIVAS[categoria] || IMAGENS_ILUSTRATIVAS.tech;
  const idx = Math.floor(Math.random() * lista.length);
  return lista[idx];
}

/** Limpa marcas de formatação mantendo o texto sem quebras */
export function limparTexto(texto: string): string {
  if (!texto) return "";
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitiza e formata o HTML recebido do campo `content` do RSS,
 * mantendo parágrafos (<p>), subtítulos (<h2>/<h3>), listas e imagens com estilo editorial limpo.
 */
export function formatarHtmlEditorial(html: string): string {
  if (!html) return "";

  // Se for texto puro sem tags HTML, divide em parágrafos por quebra de linha
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html
      .split(/\n\s*\n/)
      .map((p) => `<p class="mb-4 leading-relaxed">${p.trim()}</p>`)
      .join("");
  }

  // Adiciona classes CSS elegantes usando o atributo HTML 'class' válido (não 'className')
  const formatado = html
    .replace(/<p[^>]*>/gi, '<p class="mb-4 text-sm sm:text-base leading-relaxed text-foreground/90 font-sans">')
    .replace(/<h2[^>]*>/gi, '<h2 class="text-lg font-bold text-foreground mt-6 mb-3 border-b border-border/40 pb-1">')
    .replace(/<h3[^>]*>/gi, '<h3 class="text-base font-bold text-foreground mt-4 mb-2">')
    .replace(/<blockquote[^>]*>/gi, '<blockquote class="border-l-4 border-primary pl-4 py-1 my-4 italic text-muted-foreground bg-accent/30 rounded-r-lg">')
    .replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, '<img src="$1" class="my-4 rounded-xl shadow-xs max-h-96 w-full object-cover" />');

  /**
   * Sanitizar é o ÚLTIMO passo, sempre.
   *
   * As substituições acima são regex sobre HTML vindo de um feed RSS de
   * terceiro, e uma delas reinjeta um trecho capturado do original
   * (o `src` da imagem). Sanitizar antes e formatar depois deixava a
   * segurança dependendo de nenhuma dessas regex reintroduzir nada
   * perigoso — uma garantia que ninguém consegue manter olhando só para
   * esta função. Com o DOMPurify por último, o que sai daqui está limpo
   * independentemente do que as regex fizerem.
   */
  return DOMPurify.sanitize(formatado, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "iframe", "object", "embed", "link", "style", "meta", "base", "form"],
    FORBID_ATTR: ["on*", "action"],
  });
}

/** Calcula o tempo estimado de leitura (média de 180 palavras por minuto) */
export function calcularTempoLeitura(textoOuHtml: string): number {
  const textoLimpo = limparTexto(textoOuHtml);
  const palavras = textoLimpo.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(palavras / 180));
}

// ── PREFERÊNCIAS NO LOCALSTORAGE ──────────────────────────────────────────────────

export function obterModoExibicao(): ModoExibicao {
  try {
    const salvo = localStorage.getItem(CHAVE_MODO_EXIBICAO);
    if (salvo === "revista" || salvo === "cards" || salvo === "feed") return salvo;
    return "revista";
  } catch {
    return "revista";
  }
}

export function salvarModoExibicao(modo: ModoExibicao): void {
  try {
    localStorage.setItem(CHAVE_MODO_EXIBICAO, modo);
  } catch {
    // ignora
  }
}

export function obterCategoriasAtivas(): CategoriaNoticia[] {
  try {
    const salvo = localStorage.getItem(CHAVE_CATEGORIAS_ATIVAS);
    if (!salvo) return CATEGORIAS_NOTICIAS.filter((c) => c.padraoAtivo).map((c) => c.id);
    const parsed = JSON.parse(salvo);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : ["futebol", "design", "tech", "brasil", "curiosidades"];
  } catch {
    return ["futebol", "design", "tech", "brasil", "curiosidades"];
  }
}

export function salvarCategoriasAtivas(categorias: CategoriaNoticia[]): void {
  try {
    localStorage.setItem(CHAVE_CATEGORIAS_ATIVAS, JSON.stringify(categorias));
  } catch {
    // ignora
  }
}

export function obterIdsCurtidos(): string[] {
  try {
    const salvo = localStorage.getItem(CHAVE_CURTIDOS);
    if (!salvo) return [];
    const ids = JSON.parse(salvo);
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function alternarCurtidaNoticia(noticiaId: string): boolean {
  try {
    const curtidos = new Set(obterIdsCurtidos());
    let resultado = false;
    if (curtidos.has(noticiaId)) {
      curtidos.delete(noticiaId);
      resultado = false;
    } else {
      curtidos.add(noticiaId);
      resultado = true;
    }
    localStorage.setItem(CHAVE_CURTIDOS, JSON.stringify(Array.from(curtidos)));
    return resultado;
  } catch {
    return false;
  }
}

export function obterFeedsCustomizados(): FeedCustomizado[] {
  try {
    const salvo = localStorage.getItem(CHAVE_FEEDS_CUSTOM);
    if (!salvo) return [];
    const parsed = JSON.parse(salvo);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function adicionarFeedCustomizado(nome: string, url: string, categoria: CategoriaNoticia): FeedCustomizado[] {
  const urlLimpa = url.trim();
  if (!/^https?:\/\//i.test(urlLimpa)) {
    throw new Error("URL de feed inválida. Deve iniciar com http:// ou https://");
  }

  const atuais = obterFeedsCustomizados();
  const novo: FeedCustomizado = {
    id: `custom-${Date.now()}`,
    nome: nome.trim() || "Feed Personalizado",
    url: urlLimpa,
    categoria,
  };
  const atualizados = [...atuais, novo];
  localStorage.setItem(CHAVE_FEEDS_CUSTOM, JSON.stringify(atualizados));
  return atualizados;
}

export function removerFeedCustomizado(id: string): FeedCustomizado[] {
  try {
    const atuais = obterFeedsCustomizados();
    const atualizados = atuais.filter((f) => f.id !== id);
    localStorage.setItem(CHAVE_FEEDS_CUSTOM, JSON.stringify(atualizados));
    return atualizados;
  } catch {
    return [];
  }
}

// ── BUSCA DE FEEDS DE JORNALISMO REAL (ESTRATÉGIA GITHUB RSS READER) ──────────────

/** Tenta extrair a imagem principal */
function extrairImagemDoXmlItem(item: Element, rawDesc: string): string | undefined {
  const mediaContent = item.querySelector("media\\:content, content, media\\:thumbnail, thumbnail")?.getAttribute("url");
  if (mediaContent) return mediaContent;

  const enclosure = item.querySelector("enclosure")?.getAttribute("url");
  if (enclosure) return enclosure;

  const match = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];

  return undefined;
}

/** Busca RSS oficial consumindo o campo `content` integral (Padrão georapbox/rss-feed-reader + rss-parser) */
export async function buscarRssJornalismo(
  urlFeed: string,
  nomeFonte: string,
  categoria: CategoriaNoticia
): Promise<ItemNoticia[]> {
  const proxies = [
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(urlFeed)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(urlFeed)}`,
    `https://corsproxy.io/?${encodeURIComponent(urlFeed)}`,
  ];

  const idsCurtidos = new Set(obterIdsCurtidos());

  const parseDataIsoSegura = (val?: string | null): string => {
    if (!val) return new Date().toISOString();
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;

      // 1. rss2json (retorna JSON estruturado com o campo `content` integral!)
      if (proxyUrl.includes("rss2json")) {
        const json = await res.json();
        if (json && json.status === "ok" && Array.isArray(json.items)) {
          return json.items.slice(0, 12).map((item: { title: string; link: string; pubDate: string; description?: string; content?: string; thumbnail?: string; enclosure?: { link?: string } }, idx: number) => {
            const titulo = item.title ? limparTexto(item.title) : "Manchete sem título";
            const link = item.link || urlFeed;
            const id = `rss-${nomeFonte.toLowerCase().replace(/\s+/g, "-")}-${idx}-${titulo.slice(0, 15)}`;
            
            // O campo `content` traz a matéria inteira em HTML fornecida pelo jornal!
            const rawContent = item.content || item.description || "";
            const descCard = item.description ? limparTexto(item.description).slice(0, 180) : limparTexto(rawContent).slice(0, 180);
            const thumb = item.thumbnail || item.enclosure?.link;

            return {
              id,
              titulo,
              link,
              fonte: nomeFonte,
              categoria,
              imagemUrl: obterImagemIlustrativa(categoria, thumb),
              descricao: descCard ? `${descCard}...` : undefined,
              conteudoCompleto: rawContent, // Matéria integral SEM CORTE!
              tempoLeituraMinutos: calcularTempoLeitura(rawContent),
              data: parseDataIsoSegura(item.pubDate),
              curtido: idsCurtidos.has(id),
            };
          });
        }
      }

      // 2. Parse de XML puro (captura <content:encoded> ou <description> completo)
      const xmlTexto = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlTexto, "text/xml");
      const items = Array.from(xmlDoc.querySelectorAll("item"));

      if (items.length > 0) {
        return items.slice(0, 12).map((item, idx) => {
          const titulo = item.querySelector("title")?.textContent ? limparTexto(item.querySelector("title")!.textContent!) : "Manchete sem título";
          const link = item.querySelector("link")?.textContent?.trim() || urlFeed;
          const pubDate = item.querySelector("pubDate")?.textContent?.trim() || new Date().toISOString();
          
          const rawContent = item.querySelector("content\\:encoded, encoded")?.textContent || item.querySelector("description")?.textContent || "";
          const descCard = limparTexto(rawContent).slice(0, 180);
          const rawImg = extrairImagemDoXmlItem(item, rawContent);
          const id = `rss-${nomeFonte.toLowerCase().replace(/\s+/g, "-")}-${idx}-${titulo.slice(0, 15)}`;

          return {
            id,
            titulo,
            link,
            fonte: nomeFonte,
            categoria,
            imagemUrl: obterImagemIlustrativa(categoria, rawImg),
            descricao: descCard ? `${descCard}...` : undefined,
            conteudoCompleto: rawContent, // Matéria integral SEM CORTE!
            tempoLeituraMinutos: calcularTempoLeitura(rawContent),
            data: parseDataIsoSegura(pubDate),
            curtido: idsCurtidos.has(id),
          };
        });
      }
    } catch {
      // Tenta o próximo proxy se este falhar
    }
  }

  return [];
}

/** Busca artigos do TabNews (Brasil / Tech) trazendo o campo `body` integral */
export async function buscarNoticiasTabNews(): Promise<ItemNoticia[]> {
  try {
    const res = await fetch("https://www.tabnews.com.br/api/v1/contents?page=1&per_page=12&strategy=relevant");
    if (!res.ok) return [];
    const dados = await res.json();
    const idsCurtidos = new Set(obterIdsCurtidos());

    return (dados || []).map((item: { id: string; slug: string; owner_username: string; title: string; body?: string; published_at: string; tabcoins: number }) => {
      const link = `https://www.tabnews.com.br/${item.owner_username}/${item.slug}`;
      const id = `tabnews-${item.id}`;
      const bodyRaw = item.body || "";
      const bodyClean = limparTexto(bodyRaw);
      return {
        id,
        titulo: item.title,
        link,
        fonte: "TabNews Brasil",
        categoria: "tech" as CategoriaNoticia,
        imagemUrl: obterImagemIlustrativa("tech"),
        descricao: bodyClean ? `${bodyClean.slice(0, 180)}...` : `Publicado por @${item.owner_username} com ${item.tabcoins} pontos.`,
        conteudoCompleto: bodyRaw || item.title, // Matéria integral em Markdown!
        tempoLeituraMinutos: calcularTempoLeitura(bodyRaw || item.title),
        data: item.published_at,
        curtido: idsCurtidos.has(id),
      };
    });
  } catch {
    return [];
  }
}

/** Fontes oficiais de jornalismo por assunto */
const FONTES_OFICIAIS: Record<CategoriaNoticia, Array<{ url: string; fonte: string }>> = {
  futebol: [
    { url: "https://ge.globo.com/rss/ge/", fonte: "Globo Esporte" },
    { url: "https://www.uol.com.br/esporte/futebol/rss.xml", fonte: "UOL Esporte" },
    { url: "https://www.lance.com.br/rss.xml", fonte: "Lance!" },
  ],
  design: [
    { url: "https://www.meioemensagem.com.br/feed", fonte: "Meio & Mensagem" },
    { url: "https://www.designerd.com.br/feed/", fonte: "Designerd" },
  ],
  tech: [
    { url: "https://tecnoblog.net/feed/", fonte: "Tecnoblog" },
    { url: "https://canaltech.com.br/rss/", fonte: "Canaltech" },
  ],
  brasil: [
    { url: "https://g1.globo.com/rss/g1/", fonte: "G1 Notícias" },
    { url: "https://noticias.uol.com.br/rss.xml", fonte: "UOL Notícias" },
  ],
  curiosidades: [
    { url: "https://super.abril.com.br/feed/", fonte: "Superinteressante" },
    { url: "https://www.tecmundo.com.br/rss", fonte: "TecMundo" },
  ],
  personalizado: [],
};

/** Busca notícias consolidadas por categoria */
export async function buscarNoticiasPorCategoria(categoria: CategoriaNoticia): Promise<ItemNoticia[]> {
  const promessas: Promise<ItemNoticia[]>[] = [];

  if (categoria === "personalizado") {
    const custom = obterFeedsCustomizados();
    for (const f of custom) {
      promessas.push(buscarRssJornalismo(f.url, f.nome, "personalizado"));
    }
  } else {
    const lista = FONTES_OFICIAIS[categoria] || [];
    for (const f of lista) {
      promessas.push(buscarRssJornalismo(f.url, f.fonte, categoria));
    }
    if (categoria === "tech") {
      promessas.push(buscarNoticiasTabNews());
    }
  }

  const resultados = await Promise.all(promessas);
  const consolidados = resultados.flat();

  if (consolidados.length === 0) {
    const idsCurtidos = new Set(obterIdsCurtidos());
    const idDemo = `demo-${categoria}-1`;
    const catCfg = CATEGORIAS_NOTICIAS.find((c) => c.id === categoria);
    return [
      {
        id: idDemo,
        titulo: `Destaques e Manchetes de ${catCfg?.rotulo || categoria}`,
        link: "https://github.com",
        fonte: "Klaus Radar",
        categoria,
        imagemUrl: obterImagemIlustrativa(categoria),
        descricao: `Acompanhe novidades de ${catCfg?.rotulo || categoria} atualizadas no Klaus.`,
        conteudoCompleto: `Artigo estruturado com as principais informações sobre ${catCfg?.rotulo || categoria}.`,
        tempoLeituraMinutos: 2,
        data: new Date().toISOString(),
        curtido: idsCurtidos.has(idDemo),
      },
    ];
  }

  const vistos = new Set<string>();
  const unicos: ItemNoticia[] = [];
  for (const item of consolidados) {
    const chave = item.titulo.toLowerCase().slice(0, 30);
    if (!vistos.has(chave)) {
      vistos.add(chave);
      unicos.push(item);
    }
  }

  const ordenados = unicos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  if (ordenados.length > 0) {
    ordenados[0].destaque = true;
  }
  return ordenados;
}

// ── INTEGRAÇÕES COM O SEGUNDO CÉREBRO ─────────────────────────────────────────────

export async function criarNotaDaNoticia(noticia: ItemNoticia, _cfg: Settings): Promise<string> {
  const dataHoje = hojeISO();
  const nomeArq = `notas/${nomeDeArquivo(`Nota - ${noticia.titulo}`)}`;

  const frontmatter = {
    tipo: "nota",
    titulo: noticia.titulo,
    fonte: noticia.fonte,
    url: noticia.link,
    tags: ["noticia", noticia.categoria, "leitura"],
    criado_em: dataHoje,
    atualizado_em: dataHoje,
  };

  let corpo = `# ${noticia.titulo}\n\n`;
  corpo += `> **Fonte:** [${noticia.fonte}](${noticia.link}) | **Data:** ${new Date(noticia.data).toLocaleDateString("pt-BR")}\n\n`;
  
  if (noticia.imagemUrl) {
    corpo += `![](${noticia.imagemUrl})\n\n`;
  }

  if (noticia.resumoIa) {
    corpo += `### 🤖 Resumo da IA\n${noticia.resumoIa}\n\n`;
  }

  corpo += `### Conteúdo Integral da Matéria\n${limparTexto(noticia.conteudoCompleto || noticia.descricao || "")}\n\n`;
  corpo += `---\n*Nota gerada no Klaus em ${dataHoje}.*`;

  const conteudoFinal = escreverMarkdown({ dados: frontmatter, corpo });
  const shaFinal = `temp_${Math.random().toString(36).substring(7)}`;
  salvarRascunhoLocal(nomeArq, conteudoFinal, undefined, `Criar nota para a notícia "${noticia.titulo}"`);
  atualizarCacheLocal(nomeArq, conteudoFinal, lerMarkdown(conteudoFinal), shaFinal);
  return nomeArq;
}

export async function salvarNoticiaComoReferencia(noticia: ItemNoticia, _cfg: Settings): Promise<string> {
  const dataHoje = hojeISO();
  const nomeArq = `referencias/${nomeDeArquivo(noticia.titulo)}`;

  const frontmatter = {
    tipo: "referencia",
    titulo: noticia.titulo,
    fonte: noticia.fonte,
    url: noticia.link,
    categoria: noticia.categoria,
    tags: ["noticia", noticia.categoria, noticia.fonte.toLowerCase().replace(/\s+/g, "")],
    criado_em: dataHoje,
    atualizado_em: dataHoje,
  };

  let corpo = `## ${noticia.titulo}\n\n`;
  corpo += `**Fonte:** [${noticia.fonte}](${noticia.link})\n`;
  corpo += `**Categoria:** ${noticia.categoria.toUpperCase()}\n`;
  corpo += `**Data:** ${new Date(noticia.data).toLocaleDateString("pt-BR")}\n\n`;

  if (noticia.imagemUrl) {
    corpo += `![](${noticia.imagemUrl})\n\n`;
  }

  if (noticia.resumoIa) {
    corpo += `### 🤖 Resumo da IA\n${noticia.resumoIa}\n\n`;
  }

  if (noticia.conteudoCompleto || noticia.descricao) {
    corpo += `### Conteúdo / Trecho\n${limparTexto(noticia.conteudoCompleto || noticia.descricao || "")}\n\n`;
  }

  corpo += `---\n*Salvo em Referências do Klaus em ${dataHoje}.*`;

  const conteudoFinal = escreverMarkdown({ dados: frontmatter, corpo });
  const shaFinal = `temp_${Math.random().toString(36).substring(7)}`;
  salvarRascunhoLocal(nomeArq, conteudoFinal, undefined, `Salvar notícia "${noticia.titulo}" nas Referências`);
  atualizarCacheLocal(nomeArq, conteudoFinal, lerMarkdown(conteudoFinal), shaFinal);
  return nomeArq;
}

export async function criarTarefaDaNoticia(noticia: ItemNoticia, _cfg: Settings): Promise<string> {
  const dataHoje = hojeISO();
  const tituloTarefa = `Ler e analisar: ${noticia.titulo}`;
  const nomeArq = `tarefas/${nomeDeArquivo(tituloTarefa)}`;

  const frontmatter = {
    tipo: "tarefa",
    titulo: tituloTarefa,
    status: "a_fazer",
    urgente: false,
    prazo: dataHoje,
    tags: ["noticia", noticia.categoria, "estudo"],
    criado_em: dataHoje,
    atualizado_em: dataHoje,
  };

  let corpo = `## Tarefa: ${noticia.titulo}\n\n`;
  corpo += `- [ ] Ler artigo completo no [${noticia.fonte}](${noticia.link})\n`;
  corpo += `- [ ] Registrar anotações no Klaus\n\n`;
  corpo += `### Matéria\n${noticia.descricao || noticia.titulo}\n\n`;
  corpo += `---\n*Tarefa gerada no Klaus em ${dataHoje}.*`;

  const conteudoFinal = escreverMarkdown({ dados: frontmatter, corpo });
  const shaFinal = `temp_${Math.random().toString(36).substring(7)}`;
  salvarRascunhoLocal(nomeArq, conteudoFinal, undefined, `Criar tarefa para a notícia "${noticia.titulo}"`);
  atualizarCacheLocal(nomeArq, conteudoFinal, lerMarkdown(conteudoFinal), shaFinal);
  return nomeArq;
}
