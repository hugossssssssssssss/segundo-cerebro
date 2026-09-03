import type { Settings } from "./settings";
import { ler, gravar } from "./github";

declare const chrome: any;

export interface FavoritoItem {
  id: string;
  url: string;
  nome?: string;
  criadoEm?: string;
  iconeCustomizado?: string;
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

export const FAVORITOS_PADRAO_KLAUS: FavoritoItem[] = [
  { id: "fav-notas", nome: "Notas", url: "https://hugossssssssssssss.github.io/segundo-cerebro/#/notas" },
  { id: "fav-tarefas", nome: "Tarefas", url: "https://hugossssssssssssss.github.io/segundo-cerebro/#/tarefas" },
  { id: "fav-lousas", nome: "Lousas", url: "https://hugossssssssssssss.github.io/segundo-cerebro/#/lousas" },
  { id: "fav-grafo", nome: "Grafo", url: "https://hugossssssssssssss.github.io/segundo-cerebro/#/grafo" },
  { id: "fav-pdi", nome: "PDI", url: "https://hugossssssssssssss.github.io/segundo-cerebro/#/pdi" },
  { id: "fav-inbox", nome: "Inbox", url: "https://hugossssssssssssss.github.io/segundo-cerebro/#/inbox" },
  { id: "fav-chat", nome: "Chat", url: "https://hugossssssssssssss.github.io/segundo-cerebro/#/chat" },
];

/**
 * Lê os favoritos salvos no localStorage ou chrome.storage.
 */
export function lerFavoritosLocal(opcoes: { comPadrao?: boolean } = {}): FavoritoItem[] {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_FAVORITOS);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((it) => it && typeof it === "object" && typeof it.url === "string");
      }
    }
  } catch {}

  // Se estiver em ambiente de extensão, tenta ler de chrome.storage
  try {
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      chrome.storage.local.get([CHAVE_STORAGE_FAVORITOS], (res: any) => {
        if (res && Array.isArray(res[CHAVE_STORAGE_FAVORITOS]) && res[CHAVE_STORAGE_FAVORITOS].length > 0) {
          try {
            localStorage.setItem(CHAVE_STORAGE_FAVORITOS, JSON.stringify(res[CHAVE_STORAGE_FAVORITOS]));
            window.dispatchEvent(new CustomEvent(EVENTO_FAVORITOS_ATUALIZADOS, { detail: res[CHAVE_STORAGE_FAVORITOS] }));
          } catch {}
        }
      });
    }
  } catch {}

  if (opcoes.comPadrao) {
    return FAVORITOS_PADRAO_KLAUS;
  }

  return [];
}

/**
 * Salva a lista de favoritos no localStorage e notifica a aplicação via evento.
 */
export function salvarFavoritosLocal(itens: FavoritoItem[]): void {
  try {
    localStorage.setItem(CHAVE_STORAGE_FAVORITOS, JSON.stringify(itens));
    window.dispatchEvent(new CustomEvent(EVENTO_FAVORITOS_ATUALIZADOS, { detail: itens }));
  } catch {}

  try {
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      chrome.storage.local.set({ [CHAVE_STORAGE_FAVORITOS]: itens });
    }
  } catch {}
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

let cacheFavoritosEmMemoria: { quando: number; itens: FavoritoItem[]; sha?: string } | null = null;

export function invalidarCacheFavoritos(): void {
  cacheFavoritosEmMemoria = null;
}

/**
 * Carrega os favoritos do repositório GitHub com mesclagem segura com o localStorage.
 */
export async function carregarFavoritos(
  cfg: Settings,
  { forcarRede = false }: { forcarRede?: boolean } = {},
): Promise<{ itens: FavoritoItem[]; sha?: string }> {
  const locais = lerFavoritosLocal();

  // Se já carregou nos últimos 60 segundos e não foi forçado, aproveita o cache
  if (
    !forcarRede &&
    cacheFavoritosEmMemoria &&
    Date.now() - cacheFavoritosEmMemoria.quando < 60_000
  ) {
    return { itens: cacheFavoritosEmMemoria.itens, sha: cacheFavoritosEmMemoria.sha };
  }

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

          cacheFavoritosEmMemoria = { quando: Date.now(), itens: listaFinal, sha: res.sha };
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

  cacheFavoritosEmMemoria = { quando: Date.now(), itens: locais, sha: ultimoShaFavoritos };
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

    // Busca o SHA apenas se ainda não conhecemos nenhum SHA localmente
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

    let novoSha: string;
    try {
      novoSha = await gravar(
        cfg,
        CAMINHO_FAVORITOS,
        conteudo,
        shaFinal,
        `atualiza favoritos (${itens.length} links)`,
      );
    } catch (erroGravacao: any) {
      // Se deu 409 Conflict, revalida o SHA remoto fresco e tenta novamente 1 vez
      if (erroGravacao?.status === 409 || String(erroGravacao).includes("409")) {
        const res = await ler(cfg, CAMINHO_FAVORITOS, { silenciar404: true });
        novoSha = await gravar(
          cfg,
          CAMINHO_FAVORITOS,
          conteudo,
          res.sha,
          `atualiza favoritos (${itens.length} links)`,
        );
      } else {
        throw erroGravacao;
      }
    }

    registrarShaFavoritos(novoSha);
    invalidarCacheFavoritos();
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
