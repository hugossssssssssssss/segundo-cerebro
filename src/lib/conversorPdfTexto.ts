/**
 * Módulo de extração e reconstrução inteligente de texto, parágrafos e capítulos de PDFs.
 *
 * Resolve os problemas clássicos de conversão de PDFs para e-readers (Kindle, Kobo, etc.):
 * 1. Espaços espúrios dentro de palavras (fatiamento por kerning/ligaduras).
 * 2. Quebras de linha físicas transformadas erroneamente em novos parágrafos.
 * 3. Hifenização no final de linhas ("desenvolvi- mento" -> "desenvolvimento").
 * 4. Desordem em frases com travessões de diálogo (reordenação geométrica precisa).
 * 5. Letras capitulares (Drop Caps) isoladas ou fora de posição no início de parágrafos.
 * 6. Eliminação de cabeçalhos e números de página repetitivos (running headers & footers).
 * 7. Agrupamento contínuo em capítulos reais (eliminando telas em branco e títulos forçados).
 */

export interface ItemTextoPdf {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

export interface LinhaFisica {
  y: number;
  topY: number;
  x: number;
  fontSize: number;
  largura: number;
  texto: string;
}

export interface PaginaProcessadaPdf {
  numPagina: number;
  paragrafos: string[];
  imagens: { id: string; legenda?: string; posicao?: "inicio" | "fim" }[];
}

export interface CapituloMontado {
  titulo: string;
  paragrafos: string[];
  imagens: { id: string; legenda?: string; posicao?: "inicio" | "fim" }[];
  ocultarTitulo?: boolean;
}

/**
 * Normaliza caracteres de travessão e traço para o padrão editorial
 */
const TRAVESSAO_REGEX = /^[\u2014\u2013\u2015\-]\s*/;
const TRAVESSAO_CHAR = "—";

/**
 * Calcula o topo vertical (yTop) de leitura de um item no PDF.
 * Como o PDF usa a linha de base (baseline) para o Y, uma letra capitular grande
 * tem a linha de base rebaixada, mas o topo dela coincide com a 1ª linha do parágrafo.
 */
export function getTopY(item: ItemTextoPdf): number {
  const y = item.transform[5];
  const fontSize = Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || item.height || 12;
  return y + fontSize * 0.85;
}

/**
 * Ordena os itens do PDF na ordem visual correta de leitura pelo topo visual e coordenada X.
 */
export function ordenarItensVisualmente(items: ItemTextoPdf[]): ItemTextoPdf[] {
  return [...items].sort((a, b) => {
    const topA = getTopY(a);
    const topB = getTopY(b);
    const xA = a.transform[4];
    const xB = b.transform[4];

    // Se estiverem em alturas de linha distintas (diferença maior que ~5.5 pontos)
    if (Math.abs(topA - topB) > 5.5) {
      return topB - topA; // Topo mais alto na página vem primeiro
    }
    // Na mesma linha visual de topo, o menor X (mais à esquerda) vem primeiro
    return xA - xB;
  });
}

/**
 * Identifica se uma linha é cabeçalho ou rodapé repetitivo de página (número de página isolado, etc.)
 */
function ehCabecalhoOuRodapeDescartavel(linha: LinhaFisica, yMin: number, yMax: number): boolean {
  const textoLimpo = linha.texto.trim();
  const alturaTotal = Math.max(100, yMax - yMin);
  const estaNoTopo = linha.y > yMax - alturaTotal * 0.08;
  const estaNaBase = linha.y < yMin + alturaTotal * 0.07;

  if (!estaNoTopo && !estaNaBase) return false;

  // Apenas número de página (ex: "42", "— 42 —", "pág. 42", "Página 42", "- 42 -")
  if (/^(?:p[aá]g\.?|p[aá]gina)?\s*[\-–—]?\s*\d{1,4}\s*[\-–—]?$/i.test(textoLimpo)) {
    return true;
  }

  return false;
}

/**
 * Reúne itens brutos do PDF em linhas horizontais ordenadas e reconcilia travessões e capitulares
 */
export function agruparEmLinhasFisicas(items: ItemTextoPdf[]): LinhaFisica[] {
  if (!items || items.length === 0) return [];

  // 1. Pré-ordena itens geometricamente pelo topo visual
  const itensOrdenados = ordenarItensVisualmente(items);

  let yMin = Infinity;
  let yMax = -Infinity;
  for (const it of itensOrdenados) {
    const y = it.transform[5];
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }

  // 2. Agrupa em linhas horizontais com tolerância adaptativa baseada no topo visual
  const linhas: LinhaFisica[] = [];
  let linhaAtual: {
    y: number;
    topY: number;
    x: number;
    fontSize: number;
    ultimoXFim: number;
    fragmentos: { x: number; str: string; largura: number; fontSize: number }[];
  } | null = null;

  for (const item of itensOrdenados) {
    const str = item.str;
    if (!str && !item.hasEOL) continue;

    const x = item.transform[4];
    const y = item.transform[5];
    const topY = getTopY(item);
    const fontSize = Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || 12;
    const largura = item.width || 0;

    const tolTop = Math.max(5.0, fontSize * 0.4);

    if (!linhaAtual || Math.abs(topY - linhaAtual.topY) > tolTop) {
      if (linhaAtual && linhaAtual.fragmentos.length > 0) {
        linhas.push(montarLinhaDeFragmentos(linhaAtual));
      }
      linhaAtual = {
        y,
        topY,
        x,
        fontSize,
        ultimoXFim: x + largura,
        fragmentos: [{ x, str, largura, fontSize }],
      };
    } else {
      linhaAtual.fragmentos.push({ x, str, largura, fontSize });
      linhaAtual.fontSize = Math.max(linhaAtual.fontSize, fontSize);
      linhaAtual.ultimoXFim = Math.max(linhaAtual.ultimoXFim, x + largura);
    }
  }

  if (linhaAtual && linhaAtual.fragmentos.length > 0) {
    linhas.push(montarLinhaDeFragmentos(linhaAtual));
  }

  // 3. Filtra cabeçalhos e números de página descartáveis
  return linhas.filter((l) => !ehCabecalhoOuRodapeDescartavel(l, yMin, yMax));
}

/**
 * Junta os fragmentos de uma mesma linha física garantindo ordenação por X e espaçamento
 */
function montarLinhaDeFragmentos(linhaInfo: {
  y: number;
  topY: number;
  x: number;
  fontSize: number;
  fragmentos: { x: number; str: string; largura: number; fontSize: number }[];
}): LinhaFisica {
  const frags = [...linhaInfo.fragmentos].sort((a, b) => a.x - b.x);

  let textoMontado = "";
  let ultimoXFim = frags[0].x;
  const xInicial = frags[0].x;

  for (let i = 0; i < frags.length; i++) {
    const f = frags[i];
    const str = f.str;
    if (!str) continue;

    if (textoMontado.length === 0) {
      textoMontado = str;
      ultimoXFim = f.x + f.largura;
      continue;
    }

    const gapX = f.x - ultimoXFim;
    const ehPontuacaoSemEspacoAntes = /^[,.;:?!)\],]/.test(str);
    const ehTravessao = /^[\u2014\u2013\u2015\-]/.test(str);
    const terminaComTravessao = /[\u2014\u2013\u2015\-]$/.test(textoMontado);

