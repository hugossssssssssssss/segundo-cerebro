/**
 * Utilitários e funções de cálculo para o módulo IT-Tools do Klaus.
 * Roda 100% no navegador (client-side), sem dependências pesadas externas.
 */

// ── 1. Design & Medidas: Conversor de Unidades ─────────────────────────────

export type UnidadeMedida = "px" | "rem" | "em" | "pt" | "cm" | "mm" | "in";

export interface ResultadoConversaoUnidades {
  px: number;
  rem: number;
  em: number;
  pt: number;
  cm: number;
  mm: number;
  in: number;
}

/**
 * Converte um valor numérico em uma unidade de origem para todas as outras unidades,
 * usando a base de font-size padrão (default 16px).
 */
export function converterUnidades(
  valor: number,
  unidadeOrigem: UnidadeMedida,
  basePx: number = 16
): ResultadoConversaoUnidades {
  if (isNaN(valor) || valor === null || valor === undefined) {
    return { px: 0, rem: 0, em: 0, pt: 0, cm: 0, mm: 0, in: 0 };
  }

  // 1. Converter tudo primeiro para PX
  let emPx = 0;
  switch (unidadeOrigem) {
    case "px":
      emPx = valor;
      break;
    case "rem":
    case "em":
      emPx = valor * basePx;
      break;
    case "pt":
      emPx = (valor * 96) / 72; // 1pt = 1/72 pol, 96px = 1 pol
      break;
    case "in":
      emPx = valor * 96;
      break;
    case "cm":
      emPx = (valor * 96) / 2.54;
      break;
    case "mm":
      emPx = (valor * 96) / 25.4;
      break;
  }

  const arredondar = (v: number) => Math.round(v * 10000) / 10000;

  return {
    px: arredondar(emPx),
    rem: arredondar(emPx / basePx),
    em: arredondar(emPx / basePx),
    pt: arredondar((emPx * 72) / 96),
    in: arredondar(emPx / 96),
    cm: arredondar((emPx * 2.54) / 96),
    mm: arredondar((emPx * 25.4) / 96),
  };
}

// ── 2. Design & Medidas: Aspect Ratio ──────────────────────────────────────

export interface ProporcaoPreset {
  rotulo: string;
  largura: number;
  altura: number;
}

export const PRESETS_ASPECT_RATIO: ProporcaoPreset[] = [
  { rotulo: "16:9 (Widescreen / Vídeo)", largura: 16, altura: 9 },
  { rotulo: "4:3 (Monitor / TV Clássica)", largura: 4, altura: 3 },
  { rotulo: "1:1 (Quadrado / Post Social)", largura: 1, altura: 1 },
  { rotulo: "9:16 (Stories / Reels / TikTok)", largura: 9, altura: 16 },
  { rotulo: "21:9 (Ultrawide)", largura: 21, altura: 9 },
  { rotulo: "3:2 (Fotografia DSLR)", largura: 3, altura: 2 },
  { rotulo: "2:3 (Retrato Vertical)", largura: 2, altura: 3 },
  { rotulo: "1.618:1 (Proporção Áurea)", largura: 1.618, altura: 1 },
];

export function calcularAspectRatio(
  larguraOriginal: number,
  alturaOriginal: number,
  novaLargura?: number,
  novaAltura?: number
): { largura: number; altura: number; razao: number; formatoSimplificado: string } {
  const w = larguraOriginal || 16;
  const h = alturaOriginal || 9;
  const razao = w / h;

  // Algoritmo GCD para simplificar fração
  function mdc(a: number, b: number): number {
    return b === 0 ? a : mdc(b, a % b);
  }

  const divisor = mdc(Math.round(w), Math.round(h));
  const simplificadoW = Math.round(w / (divisor || 1));
  const simplificadoH = Math.round(h / (divisor || 1));

  let resLargura = novaLargura ?? w;
  let resAltura = novaAltura ?? h;

  if (novaLargura !== undefined && novaAltura === undefined) {
    resAltura = Math.round(novaLargura / razao);
  } else if (novaAltura !== undefined && novaLargura === undefined) {
    resLargura = Math.round(novaAltura * razao);
  }

  return {
    largura: resLargura,
    altura: resAltura,
    razao: Math.round(razao * 1000) / 1000,
    formatoSimplificado: `${simplificadoW}:${simplificadoH}`,
  };
}

