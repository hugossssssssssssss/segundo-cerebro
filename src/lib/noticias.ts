/**
 * Módulo de Notícias & Entretenimento para o Klaus.
 *
 * Busca feeds abertos (TabNews, HackerNews, RSS de Esportes, Design, IA e Brasil),
 * permite filtrar por categoria, alternar curtidas e gravar matérias curtidas
 * como notas em Markdown no repositório de dados.
 */

import type { Settings } from "./settings";
import { escreverMarkdown, nomeDeArquivo } from "./markdown";
import { gravar } from "./github";
import { invalidarCache } from "./repo";

export type CategoriaNoticia = "futebol" | "design" | "tech" | "brasil" | "curiosidades";

export interface ItemNoticia {
  id: string;
  titulo: string;
  link: string;
  fonte: string;
  categoria: CategoriaNoticia;
  imagemUrl?: string;
  descricao?: string;
  data: string;
  curtido?: boolean;
  resumoIa?: string;
}

export interface CategoriaConfig {
  id: CategoriaNoticia;
  rotulo: string;
  icone: string;
  descricao: string;
}

export const CATEGORIAS_NOTICIAS: CategoriaConfig[] = [
  { id: "futebol", rotulo: "Futebol", icone: "⚽", descricao: "Notícias de clubes, jogos e campeonatos" },
  { id: "design", rotulo: "Design & Arte", icone: "🎨", descricao: "UI/UX, ilustração, branding e inspiração" },
  { id: "tech", rotulo: "Tecnologia & IA", icone: "🤖", descricao: "Desenvolvimento, IA, gadgets e novidades" },
  { id: "brasil", rotulo: "Brasil & Mundo", icone: "🇧🇷", descricao: "Manchetes principais dos grandes portais" },
  { id: "curiosidades", rotulo: "Curiosidades", icone: "💡", descricao: "Ciência, inovação e fatos interessantes" },
];

const CHAVE_CURTIDOS = "klaus_noticias_curtidas";
const PROXY_CORS = "https://api.allorigins.win/raw?url=";

/** Retorna a lista de IDs de notícias curtidas no localStorage. */
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

/** Alterna o status de curtido de uma notícia e atualiza o localStorage. Retorna true se agora está curtido. */
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

/** Limpa tags HTML simples de resumos de RSS */
export function limparHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<img[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Tenta extrair a primeira imagem de uma tag HTML */
export function extrairImagemDoHtml(html: string): string | undefined {
  if (!html) return undefined;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
}

/** Busca RSS genérico usando o proxy AllOrigins */
export async function buscarFeedRss(
  urlFeed: string,
  nomeFonte: string,
  categoria: CategoriaNoticia
): Promise<ItemNoticia[]> {
  try {
    const urlFinal = `${PROXY_CORS}${encodeURIComponent(urlFeed)}`;
    const res = await fetch(urlFinal);
    if (!res.ok) return [];
    const xmlTexto = await res.text();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlTexto, "text/xml");
    const items = Array.from(xmlDoc.querySelectorAll("item"));

    const idsCurtidos = new Set(obterIdsCurtidos());

    return items.slice(0, 12).map((item, idx) => {
      const titulo = item.querySelector("title")?.textContent?.trim() || "Notícia sem título";
      const link = item.querySelector("link")?.textContent?.trim() || urlFeed;
      const pubDate = item.querySelector("pubDate")?.textContent?.trim() || new Date().toISOString();
      const rawDesc = item.querySelector("description")?.textContent || "";
      const descricao = limparHtml(rawDesc).slice(0, 180);
      
      const mediaContent = item.querySelector("media\\:content, content")?.getAttribute("url");
      const enclosure = item.querySelector("enclosure")?.getAttribute("url");
      const imgInDesc = extrairImagemDoHtml(rawDesc);

      const imagemUrl = mediaContent || enclosure || imgInDesc;
      const id = `${nomeFonte.toLowerCase().replace(/\s+/g, "-")}-${idx}-${titulo.slice(0, 20)}`;

      return {
        id,
        titulo,
        link,
        fonte: nomeFonte,
        categoria,
        imagemUrl,
        descricao: descricao ? `${descricao}...` : undefined,
        data: pubDate,
        curtido: idsCurtidos.has(id),
      };
    });
  } catch (err) {
    console.warn(`Falha ao carregar feed ${nomeFonte}:`, err);
    return [];
  }
}

