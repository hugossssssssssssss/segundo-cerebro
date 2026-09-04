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
import {
  validarSchemaPassivo,
  NotaSchema,
  TarefaSchema,
  MetaSchema,
  EntregaSchema,
  ContatoSchema,
  ReferenciaSchema,
} from "./schemas";

/* ------------------------------------------------------------ helpers */

export function gerarIdEstavel(prefixo = "item"): string {
  const agora = Date.now().toString(36);
  const aleatorio = Math.random().toString(36).slice(2, 7);
  return `${prefixo}_${agora}_${aleatorio}`;
}

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
  validarSchemaPassivo(NotaSchema, doc.dados, caminho);
  const d = doc.dados;
  const tipoRaw = typeof d.tipo === "string" ? d.tipo : "";
  const tipo: Nota["tipo"] =
    tipoRaw === "referencia" || tipoRaw === "rascunho" ? tipoRaw : "nota";

  const subtipoRaw = typeof d.subtipo === "string" ? d.subtipo : undefined;
  const subtipo: Nota["subtipo"] =
    subtipoRaw === "reuniao" || subtipoRaw === "briefing" || subtipoRaw === "rascunho" || subtipoRaw === "nota"
      ? subtipoRaw
      : undefined;

  const criadoEm = typeof d.criado_em === "string" ? d.criado_em : typeof d.criado === "string" ? d.criado : undefined;
  const atualizadoEm = typeof d.atualizado_em === "string" ? d.atualizado_em : typeof d.atualizado === "string" ? d.atualizado : undefined;

  return {
    bruto: doc.dados,
    caminho,
    id: typeof d.id === "string" && d.id.trim() ? d.id.trim() : idDoCaminho(caminho),
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    tipo,
    subtipo,
    tags: comoLista(d.tags),
    fixado: Boolean(d.fixado || d.pinado || d.destaque),
    corpo: doc.corpo,
    criadoEm,
    atualizadoEm,
    atualizado: atualizadoEm,
    dataReuniao: typeof d.data_reuniao === "string" ? d.data_reuniao : undefined,
    participantes: Array.isArray(d.participantes) ? d.participantes.map(String) : undefined,
  };
}

