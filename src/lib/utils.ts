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
