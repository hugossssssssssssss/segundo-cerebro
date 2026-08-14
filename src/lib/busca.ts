/**
 * Busca em tudo que você escreveu.
 *
 * Roda no navegador, sobre o conteúdo que o `repo.ts` já carregou — então é
 * instantânea, funciona em repositório privado e não gasta requisição nenhuma.
 * A busca de código do GitHub não serviria: ela demora a indexar e não é
 * confiável em repositórios privados pequenos.
 *
 * O motor é a MiniSearch. A versão anterior comparava com `includes`, o que
 * exigia acertar a palavra inteira: "reuinão" não achava nada, e "tipo" não
 * achava "tipografia". Agora há tolerância a erro de digitação e busca por
 * começo de palavra.
 *
 * **O índice vive só na memória.** Ele é remontado a partir dos `.md` a cada
 * carga do acervo e nunca é gravado em lugar nenhum — os arquivos continuam
 * sendo a única fonte da verdade, como manda a regra 1 do AGENTS.md.
 */

import MiniSearch from "minisearch";
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

/**
 * Recorta ~120 caracteres em volta do que casou.
 *
 * Recebe os termos que a MiniSearch de fato encontrou — que já vêm
 * normalizados e podem ser diferentes do que foi digitado, já que a busca
 * perdoa erro e aceita começo de palavra. Usa o primeiro que apareça mesmo no
 * corpo; se nenhum aparecer (casou só no título ou nas tags), mostra o começo
 * do texto, que ainda ajuda a reconhecer o item.
 */
function recortar(corpo: string, termos: readonly string[]): string {
  const limpo = corpo.replace(/\s+/g, " ").trim();
  const corpoNorm = normalizar(limpo);

  let pos = -1;
  let tamanho = 0;
  for (const termo of termos) {
    const achou = corpoNorm.indexOf(termo);
    if (achou >= 0 && (pos < 0 || achou < pos)) {
      pos = achou;
      tamanho = termo.length;
    }
  }

  if (pos < 0) return limpo.slice(0, 120);

  const inicio = Math.max(0, pos - 40);
  const fim = Math.min(limpo.length, pos + tamanho + 80);
  return (
    (inicio > 0 ? "…" : "") +
    limpo.slice(inicio, fim).trim() +
    (fim < limpo.length ? "…" : "")
  );
}

/* ----------------------------------------------------------------- índice */

type Fichado = {
  id: string;
  titulo: string;
  tags: string;
  corpo: string;
};

/**
 * Peso de cada campo. Quem procura "cliente x" quase sempre quer a nota
 * CHAMADA "Cliente X", não as quarenta que citam o cliente de passagem.
 */
const PESO_CAMPO = { titulo: 5, tags: 2, corpo: 1 };

function novoIndice(itens: ItemRepo[]): MiniSearch<Fichado> {
  const mini = new MiniSearch<Fichado>({
    fields: ["titulo", "tags", "corpo"],
    idField: "id",
    // tira acento e caixa dos DOIS lados — do que está guardado e do que é
    // digitado — para "reuniao" achar "Reunião"
    processTerm: (termo) => normalizar(termo),
  });

  mini.addAll(
    itens.map((item) => ({
      id: item.caminho,
      titulo: tituloProvavel(item.doc, item.nome),
      tags: comoLista(item.doc.dados.tags).join(" "),
      corpo: item.doc.corpo,
    })),
  );

  return mini;
}

/**
 * Reaproveita o índice enquanto o acervo for o mesmo array.
 *
 * Sem isto, cada tecla digitada na busca reindexaria o repositório inteiro —
 * o `useMemo` da tela chama `buscar` a cada caractere. Com `WeakMap`, o índice
 * é descartado sozinho quando o acervo é recarregado, sem virar cache velho
 * que teima em existir.
 */
const indices = new WeakMap<ItemRepo[], MiniSearch<Fichado>>();

function indiceDe(itens: ItemRepo[]): MiniSearch<Fichado> {
  const guardado = indices.get(itens);
  if (guardado) return guardado;

  const novo = novoIndice(itens);
  indices.set(itens, novo);
  return novo;
}

/* ------------------------------------------------------------------ busca */

/**
 * Busca o termo em título, corpo e tags de tudo.
 *
 * `prefix` faz "tipo" achar "tipografia"; `fuzzy: 0.2` perdoa cerca de um erro
 * de digitação a cada cinco letras. `AND` exige que TODAS as palavras
 * apareçam — buscar "grade suíça" tem que trazer o item sobre a grade suíça,
 * não tudo que fala de grade.
 */
export function buscar(itens: ItemRepo[], termo: string): Resultado[] {
  const limpo = termo.trim();
  if (normalizar(limpo).length < 2) return [];

  const porCaminho = new Map(itens.map((i) => [i.caminho, i]));

  const achados = indiceDe(itens).search(limpo, {
    boost: PESO_CAMPO,
    prefix: true,
    fuzzy: 0.2,
    combineWith: "AND",
  });

  const saida: Resultado[] = [];

  for (const achado of achados) {
    const item = porCaminho.get(String(achado.id));
    if (!item) continue;

    saida.push({
      caminho: item.caminho,
      titulo: tituloProvavel(item.doc, item.nome),
      tipo: tipoDoItem(item),
      trecho: recortar(item.doc.corpo, achado.terms),
      peso: achado.score,
    });
  }

  return saida.sort((a, b) => b.peso - a.peso || a.titulo.localeCompare(b.titulo));
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
