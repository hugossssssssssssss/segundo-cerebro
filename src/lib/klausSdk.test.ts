import { describe, it, expect, beforeEach } from "vitest";
import {
  loadKlausProjects,
  getKlausExtensionCatalog,
  getKlausProjectById,
  loadKlausWorkspaces,
  getActiveKlausWorkspace,
  loadKlausTheme,
  applyKlausTheme,
  loadKlausPreferences,
  saveKlausPreferences,
  loadKlausMenu,
  loadKlausFavoritesLocal,
  loadKlausWidgets,
  KLAUS_EVENTS,
  KLAUS_STORAGE,
  dispatchKlausEvent,
  listenKlausEvent,
  getKlausItem,
  setKlausItem,
} from "./klausSdk";

describe("Klaus SDK", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Projects & Extensions API", () => {
    it("obtém o catálogo oficial de extensões nativas do Klaus", () => {
      const catalogo = getKlausExtensionCatalog();
      expect(Array.isArray(catalogo)).toBe(true);
      expect(catalogo.length).toBeGreaterThan(0);
      expect(catalogo.some((p) => p.id === "it_tools")).toBe(true);
    });

    it("carrega projetos salvos localmente incluindo as ativas do catálogo", () => {
      const projetos = loadKlausProjects();
      expect(Array.isArray(projetos)).toBe(true);
      expect(projetos.length).toBeGreaterThan(0);
    });

    it("busca projeto específico por identificador", () => {
      const projeto = getKlausProjectById("it_tools");
      expect(projeto).toBeDefined();
      expect(projeto?.id).toBe("it_tools");
    });
  });

  describe("Workspaces API", () => {
    it("carrega lista de workspaces existentes", () => {
      const workspaces = loadKlausWorkspaces();
      expect(Array.isArray(workspaces)).toBe(true);
      expect(workspaces.length).toBeGreaterThan(0);
      expect(workspaces[0].id).toBe("pessoal");
    });

    it("identifica o workspace ativo por padrão", () => {
      const ativo = getActiveKlausWorkspace();
      expect(ativo).toBeDefined();
      expect(ativo?.id).toBe("pessoal");
    });
  });

  describe("Theme API", () => {
    it("lê tema padrão e aplica alteração de tema", () => {
      expect(loadKlausTheme()).toBe("claro");
      applyKlausTheme("dark");
      expect(loadKlausTheme()).toBe("escuro");
    });
  });

  describe("Preferences API", () => {
    it("carrega e salva preferências consolidadas via SDK", () => {
      const prefs = loadKlausPreferences();
      expect(prefs.versaoSchema).toBe(2);

      saveKlausPreferences({
        ...prefs,
        gerais: { ...prefs.gerais, tema: "escuro" },
      });

      const atualizado = loadKlausPreferences();
      expect(atualizado.gerais.tema).toBe("escuro");
    });
  });

  describe("Menu API", () => {
    it("carrega a estrutura de menu via SDK", () => {
      const menu = loadKlausMenu();
      expect(Array.isArray(menu)).toBe(true);
      expect(menu.length).toBeGreaterThan(0);
    });
  });

  describe("Favorites API", () => {
    it("carrega lista de favoritos via SDK", () => {
      const favs = loadKlausFavoritesLocal({ comPadrao: true });
      expect(Array.isArray(favs)).toBe(true);
      expect(favs.length).toBeGreaterThan(0);
    });
  });

  describe("Widgets API", () => {
    it("carrega lista de widgets via SDK", () => {
      const widgets = loadKlausWidgets();
      expect(Array.isArray(widgets)).toBe(true);
      expect(widgets.length).toBeGreaterThan(0);
    });
  });

  describe("Re-exported Protocol & Storage", () => {
    it("permite acesso transparente a eventos e armazenamento", () => {
      expect(KLAUS_EVENTS.THEME_CHANGE).toBe("klaus:theme:change");
      expect(KLAUS_STORAGE.UI_THEME).toBe("klaus:ui:theme");

      let eventoRecebido = false;
      const unlisten = listenKlausEvent(KLAUS_EVENTS.THEME_CHANGE, () => {
        eventoRecebido = true;
      });

      dispatchKlausEvent(KLAUS_EVENTS.THEME_CHANGE, "escuro");
      expect(eventoRecebido).toBe(true);
      unlisten();

      setKlausItem(KLAUS_STORAGE.UI_THEME, "escuro");
      expect(getKlausItem(KLAUS_STORAGE.UI_THEME)).toBe("escuro");
    });
  });
});
