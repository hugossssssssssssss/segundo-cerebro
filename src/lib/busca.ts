/**
 * Busca em tudo que você escreveu e nas ferramentas do Klaus.
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
import { LISTA_FERRAMENTAS_APP, type FerramentaApp } from "./ferramentasApp";

// Re-exporta os contratos centrais de tipos.ts
export type { TipoItem } from "./tipos";
export { ROTULO_TIPO, ROTA_POR_TIPO as ROTA_TIPO } from "./tipos";
import { ROTULO_TIPO } from "./tipos";
import type { TipoItem } from "./tipos";

export type Resultado = {
  caminho: string;
  titulo: string;
  tipo: TipoItem;
  /** Trecho do corpo em volta do que casou, para você reconhecer de relance */
  trecho: string;
  /** Maior = mais relevante */
  peso: number;
};

export type CategoriaFiltroBusca =
  | "tudo"
  | "acoes"
  | "ferramentas"
  | "contatos"
  | "notas"
  | "tarefas"
  | "pdi"
  | "referencias"
  | "lousas";

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
  if (pasta === "lousas") return "lousa";
  if (pasta === "reunioes") return "reuniao";
  if (pasta === "contatos") return "contato";
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

const PESO_CAMPO = { titulo: 5, tags: 2, corpo: 1 };

function novoIndice(itens: ItemRepo[]): MiniSearch<Fichado> {
  const mini = new MiniSearch<Fichado>({
    fields: ["titulo", "tags", "corpo"],
    idField: "id",
    processTerm: (termo) => normalizar(termo),
  });

  mini.addAll(
    itens.map((item) => {
      const d = item.doc.dados;
      const extrasContato = [
        typeof d.cargo === "string" ? d.cargo : "",
        typeof d.empresa === "string" ? d.empresa : "",
        typeof d.email === "string" ? d.email : "",
        typeof d.telefone === "string" ? d.telefone : "",
      ]
        .filter(Boolean)
        .join(" ");

      return {
        id: item.caminho,
        titulo: tituloProvavel(item.doc, item.nome),
        tags: comoLista(item.doc.dados.tags).join(" "),
        corpo: ((item.doc.corpo || "") + " " + extrasContato).trim(),
      };
    }),
  );

  return mini;
}

const indices = new WeakMap<ItemRepo[], MiniSearch<Fichado>>();

function indiceDe(itens: ItemRepo[]): MiniSearch<Fichado> {
  const guardado = indices.get(itens);
  if (guardado) return guardado;

  const novo = novoIndice(itens);
  indices.set(itens, novo);
  return novo;
}

/* ------------------------------------------------------------------ busca */

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

/* ------------------------------------------------ BUSCA DE FERRAMENTAS DO APP */

export function buscarFerramentas(
  termo: string,
  categoriaFilter?: CategoriaFiltroBusca
): FerramentaApp[] {
  const tNorm = normalizar(termo.trim());
  if (tNorm.length < 2) return [];

  return LISTA_FERRAMENTAS_APP.filter((f) => {
    if (categoriaFilter === "acoes" && f.categoria !== "acao") return false;
    if (categoriaFilter === "ferramentas" && f.categoria === "acao") return false;
    if (
      categoriaFilter &&
      categoriaFilter !== "tudo" &&
      categoriaFilter !== "acoes" &&
      categoriaFilter !== "ferramentas"
    ) {
      return false;
    }

    const titNorm = normalizar(f.titulo);
    const descNorm = normalizar(f.descricao);
    const kwMatch = f.palavrasChave.some((kw) => normalizar(kw).includes(tNorm));
    return titNorm.includes(tNorm) || descNorm.includes(tNorm) || kwMatch;
  });
}

export function filtrarPorCategoria(
  resultados: Resultado[],
  categoria: CategoriaFiltroBusca
): Resultado[] {
  if (categoria === "tudo") return resultados;
  if (categoria === "ferramentas" || categoria === "acoes") return [];
  if (categoria === "contatos") return resultados.filter((r) => r.tipo === "contato");
  if (categoria === "notas") return resultados.filter((r) => r.tipo === "nota" || r.tipo === "reuniao");
  if (categoria === "tarefas") return resultados.filter((r) => r.tipo === "tarefa");
  if (categoria === "pdi") return resultados.filter((r) => r.tipo === "meta" || r.tipo === "entrega");
  if (categoria === "referencias") return resultados.filter((r) => r.tipo === "referencia");
  if (categoria === "lousas") return resultados.filter((r) => r.tipo === "lousa");
  return resultados;
}

/* ---------------------------------------------------- FAVORITOS DA BUSCA */

const CHAVE_FAVORITOS_BUSCA = "klaus:favoritos_busca";

export function lerFavoritosBusca(): string[] {
  try {
    const salvo = localStorage.getItem(CHAVE_FAVORITOS_BUSCA);
    if (!salvo) return [];
    return JSON.parse(salvo);
  } catch {
    return [];
  }
}

export function salvarFavoritosBusca(favoritos: string[]): void {
  try {
    localStorage.setItem(CHAVE_FAVORITOS_BUSCA, JSON.stringify(favoritos));
  } catch {
    // ignorar erros de localStorage
  }
}

export function alternarFavoritoBusca(idOuCaminho: string): string[] {
  const atuais = lerFavoritosBusca();
  const index = atuais.indexOf(idOuCaminho);
  let novos: string[];
  if (index >= 0) {
    novos = atuais.filter((id) => id !== idOuCaminho);
  } else {
    novos = [...atuais, idOuCaminho];
  }
  salvarFavoritosBusca(novos);
  return novos;
}

export function ehFavoritoBusca(idOuCaminho: string, lista?: string[]): boolean {
  const favs = lista ?? lerFavoritosBusca();
  return favs.includes(idOuCaminho);
}
