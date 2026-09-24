/**
 * Módulo de extração e reconstrução inteligente de texto e parágrafos de PDFs.
 *
 * Resolve os problemas clássicos de PDFs em e-readers:
 * 1. Espaços espúrios dentro de palavras (fatiamento por kerning/ligaduras).
 * 2. Quebras de linha físicas transformadas erroneamente em novos parágrafos.
 * 3. Hifenização no final de linhas ("desenvolvi- mento" -> "desenvolvimento").
 * 4. Identificação de parágrafos reais por espaçamento vertical ou recuo.
 */

export interface ItemTextoPdf {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

export function reconstruirTextoEParagrafosPdf(items: ItemTextoPdf[]): string[] {
  if (!items || items.length === 0) return [];

  // 1. Agrupa fragmentos de texto em linhas físicas horizontais
  interface LinhaFisica {
    y: number;
    x: number;
    fontSize: number;
    texto: string;
  }

  const linhas: LinhaFisica[] = [];
  let linhaAtual: { y: number; x: number; fontSize: number; texto: string; ultimoXFim: number } | null = null;

  for (const item of items) {
    const str = item.str;
    if (!str && !item.hasEOL) continue;

    const x = item.transform[4];
    const y = item.transform[5];
    const fontSize = Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || 12;
    const largura = item.width || 0;

    if (!linhaAtual || Math.abs(y - linhaAtual.y) > 3) {
      if (linhaAtual && linhaAtual.texto.trim()) {
        linhas.push({
          y: linhaAtual.y,
          x: linhaAtual.x,
          fontSize: linhaAtual.fontSize,
          texto: linhaAtual.texto.trim(),
        });
      }
      linhaAtual = {
        y,
        x,
        fontSize,
        texto: str,
        ultimoXFim: x + largura,
      };
    } else {
      // Mesma linha física: decide se precisa de espaço entre os trechos
      const gapX = x - linhaAtual.ultimoXFim;
      const precisaEspaco =
        gapX > 1.8 &&
        !linhaAtual.texto.endsWith(" ") &&
        !str.startsWith(" ") &&
        !str.startsWith(",") &&
        !str.startsWith(".") &&
        !str.startsWith(";") &&
        !str.startsWith(":") &&
        !str.startsWith(")") &&
        !str.startsWith("]") &&
        !str.startsWith("}");

      if (precisaEspaco) {
        linhaAtual.texto += " " + str;
      } else {
        linhaAtual.texto += str;
      }
      linhaAtual.ultimoXFim = Math.max(linhaAtual.ultimoXFim, x + largura);
    }
  }

  if (linhaAtual && linhaAtual.texto.trim()) {
    linhas.push({
      y: linhaAtual.y,
      x: linhaAtual.x,
      fontSize: linhaAtual.fontSize,
      texto: linhaAtual.texto.trim(),
    });
  }

  if (linhas.length === 0) return [];

  // 2. Agrupa linhas contínuas em parágrafos reais
  const paragrafos: string[] = [];
  let paragrafoAtual = "";

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const proximaLinha = linhas[i + 1];

    if (!paragrafoAtual) {
      paragrafoAtual = linha.texto;
    } else {
      // Trata hifenização no final da linha (ex: "compa-", "desenvolvi-")
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

    // Se o salto vertical for maior que 1.75x a altura normal de linha, indica quebra de parágrafo no layout
    const quebraVisualGrande = gapVertical > alturaLinhaRef * 1.75;

    // Se a próxima linha tem recuo à esquerda (identação de parágrafo) e a anterior termina com pontuação
    const terminaComPontuacao = /[.!?:"»]$/.test(linha.texto);
    const recuoProximaLinha = proximaLinha.x > linha.x + 8;
    const proximaEhTitulo = proximaLinha.fontSize > linha.fontSize * 1.25;

    if (quebraVisualGrande || (terminaComPontuacao && recuoProximaLinha) || proximaEhTitulo) {
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
