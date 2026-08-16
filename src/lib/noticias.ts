/**
 * Módulo de Notícias & Revista Digital para o Klaus.
 *
 * Busca feeds RSS/JSON de portais jornalísticos de grande credibilidade em PT-BR (Globo Esporte, UOL,
 * Meio & Mensagem, TabNews, Tecnoblog, G1, Superinteressante), com sistema triplo de proxy CORS,
 * extração de imagens em HD, leitor de artigo completo (DOMParser), feeds customizados do usuário,
 * e integração direta com Notas, Referências e Tarefas.
 */

import type { Settings } from "./settings";
import { escreverMarkdown, nomeDeArquivo } from "./markdown";
import { gravar } from "./github";
import { invalidarCache } from "./repo";

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
  conteudoCompleto?: string;
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

/** Capas de alta definição por assunto caso a matéria não traga imagem válida */
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

/** Desescapa caracteres HTML */
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

/** Calcula o tempo estimado de leitura (média de 200 palavras por minuto) */
export function calcularTempoLeitura(texto: string): number {
  const palavras = limparTexto(texto).split(/\s+/).filter(Boolean).length;
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
  try {
    const atuais = obterFeedsCustomizados();
    const novo: FeedCustomizado = {
      id: `custom-${Date.now()}`,
      nome: nome.trim() || "Feed Personalizado",
      url: url.trim(),
      categoria,
    };
    const atualizados = [...atuais, novo];
    localStorage.setItem(CHAVE_FEEDS_CUSTOM, JSON.stringify(atualizados));
    return atualizados;
  } catch {
    return [];
  }
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

// ── BUSCA DE FEEDS DE JORNALISMO REAL COM PARSER RESILIENTE ─────────────────────

/** Tenta extrair a melhor imagem de um item XML */
function extrairImagemDoXmlItem(item: Element, rawDesc: string): string | undefined {
  // 1. media:content ou media:thumbnail
  const mediaContent = item.querySelector("media\\:content, content, media\\:thumbnail, thumbnail")?.getAttribute("url");
  if (mediaContent) return mediaContent;

  // 2. enclosure
  const enclosure = item.querySelector("enclosure")?.getAttribute("url");
  if (enclosure) return enclosure;

  // 3. regex de <img> no texto da descrição
  const match = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];

  return undefined;
}

