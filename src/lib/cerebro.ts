/**
 * Módulo Cérebro Central do Klaus (.klaus/cerebro.json).
 *
 * Atua como a camada central de metadados, catálogo de tags, esquemas de propriedades
 * e integridade referencial do repositório, mantendo os 4 pilares:
 * 1. Custo R$ 0 e sem backend (opera no navegador com a API do GitHub).
 * 2. Arquivos .md como fonte de conteúdo puro.
 * 3. Consistência e isolamento absoluto da lixeira (itens em lixeira/ nunca poluem o cérebro).
 * 4. Preservação estrita de campos desconhecidos (mesclarFrontmatter / passthrough).
 */

import type { Settings } from "./settings";
import type { ItemRepo } from "./repo";
import { lerMarkdown, escreverMarkdown, mesclarFrontmatter, tituloProvavel } from "./markdown";
import { gravar } from "./github";
import { atualizarCacheLocal, invalidarCache } from "./repo";
import { dispararAtualizacaoAcervo } from "./eventos";
import { notificarOutrasAbas } from "./syncChannel";
import { chave as normalizarChaveLink } from "./links";

export const CAMINHO_CEREBRO = ".klaus/cerebro.json";
export const CAMINHO_CEREBRO_LEGADO = "cerebro.json";
export const CAMINHO_CEREBRO_BACKUP = ".klaus/cerebro.backup.json";

export type TipoPropriedade =
  | "texto"
  | "numero"
  | "select"
  | "multiselect"
  | "data"
  | "checkbox"
  | "url"
  | "email"
  | "telefone"
  | "status"
  | "relation";

