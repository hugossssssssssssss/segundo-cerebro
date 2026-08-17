import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Junta classes do Tailwind resolvendo conflitos. Padrão do shadcn/ui. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "2026-08-13" -> "13 de agosto" */
export function dataCurta(iso?: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

/** Quantos dias faltam (negativo = atrasado). */
export function diasAte(iso?: string): number | null {
  if (!iso) return null;
  const alvo = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(alvo.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

/**
 * Data de hoje no fuso LOCAL, não em UTC.
 *
 * `toISOString()` converte para UTC: às 22h no horário de Brasília ele já
 * devolve o dia seguinte. Isso fazia o app e o calendário discordarem sobre
 * que dia é hoje, toda noite depois das 21h.
 */
export function hojeISO(): string {
  return dataISO(new Date());
}

/** AAAA-MM-DD de uma data qualquer, no fuso local. */
export function dataISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** AAAA-MM-DD de uma data qualquer, no fuso local. */
export function dataHojeISO(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Lê parâmetro "abrir" tanto da query string quanto do hash da URL em HashRouter SPA. */
export function lerParametroAbrir(loc: { search: string; hash: string }): string | null {
  const paramsSearch = new URLSearchParams(loc.search);
  const abrirSearch = paramsSearch.get("abrir");
  if (abrirSearch) return abrirSearch;

  const matchHash = loc.hash.match(/[?&]abrir=([^&]+)/) || window.location.href.match(/[?&]abrir=([^&]+)/);
  if (matchHash) {
    return decodeURIComponent(matchHash[1]);
  }

  return null;
}

/** Tira acentos de uma string para buscas e slugs. */
export function removerAcentos(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Verifica se um texto contém o termo de busca, tolerante a maiúsculas/minúsculas,
 * acentos e trechos internos da palavra (ex: "uinho" encontra "Huguinho").
 */
export function correspondeBusca(texto: string | undefined | null, termo: string): boolean {
  if (!texto || !termo) return false;
  const termoNorm = removerAcentos(termo.trim().toLowerCase());
  if (!termoNorm) return true;
  const textoNorm = removerAcentos(texto.toLowerCase());
  return textoNorm.includes(termoNorm);
}

