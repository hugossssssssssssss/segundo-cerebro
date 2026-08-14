/**
 * Ligações entre itens — a premissa que faltava.
 *
 * A primeira coisa que o Hugo descreveu foi "as ideias se conectam e formam
 * uma rede neural". Até agora nada apontava para nada: cada tela era uma
 * lista isolada.
 *
 * A sintaxe é `[[nome do item]]`, escrita em qualquer campo de texto. Ela
 * fica no arquivo `.md` como texto puro, então continua legível fora do app
 * e é a mesma convenção que Obsidian, Logseq e a maioria das ferramentas de
 * notas usam — qualquer IA que leia o repositório entende sem explicação.
 *
 * O alvo é resolvido pelo TÍTULO, não pelo caminho: você escreve o que leria
 * em voz alta. Se dois itens tiverem o mesmo título, ganha o mais recente.
 */

import type { ItemRepo } from "./repo";
import { tituloProvavel } from "./markdown";
import { tipoDoItem, type TipoItem } from "./busca";

/** Captura `[[alvo]]` e `[[alvo|texto exibido]]`. */
const PADRAO = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export type Alvo = {
  caminho: string;
  titulo: string;
  tipo: TipoItem;
};

export type Referencia = {
  /** O que estava escrito entre os colchetes */
  bruto: string;
  /** O texto a exibir (o depois do `|`, ou o próprio alvo) */
  exibir: string;
  /** null quando aponta para algo que ainda não existe */
  alvo: Alvo | null;
};

/** Normaliza para comparar títulos sem tropeçar em acento ou caixa. */
export function chave(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Índice título → item, para resolver os links.
 * Aceita também o nome do arquivo, porque a IA às vezes escreve assim.
 */
export function montarIndice(itens: ItemRepo[]): Map<string, Alvo> {
  const indice = new Map<string, Alvo>();

  // Do mais recente para o mais antigo. A árvore do git chega em ordem
  // crescente de caminho, e como os nomes começam com AAAA-MM-DD isso fazia
  // o item MAIS ANTIGO ganhar o nome — o contrário do que se espera ao
  // escrever [[Reunião]] pensando na de ontem.
  const ordenados = [...itens].sort((a, b) => b.nome.localeCompare(a.nome));

  for (const item of ordenados) {
    const titulo = tituloProvavel(item.doc, item.nome);
    const alvo: Alvo = {
      caminho: item.caminho,
      titulo,
      tipo: tipoDoItem(item),
    };

    // o item mais recente ganha em caso de título repetido — `daPasta` já
    // ordena do mais novo para o mais velho, então só não sobrescrevemos
    const porTitulo = chave(titulo);
    if (!indice.has(porTitulo)) indice.set(porTitulo, alvo);

    const porArquivo = chave(item.nome.replace(/\.md$/, ""));
    if (!indice.has(porArquivo)) indice.set(porArquivo, alvo);
  }

  return indice;
}

/** Extrai as referências de um texto, resolvendo cada uma contra o índice. */
export function extrairLinks(
  texto: string,
  indice: Map<string, Alvo>,
): Referencia[] {
  const saida: Referencia[] = [];
  const vistos = new Set<string>();

  for (const m of texto.matchAll(PADRAO)) {
    const bruto = m[1].trim();
    if (!bruto || vistos.has(bruto)) continue;
    vistos.add(bruto);

    saida.push({
      bruto,
      exibir: (m[2] ?? bruto).trim(),
      alvo: indice.get(chave(bruto)) ?? null,
    });
  }

  return saida;
}

export type Mencao = {
  caminho: string;
  titulo: string;
  tipo: TipoItem;
  /** Trecho em volta da menção, para dar contexto */
  trecho: string;
};

/**
 * Quem aponta para este item.
 *
 * É o mesmo dado dos links lido ao contrário, e é onde mora metade do valor:
 * abrir uma nota e descobrir que três entregas a mencionam é a conexão
 * aparecendo sozinha, sem você ter ido procurar.
 */
export function mencoesA(
  caminhoAlvo: string,
  itens: ItemRepo[],
  indice: Map<string, Alvo>,
): Mencao[] {
  const saida: Mencao[] = [];

  for (const item of itens) {
    if (item.caminho === caminhoAlvo) continue; // não se auto-menciona

    const links = extrairLinks(item.texto, indice);
    const acertou = links.find((l) => l.alvo?.caminho === caminhoAlvo);
    if (!acertou) continue;

    saida.push({
      caminho: item.caminho,
      titulo: tituloProvavel(item.doc, item.nome),
      tipo: tipoDoItem(item),
      trecho: recorteEmVolta(item.doc.corpo, acertou.bruto),
    });
  }

  return saida;
}

function recorteEmVolta(corpo: string, alvo: string): string {
  const limpo = corpo.replace(/\s+/g, " ").trim();
  let pos = limpo.indexOf(`[[${alvo}`);
  let tam = alvo.length + 4;
  if (pos < 0) {
    pos = limpo.toLowerCase().indexOf(alvo.toLowerCase());
    tam = alvo.length;
  }
  if (pos < 0) return limpo.slice(0, 100);

  const inicio = Math.max(0, pos - 50);
  const fim = Math.min(limpo.length, pos + tam + 70);
  return (
    (inicio > 0 ? "…" : "") + limpo.slice(inicio, fim).trim() + (fim < limpo.length ? "…" : "")
  );
}

/**
 * Sugestões para o autocompletar depois de digitar `[[`.
 * Sem termo, devolve os mais recentes — que é quase sempre o que se quer ligar.
 */
export function sugerir(
  indice: Map<string, Alvo>,
  termo: string,
  limite = 8,
): Alvo[] {
  const alvo = chave(termo);
  const unicos = new Map<string, Alvo>();
  for (const a of indice.values()) unicos.set(a.caminho, a);

  const todos = [...unicos.values()];
  if (!alvo) return todos.slice(0, limite);

  return todos
    .filter((a) => chave(a.titulo).includes(alvo))
    .sort((a, b) => {
      const ka = chave(a.titulo);
      const kb = chave(b.titulo);
      // quem começa com o termo aparece antes de quem só o contém
      const pa = ka.startsWith(alvo) ? 0 : 1;
      const pb = kb.startsWith(alvo) ? 0 : 1;
      return pa - pb || ka.length - kb.length;
    })
    .slice(0, limite);
}