export interface TagMetadado {
  cor: string;
  descricao?: string;
  icone?: string;
  categoria?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface PropriedadeDefinicao {
  rotulo: string;
  tipo: TipoPropriedade;
  icone?: string;
  corIcone?: string;
  descricao?: string;
  opcoes?: string[];
  coresOpcoes?: Record<string, string>;
  ocultoPorPadrao?: boolean;
  ordem?: number;
}

export interface StatusDefinicao {
  id: string;
  rotulo: string;
  cor: string;
  grupo: "aberto" | "andamento" | "concluido" | "cancelado";
  ordem: number;
}

export interface VisaoSalva {
  id: string;
  nome: string;
  icone?: string;
  tipoVisao: "tabela" | "quadro" | "lista" | "galeria";
  filtros?: { propriedadeId: string; operador: string; valor: any }[];
  ordenacao?: { campo: string; direcao: "asc" | "desc" };
}

export interface CerebroDados {
  versao: 1;
  atualizado_em: string;
  tags: Record<string, TagMetadado>;
  propriedades: {
    notas?: Record<string, PropriedadeDefinicao>;
    notas_tipos?: Record<string, Record<string, PropriedadeDefinicao>>;
    tarefas?: Record<string, PropriedadeDefinicao>;
    contatos?: Record<string, PropriedadeDefinicao>;
    metas?: Record<string, PropriedadeDefinicao>;
    entregas?: Record<string, PropriedadeDefinicao>;
    referencias?: Record<string, PropriedadeDefinicao>;
    [colecao: string]: Record<string, any> | undefined;
  };
  status?: {
    tarefas?: StatusDefinicao[];
    metas?: StatusDefinicao[];
    [colecao: string]: StatusDefinicao[] | undefined;
  };
  visoesSalvas?: {
    notas?: VisaoSalva[];
    tarefas?: VisaoSalva[];
    [colecao: string]: VisaoSalva[] | undefined;
  };
}

export interface ItemVinculadoDetalhe {
  caminho: string;
  titulo: string;
  tipo: string;
  status?: string;
  concluido?: boolean;
}

export interface MencaoBacklink {
  caminho: string;
  titulo: string;
  tipo: string;
  trecho?: string;
}

export interface ResumoRelacoesBidirecionais {
  itensVinculados: ItemVinculadoDetalhe[];
  mencoes: MencaoBacklink[];
  rollupTarefas: {
    total: number;
    concluidas: number;
    percentual: number;
  };
}

/**
 * Determina se um item do repositório é um arquivo de conteúdo ATIVO.
 * Arquivos na lixeira, arquivos internos do Klaus ou templates especiais são ignorados.
 */
export function ehItemAtivo(caminho: string): boolean {
  if (!caminho) return false;
  const limpo = caminho.toLowerCase();
  if (limpo.startsWith("lixeira/") || limpo.includes("/lixeira/")) return false;
  if (limpo.startsWith(".klaus/") || limpo.startsWith(".github/")) return false;
  if (limpo === CAMINHO_CEREBRO_LEGADO || limpo === "caixa-entrada/estado.json") return false;
  return limpo.endsWith(".md");
}

/**
 * Filtra a lista de itens do repositório mantendo apenas os arquivos ativos.
 */
export function filtrarItensAtivos(itens: ItemRepo[]): ItemRepo[] {
  if (!Array.isArray(itens)) return [];
  return itens.filter((i) => ehItemAtivo(i.caminho));
}

/**
 * Cria a estrutura inicial padrão rica do Cérebro.
 */
export function criarCerebroPadrao(): CerebroDados {
  return {
    versao: 1,
    atualizado_em: new Date().toISOString(),
    tags: {},
    propriedades: {
      notas: {},
      notas_tipos: {
        reuniao: {
          data_reuniao: { rotulo: "Data da Reunião", tipo: "data", icone: "Calendar", corIcone: "azul" },
          participantes: { rotulo: "Participantes", tipo: "multiselect", icone: "Users", corIcone: "verde" },
          decisoes: { rotulo: "Decisões Tomadas", tipo: "texto", icone: "CheckSquare", corIcone: "amarelo" },
        },
        briefing: {
          cliente: { rotulo: "Cliente", tipo: "relation", icone: "Building", corIcone: "azul" },
          prazo_entrega: { rotulo: "Prazo de Entrega", tipo: "data", icone: "Clock", corIcone: "laranja" },
          status_briefing: { rotulo: "Status do Briefing", tipo: "select", opcoes: ["Rascunho", "Em Aprovação", "Aprovado"], icone: "Flag", corIcone: "roxo" },
        },
        leitura: {
          autor: { rotulo: "Autor", tipo: "texto", icone: "User", corIcone: "azul" },
          status_leitura: { rotulo: "Status", tipo: "select", opcoes: ["Quero Ler", "Lendo", "Lido"], icone: "BookOpen", corIcone: "verde" },
          avaliacao: { rotulo: "Avaliação (1-5)", tipo: "numero", icone: "Star", corIcone: "amarelo" },
        },
        projeto: {
          cliente: { rotulo: "Cliente", tipo: "relation", icone: "Building", corIcone: "azul" },
          prazo: { rotulo: "Prazo Final", tipo: "data", icone: "Clock", corIcone: "laranja" },
          orcamento: { rotulo: "Orçamento", tipo: "numero", icone: "DollarSign", corIcone: "verde" },
        },
      },
      tarefas: {},
      contatos: {},
      metas: {},
      entregas: {},
      referencias: {},
    },
    status: {
      tarefas: [
        { id: "a-fazer", rotulo: "A Fazer", cor: "cinza", grupo: "aberto", ordem: 1 },
        { id: "fazendo", rotulo: "Em Andamento", cor: "azul", grupo: "andamento", ordem: 2 },
        { id: "feito", rotulo: "Concluído", cor: "verde", grupo: "concluido", ordem: 3 },
      ],
      metas: [
        { id: "a-fazer", rotulo: "A Fazer", cor: "cinza", grupo: "aberto", ordem: 1 },
        { id: "em-andamento", rotulo: "Em Andamento", cor: "azul", grupo: "andamento", ordem: 2 },
        { id: "concluida", rotulo: "Concluída", cor: "verde", grupo: "concluido", ordem: 3 },
      ],
    },
    visoesSalvas: {
      notas: [
        { id: "visao-todas", nome: "Todas as Notas", tipoVisao: "tabela" },
      ],
      tarefas: [
        { id: "visao-todas", nome: "Todas as Tarefas", tipoVisao: "quadro" },
      ],
    },
  };
}

/**
 * Retorna as propriedades mescladas para um item levando em conta seu subtipo.
 */
export function obterEsquemaPropriedadesItem(
  cerebro: CerebroDados,
  colecao: string,
  subtipo?: string
): Record<string, PropriedadeDefinicao> {
  const baseColecao = cerebro.propriedades[colecao] || {};
  if (colecao === "notas" && subtipo && cerebro.propriedades.notas_tipos?.[subtipo]) {
    return {
      ...baseColecao,
      ...cerebro.propriedades.notas_tipos[subtipo],
    };
  }
  return baseColecao;
}

/**
 * Extrai tags seguras de um frontmatter (suporta array ou string única).
 */
export function extrairTagsDeDoc(dadosFrontmatter: Record<string, any> | undefined): string[] {
  if (!dadosFrontmatter) return [];
  const val = dadosFrontmatter.tags ?? dadosFrontmatter.tag;
  if (Array.isArray(val)) {
    return val
      .map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
      .filter((x) => Boolean(x));
  }
  if (typeof val === "string" && val.trim()) {
    return val
      .split(",")
      .map((x) => x.trim())
      .filter((x) => Boolean(x));
  }
  return [];
}

/**
 * Lê cores de tags pré-salvas no localStorage para migração suave (Auto-Seed).
 */
export function lerCoresTagsLocalStorage(): Record<string, string> {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("klaus_cores_tags") : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
    const rawGlobal = typeof localStorage !== "undefined" ? localStorage.getItem("klaus_config_props_global") : null;
    if (rawGlobal) {
      const parsed = JSON.parse(rawGlobal);
      if (parsed?.coresTags && typeof parsed.coresTags === "object") {
        return parsed.coresTags;
      }
    }
  } catch {}
  return {};
}

