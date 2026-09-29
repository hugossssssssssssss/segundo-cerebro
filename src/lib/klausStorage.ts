/**
 * Klaus Storage Namespace
 *
 * Padronização de todas as chaves de persistência local no navegador sob o namespace "klaus:<dominio>".
 * Implementa leitura com migração automática a partir das chaves legadas ("segundo-cerebro:*" e "klaus_*")
 * e gravação em espelho para não quebrar sessões ativas ou extensões.
 */

export const KLAUS_STORAGE = {
  // Autenticação & Credenciais
  AUTH_CREDENTIALS: "klaus:auth:credentials",
  AUTH_DEVICE_SALT: "klaus:auth:device-salt",
  AUTH_GLOBAL_TOKEN: "klaus:auth:global-token",

  // Espaços de Trabalho (Workspaces)
  WORKSPACES_LIST: "klaus:workspaces:list",
  WORKSPACES_ACTIVE: "klaus:workspaces:active",

  // Navegação, Menu & Favoritos
  NAV_MENU: "klaus:nav:menu",
  NAV_FAVORITES: "klaus:nav:favorites",

  // Projetos & Extensões
  PROJECTS_REGISTRY: "klaus:projects:registry",

  // Interface do Usuário (UI & Tema)
  UI_THEME: "klaus:ui:theme",
  UI_SIDEBAR_COLLAPSED: "klaus:ui:sidebar-collapsed",
  UI_FONT_SIZE: "klaus:ui:font-size",

  // Preferências Globais & Sincronização
  PREFERENCES_GENERAL: "klaus:preferences:general",
  PREFERENCES_SYNC_STATUS: "klaus:preferences:sync-status",
  WIDGETS_HOME: "klaus:widgets:home",
  HOME_EDIT_MODE: "klaus:home:edit-mode",
  SEARCH_FAVORITES: "klaus:search:favorites",
} as const;

export type KlausStorageKey = typeof KLAUS_STORAGE[keyof typeof KLAUS_STORAGE];

/**
 * Mapeamento das chaves legadas associadas a cada chave canônica padronizada.
 */
const LEGACY_STORAGE_MAP: Record<string, string[]> = {
  [KLAUS_STORAGE.AUTH_CREDENTIALS]: ["segundo-cerebro:config:enc", "klaus_settings_enc"],
  [KLAUS_STORAGE.AUTH_DEVICE_SALT]: ["segundo-cerebro:device-salt", "klaus_device_salt"],
  [KLAUS_STORAGE.AUTH_GLOBAL_TOKEN]: ["segundo-cerebro:token-global-base"],
  [KLAUS_STORAGE.WORKSPACES_LIST]: ["segundo-cerebro:workspaces"],
  [KLAUS_STORAGE.WORKSPACES_ACTIVE]: ["segundo-cerebro:workspace-ativo"],
  [KLAUS_STORAGE.NAV_MENU]: ["klaus_menu_customizado"],
  [KLAUS_STORAGE.NAV_FAVORITES]: ["klaus_favoritos"],
  [KLAUS_STORAGE.PROJECTS_REGISTRY]: ["klaus_projetos_extensoes"],
  [KLAUS_STORAGE.UI_THEME]: ["tema", "klaus_tema_v1"],
  [KLAUS_STORAGE.UI_SIDEBAR_COLLAPSED]: ["sidebar-colapsada"],
  [KLAUS_STORAGE.UI_FONT_SIZE]: ["klaus_tamanho_fonte_menu"],
  [KLAUS_STORAGE.PREFERENCES_GENERAL]: ["klaus_preferencias_gerais"],
  [KLAUS_STORAGE.PREFERENCES_SYNC_STATUS]: ["klaus_sync_status_preferencias"],
  [KLAUS_STORAGE.WIDGETS_HOME]: ["klaus_home_bento_config_v3", "klaus_widgets_home_config"],
  [KLAUS_STORAGE.HOME_EDIT_MODE]: ["klaus_home_modo_edicao"],
  [KLAUS_STORAGE.SEARCH_FAVORITES]: ["klaus_favoritos_busca"],
};

/**
 * Lê um valor do armazenamento Klaus.
 * Se a chave canônica não existir, busca nas chaves legadas e migra transparentemente.
 */
export function getKlausItem(chaveCanon: string, fallbackPadrao: string | null = null): string | null {
  try {
    // 1. Tenta obter pela chave canônica padronizada
    const valorCanonico = localStorage.getItem(chaveCanon);
    if (valorCanonico !== null) {
      return valorCanonico;
    }

    // 2. Se não existir, verifica chaves legadas
    const legadas = LEGACY_STORAGE_MAP[chaveCanon] || [];
    for (const legada of legadas) {
      const valorLegado = localStorage.getItem(legada);
      if (valorLegado !== null) {
        // Auto-migração: salva na chave canônica padronizada
        try {
          localStorage.setItem(chaveCanon, valorLegado);
        } catch {}
        return valorLegado;
      }
    }
  } catch (err) {
    console.warn(`[KlausStorage] Erro ao ler chave "${chaveCanon}":`, err);
  }

  return fallbackPadrao;
}

/**
 * Salva um valor no armazenamento Klaus.
 * Grava na chave canônica e atualiza as chaves legadas correspondentes para garantir retrocompatibilidade.
 */
export function setKlausItem(chaveCanon: string, valor: string): boolean {
  try {
    localStorage.setItem(chaveCanon, valor);

    // Grava também nas chaves legadas correspondentes para retrocompatibilidade
    const legadas = LEGACY_STORAGE_MAP[chaveCanon];
    if (legadas) {
      for (const legada of legadas) {
        try {
          localStorage.setItem(legada, valor);
        } catch {}
      }
    }

    return true;
  } catch (err) {
    console.error(`[KlausStorage] Erro ao salvar chave "${chaveCanon}":`, err);
    return false;
  }
}

/**
 * Remove um valor do armazenamento Klaus em todas as suas variações.
 */
export function removeKlausItem(chaveCanon: string): boolean {
  try {
    localStorage.removeItem(chaveCanon);

    const legadas = LEGACY_STORAGE_MAP[chaveCanon] || [];
    for (const legada of legadas) {
      localStorage.removeItem(legada);
    }

    return true;
  } catch (err) {
    console.error(`[KlausStorage] Erro ao remover chave "${chaveCanon}":`, err);
    return false;
  }
}

/**
 * Obtém e faz o parse de JSON de forma segura.
 */
export function getKlausJson<T = any>(chaveCanon: string, fallback: T = null as unknown as T): T {
  const bruto = getKlausItem(chaveCanon);
  if (!bruto) return fallback;
  try {
    return JSON.parse(bruto) as T;
  } catch {
    return fallback;
  }
}

/**
 * Serializa e salva um objeto JSON no armazenamento Klaus.
 */
export function setKlausJson<T = any>(chaveCanon: string, valor: T): boolean {
  try {
    const stringificado = JSON.stringify(valor);
    return setKlausItem(chaveCanon, stringificado);
  } catch {
    return false;
  }
}
