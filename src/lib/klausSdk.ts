/**
 * Klaus SDK
 *
 * Ponto de entrada canônico para manipulação de dados, repositório, busca, markdown,
 * extensões, workspaces, temas, preferências, eventos e armazenamento do ecossistema Klaus.
 * Todas as funções seguem convenções padronizadas em inglês com suporte a tipos estritos.
 */

import { CATALOGO_EXTENSOES_NATIVAS } from "./klausProjects";
import type { KlausExtension } from "./klaus.types";

// ── 1. Projetos & Extensões (Projects & Extensions) ─────────────────────────
export {
  loadKlausProjects,
  getKlausProjectById,
  saveKlausProject,
  toggleKlausExtension,
  removeKlausProject,
  syncKlausProjects,
  getActiveKlausExtensions,
} from "./klausProjects";

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
} from "./klausWorkspaces";

// ── 3. Interface & Tema (Theme & UI) ────────────────────────────────────────
export {
  loadKlausTheme,
  applyKlausTheme,
  toggleKlausTheme,
  loadKlausUiCustomization,
  applyKlausUiCustomization,
  initKlausUiCustomization,
} from "./klausTheme";

// ── 4. Navegação, Menu & Favoritos (Navigation & Favorites) ─────────────────
export {
  loadKlausMenu,
  saveKlausMenu,
  syncKlausMenu,
  resetKlausMenu,
  getKlausRouteLabel,
  syncKlausExtensionInMenu,
} from "./klausMenu";

export {
  loadKlausFavoritesLocal,
  saveKlausFavoritesLocal,
  loadKlausFavorites,
  saveKlausFavoritesRemote,
  scheduleKlausFavoritesPersistence,
  flushKlausFavorites,
} from "./klausFavorites";

// ── 5. Widgets da Página Inicial (Home Widgets) ─────────────────────────────
export {
  loadKlausWidgets,
  saveKlausWidgets,
  syncKlausWidgets,
  scheduleKlausWidgetsPersistence,
  getKlausCustomWidgetCatalog,
} from "./klausWidgets";

// ── 6. Preferências Consolidadas (Preferences) ──────────────────────────────
export {
  loadKlausPreferences,
  saveKlausPreferences,
  syncKlausPreferences,
  getKlausSyncStatus,
  scheduleKlausPreferencesPersistence,
} from "./klausPreferences";

// ── 7. Repositório & Acervo (Repo & Archive) ────────────────────────────────
export {
  loadKlausRepo,
  invalidateKlausRepoCache,
  resetKlausRepoMemory,
  filterKlausRepoFolder,
  filterKlausRepoFolderRecursive,
  updateKlausLocalCache,
  removeFromKlausLocalCache,
  getKlausExistingCache,
} from "./klausRepo";

// ── 8. Cliente GitHub Direto (GitHub Client) ────────────────────────────────
export {
  readKlausFile,
  readKlausFileOrEmpty,
  writeKlausFile,
  writeKlausBinaryFile,
  deleteKlausFile,
  commitKlausBatch,
  testKlausConnection,
  diagnoseKlausConnection,
  isKlausAuthError,
  KlausGitHubError,
} from "./klausGithub";

// ── 9. Motor de Markdown & Frontmatter ──────────────────────────────────────
export {
  parseKlausMarkdown,
  stringifyKlausMarkdown,
  getKlausProbableTitle,
  createKlausFilename,
  getKlausFreeFilename,
  mergeKlausFrontmatter,
  restoreKlausWikilinks,
  parseKlausFrontmatterList,
} from "./klausMarkdown";

// ── 10. Motor de Busca em Memória (Search Engine) ───────────────────────────
export {
  searchKlaus,
  searchKlausTools,
  groupKlausSearchResults,
  filterKlausSearchResultsByCategory,
  resetKlausSearchIndex,
} from "./klausSearch";

// ── 11. Protocolo de Eventos (Klaus Events) ─────────────────────────────────
export {
  KLAUS_EVENTS,
  dispatchKlausEvent,
  listenKlausEvent,
} from "./klausEvents";

// ── 12. Armazenamento Unificado (Klaus Storage) ──────────────────────────────
export {
  KLAUS_STORAGE,
  getKlausItem,
  setKlausItem,
  removeKlausItem,
  getKlausJson,
  setKlausJson,
} from "./klausStorage";

// ── 13. Klaus App Engine (Sandbox & Runtime) ────────────────────────────────
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

// ── 14. Klaus Package & Manifest Validator ──────────────────────────────────
export {
  KLAUS_PACKAGE_FORMAT,
  validateKlausManifest,
  packKlausExtension,
  unpackKlausExtension,
} from "./klausPackage";

// ── 16. Tarefas & Subtarefas (Tasks) ─────────────────────────────────────────
export {
  sortKlausTasks,
  getKlausTaskUrgency,
  getKlausTaskDueText,
  getKlausSubtasks,
  toggleKlausSubtask,
  addKlausSubtask,
  removeKlausSubtask,
  getKlausSubtasksProgress,
  getNextKlausRecurrenceDate,
} from "./klausTasks";

