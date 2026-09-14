/**
 * Gerenciamento centralizado do tema e personalização visual do Klaus.
 *
 * Suporta:
 * - Modo Claro / Escuro
 * - Variações do Modo Escuro (Padrão, OLED Preto Puro, Meia-noite, Grafite Neutro, Sépia Quente)
 * - Paletas de Cor de Destaque / Acento (Âmbar Klaus, Safira, Esmeralda, Violeta, Rosé, Grafite)
 * - Escala de Fonte Global de todo o Klaus
 * - Tamanho de Fonte do Menu Lateral
 */

export type Tema = "claro" | "escuro";

export type VariacaoEscuro =
  | "padrao"
  | "oled"
  | "meia-noite"
  | "grafite"
  | "sepia";

export type PaletaAcento =
  | "padrao"
  | "azul"
  | "esmeralda"
  | "violeta"
  | "rose"
  | "grafite";

export type EscalaFonteGlobal =
  | "compacta"
  | "padrao"
  | "confortavel"
  | "ampla";

export type TamanhoFonteMenu =
  | "compacta"
  | "padrao"
  | "media"
  | "grande";

const CHAVE_TEMA = "tema";
const CHAVE_VARIACAO_ESCURO = "klaus_variacao_escuro";
const CHAVE_PALETA_ACENTO = "klaus_paleta_acento";
const CHAVE_ESCALA_FONTE_GLOBAL = "klaus_escala_fonte_global";
const CHAVE_TAMANHO_FONTE_MENU = "klaus_tamanho_fonte_menu";

export const EVENTO_TEMA_ALTERADO = "tema-alterado";
export const EVENTO_PERSONALIZACAO_ALTERADA = "klaus-personalizacao-alterada";

/* ── 1. Tema Claro / Escuro ─────────────────────────────────────────────── */

export function lerTemaSalvo(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    if (salvo === "escuro" || salvo === "claro") return salvo;
    return "claro";
  } catch {
    return "claro";
  }
}

export function aplicarTema(tema: Tema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // silencioso
  }

  if (tema === "escuro") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // Reaplica a variação do modo escuro para garantir sincronia
  aplicarVariacaoEscuro(lerVariacaoEscuroSalva());
}

export function alternarTema(): Tema {
  const atual = lerTemaSalvo();
  const novo: Tema = atual === "escuro" ? "claro" : "escuro";
  aplicarTema(novo);
  window.dispatchEvent(new CustomEvent(EVENTO_TEMA_ALTERADO, { detail: novo }));
  return novo;
}

/* ── 2. Variações do Modo Escuro ────────────────────────────────────────── */

export const VARIACOES_ESCURO: { id: VariacaoEscuro; rotulo: string; descricao: string; corPreview: string }[] = [
  {
    id: "padrao",
    rotulo: "Klaus Original",
    descricao: "Vidro escuro fosco e suave",
    corPreview: "#171923",
  },
  {
    id: "oled",
    rotulo: "Preto Puro (OLED)",
    descricao: "Preto absoluto (#000000) com máximo contraste e economia de bateria",
    corPreview: "#000000",
  },
  {
    id: "meia-noite",
    rotulo: "Meia-noite (Midnight)",
    descricao: "Azul escuro profundo e cinematográfico",
    corPreview: "#0B132B",
  },
  {
    id: "grafite",
    rotulo: "Grafite Neutro",
    descricao: "Cinza carvão fosco estilo Linear / GitHub Dark",
    corPreview: "#16181D",
  },
  {
    id: "sepia",
    rotulo: "Café Noturno",
    descricao: "Tons terrosos e quentes para leitura noturna agradável",
    corPreview: "#1C1714",
  },
];

export function lerVariacaoEscuroSalva(): VariacaoEscuro {
  try {
    const salva = localStorage.getItem(CHAVE_VARIACAO_ESCURO) as VariacaoEscuro;
    if (VARIACOES_ESCURO.some((v) => v.id === salva)) return salva;
    return "padrao";
  } catch {
    return "padrao";
  }
}

export function aplicarVariacaoEscuro(variacao: VariacaoEscuro): void {
  try {
    localStorage.setItem(CHAVE_VARIACAO_ESCURO, variacao);
  } catch {}

  const classesVariacoes = ["dark-oled", "dark-midnight", "dark-charcoal", "dark-sepia"];
  document.documentElement.classList.remove(...classesVariacoes);

  if (document.documentElement.classList.contains("dark")) {
    if (variacao === "oled") document.documentElement.classList.add("dark-oled");
    else if (variacao === "meia-noite") document.documentElement.classList.add("dark-midnight");
    else if (variacao === "grafite") document.documentElement.classList.add("dark-charcoal");
    else if (variacao === "sepia") document.documentElement.classList.add("dark-sepia");
  }

  window.dispatchEvent(new CustomEvent(EVENTO_PERSONALIZACAO_ALTERADA));
}

/* ── 3. Paletas de Cores de Acento ─────────────────────────────────────── */