/**
 * Gera o estado do Cérebro a partir dos arquivos Markdown ativos (Auto-Seed / Reconstrução).
 */
export function extrairCerebroDeArquivos(
  itensRepo: ItemRepo[],
  coresLocalStorage = lerCoresTagsLocalStorage()
): CerebroDados {
  const base = criarCerebroPadrao();
  const itensAtivos = filtrarItensAtivos(itensRepo);
  const agora = new Date().toISOString();

  for (const item of itensAtivos) {
    const doc = item.doc || lerMarkdown(item.texto || "");
    const tagsDoc = extrairTagsDeDoc(doc?.dados);

    for (const tag of tagsDoc) {
      const tagLimpa = tag.trim();
      if (!tagLimpa) continue;
      if (!base.tags[tagLimpa]) {
        const corExistente = coresLocalStorage[tagLimpa] || "azul";
        base.tags[tagLimpa] = {
          cor: corExistente,
          criado_em: agora,
          atualizado_em: agora,
        };
      }
    }
  }

  return base;
}

/**
 * Carrega o Cérebro a partir dos arquivos do repositório, com tolerância a falhas
 * e reconciliação passiva não-bloqueante.
 */
export function carregarCerebro(itensRepo: ItemRepo[]): CerebroDados {
  if (!Array.isArray(itensRepo)) return criarCerebroPadrao();

  // 1. Procura .klaus/cerebro.json ou legado cerebro.json
  const itemCerebro =
    itensRepo.find((i) => i.caminho === CAMINHO_CEREBRO) ||
    itensRepo.find((i) => i.caminho === CAMINHO_CEREBRO_LEGADO);

  let cerebro: CerebroDados | null = null;

  if (itemCerebro && itemCerebro.texto) {
    try {
      const parseado = JSON.parse(itemCerebro.texto);
      if (parseado && typeof parseado === "object" && parseado.tags) {
        const padrao = criarCerebroPadrao();
        cerebro = {
          versao: 1,
          atualizado_em: parseado.atualizado_em || new Date().toISOString(),
          tags: parseado.tags || {},
          propriedades: {
            ...padrao.propriedades,
            ...(parseado.propriedades || {}),
            notas_tipos: {
              ...padrao.propriedades.notas_tipos,
              ...(parseado.propriedades?.notas_tipos || {}),
            },
          },
          status: parseado.status || padrao.status,
          visoesSalvas: parseado.visoesSalvas || padrao.visoesSalvas,
        };
      }
    } catch {
      // JSON corrompido: tenta backup
      const backup = itensRepo.find((i) => i.caminho === CAMINHO_CEREBRO_BACKUP);
      if (backup && backup.texto) {
        try {
          const parsedBackup = JSON.parse(backup.texto);
          if (parsedBackup?.tags) {
            cerebro = parsedBackup;
          }
        } catch {}
      }
    }
  }

  // 2. Se não existir, executa auto-seed
  if (!cerebro) {
    cerebro = extrairCerebroDeArquivos(itensRepo);
  }

  // 3. Reconciliação passiva com itens ativos (novas tags criadas por fora)
  const itensAtivos = filtrarItensAtivos(itensRepo);
  let alterou = false;
  const agora = new Date().toISOString();

  for (const item of itensAtivos) {
    const doc = item.doc || lerMarkdown(item.texto || "");
    const tagsDoc = extrairTagsDeDoc(doc?.dados);
    for (const tag of tagsDoc) {
      const limpa = tag.trim();
      if (limpa && !cerebro.tags[limpa]) {
        cerebro.tags[limpa] = {
          cor: "azul",
          criado_em: agora,
          atualizado_em: agora,
        };
        alterou = true;
      }
    }
  }

  if (alterou) {
    cerebro.atualizado_em = agora;
  }

  return cerebro;
}

