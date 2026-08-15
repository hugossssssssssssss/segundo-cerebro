/**
 * Ligações entre itens — a premissa que faltava.
 *
 * Suporta formatos:
 * - `[[nome do item]]`
 * - `@nome do item`
 * - URLs completas contendo `?abrir=tarefas%2F...` ou `?abrir=notas%2F...`
 */

import type { ItemRepo } from "./repo";
import { gravar } from "./github";
import { tituloProvavel } from "./markdown";
import { tipoDoItem, type TipoItem } from "./busca";

/** Letras aceitas num título mencionado com `@`, incluindo as acentuadas. */
const LETRA = "a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ";

/**
 * Captura `[[alvo]]`, `[[alvo|texto]]`, `@alvo` (com título composto) e URLs
 * como `.../#/tarefas?abrir=tarefas%2F...`.
 *
 * Duas guardas no `@` que não são detalhe:
 *
 * 1. **`(?<![\w.@-])`** — o `@` não pode vir grudado em letra, número, ponto
 *    ou hífen. Sem isso, escrever um e-mail numa nota criava uma menção
 *    fantasma: `hugo@gmail.com` virava uma menção a "gmail".
 * 2. **O primeiro caractere tem que ser LETRA.** Sem isso, "3 canetas @ 5
 *    reais" virava uma menção a "5".
 */

/** O que pode fazer parte de um título mencionado. */
const MIOLO = `${LETRA}0-9_\\- \\t`;

/**
 * A menção termina no primeiro caractere que NÃO cabe num título, ou no fim
 * do texto.
 *
 * Antes esta parte era uma lista fechada de terminadores (`.`, `,`, `!`…), e
 * isso **perdia menção em silêncio**: em "De @Grade suíça para @Briefing
 * Acme.", a primeira sumia, porque entre ela e o ponto final havia um `@` —
 * que não é terminador nem cabe num título, então a expressão nunca fechava.
 * O mesmo acontecia com "@Grade suíça (importante)".
 *
 * O espaço e o tab entram no miolo (título tem mais de uma palavra), mas a
 * QUEBRA DE LINHA não: senão uma menção no fim do parágrafo engolia a linha
 * seguinte inteira.
 */
const PADRAO = new RegExp(
  "(?:" +
    // [[alvo]] e [[alvo|texto exibido]]
    "\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\]" +
    "|" +
    // @alvo — ver as guardas explicadas acima
    `(?<![\\w.@-])@([${LETRA}][${MIOLO}]{1,99}?)(?=[^${MIOLO}]|$)` +
    "|" +
    // URL colada do próprio app
    "(?:https?:\\/\\/[^\\s)]+|#\\/[^\\s)]+)\\?abrir=([a-zA-Z0-9_%.-]+)" +
    ")",
  "g",
);

export type Alvo = {
  caminho: string;
  titulo: string;
  tipo: TipoItem;
};

