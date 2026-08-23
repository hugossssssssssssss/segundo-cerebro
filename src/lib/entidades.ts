/**
 * Conversão entre arquivos .md e entidades do app.
 *
 * Cada entidade tem duas funções:
 *   como<Entidade>(doc, caminho, sha, titulo) → entidade tipada
 *   paraArquivo(entidade)                     → { dados, corpo } para gravar
 *
 * REGRA INEGOCIÁVEL: `paraArquivo` sempre chama `mesclarFrontmatter`, que
 * garante que campos que o app não conhece voltem para o arquivo. Nunca
 * construa o objeto `dados` do zero — sempre parta do `item.bruto`.
 *
 * Os arquivos legados (tarefas.ts, pdi.ts, referencias.ts) re-exportam
 * daqui para não quebrar imports existentes.
 */

import type { Documento, Frontmatter } from "./markdown";
import { comoLista, mesclarFrontmatter } from "./markdown";
import { diasAte } from "./utils";
import {
  PASTAS,
  STATUS_TAREFA,
  STATUS_META,
  type Nota,
  type Tarefa,
  type StatusTarefa,
  type Meta,
  type StatusMeta,
  type Entrega,
  type Referencia,
  type Contato,
} from "./tipos";

/* ------------------------------------------------------------ helpers */

function idDoCaminho(caminho: string): string {
  return caminho.split("/").pop()!.replace(/\.md$/, "");
}

function statusTarefaValido(v: unknown): StatusTarefa {
  return STATUS_TAREFA.includes(v as StatusTarefa) ? (v as StatusTarefa) : "a-fazer";
}

function statusMetaValido(v: unknown): StatusMeta {
  return STATUS_META.includes(v as StatusMeta) ? (v as StatusMeta) : "a-fazer";
}

/** Extrai a data do prefixo do nome do arquivo: "2026-08-13-titulo.md". */
export function dataDoNome(caminho: string): string {
  const nome = caminho.split("/").pop() ?? "";
  return nome.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
}

/* ================================================================ NOTA */

export function comoNota(
  doc: Documento,
  caminho: string,
  sha: string,
  tituloFallback: string,
): Nota {
  const d = doc.dados;
  const tipoRaw = typeof d.tipo === "string" ? d.tipo : "";
  const tipo: Nota["tipo"] =
    tipoRaw === "referencia" || tipoRaw === "rascunho" ? tipoRaw : "nota";

  return {
    bruto: doc.dados,
    caminho,
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    tipo,
    tags: comoLista(d.tags),
    corpo: doc.corpo,
    atualizado: typeof d.atualizado === "string" ? d.atualizado : undefined,
  };
}

export function notaParaArquivo(n: Nota): { dados: Frontmatter; corpo: string } {
  return {
    dados: mesclarFrontmatter(n.bruto, {
      titulo:    n.titulo,
      tipo:      n.tipo || "nota",
      tags:      n.tags.length ? n.tags : undefined,
      atualizado: new Date().toISOString(),
    }),
    corpo: n.corpo,
  };
}

/* ============================================================= TAREFA */

export function comoTarefa(
  doc: Documento,
  caminho: string,
  sha: string,
  tituloFallback: string,
): Tarefa {
  const d = doc.dados;

  const estimativa = typeof d.Pomodoro === "number" ? d.Pomodoro :
                     typeof d.pomodoro === "number" ? d.pomodoro :
                     typeof d.pomodoros === "number" ? d.pomodoros :
                     typeof d.estimativa === "number" ? d.estimativa : undefined;

  const fraturados = typeof d.PomodoroFraturado === "number" ? d.PomodoroFraturado :
                     typeof d.pomodoro_fraturado === "number" ? d.pomodoro_fraturado :
                     typeof d.fraturados === "number" ? d.fraturados : undefined;

  return {
    bruto: doc.dados,
    caminho,
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    status: statusTarefaValido(d.status),
    prazo: typeof d.prazo === "string" ? d.prazo : undefined,
    tags: comoLista(d.tags),
    estimativa,
    fraturados,
    corpo: doc.corpo,
  };
}