export function notaParaArquivo(n: Nota): { dados: Frontmatter; corpo: string } {
  const agora = new Date().toISOString();
  const criadoEm = n.criadoEm || n.bruto.criado_em || n.bruto.criado || agora;
  return {
    dados: mesclarFrontmatter(n.bruto, {
      id:            n.id || idDoCaminho(n.caminho),
      titulo:        n.titulo,
      tipo:          n.tipo || "nota",
      subtipo:       n.subtipo || undefined,
      tags:          n.tags.length ? n.tags : undefined,
      fixado:        n.fixado ? true : undefined,
      criado_em:     criadoEm,
      atualizado_em: agora,
      data_reuniao:  n.dataReuniao || undefined,
      participantes: n.participantes && n.participantes.length ? n.participantes : undefined,
      // Limpeza de campos legados
      atualizado:    undefined,
      criado:        undefined,
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
  validarSchemaPassivo(TarefaSchema, doc.dados, caminho);
  const d = doc.dados;

  const pomodorosEstimados =
    typeof d.pomodoros_estimados === "number" ? d.pomodoros_estimados :
    typeof d.Pomodoro === "number" ? d.Pomodoro :
    typeof d.pomodoro === "number" ? d.pomodoro :
    typeof d.pomodoros === "number" ? d.pomodoros :
    typeof d.estimativa === "number" ? d.estimativa :
    typeof d.c === "number" ? d.c : undefined;

  const pomodorosRealizados =
    typeof d.pomodoros_realizados === "number" ? d.pomodoros_realizados :
    typeof d.PomodoroFraturado === "number" ? d.PomodoroFraturado :
    typeof d.pomodoro_fraturado === "number" ? d.pomodoro_fraturado :
    typeof d.fraturados === "number" ? d.fraturados : undefined;

  const prioridade =
    typeof d.prioridade === "string" && ["baixa", "media", "alta", "urgente"].includes(d.prioridade)
      ? (d.prioridade as Tarefa["prioridade"])
      : undefined;

  const criadoEm = typeof d.criado_em === "string" ? d.criado_em : typeof d.criado === "string" ? d.criado : undefined;
  const atualizadoEm = typeof d.atualizado_em === "string" ? d.atualizado_em : typeof d.atualizado === "string" ? d.atualizado : undefined;

  return {
    bruto: doc.dados,
    caminho,
    id: typeof d.id === "string" && d.id.trim() ? d.id.trim() : idDoCaminho(caminho),
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    status: statusTarefaValido(d.status),
    prazo: typeof d.prazo === "string" ? d.prazo : undefined,
    prioridade,
    tags: comoLista(d.tags),
    pomodorosEstimados,
    pomodorosRealizados,
    pomodoro: pomodorosEstimados,
    Pomodoro: pomodorosEstimados,
    fraturados: pomodorosRealizados,
    criadoEm,
    atualizadoEm,
    corpo: doc.corpo,
  };
}

export function tarefaParaArquivo(t: Tarefa): { dados: Frontmatter; corpo: string } {
  const agora = new Date().toISOString();
  const criadoEm = t.criadoEm || t.bruto.criado_em || t.bruto.criado || agora.slice(0, 10);
  const estimativa = t.pomodorosEstimados ?? t.pomodoro ?? t.Pomodoro;
  const realizados = t.pomodorosRealizados ?? t.fraturados;

  return {
    dados: mesclarFrontmatter(t.bruto, {
      id:                   t.id || idDoCaminho(t.caminho),
      titulo:               t.titulo,
      tipo:                 "tarefa",
      status:               t.status,
      prazo:                t.prazo,
      prioridade:           t.prioridade,
      tags:                 t.tags.length ? t.tags : undefined,
      pomodoros_estimados:  estimativa,
      pomodoros_realizados: realizados,
      criado_em:            criadoEm,
      atualizado_em:        agora,
      // Remove campos legados do frontmatter para limpeza
      Pomodoro:             undefined,
      PomodoroFraturado:    undefined,
      estimativa:           undefined,
      pomodoros:            undefined,
      pomodoro:             undefined,
      pomodoro_fraturado:   undefined,
      fraturados:           undefined,
      c:                    undefined,
      criado:               undefined,
      atualizado:           undefined,
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
  validarSchemaPassivo(MetaSchema, doc.dados, caminho);
  const d = doc.dados;
  const criadoEm = typeof d.criado_em === "string" ? d.criado_em : typeof d.criado === "string" ? d.criado : undefined;
  const atualizadoEm = typeof d.atualizado_em === "string" ? d.atualizado_em : typeof d.atualizado === "string" ? d.atualizado : undefined;

  return {
    bruto: doc.dados,
    caminho,
    id: typeof d.id === "string" && d.id.trim() ? d.id.trim() : idDoCaminho(caminho),
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    status: statusMetaValido(d.status),
    prazo: typeof d.prazo === "string" ? d.prazo : undefined,
    indicador: typeof d.indicador === "string" ? d.indicador : "",
    tags: comoLista(d.tags),
    criadoEm,
    atualizadoEm,
    corpo: doc.corpo,
  };
}

export function metaParaArquivo(m: Meta): { dados: Frontmatter; corpo: string } {
  const agora = new Date().toISOString();
  const criadoEm = m.criadoEm || m.bruto.criado_em || m.bruto.criado || agora;
  const idFinal =
    (typeof m.bruto.id === "string" && m.bruto.id.trim()) ||
    (typeof m.id === "string" && m.id.trim() ? m.id.trim() : idDoCaminho(m.caminho));

  return {
    dados: mesclarFrontmatter(m.bruto, {
      id:            idFinal,
      titulo:        m.titulo,
      tipo:          "meta",
      status:        m.status,
      prazo:         m.prazo,
      indicador:     m.indicador || undefined,
      tags:          m.tags?.length ? m.tags : undefined,
      criado_em:     criadoEm,
      atualizado_em: agora,
      // Limpeza de campos legados
      atualizado:    undefined,
      criado:        undefined,
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
  validarSchemaPassivo(EntregaSchema, doc.dados, caminho);
  const d = doc.dados;
  const criadoEm = typeof d.criado_em === "string" ? d.criado_em : typeof d.criado === "string" ? d.criado : undefined;
  const atualizadoEm = typeof d.atualizado_em === "string" ? d.atualizado_em : typeof d.atualizado === "string" ? d.atualizado : undefined;

  const conquista = typeof d.conquista === "string" ? d.conquista.trim() : undefined;
  const impacto = typeof d.impacto === "string" ? d.impacto.trim() : undefined;
  const elogio = typeof d.elogio === "string" ? d.elogio.trim() : undefined;
  const autorElogio =
    typeof d.autor_elogio === "string"
      ? d.autor_elogio.trim()
      : typeof d.autorElogio === "string"
      ? d.autorElogio.trim()
      : typeof d.contato === "string"
      ? d.contato.trim()
      : undefined;

  return {
    bruto: doc.dados,
    caminho,
    id: typeof d.id === "string" && d.id.trim() ? d.id.trim() : idDoCaminho(caminho),
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    data: typeof d.data === "string" ? d.data : dataDoNome(caminho),
    metas: comoLista(d.metas),
    iaSugeriu: d.ia_sugeriu === true,
    conquista,
    impacto,
    elogio,
    autorElogio,
    colaboracao: comoLista(d.colaboracao || d.equipe),
    tags: comoLista(d.tags),
    criadoEm,
    atualizadoEm,
    corpo: doc.corpo,
  };
}

export function entregaParaArquivo(e: Entrega): { dados: Frontmatter; corpo: string } {
  const agora = new Date().toISOString();
  const criadoEm = e.criadoEm || e.bruto.criado_em || e.bruto.criado || agora;
  return {
    dados: mesclarFrontmatter(e.bruto, {
      id:            e.id || idDoCaminho(e.caminho),
      titulo:        e.titulo,
      tipo:          "entrega",
      data:          e.data,
      metas:         e.metas.length ? e.metas : undefined,
      ia_sugeriu:    e.iaSugeriu || undefined,
      conquista:     e.conquista || undefined,
      impacto:       e.impacto || undefined,
      elogio:        e.elogio || undefined,
      autor_elogio:  e.autorElogio || undefined,
      colaboracao:   e.colaboracao?.length ? e.colaboracao : undefined,
      tags:          e.tags?.length ? e.tags : undefined,
      criado_em:     criadoEm,
      atualizado_em: agora,
      // Limpeza de campos legados
      atualizado:    undefined,
      criado:        undefined,
      autorElogio:   undefined,
      equipe:        undefined,
      contato:       undefined,
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
  validarSchemaPassivo(ReferenciaSchema, doc.dados, caminho);
  const d = doc.dados;
  const criadoEm = typeof d.criado_em === "string" ? d.criado_em : typeof d.criado === "string" ? d.criado : undefined;
  const atualizadoEm = typeof d.atualizado_em === "string" ? d.atualizado_em : typeof d.atualizado === "string" ? d.atualizado : undefined;

  return {
    bruto: doc.dados,
    caminho,
    id: typeof d.id === "string" && d.id.trim() ? d.id.trim() : idDoCaminho(caminho),
    sha,
    titulo:
      typeof d.titulo === "string" && d.titulo.trim()
        ? d.titulo.trim()
        : tituloFallback,
    imagem: typeof d.imagem === "string" ? d.imagem : extrairImagem(doc.corpo),
    fonte: typeof d.fonte === "string" ? d.fonte : undefined,
    tags: comoLista(d.tags),
    porque: typeof d.porque === "string" ? d.porque : "",
    criadoEm,
    atualizadoEm,
    corpo: doc.corpo,
  };
}

export function referenciaParaArquivo(r: Referencia): { dados: Frontmatter; corpo: string } {
  const agora = new Date().toISOString();
  const criadoEm = r.criadoEm || r.bruto.criado_em || r.bruto.criado || agora;
  return {
    dados: mesclarFrontmatter(r.bruto, {
      id:            r.id || idDoCaminho(r.caminho),
      titulo:        r.titulo,
      tipo:          "referencia",
      imagem:        r.imagem,
      fonte:         r.fonte,
      porque:        r.porque || undefined,
      tags:          r.tags.length ? r.tags : undefined,
      criado_em:     criadoEm,
      atualizado_em: agora,
      // Limpeza de campos legados
      atualizado:    undefined,
      criado:        undefined,
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
  validarSchemaPassivo(ContatoSchema, doc.dados, caminho);
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
    "id",
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
    "criado",
    "criado_em",
    "atualizado",
    "atualizado_em",
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

  const criadoEm = typeof d.criado_em === "string" ? d.criado_em : typeof d.criado === "string" ? d.criado : undefined;
  const atualizadoEm = typeof d.atualizado_em === "string" ? d.atualizado_em : typeof d.atualizado === "string" ? d.atualizado : undefined;

  return {
    bruto: doc.dados,
    caminho,
    id: typeof d.id === "string" && d.id.trim() ? d.id.trim() : idDoCaminho(caminho),
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
    criadoEm,
    atualizadoEm,
    atualizado: atualizadoEm,
  };
}

export function contatoParaArquivo(c: Contato): { dados: Frontmatter; corpo: string } {
  const d = c.bruto || {};
  const agora = new Date().toISOString();
  const criadoEm = c.criadoEm || d.criado_em || d.criado || agora;
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
      id:            c.id || idDoCaminho(c.caminho),
      titulo:        c.titulo,
      tipo:          "contato",
      cargo:         cargo || undefined,
      empresa:       empresa || undefined,
      email:         email || undefined,
      telefone:      telefone || undefined,
      pai_id:        paiId || undefined,
      tags:          tags && tags.length ? tags : undefined,
      criado_em:     criadoEm,
      atualizado_em: agora,
      // Limpeza de campos legados
      pai:           undefined,
      atualizado:    undefined,
      criado:        undefined,
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
export {
  REGISTRO_ENTIDADES,
  detectarTipoDoItem,
  obterEntidadePorPasta,
  obterEntidadePorTipo,
  type DefinicaoEntidade,
} from "./entidadeRegistro";
