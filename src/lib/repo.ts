/**
 * Carrega o repositório inteiro em duas requisições, não em uma por arquivo.
 *
 * O jeito antigo era: listar a pasta (1) e depois ler cada arquivo (N). Com
 * 100 notas isso dava 101 requisições **por abertura de tela**, e o teto do
 * GitHub é 5.000 por hora. Além de lento, chegava perto do limite.
 *
 * Agora:
 *   1. Git Trees API traz a árvore inteira do repositório — 1 requisição
 *   2. GraphQL traz o conteúdo de até 100 arquivos por vez — testado
 *
 * Resultado medido: 100 arquivos saem de 101 requisições para 2.
 *
 * O cache é só uma cópia do que está no repositório, indexada por `sha`. Não é
 * um índice derivado que possa divergir: se o arquivo muda, o sha muda, e a
 * entrada velha deixa de ser usada. Os arquivos continuam sendo a verdade.
 */

import type { Settings } from "./settings";
import { ErroGitHub, conferir } from "./github";
import { lerMarkdown, type Documento } from "./markdown";

const BASE = "https://api.github.com";

/** Quantos arquivos pedir por consulta GraphQL. 100 foi testado e passa. */
const LOTE = 100;

export type ItemRepo = {
  caminho: string;
  nome: string;
  sha: string;
  tamanho: number;
  texto: string;
  doc: Documento;
};

type Cache = {
  chave: string;
  itens: ItemRepo[];
  quando: number;
};

let cache: Cache | null = null;

/**
 * Texto de cada arquivo, indexado pelo sha do blob.
 *
 * Vive FORA do cache e sobrevive à invalidação — essa é a diferença que
 * importa. O sha do git é o hash do conteúdo: sha igual significa bytes
 * iguais, sempre. Então depois de gravar uma nota, as outras 99 podem ser
 * reaproveitadas em vez de baixadas de novo.
 *
 * Antes isto estava dentro do cache, e como invalidar apagava o mapa junto,
 * salvar uma tarefa re-baixava o repositório inteiro.
 */
const textoPorSha = new Map<string, string>();

/**
 * Arquivos que o último carregamento não conseguiu ler.
 *
 * Precisa chegar à tela: um `console.warn` não serve para quem usa o app no
 * celular, e uma nota que some da lista sem explicação é quase tão ruim
 * quanto uma que abre em branco.
 */
let ultimosIlegiveis: string[] = [];

export function arquivosIlegiveis(): string[] {
  return ultimosIlegiveis;
}

/** Evita que o mapa cresça sem limite numa sessão longa. */
const TETO_MEMORIA = 2000;

/** Identifica a origem: trocar de repositório invalida o cache. */
function chaveDe(cfg: Settings): string {
  return `${cfg.repoOwner}/${cfg.repoName}@${cfg.branch}`;
}

/** Chamar depois de gravar ou apagar, para a próxima leitura buscar de novo. */
export function invalidarCache(): void {
  cache = null;
}

/**
 * Esquece também o texto guardado por sha.
 *
 * Só faz sentido ao trocar de conta/repositório e nos testes — no uso normal
 * o mapa por sha DEVE sobreviver, é ele que evita re-baixar tudo a cada save.
 */
export function esquecerTudo(): void {
  cache = null;
  textoPorSha.clear();
}

function cabecalhos(cfg: Settings): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.githubToken.trim()}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function buscar(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    throw new ErroGitHub(
      navigator.onLine
        ? `Não consegui falar com o GitHub. (${e instanceof Error ? e.message : String(e)})`
        : "Você está sem internet. O app precisa de conexão para ler seus arquivos.",
      0,
    );
  }
}

/* ------------------------------------------------------------------ árvore */

type Folha = { path: string; sha: string; size: number };

async function arvore(cfg: Settings): Promise<Folha[]> {
  const url = `${BASE}/repos/${cfg.repoOwner}/${cfg.repoName}/git/trees/${encodeURIComponent(cfg.branch)}?recursive=1`;
  const resposta = await buscar(url, { headers: cabecalhos(cfg) });

  if (resposta.status === 404) return []; // repositório novo, sem commits
  // mesma tradução de erro do resto do app: limite de API não pode aparecer
  // como "token sem permissão", que foi o erro que custou uma tarde
  await conferir(resposta);

  const dados = await resposta.json();
  if (dados.truncated) {
    throw new ErroGitHub(
      "Seu repositório passou do tamanho que a API do GitHub entrega de uma vez. Fale comigo para paginar a listagem.",
      200,
    );
  }
  return (dados.tree ?? [])
    .filter(
      (n: { type: string; path: string }) =>
        n.type === "blob" &&
        n.path.endsWith(".md") &&
        !n.path.split("/").pop()!.startsWith("."),
    )
    .map((n: Folha) => ({ path: n.path, sha: n.sha, size: n.size }));
}

/* ---------------------------------------------------------------- conteúdo */

