/**
 * Klaus Repository Core Engine
 *
 * Carrega o repositório inteiro em duas requisições, não em uma por arquivo.
 * Git Trees API traz a árvore inteira do repositório (1 req) e GraphQL traz o conteúdo
 * em lote de até 100 arquivos indexados por SHA.
 */

import type { Settings } from "./settings";
import { ErroGitHub, conferir } from "./github";
import { lerMarkdown, type Documento } from "./markdown";
import { salvarTextosPorSha, carregarTextosPorShas, limparCacheSha } from "./storageOffline";
import { registrarRespostaGitHub } from "./telemetriaRequisicoes";

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

export type Cache = {
  chave: string;
  itens: ItemRepo[];
  quando: number;
};

export let cache: Cache | null = null;

const CHAVE_CACHE_ACERVO = "klaus_cache_acervo_snapshot_v1";
const CHAVE_CACHE_ETAG = "klaus_cache_etag_snapshot_v1";

function carregarCacheDoArmazenamento(chave: string): Cache | null {
  try {
    const salvo = typeof localStorage !== "undefined" ? localStorage.getItem(CHAVE_CACHE_ACERVO) : null;
    if (salvo) {
      const parsed = JSON.parse(salvo) as Cache;
      if (parsed && parsed.chave === chave && Array.isArray(parsed.itens)) {
        for (const item of parsed.itens) {
          if (item.sha && item.texto) {
            textoPorSha.set(item.sha, item.texto);
          }
        }
        return parsed;
      }
    }
  } catch {}
  return null;
}

function salvarCacheNoArmazenamento(novoCache: Cache) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CHAVE_CACHE_ACERVO, JSON.stringify(novoCache));
    }
  } catch {}
}

type AlteracaoRecente = {
  caminho: string;
  sha: string;
  size: number;
  texto: string;
  quando: number;
};

const alteracoesRecentes = new Map<string, AlteracaoRecente>();
const delecoesRecentes = new Set<string>();

let cargaEmVoo: { chave: string; promessa: Promise<ItemRepo[]> } | null = null;
const textoPorSha = new Map<string, string>();
let ultimosIlegiveis: string[] = [];

export function arquivosIlegiveis(): string[] {
  return ultimosIlegiveis;
}

const TETO_MEMORIA = 2000;

function chaveDe(cfg: Settings): string {
  return `${cfg.repoOwner}/${cfg.repoName}@${cfg.branch}`;
}

export function invalidarCache(): void {
  cache = null;
  cargaEmVoo = null;
  resetarCacheArvore();
}

export function esquecerTudo(): void {
  cache = null;
  cargaEmVoo = null;
  textoPorSha.clear();
  resetarCacheArvore();
  limparCacheSha().catch(() => {});
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(CHAVE_CACHE_ACERVO);
      localStorage.removeItem(CHAVE_CACHE_ETAG);
    }
  } catch {}
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
    const res = await fetch(url, init);
    registrarRespostaGitHub(url, init?.method || "GET", res.status, res.headers);
    return res;
  } catch (e) {
    throw new ErroGitHub(
      navigator.onLine
        ? `Não consegui falar com o GitHub. (${e instanceof Error ? e.message : String(e)})`
        : "Você está sem internet. O app precisa de conexão para ler seus arquivos.",
      0,
    );
  }
}

export function ehArquivoInternoOuSistema(caminho: string): boolean {
  if (!caminho) return true;
  const c = caminho.toLowerCase().trim();

  if (c.startsWith(".lixeira/")) return false;

  if (c.startsWith(".") || c.includes("/.") || c.startsWith(".klaus/") || c.includes("/.klaus/")) return true;
  if (
    c.startsWith("node_modules/") ||
    c.startsWith(".github/") ||
    c.startsWith(".agents/") ||
    c.startsWith(".gemini/") ||
    c.startsWith(".vscode/") ||
    c.startsWith("src/") ||
    c.startsWith("public/") ||
    c.startsWith("dist/") ||
    c.startsWith("modelos/") ||
    c.startsWith("templates/") ||
    c.startsWith(".templates/") ||
    c.includes("/templates/") ||
    c.startsWith("extensao/") ||
    c.includes("/extensao/") ||
    c.startsWith("scripts/") ||
    c.includes("/scripts/") ||
    c.startsWith("exemplos/")
  ) {
    return true;
  }

  const nome = c.split("/").pop() || "";
  const nomeSemExt = nome.replace(/\.(md|json|excalidraw)$/i, "");

  const nomesInternos = [
    "agents.md",
    "architecture.md",
    "design_system.md",
    "readme.md",
    "contributing.md",
    "license.md",
    "security.md",
    "changelog.md",
    "todo.md",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "vite.config.ts",
    "vitest.config.ts",
    "estado.json",
  ];

  if (nomesInternos.includes(nome) || nomesInternos.includes(nomeSemExt)) return true;

  if (!c.includes("/")) {
    return true;
  }

  return false;
}