    const primeiroFrag = frags[0];
    const ehCapitularComFonteMaior =
      i === 1 &&
      /^[A-ZÀ-Ú«"'\u201C\u2018]?[A-ZÀ-Ú]$/.test(primeiroFrag.str.trim()) &&
      primeiroFrag.fontSize >= f.fontSize * 1.25;
    const atualComecaComMinuscula = /^[a-zà-ú]/.test(str);

    let precisaEspaco = false;
    if (ehCapitularComFonteMaior && atualComecaComMinuscula) {
      precisaEspaco = false;
    } else if (ehTravessao) {
      precisaEspaco = !textoMontado.endsWith(" ");
    } else if (terminaComTravessao) {
      precisaEspaco = !str.startsWith(" ");
    } else if (ehPontuacaoSemEspacoAntes) {
      precisaEspaco = false;
    } else if (gapX > 1.8 && !textoMontado.endsWith(" ") && !str.startsWith(" ")) {
      precisaEspaco = true;
    }

    if (precisaEspaco) {
      textoMontado += " " + str;
    } else {
      textoMontado += str;
    }

    ultimoXFim = Math.max(ultimoXFim, f.x + f.largura);
  }

  // Normalização refinada de travessões no início e meio da linha
  textoMontado = normalizarEspacamentoTravessoes(textoMontado.trim());

  return {
    y: linhaInfo.y,
    topY: linhaInfo.topY,
    x: xInicial,
    fontSize: linhaInfo.fontSize,
    largura: ultimoXFim - xInicial,
    texto: textoMontado,
  };
}

/**
 * Garante que travessões de diálogo e de incisos fiquem perfeitamente formatados
 */
export function normalizarEspacamentoTravessoes(texto: string): string {
  if (!texto) return "";

  if (TRAVESSAO_REGEX.test(texto)) {
    const resto = texto.replace(TRAVESSAO_REGEX, "").trim();
    texto = `${TRAVESSAO_CHAR} ${resto}`;
  }

  texto = texto.replace(/([a-zA-Z0-9à-úÀ-Ú.,!?])\s*[\u2014\u2013\u2015]\s*([a-zA-Z0-9à-úÀ-Ú])/g, "$1 — $2");

  return texto;
}

/**
 * Reconcilia Letras Capitulares (Drop Caps) no início de parágrafos/páginas.
 * Unifica capitulares isoladas com a linha seguinte.
 */