/** Busca RSS oficial via proxies CORS com resiliência tripla */
export async function buscarRssJornalismo(
  urlFeed: string,
  nomeFonte: string,
  categoria: CategoriaNoticia
): Promise<ItemNoticia[]> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(urlFeed)}`,
    `https://corsproxy.io/?${encodeURIComponent(urlFeed)}`,
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(urlFeed)}`,
  ];

  const idsCurtidos = new Set(obterIdsCurtidos());

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) continue;

      // Se for o proxy rss2json que devolve JSON direto
      if (proxyUrl.includes("rss2json")) {
        const json = await res.json();
        if (json && json.status === "ok" && Array.isArray(json.items)) {
          return json.items.slice(0, 10).map((item: { title: string; link: string; pubDate: string; description?: string; content?: string; thumbnail?: string; enclosure?: { link?: string } }, idx: number) => {
            const titulo = item.title ? limparTexto(item.title) : "Manchete sem título";
            const link = item.link || urlFeed;
            const id = `rss-${nomeFonte.toLowerCase().replace(/\s+/g, "-")}-${idx}-${titulo.slice(0, 15)}`;
            const rawDesc = item.description || item.content || "";
            const descLimpa = limparTexto(rawDesc);
            const thumb = item.thumbnail || item.enclosure?.link;

            return {
              id,
              titulo,
              link,
              fonte: nomeFonte,
              categoria,
              imagemUrl: obterImagemIlustrativa(categoria, thumb),
              descricao: descLimpa ? `${descLimpa.slice(0, 180)}...` : undefined,
              conteudoCompleto: descLimpa || titulo,
              tempoLeituraMinutos: calcularTempoLeitura(descLimpa || titulo),
              data: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
              curtido: idsCurtidos.has(id),
            };
          });
        }
      }

      // Parse de XML puro
      const xmlTexto = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlTexto, "text/xml");
      const items = Array.from(xmlDoc.querySelectorAll("item"));

      if (items.length > 0) {
        return items.slice(0, 10).map((item, idx) => {
          const titulo = item.querySelector("title")?.textContent ? limparTexto(item.querySelector("title")!.textContent!) : "Manchete sem título";
          const link = item.querySelector("link")?.textContent?.trim() || urlFeed;
          const pubDate = item.querySelector("pubDate")?.textContent?.trim() || new Date().toISOString();
          const rawDesc = item.querySelector("description, content\\:encoded")?.textContent || "";
          const descLimpa = limparTexto(rawDesc);
          const rawImg = extrairImagemDoXmlItem(item, rawDesc);
          const id = `rss-${nomeFonte.toLowerCase().replace(/\s+/g, "-")}-${idx}-${titulo.slice(0, 15)}`;

          return {
            id,
            titulo,
            link,
            fonte: nomeFonte,
            categoria,
            imagemUrl: obterImagemIlustrativa(categoria, rawImg),
            descricao: descLimpa ? `${descLimpa.slice(0, 180)}...` : undefined,
            conteudoCompleto: descLimpa || titulo,
            tempoLeituraMinutos: calcularTempoLeitura(descLimpa || titulo),
            data: new Date(pubDate).toISOString(),
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

/** Busca artigos do TabNews (Comunidade de Tech/Design brasileira) */
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
        tempoLeituraMinutos: calcularTempoLeitura(bodyClean || item.title),
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

  // Fallback se todos os feeds falharem
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

  // Ordenar por data decrescente e marcar o primeiro como destaque
  const ordenados = unicos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  if (ordenados.length > 0) {
    ordenados[0].destaque = true;
  }
  return ordenados;
}

/**
 * MOTOR DE EXTRAÇÃO DE ARTIGO COMPLETO (Full Reader Engine)
 */
export async function extrairArtigoCompleto(
  urlNoticia: string,
  fallbackDescricao?: string
): Promise<{ conteudoMarkdown: string; tempoLeituraMinutos: number; sucesso: boolean }> {
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlNoticia)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("Erro na comunicação com a página da notícia.");
    const htmlTexto = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlTexto, "text/html");

    // Remover ruídos
    const ruídos = doc.querySelectorAll(
      "script, style, iframe, nav, header, footer, aside, .ad, .ads, .advertising, .banner, .social-share, .comments, #comments, .menu"
    );
    ruídos.forEach((el) => el.remove());

    const container =
      doc.querySelector("article") ||
      doc.querySelector('[role="main"]') ||
      doc.querySelector(".materia-body") ||
      doc.querySelector(".content-body") ||
      doc.querySelector(".post-content") ||
      doc.querySelector(".entry-content") ||
      doc.querySelector(".materia") ||
      doc.body;

    const blocos: string[] = [];
    const elementos = container.querySelectorAll("p, h2, h3, h4, blockquote, ul, ol");

    elementos.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const txt = limparTexto(el.textContent || "");
      if (txt.length < 15) return;

      if (tag === "h2") {
        blocos.push(`\n## ${txt}\n`);
      } else if (tag === "h3" || tag === "h4") {
        blocos.push(`\n### ${txt}\n`);
      } else if (tag === "blockquote") {
        blocos.push(`> ${txt}`);
      } else if (tag === "ul" || tag === "ol") {
        const itens = Array.from(el.querySelectorAll("li"))
          .map((li) => `- ${limparTexto(li.textContent || "")}`)
          .filter((i) => i.length > 3);
        if (itens.length > 0) blocos.push(itens.join("\n"));
      } else {
        blocos.push(txt);
      }
    });

    const textoFinal = blocos.join("\n\n").trim();
    const totalPalavras = textoFinal.split(/\s+/).filter(Boolean).length;

    if (totalPalavras > 60) {
      const tempoLeituraMinutos = Math.max(1, Math.ceil(totalPalavras / 180));
      return {
        conteudoMarkdown: textoFinal,
        tempoLeituraMinutos,
        sucesso: true,
      };
    }
  } catch (err) {
    console.warn("Falha ao raspar artigo completo:", err);
  }

  const base = fallbackDescricao ? limparTexto(fallbackDescricao) : "Resumo da matéria disponível.";
  const palavras = base.split(/\s+/).filter(Boolean).length;
  return {
    conteudoMarkdown: `${base}\n\n*(Este portal exige navegação direta para exibição do artigo na íntegra).*`,
    tempoLeituraMinutos: Math.max(1, Math.ceil(palavras / 180)),
    sucesso: false,
  };
}

// ── INTEGRAÇÕES COM O SEGUNDO CÉREBRO ─────────────────────────────────────────────

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

  corpo += `### Conteúdo da Matéria\n${noticia.conteudoCompleto || noticia.descricao || ""}\n\n`;
  corpo += `---\n*Nota gerada no Klaus em ${dataHoje}.*`;

  const conteudoFinal = escreverMarkdown({ dados: frontmatter, corpo });
  await gravar(cfg, nomeArq, conteudoFinal, undefined, `Criar nota para a notícia "${noticia.titulo}"`);
  invalidarCache();
  return nomeArq;
}

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

  if (noticia.conteudoCompleto || noticia.descricao) {
    corpo += `### Conteúdo / Trecho\n${noticia.conteudoCompleto || noticia.descricao}\n\n`;
  }

  corpo += `---\n*Salvo em Referências do Klaus em ${dataHoje}.*`;

  const conteudoFinal = escreverMarkdown({ dados: frontmatter, corpo });
  await gravar(cfg, nomeArq, conteudoFinal, undefined, `Salvar notícia "${noticia.titulo}" nas Referências`);
  invalidarCache();
  return nomeArq;
}

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
  corpo += `- [ ] Ler artigo completo no [${noticia.fonte}](${noticia.link})\n`;
  corpo += `- [ ] Registrar anotações no Klaus\n\n`;
  corpo += `### Matéria\n${noticia.descricao || noticia.titulo}\n\n`;
  corpo += `---\n*Tarefa gerada no Klaus em ${dataHoje}.*`;

  const conteudoFinal = escreverMarkdown({ dados: frontmatter, corpo });
  await gravar(cfg, nomeArq, conteudoFinal, undefined, `Criar tarefa para a notícia "${noticia.titulo}"`);
  invalidarCache();
  return nomeArq;
}
