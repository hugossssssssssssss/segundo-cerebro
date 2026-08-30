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
import { type ItemRepo, ehArquivoInternoOuSistema } from "./repo";
import { tituloProvavel, comoLista } from "./markdown";
import { LISTA_FERRAMENTAS_APP, type FerramentaApp } from "./ferramentasApp";

// Re-exporta os contratos centrais de tipos.ts
export type { TipoItem } from "./tipos";
export { ROTULO_TIPO, ROTA_POR_TIPO as ROTA_TIPO } from "./tipos";
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

import { detectarTipoDoItem } from "./entidadeRegistro";

/** Descobre o tipo pelo frontmatter e, se faltar, pela pasta através do registro desacoplado. */
export function tipoDoItem(item: ItemRepo): TipoItem {
  return detectarTipoDoItem(item);
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

export function ficharItem(item: ItemRepo): Fichado {
  const d = item.doc?.dados || {};
  const extras = [
    typeof d.cargo === "string" ? d.cargo : "",
    typeof d.empresa === "string" ? d.empresa : "",
    typeof d.email === "string" ? d.email : "",
    typeof d.telefone === "string" ? d.telefone : "",
    typeof d.cliente === "string" ? d.cliente : "",
    typeof d.descricao === "string" ? d.descricao : "",
    typeof d.indicador === "string" ? d.indicador : "",
    typeof d.porque === "string" ? d.porque : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: item.caminho,
    titulo: tituloProvavel(item.doc, item.nome),
    tags: comoLista(d.tags).join(" "),
    corpo: ((item.doc?.corpo || "") + " " + extras).trim(),
  };
}

function novoIndice(itens: ItemRepo[]): MiniSearch<Fichado> {
  const mini = new MiniSearch<Fichado>({
    fields: ["titulo", "tags", "corpo"],
    storeFields: ["id", "titulo"],
    searchOptions: {
      boost: PESO_CAMPO,
      prefix: true,
      fuzzy: 0.2,
      combineWith: "AND",
    },
  });

  const itensValidos = itens.filter((i) => !ehArquivoInternoOuSistema(i.caminho));
  mini.addAll(itensValidos.map(ficharItem));
  return mini;
}

let indiceCacheGlobal: MiniSearch<Fichado> | null = null;
let mapaShasIndexados = new Map<string, string>();

/** Reseta o cache de busca em memória (usado nos testes e logout). */
export function resetarIndiceBusca(): void {
  indiceCacheGlobal = null;
  mapaShasIndexados.clear();
}

/**
 * Retorna o índice de busca em memória com suporte a reuso imediato (0ms)
 * e indexação incremental seletiva (replace/discard) quando arquivos mudam.
 */
export function indiceDe(itens: ItemRepo[]): MiniSearch<Fichado> {
  const itensValidos = itens.filter((i) => !ehArquivoInternoOuSistema(i.caminho));

  if (!indiceCacheGlobal) {
    indiceCacheGlobal = novoIndice(itens);
    mapaShasIndexados.clear();
    for (const item of itensValidos) {
      mapaShasIndexados.set(item.caminho, item.sha || item.texto?.slice(0, 50) || "");
    }
    return indiceCacheGlobal;
  }

  // 1. Identifica alterações entre os itens recebidos e o cache existente
  const caminhosAtuais = new Set(itensValidos.map((i) => i.caminho));
  const alterados: ItemRepo[] = [];
  const removidos: string[] = [];

  for (const [caminho] of mapaShasIndexados) {
    if (!caminhosAtuais.has(caminho)) {
      removidos.push(caminho);
    }
  }

  for (const item of itensValidos) {
    const shaAnterior = mapaShasIndexados.get(item.caminho);
    const shaAtual = item.sha || item.texto?.slice(0, 50) || "";
    if (shaAnterior !== shaAtual) {
      alterados.push(item);
    }
  }

  // 2. Se nada mudou, reaproveita o índice existente instantaneamente (0ms)
  if (alterados.length === 0 && removidos.length === 0) {
    return indiceCacheGlobal;
  }

  // 3. Poucas mudanças: mutação incremental pontual (replace / discard)
  if (alterados.length + removidos.length <= Math.max(10, Math.floor(itensValidos.length * 0.2))) {
    for (const caminho of removidos) {
      try {
        indiceCacheGlobal.discard(caminho);
      } catch {}
      mapaShasIndexados.delete(caminho);
    }

    for (const item of alterados) {
      try {
        if (mapaShasIndexados.has(item.caminho)) {
          indiceCacheGlobal.replace(ficharItem(item));
        } else {
          indiceCacheGlobal.add(ficharItem(item));
        }
        mapaShasIndexados.set(item.caminho, item.sha || item.texto?.slice(0, 50) || "");
      } catch {
        // Fallback para reconstrução completa em caso de inconsistência interna
        indiceCacheGlobal = novoIndice(itens);
        mapaShasIndexados.clear();
        for (const i of itensValidos) {
          mapaShasIndexados.set(i.caminho, i.sha || i.texto?.slice(0, 50) || "");
        }
        return indiceCacheGlobal;
      }
    }
    return indiceCacheGlobal;
  }

  // 4. Muitas mudanças: recria o índice completo
  indiceCacheGlobal = novoIndice(itens);
  mapaShasIndexados.clear();
  for (const item of itensValidos) {
    mapaShasIndexados.set(item.caminho, item.sha || item.texto?.slice(0, 50) || "");
  }
  return indiceCacheGlobal;
}

/* ------------------------------------------------------------------ busca */

export function buscar(itens: ItemRepo[], termo: string): Resultado[] {
  const limpo = termo.trim();
  const termoNorm = normalizar(limpo);
  if (termoNorm.length < 2) return [];

  const porCaminho = new Map(itens.map((i) => [i.caminho, i]));

  const achados = indiceDe(itens).search(limpo, {
    boost: PESO_CAMPO,
    prefix: true,
    fuzzy: 0.2,
    combineWith: "AND",
  });

  const idsJaIncluidos = new Set<string>();
  const saida: Resultado[] = [];

  for (const achado of achados) {
    const item = porCaminho.get(String(achado.id));
    if (!item) continue;

    idsJaIncluidos.add(item.caminho);
    saida.push({
      caminho: item.caminho,
      titulo: tituloProvavel(item.doc, item.nome),
      tipo: tipoDoItem(item),
      trecho: recortar(item.doc.corpo, achado.terms),
      peso: achado.score,
    });
  }

  // Complementa com busca por substring interna (ex: "uinho" -> "Huguinho")
  // Apenas para termos com pelo menos 3 caracteres, para evitar lentidão
  if (termoNorm.length >= 3) {
    for (const item of itens) {
      if (idsJaIncluidos.has(item.caminho)) continue;

      const titNorm = normalizar(tituloProvavel(item.doc, item.nome));
      if (titNorm.includes(termoNorm)) {
        saida.push({
          caminho: item.caminho,
          titulo: tituloProvavel(item.doc, item.nome),
          tipo: tipoDoItem(item),
          trecho: recortar(item.doc.corpo, [termoNorm]),
          peso: 3,
        });
        continue;
      }

      const tagsNorm = normalizar(comoLista(item.doc.dados.tags).join(" "));
      if (tagsNorm.includes(termoNorm)) {
        saida.push({
          caminho: item.caminho,
          titulo: tituloProvavel(item.doc, item.nome),
          tipo: tipoDoItem(item),
          trecho: recortar(item.doc.corpo, [termoNorm]),
          peso: 1,
        });
        continue;
      }

      const d = item.doc.dados;
      const extrasContatoNorm = normalizar([
        typeof d.cargo === "string" ? d.cargo : "",
        typeof d.empresa === "string" ? d.empresa : "",
        typeof d.email === "string" ? d.email : "",
        typeof d.telefone === "string" ? d.telefone : "",
      ].join(" "));
      if (extrasContatoNorm.includes(termoNorm)) {
        saida.push({
          caminho: item.caminho,
          titulo: tituloProvavel(item.doc, item.nome),
          tipo: tipoDoItem(item),
          trecho: recortar(item.doc.corpo, [termoNorm]),
          peso: 1,
        });
        continue;
      }

      // Para o corpo, apenas normaliza e compara se o tamanho do corpo for menor que 15.000 caracteres
      // notas maiores que isso já são adequadamente cobertas pelo MiniSearch indexado.
      const corpoOriginal = item.doc.corpo || "";
      if (corpoOriginal.length < 15000) {
        const corpoNorm = normalizar(corpoOriginal);
        if (corpoNorm.includes(termoNorm)) {
          saida.push({
            caminho: item.caminho,
            titulo: tituloProvavel(item.doc, item.nome),
            tipo: tipoDoItem(item),
            trecho: recortar(item.doc.corpo, [termoNorm]),
            peso: 1,
          });
        }
      }
    }
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
  categoriaFilter?: CategoriaFiltroBusca,
  listaFerramentas?: FerramentaApp[]
): FerramentaApp[] {
  const tNorm = normalizar(termo.trim());
  if (tNorm.length < 2) return [];

  const base = listaFerramentas || LISTA_FERRAMENTAS_APP;

  return base.filter((f) => {
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