export function reconciliarCapitulares(linhas: LinhaFisica[]): LinhaFisica[] {
  if (linhas.length <= 1) return linhas;

  const resultado: LinhaFisica[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const atual = linhas[i];
    const proxima = linhas[i + 1];

    if (!proxima) {
      resultado.push(atual);
      break;
    }

    const textoAtual = atual.texto.trim();
    // É uma capitular se tem estritamente 1 caractere alfabético (podendo ter aspas antes) e fonte destacada
    const ehCapitular =
      /^[«"'\u201C\u2018]?[A-ZÀ-Ú]$/.test(textoAtual) &&
      (atual.fontSize >= 18 || atual.fontSize >= proxima.fontSize * 1.3);

    if (ehCapitular) {
      const textoProxima = proxima.texto.trim();
      // Se a próxima linha começa com letra minúscula (continuação do parágrafo)
      if (/^[a-zà-ú]/.test(textoProxima)) {
        const letraBase = textoAtual.replace(/^[«"'\u201C\u2018]/, "");
        const primeiraPalavra = textoProxima.split(/\s+/)[0].replace(/[.,;:?!—]$/, "").toLowerCase();

        // Se for uma das poucas letras que existem como palavras isoladas em português (A, O, E, É)
        let precisaEspaco = false;
        if (/^[AOEÉ]$/i.test(letraBase)) {
          // Se o início for um sufixo truncado típico (ex: "ra" de "Era", "utro" de "Outro", "ntão" de "Então")
          const ehSufixoTruncado =
            /^(?:ra|utr[oa]s?|ss[ea]s?|st[ea]s?|nt[aã]o|quel[ea]s?|mbaixo|nquanto|ntre|xatamente|les|las|inda|avia)\b/i.test(
              primeiraPalavra
            );
          precisaEspaco = !ehSufixoTruncado;
        } else {
          // Letras que nunca são palavras sozinhas (B, C, D, H, N, Q, S, T, etc.) sempre juntam sem espaço
          precisaEspaco = false;
        }

        resultado.push({
          y: atual.y,
          topY: atual.topY,
          x: atual.x,
          fontSize: proxima.fontSize,
          largura: atual.largura + proxima.largura,
          texto: precisaEspaco ? `${textoAtual} ${textoProxima}` : `${textoAtual}${textoProxima}`,
        });
        i++; // Pula a próxima linha pois foi incorporada
        continue;
      }

      // Se a próxima linha começa com letra maiúscula (a capitular é palavra isolada, ex: "E" + "A noite...")
      if (/^[A-ZÀ-Ú]/.test(textoProxima)) {
        resultado.push({
          y: atual.y,
          topY: atual.topY,
          x: atual.x,
          fontSize: proxima.fontSize,
          largura: atual.largura + proxima.largura,
          texto: `${textoAtual} ${textoProxima}`,
        });
        i++; // Pula a próxima linha
        continue;
      }
    }

    resultado.push(atual);
  }

  return resultado;
}

/**
 * Dicionário contextual de inícios de parágrafos clássicos da língua portuguesa
 * para recuperação se uma letra capitular não foi emitida como texto pelo PDF.
 */
const RECUPERACAO_INICIO_PARAGRAFO: [RegExp, string][] = [
  [/^ra uma vez\b/i, "Era uma vez"],
  [/^uando\b/i, "Quando"],
  [/^aquele\b/i, "Naquele"],
  [/^aquela\b/i, "Naquela"],
  [/^m dia\b/i, "Um dia"],
  [/^epois\b/i, "Depois"],
  [/^avia\b/i, "Havia"],
  [/^omo\b/i, "Como"],
  [/^ntão\b/i, "Então"],
  [/^inda\b/i, "Ainda"],
  [/^odos\b/i, "Todos"],
  [/^odas\b/i, "Todas"],
  [/^ada\b/i, "Nada"],
  [/^les\b/i, "Eles"],
  [/^las\b/i, "Elas"],
  [/^sse\b/i, "Esse"],
  [/^ssa\b/i, "Essa"],
  [/^ste\b/i, "Este"],
  [/^sta\b/i, "Esta"],
  [/^rimeiro\b/i, "Primeiro"],
  [/^inalmente\b/i, "Finalmente"],
];

/**
 * Restaura a primeira letra caso um parágrafo tenha iniciado com letra minúscula órfã
 */
export function restaurarPrimeiraLetraSeTruncada(paragrafo: string): string {
  let p = paragrafo.trim();
  if (!p) return "";

  // Se o parágrafo começa com letra minúscula (o que nunca ocorre em livros de verdade)
  if (/^[a-zà-ú]/.test(p)) {
    for (const [regex, substituicao] of RECUPERACAO_INICIO_PARAGRAFO) {
      if (regex.test(p)) {
        return p.replace(regex, substituicao);
      }
    }
    // Caso geral: capitaliza a primeira letra que estava truncada
    return p.charAt(0).toUpperCase() + p.slice(1);
  }

  return p;
}

/**
 * Lista de números por extenso em português para identificar títulos explícitos como "Capítulo Um"
 */
const NUMEROS_EXTENSO =
  "um|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|primeiro|segundo|terceiro|quarto|quinto|sexto|s[eé]timo|oitavo|nono|d[eé]cimo|one|two|three|four|five";

/**
 * Reconcilia travessões órfãos e falas com quebra acidental em linhas físicas separadas
 */
export function reconciliarTravessoesELinhas(linhas: LinhaFisica[]): LinhaFisica[] {
  if (linhas.length <= 1) return linhas;

  const resultado: LinhaFisica[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const atual = linhas[i];
    const proxima = linhas[i + 1];

    if (!proxima) {
      resultado.push(atual);
      break;
    }

    const textoAtual = atual.texto.trim();

    // Se a linha atual tiver apenas um caractere de travessão ou traço isolado
    if (/^[\u2014\u2013\u2015\-]$/.test(textoAtual)) {
      const textoProxLimpo = proxima.texto.replace(/^[\u2014\u2013\u2015\-]\s*/, "");
      resultado.push({
        y: proxima.y,
        topY: atual.topY,
        x: atual.x,
        fontSize: proxima.fontSize,
        largura: atual.largura + proxima.largura,
        texto: `${TRAVESSAO_CHAR} ${textoProxLimpo}`,
      });
      i++; // Incorporou a próxima linha
      continue;
    }

    resultado.push(atual);
  }

  return resultado;
}

/**
 * Verifica se um texto representa o título de um novo capítulo ou seção estrutural do livro.
 *
 * Previne rigorosamente:
 * 1. Falsos positivos com falas/diálogos que contenham números ("— Sete.", "— Oito.") ou palavras isoladas.
 * 2. Falsos positivos com a palavra "Conclusão" no início ou meio de frases de texto corrido.
 * 3. Criação de capítulos espúrios que cortam a página ao meio gerando páginas em branco e títulos H1 forçados.
 */
export function detectarTituloCapitulo(
  texto: string,
  fontSizeLinha?: number,
  fontSizeMedio: number = 12
): { ehTitulo: boolean; tituloNormalizado?: string } {
  const limpo = texto.trim();
  if (!limpo || limpo.length > 70) return { ehTitulo: false };

  // 1. Falas com travessão ou aspas de diálogo NUNCA são títulos de capítulo
  if (TRAVESSAO_REGEX.test(limpo) || /^["'«\u201C\u2018]/.test(limpo)) {
    return { ehTitulo: false };
  }

  // 2. Linhas que começam com letra minúscula NUNCA são títulos de capítulo
  if (/^[a-zà-ú]/.test(limpo)) {
    return { ehTitulo: false };
  }

  // 3. Linhas que terminam com pontuação de frase contínua ou diálogo NUNCA são títulos
  if (/[,;:—]$/.test(limpo) || /\.{3,}$/.test(limpo) || /…$/.test(limpo)) {
    return { ehTitulo: false };
  }

  // 4. Linhas contendo ponto final intermediário seguido de espaço e maiúscula ("frase. Outra frase") são texto corrido
  if (/\.\s+[A-ZÀ-Ú]/.test(limpo)) {
    return { ehTitulo: false };
  }

  // 5. Verbos de diálogo e narração no meio da frase indicam texto corrido/diálogo
  if (/\b(?:disse|falou|perguntou|respondeu|exclamou|gritou|murmurou|pensou|afirmou)\b/i.test(limpo)) {
    return { ehTitulo: false };
  }

  // 6. Capítulos explícitos ("Capítulo", "Capitulo", "Chapter")
  // Ex: "Capítulo 1", "Capítulo I", "Capítulo Um", "Capítulo 1: O Início", "Chapter 5 - The Journey"
  const regexCapitulo = new RegExp(
    `^(?:cap[ií]tulo|chapter)(?:\\s+(?:[0-9ivxlcdm]+|${NUMEROS_EXTENSO}))?(?:\\s*[:\\-–—]\\s*.{1,45})?$`,
    "i"
  );
  if (regexCapitulo.test(limpo)) {
    // Se for apenas "Capítulo." com ponto no final sem número nem subtítulo, é fim de oração de texto corrido
    if (/^cap[ií]tulo\.$/i.test(limpo)) {
      return { ehTitulo: false };
    }
    return {
      ehTitulo: true,
      tituloNormalizado: formatarTituloBonito(limpo),
    };
  }

  // 7. Divisões por "Livro" ou "Parte" DEVEM OBRIGATORIAMENTE vir acompanhadas de número ou numeral
  // Ex: "Livro 1", "Livro I", "Livro Um", "Parte 2", "Parte Dois".
  // NUNCA aceita frases como "livro. O que você escreveu..." ou "parte de algo"
  const regexLivroParte = new RegExp(
    `^(?:livro|parte)\\s+(?:[0-9ivxlcdm]+|${NUMEROS_EXTENSO})(?:\\s*[:\\-–—]\\s*.{1,45})?$`,
    "i"
  );
  if (regexLivroParte.test(limpo)) {
    return {
      ehTitulo: true,
      tituloNormalizado: formatarTituloBonito(limpo),
    };
  }

  // 5. Seções clássicas de livros ("Prólogo", "Epílogo", "Introdução", "Prefácio", "Posfácio", "Conclusão", etc.)
  // IMPORTANTE: DEVE ser estritamente o título da seção isolado ou com subtítulo curto delimitado.
  // NUNCA aceita orações de texto corrido como "Conclusão da pesquisa...", "Conclusão que chegamos...", "Notas sobre..."
  const regexSecoes =
    /^(?:pr[oó]logo|ep[ií]logo|introdu[çc][aã]o|pref[aá]cio|posf[aá]cio|conclus[aã]o|agradecimentos|sum[aá]rio|[ií]ndice)(?:\s*[:\-–—]\s*[\w\sÀ-ú]{1,30})?\.?$/i;

  if (regexSecoes.test(limpo)) {
    // Se estiver em fonte normal do corpo do texto (sem destaque tipográfico):
    if (fontSizeLinha && fontSizeLinha <= fontSizeMedio * 1.05) {
      // Para ser considerado título em fonte normal, precisa ser estritamente a palavra isolada
      // e estar em caixa alta ou capitalizada, nunca oração em minúsculas
      const apenasPalavraIsolada =
        /^(?:pr[oó]logo|ep[ií]logo|introdu[çc][aã]o|pref[aá]cio|posf[aá]cio|conclus[aã]o|agradecimentos|sum[aá]rio|[ií]ndice)\.?$/i.test(
          limpo
        );
      const estaCapitalizadaOuAlta =
        limpo === limpo.toUpperCase() || /^[A-ZÀ-Ú][a-zà-ú]+/.test(limpo);
      if (apenasPalavraIsolada && estaCapitalizadaOuAlta) {
        return {
          ehTitulo: true,
          tituloNormalizado: formatarTituloBonito(limpo.replace(/\.$/, "")),
        };
      }
      return { ehTitulo: false };
    }

    return {
      ehTitulo: true,
      tituloNormalizado: formatarTituloBonito(limpo.replace(/\.$/, "")),
    };
  }

  // 6. Numerais romanos isolados em maiúsculas (I, II, III, IV, etc.)
  if (/^[IVXLCDM]{1,6}\.?$/.test(limpo)) {
    // Se estiver em fonte normal do texto, só é capítulo se tiver evidência de destaque
    if (fontSizeLinha && fontSizeLinha < fontSizeMedio * 1.1) {
      return { ehTitulo: false };
    }
    return {
      ehTitulo: true,
      tituloNormalizado: `Capítulo ${limpo.replace(/\./g, "").toUpperCase()}`,
    };
  }

  // 7. Números por extenso isolados ("Um", "Dois", "Primeiro", etc.)
  const regexExtensoIsolado = new RegExp(`^(?:${NUMEROS_EXTENSO})\\.?$`, "i");
  if (regexExtensoIsolado.test(limpo)) {
    // NUNCA considera capítulo se for todo em minúsculas (ex: "oito", "sete", "um")
    if (limpo === limpo.toLowerCase()) {
      return { ehTitulo: false };
    }

    // Se temos informação de fonte: SÓ é capítulo se tiver destaque tipográfico evidente (fonte maior)
    if (fontSizeLinha) {
      if (fontSizeLinha >= fontSizeMedio * 1.18) {
        return {
          ehTitulo: true,
          tituloNormalizado: `Capítulo ${limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase().replace(/\.$/, "")}`,
        };
      }
      return { ehTitulo: false };
    }

    // Se não temos fontSizeLinha (fallback): apenas números ordinais/cardinais muito específicos e curtos (ex: "Um", "Primeiro")
    // E NUNCA palavras comuns do meio do texto como "oito", "sete", "cinco"
    if (/^(?:Um|Dois|Três|Primeiro|Segundo)\.?$/.test(limpo)) {
      return {
        ehTitulo: true,
        tituloNormalizado: `Capítulo ${limpo.replace(/\.$/, "")}`,
      };
    }

    return { ehTitulo: false };
  }

  // 8. Linha curta em destaque tipográfico significativo (fonte maior e sem pontuação corrida de parágrafo)
  if (fontSizeLinha && fontSizeLinha >= fontSizeMedio * 1.25) {
    const naoEhFraseCorrida = !/[.,;:?!—]$/.test(limpo);
    const temTamanhoTitulo = limpo.length >= 2 && limpo.length <= 45;

    if (naoEhFraseCorrida && temTamanhoTitulo) {
      return {
        ehTitulo: true,
        tituloNormalizado: formatarTituloBonito(limpo),
      };
    }
  }

  return { ehTitulo: false };
}

function formatarTituloBonito(titulo: string): string {
  const t = titulo.trim();
  // Se for todo em maiúsculas, capitaliza para formato editorial agradável
  if (t === t.toUpperCase() && t.length > 3) {
    return t
      .toLowerCase()
      .split(" ")
      .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
      .join(" ");
  }
  return t;
}

/**
 * Reconstrói texto, diálogos, estrofes e parágrafos a partir dos itens brutos da página do PDF.
 * Respeita o leading real do livro e preserva a continuidade de diálogos com travessão e estrofes.
 */
export function reconstruirTextoEParagrafosPdf(items: ItemTextoPdf[]): string[] {
  if (!items || items.length === 0) return [];

  // 1. Agrupa fragmentos nas linhas físicas ordenadas pelo topo visual
  let linhas = agruparEmLinhasFisicas(items);
  if (linhas.length === 0) return [];

  // 2. Reconcilia Letras Capitulares (Drop Caps)
  linhas = reconciliarCapitulares(linhas);

  // 3. Reconcilia travessões órfãos e falas quebradas
  linhas = reconciliarTravessoesELinhas(linhas);

  // Calcula fontSize médio do corpo do texto
  const fontesValidas = linhas.map((l) => l.fontSize).filter((f) => f > 0);
  const fontSizeMedio =
    fontesValidas.length > 0
      ? fontesValidas.reduce((a, b) => a + b, 0) / fontesValidas.length
      : 12;

  // Calcula o leading médio (entrelinha real do documento) filtrando saltos anômalos
  const distanciasVerticais: number[] = [];
  for (let i = 0; i < linhas.length - 1; i++) {
    const dist = linhas[i].y - linhas[i + 1].y;
    if (dist >= fontSizeMedio * 0.8 && dist <= fontSizeMedio * 1.7) {
      distanciasVerticais.push(dist);
    }
  }
  distanciasVerticais.sort((a, b) => a - b);
  const leadingMedio =
    distanciasVerticais.length > 0
      ? distanciasVerticais[Math.floor(distanciasVerticais.length / 2)]
      : fontSizeMedio * 1.35;

  // Largura máxima de linha encontrada na página para detecção de estrofes/versos
  const larguras = linhas.map((l) => l.largura).filter((w) => w > 0);
  const larguraMax = larguras.length > 0 ? Math.max(...larguras) : 400;

  // 4. Agrupa linhas em parágrafos contínuos, diálogos e estrofes
  const paragrafos: string[] = [];
  let paragrafoAtual = "";
  let emEstrofe = false;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const proximaLinha = linhas[i + 1];

    const ehTituloAtual = detectarTituloCapitulo(linha.texto, linha.fontSize, fontSizeMedio).ehTitulo;

    // Se a linha atual for um título de capítulo (ex: "CAPÍTULO UM" ou "CAPÍTULO"):
    if (ehTituloAtual) {
      // Encerra qualquer parágrafo anterior
      if (paragrafoAtual.trim()) {
        paragrafos.push(restaurarPrimeiraLetraSeTruncada(paragrafoAtual));
        paragrafoAtual = "";
        emEstrofe = false;
      }

      // Se a próxima linha for o número ou complemento do título (ex: Linha 1 = "Capítulo", Linha 2 = "Um"):
      if (proximaLinha && proximaLinha.texto.trim().length > 1) {
        const textoProxTrim = proximaLinha.texto.trim();
        const detProx = detectarTituloCapitulo(textoProxTrim, proximaLinha.fontSize, fontSizeMedio);
        const ehNumeroExtensoOuRomano = new RegExp(`^(?:${NUMEROS_EXTENSO}|\\d{1,3}|[IVXLCDM]+)$`, "i").test(textoProxTrim);
        const ehSubtituloValido =
          proximaLinha.fontSize >= fontSizeMedio * 1.15 &&
          !/[.,;:?!—]$/.test(textoProxTrim) &&
          !TRAVESSAO_REGEX.test(textoProxTrim) &&
          textoProxTrim.length <= 45;

        const ehComplementoTitulo =
          ehNumeroExtensoOuRomano ||
          (detProx.ehTitulo && !TRAVESSAO_REGEX.test(textoProxTrim)) ||
          ehSubtituloValido;

        if (ehComplementoTitulo) {
          paragrafos.push(`${linha.texto.trim()} ${textoProxTrim}`);
          i++; // Avança a linha incorporada
          continue;
        }
      }

      paragrafos.push(linha.texto.trim());
      continue;
    }

    // Detecção de verso / estrofe: linhas curtas consecutivas com entrelinha normal
    const ehLinhaCurta =
      linha.texto.trim().length < 52 &&
      !linha.texto.endsWith("-") &&
      (larguraMax < 250 || linha.largura < larguraMax * 0.75);

    const proximaLinhaEhCurta =
      proximaLinha &&
      proximaLinha.texto.trim().length < 52 &&
      (larguraMax < 250 || proximaLinha.largura < larguraMax * 0.75);

    if (!paragrafoAtual) {
      paragrafoAtual = linha.texto;
      emEstrofe = ehLinhaCurta && Boolean(proximaLinhaEhCurta);
    } else {
      if (emEstrofe) {
        // Na estrofe, cada verso é preservado em sua linha com quebra \n
        paragrafoAtual += "\n" + linha.texto;
      } else {
        // Trata hifenização no final da linha (ex: "desenvolvi-", "cons-")
        if (paragrafoAtual.endsWith("-") && !paragrafoAtual.endsWith(" -")) {
          paragrafoAtual = paragrafoAtual.slice(0, -1) + linha.texto;
        } else {
          paragrafoAtual += " " + linha.texto;
        }
      }
    }

    if (!proximaLinha) {
      if (paragrafoAtual.trim()) {
        paragrafos.push(restaurarPrimeiraLetraSeTruncada(paragrafoAtual));
      }
      break;
    }

    const gapVertical = Math.abs(linha.y - proximaLinha.y);

    // Salto vertical significativo: precisa superar a entrelinha padrão ou a altura da linha de corte
    const saltoVerticalGrande =
      gapVertical >= Math.min(leadingMedio * 1.48, Math.max(16, fontSizeMedio * 1.75));

    const proximaComecaComTravessao = TRAVESSAO_REGEX.test(proximaLinha.texto.trim());
    const atualTerminaComInciso = /[\u2014\u2013\u2015,\-]$/.test(linha.texto.trim());
    const terminaComPontuacaoConclusiva = /[.!?:"»]$/.test(linha.texto.trim());
    const recuoProximaLinha = proximaLinha.x > linha.x + 12;

    // Se estamos em diálogo e a próxima linha continua o inciso do narrador ou da mesma fala
    const ehContinuacaoDeInciso = atualTerminaComInciso && proximaComecaComTravessao && !saltoVerticalGrande;

    // Novo diálogo: próxima linha começa com travessão e a linha atual concluiu fala/oração
    const ehNovoDialogo =
      proximaComecaComTravessao && !ehContinuacaoDeInciso && (terminaComPontuacaoConclusiva || saltoVerticalGrande);

    // Se a próxima linha for um título de capítulo
    const proximaEhTitulo =
      detectarTituloCapitulo(proximaLinha.texto, proximaLinha.fontSize, fontSizeMedio).ehTitulo ||
      proximaLinha.fontSize > linha.fontSize * 1.25;

    // Quebra de parágrafo normal em prosa: salto vertical ou pontuação conclusiva com recuo
    const quebraParagrafoNormal =
      !emEstrofe && (saltoVerticalGrande || (terminaComPontuacaoConclusiva && recuoProximaLinha));

    // Quebra de estrofe: salto vertical entre estrofes ou volta para prosa longa
    const quebraEstrofe = emEstrofe && (saltoVerticalGrande || !proximaLinhaEhCurta);

    if (ehNovoDialogo || proximaEhTitulo || quebraParagrafoNormal || quebraEstrofe) {
      if (paragrafoAtual.trim()) {
        paragrafos.push(restaurarPrimeiraLetraSeTruncada(paragrafoAtual));
      }
      paragrafoAtual = "";
      emEstrofe = false;
    }
  }

  return paragrafos;
}

/**
 * Converte um objeto de imagem extraído do PDF.js em um Blob de imagem (JPEG ou PNG)
 */
export async function extrairBlobDeObjetoPdf(imgObj: any): Promise<Blob | null> {
  if (!imgObj || typeof document === "undefined") return null;

  try {
    if (
      (typeof ImageBitmap !== "undefined" && imgObj instanceof ImageBitmap) ||
      (typeof HTMLCanvasElement !== "undefined" && imgObj instanceof HTMLCanvasElement) ||
      (typeof HTMLImageElement !== "undefined" && imgObj instanceof HTMLImageElement)
    ) {
      const canvas = document.createElement("canvas");
      canvas.width = imgObj.width;
      canvas.height = imgObj.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(imgObj, 0, 0);
      return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    }

    if (imgObj.data && imgObj.width > 0 && imgObj.height > 0) {
      if (imgObj.width < 12 && imgObj.height < 12) return null;

      const canvas = document.createElement("canvas");
      canvas.width = imgObj.width;
      canvas.height = imgObj.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const clamped =
        imgObj.data instanceof Uint8ClampedArray
          ? imgObj.data
          : new Uint8ClampedArray(imgObj.data);

      let imgData: ImageData;
      if (imgObj.kind === 1) {
        const rgba = new Uint8ClampedArray(imgObj.width * imgObj.height * 4);
        for (let i = 0, j = 0; i < clamped.length; i++, j += 4) {
          rgba[j] = clamped[i];
          rgba[j + 1] = clamped[i];
          rgba[j + 2] = clamped[i];
          rgba[j + 3] = 255;
        }
        imgData = new ImageData(rgba, imgObj.width, imgObj.height);
      } else if (imgObj.kind === 2) {
        const rgba = new Uint8ClampedArray(imgObj.width * imgObj.height * 4);
        for (let i = 0, j = 0; i < clamped.length; i += 3, j += 4) {
          rgba[j] = clamped[i];
          rgba[j + 1] = clamped[i + 1];
          rgba[j + 2] = clamped[i + 2];
          rgba[j + 3] = 255;
        }
        imgData = new ImageData(rgba, imgObj.width, imgObj.height);
      } else {
        imgData = new ImageData(clamped, imgObj.width, imgObj.height);
      }

      ctx.putImageData(imgData, 0, 0);
      return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    }
  } catch (err) {
    console.warn("[Conversor] Erro ao extrair blob de imagem do PDF:", err);
  }

  return null;
}

export interface OpcoesAgrupamentoCapitulos {
  modo?: "capitulos" | "continuo";
}

/**
 * Agrupa as páginas contínuas do PDF em capítulos reais do livro.
 * Elimina quebras forçadas no meio da leitura e NUNCA divide arbitrariamente em "Parte 1", "Parte 2".
 */
export function agruparPaginasEmCapitulos(
  paginas: PaginaProcessadaPdf[],
  opcoes?: OpcoesAgrupamentoCapitulos
): CapituloMontado[] {
  if (!paginas || paginas.length === 0) return [];

  // Se o modo for estritamente contínuo, mantém como fluxo único de leitura sem quebras artificiais
  if (opcoes?.modo === "continuo") {
    const todosParagrafos = paginas.flatMap((p) => p.paragrafos);
    const todasImagens = paginas.flatMap((p) => p.imagens);

    return [
      {
        titulo: "Leitura",
        paragrafos: todosParagrafos,
        imagens: todasImagens,
        ocultarTitulo: true,
      },
    ];
  }

  const capitulos: CapituloMontado[] = [];
  let capituloAtual: CapituloMontado = {
    titulo: "Início",
    paragrafos: [],
    imagens: [],
    ocultarTitulo: true,
  };
  let detectouAlgumCapitulo = false;

  for (const pag of paginas) {
    if (pag.imagens && pag.imagens.length > 0) {
      capituloAtual.imagens.push(...pag.imagens);
    }

    for (const paragrafo of pag.paragrafos) {
      const pLimpo = paragrafo.trim();

      // Blindagem estrita contra falsos capítulos durante o agrupamento:
      // 1. Falas com travessão de diálogo NUNCA são capítulos
      // 2. Parágrafos com quebras de linha (estrofes/versos) NUNCA são capítulos
      // 3. Parágrafos longos (> 55 caracteres) ou com pontuação contínua NUNCA são capítulos
      // 4. Frases como "Conclusão da história..." NUNCA são capítulos
      const ehDialogoOuTextoLongo =
        TRAVESSAO_REGEX.test(pLimpo) ||
        pLimpo.length > 55 ||
        pLimpo.includes("\n") ||
        /[,;:—]$/.test(pLimpo) ||
        /\.{3,}$/.test(pLimpo) ||
        /…$/.test(pLimpo);

      let det: { ehTitulo: boolean; tituloNormalizado?: string } = { ehTitulo: false };
      if (!ehDialogoOuTextoLongo) {
        det = detectarTituloCapitulo(pLimpo);

        // Se for apenas uma palavra de número por extenso ("Oito", "Sete", etc.) sem a palavra "Capítulo":
        // No agrupamento de páginas em texto puro, NUNCA promove palavra avulsa a capítulo!
        if (
          det.ehTitulo &&
          new RegExp(`^(?:${NUMEROS_EXTENSO})\\.?$`, "i").test(pLimpo) &&
          !/cap[ií]tulo/i.test(pLimpo)
        ) {
          // Apenas aceita "Um", "Primeiro" se for no início do livro (primeiro capítulo detectado)
          if (!detectouAlgumCapitulo && /^(?:Um|Primeiro)\.?$/i.test(pLimpo)) {
            det.ehTitulo = true;
          } else {
            det.ehTitulo = false;
          }
        }
      }

      if (det.ehTitulo) {
        // Se já acumulamos conteúdo no capítulo atual, fecha o anterior
        if (capituloAtual.paragrafos.length > 0 || capituloAtual.imagens.length > 0) {
          capitulos.push(capituloAtual);
        }

        const tituloFinal = det.tituloNormalizado || pLimpo;
        capituloAtual = {
          titulo: tituloFinal,
          paragrafos: [],
          imagens: [],
          ocultarTitulo: false,
        };
        detectouAlgumCapitulo = true;
      } else {
        capituloAtual.paragrafos.push(paragrafo);
      }
    }
  }

  // Fecha o último capítulo pendente
  if (capituloAtual.paragrafos.length > 0 || capituloAtual.imagens.length > 0) {
    capitulos.push(capituloAtual);
  }

  // Se nenhum capítulo explícito foi detectado no documento inteiro:
  // NUNCA divide em "Parte 1", "Parte 2"! Mantém como um único fluxo contínuo.
  if (!detectouAlgumCapitulo) {
    const todosParagrafos = paginas.flatMap((p) => p.paragrafos);
    const todasImagens = paginas.flatMap((p) => p.imagens);

    return [
      {
        titulo: "Leitura",
        paragrafos: todosParagrafos,
        imagens: todasImagens,
        ocultarTitulo: true,
      },
    ];
  }

  // Remove o capítulo preliminar "Início" caso tenha ficado vazio
  if (capitulos.length > 1 && capitulos[0].titulo === "Início" && capitulos[0].paragrafos.length === 0) {
    capitulos.shift();
  }

  return capitulos;
}
