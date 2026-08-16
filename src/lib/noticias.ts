/**
 * Módulo de Notícias & Entretenimento para o Klaus.
 *
 * Suporta busca de feeds por APIs JSON livres de CORS (Reddit JSON, TabNews, rss2json),
 * personalização dos assuntos ativos pelo usuário, 3 modos de exibição (feed, carrossel, posts),
 * imagens de capa ilustrativas garantidas e integração direta com o repositório em Markdown:
 * - Criar Nota (notas/)
 * - Salvar Referência (referencias/)
 * - Criar Tarefa (tarefas/)
 */

import type { Settings } from "./settings";
import { escreverMarkdown, nomeDeArquivo } from "./markdown";
import { gravar } from "./github";
import { invalidarCache } from "./repo";

export type CategoriaNoticia = "futebol" | "design" | "tech" | "brasil" | "curiosidades";
export type ModoExibicao = "feed" | "carrossel" | "posts";

export interface ItemNoticia {
  id: string;
  titulo: string;
  link: string;
  fonte: string;
  categoria: CategoriaNoticia;
  imagemUrl: string;
  descricao?: string;
  conteudoCompleto?: string;
  data: string;
  curtido?: boolean;
  resumoIa?: string;
}

export interface CategoriaConfig {
  id: CategoriaNoticia;
  rotulo: string;
  icone: string;
  descricao: string;
  padraoAtivo: boolean;
}

export const CATEGORIAS_NOTICIAS: CategoriaConfig[] = [
  { id: "futebol", rotulo: "Futebol & Esportes", icone: "⚽", descricao: "Jogos, contratações e campeonatos", padraoAtivo: true },
  { id: "design", rotulo: "Design & Arte", icone: "🎨", descricao: "UI/UX, branding, tendências e inspiração", padraoAtivo: true },
  { id: "tech", rotulo: "Tecnologia & IA", icone: "🤖", descricao: "Inteligência Artificial, gadgets e software", padraoAtivo: true },
  { id: "brasil", rotulo: "Brasil & Notícias", icone: "🇧🇷", descricao: "Principais manchetes e acontecimentos", padraoAtivo: true },
  { id: "curiosidades", rotulo: "Curiosidades & Ciência", icone: "💡", descricao: "Fatos interessantes e descobertas", padraoAtivo: true },
];

/** Imagens ilustrativas HD por categoria quando a notícia não possui thumbnail válida */
const IMAGENS_ILUSTRATIVAS: Record<CategoriaNoticia, string[]> = {
  futebol: [
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1000&q=80",
  ],
  design: [
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=1000&q=80",
  ],
  tech: [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80",
  ],
  brasil: [
    "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?auto=format&fit=crop&w=1000&q=80",
  ],
  curiosidades: [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1000&q=80",
  ],
};

const CHAVE_CURTIDOS = "klaus_noticias_curtidas";
const CHAVE_MODO_EXIBICAO = "klaus_noticias_modo";
const CHAVE_CATEGORIAS_ATIVAS = "klaus_noticias_categorias_ativas";

/** Retorna a imagem ilustrativa se a thumbnail for inválida ou falhar */
export function obterImagemIlustrativa(categoria: CategoriaNoticia, urlOpcional?: string): string {
  if (
    urlOpcional &&
    typeof urlOpcional === "string" &&
    urlOpcional.startsWith("http") &&
    !urlOpcional.includes("self") &&
    !urlOpcional.includes("default") &&
    !urlOpcional.includes("nsfw") &&
    !urlOpcional.endsWith(".ico")
  ) {
    return urlOpcional;
  }
  const lista = IMAGENS_ILUSTRATIVAS[categoria] || IMAGENS_ILUSTRATIVAS.tech;
  const idx = Math.floor(Math.random() * lista.length);
  return lista[idx];
}

/** Modos de exibição (feed, carrossel, posts) */
export function obterModoExibicao(): ModoExibicao {
  try {
    const salvo = localStorage.getItem(CHAVE_MODO_EXIBICAO);
    if (salvo === "carrossel" || salvo === "posts" || salvo === "feed") return salvo;
    return "feed";
  } catch {
    return "feed";
  }
}

export function salvarModoExibicao(modo: ModoExibicao): void {
  try {
    localStorage.setItem(CHAVE_MODO_EXIBICAO, modo);
  } catch {
    // ignora
  }
}

/** Categorias ativas configuradas pelo usuário */
export function obterCategoriasAtivas(): CategoriaNoticia[] {
  try {
    const salvo = localStorage.getItem(CHAVE_CATEGORIAS_ATIVAS);
    if (!salvo) return CATEGORIAS_NOTICIAS.map((c) => c.id);
    const parsed = JSON.parse(salvo);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : CATEGORIAS_NOTICIAS.map((c) => c.id);
  } catch {
    return CATEGORIAS_NOTICIAS.map((c) => c.id);
  }
}

export function salvarCategoriasAtivas(categorias: CategoriaNoticia[]): void {
  try {
    localStorage.setItem(CHAVE_CATEGORIAS_ATIVAS, JSON.stringify(categorias));
  } catch {
    // ignora
  }
}

