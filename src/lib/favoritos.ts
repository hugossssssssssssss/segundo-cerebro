import type { Settings } from "./settings";
import { ler, gravar } from "./github";

export interface FavoritoItem {
  id: string;
  url: string;
  nome?: string;
  criadoEm?: string;
}

export const CAMINHO_FAVORITOS = ".klaus/favoritos.json";
export const CHAVE_STORAGE_FAVORITOS = "klaus_favoritos";
export const EVENTO_FAVORITOS_ATUALIZADOS = "klaus-favoritos-atualizados";

/**
 * Normaliza uma URL garantindo o prefixo https:// caso nenhum protocolo seja informado.
 */
export function normalizarUrl(url: string): string {
  const limpa = (url || "").trim();
  if (!limpa) return "";
  if (/^https?:\/\//i.test(limpa)) {
    return limpa;
  }
  return `https://${limpa}`;
}

/**
 * Extrai com segurança o domínio/hostname da URL para obter o favicon.
 */
export function extrairDominio(url: string): string {
  try {
    const u = normalizarUrl(url);
    const parsed = new URL(u);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

/**
 * Retorna a URL do serviço de Favicons do Google para o domínio especificado.
 */
export function obterFaviconGoogle(url: string): string {
  const dominio = extrairDominio(url);
  if (!dominio) return "";
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(dominio)}&sz=64`;
}

/**
 * Lê os favoritos salvos no localStorage (rápido e offline-first).
 */
export function lerFavoritosLocal(): FavoritoItem[] {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_FAVORITOS);
    if (!salvo) return [];
    const parsed = JSON.parse(salvo);
    if (Array.isArray(parsed)) {
      return parsed.filter((it) => it && typeof it === "object" && typeof it.url === "string");
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Salva a lista de favoritos no localStorage e notifica a aplicação via evento.
 */
export function salvarFavoritosLocal(itens: FavoritoItem[]): void {
  try {
    localStorage.setItem(CHAVE_STORAGE_FAVORITOS, JSON.stringify(itens));
    window.dispatchEvent(new CustomEvent(EVENTO_FAVORITOS_ATUALIZADOS, { detail: itens }));
  } catch {
    // Ignora possíveis erros de quota no localStorage
  }
}

let ultimoShaFavoritos: string | undefined = undefined;

/**
 * Registra o SHA conhecido de .klaus/favoritos.json
 */
export function registrarShaFavoritos(sha?: string): void {
  if (sha) ultimoShaFavoritos = sha;
}

/**
 * Obtém o último SHA registrado de .klaus/favoritos.json
 */
export function obterShaFavoritos(): string | undefined {
  return ultimoShaFavoritos;
}

/**
 * Carrega os favoritos do repositório GitHub com fallback para o localStorage.
 */
export async function carregarFavoritos(
  cfg: Settings,
): Promise<{ itens: FavoritoItem[]; sha?: string }> {
  const locais = lerFavoritosLocal();

  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { itens: locais };
  }

  try {
    const res = await ler(cfg, CAMINHO_FAVORITOS, { silenciar404: true });
    if (res?.texto) {
      const parsed = JSON.parse(res.texto);
      if (Array.isArray(parsed)) {
        const itensValidados = parsed.filter(
          (it) => it && typeof it === "object" && typeof it.url === "string",
        );
        salvarFavoritosLocal(itensValidados);
        registrarShaFavoritos(res.sha);
        return { itens: itensValidados, sha: res.sha };
      }
    }
  } catch {
    // Arquivo ainda não existe no repositório ou erro transitório
  }

  return { itens: locais, sha: ultimoShaFavoritos };
}

/**
 * Grava a lista atualizada de favoritos no repositório GitHub.
 */
export async function salvarFavoritosRemoto(
  cfg: Settings,
  itens: FavoritoItem[],
  shaAntigo?: string,
): Promise<{ ok: boolean; sha?: string; erro?: string }> {
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { ok: false, erro: "Configuração do GitHub incompleta." };
  }

  try {
    const conteudo = JSON.stringify(itens, null, 2);
    let shaFinal = shaAntigo || ultimoShaFavoritos;

    if (!shaFinal) {
      try {
        const res = await ler(cfg, CAMINHO_FAVORITOS, { silenciar404: true });
        if (res?.sha) {
          shaFinal = res.sha;
        }
      } catch {
        // Arquivo novo sendo criado pela primeira vez
      }
    }

    const novoSha = await gravar(
      cfg,
      CAMINHO_FAVORITOS,
      conteudo,
      `atualiza favoritos (${itens.length} links)`,
      shaFinal,
    );

    registrarShaFavoritos(novoSha);
    return { ok: true, sha: novoSha };
  } catch (err: any) {
    return { ok: false, erro: err?.message || String(err) };
  }
}

let timerDebouncePersistencia: ReturnType<typeof setTimeout> | null = null;

/**
 * Atualiza o estado local imediatamente e agenda a persistência no GitHub com debounce (2.500ms).
 * Isso evita disparar dezenas de commits ao reordenar favoritos seguidamente via drag-and-drop.
 */
export function agendarPersistenciaRemota(
  cfg: Settings,
  itens: FavoritoItem[],
  delayMs = 2500,
  aoFinalizar?: (sucesso: boolean, erro?: string) => void,
): void {
  // Salva no localStorage e emite evento imediatamente
  salvarFavoritosLocal(itens);

  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    aoFinalizar?.(true);
    return;
  }

  if (timerDebouncePersistencia) {
    clearTimeout(timerDebouncePersistencia);
  }

  timerDebouncePersistencia = setTimeout(async () => {
    timerDebouncePersistencia = null;
    const res = await salvarFavoritosRemoto(cfg, itens, ultimoShaFavoritos);
    aoFinalizar?.(res.ok, res.erro);
  }, delayMs);
}

/**
 * Cancela qualquer persistência pendente (ex: para testes ou descarte).
 */
export function cancelarPersistenciaPendente(): void {
  if (timerDebouncePersistencia) {
    clearTimeout(timerDebouncePersistencia);
    timerDebouncePersistencia = null;
  }
}
