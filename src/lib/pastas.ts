/**
 * Gerenciamento de pastas do Klaus:
 * - Sanitização tolerante a acentos e caracteres Unicode
 * - Persistência no localStorage
 * - Sincronização entre abas via BroadcastChannel e eventos DOM
 */

import { notificarOutrasAbas } from "./syncChannel";

const PREFIXO_STORAGE = "klaus_pastas_criadas_";
export const EVENTO_PASTAS_ATUALIZADAS = "klaus-pastas-atualizadas";

/**
 * Sanitiza o nome de uma pasta sem remover letras acentuadas ou caracteres Unicode válidos.
 * Remove apenas caracteres proibidos em sistemas de arquivos e URLs: \ / : * ? " < > |
 */
export function sanitizarNomePasta(nome: string): string {
  if (!nome || typeof nome !== "string") return "";

  const limpo = nome
    // Substitui quebras de linha por espaço
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\\/*?:"<>|]+/g, "")
    // Remove múltiplos espaços seguidos
    .replace(/\s+/g, " ")
    .trim();

  return limpo;
}

/**
 * Carrega a lista de pastas criadas para uma determinada área ("notas" ou "referencias")
 */
export function carregarPastasCriadas(area: "notas" | "referencias"): string[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(`${PREFIXO_STORAGE}${area}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => String(p).trim()).filter(Boolean);
      }
    }
  } catch {
    // Ignora erro de parsing
  }
  return [];
}

/**
 * Salva e propaga a criação de uma nova pasta
 */
export function salvarPastaCriada(area: "notas" | "referencias", novaPasta: string): string[] {
  const pastaLimpa = novaPasta
    .split("/")
    .map(sanitizarNomePasta)
    .filter(Boolean)
    .join("/");
  if (!pastaLimpa) return carregarPastasCriadas(area);

  const atuais = carregarPastasCriadas(area);
  const unicas = Array.from(new Set([...atuais, pastaLimpa])).sort((a, b) => a.localeCompare(b));

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(`${PREFIXO_STORAGE}${area}`, JSON.stringify(unicas));
    } catch {}

    // Dispara evento local
    window.dispatchEvent(
      new CustomEvent(EVENTO_PASTAS_ATUALIZADAS, {
        detail: { area, pastas: unicas, novaPasta: pastaLimpa },
      })
    );

    // Notifica outras abas via BroadcastChannel
    notificarOutrasAbas(`${area}/${pastaLimpa}`);
  }

  return unicas;
}

/**
 * Remove uma pasta criada do storage e propaga a alteração
 */
export function removerPastaCriada(area: "notas" | "referencias", pastaRemover: string): string[] {
  const atuais = carregarPastasCriadas(area);
  const filtradas = atuais.filter((p) => p !== pastaRemover && !p.startsWith(`${pastaRemover}/`));

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(`${PREFIXO_STORAGE}${area}`, JSON.stringify(filtradas));
    } catch {}

    window.dispatchEvent(
      new CustomEvent(EVENTO_PASTAS_ATUALIZADAS, {
        detail: { area, pastas: filtradas, pastaRemovida: pastaRemover },
      })
    );

    notificarOutrasAbas(`${area}/${pastaRemover}`);
  }

  return filtradas;
}

/**
 * Renomeia uma pasta criada no storage e propaga a alteração
 */
export function renomearPastaCriada(
  area: "notas" | "referencias",
  caminhoAntigo: string,
  caminhoNovo: string
): string[] {
  const atuais = carregarPastasCriadas(area);
  const semAntiga = atuais.filter((p) => p !== caminhoAntigo && !p.startsWith(`${caminhoAntigo}/`));
  const novas = atuais
    .filter((p) => p.startsWith(`${caminhoAntigo}/`))
    .map((p) => `${caminhoNovo}${p.slice(caminhoAntigo.length)}`);

  const unicas = Array.from(new Set([...semAntiga, caminhoNovo, ...novas])).sort((a, b) => a.localeCompare(b));

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(`${PREFIXO_STORAGE}${area}`, JSON.stringify(unicas));
    } catch {}

    window.dispatchEvent(
      new CustomEvent(EVENTO_PASTAS_ATUALIZADAS, {
        detail: { area, pastas: unicas, caminhoAntigo, caminhoNovo },
      })
    );

    notificarOutrasAbas(`${area}/${caminhoNovo}`);
  }

  return unicas;
}
