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

/**
 * A carga que está acontecendo AGORA, se houver.
 *
 * Sem isto, duas partes do app que abrem juntas — e elas sempre abrem juntas —
 * disparavam duas leituras completas do repositório em paralelo. O caso real:
 * ao trocar de tela, o contador da caixa de entrada no `App.tsx`, o
 * `useItemRepo` da tela nova e o autocompletar de `@` do editor pediam o
 * acervo no mesmo instante. Nenhum via o cache do outro, porque nenhum tinha
 * terminado ainda: eram três árvores completas para responder à mesma pergunta.
 *
 * Guardar a Promise resolve isso sem nenhuma coordenação entre quem chama.
 * O segundo pedido recebe exatamente o mesmo trabalho do primeiro, e o teto de
 * 5.000 requisições por hora do GitHub deixa de ser uma preocupação no uso
 * normal.
 */
let cargaEmVoo: { chave: string; promessa: Promise<ItemRepo[]> } | null = null;

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
  // Uma carga que começou ANTES desta gravação não conhece o que acabou de ser
  // gravado. Deixá-la no ar faria a próxima leitura receber, de carona, um
  // acervo desatualizado — exatamente o que invalidar existe para evitar.
  cargaEmVoo = null;
  resetarCacheArvore();
}

/**
 * Esquece também o texto guardado por sha e limpa o snapshot local.
 *
 * Só faz sentido ao trocar de conta/repositório e nos testes — no uso normal
 * o mapa por sha DEVE sobreviver, é ele que evita re-baixar tudo a cada save.
 */
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

/**
 * Arquivos internos do repositório/sistema que NÃO devem ser tratados como documentos do usuário.
 * Ex: documentação técnica da IA (AGENTS.md), arquitetura (ARCHITECTURE.md),
 * README, design system, configs e arquivos fora das pastas de dados do Klaus.
 */
export function ehArquivoInternoOuSistema(caminho: string): boolean {
  if (!caminho) return true;
  const c = caminho.toLowerCase().trim();

  // Documentos na Lixeira Soberana (.lixeira/) pertencem ao usuário e devem ser carregados no acervo
  if (c.startsWith(".lixeira/")) return false;

  // Arquivos e diretórios ocultos ou de build/código do app / templates do sistema
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
    c.startsWith("jogos/") ||
    c.includes("/jogos/") ||
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

  // Arquivos soltos diretamente na raiz do repositório (sem subpasta de conteúdo como notas/, tarefas/, etc.)
  if (!c.includes("/")) {
    return true;
  }

  return false;
}

/* ------------------------------------------------------------------ árvore */

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
    // 304 Not Modified: Resposta instantânea que NÃO gasta cota da API do GitHub!
    return cacheArvoreEmMemoria.dados.folhas;
  }

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

  // Já há uma carga do mesmo repositório a caminho: pegue carona nela em vez
  // de abrir uma segunda. `forcarRede` também pega carona — quem força quer o
  // conteúdo fresco, e uma carga que começou agora já é fresca o bastante.
  if (cargaEmVoo?.chave === chave) {
    return cargaEmVoo.promessa;
  }

  const promessa = carregarDeVerdade(cfg, chave);
  cargaEmVoo = { chave, promessa };
  try {
    return await promessa;
  } finally {
    // só limpa se ninguém tiver começado outra carga nesse meio-tempo
    if (cargaEmVoo?.promessa === promessa) cargaEmVoo = null;
  }
}

