/**
 * Busca em tudo que você escreveu.
 *
 * Roda no navegador, sobre o conteúdo que o `repo.ts` já carregou — então é
 * instantânea, funciona em repositório privado e não gasta requisição nenhuma.
 * A busca de código do GitHub não serviria: ela demora a indexar e não é
 * confiável em repositórios privados pequenos.
 */

import type { ItemRepo } from "./repo";
import { tituloProvavel, comoLista } from "./markdown";

export type TipoItem =
  | "tarefa"
  | "nota"
  | "referencia"
  | "meta"
  | "entrega"
  | "reuniao"
  | "outro";

export type Resultado = {
  caminho: string;
  titulo: string;
  tipo: TipoItem;
  /** Trecho do corpo em volta do que casou, para você reconhecer de relance */
  trecho: string;
  /** Maior = mais relevante */
  peso: number;
};

export const ROTULO_TIPO: Record<TipoItem, string> = {
  tarefa: "Tarefa",
  nota: "Nota",
  referencia: "Referência",
  meta: "Meta",
  entrega: "Entrega",
  reuniao: "Reunião",
  outro: "Outro",
};

/** Para onde navegar ao clicar num resultado. */
export const ROTA_TIPO: Record<TipoItem, string> = {
  tarefa: "/tarefas",
  nota: "/notas",
  referencia: "/referencias",
  meta: "/pdi",
  entrega: "/pdi",
  reuniao: "/notas",
  outro: "/notas",
};

/** Descobre o tipo pelo frontmatter e, se faltar, pela pasta. */
export function tipoDoItem(item: ItemRepo): TipoItem {
  const declarado = item.doc.dados.tipo;
  if (typeof declarado === "string") {
    const t = declarado.toLowerCase();
    if (t in ROTULO_TIPO) return t as TipoItem;
  }

  const pasta = item.caminho.split("/")[0];
  if (pasta === "tarefas") return "tarefa";
  if (pasta === "notas") return "nota";
  if (pasta === "referencias") return "referencia";
  if (pasta === "reunioes") return "reuniao";
  if (item.caminho.startsWith("pdi/metas")) return "meta";
  if (item.caminho.startsWith("pdi/entregas")) return "entrega";
  return "outro";
}

/** Tira acento e caixa, para "reuniao" achar "Reunião". */
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Recorta ~120 caracteres em volta da primeira ocorrência. */
function recortar(corpo: string, termoNorm: string): string {
  const limpo = corpo.replace(/\s+/g, " ").trim();
  const pos = normalizar(limpo).indexOf(termoNorm);
  if (pos < 0) return limpo.slice(0, 120);

  const inicio = Math.max(0, pos - 40);
  const fim = Math.min(limpo.length, pos + termoNorm.length + 80);
  return (
    (inicio > 0 ? "…" : "") +
    limpo.slice(inicio, fim).trim() +
    (fim < limpo.length ? "…" : "")
  );
}

/**
 * Busca o termo em título, corpo e tags de tudo.
 *
 * O peso ordena por onde casou: título vale mais que corpo, porque quem
 * procura "cliente x" quase sempre quer a nota chamada "Cliente X".
 */
export function buscar(itens: ItemRepo[], termo: string): Resultado[] {
  const alvo = normalizar(termo.trim());
  if (alvo.length < 2) return [];

  const achados: Resultado[] = [];

  for (const item of itens) {
    const titulo = tituloProvavel(item.doc, item.nome);
    const tags = comoLista(item.doc.dados.tags);

    const tituloNorm = normalizar(titulo);
    const corpoNorm = normalizar(item.doc.corpo);
    const tagsNorm = normalizar(tags.join(" "));

    let peso = 0;
    if (tituloNorm === alvo) peso += 100;
    else if (tituloNorm.startsWith(alvo)) peso += 60;
    else if (tituloNorm.includes(alvo)) peso += 40;

    if (tagsNorm.includes(alvo)) peso += 25;

    if (corpoNorm.includes(alvo)) {
      peso += 10;
      // várias ocorrências indicam que o assunto é mesmo aquele
      const vezes = corpoNorm.split(alvo).length - 1;
      peso += Math.min(vezes, 5);
    }

    if (peso === 0) continue;

    achados.push({
      caminho: item.caminho,
      titulo,
      tipo: tipoDoItem(item),
      trecho: recortar(item.doc.corpo, alvo),
      peso,
    });
  }

  return achados.sort((a, b) => b.peso - a.peso || a.titulo.localeCompare(b.titulo));
}

/** Agrupa por tipo, preservando a ordem de relevância dentro de cada grupo. */
export function agrupar(resultados: Resultado[]): [TipoItem, Resultado[]][] {
  const grupos = new Map<TipoItem, Resultado[]>();
  for (const r of resultados) {
    const lista = grupos.get(r.tipo) ?? [];
    lista.push(r);
    grupos.set(r.tipo, lista);
  }
  return [...grupos.entries()].sort((a, b) => b[1].length - a[1].length);
}
