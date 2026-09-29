/**
 * Klaus GitHub Contents & Data API Client
 *
 * Cliente oficial para comunicação direta do navegador com a API do GitHub.
 * Todas as gravações viram commits com histórico no repositório de dados do usuário.
 */

import { type Settings, limparToken } from "./settings";
import { lerMarkdown } from "./markdown";
import { autoMergeDocumentoMarkdown } from "./autoMergeMarkdown";
import { registrarRespostaGitHub } from "./telemetriaRequisicoes";

const BASE = "https://api.github.com";

export function conteudosSemelhantes(textoA: string, textoB: string): boolean {
  if (textoA === textoB) return true;
  try {
    const docA = lerMarkdown(textoA);
    const docB = lerMarkdown(textoB);
    if (docA.corpo.trim() !== docB.corpo.trim()) return false;
    const dadosA = { ...docA.dados };
    const dadosB = { ...docB.dados };
    delete dadosA.atualizado;
    delete dadosB.atualizado;
    return JSON.stringify(dadosA) === JSON.stringify(dadosB);
  } catch {
    return textoA.trim() === textoB.trim();
  }
}

export class ErroGitHub extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ErroGitHub";
    this.status = status;
  }
}

export const KlausGitHubError = ErroGitHub;

function cabecalhos(cfg: Settings): HeadersInit {
  const token = limparToken(cfg.githubToken);
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function buscar(url: string, init?: RequestInit, maxRetries = 2): Promise<Response> {
  let tentativa = 0;
  while (tentativa <= maxRetries) {
    try {
      const res = await fetch(url, init);
      registrarRespostaGitHub(url, init?.method || "GET", res.status, res.headers);
      if ((res.status === 429 || res.status === 503) && tentativa < maxRetries) {
        const retryAfterHeader = res.headers.get("retry-after");
        const fator = typeof process !== "undefined" && process.env.NODE_ENV === "test" ? 0 : 1000;
        const esperaMs = retryAfterHeader
          ? parseInt(retryAfterHeader, 10) * fator
          : Math.pow(2, tentativa) * fator;
        if (esperaMs > 0) await new Promise((r) => setTimeout(r, esperaMs));
        tentativa++;
        continue;
      }
      return res;
    } catch (e) {
      if (tentativa < maxRetries && navigator.onLine) {
        const fator = typeof process !== "undefined" && process.env.NODE_ENV === "test" ? 0 : 1000;
        const esperaMs = Math.pow(2, tentativa) * fator;
        if (esperaMs > 0) await new Promise((r) => setTimeout(r, esperaMs));
        tentativa++;
        continue;
      }
      const detalhe = e instanceof Error ? e.message : String(e);
      throw new ErroGitHub(
        navigator.onLine
          ? `Não consegui falar com o GitHub (${detalhe}). As alterações foram salvas localmente e sincronizarão em segundo plano.`
          : "Você está sem internet. O Klaus salvou tudo localmente e sincronizará quando a conexão voltar.",
        0,
      );
    }
  }
  return fetch(url, init);
}

function raiz(cfg: Settings): string {
  return `${BASE}/repos/${cfg.repoOwner}/${cfg.repoName}/contents`;
}

export async function conferir(resposta: Response): Promise<void> {
  if (resposta.ok) return;

  let detalhe = "";
  try {
    const corpo = await resposta.json();
    detalhe = corpo?.message ?? "";
  } catch {
    /* resposta sem JSON */
  }

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

  const msgAmigavel = amigavel[resposta.status];
  const mensagemFinal = msgAmigavel
    ? `${msgAmigavel} (GitHub respondeu: ${detalhe || resposta.statusText || "sem detalhes"})`
    : `Erro do GitHub (${resposta.status}). ${detalhe || resposta.statusText || "sem detalhes"}`;

  throw new ErroGitHub(mensagemFinal, resposta.status);
}

function paraBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = "";
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario);
}

