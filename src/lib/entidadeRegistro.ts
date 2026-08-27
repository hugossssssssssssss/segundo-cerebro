/**
 * Registro Desacoplado e Extensível de Entidades do Klaus.
 *
 * Elimina switch cases e ifs espalhados pela aplicação mapeando:
 * - Tipo de Entidade (TipoItem)
 * - Pasta raiz do repositório
 * - Conversores de ida e volta (ItemRepo <-> Objeto da Entidade)
 * - Metadados de UI (Rótulos, Rotas, Ícones)
 */

import type { ItemRepo } from "./repo";
import type { TipoItem, ItemBase } from "./tipos";
import { ROTULO_TIPO, ROTA_POR_TIPO } from "./tipos";
import type { Documento } from "./markdown";

export interface DefinicaoEntidade<T extends ItemBase = any> {
  tipo: TipoItem;
  pasta: string;
  pastaEhPrefixo?: boolean;
  rotulo: string;
  rota: string;
  comoItem?: (doc: Documento, caminho: string, sha: string, titulo: string) => T;
  itemParaArquivo?: (item: T) => Documento;
}

export const REGISTRO_ENTIDADES: Record<TipoItem, DefinicaoEntidade> = {
  tarefa: {
    tipo: "tarefa",
    pasta: "tarefas",
    rotulo: ROTULO_TIPO.tarefa,
    rota: ROTA_POR_TIPO.tarefa,
  },
  nota: {
    tipo: "nota",
    pasta: "notas",
    rotulo: ROTULO_TIPO.nota,
    rota: ROTA_POR_TIPO.nota,
  },
  referencia: {
    tipo: "referencia",
    pasta: "referencias",
    rotulo: ROTULO_TIPO.referencia,
    rota: ROTA_POR_TIPO.referencia,
  },
  meta: {
    tipo: "meta",
    pasta: "pdi/metas",
    pastaEhPrefixo: true,
    rotulo: ROTULO_TIPO.meta,
    rota: ROTA_POR_TIPO.meta,
  },
  entrega: {
    tipo: "entrega",
    pasta: "pdi/entregas",
    pastaEhPrefixo: true,
    rotulo: ROTULO_TIPO.entrega,
    rota: ROTA_POR_TIPO.entrega,
  },
  reuniao: {
    tipo: "reuniao",
    pasta: "reunioes",
    rotulo: ROTULO_TIPO.reuniao,
    rota: ROTA_POR_TIPO.reuniao,
  },
  lousa: {
    tipo: "lousa",
    pasta: "lousas",
    rotulo: ROTULO_TIPO.lousa,
    rota: ROTA_POR_TIPO.lousa,
  },
  contato: {
    tipo: "contato",
    pasta: "contatos",
    rotulo: ROTULO_TIPO.contato,
    rota: ROTA_POR_TIPO.contato,
  },
  processo: {
    tipo: "processo",
    pasta: "processos",
    rotulo: ROTULO_TIPO.processo,
    rota: ROTA_POR_TIPO.processo,
  },
  card_processo: {
    tipo: "card_processo",
    pasta: "processos/cards",
    pastaEhPrefixo: true,
    rotulo: ROTULO_TIPO.card_processo,
    rota: ROTA_POR_TIPO.card_processo,
  },
  outro: {
    tipo: "outro",
    pasta: "",
    rotulo: ROTULO_TIPO.outro,
    rota: ROTA_POR_TIPO.outro,
  },
};

/**
 * Detecta o tipo do item inspecionando o frontmatter e, como fallback, a pasta do caminho.
 */
export function detectarTipoDoItem(item: ItemRepo): TipoItem {
  const declarado = item.doc.dados.tipo;
  if (typeof declarado === "string") {
    const t = declarado.toLowerCase();
    if (t in ROTULO_TIPO) return t as TipoItem;
  }

  // Primeiro checa caminhos específicos de subpastas
  if (item.caminho.startsWith("processos/cards")) return "card_processo";
  if (item.caminho.startsWith("pdi/metas")) return "meta";
  if (item.caminho.startsWith("pdi/entregas")) return "entrega";

  const pasta = item.caminho.split("/")[0];
  for (const def of Object.values(REGISTRO_ENTIDADES)) {
    if (def.pasta && def.pasta === pasta) {
      return def.tipo;
    }
  }

  return "outro";
}

/**
 * Retorna a definição de entidade correspondente a uma rota ou tipo.
 */
export function obterEntidadePorTipo(tipo: TipoItem): DefinicaoEntidade {
  return REGISTRO_ENTIDADES[tipo] || REGISTRO_ENTIDADES.outro;
}

/**
 * Retorna a definição de entidade a partir de uma pasta.
 */
export function obterEntidadePorPasta(pasta: string): DefinicaoEntidade | undefined {
  return Object.values(REGISTRO_ENTIDADES).find(
    (def) => def.pasta === pasta || (def.pastaEhPrefixo && pasta.startsWith(def.pasta)),
  );
}
