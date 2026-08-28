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

let timerDebouncePersistencia: ReturnType<typeof setTimeout> | null = null;
let ultimosItensPendentes: FavoritoItem[] | null = null;

/**
 * Indica se há uma persistência agendada no debounce aguardando envio ao GitHub.
 */
export function temPersistenciaPendente(): boolean {
  return timerDebouncePersistencia !== null;
}

/**
 * Carrega os favoritos do repositório GitHub com mesclagem segura com o localStorage.
 */
export async function carregarFavoritos(
  cfg: Settings,
): Promise<{ itens: FavoritoItem[]; sha?: string }> {
  const locais = lerFavoritosLocal();

  // Se houver gravação pendente de envio ao GitHub no debounce, nunca sobrescreve com dados antigos
  if (temPersistenciaPendente()) {
    return { itens: locais, sha: ultimoShaFavoritos };
  }

  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { itens: locais };
  }

  try {
    const res = await ler(cfg, CAMINHO_FAVORITOS, { silenciar404: true });
    if (res?.texto) {
      const parsed = JSON.parse(res.texto);
      if (Array.isArray(parsed)) {
        const remotosValidados = parsed.filter(
          (it) => it && typeof it === "object" && typeof it.url === "string",
        );

        // Se ainda não houver gravação pendente no meio tempo:
        if (!temPersistenciaPendente()) {
          // Mesclagem inteligente: se houver favoritos criados localmente que ainda não foram para o remoto,
          // mantém eles para que o usuário NUNCA perca seus links recém adicionados.
          const idsRemotos = new Set(remotosValidados.map((r) => r.id));
          const novosLocais = locais.filter((l) => !idsRemotos.has(l.id));

          const listaFinal = [...remotosValidados, ...novosLocais];

          try {
            localStorage.setItem(CHAVE_STORAGE_FAVORITOS, JSON.stringify(listaFinal));
          } catch {}
          registrarShaFavoritos(res.sha);

          // Se havia itens locais não sincronizados, agenda a sincronização para o GitHub
          if (novosLocais.length > 0) {
            agendarPersistenciaRemota(cfg, listaFinal, 1000);
          }

          return { itens: listaFinal, sha: res.sha };
        }
      }
    }
  } catch {
    // Arquivo ainda não existe no repositório remoto: se temos favoritos locais, envia para lá
    if (locais.length > 0) {
      agendarPersistenciaRemota(cfg, locais, 1000);
    }
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

    // Busca sempre o SHA mais recente do arquivo no GitHub para evitar 409 Conflict
    let shaFinal = shaAntigo || ultimoShaFavoritos;
    try {
      const res = await ler(cfg, CAMINHO_FAVORITOS, { silenciar404: true });
      if (res?.sha) {
        shaFinal = res.sha;
      }
    } catch {
      // Arquivo novo sendo criado pela primeira vez
    }

    // ATENÇÃO À ORDEM DOS PARÂMETROS:
    // gravar(cfg, caminho, texto, sha?, mensagem?)
    const novoSha = await gravar(
      cfg,
      CAMINHO_FAVORITOS,
      conteudo,
      shaFinal,
      `atualiza favoritos (${itens.length} links)`,
    );

    registrarShaFavoritos(novoSha);
    return { ok: true, sha: novoSha };
  } catch (err: any) {
    return { ok: false, erro: err?.message || String(err) };
  }
}

/**
 * Atualiza o estado local imediatamente e agenda a persistência no GitHub.
 * Para drag-and-drop usa debounce (ex: 2.000ms); para adicionar/editar/excluir grava rapidamente (ex: 300ms).
 */
export function agendarPersistenciaRemota(
  cfg: Settings,
  itens: FavoritoItem[],
  delayMs = 500,
  aoFinalizar?: (sucesso: boolean, erro?: string) => void,
): void {
  // Salva no localStorage e emite evento imediatamente
  salvarFavoritosLocal(itens);
  ultimosItensPendentes = itens;

  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    aoFinalizar?.(true);
    return;
  }

  if (timerDebouncePersistencia) {
    clearTimeout(timerDebouncePersistencia);
  }

  timerDebouncePersistencia = setTimeout(async () => {
    timerDebouncePersistencia = null;
    ultimosItensPendentes = null;
    const res = await salvarFavoritosRemoto(cfg, itens, ultimoShaFavoritos);
    aoFinalizar?.(res.ok, res.erro);
  }, delayMs);
}

/**
 * Se houver gravação pendente no debounce quando o usuário fechar a aba/janela,
 * despacha imediatamente a gravação.
 */
export function flushPersistenciaPendente(cfg: Settings): void {
  if (timerDebouncePersistencia && ultimosItensPendentes) {
    clearTimeout(timerDebouncePersistencia);
    timerDebouncePersistencia = null;
    const itensParaSalvar = ultimosItensPendentes;
    ultimosItensPendentes = null;
    salvarFavoritosRemoto(cfg, itensParaSalvar).catch(() => {});
  }
}

/**
 * Cancela qualquer persistência pendente (ex: para testes ou descarte).
 */
export function cancelarPersistenciaPendente(): void {
  if (timerDebouncePersistencia) {
    clearTimeout(timerDebouncePersistencia);
    timerDebouncePersistencia = null;
    ultimosItensPendentes = null;
  }
}