/** IDs de notícias curtidas */
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

/** Limpa texto de HTML e espaços extras */
export function limparTexto(texto: string): string {
  if (!texto) return "";
  return texto
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Busca via Reddit API JSON (CORS livre) com filtro rígido por categoria */
export async function buscarNoticiasReddit(subreddit: string, fonte: string, categoria: CategoriaNoticia): Promise<ItemNoticia[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=12`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const posts = json?.data?.children || [];
    const idsCurtidos = new Set(obterIdsCurtidos());

    return posts
      .filter((p: { data: { title?: string; over_18?: boolean } }) => p.data?.title && !p.data?.over_18)
      .slice(0, 10)
      .map((p: { data: { id: string; title: string; permalink: string; thumbnail?: string; created_utc: number; selftext?: string; url?: string } }) => {
        const d = p.data;
        const link = d.url && d.url.startsWith("http") ? d.url : `https://www.reddit.com${d.permalink}`;
        const id = `reddit-${subreddit}-${d.id}`;
        const rawDesc = d.selftext ? limparTexto(d.selftext) : "";

        return {
          id,
          titulo: d.title,
          link,
          fonte,
          categoria,
          imagemUrl: obterImagemIlustrativa(categoria, d.thumbnail),
          descricao: rawDesc ? `${rawDesc.slice(0, 180)}...` : `Discussão da comunidade /r/${subreddit}`,
          conteudoCompleto: rawDesc || d.title,
          data: new Date(d.created_utc * 1000).toISOString(),
          curtido: idsCurtidos.has(id),
        };
      });
  } catch {
    return [];
  }
}

/** Busca via rss2json API (converte RSS em JSON puro sem CORS) */
export async function buscarFeedRss2Json(urlFeed: string, fonte: string, categoria: CategoriaNoticia): Promise<ItemNoticia[]> {
  try {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(urlFeed)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    if (json.status !== "ok" || !Array.isArray(json.items)) return [];

    const idsCurtidos = new Set(obterIdsCurtidos());

    return json.items.slice(0, 10).map((item: { title: string; link: string; pubDate: string; description?: string; content?: string; thumbnail?: string; enclosure?: { link?: string } }, idx: number) => {
      const titulo = item.title ? limparTexto(item.title) : "Notícia sem título";
      const link = item.link || urlFeed;
      const id = `rss-${fonte.toLowerCase().replace(/\s+/g, "-")}-${idx}-${titulo.slice(0, 15)}`;
      const rawDesc = item.description ? limparTexto(item.description) : "";
      const rawContent = item.content ? limparTexto(item.content) : rawDesc;
      const thumb = item.thumbnail || item.enclosure?.link;

      return {
        id,
        titulo,
        link,
        fonte,
        categoria,
        imagemUrl: obterImagemIlustrativa(categoria, thumb),
        descricao: rawDesc ? `${rawDesc.slice(0, 180)}...` : undefined,
        conteudoCompleto: rawContent || titulo,
        data: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        curtido: idsCurtidos.has(id),
      };
    });
  } catch {
    return [];
  }
}

/** Busca notícias do TabNews (Brasil / Tech) */
export async function buscarNoticiasTabNews(): Promise<ItemNoticia[]> {
  try {
    const res = await fetch("https://www.tabnews.com.br/api/v1/contents?page=1&per_page=10&strategy=relevant");
    if (!res.ok) return [];
    const dados = await res.json();
    const idsCurtidos = new Set(obterIdsCurtidos());

    return (dados || []).map((item: { id: string; slug: string; owner_username: string; title: string; body?: string; published_at: string; tabcoins: number }) => {
      const link = `https://www.tabnews.com.br/${item.owner_username}/${item.slug}`;
      const id = `tabnews-${item.id}`;
      const bodyClean = item.body ? limparTexto(item.body) : "";
      return {
        id,
        titulo: item.title,
        link,
        fonte: "TabNews Brasil",
        categoria: "tech" as CategoriaNoticia,
        imagemUrl: obterImagemIlustrativa("tech"),
        descricao: bodyClean ? `${bodyClean.slice(0, 180)}...` : `Publicado por @${item.owner_username} com ${item.tabcoins} pontos.`,
        conteudoCompleto: bodyClean || item.title,
        data: item.published_at,
        curtido: idsCurtidos.has(id),
      };
    });
  } catch {
    return [];
  }
}

