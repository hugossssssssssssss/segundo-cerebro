import { cache, type ItemRepo } from "@/lib/repo";
import { comoTarefa, comoReferencia } from "@/lib/entidades";
import { tituloProvavel } from "@/lib/markdown";
import type { Tarefa, Referencia } from "@/lib/tipos";

/**
 * Busca no cache do repositório todas as tarefas vinculadas a uma nota específica
 * por menção no título, caminho, corpo ou campo de relacionamentos.
 */
export function obterTarefasVinculadas(
  tituloNota: string,
  caminhoNota?: string,
  relacionamentos: string[] = [],
  itensFonte?: ItemRepo[]
): Tarefa[] {
  const itens = itensFonte || cache?.itens;
  if (!tituloNota && !caminhoNota) return [];
  if (!itens) return [];

  const normTitulo = tituloNota.toLowerCase().trim();
  const normCaminho = caminhoNota?.toLowerCase().trim() || "";
  const baseCaminho = caminhoNota
    ? caminhoNota.split("/").pop()?.replace(/\.md$/, "").toLowerCase().trim() || ""
    : "";

  const resultados: Tarefa[] = [];

  for (const item of itens) {
    if (!item.caminho.startsWith("tarefas/")) continue;
    if (!item.caminho.endsWith(".md")) continue;

    const t = comoTarefa(
      item.doc,
      item.caminho,
      item.sha,
      tituloProvavel(item.doc, item.nome)
    );

    // Checa se a tarefa tem relacionamento com a nota atual
    const relsTarefa = (t.relacionamentos || []).map((r) =>
      r.replace(/^[@[]+/, "").replace(/\]\]$/, "").toLowerCase().trim()
    );

    const relacionadoPeloCampo = relsTarefa.some(
      (r) =>
        (normTitulo && (r === normTitulo || r.includes(normTitulo) || normTitulo.includes(r))) ||
        (normCaminho && r === normCaminho) ||
        (baseCaminho && r === baseCaminho)
    );

    // Checa se a nota atual lista essa tarefa em seus relacionamentos
    const normTituloTarefa = t.titulo.toLowerCase().trim();
    const normCaminhoTarefa = t.caminho.toLowerCase().trim();
    const baseCaminhoTarefa = t.caminho.split("/").pop()?.replace(/\.md$/, "").toLowerCase().trim() || "";

    const relacionadoPelaNota = relacionamentos.some((r) => {
      const limpo = r.replace(/^[@[]+/, "").replace(/\]\]$/, "").toLowerCase().trim();
      return (
        limpo === normTituloTarefa ||
        limpo === normCaminhoTarefa ||
        limpo === baseCaminhoTarefa
      );
    });

    // Checa se o corpo da tarefa cita a nota
    const corpoNorm = (t.corpo || "").toLowerCase();
    const citadoNoCorpo =
      normTitulo &&
      (corpoNorm.includes(`@${normTitulo}`) || corpoNorm.includes(`[[${normTitulo}]]`));

    if (relacionadoPeloCampo || relacionadoPelaNota || citadoNoCorpo) {
      resultados.push(t);
    }
  }

  // Ordena: pendentes primeiro, concluídas depois
  return resultados.sort((a, b) => {
    if (a.status === "feito" && b.status !== "feito") return 1;
    if (a.status !== "feito" && b.status === "feito") return -1;
    return a.titulo.localeCompare(b.titulo);
  });
}

/**
 * Busca no cache do repositório todas as referências visuais vinculadas a uma nota específica.
 */
export function obterReferenciasVinculadas(
  tituloNota: string,
  caminhoNota?: string,
  relacionamentos: string[] = [],
  itensFonte?: ItemRepo[]
): Referencia[] {
  const itens = itensFonte || cache?.itens;
  if (!tituloNota && !caminhoNota) return [];
  if (!itens) return [];

  const normTitulo = tituloNota.toLowerCase().trim();
  const normCaminho = caminhoNota?.toLowerCase().trim() || "";
  const baseCaminho = caminhoNota
    ? caminhoNota.split("/").pop()?.replace(/\.md$/, "").toLowerCase().trim() || ""
    : "";

  const resultados: Referencia[] = [];

  for (const item of itens) {
    if (!item.caminho.startsWith("referencias/")) continue;
    if (!item.caminho.endsWith(".md")) continue;

    const r = comoReferencia(
      item.doc,
      item.caminho,
      item.sha,
      tituloProvavel(item.doc, item.nome)
    );

    const relsRef = (r.relacionamentos || []).map((rel) =>
      rel.replace(/^[@[]+/, "").replace(/\]\]$/, "").toLowerCase().trim()
    );

    const relacionadoPeloCampo = relsRef.some(
      (rel) =>
        (normTitulo && (rel === normTitulo || rel.includes(normTitulo) || normTitulo.includes(rel))) ||
        (normCaminho && rel === normCaminho) ||
        (baseCaminho && rel === baseCaminho)
    );

    const normTituloRef = r.titulo.toLowerCase().trim();
    const normCaminhoRef = r.caminho.toLowerCase().trim();
    const baseCaminhoRef = r.caminho.split("/").pop()?.replace(/\.md$/, "").toLowerCase().trim() || "";

    const relacionadoPelaNota = relacionamentos.some((rel) => {
      const limpo = rel.replace(/^[@[]+/, "").replace(/\]\]$/, "").toLowerCase().trim();
      return (
        limpo === normTituloRef ||
        limpo === normCaminhoRef ||
        limpo === baseCaminhoRef
      );
    });

    const corpoNorm = (r.corpo || "").toLowerCase();
    const citadoNoCorpo =
      normTitulo &&
      (corpoNorm.includes(`@${normTitulo}`) || corpoNorm.includes(`[[${normTitulo}]]`));

    if (relacionadoPeloCampo || relacionadoPelaNota || citadoNoCorpo) {
      resultados.push(r);
    }
  }

  return resultados;
}