export function tarefaParaArquivo(t: Tarefa): { dados: Frontmatter; corpo: string } {
  const agora = new Date().toISOString();
  const criado = t.bruto.criado || t.bruto.criado_em || agora.slice(0, 10);
  return {
    dados: mesclarFrontmatter(t.bruto, {
      titulo: t.titulo,
      tipo:   "tarefa",
      status: t.status,
      prazo:  t.prazo,
      tags:   t.tags.length ? t.tags : undefined,
      Pomodoro: t.estimativa,
      PomodoroFraturado: t.fraturados,
      // Remove campos legados do frontmatter para limpeza
      estimativa: undefined,
      pomodoros: undefined,
      pomodoro: undefined,
      pomodoro_fraturado: undefined,
      fraturados: undefined,
      criado,
      atualizado: agora,
    }),
    corpo: t.corpo,
  };
}

/* ================================================================ META */

export function comoMeta(
  doc: Documento,
  caminho: string,
  sha: string,
  tituloFallback: string,
): Meta {
  const d = doc.dados;
  return {
    bruto: doc.dados,
    caminho,
    id: idDoCaminho(caminho),
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    status: statusMetaValido(d.status),
    prazo: typeof d.prazo === "string" ? d.prazo : undefined,
    indicador: typeof d.indicador === "string" ? d.indicador : "",
    corpo: doc.corpo,
  };
}

export function metaParaArquivo(m: Meta): { dados: Frontmatter; corpo: string } {
  return {
    dados: mesclarFrontmatter(m.bruto, {
      titulo:    m.titulo,
      tipo:      "meta",
      status:    m.status,
      prazo:     m.prazo,
      indicador: m.indicador || undefined,
      atualizado: new Date().toISOString(),
    }),
    corpo: m.corpo,
  };
}

/* ============================================================= ENTREGA */

export function comoEntrega(
  doc: Documento,
  caminho: string,
  sha: string,
  tituloFallback: string,
): Entrega {
  const d = doc.dados;
  return {
    bruto: doc.dados,
    caminho,
    id: idDoCaminho(caminho),
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    data: typeof d.data === "string" ? d.data : dataDoNome(caminho),
    metas: comoLista(d.metas),
    iaSugeriu: d.ia_sugeriu === true,
    corpo: doc.corpo,
  };
}

export function entregaParaArquivo(e: Entrega): { dados: Frontmatter; corpo: string } {
  return {
    dados: mesclarFrontmatter(e.bruto, {
      titulo:     e.titulo,
      tipo:       "entrega",
      data:       e.data,
      metas:      e.metas.length ? e.metas : undefined,
      ia_sugeriu: e.iaSugeriu || undefined,
      atualizado: new Date().toISOString(),
    }),
    corpo: e.corpo,
  };
}

/* =========================================================== REFERENCIA */

/** Acha a primeira imagem markdown no corpo — para quem editou o arquivo por fora. */
function extrairImagem(corpo: string): string | undefined {
  return corpo.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1];
}

export function comoReferencia(
  doc: Documento,
  caminho: string,
  sha: string,
  tituloFallback: string,
): Referencia {
  const d = doc.dados;
  return {
    bruto: doc.dados,
    caminho,
    id: idDoCaminho(caminho),
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    imagem: typeof d.imagem === "string" ? d.imagem : extrairImagem(doc.corpo),
    fonte: typeof d.fonte === "string" ? d.fonte : undefined,
    tags: comoLista(d.tags),
    porque: typeof d.porque === "string" ? d.porque : "",
    corpo: doc.corpo,
  };
}

export function referenciaParaArquivo(r: Referencia): { dados: Frontmatter; corpo: string } {
  return {
    dados: mesclarFrontmatter(r.bruto, {
      titulo: r.titulo,
      tipo:   "referencia",
      imagem: r.imagem,
      fonte:  r.fonte,
      porque: r.porque || undefined,
      tags:   r.tags.length ? r.tags : undefined,
      atualizado: new Date().toISOString(),
    }),
    corpo: r.corpo,
  };
}

/* =========================================================== CONTATO */

