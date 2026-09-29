/**
 * Klaus SDK
 *
 * Ponto de entrada canônico para manipulação de dados, extensões, workspaces,
 * temas, preferências, eventos e armazenamento do ecossistema Klaus.
 * Todas as funções seguem convenções padronizadas em inglês com suporte a tipos estritos.
 */

import { CATALOGO_EXTENSOES_NATIVAS } from "./projetosExtensoes";
import type { KlausExtension } from "./klaus.types";

// ── 1. Projetos & Extensões ─────────────────────────────────────────────────
export {
  loadKlausProjects,
  getKlausProjectById,
  saveKlausProject,
  toggleKlausExtension,
  removeKlausProject,
  syncKlausProjects,
} from "./projetosExtensoes";

export function getKlausExtensionCatalog(): KlausExtension[] {
  return CATALOGO_EXTENSOES_NATIVAS;
}

// ── 2. Espaços de Trabalho (Workspaces) ─────────────────────────────────────
export {
  loadKlausWorkspaces,
  getActiveKlausWorkspace,
  setActiveKlausWorkspace,
  saveKlausWorkspace,
  removeKlausWorkspace,
} from "./workspaces";

// ── 3. Interface & Tema (Theme & UI) ────────────────────────────────────────
export {
  loadKlausTheme,
  applyKlausTheme,
  loadKlausUiCustomization,
  applyKlausUiCustomization,
} from "./tema";

// ── 4. Preferências Consolidadas (Preferences) ──────────────────────────────
export {
  loadKlausPreferences,
  saveKlausPreferences,
  syncKlausPreferences,
} from "./preferenciasApp";

// ── 5. Protocolo de Eventos (Klaus Events) ──────────────────────────────────
export {
  KLAUS_EVENTS,
  dispatchKlausEvent,
  listenKlausEvent,
} from "./klausEvents";

// ── 6. Armazenamento Unificado (Klaus Storage) ───────────────────────────────
export {
  KLAUS_STORAGE,
  getKlausItem,
  setKlausItem,
  removeKlausItem,
  getKlausJson,
  setKlausJson,
} from "./klausStorage";

// ── 7. Klaus App Engine (Sandbox & Runtime) ─────────────────────────────────
export {
  KLAUS_ENGINE_PROTOCOL,
  buildKlausManifest,
  getKlausProjectManifestPath,
  getKlausProjectEntryPath,
  getKlausThemeTokens,
  generateKlausThemeCss,
  prepareKlausAppHtml,
  createKlausBridgeListener,
} from "./klausEngine";

// ── 8. Klaus Package & Manifest Validator ───────────────────────────────────
export {
  KLAUS_PACKAGE_FORMAT,
  validateKlausManifest,
  packKlausExtension,
  unpackKlausExtension,
} from "./klausPackage";

// ── 9. Tipos Oficiais ───────────────────────────────────────────────────────
export type {
  KlausProject,
  KlausExtension,
  KlausExtensionType,
  KlausExtensionCategory,
  KlausExtensionOrigin,
  KlausAppManifest,
  KlausPermission,
  KlausWorkspace,
  KlausWorkspaceType,
  KlausThemeMode,
  KlausThemeConfig,
  KlausDarkVariation,
  KlausAccentColor,
  KlausFontScale,
  KlausGeneralPreferences,
  KlausSyncStatus,
} from "./klaus.types";

export type {
  KlausThemeTokens,
  KlausBridgeMessage,
  KlausBridgeResponse,
} from "./klausEngine";

export type {
  KlausExtensionBundle,
} from "./klausPackage";
