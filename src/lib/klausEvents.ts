/**
 * Klaus Event Protocol
 *
 * Barramento central de eventos padronizados do ecossistema Klaus.
 * Todos os eventos internos seguem rigorosamente a convenção "klaus:<dominio>:<acao>".
 * Inclui retrocompatibilidade transparente com os identificadores legados.
 */

export const KLAUS_EVENTS = {
  // Tema & Aparência
  THEME_CHANGE: "klaus:theme:change",
  THEME_CUSTOMIZATION_CHANGE: "klaus:theme:customization-change",

  // Navegação & Menu
  MENU_UPDATE: "klaus:menu:update",
  NAV_FAVORITES_CHANGE: "klaus:nav:favorites-change",

  // Projetos & Extensões
  PROJECTS_UPDATE: "klaus:projects:update",

  // Workspaces (Espaços de Trabalho)
  WORKSPACE_CHANGE: "klaus:workspace:change",

  // Sincronização & Preferências
  PREFERENCES_SYNC: "klaus:preferences:sync",
  SETTINGS_UPDATE: "klaus:settings:update",
  WIDGETS_CHANGE: "klaus:widgets:change",

  // Notificações & HUD
  NOTIFICATIONS_TOGGLE: "klaus:notifications:toggle",

  // Dados & Acervo de Markdown
  INVENTORY_UPDATE: "klaus:inventory:update",
} as const;

export type KlausEventType = typeof KLAUS_EVENTS[keyof typeof KLAUS_EVENTS];

/**
 * Mapeamento de eventos canônicos para seus equivalentes legados,
 * garantindo que qualquer listener antigo continue respondendo perfeitamente.
 */
const LEGACY_EVENT_BRIDGES: Record<string, string[]> = {
  [KLAUS_EVENTS.THEME_CHANGE]: ["tema-alterado"],
  [KLAUS_EVENTS.THEME_CUSTOMIZATION_CHANGE]: ["klaus-personalizacao-alterada"],
  [KLAUS_EVENTS.MENU_UPDATE]: ["menu-personalizado-atualizado"],
  [KLAUS_EVENTS.NAV_FAVORITES_CHANGE]: ["klaus-favoritos-atualizados"],
  [KLAUS_EVENTS.PROJECTS_UPDATE]: ["klaus-projetos-extensoes-atualizados"],
  [KLAUS_EVENTS.WORKSPACE_CHANGE]: ["klaus-workspace-alterado"],
  [KLAUS_EVENTS.PREFERENCES_SYNC]: ["klaus-preferencias-atualizadas"],
  [KLAUS_EVENTS.SETTINGS_UPDATE]: ["klaus-settings-atualizadas"],
  [KLAUS_EVENTS.WIDGETS_CHANGE]: ["klaus-widgets-atualizados"],
  [KLAUS_EVENTS.NOTIFICATIONS_TOGGLE]: ["klaus-notificacoes-aberto"],
  [KLAUS_EVENTS.INVENTORY_UPDATE]: ["klaus:acervo-atualizado"],
};

/**
 * Dispara um evento do protocolo Klaus no navegador.
 * Emite tanto o evento canônico padronizado quanto os eventos legados associados.
 */
export function dispatchKlausEvent<T = any>(
  event: string,
  detail?: T,
): void {
  try {
    // 1. Emite o evento canônico
    window.dispatchEvent(new CustomEvent(event, { detail }));

    // 2. Emite pontes legadas para retrocompatibilidade
    const bridges = LEGACY_EVENT_BRIDGES[event];
    if (bridges && bridges.length > 0) {
      for (const legacy of bridges) {
        window.dispatchEvent(new CustomEvent(legacy, { detail }));
      }
    }
  } catch (err) {
    console.warn(`[KlausEventBus] Falha ao disparar evento "${event}":`, err);
  }
}

/**
 * Registra um ouvinte para um evento do protocolo Klaus.
 * Retorna uma função de desinscrição para uso facilitado em useEffects.
 */
export function listenKlausEvent<T = any>(
  event: string,
  handler: (detail: T, nativeEvent: CustomEvent<T>) => void,
): () => void {
  const listener = (e: Event) => {
    const custom = e as CustomEvent<T>;
    handler(custom.detail, custom);
  };

  window.addEventListener(event, listener);

  // Também escuta a ponte legada se houver
  const bridges = LEGACY_EVENT_BRIDGES[event] || [];
  for (const legacy of bridges) {
    window.addEventListener(legacy, listener);
  }

  return () => {
    window.removeEventListener(event, listener);
    for (const legacy of bridges) {
      window.removeEventListener(legacy, listener);
    }
  };
}
