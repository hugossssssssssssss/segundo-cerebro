/**
 * Klaus App Engine
 *
 * Motor de execução, segurança, sandbox e comunicação para projetos e extensões
 * do ecossistema Klaus (.klaus/projetos/<id>/manifest.json).
 */

import type { KlausProject, KlausAppManifest, KlausPermission } from "./klaus.types";
import { lerTemaSalvo } from "./klausTheme";
import { getKlausItem, setKlausItem } from "./klausStorage";
import { dispatchKlausEvent } from "./klausEvents";

export const KLAUS_ENGINE_PROTOCOL = "klaus:engine" as const;

export interface KlausBridgeMessage {
  protocol: typeof KLAUS_ENGINE_PROTOCOL;
  id: string;
  type: "get_theme" | "get_manifest" | "dispatch_event" | "read_storage" | "write_storage";
  payload?: any;
}

export interface KlausBridgeResponse {
  protocol: typeof KLAUS_ENGINE_PROTOCOL;
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

export interface KlausThemeTokens {
  mode: "light" | "dark";
  bg: string;
  fg: string;
  card: string;
  border: string;
  primary: string;
  primaryFg: string;
  muted: string;
}

/**
 * Retorna o caminho oficial do manifesto do projeto no repositório GitHub.
 */
export function getKlausProjectManifestPath(projectId: string): string {
  const limpo = projectId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return `.klaus/projetos/${limpo}/manifest.json`;
}

/**
 * Retorna o caminho do arquivo de entrada do projeto no repositório.
 */
export function getKlausProjectEntryPath(projectId: string, entry = "index.html"): string {
  const limpo = projectId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return `.klaus/projetos/${limpo}/${entry}`;
}

/**
 * Constrói ou sintetiza um KlausAppManifest a partir de um projeto.
 */
export function buildKlausManifest(project: Partial<KlausProject>): KlausAppManifest {
  const id = project.id || "custom_project";
  const name = project.name || project.nome || "Projeto Klaus";
  const description = project.description || project.descricao || "";
  const icon = project.icon || project.icone || "FolderGit2";
  const color = project.color || project.cor;
  const category = project.category || project.categoria || "utilitarios";

  const permissions: KlausPermission[] = ["theme", "ui"];
  if (project.tipo === "codigo_customizado") {
    permissions.push("storage", "events");
  }

  return {
    id,
    name,
    version: "1.0.0",
    description,
    entry: project.tipo === "dashboard_markdown" ? "view.md" : "index.html",
    permissions,
    icon,
    color,
    category,
    theme: {
      supportsDark: true,
      accentColor: color,
    },
    sandbox: {
      allowScripts: true,
      allowPopups: true,
      allowSameOrigin: false,
    },
  };
}

/**
 * Extrai os tokens de tema CSS ativos do Klaus para injeção em extensões.
 */
export function getKlausThemeTokens(): KlausThemeTokens {
  const isDark = typeof document !== "undefined"
    ? document.documentElement.classList.contains("dark") || lerTemaSalvo() === "escuro"
    : lerTemaSalvo() === "escuro";

  if (isDark) {
    return {
      mode: "dark",
      bg: "#0f172a",
      fg: "#f8fafc",
      card: "#1e293b",
      border: "#334155",
      primary: "#f59e0b",
      primaryFg: "#0f172a",
      muted: "#94a3b8",
    };
  }

  return {
    mode: "light",
    bg: "#ffffff",
    fg: "#0f172a",
    card: "#f8fafc",
    border: "#e2e8f0",
    primary: "#d97706",
    primaryFg: "#ffffff",
    muted: "#64748b",
  };
}

/**
 * Gera o bloco CSS de variáveis de tema prontas para inserção no `<head>`.
 */
export function generateKlausThemeCss(tokens = getKlausThemeTokens()): string {
  return `
    :root {
      --klaus-theme: ${tokens.mode};
      --klaus-bg: ${tokens.bg};
      --klaus-fg: ${tokens.fg};
      --klaus-card: ${tokens.card};
      --klaus-border: ${tokens.border};
      --klaus-primary: ${tokens.primary};
      --klaus-primary-fg: ${tokens.primaryFg};
      --klaus-muted: ${tokens.muted};
      color-scheme: ${tokens.mode};
    }
    body {
      background-color: var(--klaus-bg);
      color: var(--klaus-fg);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 1rem;
    }
  `.trim();
}

/**
 * Prepara o HTML seguro de um projeto customizado, injetando CSS de variáveis e ponte JS.
 */
export function prepareKlausAppHtml(rawHtml: string, manifest?: KlausAppManifest): string {
  const tokens = getKlausThemeTokens();
  const themeCss = generateKlausThemeCss(tokens);

  const clientBridgeScript = `
    <script>
      (function() {
        window.__KLAUS_APP__ = {
          manifest: ${JSON.stringify(manifest || {})},
          theme: ${JSON.stringify(tokens)},
          call: function(type, payload) {
            return new Promise(function(resolve, reject) {
              var id = "klaus_req_" + Math.random().toString(36).slice(2);
              function onResponse(e) {
                if (e.data && e.data.protocol === "${KLAUS_ENGINE_PROTOCOL}" && e.data.id === id) {
                  window.removeEventListener("message", onResponse);
                  if (e.data.success) resolve(e.data.data);
                  else reject(new Error(e.data.error || "Bridge Error"));
                }
              }
              window.addEventListener("message", onResponse);
              window.parent.postMessage({
                protocol: "${KLAUS_ENGINE_PROTOCOL}",
                id: id,
                type: type,
                payload: payload
              }, "*");
            });
          }
        };
      })();
    </script>
  `;

  if (rawHtml.includes("<head>")) {
    return rawHtml
      .replace("<head>", `<head><style id="klaus-theme-tokens">${themeCss}</style>${clientBridgeScript}`)
      .trim();
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style id="klaus-theme-tokens">${themeCss}</style>
  ${clientBridgeScript}
</head>
<body>
  ${rawHtml}
</body>
</html>`.trim();
}

/**
 * Cria o ouvinte de comunicação bidirecional com sandbox/iframe de uma extensão.
 * Valida rigorosamente as permissões declaradas no manifesto.
 */
export function createKlausBridgeListener(
  manifest: KlausAppManifest,
  onEvent?: (event: string, detail: any) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const permissions = new Set(manifest.permissions || []);

  const handleMessage = (e: MessageEvent) => {
    const data = e.data as KlausBridgeMessage;
    if (!data || typeof data !== "object" || data.protocol !== KLAUS_ENGINE_PROTOCOL || !data.id) {
      return;
    }

    const reply = (res: Omit<KlausBridgeResponse, "protocol" | "id">) => {
      const source = e.source as Window;
      if (source && typeof source.postMessage === "function") {
        source.postMessage({ protocol: KLAUS_ENGINE_PROTOCOL, id: data.id, ...res }, "*");
      }
    };

    switch (data.type) {
      case "get_theme":
        if (!permissions.has("theme")) {
          reply({ success: false, error: "Permissão 'theme' não concedida no manifesto." });
          return;
        }
        reply({ success: true, data: getKlausThemeTokens() });
        break;

      case "get_manifest":
        reply({ success: true, data: manifest });
        break;

      case "dispatch_event":
        if (!permissions.has("events")) {
          reply({ success: false, error: "Permissão 'events' não concedida no manifesto." });
          return;
        }
        if (data.payload?.name) {
          dispatchKlausEvent(data.payload.name, data.payload.detail);
          onEvent?.(data.payload.name, data.payload.detail);
          reply({ success: true });
        } else {
          reply({ success: false, error: "Nome de evento inválido." });
        }
        break;

      case "read_storage":
        if (!permissions.has("storage")) {
          reply({ success: false, error: "Permissão 'storage' não concedida no manifesto." });
          return;
        }
        {
          const chaveApp = `klaus:app:${manifest.id}:${data.payload?.key || ""}`;
          const val = getKlausItem(chaveApp);
          reply({ success: true, data: val });
        }
        break;

      case "write_storage":
        if (!permissions.has("storage")) {
          reply({ success: false, error: "Permissão 'storage' não concedida no manifesto." });
          return;
        }
        {
          const chaveApp = `klaus:app:${manifest.id}:${data.payload?.key || ""}`;
          setKlausItem(chaveApp, String(data.payload?.value ?? ""));
          reply({ success: true });
        }
        break;

      default:
        reply({ success: false, error: `Ação desconhecida: ${(data as any).type}` });
    }
  };

  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
  };
}
