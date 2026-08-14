/**
 * Encolhe a imagem no navegador antes de subir para o GitHub.
 *
 * O problema real: uma foto de celular moderno tem 8 a 12 MB. A API do GitHub
 * recusa acima de 5 MB, e mesmo abaixo disso cada referência salva engordava o
 * repositório de forma que não dá para desfazer — o git guarda todas as versões
 * para sempre.
 *
 * A compressão roda em web worker (não trava a tela) e é feita pela
 * `browser-image-compression`, que redimensiona e recomprime via canvas.
 * Nenhum servidor envolvido: a imagem nunca sai do aparelho antes de já estar
 * pequena.
 */

import { LIMITE_IMAGEM } from "./referencias";

/**
 * Alvo de tamanho depois de comprimir. 1,5 MB dá folga confortável contra o
 * limite de 5 MB do GitHub e ainda imprime bem numa apresentação.
 */
export const ALVO_MB = 1.5;

/**
 * Maior lado da imagem depois de redimensionar. 2400px cobre tela retina em
 * tela cheia; acima disso é peso que você nunca vê numa referência visual.
 */
export const LADO_MAXIMO = 2400;

/** Abaixo disso não vale a pena mexer — recomprimir só perderia qualidade. */
export const MINIMO_PARA_COMPRIMIR = 400 * 1024;

/**
 * Formatos que NÃO devem passar pelo canvas:
 * - `svg` é texto, já é pequeno, e virar bitmap destruiria justamente o motivo
 *   de ser vetor (é o formato que mais interessa a um designer).
 * - `gif` perderia a animação, virando um quadro parado.
 */
const INTOCAVEIS = ["image/svg+xml", "image/gif"];

export function ehIntocavel(tipo: string): boolean {
  return INTOCAVEIS.includes(tipo.toLowerCase());
}

/**
 * Decide se vale comprimir. Separado da compressão em si para poder ser
 * testado sem canvas nem web worker.
 */
export function precisaComprimir(tipo: string, tamanho: number): boolean {
  if (ehIntocavel(tipo)) return false;
  if (!tipo.startsWith("image/")) return false;
  return tamanho > MINIMO_PARA_COMPRIMIR;
}

export type ResultadoCompressao = {
  arquivo: File;
  /** Bytes antes */
  antes: number;
  /** Bytes depois */
  depois: number;
  /** false quando o arquivo passou direto (SVG, GIF ou já pequeno) */
  comprimida: boolean;
};

/** Texto curto para mostrar ao Hugo o que aconteceu com a imagem dele. */
export function resumoCompressao(r: ResultadoCompressao): string {
  const mb = (b: number) => (b / 1024 / 1024).toFixed(1).replace(".", ",");
  if (!r.comprimida) return "";
  const economia = Math.round((1 - r.depois / r.antes) * 100);
  if (economia < 5) return "";
  return `Imagem reduzida de ${mb(r.antes)} MB para ${mb(r.depois)} MB (−${economia}%).`;
}

/**
 * Prepara o arquivo escolhido para subir.
 *
 * Nunca estoura: se a compressão falhar por qualquer motivo (formato exótico,
 * worker bloqueado, memória), devolve o arquivo original. Falhar em encolher é
 * um aborrecimento; falhar em salvar a referência do Hugo, não.
 */
export async function prepararImagem(arquivo: File): Promise<ResultadoCompressao> {
  const intacto: ResultadoCompressao = {
    arquivo,
    antes: arquivo.size,
    depois: arquivo.size,
    comprimida: false,
  };

  if (!precisaComprimir(arquivo.type, arquivo.size)) return intacto;

  try {
    const { default: comprimir } = await import("browser-image-compression");
    const menor = await comprimir(arquivo, {
      maxSizeMB: ALVO_MB,
      maxWidthOrHeight: LADO_MAXIMO,
      useWebWorker: true,
      // manter o tipo original preserva a extensão que `nomeDeImagem` escolhe
      fileType: arquivo.type,
    });

    // Em imagem já otimizada, recomprimir às vezes SOBE o tamanho. Nesse caso
    // o original é melhor negócio.
    if (menor.size >= arquivo.size) return intacto;

    return {
      arquivo: menor,
      antes: arquivo.size,
      depois: menor.size,
      comprimida: true,
    };
  } catch {
    return intacto;
  }
}

/**
 * Mensagem de erro quando nem comprimida a imagem coube.
 * Acontece com PNG gigante de screenshot ou com SVG pesado.
 */
export function erroDeTamanho(r: ResultadoCompressao): string | null {
  if (r.depois <= LIMITE_IMAGEM) return null;
  const mb = (r.depois / 1024 / 1024).toFixed(1).replace(".", ",");
  const tentei = r.comprimida ? " mesmo depois de encolher" : "";
  return `A imagem tem ${mb} MB${tentei}. O limite do GitHub por arquivo é 5 MB — exporte menor e tente de novo.`;
}
