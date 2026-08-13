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
import { ErroGitHub } from "./github";
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

/** Identifica a origem: trocar de repositório invalida o cache. */
function chaveDe(cfg: Settings): string {
  return `${cfg.repoOwner}/${cfg.repoName}@${cfg.branch}`;
}

/** Chamar depois de gravar ou apagar, para a próxima leitura buscar de novo. */
export function invalidarCache(): void {
  cache = null;
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
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    throw new ErroGitHub(
      resposta.status === 401
        ? "Token do GitHub inválido ou expirado. Confira em Ajustes."
        : `Não consegui ler o repositório (${resposta.status}). ${corpo?.message ?? ""}`,
      resposta.status,
    );
  }

  const dados = await resposta.json();
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

    if (!resposta.ok) {
      throw new ErroGitHub(
        `O GitHub recusou a leitura em lote (${resposta.status}).`,
        resposta.status,
      );
    }

    const dados = await resposta.json();
    if (dados.errors?.length) {
      throw new ErroGitHub(
        `Erro ao ler os arquivos: ${dados.errors[0].message}`,
        200,
      );
    }

    const repo = dados.data?.repository ?? {};
    fatia.forEach((caminho, n) => {
      const texto = repo[`f${n}`]?.text;
      if (typeof texto === "string") saida.set(caminho, texto);
    });
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
  { forcar = false } = {},
): Promise<ItemRepo[]> {
  const chave = chaveDe(cfg);

  if (!forcar && cache?.chave === chave) return cache.itens;

  const folhas = await arvore(cfg);
  if (folhas.length === 0) {
    cache = { chave, itens: [], quando: Date.now() };
    return [];
  }

  // Reaproveita o texto dos arquivos cujo sha não mudou — depois de gravar
  // uma nota, as outras 99 não precisam vir de novo.
  const conhecidos = new Map(
    (cache?.chave === chave ? cache.itens : []).map((i) => [i.sha, i.texto]),
  );

  const faltando = folhas.filter((f) => !conhecidos.has(f.sha)).map((f) => f.path);
  const baixados = faltando.length ? await conteudoEmLote(cfg, faltando) : new Map();

  const itens: ItemRepo[] = folhas.map((f) => {
    const texto = baixados.get(f.path) ?? conhecidos.get(f.sha) ?? "";
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