export const PALETAS_ACENTO: { id: PaletaAcento; rotulo: string; hex: string; hslValor: string }[] = [
  { id: "padrao", rotulo: "Âmbar Klaus", hex: "#f59e0b", hslValor: "38 92% 50%" },
  { id: "azul", rotulo: "Safira Oceano", hex: "#3b82f6", hslValor: "217 91% 60%" },
  { id: "esmeralda", rotulo: "Esmeralda", hex: "#10b981", hslValor: "160 84% 39%" },
  { id: "violeta", rotulo: "Ametista", hex: "#8b5cf6", hslValor: "258 90% 66%" },
  { id: "rose", rotulo: "Carmim Rosé", hex: "#f43f5e", hslValor: "349 89% 60%" },
  { id: "grafite", rotulo: "Grafite Minimalista", hex: "#64748b", hslValor: "215 16% 47%" },
];

export function lerPaletaAcentoSalva(): PaletaAcento {
  try {
    const salva = localStorage.getItem(CHAVE_PALETA_ACENTO) as PaletaAcento;
    if (PALETAS_ACENTO.some((p) => p.id === salva)) return salva;
    return "padrao";
  } catch {
    return "padrao";
  }
}

export function aplicarPaletaAcento(paleta: PaletaAcento): void {
  try {
    localStorage.setItem(CHAVE_PALETA_ACENTO, paleta);
  } catch {}

  const classesPaletas = ["tema-azul", "tema-esmeralda", "tema-violeta", "tema-rose", "tema-grafite"];
  document.documentElement.classList.remove(...classesPaletas);

  if (paleta !== "padrao") {
    document.documentElement.classList.add(`tema-${paleta}`);
  }

  window.dispatchEvent(new CustomEvent(EVENTO_PERSONALIZACAO_ALTERADA));
}

/* ── 4. Escala de Fonte Global do Klaus ─────────────────────────────────── */

export const ESCALAS_FONTE_GLOBAL: { id: EscalaFonteGlobal; rotulo: string; porcentagem: string; remBase: string }[] = [
  { id: "compacta", rotulo: "Compacta", porcentagem: "90%", remBase: "14.4px" },
  { id: "padrao", rotulo: "Padrão", porcentagem: "100%", remBase: "16px" },
  { id: "confortavel", rotulo: "Confortável", porcentagem: "110%", remBase: "17.6px" },
  { id: "ampla", rotulo: "Ampla", porcentagem: "120%", remBase: "19.2px" },
];

export function lerEscalaFonteGlobalSalva(): EscalaFonteGlobal {
  try {
    const salva = localStorage.getItem(CHAVE_ESCALA_FONTE_GLOBAL) as EscalaFonteGlobal;
    if (ESCALAS_FONTE_GLOBAL.some((e) => e.id === salva)) return salva;
    return "padrao";
  } catch {
    return "padrao";
  }
}

export function aplicarEscalaFonteGlobal(escala: EscalaFonteGlobal): void {
  try {
    localStorage.setItem(CHAVE_ESCALA_FONTE_GLOBAL, escala);
  } catch {}

  const item = ESCALAS_FONTE_GLOBAL.find((e) => e.id === escala) || ESCALAS_FONTE_GLOBAL[1];
  document.documentElement.style.fontSize = item.porcentagem;

  window.dispatchEvent(new CustomEvent(EVENTO_PERSONALIZACAO_ALTERADA));
}

/* ── 5. Tamanho de Fonte do Menu Lateral ────────────────────────────────── */

export const TAMANHOS_FONTE_MENU: { id: TamanhoFonteMenu; rotulo: string; classe: string; pixel: string }[] = [
  { id: "compacta", rotulo: "Compacta", classe: "text-[11px]", pixel: "11px" },
  { id: "padrao", rotulo: "Padrão", classe: "text-xs", pixel: "12px" },
  { id: "media", rotulo: "Média", classe: "text-[13px]", pixel: "13px" },
  { id: "grande", rotulo: "Grande", classe: "text-sm", pixel: "14px" },
];

export function lerTamanhoFonteMenuSalvo(): TamanhoFonteMenu {
  try {
    const salvo = localStorage.getItem(CHAVE_TAMANHO_FONTE_MENU) as TamanhoFonteMenu;
    if (TAMANHOS_FONTE_MENU.some((t) => t.id === salvo)) return salvo;
    return "padrao";
  } catch {
    return "padrao";
  }
}

export function salvarTamanhoFonteMenu(tamanho: TamanhoFonteMenu): void {
  try {
    localStorage.setItem(CHAVE_TAMANHO_FONTE_MENU, tamanho);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENTO_PERSONALIZACAO_ALTERADA));
}

/* ── 6. Inicializador Universal ─────────────────────────────────────────── */

export function inicializarPersonalizacaoGlobal(): void {
  try {
    aplicarTema(lerTemaSalvo());
    aplicarVariacaoEscuro(lerVariacaoEscuroSalva());
    aplicarPaletaAcento(lerPaletaAcentoSalva());
    aplicarEscalaFonteGlobal(lerEscalaFonteGlobalSalva());
  } catch {}
}
