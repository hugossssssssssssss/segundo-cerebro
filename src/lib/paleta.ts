import { getPalette } from "colorthief";

/**
 * Converte um tripla de [r, g, b] para código HEX (ex: "#1a2b3c")
 */
export function rgbParaHex(r: number, g: number, b: number): string {
  const hexR = r.toString(16).padStart(2, "0");
  const hexG = g.toString(16).padStart(2, "0");
  const hexB = b.toString(16).padStart(2, "0");
  return `#${hexR}${hexG}${hexB}`.toLowerCase();
}

/**
 * Extrai até N cores dominantes de um elemento <img> já carregado no navegador.
 */
export async function extrairPaletaDaImagem(
  img: HTMLImageElement,
  qtdCores = 5,
): Promise<string[]> {
  try {
    if (!img.complete || img.naturalWidth === 0) {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Erro ao carregar imagem para paleta"));
      });
    }

    const palette = await getPalette(img, { colorCount: qtdCores });
    if (!palette || !Array.isArray(palette)) return [];

    return palette.map((c) => (typeof c.hex === "function" ? c.hex() : "#000000"));
  } catch (err) {
    console.warn("Não foi possível extrair a paleta de cores da imagem:", err);
    return [];
  }
}
