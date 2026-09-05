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

export interface AjustesTonalidade {
  brilho: number;      // -50 a +50 (padrão 0)
  contraste: number;   // -50 a +50 (padrão 0)
  intensidade: number; // 0 a 100 (padrão 50)
}

export const AJUSTES_TONALIDADE_PADRAO: AjustesTonalidade = {
  brilho: 0,
  contraste: 0,
  intensidade: 50,
};

/**
 * Calcula a distância euclidiana entre dois pontos.
 */
export function distancia(p1: Ponto, p2: Ponto): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calcula a área de um quadrilátero definido pelos 4 cantos (fórmula de Gauss / Shoelace).
 */
export function calcularAreaPoligono(cantos: CantosDocumento): number {
  const { tl, tr, br, bl } = cantos;
  return Math.abs(
    (tl.x * tr.y - tr.x * tl.y) +
    (tr.x * br.y - br.x * tr.y) +
    (br.x * bl.y - bl.x * br.y) +
    (bl.x * tl.y - tl.x * bl.y)
  ) / 2;
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
 * Detecta automaticamente as bordas e os 4 cantos do documento na foto
 * através de processamento rápido de bordas e gradientes de luminância.
 */
export function detectarCantosAutomaticos(
  imagem: HTMLImageElement | HTMLCanvasElement
): CantosDocumento {
  const largOriginal = imagem.width;
  const altOriginal = imagem.height;

  if (largOriginal < 20 || altOriginal < 20) {
    return cantosPadrao(largOriginal, altOriginal);
  }

  // Reduz para ~320px para análise instantânea sem lag
  const escala = Math.min(1, 320 / Math.max(largOriginal, altOriginal));
  const w = Math.max(10, Math.round(largOriginal * escala));
  const h = Math.max(10, Math.round(altOriginal * escala));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return cantosPadrao(largOriginal, altOriginal);

  ctx.drawImage(imagem, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Converte para escala de cinza
  const cinza = new Float32Array(w * h);
  for (let i = 0; i < data.length; i += 4) {
    cinza[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // 2. Operador Sobel para detecção de magnitude de bordas
  const bordas = new Float32Array(w * h);
  let maxMag = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx =
        -cinza[idx - w - 1] + cinza[idx - w + 1] +
        -2 * cinza[idx - 1] + 2 * cinza[idx + 1] +
        -cinza[idx + w - 1] + cinza[idx + w + 1];
      const gy =
        -cinza[idx - w - 1] - 2 * cinza[idx - w] - cinza[idx - w + 1] +
        cinza[idx + w - 1] + 2 * cinza[idx + w] + cinza[idx + w + 1];

      const mag = Math.sqrt(gx * gx + gy * gy);
      bordas[idx] = mag;
      if (mag > maxMag) maxMag = mag;
    }
  }

  // 3. Identifica pontos fortes de borda (limiar de corte)
  const limiarBorda = maxMag * 0.22;
  const pontosBorda: Ponto[] = [];

  // Exclui margens de 3% para ignorar moldura da foto
  const margemX = Math.round(w * 0.03);
  const margemY = Math.round(h * 0.03);

  for (let y = margemY; y < h - margemY; y++) {
    for (let x = margemX; x < w - margemX; x++) {
      if (bordas[y * w + x] > limiarBorda) {
        pontosBorda.push({ x, y });
      }
    }
  }

  // Se não encontrou bordas suficientes com contraste, usa cantos padrão
  if (pontosBorda.length < 50) {
    return cantosPadrao(largOriginal, altOriginal);
  }

  // 4. Encontra os 4 vértices extremos com base nas projeções ortogonais
  let minSoma = Infinity;   // tl: min(x + y)
  let maxDif = -Infinity;   // tr: max(x - y)
  let maxSoma = -Infinity;  // br: max(x + y)
  let minDif = Infinity;    // bl: min(x - y)

  let tl: Ponto = { x: margemX, y: margemY };
  let tr: Ponto = { x: w - margemX, y: margemY };
  let br: Ponto = { x: w - margemX, y: h - margemY };
  let bl: Ponto = { x: margemX, y: h - margemY };

  for (const p of pontosBorda) {
    const soma = p.x + p.y;
    const dif = p.x - p.y;

    if (soma < minSoma) {
      minSoma = soma;
      tl = p;
    }
    if (dif > maxDif) {
      maxDif = dif;
      tr = p;
    }
    if (soma > maxSoma) {
      maxSoma = soma;
      br = p;
    }
    if (dif < minDif) {
      minDif = dif;
      bl = p;
    }
  }

  // Validação geométrica: a área do quadrilátero detectado deve ser razoável (> 15% da imagem)
  const cantosEmEscala: CantosDocumento = { tl, tr, br, bl };
  const areaDetectada = calcularAreaPoligono(cantosEmEscala);
  const areaTotal = w * h;

  if (areaDetectada < areaTotal * 0.15 || areaDetectada > areaTotal * 0.98) {
    return cantosPadrao(largOriginal, altOriginal);
  }

  // 5. Converte as coordenadas de volta para a resolução original
  const fatorInv = 1 / escala;
  return {
    tl: {
      x: Math.max(0, Math.min(largOriginal, Math.round(tl.x * fatorInv))),
      y: Math.max(0, Math.min(altOriginal, Math.round(tl.y * fatorInv))),
    },
    tr: {
      x: Math.max(0, Math.min(largOriginal, Math.round(tr.x * fatorInv))),
      y: Math.max(0, Math.min(altOriginal, Math.round(tr.y * fatorInv))),
    },
    br: {
      x: Math.max(0, Math.min(largOriginal, Math.round(br.x * fatorInv))),
      y: Math.max(0, Math.min(altOriginal, Math.round(br.y * fatorInv))),
    },
    bl: {
      x: Math.max(0, Math.min(largOriginal, Math.round(bl.x * fatorInv))),
      y: Math.max(0, Math.min(altOriginal, Math.round(bl.y * fatorInv))),
    },
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
        dstPixels[dstIdx] = srcPixels[srcIdx];
        dstPixels[dstIdx + 1] = srcPixels[srcIdx + 1];
        dstPixels[dstIdx + 2] = srcPixels[srcIdx + 2];
        dstPixels[dstIdx + 3] = 255;
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
 * Aplica filtros de processamento de imagem voltados para documentos com ajustes de tonalidade.
 */
export function aplicarFiltroDocumento(
  canvas: HTMLCanvasElement,
  tipo: TipoFiltroScanner,
  ajustes: AjustesTonalidade = AJUSTES_TONALIDADE_PADRAO
): HTMLCanvasElement {
  const resultado = document.createElement("canvas");
  resultado.width = canvas.width;
  resultado.height = canvas.height;
  const ctx = resultado.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(canvas, 0, 0);

  if (tipo === "original" && ajustes.brilho === 0 && ajustes.contraste === 0) {
    return resultado;
  }

  const imgData = ctx.getImageData(0, 0, resultado.width, resultado.height);
  const d = imgData.data;
  const total = d.length;

  // Fator de contraste: [-50..50] mapeado para fator multiplicativo [0.5..2.0]
  const contrasteFator = (259 * (ajustes.contraste + 255)) / (255 * (259 - ajustes.contraste));
  const brilhoOffset = (ajustes.brilho / 50) * 40; // [-40..+40]
  const intensidadeNorm = ajustes.intensidade / 50; // [0..2.0], padrão 1.0

  if (tipo === "cinza") {
    for (let i = 0; i < total; i += 4) {
      let cinza = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      cinza = contrasteFator * (cinza - 128) + 128 + brilhoOffset;
      const finalVal = Math.min(255, Math.max(0, cinza));
      d[i] = finalVal;
      d[i + 1] = finalVal;
      d[i + 2] = finalVal;
    }
  } else if (tipo === "realce") {
    // Magic Color: Clareamento dinâmico de fundo + realce de texto
    const expCurva = Math.max(0.4, 0.85 / (intensidadeNorm || 0.1));
    for (let i = 0; i < total; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // Curva gama adaptativa com ganho de brancos
      r = Math.pow(r / 255, expCurva) * 255 * 1.12 - 8;
      g = Math.pow(g / 255, expCurva) * 255 * 1.12 - 8;
      b = Math.pow(b / 255, expCurva) * 255 * 1.12 - 8;

      // Aplica ajuste fino de brilho e contraste
      r = contrasteFator * (r - 128) + 128 + brilhoOffset;
      g = contrasteFator * (g - 128) + 128 + brilhoOffset;
      b = contrasteFator * (b - 128) + 128 + brilhoOffset;

      d[i] = Math.min(255, Math.max(0, r));
      d[i + 1] = Math.min(255, Math.max(0, g));
      d[i + 2] = Math.min(255, Math.max(0, b));
    }
  } else if (tipo === "pb") {
    // Limiarização P&B com corte ajustável pela intensidade
    const baseLimiar = 125 * intensidadeNorm;
    const corteSuperior = Math.min(240, baseLimiar + 25);
    const corteInferior = Math.max(15, baseLimiar - 35);

    for (let i = 0; i < total; i += 4) {
      let cinza = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      cinza = cinza + brilhoOffset;

      const valor = cinza >= corteSuperior
        ? 255
        : cinza <= corteInferior
        ? 0
        : Math.round(((cinza - corteInferior) / (corteSuperior - corteInferior)) * 255);

      const ajustado = Math.min(255, Math.max(0, contrasteFator * (valor - 128) + 128));
      d[i] = ajustado;
      d[i + 1] = ajustado;
      d[i + 2] = ajustado;
    }
  } else if (tipo === "original" && (ajustes.brilho !== 0 || ajustes.contraste !== 0)) {
    for (let i = 0; i < total; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      r = Math.min(255, Math.max(0, contrasteFator * (r - 128) + 128 + brilhoOffset));
      g = Math.min(255, Math.max(0, contrasteFator * (g - 128) + 128 + brilhoOffset));
      b = Math.min(255, Math.max(0, contrasteFator * (b - 128) + 128 + brilhoOffset));

      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
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
