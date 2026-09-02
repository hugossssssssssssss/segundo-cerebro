/**
 * Ligações entre itens — a premissa que faltava.
 *
 * Suporta formatos:
 * - `[[nome do item]]`
 * - `@nome do item`
 * - URLs completas contendo `?abrir=tarefas%2F...` ou `?abrir=notas%2F...`
 */

import { type ItemRepo, ehArquivoInternoOuSistema, atualizarCacheLocal, invalidarCache } from "./repo";
import { gravar } from "./github";
import { tituloProvavel, lerMarkdown, escreverMarkdown } from "./markdown";
import { tipoDoItem, type TipoItem } from "./busca";
import { notificarOutrasAbas } from "./syncChannel";
import { dispararAtualizacaoAcervo } from "./eventos";

/** Letras aceitas num título mencionado com `@`, incluindo as acentuadas. */
const LETRA = "a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ";

/**
 * Captura `[[alvo]]`, `[[alvo|texto]]`, `@alvo` (com título composto) e URLs
 * como `.../#/tarefas?abrir=tarefas%2F...`.
 *
 * Duas guardas no `@` que não são detalhe:
 *
 * 1. **`(?<![\w.@-])`** — o `@` não pode vir grudado em letra, número, ponto
 *    ou hífen. Sem isso, escrever um e-mail numa nota criava uma menção
 *    fantasma: `hugo@gmail.com` virava uma menção a "gmail".
 * 2. **O primeiro caractere tem que ser LETRA.** Sem isso, "3 canetas @ 5
 *    reais" virava uma menção a "5".
 */

/** O que pode fazer parte de um título mencionado. */
const MIOLO = `${LETRA}0-9_\\- \\t`;

/**
 * A menção termina no primeiro caractere que NÃO cabe num título, ou no fim
 * do texto.
 *
 * Antes esta parte era uma lista fechada de terminadores (`.`, `,`, `!`…), e
 * isso **perdia menção em silêncio**: em "De @Grade suíça para @Briefing
 * Acme.", a primeira sumia, porque entre ela e o ponto final havia um `@` —
 * que não é terminador nem cabe num título, então a expressão nunca fechava.
 * O mesmo acontecia com "@Grade suíça (importante)".
 *
 * O espaço e o tab entram no miolo (título tem mais de uma palavra), mas a
 * QUEBRA DE LINHA não: senão uma menção no fim do parágrafo engolia a linha
 * seguinte inteira.
 */
const PADRAO = new RegExp(
  "(?:" +
    // [[alvo]] e [[alvo|texto exibido]]
    "\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\]" +
    "|" +
    // @alvo — ver as guardas explicadas acima
    `(?<![\\w.@-])@([${LETRA}][${MIOLO}]{1,99}?)(?=[^${MIOLO}]|$)` +
    "|" +
    // URL colada do próprio app
    "(?:https?:\\/\\/[^\\s)]+|#\\/[^\\s)]+)\\?abrir=([a-zA-Z0-9_%.-]+)" +
    ")",
  "g",
);

export type Alvo = {
  caminho: string;
  titulo: string;
  tipo: TipoItem;
};

export type Referencia = {
  /** O que estava escrito entre os colchetes ou URL */
  bruto: string;
  /** O texto a exibir */
  exibir: string;
  /** null quando aponta para algo que ainda não existe */
  alvo: Alvo | null;
};

