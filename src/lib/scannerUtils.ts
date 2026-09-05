export interface Ponto {
  x: number;
  y: number;
}

export interface CantosDocumento {
  tl: Ponto; // Top-Left
  tr: Ponto; // Top-Right
  br: Ponto; // Bottom-Right
  bl: Ponto; // Bottom-Left
}

export type TipoFiltroScanner = "original" | "realce" | "pb" | "cinza";

/**
 * Calcula a distância euclidiana entre dois pontos.
 */
export function distancia(p1: Ponto, p2: Ponto): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calcula as dimensões finais aproximadas (largura x altura)
 * do documento retificado com base nos 4 cantos.
 */
export function calcularDimensoesRetificadas(cantos: CantosDocumento): { largura: number; altura: number } {
  const largSuperior = distancia(cantos.tl, cantos.tr);
  const largInferior = distancia(cantos.bl, cantos.br);
  const altEsquerda = distancia(cantos.tl, cantos.bl);
  const altDireita = distancia(cantos.tr, cantos.br);

  const largura = Math.max(10, Math.round((largSuperior + largInferior) / 2));
  const altura = Math.max(10, Math.round((altEsquerda + altDireita) / 2));

  return { largura, altura };
}

/**
 * Retorna cantos padrão proporcionais para uma imagem (com uma pequena margem interna de 5%).
 */
export function cantosPadrao(largura: number, altura: number): CantosDocumento {
  const margemX = Math.round(largura * 0.05);
  const margemY = Math.round(altura * 0.05);

  return {
    tl: { x: margemX, y: margemY },
    tr: { x: largura - margemX, y: margemY },
    br: { x: largura - margemX, y: altura - margemY },
    bl: { x: margemX, y: altura - margemY },
  };
}

/**
 * Calcula a matriz de projeção 3x3 que mapeia (u, v) no retângulo de destino [0,0]->[w,h]
 * de volta para (x, y) na imagem original (Mapeamento Reverso).
 */
export function calcularMatrizProjetivaReversa(
  larguraDst: number,
  alturaDst: number,
  src: CantosDocumento
): number[] {
  // Mapeamento de (0,0)->(1,0)->(1,1)->(0,1) normalizado para src
  const x0 = src.tl.x, y0 = src.tl.y;
  const x1 = src.tr.x, y1 = src.tr.y;
  const x2 = src.br.x, y2 = src.br.y;
  const x3 = src.bl.x, y3 = src.bl.y;

  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy3 = y0 - y1 + y2 - y3;

  let a13 = 0;
  let a23 = 0;

  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) > 1e-7) {
    a13 = (dx3 * dy2 - dx2 * dy3) / det;
    a23 = (dx1 * dy3 - dx3 * dy1) / det;
  }

  const a11 = x1 - x0 + a13 * x1;
  const a12 = x3 - x0 + a23 * x3;
  const a31 = x0;

  const a21 = y1 - y0 + a13 * y1;
  const a22 = y3 - y0 + a23 * y3;
  const a32 = y0;

  // Matriz de [u, v, 1] (onde u em [0,1] e v em [0,1]) -> [x, y, w]
  // Ajustamos para aceitar coordenadas em pixels [0..larguraDst, 0..alturaDst]:
  const invW = 1 / larguraDst;
  const invH = 1 / alturaDst;

  return [
    a11 * invW, a12 * invH, a31,
    a21 * invW, a22 * invH, a32,
    a13 * invW, a23 * invH, 1.0,
  ];
}

/**
 * Corrige a perspectiva da imagem recortando e alinhando os 4 cantos em um novo HTMLCanvasElement.
 */