type Folha = { path: string; sha: string; size: number };

type CacheArvore = {
  etag: string;
  folhas: Folha[];
  quando: number;
};

let cacheArvoreEmMemoria: { chave: string; dados: CacheArvore } | null = null;

export function resetarCacheArvore(): void {
  cacheArvoreEmMemoria = null;
}

function carregarEtagDoArmazenamento(chave: string): CacheArvore | null {
  try {
    const salvo = typeof localStorage !== "undefined" ? localStorage.getItem(CHAVE_CACHE_ETAG) : null;
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (parsed && parsed.chave === chave && parsed.dados) {
        return parsed.dados;
      }
    }
  } catch {}
  return null;
}

function salvarEtagNoArmazenamento(chave: string, dados: CacheArvore) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CHAVE_CACHE_ETAG, JSON.stringify({ chave, dados }));
    }
  } catch {}
}

async function arvore(cfg: Settings): Promise<Folha[]> {
  const chave = chaveDe(cfg);
  const url = `${BASE}/repos/${cfg.repoOwner}/${cfg.repoName}/git/trees/${encodeURIComponent(cfg.branch)}?recursive=1`;

  if (!cacheArvoreEmMemoria) {
    const doStorage = carregarEtagDoArmazenamento(chave);
    if (doStorage) {
      cacheArvoreEmMemoria = { chave, dados: doStorage };
    }
  }

  const etagAtual = cacheArvoreEmMemoria?.chave === chave ? cacheArvoreEmMemoria.dados.etag : null;

  const headers: HeadersInit = {
    ...cabecalhos(cfg),
    ...(etagAtual ? { "If-None-Match": etagAtual } : {}),
  };

  const resposta = await buscar(url, { headers });

  if (resposta.status === 304 && cacheArvoreEmMemoria?.chave === chave) {
    return cacheArvoreEmMemoria.dados.folhas;
  }

  if (resposta.status === 404) return [];
  await conferir(resposta);

  const dados = await resposta.json();
  if (dados.truncated) {
    throw new ErroGitHub(
      "Seu repositório passou do tamanho que a API do GitHub entrega de uma vez. Fale comigo para paginar a listagem.",
      200,
    );
  }
  const novasFolhas = (dados.tree ?? [])
    .filter(
      (n: { type: string; path: string }) =>
        n.type === "blob" &&
        (n.path.endsWith(".md") || n.path.endsWith(".json")) &&
        !n.path.split("/").pop()!.startsWith(".") &&
        !ehArquivoInternoOuSistema(n.path),
    )
    .map((n: Folha) => ({ path: n.path, sha: n.sha, size: n.size }));

  const novoEtag = resposta.headers.get("etag");
  if (novoEtag) {
    const novosDados: CacheArvore = {
      etag: novoEtag,
      folhas: novasFolhas,
      quando: Date.now(),
    };
    cacheArvoreEmMemoria = {
      chave,
      dados: novosDados,
    };
    salvarEtagNoArmazenamento(chave, novosDados);
  }

  return novasFolhas;
}

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

export async function carregarRepo(
  cfg: Settings,
  { memoria = 0, forcarRede = false }: { memoria?: number; forcarRede?: boolean } = {},
): Promise<ItemRepo[]> {
  const chave = chaveDe(cfg);

  if (
    !forcarRede &&
    memoria > 0 &&
    cache?.chave === chave &&
    Date.now() - cache.quando < memoria
  ) {
    return cache.itens;
  }

  if (cargaEmVoo?.chave === chave) {
    return cargaEmVoo.promessa;
  }

  const promessa = carregarDeVerdade(cfg, chave);
  cargaEmVoo = { chave, promessa };
  try {
    return await promessa;
  } finally {
    if (cargaEmVoo?.promessa === promessa) cargaEmVoo = null;
  }
}

