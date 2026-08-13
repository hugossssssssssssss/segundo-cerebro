/**
 * Cliente da GitHub Contents API.
 *
 * Este arquivo é a única porta de entrada e saída de dados do app.
 * Não existe backend: o navegador fala direto com api.github.com, que
 * responde com `access-control-allow-origin: *` e aceita PUT/DELETE.
 *
 * Cada gravação vira um commit no repositório de dados. Isso dá histórico
 * e permite desfazer qualquer coisa pelo git.
 */

import type { Settings } from "./settings";

const BASE = "https://api.github.com";

export type Arquivo = {
  /** Caminho completo no repo, ex: "notas/2026-08-13-ideia.md" */
  caminho: string;
  nome: string;
  /** SHA do blob — obrigatório para atualizar ou apagar sem sobrescrever */
  sha: string;
  tamanho: number;
};

export class ErroGitHub extends Error {
  // Campo declarado fora do construtor: `erasableSyntaxOnly` do tsconfig
  // proíbe parameter properties (o atalho `readonly status` no construtor).
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ErroGitHub";
    this.status = status;
  }
}

function cabecalhos(cfg: Settings): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function raiz(cfg: Settings): string {
  return `${BASE}/repos/${cfg.repoOwner}/${cfg.repoName}/contents`;
}

async function conferir(resposta: Response): Promise<void> {
  if (resposta.ok) return;

  let detalhe = "";
  try {
    const corpo = await resposta.json();
    detalhe = corpo?.message ?? "";
  } catch {
    /* resposta sem JSON */
  }

  const amigavel: Record<number, string> = {
    401: "Token do GitHub inválido ou expirado. Confira em Configurações.",
    403: "Sem permissão. O token precisa de acesso de Contents (leitura e escrita) neste repositório.",
    404: "Repositório ou arquivo não encontrado. Confira o dono e o nome do repositório em Configurações.",
    409: "Conflito: o arquivo mudou no GitHub depois que você abriu. Recarregue e tente de novo.",
    422: "O GitHub recusou a gravação. Normalmente é o nome do arquivo ou o SHA desatualizado.",
  };

  throw new ErroGitHub(
    amigavel[resposta.status] ?? `Erro do GitHub (${resposta.status}). ${detalhe}`,
    resposta.status,
  );
}

/** Converte texto UTF-8 para base64 (o btoa puro quebra com acento). */
function paraBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = "";
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario);
}

/** Converte base64 de volta para texto UTF-8. */
function deBase64(b64: string): string {
  const binario = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Lista os arquivos .md de uma pasta.
 * Pasta que ainda não existe devolve lista vazia — é o estado normal no começo,
 * não um erro.
 */
export async function listar(cfg: Settings, pasta: string): Promise<Arquivo[]> {
  const url = `${raiz(cfg)}/${pasta}?ref=${encodeURIComponent(cfg.branch)}`;
  const resposta = await fetch(url, { headers: cabecalhos(cfg) });

  if (resposta.status === 404) return [];
  await conferir(resposta);

  const itens = await resposta.json();
  if (!Array.isArray(itens)) return [];

  return itens
    .filter((i) => i.type === "file" && i.name.endsWith(".md"))
    .map((i) => ({
      caminho: i.path,
      nome: i.name,
      sha: i.sha,
      tamanho: i.size,
    }))
    .sort((a, b) => b.nome.localeCompare(a.nome)); // mais recente primeiro
}

/** Baixa o conteúdo de um arquivo. */
export async function ler(
  cfg: Settings,
  caminho: string,
): Promise<{ texto: string; sha: string }> {
  const url = `${raiz(cfg)}/${caminho}?ref=${encodeURIComponent(cfg.branch)}`;
  const resposta = await fetch(url, { headers: cabecalhos(cfg) });
  await conferir(resposta);

  const dados = await resposta.json();
  return { texto: deBase64(dados.content), sha: dados.sha };
}

/**
 * Cria ou atualiza um arquivo. Sem `sha` cria; com `sha` atualiza.
 * Devolve o novo SHA, que precisa ser guardado para a próxima gravação.
 */
export async function gravar(
  cfg: Settings,
  caminho: string,
  texto: string,
  sha?: string,
  mensagem?: string,
): Promise<string> {
  const resposta = await fetch(`${raiz(cfg)}/${caminho}`, {
    method: "PUT",
    headers: { ...cabecalhos(cfg), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: mensagem ?? `${sha ? "atualiza" : "cria"} ${caminho}`,
      content: paraBase64(texto),
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  await conferir(resposta);

  const dados = await resposta.json();
  return dados.content.sha as string;
}

/** Grava um arquivo binário (imagem) já em base64. */
export async function gravarBinario(
  cfg: Settings,
  caminho: string,
  base64: string,
  sha?: string,
): Promise<string> {
  const resposta = await fetch(`${raiz(cfg)}/${caminho}`, {
    method: "PUT",
    headers: { ...cabecalhos(cfg), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `envia ${caminho}`,
      content: base64,
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  await conferir(resposta);
  const dados = await resposta.json();
  return dados.content.sha as string;
}

/** Apaga um arquivo. O conteúdo continua recuperável pelo histórico do git. */
export async function apagar(
  cfg: Settings,
  caminho: string,
  sha: string,
): Promise<void> {
  const resposta = await fetch(`${raiz(cfg)}/${caminho}`, {
    method: "DELETE",
    headers: { ...cabecalhos(cfg), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `apaga ${caminho}`,
      sha,
      branch: cfg.branch,
    }),
  });
  await conferir(resposta);
}

/** Testa se o token e o repositório estão certos. Usado na tela de Configurações. */
export async function testarConexao(
  cfg: Settings,
): Promise<{ ok: true; repo: string } | { ok: false; erro: string }> {
  try {
    const resposta = await fetch(
      `${BASE}/repos/${cfg.repoOwner}/${cfg.repoName}`,
      { headers: cabecalhos(cfg) },
    );
    await conferir(resposta);
    const dados = await resposta.json();

    if (!dados.permissions?.push) {
      return {
        ok: false,
        erro: "O token consegue ler mas não escrever. Ative a permissão de Contents: Read and write.",
      };
    }
    return { ok: true, repo: dados.full_name };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}