export function comoContato(
  doc: Documento,
  caminho: string,
  sha: string,
  tituloFallback: string,
): Contato {
  const d = doc.dados;

  const propriedades: Record<string, string> = {};
  if (typeof d.propriedades === "object" && d.propriedades !== null) {
    for (const [k, v] of Object.entries(d.propriedades as Record<string, unknown>)) {
      if (v !== undefined && v !== null && v !== "") {
        propriedades[k] = String(v);
      }
    }
  }

  const reserved = new Set([
    "titulo",
    "nome",
    "tipo",
    "cargo",
    "empresa",
    "email",
    "telefone",
    "pai_id",
    "pai",
    "tags",
    "propriedades",
    "atualizado",
    "icone",
  ]);
  for (const [k, v] of Object.entries(d)) {
    if (!reserved.has(k) && !k.startsWith("_") && v !== undefined && v !== null && v !== "") {
      propriedades[k] = String(v);
    }
  }

  const paiId =
    typeof d.pai_id === "string" && d.pai_id.trim()
      ? d.pai_id.trim()
      : typeof d.pai === "string" && d.pai.trim()
      ? d.pai.trim()
      : undefined;

  return {
    bruto: doc.dados,
    caminho,
    id: idDoCaminho(caminho),
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : typeof d.nome === "string" && d.nome.trim()
        ? d.nome.trim()
        : tituloFallback,
    cargo: typeof d.cargo === "string" && d.cargo.trim() ? d.cargo.trim() : undefined,
    empresa: typeof d.empresa === "string" && d.empresa.trim() ? d.empresa.trim() : undefined,
    email: typeof d.email === "string" && d.email.trim() ? d.email.trim() : undefined,
    telefone: typeof d.telefone === "string" && d.telefone.trim() ? d.telefone.trim() : undefined,
    paiId,
    tags: comoLista(d.tags),
    propriedades,
    corpo: doc.corpo,
    atualizado: typeof d.atualizado === "string" ? d.atualizado : undefined,
  };
}

export function contatoParaArquivo(c: Contato): { dados: Frontmatter; corpo: string } {
  const d = c.bruto || {};
  const cargo = c.cargo !== undefined ? c.cargo : (typeof d.cargo === "string" ? d.cargo.trim() : undefined);
  const empresa = c.empresa !== undefined ? c.empresa : (typeof d.empresa === "string" ? d.empresa.trim() : undefined);
  const email = c.email !== undefined ? c.email : (typeof d.email === "string" ? d.email.trim() : undefined);
  const telefone = c.telefone !== undefined ? c.telefone : (typeof d.telefone === "string" ? d.telefone.trim() : undefined);
  const paiId =
    c.paiId !== undefined
      ? c.paiId
      : typeof d.pai_id === "string" && d.pai_id.trim()
      ? d.pai_id.trim()
      : typeof d.pai === "string" && d.pai.trim()
      ? d.pai.trim()
      : undefined;
  const tags = c.tags !== undefined && c.tags.length > 0 ? c.tags : (Array.isArray(d.tags) ? (d.tags as string[]) : undefined);

  return {
    dados: mesclarFrontmatter(c.bruto, {
      titulo: c.titulo,
      tipo: "contato",
      cargo: cargo || undefined,
      empresa: empresa || undefined,
      email: email || undefined,
      telefone: telefone || undefined,
      pai_id: paiId || undefined,
      tags: tags && tags.length ? tags : undefined,
      atualizado: new Date().toISOString(),
    }),
    corpo: c.corpo,
  };
}

/* ============================================= UTILITÁRIOS DE DOMÍNIO */

/**
 * Texto descritivo do prazo de uma tarefa.
 * Mantido aqui para que a lógica de domínio fique junto do tipo.
 */
export function textoPrazoTarefa(t: Tarefa): string {
  const d = diasAte(t.prazo);
  if (d === null) return "";
  if (d < 0) return d === -1 ? "atrasada 1 dia" : `atrasada ${-d} dias`;
  if (d === 0) return "vence hoje";
  if (d === 1) return "amanhã";
  if (d <= 7) return `em ${d} dias`;
  return t.prazo ?? "";
}

export function textoPrazoMeta(m: Meta): string {
  const d = diasAte(m.prazo);
  if (d === null) return "";
  if (m.status === "concluida") return "";
  if (d < 0) return `venceu há ${-d} dia${-d > 1 ? "s" : ""}`;
  if (d === 0) return "vence hoje";
  if (d <= 30) return `${d} dias`;
  return `${Math.round(d / 30)} meses`;
}

export { PASTAS };
