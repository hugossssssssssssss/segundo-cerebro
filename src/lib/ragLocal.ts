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
  tetoCaracteres = 250_000,
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

  // 1. Se a pergunta envolver planejamento, tarefas, semana, início do dia ou metas:
  const pedePlanejamentoOuSemana =
    intencao === "tarefas" ||
    intencao === "metas" ||
    /\b(semana|hoje|começar|comeco|priorizar|balanço|balanco|revisão|revisao)\b/i.test(c);

  if (pedePlanejamentoOuSemana) {
    todasTarefas.forEach(adicionar);
    todasMetas.forEach(adicionar);
    todasEntregas.forEach(adicionar);
    todasNotas.forEach(adicionar);
  }

  // 2. Se a pergunta for sobre notas / anotações / ideias ou triagem:
  if (intencao === "notas" || /\b(nota|notas|anotação|anotacao|anotações|anotacoes|ideia|ideias|triagem|conteúdo|conteudo)\b/i.test(c)) {
    todasNotas.forEach(adicionar);
    todasTarefas.forEach(adicionar);
    todasMetas.forEach(adicionar);
  }

  // 3. Se a pergunta for sobre contatos:
  if (intencao === "contatos") {
    todosContatos.forEach(adicionar);
  }

  // 4. Busca textual e semântica com MiniSearch para trazer itens relevantes ao tema
  if (consulta && consulta.trim().length >= 2) {
    const resultados = buscar(acervo, consulta);
    for (const r of resultados) {
      const item = acervo.find((i) => i.caminho === r.caminho);
      if (item) adicionar(item);
      if (selecionados.length >= 50) break;
    }
  }

  // 5. Inclusão abrangente de notas e acervo (para garantir que nada fique sem texto integral)
  todasNotas.forEach(adicionar);
  todasTarefas.forEach(adicionar);
  todasMetas.forEach(adicionar);
  todasEntregas.forEach(adicionar);
  todosContatos.forEach(adicionar);

  // Fallback: inclui quaisquer outros itens úteis do acervo até o limite
  for (const item of acervo) {
    if (!item.caminho.startsWith(".klaus/") && !item.caminho.startsWith("caixa-entrada/")) {
      adicionar(item);
    }
  }

  // 6. Constrói o Panorama Geral do Acervo para o Gemini ter visão do índice
  const linhasPanorama: string[] = [
    "## 📊 PANORAMA RESUMIDO DO ACERVO DO KLAUS:",
    "Abaixo você tem o índice rápido e, em seguida, o CONTEÚDO INTEGRAL E COMPLETO dos arquivos para leitura direta.",
  ];

  if (todasTarefas.length > 0) {
    linhasPanorama.push(`\n### TAREFAS (${todasTarefas.length} cadastradas):`);
    for (const t of todasTarefas) {
      const tit = tituloProvavel(t.doc, t.nome);
      const status = t.doc?.dados?.status || "a-fazer";
      const prazo = t.doc?.dados?.prazo ? ` | Prazo: ${t.doc.dados.prazo}` : "";
      const prioridade = t.doc?.dados?.prioridade ? ` | Prioridade: ${t.doc.dados.prioridade}` : "";
      const tags = t.doc?.dados?.tags ? ` | Tags: ${JSON.stringify(t.doc.dados.tags)}` : "";
      linhasPanorama.push(`- [${status}] "${tit}" (${t.caminho})${prazo}${prioridade}${tags}`);
    }
  }

  if (todasMetas.length > 0 || todasEntregas.length > 0) {
    linhasPanorama.push(`\n### METAS E ENTREGAS DO PDI:`);
    for (const m of todasMetas) {
      const tit = tituloProvavel(m.doc, m.nome);
      linhasPanorama.push(`- [Meta PDI] "${tit}" (${m.caminho})`);
    }
    for (const e of todasEntregas) {
      const tit = tituloProvavel(e.doc, e.nome);
      const metas = e.doc?.dados?.metas ? ` -> alimenta: ${JSON.stringify(e.doc.dados.metas)}` : " (sem meta atribuída)";
      linhasPanorama.push(`- [Entrega PDI] "${tit}" (${e.caminho})${metas}`);
    }
  }

  if (todasNotas.length > 0) {
    linhasPanorama.push(`\n### NOTAS (${todasNotas.length} cadastradas):`);
    for (const n of todasNotas) {
      const tit = tituloProvavel(n.doc, n.nome);
      const tags = n.doc?.dados?.tags ? ` | Tags: ${JSON.stringify(n.doc.dados.tags)}` : "";
      linhasPanorama.push(`- "${tit}" (${n.caminho})${tags}`);
    }
  }

  linhasPanorama.push("\n---\n## 📄 CONTEÚDO INTEGRAL E DETALHADO DOS DOCUMENTOS (LEIA O TEXTO ABAIXO):");

  let total = linhasPanorama.join("\n").length;
  const blocosDocumentos: string[] = [];

  for (const item of selecionados) {
    const titulo = tituloProvavel(item.doc, item.nome);
    const tipo = item.doc?.dados?.tipo || item.caminho.split("/")[0];
    const bloco = `\n### [${tipo}] ${titulo} (${item.caminho})\n${item.texto}\n---`;

    if (total + bloco.length > tetoCaracteres) {
      blocosDocumentos.push(
        `\n... (contexto otimizado pelo RAG: limitado em ${tetoCaracteres} caracteres para máxima precisão)`,
      );
      break;
    }

    blocosDocumentos.push(bloco);
    total += bloco.length;
  }

  return `${linhasPanorama.join("\n")}\n${blocosDocumentos.join("\n")}`;
}
