/**
 * Referências visuais.
 *
 * Cada referência é um .md em `referencias/`. A imagem vai para
 * `referencias/imagens/` e o .md aponta para ela com markdown normal
 * (`![](imagens/arquivo.jpg)`), para continuar legível fora do app.
 *
 * Os tipos e funções de conversão vivem agora em `tipos.ts` e `entidades.ts`.
 * Este arquivo re-exporta com nomes legados e guarda as funções específicas
 * de imagem e upload.
 */

import type { Settings } from "./settings";

export const PASTA_REFS = "referencias";
export const PASTA_IMAGENS = "referencias/imagens";

/** Limite do GitHub por arquivo via API. Acima disso a gravação falha. */
export const LIMITE_IMAGEM = 5 * 1024 * 1024;

// Re-exporta o contrato central
export { type Referencia } from "./tipos";
export { comoReferencia } from "./entidades";

import { referenciaParaArquivo } from "./entidades";
import type { Referencia } from "./tipos";

/**
 * Wrapper legado que retorna só o frontmatter (Record), não {dados,corpo}.
 * As telas novas usam `referenciaParaArquivo` de entidades.ts.
 */
export function refParaFrontmatter(r: Referencia): Record<string, unknown> {
  return referenciaParaArquivo(r).dados;
}

/** Nome de arquivo para a imagem, preservando a extensão original. */
export function nomeDeImagem(nomeOriginal: string): string {
  const ext = (nomeOriginal.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? ".jpg").toLowerCase();
  const carimbo = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const aleatorio = Math.random().toString(36).slice(2, 7);
  return `${carimbo}-${aleatorio}${ext}`;
}

/** Converte o arquivo escolhido em base64 puro, sem o prefixo data:. */
export function arquivoParaBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const r = String(leitor.result);
      const virgula = r.indexOf(",");
      resolve(virgula >= 0 ? r.slice(virgula + 1) : r);
    };
    leitor.onerror = () => reject(new Error("Não consegui ler o arquivo."));
    leitor.readAsDataURL(arquivo);
  });
}

/**
 * Caminho completo no repositório, a partir do que está gravado no `.md`.
 * O arquivo guarda `imagens/foto.jpg` (relativo, para continuar legível fora
 * do app), mas a API do GitHub quer `referencias/imagens/foto.jpg`.
 */
export function caminhoCompletoDaImagem(caminho: string): string {
  return caminho.startsWith(PASTA_REFS)
    ? caminho
    : `${PASTA_REFS}/${caminho.replace(/^\.?\//, "")}`;
}

const cacheBlobs = new Map<string, Blob>();

/**
 * Baixa uma imagem do repositório PRIVADO e devolve um `blob:` utilizável.
 *
 * Uma `<img src>` comum não dá conta: o arquivo exige o cabeçalho de
 * autenticação. Quem chamar é responsável por `URL.revokeObjectURL` depois.
 */
export async function baixarImagemPrivada(
  cfg: Settings,
  caminho: string,
): Promise<string> {
  const completo = caminhoCompletoDaImagem(caminho);
  const cacheKey = `${cfg.repoOwner}/${cfg.repoName}/${cfg.branch}/${completo}`;

  let blob = cacheBlobs.get(cacheKey);
  if (!blob) {
    const url =
      `https://api.github.com/repos/${encodeURIComponent(cfg.repoOwner)}/${encodeURIComponent(cfg.repoName)}` +
      `/contents/${completo.split("/").map(encodeURIComponent).join("/")}` +
      `?ref=${encodeURIComponent(cfg.branch)}`;

    const resposta = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cfg.githubToken.trim()}`,
        Accept: "application/vnd.github.raw",
      },
    });
    if (!resposta.ok) throw new Error(`Não consegui baixar a imagem (${resposta.status}).`);

    blob = await resposta.blob();
    cacheBlobs.set(cacheKey, blob);
  }

  return URL.createObjectURL(blob);
}

/** Junta todas as tags usadas, para montar o filtro. */
export function todasAsTags(refs: Referencia[]): string[] {
  const conta = new Map<string, number>();
  for (const r of refs) {
    for (const t of r.tags) conta.set(t, (conta.get(t) ?? 0) + 1);
  }
  return [...conta.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t);
}
