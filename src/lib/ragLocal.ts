/**
 * RAG Local Híbrido com MiniSearch para injeção contextual seletiva no Gemini.
 *
 * Esta camada:
 * 1. Constrói um panorama estruturado do repositório (todas as tarefas, notas, metas e contatos).
 * 2. Identifica a intenção temática e contextual da pergunta (tarefas, notas, metas, contatos, semana, etc.).
 * 3. Seleciona e formata os documentos em texto integral para que o Gemini consiga analisar prioridades,
 *    fazer balanços semanais, triagem de notas e responder com precisão cirúrgica sem inventar fatos.
 */

import type { ItemRepo } from "./repo";
import { buscar } from "./busca";
import { tituloProvavel } from "./markdown";

export type IntencaoConsulta = "metas" | "tarefas" | "notas" | "contatos" | "geral";

/**
 * Classifica a intenção da consulta para selecionar entidades estruturais prioritárias.
 */
export function classificarIntencaoConsulta(consulta: string): IntencaoConsulta {
  const c = (consulta || "").toLowerCase();

  const temMetas = /\b(meta|metas|pdi|objetivo|objetivos|indicador|indicadores)\b/i.test(c);
  const temTarefas = /\b(tarefa|tarefas|fazer|pendente|pendentes|prioridade|prazo|hoje|semana|começar|comeco|priorizar)\b/i.test(c);
  const temNotas = /\b(nota|notas|anotação|anotacao|anotações|anotacoes|ideia|ideias|rascunho|rascunhos|triagem|organizar)\b/i.test(c);
  const temContatos = /\b(contato|contatos|pessoa|pessoas|email|telefone|empresa|cargo|equipe|lider|liderado)\b/i.test(c);

  if (temTarefas) return "tarefas";
  if (temMetas) return "metas";
  if (temNotas) return "notas";
  if (temContatos) return "contatos";
  return "geral";
}

/**
 * Monta um contexto rico com panorama estruturado e documentos detalhados.
 */
export function montarContextoSemantico(
  acervo: ItemRepo[],
  consulta?: string,
  tetoCaracteres = 40_000,
): string {
  if (!acervo || acervo.length === 0) return "";

  const c = (consulta || "").toLowerCase();
  const intencao = consulta ? classificarIntencaoConsulta(consulta) : "geral";
  const selecionados: ItemRepo[] = [];
  const caminhosVistos = new Set<string>();

  const adicionar = (item: ItemRepo) => {
    if (!caminhosVistos.has(item.caminho)) {
      caminhosVistos.add(item.caminho);
      selecionados.push(item);
    }
  };

  // Separa as entidades por pasta
  const todasTarefas = acervo.filter((i) => i.caminho.startsWith("tarefas/"));
  const todasMetas = acervo.filter((i) => i.caminho.startsWith("pdi/metas/"));
  const todasEntregas = acervo.filter((i) => i.caminho.startsWith("pdi/entregas/"));
  const todasNotas = acervo.filter((i) => i.caminho.startsWith("notas/"));
  const todosContatos = acervo.filter((i) => i.caminho.startsWith("contatos/"));

  // 1. Busca semântica e textual com MiniSearch para encontrar os itens mais relevantes para o assunto
  if (consulta && consulta.trim().length >= 2) {
    const resultados = buscar(acervo, consulta);
    for (const r of resultados) {
      const item = acervo.find((i) => i.caminho === r.caminho);
      if (item) adicionar(item);
      if (selecionados.length >= 15) break;
    }
  }

  // 2. Se a pergunta for sobre planejamento, tarefas ou semana:
  const pedePlanejamentoOuSemana =
    intencao === "tarefas" ||
    intencao === "metas" ||
    /\b(semana|hoje|começar|comeco|priorizar|balanço|balanco|revisão|revisao)\b/i.test(c);

  if (pedePlanejamentoOuSemana) {
    // Tarefas pendentes têm prioridade máxima
    const tarefasPendentes = todasTarefas.filter(
      (t) => t.doc?.dados?.status !== "feito",
    );
    tarefasPendentes.slice(0, 20).forEach(adicionar);
    todasMetas.slice(0, 10).forEach(adicionar);
    todasEntregas.slice(0, 10).forEach(adicionar);
  }

  // 3. Se a pergunta for sobre notas / ideias:
  if (intencao === "notas" || /\b(nota|notas|anotação|anotacao|anotações|anotacoes|ideia|ideias|triagem)\b/i.test(c)) {
    // Traz as notas mais recentes / prioritárias
    todasNotas.slice(0, 20).forEach(adicionar);
  }

  // 4. Se a pergunta for sobre contatos:
  if (intencao === "contatos") {
    todosContatos.slice(0, 20).forEach(adicionar);
  }

  // 5. Se ainda temos poucos itens selecionados e a pergunta é geral, inclui os mais recentes
  if (selecionados.length < 8) {
    for (const item of acervo) {
      if (!item.caminho.startsWith(".klaus/") && !item.caminho.startsWith("caixa-entrada/")) {
        adicionar(item);
      }
      if (selecionados.length >= 12) break;
    }
  }

  // 6. Constrói um Panorama conciso e os blocos de documentos relevantes
  const linhasPanorama: string[] = [
    "## 📊 RESUMO DO ACERVO RELEVANTE:",
    "Abaixo estão os documentos selecionados sob medida para responder à sua solicitação:",
  ];

  let total = linhasPanorama.join("\n").length;
  const blocosDocumentos: string[] = [];

  for (const item of selecionados) {
    const titulo = tituloProvavel(item.doc, item.nome);
    const tipo = item.doc?.dados?.tipo || item.caminho.split("/")[0];
    const bloco = `\n### [${tipo}] ${titulo} (${item.caminho})\n${item.texto}\n---`;

    if (total + bloco.length > tetoCaracteres) {
      blocosDocumentos.push(
        `\n... (contexto filtrado e otimizado para economia de tokens: limitado em ${tetoCaracteres} caracteres)`,
      );
      break;
    }

    blocosDocumentos.push(bloco);
    total += bloco.length;
  }

  return `${linhasPanorama.join("\n")}\n${blocosDocumentos.join("\n")}`;
}