// ── 3. Design: Verificador de Contraste WCAG ────────────────────────────────

export interface ResultadoContrasteWCAG {
  ratio: number;
  textoNormalAA: boolean;
  textoNormalAAA: boolean;
  textoGrandeAA: boolean;
  textoGrandeAAA: boolean;
  luminanciaTexto: number;
  luminanciaFundo: number;
}

/**
 * Converte cor hex (#fff ou #ffffff) para [r, g, b] (0-255).
 */
export function hexParaRgb(hex: string): [number, number, number] | null {
  const limpo = hex.replace(/^#/, "").trim();
  if (limpo.length === 3) {
    const r = parseInt(limpo[0] + limpo[0], 16);
    const g = parseInt(limpo[1] + limpo[1], 16);
    const b = parseInt(limpo[2] + limpo[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  if (limpo.length === 6) {
    const r = parseInt(limpo.substring(0, 2), 16);
    const g = parseInt(limpo.substring(2, 4), 16);
    const b = parseInt(limpo.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  return null;
}

/**
 * Calcula a luminância relativa segundo o padrão WCAG 2.1
 */
export function calcularLuminancia(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calcula o contraste WCAG entre duas cores HEX.
 */
export function verificarContrasteWCAG(
  corTextoHex: string,
  corFundoHex: string
): ResultadoContrasteWCAG {
  const rgbTexto = hexParaRgb(corTextoHex) || [0, 0, 0];
  const rgbFundo = hexParaRgb(corFundoHex) || [255, 255, 255];

  const l1 = calcularLuminancia(...rgbTexto);
  const l2 = calcularLuminancia(...rgbFundo);

  const maisClaro = Math.max(l1, l2);
  const maisEscuro = Math.min(l1, l2);
  const ratio = (maisClaro + 0.05) / (maisEscuro + 0.05);
  const ratioArredondado = Math.round(ratio * 100) / 100;

  return {
    ratio: ratioArredondado,
    textoNormalAA: ratioArredondado >= 4.5,
    textoNormalAAA: ratioArredondado >= 7.0,
    textoGrandeAA: ratioArredondado >= 3.0,
    textoGrandeAAA: ratioArredondado >= 4.5,
    luminanciaTexto: Math.round(l1 * 1000) / 1000,
    luminanciaFundo: Math.round(l2 * 1000) / 1000,
  };
}

// ── 4. Texto & Slugs: Conversor de Cases ────────────────────────────────────

export function converterTextoCases(texto: string) {
  if (!texto || !texto.trim()) {
    return {
      kebabCase: "",
      snakeCase: "",
      camelCase: "",
      pascalCase: "",
      constantCase: "",
      slugLimpo: "",
      titleCase: "",
      maiusculas: "",
      minusculas: "",
    };
  }

  // Divide por espaços, underscores, hífens ou transição camelCase
  const palavras = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos para os cases de programação
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const kebabCase = palavras.map((p) => p.toLowerCase()).join("-");
  const snakeCase = palavras.map((p) => p.toLowerCase()).join("_");
  const constantCase = palavras.map((p) => p.toUpperCase()).join("_");

  const camelCase = palavras
    .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join("");

  const pascalCase = palavras
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");

  const slugLimpo = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const titleCase = texto
    .toLowerCase()
    .split(" ")
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ""))
    .join(" ");

  return {
    kebabCase,
    snakeCase,
    camelCase,
    pascalCase,
    constantCase,
    slugLimpo,
    titleCase,
    maiusculas: texto.toUpperCase(),
    minusculas: texto.toLowerCase(),
  };
}

// ── 5. Texto: Estatísticas & Análise ────────────────────────────────────────

export interface EstatisticasTexto {
  caracteresTotal: number;
  caracteresSemEspaco: number;
  palavras: number;
  linhas: number;
  paragrafos: number;
  tempoLeituraMinutos: number;
  palavrasFrequentes: Array<{ palavra: string; contagem: number }>;
}

export function analisarEstatisticasTexto(texto: string): EstatisticasTexto {
  if (!texto) {
    return {
      caracteresTotal: 0,
      caracteresSemEspaco: 0,
      palavras: 0,
      linhas: 0,
      paragrafos: 0,
      tempoLeituraMinutos: 0,
      palavrasFrequentes: [],
    };
  }

  const caracteresTotal = texto.length;
  const caracteresSemEspaco = texto.replace(/\s/g, "").length;
  const linhas = texto.split("\n").length;
  const paragrafos = texto
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0).length;

  const listaPalavras = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2);

  const palavras = listaPalavras.length;
  const tempoLeituraMinutos = Math.ceil(palavras / 200); // 200 palavras por minuto média

  // Frequência de palavras
  const mapa: Record<string, number> = {};
  for (const p of listaPalavras) {
    mapa[p] = (mapa[p] || 0) + 1;
  }

  const palavrasFrequentes = Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([palavra, contagem]) => ({ palavra, contagem }));

  return {
    caracteresTotal,
    caracteresSemEspaco,
    palavras,
    linhas,
    paragrafos,
    tempoLeituraMinutos,
    palavrasFrequentes,
  };
}

// ── 6. Texto: Limpeza & Formatação ──────────────────────────────────────────

export interface OpcoesLimpezaTexto {
  removerQuebrasDuplicadas?: boolean;
  removerEspacosExtras?: boolean;
  removerAcentos?: boolean;
  removerHtmlTags?: boolean;
  removerLinhasVazias?: boolean;
}

export function limparTexto(texto: string, opcoes: OpcoesLimpezaTexto): string {
  let resultado = texto;

  if (opcoes.removerHtmlTags) {
    resultado = resultado.replace(/<[^>]*>/g, "");
  }

  if (opcoes.removerAcentos) {
    resultado = resultado.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  if (opcoes.removerEspacosExtras) {
    resultado = resultado
      .split("\n")
      .map((l) => l.replace(/[ \t]+/g, " ").trim())
      .join("\n");
  }

  if (opcoes.removerQuebrasDuplicadas) {
    resultado = resultado.replace(/\n{3,}/g, "\n\n");
  }

  if (opcoes.removerLinhasVazias) {
    resultado = resultado
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .join("\n");
  }

  return resultado;
}

// ── 7. Geradores: Lorem Ipsum ──────────────────────────────────────────────

const PALAVRAS_LOREM = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum"
];

export function gerarLoremIpsum(
  quantidade: number = 3,
  tipo: "paragrafos" | "frases" | "palavras" = "paragrafos",
  comecarComPadrao: boolean = true
): string {
  if (quantidade <= 0) return "";

  function gerarFrase(tamanho: number = 8): string {
    const palavras: string[] = [];
    for (let i = 0; i < tamanho; i++) {
      const idx = Math.floor(Math.random() * PALAVRAS_LOREM.length);
      palavras.push(PALAVRAS_LOREM[idx]);
    }
    const frase = palavras.join(" ");
    return frase.charAt(0).toUpperCase() + frase.slice(1) + ".";
  }

  if (tipo === "palavras") {
    const saida: string[] = [];
    for (let i = 0; i < quantidade; i++) {
      saida.push(PALAVRAS_LOREM[i % PALAVRAS_LOREM.length]);
    }
    if (comecarComPadrao && saida.length >= 2) {
      saida[0] = "Lorem";
      saida[1] = "ipsum";
    }
    return saida.join(" ");
  }

  if (tipo === "frases") {
    const frases: string[] = [];
    for (let i = 0; i < quantidade; i++) {
      frases.push(gerarFrase(Math.floor(Math.random() * 8) + 6));
    }
    if (comecarComPadrao && frases.length > 0) {
      frases[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    }
    return frases.join(" ");
  }

  // Parágrafos
  const paragrafos: string[] = [];
  for (let p = 0; p < quantidade; p++) {
    const numFrases = Math.floor(Math.random() * 3) + 4;
    const frases: string[] = [];
    for (let f = 0; f < numFrases; f++) {
      frases.push(gerarFrase(Math.floor(Math.random() * 8) + 6));
    }
    if (p === 0 && comecarComPadrao) {
      frases[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
    }
    paragrafos.push(frases.join(" "));
  }

  return paragrafos.join("\n\n");
}

// ── 8. Geradores: QR Code Oficial (Padrão ISO com Leitura por Qualquer Câmera) ──

import QRCode from "qrcode";

/**
 * Gera SVG oficial do QR Code compatível com todos os leitores de câmera e smartphones.
 */
export async function gerarSvgQrCode(
  texto: string,
  corFrente: string = "#000000",
  corFundo: string = "#ffffff",
  tamanhoPx: number = 280
): Promise<string> {
  const conteudo = (texto && texto.trim()) ? texto.trim() : "https://klaus.app";
  try {
    const svg = await QRCode.toString(conteudo, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      width: tamanhoPx,
      color: {
        dark: corFrente || "#000000",
        light: corFundo || "#ffffff",
      },
    });
    return svg;
  } catch (err) {
    console.error("Erro ao gerar QR Code SVG:", err);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tamanhoPx} ${tamanhoPx}" width="${tamanhoPx}" height="${tamanhoPx}"><text x="10" y="30" fill="red">Erro no QR Code</text></svg>`;
  }
}

/**
 * Gera DataURL PNG do QR Code em alta resolução.
 */
export async function gerarPngDataUrlQrCode(
  texto: string,
  corFrente: string = "#000000",
  corFundo: string = "#ffffff",
  tamanhoPx: number = 600
): Promise<string> {
  const conteudo = (texto && texto.trim()) ? texto.trim() : "https://klaus.app";
  try {
    const dataUrl = await QRCode.toDataURL(conteudo, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: tamanhoPx,
      color: {
        dark: corFrente || "#000000",
        light: corFundo || "#ffffff",
      },
    });
    return dataUrl;
  } catch (err) {
    console.error("Erro ao gerar QR Code PNG:", err);
    return "";
  }
}

// ── 9. Geradores: UUID, Base64 e Hash ──────────────────────────────────────

export function gerarUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function textoParaBase64(texto: string): string {
  try {
    return btoa(unescape(encodeURIComponent(texto)));
  } catch {
    return "";
  }
}

export function base64ParaTexto(base64: string): string {
  try {
    return decodeURIComponent(escape(atob(base64)));
  } catch {
    return "Erro: Base64 inválido";
  }
}

export async function gerarHashSHA256(texto: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return "API Crypto indisponível";
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── 10. Código: Formatador de JSON e CSS ────────────────────────────────────

export function formatarJSON(codigo: string, indentacao: number = 2): { formatado: string; valido: boolean; erro?: string } {
  try {
    const obj = JSON.parse(codigo);
    return {
      formatado: JSON.stringify(obj, null, indentacao),
      valido: true,
    };
  } catch (err: any) {
    return {
      formatado: codigo,
      valido: false,
      erro: err?.message || "JSON inválido",
    };
  }
}

export function minificarJSON(codigo: string): { minificado: string; valido: boolean; erro?: string } {
  try {
    const obj = JSON.parse(codigo);
    return {
      minificado: JSON.stringify(obj),
      valido: true,
    };
  } catch (err: any) {
    return {
      minificado: codigo,
      valido: false,
      erro: err?.message || "JSON inválido",
    };
  }
}