export type Referencia = {
  /** O que estava escrito entre os colchetes ou URL */
  bruto: string;
  /** O texto a exibir */
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
 * Índice título/arquivo/caminho → item, para resolver os links.
 */
export function montarIndice(itens: ItemRepo[]): Map<string, Alvo> {
  const indice = new Map<string, Alvo>();

  const ordenados = [...itens].sort((a, b) => b.nome.localeCompare(a.nome));

  for (const item of ordenados) {
    const titulo = tituloProvavel(item.doc, item.nome);
    const alvo: Alvo = {
      caminho: item.caminho,
      titulo,
      tipo: tipoDoItem(item),
    };

    const porTitulo = chave(titulo);
    if (!indice.has(porTitulo)) indice.set(porTitulo, alvo);

    const porArquivo = chave(item.nome.replace(/\.(md|json|excalidraw)$/i, ""));
    if (!indice.has(porArquivo)) indice.set(porArquivo, alvo);

    const porCaminho = chave(item.caminho);
    if (!indice.has(porCaminho)) indice.set(porCaminho, alvo);
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
    let bruto = "";
    let exibir = "";
    let alvo: Alvo | null = null;

    if (m[1]) {
      // Formato [[alvo]] ou [[alvo|exibir]]
      bruto = m[1].trim();
      if (!bruto) continue;
      exibir = (m[2] ?? bruto).trim();
      alvo = indice.get(chave(bruto)) ?? null;
    } else if (m[3]) {
      // Formato @alvo (pode ser título composto com várias palavras)
      let candidato = m[3].trim();
      while (candidato && !indice.has(chave(candidato))) {
        const ultEspaco = candidato.lastIndexOf(" ");
        if (ultEspaco < 0) break;
        candidato = candidato.slice(0, ultEspaco).trim();
      }

      bruto = candidato || m[3].trim();
      if (!bruto) continue;
      exibir = bruto;
      alvo = indice.get(chave(bruto)) ?? null;
    } else if (m[4]) {
      // Formato URL https://.../?abrir=tarefas%2F...
      const caminhoDec = decodeURIComponent(m[4]);
      alvo = indice.get(chave(caminhoDec)) ?? indice.get(chave(caminhoDec.split("/").pop()!.replace(/\.md$/, ""))) ?? null;
      bruto = alvo ? alvo.titulo : caminhoDec.split("/").pop()!.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
      exibir = bruto;
    }

    if (!bruto || vistos.has(bruto)) continue;
    vistos.add(bruto);

    saida.push({
      bruto,
      exibir,
      alvo,
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
 */
export function mencoesA(
  caminhoAlvo: string,
  itens: ItemRepo[],
  indice: Map<string, Alvo>,
): Mencao[] {
  const saida: Mencao[] = [];

  for (const item of itens) {
    if (item.caminho === caminhoAlvo) continue;

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
  let pos = limpo.indexOf(`@${alvo}`);
  let tam = alvo.length + 1;
  if (pos < 0) {
    pos = limpo.indexOf(`[[${alvo}`);
    tam = alvo.length + 4;
  }
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
 * O índice guarda cada item várias vezes (por título, por nome de arquivo e
 * por caminho). Esta é a lista limpa, um item por caminho — o que um menu de
 * escolha precisa mostrar.
 */
export function alvosUnicos(indice: Map<string, Alvo>): Alvo[] {
  const unicos = new Map<string, Alvo>();
  for (const a of indice.values()) unicos.set(a.caminho, a);
  return [...unicos.values()];
}

/**
 * Filtra alvos já carregados por um termo digitado.
 *
 * Separado de `sugerir` para o editor poder filtrar o que tem em memória, sem
 * remontar o índice do repositório inteiro a cada tecla.
 */
export function filtrarAlvos(
  alvos: Alvo[],
  termo: string,
  limite = 8,
): Alvo[] {
  const alvo = chave(termo.replace(/^[@[]+/, ""));
  if (!alvo) return alvos.slice(0, limite);

  return alvos
    .filter((a) => chave(a.titulo).includes(alvo))
    .sort((a, b) => {
      const ka = chave(a.titulo);
      const kb = chave(b.titulo);
      const pa = ka.startsWith(alvo) ? 0 : 1;
      const pb = kb.startsWith(alvo) ? 0 : 1;
      return pa - pb || ka.length - kb.length;
    })
    .slice(0, limite);
}

/** Sugestões para o autocompletar, a partir do índice completo. */
export function sugerir(
  indice: Map<string, Alvo>,
  termo: string,
  limite = 8,
): Alvo[] {
  return filtrarAlvos(alvosUnicos(indice), termo, limite);
}

/**
 * Extrai menções em formato de string (`@Nome`) do corpo de um texto.
 *
 * Esta função alimenta o campo `relacionamentos` do frontmatter. Ela tinha
 * uma CÓPIA da expressão de menção — a versão antiga, de lista fechada de
 * terminadores — e por isso perdia menção em silêncio: de "De @Grade suíça
 * para @Briefing Acme." sobrava só a última. Agora ela usa a MESMA `PADRAO`
 * do resto do arquivo, que já tem teste.
 */
export function extrairMencoesTexto(
  corpo: string,
  titulosConhecidos?: Iterable<string>,
): string[] {
  if (!corpo) return [];

  const conhecidos = titulosConhecidos
    ? new Set([...titulosConhecidos].map(chave))
    : null;

  const mencoes: string[] = [];
  const visto = new Set<string>();

  const adicionar = (raw: string) => {
    let limpo = raw
      .replace(/\\/g, "")
      .replace(/^[@[]+/, "")
      .replace(/\]+$/, "")
      .trim();

    if (conhecidos) {
      while (limpo && !conhecidos.has(chave(limpo))) {
        const ultimoEspaco = limpo.lastIndexOf(" ");
        if (ultimoEspaco < 0) break;
        limpo = limpo.slice(0, ultimoEspaco).trim();
      }
      if (!conhecidos.has(chave(limpo))) return;
    } else {
      // Sem lista de conhecidos, limpa palavras de ligação soltas no final (ex: "e", "para", "de novo")
      limpo = limpo.replace(/\s+(para|e|de|com|do|da|dos|das|em|na|no|nas|nos|de\s+novo)\b.*$/i, "").trim();
    }

    if (limpo.length >= 2 && !visto.has(chave(limpo))) {
      visto.add(chave(limpo));
      mencoes.push(`@${limpo}`);
    }
  };

  for (const m of corpo.matchAll(PADRAO)) {
    if (m[1]) adicionar(m[2] ?? m[1]);
    else if (m[3]) adicionar(m[3]);
  }

  for (const m of corpo.matchAll(/(?<!!)\[\\?@([^\]]+)\]\(([^)]+)\)/g)) {
    adicionar(m[1]);
  }

  return mencoes;
}

/**
 * Garante que dadosProps/frontmatter contenha a propriedade `relacionamentos`
 * sincronizada com as menções contidas no corpo do texto.
 */
export function sincronizarRelacionamentos(
  dados: Record<string, any>,
  corpo: string,
  titulosConhecidos?: Iterable<string>,
): Record<string, any> {
  const mencoesTexto = extrairMencoesTexto(corpo, titulosConhecidos);

  if (mencoesTexto.length === 0) {
    const novos = { ...dados };
    delete novos.relacionamentos;
    if (novos.esquema && typeof novos.esquema === "object") {
      const esquemaNovo = { ...novos.esquema };
      delete esquemaNovo.relacionamentos;
      novos.esquema = esquemaNovo;
    }
    return novos;
  }

  return {
    ...dados,
    relacionamentos: mencoesTexto,
    esquema: {
      ...(dados.esquema || {}),
      relacionamentos: "relation",
    },
  };
}

/**
 * Propaga a alteração de um título para todos os arquivos que mencionavam o título antigo.
 * Atualiza @TituloAntigo -> @TituloNovo e [[TituloAntigo]] -> [[TituloNovo]].
 */
export async function propagarRenomeacao(
  cfg: any,
  todos: ItemRepo[],
  tituloAntigo: string,
  tituloNovo: string,
): Promise<number> {
  if (!tituloAntigo || !tituloNovo || tituloAntigo.trim() === tituloNovo.trim()) return 0;

  const termoAntigoArroba = `@${tituloAntigo.trim()}`;
  const termoNovoArroba = `@${tituloNovo.trim()}`;
  const termoAntigoColchetes = `[[${tituloAntigo.trim()}]]`;
  const termoNovoColchetes = `[[${tituloNovo.trim()}]]`;

  let contagem = 0;

  for (const item of todos) {
    if (!item.texto) continue;
    let textoNovo = item.texto;
    if (textoNovo.includes(termoAntigoArroba)) {
      textoNovo = textoNovo.split(termoAntigoArroba).join(termoNovoArroba);
    }
    if (textoNovo.includes(termoAntigoColchetes)) {
      textoNovo = textoNovo.split(termoAntigoColchetes).join(termoNovoColchetes);
    }

    if (textoNovo !== item.texto) {
      contagem++;
      try {
        await gravar(cfg, item.caminho, textoNovo, item.sha, `refatorar: renomear menção de ${tituloAntigo} para ${tituloNovo}`);
      } catch {
        // ignora falha individual
      }
    }
  }

  return contagem;
}
