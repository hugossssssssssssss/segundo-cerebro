/**
 * Leitura e escrita de Markdown com frontmatter YAML.
 *
 * Regra central do projeto: o arquivo .md é a fonte da verdade.
 * Frontmatter é OPCIONAL — um arquivo sem ele continua abrindo normalmente.
 * Nunca jogue fora conteúdo que não entendeu.
 */

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
  if (!encontrado) {
    const limpo = (texto || "").trim();
    if (limpo.startsWith("{") && limpo.endsWith("}")) {
      try {
        const parsed = JSON.parse(limpo);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const t = parsed.title || parsed.titulo || parsed.dados?.titulo;
          if (t && typeof t === "string") {
            return { dados: { titulo: t.trim(), tipo: "lousa" }, corpo: texto };
          }
        }
      } catch {
        // ignora
      }
    }
    return { dados: {}, corpo: texto };
  }

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
    ([k, v]) => !k.startsWith("_") && v !== undefined && v !== null && v !== "",
  );
  if (campos.length === 0) return doc.corpo;

  const yamlTexto = dump(Object.fromEntries(campos), {
    lineWidth: -1,
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);

  const base = limpo || "sem-titulo";
  const agora = new Date();
  const carimbo = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
  return `${carimbo}-${base}.md`;
}

/**
 * Garante um nome livre. Duas tarefas "Reunião" no mesmo dia geravam o mesmo
 * caminho, e a segunda falhava com um 422 incompreensível.
 */
export function nomeLivre(
  pasta: string,
  titulo: string,
  ocupados: Iterable<string>,
  extensao: string = ".md"
): string {
  const usados = new Set(ocupados);
  const ext = titulo.endsWith(".json") ? ".json" : extensao;
  const tituloSemExt = titulo.replace(/\.(md|json)$/i, "");
  const base = nomeDeArquivo(tituloSemExt);

  let candidato = `${pasta}/${base}${ext}`;
  let n = 2;
  while (usados.has(candidato)) {
    candidato = `${pasta}/${base}-${n}${ext}`;
    n++;
  }
  return candidato;
}

/** Lê uma lista do frontmatter tolerando string única ou ausência. */
export function comoLista(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map(String);
  if (typeof valor === "string" && valor.trim()) return [valor];
  return [];
}

/**
 * Junta os campos que o app gerencia por cima dos que ele não conhece.
 */
export function mesclarFrontmatter(
  original: Frontmatter,
  gerenciados: Record<string, unknown>,
): Frontmatter {
  const saida: Frontmatter = { ...original };
  for (const [chave, valor] of Object.entries(gerenciados)) {
    if (valor === undefined || valor === null || valor === "") {
      delete saida[chave];
    } else {
      saida[chave] = valor;
    }
  }
  return saida;
}

/**
 * Converte wikilinks [[alvo]], escapados `\[\[alvo\]\]` e URLs coladas contendo
 * `?abrir=...` para o formato limpo `@alvo`.
 */
export function restaurarWikilinks(markdown: string): string {
  // Converte \[\[alvo\]\] e [[alvo]] para @alvo.
  //
  // `[[alvo|texto exibido]]` fica com o TEXTO, não com o alvo mais a barra.
  // Sem tratar o `|`, "[[Briefing|o brief]]" virava "@Briefing|o brief" — com
  // a barra solta no meio da frase, e sem casar com item nenhum.
  let limpo = markdown.replace(
    /\\?\[\\?\[([^\[\]\n]{1,200}?)\\?\]\\?\]/g,
    (_todo, alvo: string) => {
      const barra = alvo.indexOf("|");
      const escolhido = barra >= 0 ? alvo.slice(barra + 1) : alvo;
      return `@${escolhido.trim()}`;
    },
  );

  // Converte URLs do tipo https://.../?abrir=tarefas%2F2026-08-14-dasd.md coladas diretamente para @dasd
  limpo = limpo.replace(
    /(?:https?:\/\/[^\s)]+|#\/[^\s)]+)\?abrir=([a-zA-Z0-9_%.-]+)/g,
    (_todo, rawCaminho) => {
      const dec = decodeURIComponent(rawCaminho);
      const nomeOuTitulo = dec.split("/").pop()!.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
      return `@${nomeOuTitulo}`;
    }
  );

  return limpo;
}
