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
    // .trim() de novo por segurança: se algum dia um token entrar por outro
    // caminho que não a tela de Ajustes, um "\n" aqui derrubaria tudo.
    Authorization: `Bearer ${cfg.githubToken.trim()}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * fetch com mensagem de erro que serve para alguma coisa.
 *
 * Quando o fetch falha na camada de rede o navegador só diz "Failed to fetch",
 * sem distinguir "você está sem internet" de "seu token tem uma quebra de
 * linha". Aqui a diferença é explicada.
 */
async function buscar(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    const detalhe = e instanceof Error ? e.message : String(e);
    throw new ErroGitHub(
      navigator.onLine
        ? `Não consegui falar com o GitHub. Se você acabou de colar o token, confira se não veio com espaço ou quebra de linha junto. (${detalhe})`
        : "Você está sem internet. O app precisa de conexão para ler e gravar seus arquivos.",
      0,
    );
  }
}

function raiz(cfg: Settings): string {
  return `${BASE}/repos/${cfg.repoOwner}/${cfg.repoName}/contents`;
}

/**
 * Traduz o erro do GitHub para português, distinguindo limite de API de
 * falta de permissão (os dois chegam como 403). Exportada porque `repo.ts`
 * precisa exatamente do mesmo tratamento — ela é a porta de todas as telas.
 */
export async function conferir(resposta: Response): Promise<void> {
  if (resposta.ok) return;

  let detalhe = "";
  try {
    const corpo = await resposta.json();
    detalhe = corpo?.message ?? "";
  } catch {
    /* resposta sem JSON */
  }

  // O GitHub usa 403 tanto para "sem permissão" quanto para "excedeu o limite
  // de requisições". Confundir os dois manda o usuário trocar um token que
  // está perfeito — foi assim que quase perdemos uma tarde. O cabeçalho
  // x-ratelimit-remaining é o que distingue.
  const restante = resposta.headers.get("x-ratelimit-remaining");
  const excedeu =
    (resposta.status === 403 || resposta.status === 429) && restante === "0";

  if (excedeu) {
    const reset = Number(resposta.headers.get("x-ratelimit-reset") ?? 0) * 1000;
    const minutos = reset ? Math.max(1, Math.ceil((reset - Date.now()) / 60_000)) : null;
    throw new ErroGitHub(
      minutos
        ? `Você fez muitas requisições ao GitHub e bateu no limite da hora. Ele libera em ${minutos} minuto${minutos > 1 ? "s" : ""}. Seu token está certo — é só esperar.`
        : "Você bateu no limite de requisições do GitHub por esta hora. Seu token está certo — é só esperar um pouco.",
      resposta.status,
    );
  }

  const amigavel: Record<number, string> = {
    401: "Token do GitHub inválido ou expirado. Confira em Ajustes.",
    403: "Sem permissão. O token precisa de acesso de Contents (leitura e escrita) neste repositório.",
    404: "Repositório ou arquivo não encontrado. Confira o dono e o nome do repositório em Ajustes.",
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

/** Baixa o conteúdo de um arquivo. */
export async function ler(
  cfg: Settings,
  caminho: string,
): Promise<{ texto: string; sha: string }> {
  const url = `${raiz(cfg)}/${caminho}?ref=${encodeURIComponent(cfg.branch)}`;
  const resposta = await buscar(url, { headers: cabecalhos(cfg) });
  await conferir(resposta);

  const dados = await resposta.json();
  return { texto: deBase64(dados.content), sha: dados.sha };
}

/** Baixa o conteúdo de um arquivo em determinado commit ou branch, ou devolve "" se falhar. */
export async function lerOuVazio(
  cfg: Settings,
  caminho: string,
  ref?: string,
): Promise<string> {
  try {
    const branch = ref || cfg.branch;
    const url = `${raiz(cfg)}/${caminho}?ref=${encodeURIComponent(branch)}`;
    const resposta = await buscar(url, { headers: cabecalhos(cfg) });
    if (!resposta.ok) return "";
    const dados = await resposta.json();
    return deBase64(dados.content || "");
  } catch {
    return "";
  }
}

/**
 * Cria ou atualiza um arquivo. Sem `sha` cria; com `sha` atualiza.
 * Devolve o novo SHA, que precisa ser guardado para a próxima gravação.
 */
const gravaçõesAtivas = new Map<string, Promise<string>>();

export async function gravar(
  cfg: Settings,
  caminho: string,
  texto: string,
  sha?: string,
  mensagem?: string,
): Promise<string> {
  // Se já houver um salvamento em andamento para este arquivo, aguarda o commit anterior concluir
  const gravacaoAnterior = gravaçõesAtivas.get(caminho);
  if (gravacaoAnterior) {
    try {
      const shaAtualizada = await gravacaoAnterior;
      if (shaAtualizada) sha = shaAtualizada;
    } catch {
      // ignora falha da gravação anterior
    }
  }

  const promessaAtual = (async () => {
    const fazerPut = async (shaParaEnviar?: string) => {
      return await buscar(`${raiz(cfg)}/${caminho}`, {
        method: "PUT",
        headers: { ...cabecalhos(cfg), "Content-Type": "application/json" },
        body: JSON.stringify({
          message: mensagem ?? `${shaParaEnviar ? "atualiza" : "cria"} ${caminho}`,
          content: paraBase64(texto),
          branch: cfg.branch,
          ...(shaParaEnviar ? { sha: shaParaEnviar } : {}),
        }),
      });
    };

    let shaAtual = sha;
    let resposta: Response | null = null;

    for (let tentativa = 1; tentativa <= 5; tentativa++) {
      resposta = await fazerPut(shaAtual);

      if (resposta.ok) {
        const dados = await resposta.json();
        return dados.content.sha as string;
      }

      /**
       * Repetir SÓ em 422, e nunca em 409.
       *
       * Os dois parecem a mesma coisa e não são:
       *
       * - **422** é o sha que ficou para trás por culpa do próprio app — duas
       *   gravações suas em sequência rápida, a segunda ainda segurando o sha
       *   de antes da primeira. O conteúdo que você quer gravar continua sendo
       *   o certo, então buscar o sha novo e repetir é exatamente o conserto.
       *
       * - **409** significa que o arquivo MUDOU no GitHub depois que você
       *   abriu — quase sempre porque você editou pelo site, que é coisa que
       *   você faz. Buscar o sha novo e regravar por cima aqui apagaria essa
       *   edição sem avisar. Este laço fazia isso, e ainda deixava a mensagem
       *   de conflito lá embaixo virar letra morta: ela nunca chegava na tela.
       *   Agora o 409 sai pelo `conferir` e você decide o que fazer.
       *
       * O 400 saiu da lista: pedido malformado não melhora com repetição.
       */
      if (resposta.status !== 422) break;

      await new Promise((r) => setTimeout(r, 150 * Math.pow(2, tentativa - 1)));
      try {
        const getRes = await buscar(`${raiz(cfg)}/${caminho}?ref=${encodeURIComponent(cfg.branch)}`, {
          headers: cabecalhos(cfg),
        });
        if (getRes.ok) {
          const getDados = await getRes.json();
          if (getDados && getDados.sha) {
            shaAtual = getDados.sha;
            continue;
          }
        }
      } catch {
        // ignora falha de GET e tenta o loop seguinte
      }
    }

    if (resposta) {
      await conferir(resposta);
      const dados = await resposta.json();
      return dados.content.sha as string;
    }
    throw new Error("Não foi possível gravar o arquivo após múltiplas tentativas.");
  })();

  gravaçõesAtivas.set(caminho, promessaAtual);
  try {
    return await promessaAtual;
  } finally {
    if (gravaçõesAtivas.get(caminho) === promessaAtual) {
      gravaçõesAtivas.delete(caminho);
    }
  }
}

/** Grava um arquivo binário (imagem) já em base64. */
export async function gravarBinario(
  cfg: Settings,
  caminho: string,
  base64: string,
  sha?: string,
): Promise<string> {
  const resposta = await buscar(`${raiz(cfg)}/${caminho}`, {
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
  const resposta = await buscar(`${raiz(cfg)}/${caminho}`, {
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

/* -------------------------------------------------------------- contexto */

/* ----------------------------------------------------------- diagnóstico */

export type Etapa = {
  nome: string;
  ok: boolean;
  detalhe: string;
};

/**
 * Sobe a escada de complexidade até achar o degrau que quebra.
 *
 * "Failed to fetch" não distingue internet caída de extensão bloqueando de
 * CORS recusado. Cada etapa aqui adiciona UMA variável em relação à anterior,
 * então a primeira que falhar aponta a causa exata.
 */
export async function diagnosticar(cfg: Settings): Promise<Etapa[]> {
  const etapas: Etapa[] = [];

  // Campo vazio antes de tudo: sem isso a URL sai malformada ("/repos//nome"),
  // o preflight volta sem cabeçalho de CORS e o navegador aborta com um
  // "Failed to fetch" que não ajuda ninguém. Melhor dizer logo o que falta.
  const faltando: string[] = [];
  if (!cfg.repoOwner) faltando.push("Sua conta");
  if (!cfg.repoName) faltando.push("Repositório dos dados");
  if (!cfg.githubToken) faltando.push("Token do GitHub");
  if (faltando.length) {
    etapas.push({
      nome: "Campos obrigatórios preenchidos",
      ok: false,
      detalhe: `falta preencher: ${faltando.join(", ")}`,
    });
    return etapas;
  }

  etapas.push({
    nome: "Navegador acha que está online",
    ok: navigator.onLine,
    detalhe: navigator.onLine ? "sim" : "não — sem internet",
  });

  // 1. Requisição simples, sem cabeçalho nenhum: não dispara preflight.
  //    Se falhar aqui, o problema é rede, DNS, VPN ou extensão bloqueando.
  try {
    const r = await fetch(`${BASE}/rate_limit`);
    etapas.push({
      nome: "Alcança api.github.com (sem cabeçalhos)",
      ok: r.ok,
      detalhe: `HTTP ${r.status}`,
    });
  } catch (e) {
    etapas.push({
      nome: "Alcança api.github.com (sem cabeçalhos)",
      ok: false,
      detalhe: `bloqueado — ${e instanceof Error ? e.message : String(e)}. Normalmente é extensão do navegador (bloqueador de anúncios/rastreadores), VPN ou firewall.`,
    });
    return etapas; // sem isto, nada mais faz sentido testar
  }

  // 2. Agora COM cabeçalhos, o que obriga o navegador a fazer preflight (OPTIONS).
  //    Se a etapa 1 passou e esta falhar, o problema é CORS/preflight.
  try {
    const r = await fetch(`${BASE}/rate_limit`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    etapas.push({
      nome: "Preflight CORS aceito",
      ok: r.ok,
      detalhe: `HTTP ${r.status}`,
    });
  } catch (e) {
    etapas.push({
      nome: "Preflight CORS aceito",
      ok: false,
      detalhe: `recusado — ${e instanceof Error ? e.message : String(e)}`,
    });
    return etapas;
  }

  // 3. Com o token. Se falhar só aqui, é o cabeçalho Authorization.
  if (!cfg.githubToken) {
    etapas.push({
      nome: "Token preenchido",
      ok: false,
      detalhe: "vazio — preencha o campo do token",
    });
    return etapas;
  }

  const invisiveis = /[\s\u200B-\u200D\uFEFF]/.test(cfg.githubToken);
  etapas.push({
    nome: "Token sem caracteres invisíveis",
    ok: !invisiveis,
    detalhe: invisiveis
      ? "há espaço ou quebra de linha no token — apague o campo e cole de novo"
      : `${cfg.githubToken.length} caracteres, começa com "${cfg.githubToken.slice(0, 11)}…"`,
  });

  try {
    const r = await fetch(`${BASE}/user`, { headers: cabecalhos(cfg) });
    const corpo = await r.json().catch(() => ({}));
    etapas.push({
      nome: "Token aceito pelo GitHub",
      ok: r.ok,
      detalhe: r.ok
        ? `autenticado como ${corpo.login}`
        : `HTTP ${r.status} — ${corpo.message ?? "sem detalhe"}`,
    });
  } catch (e) {
    etapas.push({
      nome: "Token aceito pelo GitHub",
      ok: false,
      detalhe: `falhou — ${e instanceof Error ? e.message : String(e)}`,
    });
    return etapas;
  }

  // 4. Mostra exatamente o que foi digitado. Caractere estranho no meio de um
  //    destes campos é a causa mais provável de a URL virar inválida.
  const mostrarCru = (v: string) =>
    JSON.stringify(v) + ` (${v.length} caracteres)`;
  etapas.push({
    nome: "Conta e repositório, exatamente como estão salvos",
    ok: Boolean(cfg.repoOwner && cfg.repoName),
    detalhe: `conta = ${mostrarCru(cfg.repoOwner)} · repositório = ${mostrarCru(cfg.repoName)}`,
  });

  const url = `${BASE}/repos/${cfg.repoOwner}/${cfg.repoName}`;
  etapas.push({
    nome: "URL montada",
    ok: true,
    detalhe: url,
  });

  // 5. A MESMA URL, mas sem cabeçalho nenhum (requisição simples, sem preflight).
  //    Se falhar aqui e a etapa 2 tiver passado, o problema é o caminho da URL
  //    — tipicamente uma extensão do navegador bloqueando por padrão.
  try {
    const r = await fetch(url);
    etapas.push({
      nome: "Alcança essa URL sem autenticação",
      ok: true,
      detalhe: `HTTP ${r.status} (404 aqui é normal: o repositório é privado)`,
    });
  } catch (e) {
    etapas.push({
      nome: "Alcança essa URL sem autenticação",
      ok: false,
      detalhe: `bloqueado antes de sair do navegador — ${e instanceof Error ? e.message : String(e)}. Como api.github.com respondeu nas etapas anteriores, é este endereço específico que está sendo barrado: quase sempre extensão do navegador. Teste numa janela anônima.`,
    });
    return etapas;
  }

  // 6. Agora com o token.
  try {
    const r = await fetch(url, { headers: cabecalhos(cfg) });
    const corpo = await r.json().catch(() => ({}));
    etapas.push({
      nome: `Enxerga ${cfg.repoOwner}/${cfg.repoName}`,
      ok: r.ok,
      detalhe: r.ok
        ? `sim — pode escrever: ${corpo.permissions?.push ? "sim" : "NÃO"}`
        : `HTTP ${r.status} — ${corpo.message ?? ""}. Se for 404, o token não tem esse repositório na lista dele.`,
    });
  } catch (e) {
    etapas.push({
      nome: "Enxerga o repositório",
      ok: false,
      detalhe: e instanceof Error ? e.message : String(e),
    });
  }

  return etapas;
}

/** Testa se o token e o repositório estão certos. Usado na tela de Configurações. */
export async function testarConexao(
  cfg: Settings,
): Promise<{ ok: true; repo: string } | { ok: false; erro: string }> {
  const faltando: string[] = [];
  if (!cfg.repoOwner) faltando.push("Sua conta");
  if (!cfg.repoName) faltando.push("Repositório dos dados");
  if (!cfg.githubToken) faltando.push("Token do GitHub");
  if (faltando.length) {
    return { ok: false, erro: `Falta preencher: ${faltando.join(", ")}.` };
  }

  try {
    const resposta = await buscar(
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