// ── 17. Metas & PDI (Goals & Milestones) ────────────────────────────────────
export {
  summarizeKlausGoals,
  getKlausStalledGoals,
  getKlausUnlinkedDeliveries,
  getKlausPendingAiDeliveries,
  KLAUS_GOALS_DIR,
  KLAUS_DELIVERIES_DIR,
} from "./klausGoals";

// ── 18. Caixa de Entrada & Lembretes (Inbox & Reminders) ────────────────────
export {
  getKlausInboxStatePath,
  formatKlausReminderTag,
  extractKlausReminders,
  compileKlausInboxItems,
  loadKlausInboxStateLocal,
  saveKlausInboxStateLocal,
  markKlausInboxItemSeenLocal,
  mergeKlausInboxStates,
  applyKlausInboxStateToFrontmatter,
} from "./klausInbox";

// ── 19. IA & Assistente Gemini (Gemini & AI) ─────────────────────────────────
export {
  chatWithKlausAi,
  transcribeAudioWithKlausAi,
  extractRemindersWithKlausAi,
  getKlausAiBaseInstruction,
  KLAUS_SAVED_PROMPTS,
  KlausGeminiError,
} from "./klausGemini";

// ── 20. Ações & Execução da IA (AI Actions & Tools) ─────────────────────────
export {
  parseKlausActionsFromCalls,
  describeKlausAction,
  executeKlausAction,
  clearKlausActionReservations,
  KLAUS_VALID_ACTION_FOLDERS,
  KLAUS_AI_TOOLS,
} from "./klausActions";

// ── 21. Ligações, Menções & Integridade (Links & References) ────────────────
export {
  buildKlausLinksIndex,
  extractKlausLinks,
  getKlausMentionsTo,
  getUniqueKlausTargets,
  filterKlausTargets,
  suggestKlausLinks,
  syncKlausRelationships,
  propagateKlausRename,
  checkKlausReferenceIntegrity,
} from "./klausLinks";

// ── 22. Referências Visuais (References & Assets) ───────────────────────────
export {
  createKlausImageFilename,
  getKlausFullImagePath,
  downloadKlausPrivateImage,
  clearKlausBlobCache,
  getAllKlausReferenceTags,
  KLAUS_REFERENCES_DIR,
  KLAUS_IMAGES_DIR,
  KLAUS_IMAGE_MAX_BYTES,
} from "./klausReferences";

// ── 23. Contatos & Organograma (Contacts & Directory) ───────────────────────
export {
  slugifyKlausContactName,
  buildKlausContactsTree,
  filterKlausContacts,
  parseKlausContactsCSV,
  exportKlausContactsCSV,
} from "./klausContacts";

// ── 24. Grafo Neural 3D (3D Neural Graph) ───────────────────────────────────
export {
  buildKlausGraph3D,
  simulateKlausGraphPhysicsStep3D,
  KLAUS_GRAPH_TYPE_COLORS,
} from "./klausGraph";

// ── 25. Lixeira Soberana (Trash & Soft Delete) ──────────────────────────────
export {
  isKlausTrashItem,
  moveToKlausTrash,
  restoreFromKlausTrash,
  listKlausTrashItems,
  KLAUS_TRASH_DIR,
} from "./klausTrash";

// ── 26. Compartilhamento Nativo (Web Share) ─────────────────────────────────
export {
  supportsKlausSharing,
  shareKlausContent,
  shareKlausNote,
  shareKlausTask,
  shareKlausReference,
} from "./klausShare";

// ── 27. Tipos Oficiais ──────────────────────────────────────────────────────
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
  KlausRepoItem,
  KlausRepoCache,
} from "./klausRepo";

export type {
  KlausDocument,
  KlausFrontmatter,
} from "./klausMarkdown";

export type {
  KlausSearchResult,
  KlausSearchFilterCategory,
} from "./klausSearch";

export type {
  KlausThemeTokens,
  KlausBridgeMessage,
  KlausBridgeResponse,
} from "./klausEngine";

export type {
  KlausExtensionBundle,
} from "./klausPackage";

export type {
  KlausGoalSummary,
} from "./klausGoals";

export type {
  KlausAction,
  KlausActionType,
} from "./klausActions";

export type {
  KlausLinkTarget,
  KlausReference,
  KlausMention,
} from "./klausLinks";

export type {
  KlausContactNode,
  KlausContactImportedCSV,
} from "./klausContacts";

export type {
  KlausGraphNodeType,
  KlausGraphNode3D,
  KlausGraphEdge3D,
  KlausGraphData3D,
} from "./klausGraph";

export type {
  KlausTrashItem,
} from "./klausTrash";

export type {
  KlausShareData,
} from "./klausShare";
