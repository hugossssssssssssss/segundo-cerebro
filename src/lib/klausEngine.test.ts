import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getKlausProjectManifestPath,
  getKlausProjectEntryPath,
  buildKlausManifest,
  getKlausThemeTokens,
  generateKlausThemeCss,
  prepareKlausAppHtml,
  createKlausBridgeListener,
  KLAUS_ENGINE_PROTOCOL,
} from "./klausEngine";
import type { KlausAppManifest } from "./klaus.types";

describe("Klaus App Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Manifest Paths & Synthesis", () => {
    it("gera caminho padronizado do manifesto do projeto", () => {
      const path = getKlausProjectManifestPath("Meu Projeto 2026");
      expect(path).toBe(".klaus/projetos/meu_projeto_2026/manifest.json");
    });

    it("gera caminho do arquivo de entrada padrão", () => {
      const path = getKlausProjectEntryPath("dashboard", "view.md");
      expect(path).toBe(".klaus/projetos/dashboard/view.md");
    });

    it("sintetiza um manifesto completo a partir de um projeto simples", () => {
      const manifest = buildKlausManifest({
        id: "meu_app",
        nome: "Meu App Criativo",
        descricao: "Uma extensão customizada",
        tipo: "codigo_customizado",
        cor: "#3b82f6",
      });

      expect(manifest.id).toBe("meu_app");
      expect(manifest.name).toBe("Meu App Criativo");
      expect(manifest.version).toBe("1.0.0");
      expect(manifest.permissions).toContain("storage");
      expect(manifest.permissions).toContain("events");
      expect(manifest.permissions).toContain("theme");
      expect(manifest.theme?.accentColor).toBe("#3b82f6");
    });
  });

  describe("Theme Tokens & CSS Injection", () => {
    it("extrai tokens de tema válidos", () => {
      const tokens = getKlausThemeTokens();
      expect(tokens.mode).toBeDefined();
      expect(tokens.bg).toBeDefined();
      expect(tokens.primary).toBeDefined();
    });

    it("gera variáveis de tema CSS prontas", () => {
      const css = generateKlausThemeCss();
      expect(css).toContain("--klaus-theme");
      expect(css).toContain("--klaus-bg");
      expect(css).toContain("--klaus-primary");
    });

    it("injeta tema e ponte de scripts no HTML do app", () => {
      const htmlOriginal = "<h1>Olá Klaus</h1>";
      const preparado = prepareKlausAppHtml(htmlOriginal);

      expect(preparado).toContain("<style id=\"klaus-theme-tokens\">");
      expect(preparado).toContain("window.__KLAUS_APP__");
      expect(preparado).toContain("Olá Klaus");
    });
  });

  describe("Security Bridge Listener", () => {
    it("cria e remove listener da ponte com sucesso", () => {
      const manifest: KlausAppManifest = {
        id: "teste_app",
        name: "Teste",
        version: "1.0.0",
        entry: "index.html",
        permissions: ["theme"],
      };

      const cleanup = createKlausBridgeListener(manifest);
      expect(typeof cleanup).toBe("function");
      cleanup();
    });

    it("responde requisição de tema quando permissão existe", () => {
      const manifest: KlausAppManifest = {
        id: "teste_app",
        name: "Teste",
        version: "1.0.0",
        entry: "index.html",
        permissions: ["theme"],
      };

      const cleanup = createKlausBridgeListener(manifest);

      const fakeSource = {
        postMessage: vi.fn(),
      };

      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            protocol: KLAUS_ENGINE_PROTOCOL,
            id: "req_123",
            type: "get_theme",
          },
          source: fakeSource as any,
        }),
      );

      expect(fakeSource.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: KLAUS_ENGINE_PROTOCOL,
          id: "req_123",
          success: true,
          data: expect.objectContaining({ mode: expect.any(String) }),
        }),
        "*",
      );

      cleanup();
    });

    it("bloqueia requisição de storage quando permissão não foi declarada", () => {
      const manifestSemStorage: KlausAppManifest = {
        id: "sem_perm",
        name: "Sem Permissão",
        version: "1.0.0",
        entry: "index.html",
        permissions: ["theme"], // sem "storage"
      };

      const cleanup = createKlausBridgeListener(manifestSemStorage);
      const fakeSource = {
        postMessage: vi.fn(),
      };

      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            protocol: KLAUS_ENGINE_PROTOCOL,
            id: "req_storage",
            type: "read_storage",
            payload: { key: "segredo" },
          },
          source: fakeSource as any,
        }),
      );

      expect(fakeSource.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: KLAUS_ENGINE_PROTOCOL,
          id: "req_storage",
          success: false,
          error: expect.stringContaining("Permissão 'storage' não concedida"),
        }),
        "*",
      );

      cleanup();
    });
  });
});
