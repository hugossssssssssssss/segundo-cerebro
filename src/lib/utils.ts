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

/**
 * Converte data ISO ("2026-08-17") ou com hora ("2026-08-17 15:00") para o formato pt-BR
 * ("17/08/26" ou "17/08/26 às 15:00").
 */
export function formatarDataPtBR(iso?: string): string {
  if (!iso) return "";
  const partes = iso.trim().split(" ");
  const dataParte = partes[0];
  const horaParte = partes[1];

  const m = dataParte.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;

  const ano = m[1].slice(2);
  const mes = m[2];
  const dia = m[3];
  const dataFormatada = `${dia}/${mes}/${ano}`;

  if (horaParte) {
    const hm = horaParte.slice(0, 5);
    return `${dataFormatada} às ${hm}`;
  }

  return dataFormatada;
}

/** Traduz status técnicos (ex: "a-fazer" -> "Pendente"). */
export function rotuloStatusAmigavel(status?: string): string {
  if (!status) return "Pendente";
  const s = status.toLowerCase().trim();
  if (s === "a-fazer" || s === "afazer" || s === "a fazer") return "Pendente";
  if (s === "fazendo" || s === "em-andamento") return "Em andamento";
  if (s === "feito" || s === "concluido" || s === "concluida") return "Concluída";
  return status;
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

/** Lê parâmetros de criação rápida (?nova=true, ?novo=true, ?nova_meta=true, ?upload=true) da URL ou hash. */
export function lerParametroCriar(
  loc: { search: string; hash: string },
  chaves: string[] = ["nova", "novo", "nova_meta", "upload", "pomodoro"]
): boolean {
  const paramsSearch = new URLSearchParams(loc.search);
  for (const c of chaves) {
    if (paramsSearch.get(c) === "true" || paramsSearch.has(c)) return true;
  }
  const href = window.location.href;
  for (const c of chaves) {
    if (loc.hash.includes(`${c}=true`) || href.includes(`${c}=true`)) return true;
  }
  return false;
}

/** Tira acentos de uma string para buscas e slugs. */
export function removerAcentos(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Verifica se um texto contém o termo de busca, tolerante a maiúsculas/minúsculas,
 * acentos e trechos internos da palavra (ex: "uinho" encontra "Huguinho").
 */
export function correspondeBusca(texto: string | undefined | null, termo: string | undefined | null): boolean {
  if (!termo || !termo.trim()) return true;
  if (!texto) return false;
  const termoNorm = removerAcentos(termo.trim().toLowerCase());
  const textoNorm = removerAcentos(texto.toLowerCase());
  return textoNorm.includes(termoNorm);
}

/**
 * Converte um caminho de arquivo técnico (ex: "tarefas/2026-08-13-fazer-a-capa.md")
 * em um título legível e amigável para notificações (ex: "Fazer a capa").
 */
export function formatarNomeAmigavel(caminhoOuNome: string): string {
  if (!caminhoOuNome) return "Item";
  const base = caminhoOuNome.split("/").pop() || caminhoOuNome;
  let limpo = base.replace(/\.(md|json)$/i, "");
  limpo = limpo.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  limpo = limpo.replace(/[-_]/g, " ").trim();
  if (!limpo) return "Item";
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

/**
 * Converte um caminho técnico (ex: "pdi/metas/2026-08-13-meta.md" ou "notas/projetos/klaus.md")
 * em uma trilha de pastas amigável e legível (ex: "PDI › Metas" ou "Notas › Projetos").
 */
export function formatarCaminhoAmigavel(caminho: string): string {
  if (!caminho) return "Raiz";
  const pedacos = caminho.split("/").filter(Boolean);
  const pastas = pedacos.slice(0, -1);
  if (pastas.length === 0) {
    const unica = pedacos[0]?.toLowerCase() || "";
    const mapaRaiz: Record<string, string> = {
      notas: "Notas",
      tarefas: "Tarefas",
      referencias: "Referências",
      lousas: "Lousas",
      contatos: "Contatos",
      pdi: "PDI",
    };
    return mapaRaiz[unica] || "Geral";
  }

  const mapaPastas: Record<string, string> = {
    notas: "Notas",
    tarefas: "Tarefas",
    pdi: "PDI",
    metas: "Metas",
    entregas: "Entregas",
    referencias: "Referências",
    lousas: "Lousas",
    contatos: "Contatos",
    projetos: "Projetos",
    estudos: "Estudos",
    diario: "Diário",
    livros: "Livros",
    financas: "Finanças",
    trabalho: "Trabalho",
    pessoal: "Pessoal",
  };

  return pastas
    .map((p) => mapaPastas[p.toLowerCase()] || formatarNomeAmigavel(p))
    .join(" › ");
}

/**
 * Garante um título limpo e legível para documentos, removendo extensões .md/.json,
 * carimbos de data no nome e convertendo kebab-case para formato legível quando necessário.
 */
export function formatarTituloAmigavel(tituloOriginal?: string, nomeArquivo?: string): string {
  let t = (tituloOriginal || "").trim();
  if (!t && nomeArquivo) {
    t = nomeArquivo;
  }
  if (!t) return "Sem título";

  // Se o título for apenas o nome técnico do arquivo (ex: "2026-08-13-minha-tarefa.md")
  if (
    t.endsWith(".md") ||
    t.endsWith(".json") ||
    /^\d{4}-\d{2}-\d{2}-/.test(t) ||
    (!t.includes(" ") && t.includes("-"))
  ) {
    return formatarNomeAmigavel(t);
  }

  return t;
}

/**
 * Detecta se o sistema operacional do usuário é macOS / iOS ou Windows / Linux / Android.
 */
export function ehMac(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return true;
  const platform =
    (navigator as any)?.userAgentData?.platform ||
    navigator?.platform ||
    navigator?.userAgent ||
    "";
  return /Mac|iPhone|iPod|iPad/i.test(platform);
}

/**
 * Formata atalhos de teclado conforme o sistema operacional:
 * No macOS/iOS: exibe formato Apple (ex: "⌘K", "⌘J", "⌘B").
 * No Windows/Linux/outros: exibe formato Windows (ex: "Ctrl+K", "Ctrl+J", "Ctrl+B").
 */
export function formatarAtalho(atalho?: string): string {
  if (!atalho) return "";
  const mac = ehMac();
  if (mac) {
    return atalho.replace(/Ctrl\+/gi, "⌘").replace(/Cmd\+/gi, "⌘");
  }
  return atalho.replace(/⌘/g, "Ctrl+").replace(/Cmd\+/gi, "Ctrl+");
}