function deBase64(b64: string): string {
  const binario = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function urlDeCaminho(cfg: Settings, caminho: string): string {
  if (typeof caminho !== "string") {
    return raiz(cfg);
  }
  const caminhoCodificado = caminho
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${raiz(cfg)}/${caminhoCodificado}`;
}

export async function ler(
  cfg: Settings,
  caminho: string,
  opcoes?: { silenciar404?: boolean },
): Promise<{ texto: string; sha: string }> {
  const url = `${urlDeCaminho(cfg, caminho)}?ref=${encodeURIComponent(cfg.branch)}`;
  const headers = { ...cabecalhos(cfg) };
  if (opcoes?.silenciar404) {
    (headers as any)["x-silent-404"] = "true";
  }
  const resposta = await buscar(url, { headers, cache: "no-store" });
  await conferir(resposta);

  const dados = await resposta.json();
  return { texto: deBase64(dados.content), sha: dados.sha };
}

export async function lerOuVazio(
  cfg: Settings,
  caminho: string,
  ref?: string,
): Promise<string> {
  try {
    const branch = ref || cfg.branch;
    const url = `${urlDeCaminho(cfg, caminho)}?ref=${encodeURIComponent(branch)}`;
    const headers = { ...cabecalhos(cfg), "x-silent-404": "true" };
    const resposta = await buscar(url, { headers, cache: "no-store" });
    if (!resposta.ok) return "";
    const dados = await resposta.json();
    return deBase64(dados.content || "");
  } catch {
    return "";
  }
}

const gravaçõesAtivas = new Map<string, Promise<string>>();

export async function gravar(
  cfg: Settings,
  caminho: string,
  texto: string,
  sha?: string,
  mensagem?: string,
  textoBase?: string,
): Promise<string> {
  const gravacaoAnterior = gravaçõesAtivas.get(caminho);
  if (gravacaoAnterior) {
    try {
      const shaAtualizada = await gravacaoAnterior;
      if (shaAtualizada) sha = shaAtualizada;
    } catch {}
  }

  const promessaAtual = (async () => {
    const fazerPut = async (shaParaEnviar?: string, textoCustom?: string) => {
      const conteudoFinal = textoCustom !== undefined ? textoCustom : texto;
      return await buscar(urlDeCaminho(cfg, caminho), {
        method: "PUT",
        headers: { ...cabecalhos(cfg), "Content-Type": "application/json" },
        body: JSON.stringify({
          message: mensagem ?? `${shaParaEnviar ? "atualiza" : "cria"} ${caminho}`,
          content: paraBase64(conteudoFinal),
          branch: cfg.branch,
          ...(shaParaEnviar ? { sha: shaParaEnviar } : {}),
        }),
      });
    };

    const eraNovaCriacao = sha === undefined;
    let shaAtual = sha;
    let resposta: Response | null = null;

    for (let tentativa = 1; tentativa <= 5; tentativa++) {
      resposta = await fazerPut(shaAtual);

      if (resposta.ok) {
        const dados = await resposta.json();
        return dados.content.sha as string;
      }

      if (resposta.status === 409) {
        try {
          const { sha: shaDestino, texto: textoDestino } = await ler(cfg, caminho);
          if (conteudosSemelhantes(textoDestino, texto)) {
            return shaDestino;
          }

          const baseReal = textoBase !== undefined ? textoBase : textoDestino;
          const merge = autoMergeDocumentoMarkdown(baseReal, texto, textoDestino);
          if (merge.sucesso && !merge.teveConflito) {
            const putRes = await fazerPut(shaDestino, merge.textoMesclado);
            if (putRes.ok) {
              const dadosMerge = await putRes.json();
              return dadosMerge.content.sha as string;
            }
          }

          throw new ErroGitHub(
            `Conflito de edição no GitHub (HTTP 409). O arquivo foi modificado por outro aparelho simultaneamente.\n\nAcesse a Caixa de Entrada > Rascunhos Offline para reconciliar a versão local ou remota.`,
            409,
          );
        } catch (lerErr) {
          if (lerErr instanceof ErroGitHub) throw lerErr;
          break;
        }
      }

      if (resposta.status === 422) {
        try {
          const { sha: shaDestino, texto: textoDestino } = await ler(cfg, caminho);
          if (conteudosSemelhantes(textoDestino, texto)) {
            return shaDestino;
          }

          const baseReal422 = textoBase !== undefined ? textoBase : "";
          const merge = autoMergeDocumentoMarkdown(baseReal422, texto, textoDestino);
          if (merge.sucesso && !merge.teveConflito) {
            const putRes = await fazerPut(shaDestino, merge.textoMesclado);
            if (putRes.ok) {
              const dadosMerge = await putRes.json();
              return (dadosMerge.content?.sha || dadosMerge.commit?.sha || shaDestino) as string;
            }
          }

          if (eraNovaCriacao && !caminho.startsWith("caixa-entrada/") && !caminho.startsWith(".klaus/")) {
            throw new ErroGitHub(
              `Conflito: já existe um arquivo com conteúdo diferente em "${caminho}". Acesse Rascunhos Offline para resolver.`,
              409,
            );
          }

          const putRes = await fazerPut(shaDestino, texto);
          if (putRes.ok) {
            const dadosPut = await putRes.json();
            return (dadosPut.content?.sha || dadosPut.commit?.sha || shaDestino) as string;
          }
        } catch (lerErr) {
          if (lerErr instanceof ErroGitHub) {
            throw lerErr;
          }
          break;
        }
      }

      if (resposta.status !== 422) break;

      await new Promise((r) => setTimeout(r, 150 * Math.pow(2, tentativa - 1)));
      try {
        const getRes = await buscar(`${urlDeCaminho(cfg, caminho)}?ref=${encodeURIComponent(cfg.branch)}`, {
          headers: cabecalhos(cfg),
          cache: "no-store",
        });
        if (getRes.ok) {
          const getDados = await getRes.json();
          if (getDados && getDados.sha) {
            shaAtual = getDados.sha;
            continue;
          }
        }
      } catch {}
    }

    if (resposta) {
      await conferir(resposta);
      const dados = await resposta.json();
      return (dados.content?.sha || dados.commit?.sha || "") as string;
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

export async function gravarBinario(
  cfg: Settings,
  caminho: string,
  base64: string,
  sha?: string,
): Promise<string> {
  const resposta = await buscar(urlDeCaminho(cfg, caminho), {
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

export async function apagar(
  cfg: Settings,
  caminho: string,
  sha: string,
): Promise<void> {
  const resposta = await buscar(urlDeCaminho(cfg, caminho), {
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

export type Etapa = {
  nome: string;
  ok: boolean;
  detalhe: string;
};

export async function diagnosticar(cfg: Settings): Promise<Etapa[]> {
  const etapas: Etapa[] = [];

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
    return etapas;
  }

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

export type ArquivoLoteGit = {
  caminho: string;
  conteudo: string;
};

export async function gravarLoteGit(
  cfg: Settings,
  arquivos: ArquivoLoteGit[],
  mensagem: string,
): Promise<{ commitSha: string; treeSha: string }> {
  if (!arquivos || arquivos.length === 0) {
    throw new ErroGitHub("Nenhum arquivo informado para gravação em lote.", 400);
  }

  const repoBase = `${BASE}/repos/${cfg.repoOwner}/${cfg.repoName}`;
  const headers = cabecalhos(cfg);

  const refRes = await buscar(`${repoBase}/git/ref/heads/${cfg.branch}`, { headers });
  await conferir(refRes);
  const refDados = await refRes.json();
  const commitPaiSha: string = refDados.object?.sha;
  if (!commitPaiSha) {
    throw new ErroGitHub(`Não foi possível localizar o commit inicial da branch ${cfg.branch}.`, 404);
  }

  const commitPaiRes = await buscar(`${repoBase}/git/commits/${commitPaiSha}`, { headers });
  await conferir(commitPaiRes);
  const commitPaiDados = await commitPaiRes.json();
  const baseTreeSha: string = commitPaiDados.tree?.sha;

  const itensArvore = arquivos.map((arq) => ({
    path: arq.caminho,
    mode: "100644",
    type: "blob",
    content: arq.conteudo,
  }));

  const treeRes = await buscar(`${repoBase}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: itensArvore,
    }),
  });
  await conferir(treeRes);
  const treeDados = await treeRes.json();
  const novaTreeSha: string = treeDados.sha;

  const novoCommitRes = await buscar(`${repoBase}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message: mensagem,
      tree: novaTreeSha,
      parents: [commitPaiSha],
    }),
  });
  await conferir(novoCommitRes);
  const novoCommitDados = await novoCommitRes.json();
  const novoCommitSha: string = novoCommitDados.sha;

  const patchRefRes = await buscar(`${repoBase}/git/refs/heads/${cfg.branch}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      sha: novoCommitSha,
      force: false,
    }),
  });
  await conferir(patchRefRes);

  return {
    commitSha: novoCommitSha,
    treeSha: novaTreeSha,
  };
}

export function ehErroTokenGithub(msg?: string | null): boolean {
  if (!msg) return false;
  const m = String(msg).toLowerCase();
  return (
    m.includes("token do github") ||
    m.includes("bad credentials") ||
    m.includes("401") ||
    m.includes("não configurado") ||
    m.includes("sem token") ||
    m.includes("expirado")
  );
}

// ── Nomes Canônicos do Klaus SDK ─────────────────────────────────────────────
export const readKlausFile = ler;
export const readKlausFileOrEmpty = lerOuVazio;
export const writeKlausFile = gravar;
export const writeKlausBinaryFile = gravarBinario;
export const deleteKlausFile = apagar;
export const commitKlausBatch = gravarLoteGit;
export const testKlausConnection = testarConexao;
export const diagnoseKlausConnection = diagnosticar;
export const isKlausAuthError = ehErroTokenGithub;
