/**
 * Algoritmo de Auto-Merge Semântico 3-Way para Markdown.
 *
 * Resolve divergências entre a versão local (ex: celular) e remota (ex: Mac no GitHub)
 * comparando-as contra a versão base para evitar erros HTTP 409 e perda de texto.
 */

import { lerMarkdown, escreverMarkdown } from "./markdown";

export type ResultadoAutoMerge = {
  sucesso: boolean;
  textoMesclado: string;
  teveConflito: boolean;
  camposMesclados: string[];
};

/**
 * Mescla dois objetos de frontmatter em relação a uma base comum.
 */
export function mesclarFrontmatterSemantico(
  base: Record<string, any> = {},
  local: Record<string, any> = {},
  remoto: Record<string, any> = {},
): { dados: Record<string, any>; conflito: boolean; camposMesclados: string[] } {
  const todasChaves = new Set([
    ...Object.keys(base || {}),
    ...Object.keys(local || {}),
    ...Object.keys(remoto || {}),
  ]);

  const dados: Record<string, any> = {};
  let conflito = false;
  const camposMesclados: string[] = [];

  for (const chave of todasChaves) {
    const valBase = base ? base[chave] : undefined;
    const valLocal = local ? local[chave] : undefined;
    const valRemoto = remoto ? remoto[chave] : undefined;

    // 1. Não mudou em nenhum dos lados
    if (valLocal === valRemoto) {
      if (valLocal !== undefined) dados[chave] = valLocal;
      continue;
    }

    // 2. Mudou apenas no local
    if (valRemoto === valBase) {
      if (valLocal !== undefined) dados[chave] = valLocal;
      camposMesclados.push(chave);
      continue;
    }

    // 3. Mudou apenas no remoto
    if (valLocal === valBase) {
      if (valRemoto !== undefined) dados[chave] = valRemoto;
      camposMesclados.push(chave);
      continue;
    }

    // 4. Mudou em ambos os lados
    // Caso especial: Arrays (ex: tags, relacionamentos, metas)
    if (Array.isArray(valLocal) && Array.isArray(valRemoto)) {
      const uniao = Array.from(new Set([...valLocal, ...valRemoto]));
      dados[chave] = uniao;
      camposMesclados.push(chave);
      continue;
    }

    // Caso especial: Status de tarefas e metas (prioriza conclusão)
    if (chave === "status" && typeof valLocal === "string" && typeof valRemoto === "string") {
      if (valLocal === "feito" || valRemoto === "feito" || valLocal === "concluida" || valRemoto === "concluida") {
        dados[chave] = valLocal === "feito" || valRemoto === "feito" ? "feito" : "concluida";
        camposMesclados.push(chave);
        continue;
      }
    }

    // Se ambos definiram valores primitivos diferentes:
    // Escolhe o valor mais recente ou local, marcando que houve divergência
    dados[chave] = valLocal !== undefined ? valLocal : valRemoto;
    conflito = true;
    camposMesclados.push(chave);
  }

  return { dados, conflito, camposMesclados };
}

/**
 * Mescla dois corpos de texto markdown em relação a uma base.
 * Trata blocos de parágrafos e caixas de seleção `- [ ]` e `- [x]`.
 */
export function mesclarCorpoMarkdown(
  base: string = "",
  local: string = "",
  remoto: string = "",
): { corpo: string; conflito: boolean } {
  if (local === remoto) return { corpo: local, conflito: false };
  if (local === base) return { corpo: remoto, conflito: false };
  if (remoto === base) return { corpo: local, conflito: false };

  const linhasBase = (base || "").split("\n");
  const linhasLocal = (local || "").split("\n");
  const linhasRemoto = (remoto || "").split("\n");

  // Se forem checklists markdown simples, mescla por item
  const ehChecklist = (linhas: string[]) => linhas.some((l) => /^\s*-\s*\[[ xX]\]/.test(l));

  if (ehChecklist(linhasLocal) || ehChecklist(linhasRemoto)) {
    const mapaItens = new Map<string, boolean>(); // texto -> feito?
    const coletarChecklist = (linhas: string[]) => {
      for (const linha of linhas) {
        const m = linha.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/);
        if (m) {
          const feito = m[1].toLowerCase() === "x";
          const texto = m[2].trim();
          // Se qualquer aparelho marcou como feito, prevalece feito
          mapaItens.set(texto, mapaItens.get(texto) || feito);
        }
      }
    };

    coletarChecklist(linhasBase);
    coletarChecklist(linhasRemoto);
    coletarChecklist(linhasLocal);

    if (mapaItens.size > 0) {
      const linhasSaida: string[] = [];
      for (const [texto, feito] of mapaItens.entries()) {
        linhasSaida.push(`- [${feito ? "x" : " "}] ${texto}`);
      }
      return { corpo: linhasSaida.join("\n"), conflito: false };
    }
  }

  // Mesclagem de parágrafos: se um adicionou no final e outro no topo
  const blocosBase = base.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  const blocosLocal = local.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  const blocosRemoto = remoto.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);

  const novosDoLocal = blocosLocal.filter((b) => !blocosBase.includes(b));
  const novosDoRemoto = blocosRemoto.filter((b) => !blocosBase.includes(b));

  // Se o local adicionou algo que não existia e o remoto adicionou outro bloco diferente
  if (novosDoLocal.length > 0 && novosDoRemoto.length > 0) {
    const todosBlocos = Array.from(new Set([...blocosLocal, ...blocosRemoto]));
    return { corpo: todosBlocos.join("\n\n"), conflito: false };
  }

  // Se for apenas apêndice de um dos lados
  if (local.startsWith(base)) {
    const acrescimoLocal = local.slice(base.length);
    return { corpo: remoto + acrescimoLocal, conflito: false };
  }
  if (remoto.startsWith(base)) {
    const acrescimoRemoto = remoto.slice(base.length);
    return { corpo: local + acrescimoRemoto, conflito: false };
  }

  // Divergência em parágrafos comuns: une ambos os textos e sinaliza conflito
  return {
    corpo: `${local}\n\n<!-- klaus-merge-divergencia -->\n\n${remoto}`,
    conflito: true,
  };
}

/**
 * Ponto de entrada para o 3-Way Merge de documentos Markdown completos com frontmatter.
 */
export function autoMergeDocumentoMarkdown(
  textoBase: string,
  textoLocal: string,
  textoRemoto: string,
): ResultadoAutoMerge {
  const docBase = lerMarkdown(textoBase || "");
  const docLocal = lerMarkdown(textoLocal || "");
  const docRemoto = lerMarkdown(textoRemoto || "");

  const { dados, conflito: conflitoFm, camposMesclados } = mesclarFrontmatterSemantico(
    docBase.dados,
    docLocal.dados,
    docRemoto.dados,
  );

  const { corpo, conflito: conflitoCorpo } = mesclarCorpoMarkdown(
    docBase.corpo,
    docLocal.corpo,
    docRemoto.corpo,
  );

  const textoMesclado = escreverMarkdown({ dados, corpo });
  const teveConflito = conflitoFm || conflitoCorpo;

  return {
    sucesso: !teveConflito,
    textoMesclado,
    teveConflito,
    camposMesclados,
  };
}