/** Busca artigos do TabNews (Tecnologia & IA em português) */
export async function buscarNoticiasTabNews(): Promise<ItemNoticia[]> {
  try {
    const res = await fetch("https://www.tabnews.com.br/api/v1/contents?page=1&per_page=12&strategy=relevant");
    if (!res.ok) return [];
    const dados = await res.json();
    const idsCurtidos = new Set(obterIdsCurtidos());

    return (dados || []).map((item: { id: string; slug: string; owner_username: string; title: string; published_at: string; tabcoins: number }) => {
      const link = `https://www.tabnews.com.br/${item.owner_username}/${item.slug}`;
      const id = `tabnews-${item.id}`;
      return {
        id,
        titulo: item.title,
        link,
        fonte: "TabNews",
        categoria: "tech" as CategoriaNoticia,
        descricao: `Publicado por @${item.owner_username} com ${item.tabcoins} tabcoins de relevância.`,
        data: item.published_at,
        curtido: idsCurtidos.has(id),
      };
    });
  } catch {
    return [];
  }
}

/** Lista de feeds RSS por categoria */
const FEEDS_POR_CATEGORIA: Record<CategoriaNoticia, Array<{ url: string; fonte: string }>> = {
  futebol: [
    { url: "https://ge.globo.com/rss/ge/", fonte: "Globo Esporte" },
    { url: "https://www.uol.com.br/esporte/futebol/rss.xml", fonte: "UOL Esporte" },
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
    { url: "https://g1.globo.com/rss/g1/", fonte: "G1" },
    { url: "https://noticias.uol.com.br/rss.xml", fonte: "UOL Notícias" },
  ],
  curiosidades: [
    { url: "https://super.abril.com.br/feed/", fonte: "Superinteressante" },
    { url: "https://www.tecmundo.com.br/rss", fonte: "TecMundo" },
  ],
};

/** Busca notícias consolidadas para a categoria selecionada */
export async function buscarNoticiasPorCategoria(categoria: CategoriaNoticia): Promise<ItemNoticia[]> {
  const listaFeeds = FEEDS_POR_CATEGORIA[categoria] || [];
  const promessas = listaFeeds.map((f) => buscarFeedRss(f.url, f.fonte, categoria));
  
  if (categoria === "tech") {
    promessas.push(buscarNoticiasTabNews());
  }

  const resultados = await Promise.all(promessas);
  const consolidados = resultados.flat();

  // Ordenar por data decrescente
  return consolidados.sort((a, b) => {
    const tA = new Date(a.data).getTime() || 0;
    const tB = new Date(b.data).getTime() || 0;
    return tB - tA;
  });
}

/**
 * Salva uma notícia curtida como uma nota em Markdown na pasta `referencias/` do repositório privado.
 */
export async function salvarNoticiaComoReferencia(noticia: ItemNoticia, cfg: Settings): Promise<string> {
  const dataHoje = new Date().toISOString().slice(0, 10);
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

  let corpoMarkdown = `## ${noticia.titulo}\n\n`;
  corpoMarkdown += `**Fonte:** [${noticia.fonte}](${noticia.link})\n`;
  corpoMarkdown += `**Categoria:** ${noticia.categoria.toUpperCase()}\n`;
  corpoMarkdown += `**Data:** ${new Date(noticia.data).toLocaleDateString("pt-BR")}\n\n`;

  if (noticia.imagemUrl) {
    corpoMarkdown += `![](${noticia.imagemUrl})\n\n`;
  }

  if (noticia.resumoIa) {
    corpoMarkdown += `### 🤖 Resumo da IA\n${noticia.resumoIa}\n\n`;
  }

  if (noticia.descricao) {
    corpoMarkdown += `### Trecho\n${noticia.descricao}\n\n`;
  }

  corpoMarkdown += `---\n*Salvo através da aba Notícias do Klaus em ${dataHoje}.*`;

  const conteudoFinal = escreverMarkdown({ dados: frontmatter, corpo: corpoMarkdown });

  await gravar(
    cfg,
    nomeArq,
    conteudoFinal,
    undefined,
    `Salvar notícia "${noticia.titulo}" nas Referências`
  );

  invalidarCache();
  return nomeArq;
}
