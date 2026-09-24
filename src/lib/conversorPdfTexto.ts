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
 * 7. Agrupamento contínuo em capítulos reais (eliminando telas em branco a cada 2 páginas).
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
  x: number;
  fontSize: number;
  largura: number;
  texto: string;
}

export interface BlocoParagrafo {
  texto: string;
  ehTitulo?: boolean;
  tituloCapitulo?: string;
}

export interface CapituloDetectado {
  titulo: string;
  paragrafos: string[];
  imagens: any[];
}

/**
 * Normaliza caracteres de travessão e traço para o padrão editorial
 */
const TRAVESSAO_REGEX = /^[\u2014\u2013\u2015\-]\s*/;
const TRAVESSAO_CHAR = "—";

/**
 * Ordena os itens do PDF na ordem visual correta de leitura (de cima para baixo, da esquerda para a direita).
 * No PDF, Y=0 fica no rodapé e Y cresce em direção ao topo. Logo, Y maior vem primeiro.
 */
export function ordenarItensVisualmente(items: ItemTextoPdf[]): ItemTextoPdf[] {
  return [...items].sort((a, b) => {
    const yA = a.transform[5];
    const yB = b.transform[5];
    const xA = a.transform[4];
    const xB = b.transform[4];

    // Se estiverem em linhas distintas (diferença maior que ~4 pontos)
    if (Math.abs(yA - yB) > 4) {
      return yB - yA; // Y maior (mais alto na página) vem primeiro
    }
    // Na mesma linha física, o menor X (mais à esquerda) vem primeiro
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
 * Reúne itens brutos do PDF em linhas horizontais ordenadas e reconcilia travessões
 */
export function agruparEmLinhasFisicas(items: ItemTextoPdf[]): LinhaFisica[] {
  if (!items || items.length === 0) return [];

  // 1. Pré-ordena itens geometricamente
  const itensOrdenados = ordenarItensVisualmente(items);

  let yMin = Infinity;
  let yMax = -Infinity;
  for (const it of itensOrdenados) {
    const y = it.transform[5];
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }

  // 2. Agrupa em linhas horizontais com tolerância adaptativa
  const linhas: LinhaFisica[] = [];
  let linhaAtual: {
    y: number;
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
    const fontSize = Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || 12;
    const largura = item.width || 0;

    const tolY = Math.max(3.5, fontSize * 0.35);

    if (!linhaAtual || Math.abs(y - linhaAtual.y) > tolY) {
      if (linhaAtual && linhaAtual.fragmentos.length > 0) {
        linhas.push(montarLinhaDeFragmentos(linhaAtual));
      }
      linhaAtual = {
        y,
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
  x: number;
  fontSize: number;
  fragmentos: { x: number; str: string; largura: number; fontSize: number }[];
}): LinhaFisica {
  // Ordena fragmentos da linha estritamente da esquerda para a direita
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

    // Se for travessão após uma palavra, assegura espaço antes: "fala —"
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

  // Se a linha começa com travessão de diálogo, garante: "— " seguido da frase
  if (TRAVESSAO_REGEX.test(texto)) {
    const resto = texto.replace(TRAVESSAO_REGEX, "").trim();
    texto = `${TRAVESSAO_CHAR} ${resto}`;
  }

  // Se há travessão no meio da frase com oração incisa ("palavra—palavra" ou "palavra —palavra"),
  // padroniza para "palavra — palavra"
  texto = texto.replace(/([a-zA-Z0-9à-úÀ-Ú.,!?])\s*[\u2014\u2013\u2015]\s*([a-zA-Z0-9à-úÀ-Ú])/g, "$1 — $2");

  return texto;
}

/**
 * Reconcilia Letras Capitulares (Drop Caps) no início de parágrafos/páginas.
 *
 * Em livros, a primeira letra de um capítulo é frequentemente uma letra gigante (ex: "O", "E", "A"),
 * cuja linha de base no PDF fica em coordenada Y diferente ou forma uma "linha" com apenas 1 letra.
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
    // É uma capitular se tem 1 ou 2 caracteres (ex: "O", "A", "E", "À", "«A") e a próxima linha está logo abaixo
    const ehCapitular =
      /^[A-ZÀ-Ú«"'\u201C\u2018]?[A-ZÀ-Ú]$/.test(textoAtual) &&
      atual.fontSize >= proxima.fontSize * 1.2;

    if (ehCapitular) {
      const textoProxima = proxima.texto.trim();
      // Se a próxima linha começa com letra minúscula (continuação da mesma palavra, ex: "utro dia")
      if (/^[a-zà-ú]/.test(textoProxima)) {
        resultado.push({
          y: atual.y,
          x: atual.x,
          fontSize: proxima.fontSize,
          largura: atual.largura + proxima.largura,
          texto: `${textoAtual}${textoProxima}`,
        });
        i++; // Pula a próxima linha pois foi incorporada
        continue;
      }
      // Se a próxima linha começa com letra maiúscula (a capitular era uma palavra inteira, ex: "E" + "a noite...")
      if (/^[A-ZÀ-Ú]/.test(textoProxima)) {
        resultado.push({
          y: atual.y,
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
 * Verifica se um texto representa o título de um novo capítulo
 */
export function detectarTituloCapitulo(
  texto: string,
  fontSizeLinha?: number,
  fontSizeMedio: number = 12
): { ehTitulo: boolean; tituloNormalizado?: string } {
  const limpo = texto.trim();
  if (!limpo || limpo.length > 70) return { ehTitulo: false };

  // 1. Padrões explícitos com palavra-chave ("Capítulo", "Parte", etc.)
  const regexExplicit =
    /^(?:cap[ií]tulo|chapter|parte|se[çc][aã]o)\s*(?:[0-9ivxlcdm]+|[a-zà-ú]+)?(?:\s*[:.\-–—]\s*.*)?$/i;
  if (regexExplicit.test(limpo)) {
    return {
      ehTitulo: true,
      tituloNormalizado: formatarTituloBonito(limpo),
    };
  }

  // 2. Seções canônicas de livros
  const regexSecoes =
    /^(?:pr[oó]logo|prologo|ep[ií]logo|epilogo|introdu[çc][aã]o|introducao|pref[aá]cio|prefacio|posf[aá]cio|posfacio|conclus[aã]o|conclusao|agradecimentos|sum[aá]rio|sumario|[ií]ndice|indice|notas)\b.*$/i;
  if (regexSecoes.test(limpo)) {
    return {
      ehTitulo: true,
      tituloNormalizado: formatarTituloBonito(limpo),
    };
  }

  // 3. Numerais romanos isolados que atuam como número de capítulo (I, II, III, IV, etc.)
  if (/^[IVXLCDM]{1,8}\.?$/i.test(limpo)) {
    return {
      ehTitulo: true,
      tituloNormalizado: `Capítulo ${limpo.replace(/\./g, "").toUpperCase()}`,
    };
  }

  // 4. Linha curta em destaque tipográfico (fonte maior e sem pontuação corrida de parágrafo)
  if (fontSizeLinha && fontSizeLinha >= fontSizeMedio * 1.28) {
    const naoEhFraseCorrida = !/[.,;:?!—]$/.test(limpo);
    const temTamanhoTitulo = limpo.length >= 3 && limpo.length <= 50;

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
    return t.charAt(0) + t.slice(1).toLowerCase();
  }
  return t;
}

/**
 * Reconstrói texto e parágrafos a partir dos itens brutos da página do PDF
 */
export function reconstruirTextoEParagrafosPdf(items: ItemTextoPdf[]): string[] {
  if (!items || items.length === 0) return [];

  // 1. Agrupa fragmentos nas linhas físicas ordenadas
  let linhas = agruparEmLinhasFisicas(items);
  if (linhas.length === 0) return [];

  // 2. Reconcilia Letras Capitulares (Drop Caps)
  linhas = reconciliarCapitulares(linhas);

  // Calcula fontSize médio do corpo do texto
  const fontesValidas = linhas.map((l) => l.fontSize).filter((f) => f > 0);
  const fontSizeMedio =
    fontesValidas.length > 0
      ? fontesValidas.reduce((a, b) => a + b, 0) / fontesValidas.length
      : 12;

  // 3. Agrupa linhas em parágrafos contínuos
  const paragrafos: string[] = [];
  let paragrafoAtual = "";

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const proximaLinha = linhas[i + 1];

    if (!paragrafoAtual) {
      paragrafoAtual = linha.texto;
    } else {
      // Trata hifenização no final da linha (ex: "desenvolvi-", "cons-")
      if (paragrafoAtual.endsWith("-") && !paragrafoAtual.endsWith(" -")) {
        paragrafoAtual = paragrafoAtual.slice(0, -1) + linha.texto;
      } else {
        paragrafoAtual += " " + linha.texto;
      }
    }

    if (!proximaLinha) {
      if (paragrafoAtual.trim()) paragrafos.push(paragrafoAtual.trim());
      break;
    }

    const gapVertical = Math.abs(linha.y - proximaLinha.y);
    const alturaLinhaRef = Math.max(linha.fontSize, proximaLinha.fontSize);

    // Se o salto vertical for maior que 1.75x a altura normal de linha
    const quebraVisualGrande = gapVertical > alturaLinhaRef * 1.75;

    // Se a próxima linha tem recuo à esquerda (identação de parágrafo) e a anterior termina com pontuação
    const terminaComPontuacao = /[.!?:"»]$/.test(linha.texto);
    const recuoProximaLinha = proximaLinha.x > linha.x + 8;

    // Se a próxima linha for um título de capítulo ou destaque tipográfico
    const proximaEhTitulo =
      detectarTituloCapitulo(proximaLinha.texto, proximaLinha.fontSize, fontSizeMedio).ehTitulo ||
      proximaLinha.fontSize > linha.fontSize * 1.25;

    // Se a linha atual ou a próxima linha for um diálogo com travessão ("— "), deve ser um novo parágrafo
    const proximaComecaComTravessao = TRAVESSAO_REGEX.test(proximaLinha.texto);

    if (
      quebraVisualGrande ||
      (terminaComPontuacao && recuoProximaLinha) ||
      proximaEhTitulo ||
      proximaComecaComTravessao
    ) {
      if (paragrafoAtual.trim()) {
        paragrafos.push(paragrafoAtual.trim());
      }
      paragrafoAtual = "";
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
    // 1. Caso seja ImageBitmap, HTMLImageElement ou HTMLCanvasElement
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

    // 2. Caso seja buffer com dados brutos de pixels (RGBA, RGB ou Gray)
    if (imgObj.data && imgObj.width > 0 && imgObj.height > 0) {
      // Ignora imagens insignificantes (marcadores ou máscaras menores que 12x12)
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
        // Escala de cinza (1 canal -> 4 canais RGBA)
        const rgba = new Uint8ClampedArray(imgObj.width * imgObj.height * 4);
        for (let i = 0, j = 0; i < clamped.length; i++, j += 4) {
          rgba[j] = clamped[i];
          rgba[j + 1] = clamped[i];
          rgba[j + 2] = clamped[i];
          rgba[j + 3] = 255;
        }
        imgData = new ImageData(rgba, imgObj.width, imgObj.height);
      } else if (imgObj.kind === 2) {
        // RGB (3 canais -> 4 canais RGBA)
        const rgba = new Uint8ClampedArray(imgObj.width * imgObj.height * 4);
        for (let i = 0, j = 0; i < clamped.length; i += 3, j += 4) {
          rgba[j] = clamped[i];
          rgba[j + 1] = clamped[i + 1];
          rgba[j + 2] = clamped[i + 2];
          rgba[j + 3] = 255;
        }
        imgData = new ImageData(rgba, imgObj.width, imgObj.height);
      } else {
        // RGBA (4 canais padrão)
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
 * Agrupa as páginas contínuas do PDF em capítulos reais do livro.
 * Elimina o problema de espaçamento em branco forçado a cada página no Kindle,
 * fazendo com que o texto flua naturalmente e quebrando apenas no final de cada capítulo.
 */
export function agruparPaginasEmCapitulos(paginas: PaginaProcessadaPdf[]): CapituloMontado[] {
  if (!paginas || paginas.length === 0) return [];

  const capitulos: CapituloMontado[] = [];
  let capituloAtual: CapituloMontado = {
    titulo: "Início",
    paragrafos: [],
    imagens: [],
    ocultarTitulo: true,
  };
  let detectouAlgumCapitulo = false;

  for (const pag of paginas) {
    // Adiciona imagens da página ao capítulo atual
    if (pag.imagens && pag.imagens.length > 0) {
      capituloAtual.imagens.push(...pag.imagens);
    }

    for (const paragrafo of pag.paragrafos) {
      const det = detectarTituloCapitulo(paragrafo);

      if (det.ehTitulo) {
        // Se já acumulamos conteúdo no capítulo atual, fecha o anterior
        if (capituloAtual.paragrafos.length > 0 || capituloAtual.imagens.length > 0) {
          capitulos.push(capituloAtual);
        }

        // Abre novo capítulo com o título detectado
        const tituloFinal = det.tituloNormalizado || paragrafo;
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
  if (!detectouAlgumCapitulo) {
    // Agrupa todas as páginas em um fluxo contínuo
    const todosParagrafos = paginas.flatMap((p) => p.paragrafos);
    const todasImagens = paginas.flatMap((p) => p.imagens);

    if (paginas.length <= 20) {
      return [
        {
          titulo: "Leitura",
          paragrafos: todosParagrafos,
          imagens: todasImagens,
          ocultarTitulo: true,
        },
      ];
    }

    // Para livros longos sem marcação de capítulos, divide a cada ~15 páginas para não gerar arquivo único excessivo
    const capitulosFatiados: CapituloMontado[] = [];
    const PAGINAS_POR_BLOCO = 15;
    for (let i = 0; i < paginas.length; i += PAGINAS_POR_BLOCO) {
      const bloco = paginas.slice(i, i + PAGINAS_POR_BLOCO);
      const blocoNum = Math.floor(i / PAGINAS_POR_BLOCO) + 1;
      capitulosFatiados.push({
        titulo: `Parte ${blocoNum}`,
        paragrafos: bloco.flatMap((p) => p.paragrafos),
        imagens: bloco.flatMap((p) => p.imagens),
        ocultarTitulo: false,
      });
    }
    return capitulosFatiados;
  }

  return capitulos;
}