/** O trabalho de verdade. Separado para a deduplicação acima ficar legível. */
async function carregarDeVerdade(
  cfg: Settings,
  chave: string,
): Promise<ItemRepo[]> {
  // 1 requisição barata que diz o sha de cada arquivo. É ela que detecta
  // qualquer alteração feita fora do app.
  const folhas = await arvore(cfg);

  // Limpa alterações locais antigas (> 20 segundos)
  const agora = Date.now();
  for (const [caminho, alt] of alteracoesRecentes.entries()) {
    if (agora - alt.quando > 20000) {
      alteracoesRecentes.delete(caminho);
    }
  }

  // Remove da lista as folhas que sabemos que foram deletadas localmente ou que são arquivos técnicos/internos
  let folhasFiltradas = folhas
    .filter((f) => !delecoesRecentes.has(f.path))
    .filter((f) => !ehArquivoInternoOuSistema(f.path));

  // Mescla alterações locais recentes na árvore para dar consistência imediata
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

  // 1. Tenta carregar do IndexedDB os SHAs que ainda não estão na memória RAM
  const shasFaltando = folhasFiltradas
    .filter((f) => !textoPorSha.has(f.sha))
    .map((f) => f.sha);

  if (shasFaltando.length > 0) {
    const doDisco = await carregarTextosPorShas(shasFaltando);
    for (const [sha, texto] of doDisco.entries()) {
      textoPorSha.set(sha, texto);
    }
  }

  // 2. Só baixa da rede quem REALMENTE não foi encontrado nem na RAM nem no disco
  const faltando = folhasFiltradas
    .filter((f) => !textoPorSha.has(f.sha))
    .map((f) => f.path);

  if (faltando.length) {
    // Se o arquivo que falta foi alterado recentemente, usamos a cópia em memória
    // em vez de forçar download desnecessário do GitHub
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

  /**
   * Arquivo cujo conteúdo não veio fica DE FORA da lista.
   *
   * O GraphQL devolve `text: null` para o que ele considera binário ou grande
   * demais. Antes isso virava um item com corpo vazio: a nota abria em branco
   * e o próximo Salvar gravava o vazio por cima do arquivo real. Some da
   * tela é ruim; apagar sem avisar é inaceitável.
   */
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

/** Só os arquivos de uma pasta, já ordenados do mais recente para o mais antigo. */
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

/** Todos os arquivos de uma pasta e suas subpastas recursivamente. */
export function daPastaRecursiva(itens: ItemRepo[], pasta: string): ItemRepo[] {
  return daPasta(itens, pasta, true);
}

/**
 * Atualiza instantaneamente (0ms) um item no cache de memória local.
 * Garante que se o usuário reabrir a nota/tarefa no segundo seguinte,
 * ela abre 100% atualizada sem depender da rede do GitHub.
 *
 * **Chame só DEPOIS de gravar, com o sha que o GitHub devolveu.**
 *
 * Chamar antes, com o sha antigo, quebra a única promessa em que este arquivo
 * se apoia: sha igual = bytes iguais. O sintoma era cruel — se a gravação
 * falhasse (sem internet, token vencido, limite da API), a árvore continuava
 * devolvendo o sha antigo, o mapa respondia com o texto que nunca foi gravado,
 * e o app mostrava a nota como salva pela sessão inteira. Ela só sumia no
 * recarregamento seguinte, quando já não dava para saber o que se perdeu.
 *
 * Por isso o `sha` é obrigatório: sem ele não há o que garantir.
 */
export function atualizarCacheLocal(
  caminho: string,
  texto: string,
  doc: Documento,
  sha: string
) {
  // Sha inventado envenenaria o mapa: ele passaria a afirmar uma
  // correspondência conteúdo↔sha que o git não reconhece.
  if (!sha) return;

  const ehTemporario = sha.startsWith("temp_") || sha.startsWith("pending_");

  if (!ehTemporario) {
    // Trava contra o bug que já aconteceu: se este sha JÁ está no mapa com outro
    // texto, quem chamou está passando o sha antigo junto com o texto novo — ou
    // seja, anunciando como gravado algo que o GitHub ainda não confirmou.
    // Regravar aqui faria o app mostrar como salvo um texto que pode nunca ter
    // saído do navegador. Melhor ignorar e deixar a próxima leitura buscar a
    // verdade no repositório.
    const jaConhecido = textoPorSha.get(sha);
    if (jaConhecido !== undefined && jaConhecido !== texto) return;

    textoPorSha.set(sha, texto);
    salvarTextosPorSha([{ sha, texto }]).catch(() => {});
  }

  const shaFinal = sha;

  // Registra alteração recente para consistência imediata
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

/**
 * Remove instantaneamente um item do cache de memória local ao deletar.
 */
export function removerDoCacheLocal(caminho: string) {
  alteracoesRecentes.delete(caminho);
  delecoesRecentes.add(caminho);
  cargaEmVoo = null;

  // Remove o rastro da deleção após 20 segundos
  setTimeout(() => {
    delecoesRecentes.delete(caminho);
  }, 20000);

  if (cache) {
    cache.itens = cache.itens.filter((i) => i.caminho !== caminho);
    cache.quando = Date.now();
    salvarCacheNoArmazenamento(cache);
  }
}

/**
 * Retorna o cache em memória atual, ou hidrata síncronamente do armazenamento se existir.
 */
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