async function carregarDeVerdade(
  cfg: Settings,
  chave: string,
): Promise<ItemRepo[]> {
  const folhas = await arvore(cfg);

  const agora = Date.now();
  for (const [caminho, alt] of alteracoesRecentes.entries()) {
    if (agora - alt.quando > 20000) {
      alteracoesRecentes.delete(caminho);
    }
  }

  let folhasFiltradas = folhas
    .filter((f) => !delecoesRecentes.has(f.path))
    .filter((f) => !ehArquivoInternoOuSistema(f.path));

  for (const alt of alteracoesRecentes.values()) {
    const idx = folhasFiltradas.findIndex((f) => f.path === alt.caminho);
    if (idx >= 0) {
      if (folhasFiltradas[idx].sha !== alt.sha) {
        folhasFiltradas[idx] = { path: alt.caminho, sha: alt.sha, size: alt.size };
      }
    } else {
      folhasFiltradas.push({ path: alt.caminho, sha: alt.sha, size: alt.size });
    }
  }

  if (folhasFiltradas.length === 0) {
    cache = { chave, itens: [], quando: Date.now() };
    return [];
  }

  const shasFaltando = folhasFiltradas
    .filter((f) => !textoPorSha.has(f.sha))
    .map((f) => f.sha);

  if (shasFaltando.length > 0) {
    const doDisco = await carregarTextosPorShas(shasFaltando);
    for (const [sha, texto] of doDisco.entries()) {
      textoPorSha.set(sha, texto);
    }
  }

  const faltando = folhasFiltradas
    .filter((f) => !textoPorSha.has(f.sha))
    .map((f) => f.path);

  if (faltando.length) {
    const caminhosParaBaixar = faltando.filter((caminho) => {
      const recente = alteracoesRecentes.get(caminho);
      if (recente) {
        textoPorSha.set(recente.sha, recente.texto);
        return false;
      }
      return true;
    });

    if (caminhosParaBaixar.length) {
      const baixados = await conteudoEmLote(cfg, caminhosParaBaixar);
      const novosParaDisco: { sha: string; texto: string }[] = [];

      for (const f of folhasFiltradas) {
        const texto = baixados.get(f.path);
        if (typeof texto === "string") {
          textoPorSha.set(f.sha, texto);
          novosParaDisco.push({ sha: f.sha, texto });
        }
      }

      if (novosParaDisco.length > 0) {
        salvarTextosPorSha(novosParaDisco).catch(() => {});
      }
    }
  }

  if (textoPorSha.size > TETO_MEMORIA) {
    const vivos = new Set(folhasFiltradas.map((f) => f.sha));
    for (const sha of textoPorSha.keys()) {
      if (!vivos.has(sha)) textoPorSha.delete(sha);
    }
  }

  const ilegiveis = folhasFiltradas.filter((f) => !textoPorSha.has(f.sha));
  ultimosIlegiveis = ilegiveis.map((f) => f.path);

  const itens: ItemRepo[] = folhasFiltradas
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
  salvarCacheNoArmazenamento(cache);
  return itens;
}

export function daPasta(itens: ItemRepo[], pasta: string, recursivo = false): ItemRepo[] {
  const prefixo = `${pasta}/`;
  return itens
    .filter((i) => {
      if (!i.caminho.startsWith(prefixo)) return false;
      if (ehArquivoInternoOuSistema(i.caminho)) return false;
      if (pasta !== ".lixeira" && i.caminho.startsWith(".lixeira/")) return false;
      if (!recursivo && i.caminho.slice(prefixo.length).includes("/")) return false;
      return true;
    })
    .sort((a, b) => b.nome.localeCompare(a.nome));
}

export function daPastaRecursiva(itens: ItemRepo[], pasta: string): ItemRepo[] {
  return daPasta(itens, pasta, true);
}

export function atualizarCacheLocal(
  caminho: string,
  texto: string,
  doc: Documento,
  sha: string
) {
  if (!sha) return;

  const ehTemporario = sha.startsWith("temp_") || sha.startsWith("pending_");

  if (!ehTemporario) {
    const jaConhecido = textoPorSha.get(sha);
    if (jaConhecido !== undefined && jaConhecido !== texto) return;

    textoPorSha.set(sha, texto);
    salvarTextosPorSha([{ sha, texto }]).catch(() => {});
  }

  const shaFinal = sha;

  alteracoesRecentes.set(caminho, {
    caminho,
    sha: shaFinal,
    size: texto.length,
    texto,
    quando: Date.now(),
  });
  delecoesRecentes.delete(caminho);
  cargaEmVoo = null;

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
    salvarCacheNoArmazenamento(cache);
  }
}

export function removerDoCacheLocal(caminho: string) {
  alteracoesRecentes.delete(caminho);
  delecoesRecentes.add(caminho);
  cargaEmVoo = null;

  setTimeout(() => {
    delecoesRecentes.delete(caminho);
  }, 20000);

  if (cache) {
    cache.itens = cache.itens.filter((i) => i.caminho !== caminho);
    cache.quando = Date.now();
    salvarCacheNoArmazenamento(cache);
  }
}

export function obterCacheExistente(cfg: Settings): Cache | null {
  const chave = chaveDe(cfg);
  if (cache && cache.chave === chave) {
    return cache;
  }
  const doArmazenamento = carregarCacheDoArmazenamento(chave);
  if (doArmazenamento) {
    cache = doArmazenamento;
    return cache;
  }
  return null;
}

// ── Nomes Canônicos do Klaus SDK ─────────────────────────────────────────────
export const loadKlausRepo = carregarRepo;
export const invalidateKlausRepoCache = invalidarCache;
export const resetKlausRepoMemory = esquecerTudo;
export const filterKlausRepoFolder = daPasta;
export const filterKlausRepoFolderRecursive = daPastaRecursiva;
export const updateKlausLocalCache = atualizarCacheLocal;
export const removeFromKlausLocalCache = removerDoCacheLocal;
export const getKlausExistingCache = obterCacheExistente;

export type KlausRepoItem = ItemRepo;
export type KlausRepoCache = Cache;