/** Escapa aspas e barras para o caminho caber dentro da string GraphQL. */
function escapar(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function conteudoEmLote(
  cfg: Settings,
  caminhos: string[],
): Promise<Map<string, string>> {
  const saida = new Map<string, string>();

  for (let i = 0; i < caminhos.length; i += LOTE) {
    const fatia = caminhos.slice(i, i + LOTE);

    // aliases f0, f1… porque nome de campo GraphQL não aceita barra nem ponto
    const campos = fatia
      .map(
        (c, n) =>
          `f${n}: object(expression: "${escapar(cfg.branch)}:${escapar(c)}") { ... on Blob { text } }`,
      )
      .join("\n");

    const query = `{ repository(owner: "${escapar(cfg.repoOwner)}", name: "${escapar(cfg.repoName)}") { ${campos} } }`;

    const resposta = await buscar(`${BASE}/graphql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.githubToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    await conferir(resposta);

    const dados = await resposta.json();
    const repo = dados.data?.repository;
    if (!repo && dados.errors?.length) {
      throw new ErroGitHub(
        `Erro ao ler os arquivos: ${dados.errors[0].message}`,
        200,
      );
    }

    if (repo) {
      fatia.forEach((caminho, n) => {
        const texto = repo[`f${n}`]?.text;
        if (typeof texto === "string") saida.set(caminho, texto);
      });
    }
  }

  return saida;
}

/* -------------------------------------------------------------- carregar */

/**
 * Devolve todos os `.md` do repositório, com conteúdo já lido e analisado.
 * Usa o cache quando a árvore não mudou.
 */
export async function carregarRepo(
  cfg: Settings,
  { memoria = 0 }: { memoria?: number } = {},
): Promise<ItemRepo[]> {
  const chave = chaveDe(cfg);

  // Janela curta em que vale servir da memória sem ir à rede: só para evitar
  // que quatro componentes montando juntos disparem quatro carregamentos.
  // Passado isso, SEMPRE conferimos a árvore — senão você edita um arquivo
  // pelo github.com e o app mostra o dado velho a sessão inteira.
  if (
    memoria > 0 &&
    cache?.chave === chave &&
    Date.now() - cache.quando < memoria
  ) {
    return cache.itens;
  }

  // 1 requisição barata que diz o sha de cada arquivo. É ela que detecta
  // qualquer alteração feita fora do app.
  const folhas = await arvore(cfg);
  if (folhas.length === 0) {
    cache = { chave, itens: [], quando: Date.now() };
    return [];
  }

  // Só baixa o conteúdo de quem mudou de sha.
  const faltando = folhas
    .filter((f) => !textoPorSha.has(f.sha))
    .map((f) => f.path);

  if (faltando.length) {
    const baixados = await conteudoEmLote(cfg, faltando);
    for (const f of folhas) {
      const texto = baixados.get(f.path);
      if (typeof texto === "string") textoPorSha.set(f.sha, texto);
    }
  }

  if (textoPorSha.size > TETO_MEMORIA) {
    const vivos = new Set(folhas.map((f) => f.sha));
    for (const sha of textoPorSha.keys()) {
      if (!vivos.has(sha)) textoPorSha.delete(sha);
    }
  }

  /**
   * Arquivo cujo conteúdo não veio fica DE FORA da lista.
   *
   * O GraphQL devolve `text: null` para o que ele considera binário ou grande
   * demais. Antes isso virava um item com corpo vazio: a nota abria em branco
   * e o próximo Salvar gravava o vazio por cima do arquivo real. Some da
   * tela é ruim; apagar sem avisar é inaceitável.
   */
  const ilegiveis = folhas.filter((f) => !textoPorSha.has(f.sha));
  ultimosIlegiveis = ilegiveis.map((f) => f.path);

  const itens: ItemRepo[] = folhas
    .filter((f) => textoPorSha.has(f.sha))
    .map((f) => {
      const texto = textoPorSha.get(f.sha)!;
      return {
        caminho: f.path,
        nome: f.path.split("/").pop()!,
        sha: f.sha,
        tamanho: f.size,
        texto,
        doc: lerMarkdown(texto),
      };
    });

  cache = { chave, itens, quando: Date.now() };
  return itens;
}

/** Só os arquivos de uma pasta, já ordenados do mais recente para o mais antigo. */
export function daPasta(itens: ItemRepo[], pasta: string): ItemRepo[] {
  const prefixo = `${pasta}/`;
  return itens
    .filter(
      (i) =>
        i.caminho.startsWith(prefixo) &&
        // só o nível direto: `pdi/metas/x.md` não entra em `pdi`
        !i.caminho.slice(prefixo.length).includes("/"),
    )
    .sort((a, b) => b.nome.localeCompare(a.nome));
}

/**
 * Atualiza instantaneamente (0ms) um item no cache de memória local.
 * Garante que se o usuário reabrir a nota/tarefa no segundo seguinte,
 * ela abre 100% atualizada sem depender da rede do GitHub.
 */
export function atualizarCacheLocal(
  caminho: string,
  texto: string,
  doc: Documento,
  sha?: string
) {
  const shaFinal = sha || `temp-${Date.now()}`;
  textoPorSha.set(shaFinal, texto);

  if (cache) {
    const nome = caminho.split("/").pop()!;
    const novoItem: ItemRepo = {
      caminho,
      nome,
      sha: shaFinal,
      tamanho: texto.length,
      texto,
      doc,
    };

    const idx = cache.itens.findIndex((i) => i.caminho === caminho);
    if (idx >= 0) {
      cache.itens[idx] = novoItem;
    } else {
      cache.itens.unshift(novoItem);
    }
    cache.quando = Date.now();
  }
}
