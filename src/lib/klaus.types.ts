/**
 * Klaus Core Types
 *
 * Interfaces e tipos canônicos padronizados do ecossistema Klaus.
 * Seguem a convenção formal em inglês com suporte transparente e retrocompatível
 * às definições legadas da aplicação.
 */

// ── 1. Projetos & Extensões ─────────────────────────────────────────────────

export type KlausExtensionType =
  | "native"
  | "embed_url"
  | "custom_code"
  | "markdown_dashboard"
  | "nativa"
  | "url_integrada"
  | "codigo_customizado"
  | "dashboard_markdown";

export type KlausExtensionCategory =
  | "design"
  | "productivity"
  | "ai"
  | "utilities"
  | "personal"
  | "produtividade"
  | "ia"
  | "utilitarios"
  | "pessoal";

export type KlausExtensionOrigin = "catalog" | "user" | "catalogo" | "usuario";

export interface KlausProject {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  cor?: string;
  categoria: KlausExtensionCategory;
  tipo: KlausExtensionType;
  ativo: boolean;
  origem: KlausExtensionOrigin;
  rota?: string;
  urlEmbed?: string;
  codigoHtml?: string;
  caminhoPastaMarkdown?: string;
  criadoEm?: string;
  atualizadoEm?: string;

  // Nomes canônicos em inglês (opcionais para interoperabilidade)
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: KlausExtensionCategory;
  type?: KlausExtensionType;
  active?: boolean;
  origin?: KlausExtensionOrigin;
  route?: string;
  embedUrl?: string;
  customHtml?: string;
  markdownFolderPath?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type KlausExtension = KlausProject;

// ── 2. Espaços de Trabalho (Workspaces) ─────────────────────────────────────

export type KlausWorkspaceType = "personal" | "team" | "pessoal" | "equipe";

export interface KlausWorkspace {
  id: string;
  nome: string;
  tipo: "pessoal" | "equipe";
  repoOwner: string;
  repoName: string;
  branch: string;
  githubToken?: string;
  cor?: string;
  icone?: string;

  // Nomes canônicos em inglês
  name?: string;
  type?: KlausWorkspaceType;
  color?: string;
  icon?: string;
}

// ── 3. Interface & Tema ─────────────────────────────────────────────────────

export type KlausThemeMode = "light" | "dark" | "claro" | "escuro";

export type KlausDarkVariation =
  | "padrao"
  | "oled"
  | "meia-noite"
  | "grafite"
  | "sepia"
  | "standard"
  | "midnight"
  | "graphite";

export type KlausAccentColor =
  | "padrao"
  | "azul"
  | "esmeralda"
  | "violeta"
  | "rose"
  | "grafite"
  | "amber"
  | "sapphire"
  | "emerald"
  | "violet";

export type KlausFontScale =
  | "compacta"
  | "padrao"
  | "confortavel"
  | "ampla"
  | "media"
  | "grande"
  | "compact"
  | "normal"
  | "comfortable"
  | "spacious";

export interface KlausThemeConfig {
  mode: KlausThemeMode;
  darkVariation?: KlausDarkVariation;
  accent?: KlausAccentColor;
  globalFontScale?: KlausFontScale;
  menuFontSize?: KlausFontScale;
}

// ── 4. Preferências & Sincronização ─────────────────────────────────────────

export interface KlausGeneralPreferences {
  tema?: "claro" | "escuro";
  modoEdicaoHome?: boolean;
  favoritosBusca?: string[];
  atualizadoEm?: string;
  theme?: KlausThemeMode;
  homeEditMode?: boolean;
  searchFavorites?: string[];
  updatedAt?: string;
}

export interface KlausSyncStatus {
  sucesso: boolean;
  emAndamento: boolean;
  ultimaSincronizacao?: string;
  erro?: string;
  success?: boolean;
  inProgress?: boolean;
  lastSyncedAt?: string;
  error?: string;
}