/** Busca consolidada e restrita por categoria */
export async function buscarNoticiasPorCategoria(categoria: CategoriaNoticia): Promise<ItemNoticia[]> {
  const promessas: Promise<ItemNoticia[]>[] = [];

  if (categoria === "futebol") {
    promessas.push(buscarNoticiasReddit("futebol", "Reddit Futebol", "futebol"));
    promessas.push(buscarFeedRss2Json("https://ge.globo.com/rss/ge/", "Globo Esporte", "futebol"));
    promessas.push(buscarFeedRss2Json("https://www.uol.com.br/esporte/futebol/rss.xml", "UOL Esporte", "futebol"));
  } else if (categoria === "design") {
    promessas.push(buscarNoticiasReddit("Design", "Reddit Design", "design"));
    promessas.push(buscarNoticiasReddit("UI_Design", "Reddit UI/UX", "design"));
    promessas.push(buscarFeedRss2Json("https://www.meioemensagem.com.br/feed", "Meio & Mensagem", "design"));
    promessas.push(buscarFeedRss2Json("https://www.designerd.com.br/feed/", "Designerd", "design"));
  } else if (categoria === "tech") {
    promessas.push(buscarNoticiasTabNews());
    promessas.push(buscarNoticiasReddit("technology", "Reddit Tech", "tech"));
    promessas.push(buscarFeedRss2Json("https://tecnoblog.net/feed/", "Tecnoblog", "tech"));
  } else if (categoria === "brasil") {
    promessas.push(buscarNoticiasReddit("brasil", "Reddit Brasil", "brasil"));
    promessas.push(buscarFeedRss2Json("https://g1.globo.com/rss/g1/", "G1 Notícias", "brasil"));
    promessas.push(buscarFeedRss2Json("https://noticias.uol.com.br/rss.xml", "UOL Notícias", "brasil"));
  } else if (categoria === "curiosidades") {
    promessas.push(buscarNoticiasReddit("todayilearned", "Fatos do Dia", "curiosidades"));
    promessas.push(buscarFeedRss2Json("https://super.abril.com.br/feed/", "Superinteressante", "curiosidades"));
  }

  const resultados = await Promise.all(promessas);
  const consolidados = resultados.flat();

  // Fallback se todos os feeds falharem
  if (consolidados.length === 0) {
    const idsCurtidos = new Set(obterIdsCurtidos());
    const idDemo = `demo-${categoria}-1`;
    const catCfg = CATEGORIAS_NOTICIAS.find((c) => c.id === categoria);
    return [
      {
        id: idDemo,
        titulo: `Destaques de ${catCfg?.rotulo || categoria}`,
        link: "https://github.com",
        fonte: "Klaus Radar",
        categoria,
        imagemUrl: obterImagemIlustrativa(categoria),
        descricao: `Acompanhe novidades de ${catCfg?.rotulo || categoria} diretamente no Klaus.`,
        conteudoCompleto: `Artigo detalhado sobre as últimas novidades de ${catCfg?.rotulo || categoria}.`,
        data: new Date().toISOString(),
        curtido: idsCurtidos.has(idDemo),
      },
    ];
  }

  // Eliminar duplicatas
  const vistos = new Set<string>();
  const unicos: ItemNoticia[] = [];
  for (const item of consolidados) {
    const chave = item.titulo.toLowerCase().slice(0, 30);
    if (!vistos.has(chave)) {
      vistos.add(chave);
      unicos.push(item);
    }
  }

  return unicos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

// ── INTEGRAÇÕES COM O SEGUNDO CÉREBRO (Notas, Referências, Tarefas) ───────────────

/**
 * 1. Salva uma notícia como Nota em `notas/`
 */
export async function criarNotaDaNoticia(noticia: ItemNoticia, cfg: Settings): Promise<string> {
  const dataHoje = new Date().toISOString().slice(0, 10);
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

  corpo += `### Conteúdo / Reflexão\n${noticia.conteudoCompleto || noticia.descricao || ""}\n\n`;
  corpo += `---\n*Nota criada a partir da aba Notícias do Klaus em ${dataHoje}.*`;

  const conteudoFinal = escreverMarkdown({ dados: frontmatter, corpo });
  await gravar(cfg, nomeArq, conteudoFinal, undefined, `Criar nota para a notícia "${noticia.titulo}"`);
  invalidarCache();
  return nomeArq;
}

/**
 * 2. Salva uma notícia como Referência em `referencias/`
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

  if (noticia.descricao) {
    corpo += `### Trecho\n${noticia.descricao}\n\n`;
  }

  corpo += `---\n*Salvo através da aba Notícias do Klaus em ${dataHoje}.*`;

  const conteudoFinal = escreverMarkdown({ dados: frontmatter, corpo });
  await gravar(cfg, nomeArq, conteudoFinal, undefined, `Salvar notícia "${noticia.titulo}" nas Referências`);
  invalidarCache();
  return nomeArq;
}

/**
 * 3. Cria uma Tarefa para acompanhar/estudar a notícia em `tarefas/`
 */
export async function criarTarefaDaNoticia(noticia: ItemNoticia, cfg: Settings): Promise<string> {
  const dataHoje = new Date().toISOString().slice(0, 10);
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
  corpo += `- [ ] Ler artigo completo em [${noticia.fonte}](${noticia.link})\n`;
  corpo += `- [ ] Anotar pontos principais e aplicar\n\n`;
  corpo += `### Contexto da Notícia\n${noticia.descricao || noticia.titulo}\n\n`;
  corpo += `---\n*Tarefa gerada automaticamente a partir da aba Notícias do Klaus.*`;

  const conteudoFinal = escreverMarkdown({ dados: frontmatter, corpo });
  await gravar(cfg, nomeArq, conteudoFinal, undefined, `Criar tarefa para a notícia "${noticia.titulo}"`);
  invalidarCache();
  return nomeArq;
}