/**
 * Salva o Cérebro no repositório GitHub e grava backup de segurança.
 */
export async function salvarCerebroNoRepo(
  cfg: Settings,
  cerebro: CerebroDados,
  shaAtual?: string
): Promise<void> {
  const jsonTexto = JSON.stringify(cerebro, null, 2);
  await gravar(cfg, CAMINHO_CEREBRO, jsonTexto, shaAtual);
}

/**
 * Calcula relações bidirecionais e rollups para um item específico varrendo os itens ativos do repositório.
 */
export function obterRelacoesBidirecionais(
  caminhoItem: string,
  tituloItem: string,
  itensRepo: ItemRepo[]
): ResumoRelacoesBidirecionais {
  const itensVinculados: ItemVinculadoDetalhe[] = [];
  const mencoes: MencaoBacklink[] = [];

  if (!caminhoItem && !tituloItem) {
    return { itensVinculados: [], mencoes: [], rollupTarefas: { total: 0, concluidas: 0, percentual: 0 } };
  }

  const itensAtivos = filtrarItensAtivos(itensRepo);
  const chaveItemNorm = tituloItem ? normalizarChaveLink(tituloItem) : "";
  const caminhoLimpo = caminhoItem ? caminhoItem.toLowerCase() : "";

  for (const item of itensAtivos) {
    if (item.caminho === caminhoItem) continue;

    const doc = item.doc || lerMarkdown(item.texto || "");
    const tit = tituloProvavel(doc, item.nome);
    const tipo = item.caminho.split("/")[0] || "nota";

    // 1. Verifica campo relacionamentos ou relacao no frontmatter
    const rels = doc.dados?.relacionamentos || doc.dados?.relacao || doc.dados?.metas || [];
    const relsArr = Array.isArray(rels) ? rels : [rels];
    const estaVinculado = relsArr.some((r: any) => {
      const str = typeof r === "string" ? r : r?.titulo || r?.caminho || "";
      const limpo = str.startsWith("@") ? str.slice(1) : str;
      return (
        normalizarChaveLink(limpo) === chaveItemNorm ||
        str.toLowerCase() === caminhoLimpo ||
        str === tituloItem
      );
    });

    if (estaVinculado) {
      const status = doc.dados?.status;
      const concluido =
        doc.dados?.concluido === true ||
        status === "feito" ||
        status === "concluido" ||
        status === "concluida" ||
        status === "finalizado";

      const tipoStr = typeof doc.dados?.tipo === "string" ? doc.dados.tipo : (item.caminho.startsWith("tarefas/") ? "tarefa" : item.caminho.startsWith("pdi/entregas/") ? "entrega" : tipo);
      itensVinculados.push({
        caminho: item.caminho,
        titulo: tit,
        tipo: tipoStr,
        status: typeof status === "string" ? status : undefined,
        concluido,
      });
    }

    // 2. Verifica menção @Titulo no corpo do markdown
    if (chaveItemNorm && doc.corpo) {
      const regexArroba = new RegExp(`@${tituloItem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
      if (regexArroba.test(doc.corpo)) {
        mencoes.push({
          caminho: item.caminho,
          titulo: tit,
          tipo,
        });
      }
    }
  }

  // Rollup de Tarefas e Entregas vinculadas
  const tarefasVinculadas = itensVinculados.filter(
    (it) => it.tipo === "tarefa" || it.tipo === "entrega" || it.caminho.startsWith("tarefas/") || it.caminho.startsWith("pdi/entregas/")
  );
  const total = tarefasVinculadas.length;
  const concluidas = tarefasVinculadas.filter((t) => t.concluido).length;
  const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return {
    itensVinculados,
    mencoes,
    rollupTarefas: {
      total,
      concluidas,
      percentual,
    },
  };
}

export type ItemModificadoCascata = {
  caminho: string;
  textoAntes: string;
  textoDepois: string;
  sha: string;
};

export type ResultadoOperacaoCascata = {
  totalModificados: number;
  itensAtualizados: ItemModificadoCascata[];
};

/**
 * Exclui uma tag globalmente em cascata:
 * 1. Remove do catálogo no cerebro.json.
 * 2. Varre todos os arquivos .md ativos e remove a tag do frontmatter (preservando campos desconhecidos).
 * 3. Grava no GitHub e atualiza o cache local.
 */
export async function excluirTagCascata(
  tagParaExcluir: string,
  itensRepo: ItemRepo[],
  cfg: Settings
): Promise<ResultadoOperacaoCascata> {
  const tagNormalizada = tagParaExcluir.trim().toLowerCase();
  if (!tagNormalizada) return { totalModificados: 0, itensAtualizados: [] };

  const cerebro = carregarCerebro(itensRepo);

  // 1. Remove do catálogo
  for (const chave of Object.keys(cerebro.tags)) {
    if (chave.trim().toLowerCase() === tagNormalizada) {
      delete cerebro.tags[chave];
    }
  }
  cerebro.atualizado_em = new Date().toISOString();

  // 2. Localiza e atualiza arquivos .md ativos
  const itensAtivos = filtrarItensAtivos(itensRepo);
  const itensAtualizados: ItemModificadoCascata[] = [];

  for (const item of itensAtivos) {
    const doc = item.doc || lerMarkdown(item.texto || "");
    const tagsDoc = extrairTagsDeDoc(doc.dados);
    const temTag = tagsDoc.some((t) => t.trim().toLowerCase() === tagNormalizada);

    if (temTag) {
      const novasTags = tagsDoc.filter((t) => t.trim().toLowerCase() !== tagNormalizada);
      const novosDados = mesclarFrontmatter(doc.dados || {}, { tags: novasTags });
      const novoTexto = escreverMarkdown({ dados: novosDados, corpo: doc.corpo });

      itensAtualizados.push({
        caminho: item.caminho,
        textoAntes: item.texto,
        textoDepois: novoTexto,
        sha: item.sha,
      });
    }
  }

  // 3. Persistência
  if (cfg.githubToken && cfg.repoOwner && cfg.repoName) {
    // Salva o cerebro.json
    const shaCerebro = itensRepo.find((i) => i.caminho === CAMINHO_CEREBRO)?.sha;
    await salvarCerebroNoRepo(cfg, cerebro, shaCerebro);

    // Grava os arquivos atualizados
    for (const alt of itensAtualizados) {
      const resp = await gravar(cfg, alt.caminho, alt.textoDepois, alt.sha);
      const novoSha = (resp as any)?.content?.sha || `temp_${Date.now()}`;
      atualizarCacheLocal(alt.caminho, alt.textoDepois, lerMarkdown(alt.textoDepois), novoSha);
    }
    invalidarCache();
    dispararAtualizacaoAcervo();
    notificarOutrasAbas();
  }

  return {
    totalModificados: itensAtualizados.length,
    itensAtualizados,
  };
}

/**
 * Renomeia uma tag globalmente em cascata:
 * 1. Atualiza no catálogo do cerebro.json.
 * 2. Varre todos os arquivos .md ativos e renomeia a tag no frontmatter.
 * 3. Grava no GitHub e atualiza cache local.
 */
export async function renomearTagCascata(
  tagAntiga: string,
  tagNova: string,
  itensRepo: ItemRepo[],
  cfg: Settings,
  novaCor?: string
): Promise<ResultadoOperacaoCascata> {
  const antigaNorm = tagAntiga.trim().toLowerCase();
  const novaLimpa = tagNova.trim();
  if (!antigaNorm || !novaLimpa) return { totalModificados: 0, itensAtualizados: [] };

  const cerebro = carregarCerebro(itensRepo);
  let metaTag: TagMetadado = { cor: novaCor || "azul", criado_em: new Date().toISOString() };

  // 1. Atualiza catálogo
  for (const chave of Object.keys(cerebro.tags)) {
    if (chave.trim().toLowerCase() === antigaNorm) {
      metaTag = {
        ...cerebro.tags[chave],
        cor: novaCor || cerebro.tags[chave].cor || "azul",
        atualizado_em: new Date().toISOString(),
      };
      delete cerebro.tags[chave];
    }
  }
  cerebro.tags[novaLimpa] = metaTag;
  cerebro.atualizado_em = new Date().toISOString();

  // 2. Atualiza arquivos ativos
  const itensAtivos = filtrarItensAtivos(itensRepo);
  const itensAtualizados: ItemModificadoCascata[] = [];

  for (const item of itensAtivos) {
    const doc = item.doc || lerMarkdown(item.texto || "");
    const tagsDoc = extrairTagsDeDoc(doc.dados);
    const temTag = tagsDoc.some((t) => t.trim().toLowerCase() === antigaNorm);

    if (temTag) {
      const novasTags = tagsDoc.map((t) => (t.trim().toLowerCase() === antigaNorm ? novaLimpa : t));
      const novosDados = mesclarFrontmatter(doc.dados || {}, { tags: novasTags });
      const novoTexto = escreverMarkdown({ dados: novosDados, corpo: doc.corpo });

      itensAtualizados.push({
        caminho: item.caminho,
        textoAntes: item.texto,
        textoDepois: novoTexto,
        sha: item.sha,
      });
    }
  }

  // 3. Persistência
  if (cfg.githubToken && cfg.repoOwner && cfg.repoName) {
    const shaCerebro = itensRepo.find((i) => i.caminho === CAMINHO_CEREBRO)?.sha;
    await salvarCerebroNoRepo(cfg, cerebro, shaCerebro);

    for (const alt of itensAtualizados) {
      const resp = await gravar(cfg, alt.caminho, alt.textoDepois, alt.sha);
      const novoSha = (resp as any)?.content?.sha || `temp_${Date.now()}`;
      atualizarCacheLocal(alt.caminho, alt.textoDepois, lerMarkdown(alt.textoDepois), novoSha);
    }
    invalidarCache();
    dispararAtualizacaoAcervo();
    notificarOutrasAbas();
  }

  return {
    totalModificados: itensAtualizados.length,
    itensAtualizados,
  };
}
