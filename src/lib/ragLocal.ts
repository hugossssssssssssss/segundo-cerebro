/**
 * RAG Local Híbrido com MiniSearch para injeção contextual seletiva no Gemini.
 *
 * Em vez de concatenar o repositório inteiro cegamente (o que estourava os 120.000 chars
 * e gerava sobrecarga e alucinações), esta camada:
 * 1. Identifica a intenção temática ou estrutural da pergunta (ex: "quais são minhas metas?").
 * 2. Utiliza o motor MiniSearch em memória para selecionar os 6 a 10 documentos mais relevantes.
 * 3. Monta um contexto conciso e rico em metadados dentro de um orçamento estrito de caracteres.
 */

import type { ItemRepo } from "./repo";
import { buscar } from "./busca";
import { tituloProvavel } from "./markdown";

export type IntencaoConsulta = "metas" | "tarefas" | "contatos" | "geral";

/**
 * Classifica a intenção da consulta para selecionar entidades estruturais prioritárias.
 */
export function classificarIntencaoConsulta(consulta: string): IntencaoConsulta {
  const c = (consulta || "").toLowerCase();

  if (/\b(meta|metas|pdi|objetivo|objetivos|indicador|indicadores)\b/i.test(c)) {
    return "metas";
  }
  if (/\b(tarefa|tarefas|fazer|pendente|pendentes|prioridade|prazo|hoje|semana)\b/i.test(c)) {
    return "tarefas";
  }
  if (/\b(contato|contatos|pessoa|pessoas|email|telefone|empresa|cargo)\b/i.test(c)) {
    return "contatos";
  }
  return "geral";
}

/**
 * Monta um contexto de alta relevância com orçamento de caracteres.
 */
export function montarContextoSemantico(
  acervo: ItemRepo[],
  consulta?: string,
  tetoCaracteres = 28_000,
): string {
  if (!acervo || acervo.length === 0) return "";

  const intencao = consulta ? classificarIntencaoConsulta(consulta) : "geral";
  const selecionados: ItemRepo[] = [];
  const caminhosVistos = new Set<string>();

  const adicionar = (item: ItemRepo) => {
    if (!caminhosVistos.has(item.caminho)) {
      caminhosVistos.add(item.caminho);
      selecionados.push(item);
    }
  };

  // 1. Se a intenção for direcionada a uma categoria, traz itens dessa categoria primeiro
  if (intencao === "metas") {
    const itensPdi = acervo.filter((i) => i.caminho.startsWith("pdi/"));
    itensPdi.forEach(adicionar);
  } else if (intencao === "tarefas") {
    const tarefas = acervo.filter((i) => i.caminho.startsWith("tarefas/"));
    tarefas.forEach(adicionar);
  } else if (intencao === "contatos") {
    const contatos = acervo.filter((i) => i.caminho.startsWith("contatos/"));
    contatos.forEach(adicionar);
  }

  // 2. Busca semântica e por relevância com MiniSearch
  if (consulta && consulta.trim().length >= 2) {
    const resultados = buscar(acervo, consulta);
    for (const r of resultados) {
      const item = acervo.find((i) => i.caminho === r.caminho);
      if (item) adicionar(item);
      if (selecionados.length >= 12) break;
    }
  }

  // 3. Fallback: se nenhum item casou ou consulta muito curta, preenche com itens mais recentes
  if (selecionados.length === 0) {
    const maisRecentes = [...acervo]
      .filter((i) => !i.caminho.startsWith(".klaus/") && !i.caminho.startsWith("caixa-entrada/"))
      .slice(0, 8);
    maisRecentes.forEach(adicionar);
  }

  // 4. Constrói o texto do contexto respeitando o teto de caracteres
  let total = 0;
  const partes: string[] = [];

  for (const item of selecionados) {
    const titulo = tituloProvavel(item.doc, item.nome);
    const tipo = item.doc?.dados?.tipo || item.caminho.split("/")[0];
    const bloco = `\n### [${tipo}] ${titulo} (${item.caminho})\n${item.texto}\n---`;

    if (total + bloco.length > tetoCaracteres) {
      partes.push(
        `\n... (contexto otimizado pelo RAG: limitado em ${tetoCaracteres} caracteres para máxima precisão)`,
      );
      break;
    }

    partes.push(bloco);
    total += bloco.length;
  }

  return partes.join("\n");
}