/** Normaliza para comparar títulos sem tropeçar em acento ou caixa. */
export function chave(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Índice título/arquivo/caminho → item, para resolver os links.
 */
export function montarIndice(itens: ItemRepo[]): Map<string, Alvo> {
  const indice = new Map<string, Alvo>();

  const ordenados = [...itens].sort((a, b) => b.nome.localeCompare(a.nome));

  for (const item of ordenados) {
    if (
      ehArquivoInternoOuSistema(item.caminho) ||
      item.caminho.startsWith(".lixeira/") ||
      item.caminho.startsWith(".klaus/") ||
      item.caminho.includes("/.klaus/") ||
      item.caminho.includes("templates/")
    ) {
      continue;
    }
    const titulo = tituloProvavel(item.doc, item.nome);
    const alvo: Alvo = {
      caminho: item.caminho,
      titulo,
      tipo: tipoDoItem(item),
    };

    const porTitulo = chave(titulo);
    if (!indice.has(porTitulo)) indice.set(porTitulo, alvo);

    const porArquivo = chave(item.nome.replace(/\.(md|json|excalidraw)$/i, ""));
    if (!indice.has(porArquivo)) indice.set(porArquivo, alvo);

    const porCaminho = chave(item.caminho);
    if (!indice.has(porCaminho)) indice.set(porCaminho, alvo);
  }

  return indice;
}

/** Extrai as referências de um texto, resolvendo cada uma contra o índice. */
export function extrairLinks(
  texto: string,
  indice: Map<string, Alvo>,
): Referencia[] {
  const saida: Referencia[] = [];
  const vistos = new Set<string>();

  // Remove trechos de código (blocos e inline) para não extrair menções de tutoriais/código
  const textoParaAnalise = texto
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]+`/g, "");

  for (const m of textoParaAnalise.matchAll(PADRAO)) {
    let bruto = "";
    let exibir = "";
    let alvo: Alvo | null = null;

    if (m[1]) {
      // Formato [[alvo]] ou [[alvo|exibir]]
      bruto = m[1].trim();
      if (!bruto) continue;
      exibir = (m[2] ?? bruto).trim();
      alvo = indice.get(chave(bruto)) ?? null;
    } else if (m[3]) {
      // Formato @alvo (pode ser título composto com várias palavras)
      let candidato = m[3].trim();
      while (candidato && !indice.has(chave(candidato))) {
        const ultEspaco = candidato.lastIndexOf(" ");
        if (ultEspaco < 0) break;
        candidato = candidato.slice(0, ultEspaco).trim();
      }

      bruto = candidato || m[3].trim();
      if (!bruto) continue;
      exibir = bruto;
      alvo = indice.get(chave(bruto)) ?? null;
    } else if (m[4]) {
      // Formato URL https://.../?abrir=tarefas%2F...
      let caminhoDec = m[4];
      try {
        caminhoDec = decodeURIComponent(m[4]);
      } catch {
        caminhoDec = m[4];
      }
      const partes = caminhoDec.split("/");
      const ultimo = partes.pop() || caminhoDec;
      alvo = indice.get(chave(caminhoDec)) ?? indice.get(chave(ultimo.replace(/\.md$/, ""))) ?? null;
      bruto = alvo ? alvo.titulo : ultimo.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
      exibir = bruto;
    }

    if (!bruto || vistos.has(bruto)) continue;
    vistos.add(bruto);

    saida.push({
      bruto,
      exibir,
      alvo,
    });
  }

  return saida;
}

export type Mencao = {
  caminho: string;
  titulo: string;
  tipo: TipoItem;
  /** Trecho em volta da menção, para dar contexto */
  trecho: string;
};

/**
 * Quem aponta para este item.
 */
export function mencoesA(
  caminhoAlvo: string,
  itens: ItemRepo[],
  indice: Map<string, Alvo>,
): Mencao[] {
  const saida: Mencao[] = [];

  for (const item of itens) {
    if (item.caminho === caminhoAlvo) continue;

    const links = extrairLinks(item.texto, indice);
    const acertou = links.find((l) => l.alvo?.caminho === caminhoAlvo);
    if (!acertou) continue;

    saida.push({
      caminho: item.caminho,
      titulo: tituloProvavel(item.doc, item.nome),
      tipo: tipoDoItem(item),
      trecho: recorteEmVolta(item.doc.corpo, acertou.bruto),
    });
  }

  return saida;
}

function recorteEmVolta(corpo: string, alvo: string): string {
  const limpo = corpo.replace(/\s+/g, " ").trim();
  let pos = limpo.indexOf(`@${alvo}`);
  let tam = alvo.length + 1;
  if (pos < 0) {
    pos = limpo.indexOf(`[[${alvo}`);
    tam = alvo.length + 4;
  }
  if (pos < 0) {
    pos = limpo.toLowerCase().indexOf(alvo.toLowerCase());
    tam = alvo.length;
  }
  if (pos < 0) return limpo.slice(0, 100);

  const inicio = Math.max(0, pos - 50);
  const fim = Math.min(limpo.length, pos + tam + 70);
  return (
    (inicio > 0 ? "…" : "") + limpo.slice(inicio, fim).trim() + (fim < limpo.length ? "…" : "")
  );
}

/**
 * O índice guarda cada item várias vezes (por título, por nome de arquivo e
 * por caminho). Esta é a lista limpa, um item por caminho — o que um menu de
 * escolha precisa mostrar.
 */
export function alvosUnicos(indice: Map<string, Alvo>): Alvo[] {
  const unicos = new Map<string, Alvo>();
  for (const a of indice.values()) unicos.set(a.caminho, a);
  return [...unicos.values()];
}

/**
 * Filtra alvos já carregados por um termo digitado.
 *
 * Separado de `sugerir` para o editor poder filtrar o que tem em memória, sem
 * remontar o índice do repositório inteiro a cada tecla.
 */
export function filtrarAlvos(
  alvos: Alvo[],
  termo: string,
  limite = 8,
): Alvo[] {
  const alvo = chave(termo.replace(/^[@[]+/, ""));
  if (!alvo) return alvos.slice(0, limite);

  return alvos
    .filter((a) => chave(a.titulo).includes(alvo))
    .sort((a, b) => {
      const ka = chave(a.titulo);
      const kb = chave(b.titulo);
      const pa = ka.startsWith(alvo) ? 0 : 1;
      const pb = kb.startsWith(alvo) ? 0 : 1;
      return pa - pb || ka.length - kb.length;
    })
    .slice(0, limite);
}

/** Sugestões para o autocompletar, a partir do índice completo. */
export function sugerir(
  indice: Map<string, Alvo>,
  termo: string,
  limite = 8,
): Alvo[] {
  return filtrarAlvos(alvosUnicos(indice), termo, limite);
}

/**
 * Extrai menções em formato de string (`@Nome`) do corpo de um texto.
 *
 * Esta função alimenta o campo `relacionamentos` do frontmatter. Ela tinha
 * uma CÓPIA da expressão de menção — a versão antiga, de lista fechada de
 * terminadores — e por isso perdia menção em silêncio: de "De @Grade suíça
 * para @Briefing Acme." sobrava só a última. Agora ela usa a MESMA `PADRAO`
 * do resto do arquivo, que já tem teste.
 */
export function extrairMencoesTexto(
  corpo: string,
  titulosConhecidos?: Iterable<string>,
): string[] {
  if (!corpo) return [];

  const conhecidos = titulosConhecidos
    ? new Set([...titulosConhecidos].map(chave))
    : null;

  const mencoes: string[] = [];
  const visto = new Set<string>();

  const adicionar = (raw: string) => {
    let limpo = raw
      .replace(/\\/g, "")
      .replace(/^[@[]+/, "")
      .replace(/\]+$/, "")
      .trim();

    if (conhecidos) {
      while (limpo && !conhecidos.has(chave(limpo))) {
        const ultimoEspaco = limpo.lastIndexOf(" ");
        if (ultimoEspaco < 0) break;
        limpo = limpo.slice(0, ultimoEspaco).trim();
      }
      if (!conhecidos.has(chave(limpo))) return;
    } else {
      // Sem lista de conhecidos, limpa palavras de ligação soltas no final (ex: "e", "para", "de novo")
      limpo = limpo.replace(/\s+(para|e|de|com|do|da|dos|das|em|na|no|nas|nos|de\s+novo)\b.*$/i, "").trim();
    }

    if (limpo.length >= 2 && !visto.has(chave(limpo))) {
      visto.add(chave(limpo));
      mencoes.push(`@${limpo}`);
    }
  };

  for (const m of corpo.matchAll(PADRAO)) {
    if (m[1]) adicionar(m[2] ?? m[1]);
    else if (m[3]) adicionar(m[3]);
  }

  for (const m of corpo.matchAll(/(?<!!)\[\\?@([^\]]+)\]\(([^)]+)\)/g)) {
    adicionar(m[1]);
  }

  return mencoes;
}

/**
 * Garante que dadosProps/frontmatter contenha a propriedade `relacionamentos`
 * sincronizada com as menções contidas no corpo do texto.
 */
export function sincronizarRelacionamentos(
  dados: Record<string, any>,
  corpo: string,
  titulosConhecidos?: Iterable<string>,
): Record<string, any> {
  const mencoesTexto = extrairMencoesTexto(corpo, titulosConhecidos);

  if (mencoesTexto.length === 0) {
    const novos = { ...dados };
    delete novos.relacionamentos;
    if (novos.esquema && typeof novos.esquema === "object") {
      const esquemaNovo = { ...novos.esquema };
      delete esquemaNovo.relacionamentos;
      novos.esquema = esquemaNovo;
    }
    return novos;
  }

  return {
    ...dados,
    relacionamentos: mencoesTexto,
    esquema: {
      ...(dados.esquema || {}),
      relacionamentos: "relation",
    },
  };
}

function escaparRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Resultado da propagação de um renomeio. */
export type ResultadoRenomeacao = {
  /** Arquivos regravados com sucesso. */
  atualizados: number;
  /** Caminhos que precisavam ser atualizados e falharam ao gravar. */
  falhas: string[];
};

async function gravarComRetry(
  cfg: any,
  caminho: string,
  conteudo: string,
  sha: string,
  mensagem: string,
  tentativas = 2,
): Promise<string> {
  let ultimoErro: any;
  for (let i = 0; i <= tentativas; i++) {
    try {
      return await gravar(cfg, caminho, conteudo, sha, mensagem);
    } catch (err: any) {
      ultimoErro = err;
      if (i < tentativas) {
        // Pausa suave exponencial para contornar oscilações ou rate limit leve
        await new Promise((r) => setTimeout(r, (i + 1) * 200));
      }
    }
  }
  throw ultimoErro;
}

/**
 * Propaga a alteração de um título para todos os arquivos que mencionavam o título antigo.
 * Atualiza @TituloAntigo -> @TituloNovo e [[TituloAntigo]] -> [[TituloNovo]] com limite de palavra.
 *
 * **Devolve as falhas em vez de engolí-las.** Esta função reescreve N arquivos do
 * repositório de uma vez; quando uma parte falha, o acervo fica num estado
 * misto — metade dos links apontando para o título novo, metade para o antigo.
 * Quem chama PRECISA conseguir contar isso para o usuário, senão ele fica com
 * links quebrados sem nunca saber que quebraram. Já foi assim: a tela dizia
 * "12 arquivos atualizados" mesmo quando os 12 falhavam.
 */
export async function propagarRenomeacao(
  cfg: any,
  todos: ItemRepo[],
  tituloAntigo: string,
  tituloNovo: string,
): Promise<ResultadoRenomeacao> {
  const vazio: ResultadoRenomeacao = { atualizados: 0, falhas: [] };
  if (!tituloAntigo || !tituloNovo || tituloAntigo.trim() === tituloNovo.trim()) return vazio;

  const antigoLimpo = tituloAntigo.trim();
  const novoLimpo = tituloNovo.trim();

  /**
   * Títulos existentes que COMEÇAM com o título antigo seguido de espaço.
   *
   * Só a fronteira de caractere não basta, e isso já custou caro: em
   * `@Reunião Semanal`, o que vem depois de "Reunião" é um espaço — que não é
   * `\w` — então o lookahead passava e a menção a "Reunião Semanal" (outro
   * item!) era reescrita como "@Sync Semanal", apontando para lugar nenhum.
   *
   * Menção é texto puro e título tem espaço, então a única forma de saber onde
   * um título termina é saber quais títulos existem — a mesma razão pela qual
   * `sincronizarRelacionamentos` exige a lista e se recusa a agir sem ela.
   */
  const titulosMaisLongos = todos
    .map((i) => tituloProvavel(i.doc, i.nome))
    .filter((t) => t && t.length > antigoLimpo.length && t.startsWith(`${antigoLimpo} `));

  /** O texto a partir de `pos` começa com um título mais específico que o antigo? */
  function ehPrefixoDeOutroTitulo(texto: string, pos: number): boolean {
    return titulosMaisLongos.some((t) => texto.startsWith(t, pos));
  }

  const regArroba = new RegExp(`@${escaparRegex(antigoLimpo)}(?![\\w\\u00C0-\\u024F])`, "g");
  const regColchetes = new RegExp(`\\[\\[${escaparRegex(antigoLimpo)}\\]\\]`, "g");

  let sucessoContagem = 0;
  const falhas: string[] = [];

  for (const item of todos) {
    if (!item.texto) continue;
    let textoNovo = item.texto;
    textoNovo = textoNovo.replace(regArroba, (casado, deslocamento: number, textoInteiro: string) =>
      // +1 pula o "@" — a comparação é contra o título, que não o inclui.
      ehPrefixoDeOutroTitulo(textoInteiro, deslocamento + 1) ? casado : `@${novoLimpo}`,
    );
    textoNovo = textoNovo.replace(regColchetes, `[[${novoLimpo}]]`);

    if (textoNovo !== item.texto) {
      try {
        const novoSha = await gravarComRetry(
          cfg,
          item.caminho,
          textoNovo,
          item.sha,
          `refatorar: renomear menção de ${antigoLimpo} para ${novoLimpo}`,
        );
        const docAtualizado = lerMarkdown(textoNovo);
        atualizarCacheLocal(item.caminho, textoNovo, docAtualizado, novoSha);
        sucessoContagem++;
      } catch {
        falhas.push(item.caminho);
      }
    }
  }

  if (sucessoContagem > 0) {
    invalidarCache();
    dispararAtualizacaoAcervo();
    notificarOutrasAbas();
  }

  return { atualizados: sucessoContagem, falhas };
}

/**
 * Propaga a alteração de um identificador estrutural (slug/id) em metas, pai_id e processo_id.
 */
export async function propagarRenomeacaoId(
  cfg: any,
  todos: ItemRepo[],
  idAntigo: string,
  idNovo: string,
): Promise<ResultadoRenomeacao> {
  const vazio: ResultadoRenomeacao = { atualizados: 0, falhas: [] };
  if (!idAntigo || !idNovo || idAntigo.trim() === idNovo.trim()) return vazio;

  const antigoLimpo = idAntigo.trim();
  const novoLimpo = idNovo.trim();

  let sucessoContagem = 0;
  const falhas: string[] = [];

  for (const item of todos) {
    if (!item.texto) continue;
    const doc = lerMarkdown(item.texto);
    const d = doc.dados;
    let mudou = false;

    // 1. Atualiza metas em entregas
    if (Array.isArray(d.metas) && d.metas.includes(antigoLimpo)) {
      d.metas = d.metas.map((m: string) => (m === antigoLimpo ? novoLimpo : m));
      mudou = true;
    }

    // 2. Atualiza pai_id em contatos
    if (d.pai_id === antigoLimpo || d.pai === antigoLimpo) {
      d.pai_id = novoLimpo;
      if (d.pai) delete d.pai;
      mudou = true;
    }

    if (mudou) {
      const textoNovo = escreverMarkdown({ dados: d, corpo: doc.corpo });
      try {
        const novoSha = await gravarComRetry(
          cfg,
          item.caminho,
          textoNovo,
          item.sha,
          `refatorar: propagar renomeação do id ${antigoLimpo} para ${novoLimpo}`,
        );
        const docAtualizado = lerMarkdown(textoNovo);
        atualizarCacheLocal(item.caminho, textoNovo, docAtualizado, novoSha);
        sucessoContagem++;
      } catch {
        falhas.push(item.caminho);
      }
    }
  }

  if (sucessoContagem > 0) {
    invalidarCache();
    dispararAtualizacaoAcervo();
    notificarOutrasAbas();
  }

  return { atualizados: sucessoContagem, falhas };
}

export interface ProblemaIntegridade {
  tipo: "mencao_quebrada" | "meta_orfa" | "pai_contato_orfao";
  origemCaminho: string;
  origemTitulo: string;
  detalhe: string;
  referencia: string;
}

export interface RelatorioIntegridade {
  totalItensAnalisados: number;
  problemas: ProblemaIntegridade[];
  totalProblemas: number;
}

/**
 * Analisa todo o acervo e identifica links quebrados ou referências a IDs inexistentes.
 */
export function verificarIntegridadeReferencias(itens: ItemRepo[]): RelatorioIntegridade {
  const indice = montarIndice(itens);
  const problemas: ProblemaIntegridade[] = [];

  const itensElegiveis = itens.filter(
    (i) =>
      !ehArquivoInternoOuSistema(i.caminho) &&
      !i.caminho.startsWith(".lixeira/") &&
      !i.caminho.startsWith(".klaus/") &&
      !i.caminho.includes("/.klaus/") &&
      !i.caminho.startsWith("referencias/imagens/") &&
      i.caminho.endsWith(".md"),
  );

  const metasIds = new Set(
    itens
      .filter((i) => i.caminho.startsWith("pdi/metas/"))
      .map((i) => (typeof i.doc.dados.id === "string" && i.doc.dados.id.trim() ? i.doc.dados.id.trim() : i.nome.replace(/\.md$/, "")))
  );

  const contatosIds = new Set(
    itens
      .filter((i) => i.caminho.startsWith("contatos/"))
      .map((i) => (typeof i.doc.dados.id === "string" && i.doc.dados.id.trim() ? i.doc.dados.id.trim() : i.nome.replace(/\.md$/, "")))
  );

  const termosReservados = new Set([
    "mencao",
    "menção",
    "mencoes",
    "menções",
    "referencia",
    "referência",
    "referencias",
    "referências",
    "nota",
    "notas",
    "tarefa",
    "tarefas",
    "meta",
    "metas",
    "pdi",
    "entrega",
    "entregas",
    "lousa",
    "lousas",
    "contato",
    "contatos",
    "lembrete",
    "lembretes",
    "hoje",
    "amanha",
    "amanhã",
    "ontem",
  ]);

  for (const item of itensElegiveis) {
    const titulo = tituloProvavel(item.doc, item.nome);

    // 1. Menções no corpo do Markdown
    const links = extrairLinks(item.texto, indice);
    for (const l of links) {
      if (!l.alvo) {
        const termoNorm = l.bruto.toLowerCase().trim();
        if (termosReservados.has(termoNorm)) {
          continue;
        }

        problemas.push({
          tipo: "mencao_quebrada",
          origemCaminho: item.caminho,
          origemTitulo: titulo,
          detalhe: `Menção a "@${l.bruto}" não foi encontrada no acervo.`,
          referencia: l.bruto,
        });
      }
    }

    // 2. Vínculos estruturais no frontmatter
    const d = item.doc.dados;

    // Metas em Entregas
    if (item.caminho.startsWith("pdi/entregas/")) {
      const metas = Array.isArray(d.metas) ? d.metas : typeof d.metas === "string" ? [d.metas] : [];
      for (const metaId of metas) {
        if (metaId && typeof metaId === "string" && !metasIds.has(metaId.trim())) {
          problemas.push({
            tipo: "meta_orfa",
            origemCaminho: item.caminho,
            origemTitulo: titulo,
            detalhe: `Meta vinculada "${metaId}" não existe em pdi/metas/.`,
            referencia: metaId,
          });
        }
      }
    }

    // Líder/Pai em Contatos
    if (item.caminho.startsWith("contatos/")) {
      const paiId = (d.pai_id || d.pai) as string | undefined;
      if (paiId && typeof paiId === "string" && !contatosIds.has(paiId.trim())) {
        problemas.push({
          tipo: "pai_contato_orfao",
          origemCaminho: item.caminho,
          origemTitulo: titulo,
          detalhe: `Contato líder/pai "${paiId}" não foi encontrado em contatos/.`,
          referencia: paiId,
        });
      }
    }
  }

  return {
    totalItensAnalisados: itensElegiveis.length,
    problemas,
    totalProblemas: problemas.length,
  };
}

