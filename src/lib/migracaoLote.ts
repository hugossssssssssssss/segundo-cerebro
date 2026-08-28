/**
 * Analisador e Migrador em Lote de Entidades do Klaus.
 *
 * Varre todo o acervo de arquivos Markdown no repositório, identifica
 * documentos que ainda utilizam convenções legadas e permite a padronização
 * unificada em lote direto no GitHub.
 */

import type { ItemRepo } from "./repo";
import { ehArquivoInternoOuSistema, atualizarCacheLocal, invalidarCache } from "./repo";
import { gravar } from "./github";
import { escreverMarkdown, tituloProvavel, lerMarkdown } from "./markdown";
import { detectarTipoDoItem } from "./entidadeRegistro";
import {
  comoNota,
  notaParaArquivo,
  comoTarefa,
  tarefaParaArquivo,
  comoMeta,
  metaParaArquivo,
  comoEntrega,
  entregaParaArquivo,
  comoReferencia,
  referenciaParaArquivo,
  comoContato,
  contatoParaArquivo,
} from "./entidades";
import {
  comoProcesso,
  processoParaFrontmatter,
  comoCardProcesso,
  cardProcessoParaFrontmatter,
} from "./processos";
import type { Settings } from "./settings";
import { dispararAtualizacaoAcervo } from "./eventos";
import { notificarOutrasAbas } from "./syncChannel";
import { verificarIntegridadeReferencias, type RelatorioIntegridade } from "./links";

export interface ItemMigracao {
  caminho: string;
  sha: string;
  titulo: string;
  tipo: string;
  textoOriginal: string;
  textoNormalizado: string;
}

export interface RelatorioAnaliseAcervo {
  totalArquivos: number;
  arquivosPadronizados: number;
  arquivosPendentes: number;
  itensPendentes: ItemMigracao[];
  integridade?: RelatorioIntegridade;
}

/**
 * Normaliza um documento de acordo com o conversor canônico de seu tipo.
 */
export function normalizarDocumento(item: ItemRepo): string | null {
  if (
    ehArquivoInternoOuSistema(item.caminho) ||
    item.caminho.startsWith(".klaus/") ||
    item.caminho.includes("/.klaus/") ||
    item.caminho.startsWith("referencias/imagens/") ||
    item.caminho.endsWith(".json") ||
    item.caminho.endsWith(".excalidraw")
  ) {
    return null;
  }

  const tipo = detectarTipoDoItem(item);
  const tit = tituloProvavel(item.doc, item.nome);

  let docConvertido: { dados: Record<string, any>; corpo: string };

  switch (tipo) {
    case "nota":
    case "reuniao":
    case "outro": {
      const n = comoNota(item.doc, item.caminho, item.sha, tit);
      docConvertido = notaParaArquivo(n);
      break;
    }
    case "tarefa": {
      const t = comoTarefa(item.doc, item.caminho, item.sha, tit);
      docConvertido = tarefaParaArquivo(t);
      break;
    }
    case "meta": {
      const m = comoMeta(item.doc, item.caminho, item.sha, tit);
      docConvertido = metaParaArquivo(m);
      break;
    }
    case "entrega": {
      const e = comoEntrega(item.doc, item.caminho, item.sha, tit);
      docConvertido = entregaParaArquivo(e);
      break;
    }
    case "referencia": {
      const r = comoReferencia(item.doc, item.caminho, item.sha, tit);
      docConvertido = referenciaParaArquivo(r);
      break;
    }
    case "contato": {
      const c = comoContato(item.doc, item.caminho, item.sha, tit);
      docConvertido = contatoParaArquivo(c);
      break;
    }
    case "processo": {
      const p = comoProcesso(item.doc, item.caminho, item.sha, tit);
      docConvertido = {
        dados: processoParaFrontmatter(p),
        corpo: p.corpo,
      };
      break;
    }
    case "card_processo": {
      const cp = comoCardProcesso(item.doc, item.caminho, item.sha, tit);
      docConvertido = {
        dados: cardProcessoParaFrontmatter(cp),
        corpo: cp.corpo,
      };
      break;
    }
    default:
      return null;
  }

  const textoGerado = escreverMarkdown(docConvertido);

  // Se o item original já continha atualizado_em e a única diferença fosse o timestamp novo gerado agora,
  // preservamos a idempotência comparando os dados estruturais
  const dadosOriginal = item.doc.dados;
  const dadosGerados = docConvertido.dados;

  const temCamposLegados =
    "Pomodoro" in dadosOriginal ||
    "PomodoroFraturado" in dadosOriginal ||
    "processoId" in dadosOriginal ||
    "etapaId" in dadosOriginal ||
    "pai" in dadosOriginal ||
    "criado" in dadosOriginal ||
    "atualizado" in dadosOriginal;

  const faltaCamposCore =
    !("id" in dadosOriginal) ||
    !("tipo" in dadosOriginal) ||
    !("criado_em" in dadosOriginal) ||
    !("atualizado_em" in dadosOriginal);

  if (temCamposLegados || faltaCamposCore) {
    return textoGerado;
  }

  // Verifica se há outras diferenças sem considerar o timestamp dinâmico de milissegundos
  const dadosGeradosSemTime = { ...dadosGerados, atualizado_em: dadosOriginal.atualizado_em };
  const textoComparativo = escreverMarkdown({ dados: dadosGeradosSemTime, corpo: docConvertido.corpo });

  return textoComparativo.trim() !== item.texto.trim() ? textoGerado : null;
}

