/**
 * Referências visuais.
 *
 * Cada referência é um .md em `referencias/`. A imagem vai para
 * `referencias/imagens/` e o .md aponta para ela com markdown normal
 * (`![](imagens/arquivo.jpg)`), para continuar legível fora do app.
 */

import type { Documento } from "./markdown";
import { comoLista } from "./markdown";

export const PASTA_REFS = "referencias";
export const PASTA_IMAGENS = "referencias/imagens";

/** Limite do GitHub por arquivo via API. Acima disso a gravação falha. */
export const LIMITE_IMAGEM = 5 * 1024 * 1024;

export type Referencia = {
  caminho: string;
  id: string;
  sha: string;
  titulo: string;
  /** Caminho da imagem no repo, se houver */
  imagem?: string;
  fonte?: string;
  tags: string[];
  /** O campo que faz a diferença: por que você salvou isto */
  porque: string;
  corpo: string;
};

export function comoReferencia(
  doc: Documento,
  caminho: string,
  sha: string,
  tituloFallback: string,
): Referencia {
  const d = doc.dados;
  return {
    caminho,
    id: caminho.split("/").pop()!.replace(/\.md$/, ""),
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    imagem: typeof d.imagem === "string" ? d.imagem : extrairImagem(doc.corpo),
    fonte: typeof d.fonte === "string" ? d.fonte : undefined,
    tags: comoLista(d.tags),
    porque: typeof d.porque === "string" ? d.porque : "",
    corpo: doc.corpo,
  };
}

/** Acha a primeira imagem no corpo, para quem editou o arquivo por fora. */
function extrairImagem(corpo: string): string | undefined {
  return corpo.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1];
}

export function refParaFrontmatter(r: Referencia): Record<string, unknown> {
  return {
    titulo: r.titulo,
    tipo: "referencia",
    imagem: r.imagem,
    fonte: r.fonte,
    porque: r.porque || undefined,
    tags: r.tags.length ? r.tags : undefined,
  };
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
