/**
 * Leitura e escrita de Markdown com frontmatter YAML.
 *
 * Regra central do projeto: o arquivo .md é a fonte da verdade.
 * Frontmatter é OPCIONAL — um arquivo sem ele continua abrindo normalmente.
 * Nunca jogue fora conteúdo que não entendeu.
 */

// js-yaml v5 é ESM puro e não tem export default — só imports nomeados.
import { load, dump } from "js-yaml";

export type Frontmatter = Record<string, unknown>;

export type Documento = {
  dados: Frontmatter;
  corpo: string;
};

const SEPARADOR = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Separa o frontmatter do corpo.
 * Se o YAML estiver quebrado, devolve o texto inteiro como corpo em vez de
 * estourar erro — perder o texto do usuário seria muito pior que perder os campos.
 */
export function lerMarkdown(texto: string): Documento {
  const encontrado = texto.match(SEPARADOR);
  if (!encontrado) return { dados: {}, corpo: texto };

  try {
    const analisado = load(encontrado[1]);
    const dados =
      analisado && typeof analisado === "object" && !Array.isArray(analisado)
        ? (analisado as Frontmatter)
        : {};
    return { dados, corpo: texto.slice(encontrado[0].length) };
  } catch {
    return { dados: {}, corpo: texto };
  }
}

/** Monta o arquivo .md de volta. Frontmatter vazio não gera bloco `---`. */
export function escreverMarkdown(doc: Documento): string {
  const campos = Object.entries(doc.dados).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (campos.length === 0) return doc.corpo;

  const yamlTexto = dump(Object.fromEntries(campos), {
    lineWidth: -1, // não quebra linhas longas
    noRefs: true,
  });
  return `---\n${yamlTexto}---\n\n${doc.corpo.replace(/^\n+/, "")}`;
}

/** Primeira linha de conteúdo, usada como título quando não há campo `titulo`. */
export function tituloProvavel(doc: Documento, nomeArquivo: string): string {
  if (typeof doc.dados.titulo === "string" && doc.dados.titulo.trim()) {
    return doc.dados.titulo.trim();
  }
  const cabecalho = doc.corpo.match(/^#{1,6}\s+(.+)$/m);
  if (cabecalho) return cabecalho[1].trim();

  const primeira = doc.corpo.split("\n").find((l) => l.trim());
  if (primeira) return primeira.trim().slice(0, 80);

  return nomeArquivo.replace(/\.md$/, "");
}

/** Transforma um título em nome de arquivo seguro (sem acento, sem símbolo). */
export function nomeDeArquivo(titulo: string): string {
  const limpo = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // tira acentos
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);

  const base = limpo || "sem-titulo";
  const carimbo = new Date().toISOString().slice(0, 10);
  return `${carimbo}-${base}.md`;
}

/** Lê uma lista do frontmatter tolerando string única ou ausência. */
export function comoLista(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map(String);
  if (typeof valor === "string" && valor.trim()) return [valor];
  return [];
}