/**
 * Analisa todo o acervo do repositório e retorna quais arquivos precisam de padronização.
 */
export function analisarAcervoParaMigracao(itens: ItemRepo[]): RelatorioAnaliseAcervo {
  const itensElegiveis = itens.filter(
    (i) =>
      !ehArquivoInternoOuSistema(i.caminho) &&
      !i.caminho.startsWith(".klaus/") &&
      !i.caminho.includes("/.klaus/") &&
      !i.caminho.startsWith("referencias/imagens/") &&
      i.caminho.endsWith(".md"),
  );

  const pendentes: ItemMigracao[] = [];

  for (const item of itensElegiveis) {
    const normalizado = normalizarDocumento(item);
    if (normalizado) {
      pendentes.push({
        caminho: item.caminho,
        sha: item.sha,
        titulo: tituloProvavel(item.doc, item.nome),
        tipo: detectarTipoDoItem(item),
        textoOriginal: item.texto,
        textoNormalizado: normalizado,
      });
    }
  }

  const integridade = verificarIntegridadeReferencias(itens);

  return {
    totalArquivos: itensElegiveis.length,
    arquivosPadronizados: itensElegiveis.length - pendentes.length,
    arquivosPendentes: pendentes.length,
    itensPendentes: pendentes,
    integridade,
  };
}

export interface ResultadoMigracaoLote {
  sucessos: number;
  falhas: string[];
}

/**
 * Executa a gravação sequencial dos arquivos normalizados no GitHub.
 */
export async function executarMigracaoEmLote(
  cfg: Settings,
  pendentes: ItemMigracao[],
  onProgresso?: (atual: number, total: number, caminho: string) => void,
): Promise<ResultadoMigracaoLote> {
  let sucessos = 0;
  const falhas: string[] = [];

  for (let i = 0; i < pendentes.length; i++) {
    const item = pendentes[i];
    if (onProgresso) {
      onProgresso(i + 1, pendentes.length, item.caminho);
    }

    try {
      const novoSha = await gravar(
        cfg,
        item.caminho,
        item.textoNormalizado,
        item.sha,
        `refatorar(core): padronizar metadados de ${item.caminho} para formato canônico snake_case`,
      );

      const docNovo = lerMarkdown(item.textoNormalizado);
      atualizarCacheLocal(item.caminho, item.textoNormalizado, docNovo, novoSha);
      sucessos++;
    } catch {
      falhas.push(item.caminho);
    }
  }

  if (sucessos > 0) {
    invalidarCache();
    dispararAtualizacaoAcervo();
    notificarOutrasAbas();
  }

  return { sucessos, falhas };
}