export function desentortarPerspectiva(
  imagemOriginal: HTMLImageElement | HTMLCanvasElement,
  cantos: CantosDocumento,
  dimensoesDesejadas?: { largura: number; altura: number }
): HTMLCanvasElement {
  const { largura, altura } = dimensoesDesejadas || calcularDimensoesRetificadas(cantos);

  const canvasDst = document.createElement("canvas");
  canvasDst.width = largura;
  canvasDst.height = altura;
  const ctxDst = canvasDst.getContext("2d", { willReadFrequently: true });
  if (!ctxDst) return canvasDst;

  // Pega os pixels da imagem original
  const canvasSrc = document.createElement("canvas");
  canvasSrc.width = imagemOriginal.width;
  canvasSrc.height = imagemOriginal.height;
  const ctxSrc = canvasSrc.getContext("2d", { willReadFrequently: true });
  if (!ctxSrc) return canvasDst;
  ctxSrc.drawImage(imagemOriginal, 0, 0);

  const srcData = ctxSrc.getImageData(0, 0, canvasSrc.width, canvasSrc.height);
  const dstData = ctxDst.createImageData(largura, altura);

  const M = calcularMatrizProjetivaReversa(largura, altura, cantos);
  const srcPixels = srcData.data;
  const dstPixels = dstData.data;
  const srcW = canvasSrc.width;
  const srcH = canvasSrc.height;

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const w = M[6] * x + M[7] * y + M[8];
      const invW = w !== 0 ? 1 / w : 1;
      const srcX = (M[0] * x + M[1] * y + M[2]) * invW;
      const srcY = (M[3] * x + M[4] * y + M[5]) * invW;

      const ix = Math.floor(srcX);
      const iy = Math.floor(srcY);

      const dstIdx = (y * largura + x) * 4;

      if (ix >= 0 && ix < srcW && iy >= 0 && iy < srcH) {
        const srcIdx = (iy * srcW + ix) * 4;
        dstPixels[dstIdx] = srcPixels[srcIdx];         // R
        dstPixels[dstIdx + 1] = srcPixels[srcIdx + 1]; // G
        dstPixels[dstIdx + 2] = srcPixels[srcIdx + 2]; // B
        dstPixels[dstIdx + 3] = 255;                   // A
      } else {
        dstPixels[dstIdx] = 255;
        dstPixels[dstIdx + 1] = 255;
        dstPixels[dstIdx + 2] = 255;
        dstPixels[dstIdx + 3] = 255;
      }
    }
  }

  ctxDst.putImageData(dstData, 0, 0);
  return canvasDst;
}

/**
 * Aplica filtros de processamento de imagem voltados para documentos
 */
export function aplicarFiltroDocumento(
  canvas: HTMLCanvasElement,
  tipo: TipoFiltroScanner
): HTMLCanvasElement {
  if (tipo === "original") return canvas;

  const resultado = document.createElement("canvas");
  resultado.width = canvas.width;
  resultado.height = canvas.height;
  const ctx = resultado.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(canvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, resultado.width, resultado.height);
  const d = imgData.data;
  const total = d.length;

  if (tipo === "cinza") {
    for (let i = 0; i < total; i += 4) {
      const cinza = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = cinza;
      d[i + 1] = cinza;
      d[i + 2] = cinza;
    }
  } else if (tipo === "realce") {
    // Magic Color / Realce de Documento:
    // Aumenta contraste, clareia o fundo e realça letras
    for (let i = 0; i < total; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // Curva em S para esticar brancos e acentuar escuros
      r = Math.min(255, Math.max(0, Math.pow(r / 255, 0.85) * 255 * 1.1 - 10));
      g = Math.min(255, Math.max(0, Math.pow(g / 255, 0.85) * 255 * 1.1 - 10));
      b = Math.min(255, Math.max(0, Math.pow(b / 255, 0.85) * 255 * 1.1 - 10));

      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
  } else if (tipo === "pb") {
    // Preto e Branco / Limiarização Adaptativa Dinâmica
    for (let i = 0; i < total; i += 4) {
      const cinza = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      // Limiar suave com leve contraste
      const valor = cinza > 140 ? 255 : cinza < 90 ? 0 : Math.round(((cinza - 90) / 50) * 255);
      d[i] = valor;
      d[i + 1] = valor;
      d[i + 2] = valor;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return resultado;
}

/**
 * Converte um Canvas em Blob / ArrayBuffer de imagem JPEG para inserção em PDF
 */
export async function canvasParaJpegBytes(canvas: HTMLCanvasElement, qualidade = 0.88): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("Erro ao converter canvas em imagem."));
          return;
        }
        const buffer = await blob.arrayBuffer();
        resolve(new Uint8Array(buffer));
      },
      "image/jpeg",
      qualidade
    );
  });
}
