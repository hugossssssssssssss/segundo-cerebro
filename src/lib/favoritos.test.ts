import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  normalizarUrl,
  extrairDominio,
  obterFaviconGoogle,
  lerFavoritosLocal,
  salvarFavoritosLocal,
  agendarPersistenciaRemota,
  cancelarPersistenciaPendente,
  CHAVE_STORAGE_FAVORITOS,
  EVENTO_FAVORITOS_ATUALIZADOS,
  type FavoritoItem,
} from "./favoritos";
import type { Settings } from "./settings";
import * as github from "./github";

describe("favoritos", () => {
  beforeEach(() => {
    localStorage.clear();
    cancelarPersistenciaPendente();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cancelarPersistenciaPendente();
  });

  describe("normalizarUrl", () => {
    it("adiciona https:// quando não possui protocolo", () => {
      expect(normalizarUrl("github.com")).toBe("https://github.com");
      expect(normalizarUrl("google.com/search?q=teste")).toBe("https://google.com/search?q=teste");
    });

    it("mantém http:// ou https:// intactos", () => {
      expect(normalizarUrl("http://meusite.local")).toBe("http://meusite.local");
      expect(normalizarUrl("https://klaus.app")).toBe("https://klaus.app");
    });

    it("retorna string vazia se entrada vazia ou inválida", () => {
      expect(normalizarUrl("")).toBe("");
      expect(normalizarUrl("   ")).toBe("");
    });
  });

  describe("extrairDominio", () => {
    it("extrai hostname sem www", () => {
      expect(extrairDominio("https://www.figma.com/file/123")).toBe("figma.com");
      expect(extrairDominio("github.com/hugo")).toBe("github.com");
      expect(extrairDominio("http://sub.dominio.com.br/path")).toBe("sub.dominio.com.br");
    });

    it("retorna vazio para string inválida", () => {
      expect(extrairDominio("")).toBe("");
    });
  });

  describe("obterFaviconGoogle", () => {
    it("gera a URL correta da API do Google Favicons", () => {
      const url = obterFaviconGoogle("https://github.com/hugos");
      expect(url).toBe("https://www.google.com/s2/favicons?domain=github.com&sz=64");
    });

    it("retorna vazio se domínio for inválido", () => {
      expect(obterFaviconGoogle("")).toBe("");
    });
  });

  describe("ler e salvar local", () => {
    it("retorna array vazio quando nada salvo", () => {
      expect(lerFavoritosLocal()).toEqual([]);
    });

    it("salva e lê itens com sucesso no localStorage", () => {
      const itens: FavoritoItem[] = [
        { id: "fav-1", url: "https://github.com", nome: "GitHub" },
        { id: "fav-2", url: "https://figma.com" },
      ];

      salvarFavoritosLocal(itens);
      expect(lerFavoritosLocal()).toEqual(itens);
    });

    it("dispara evento customizado ao salvar localmente", () => {
      const spyEvento = vi.fn();
      window.addEventListener(EVENTO_FAVORITOS_ATUALIZADOS, spyEvento);

      const itens: FavoritoItem[] = [{ id: "fav-1", url: "https://dribbble.com", nome: "Dribbble" }];
      salvarFavoritosLocal(itens);

      expect(spyEvento).toHaveBeenCalled();
      window.removeEventListener(EVENTO_FAVORITOS_ATUALIZADOS, spyEvento);
    });

    it("filtra itens inválidos ou corrompidos no localStorage", () => {
      localStorage.setItem(
        CHAVE_STORAGE_FAVORITOS,
        JSON.stringify([{ id: "ok", url: "https://site.com" }, "invalido", null, { nome: "sem url" }]),
      );
      const resultado = lerFavoritosLocal();
      expect(resultado.length).toBe(1);
      expect(resultado[0].url).toBe("https://site.com");
    });
  });

  describe("agendarPersistenciaRemota com debounce", () => {
    it("salva localmente de imediato e debounces a gravação no GitHub", async () => {
      vi.useFakeTimers();

      vi.spyOn(github, "ler").mockResolvedValue({ texto: "[]", sha: "sha-antigo" });
      const spyGravar = vi.spyOn(github, "gravar").mockResolvedValue("novo-sha-123");
      const cfg: Settings = {
        nomeUsuario: "Hugo",
        profissaoUsuario: "Designer",
        onboardingConcluido: true,
        githubToken: "token-teste",
        repoOwner: "hugo",
        repoName: "segundo-cerebro-dados",
        branch: "main",
        geminiKey: "",
        geminiModel: "gemini-1.5-flash",
      };

      const itens1: FavoritoItem[] = [{ id: "1", url: "https://a.com" }];
      const itens2: FavoritoItem[] = [{ id: "1", url: "https://a.com" }, { id: "2", url: "https://b.com" }];

      // Chamada 1
      agendarPersistenciaRemota(cfg, itens1, 1000);
      expect(lerFavoritosLocal()).toEqual(itens1);
      expect(spyGravar).not.toHaveBeenCalled();

      // Avança 500ms (ainda não disparou)
      await vi.advanceTimersByTimeAsync(500);
      expect(spyGravar).not.toHaveBeenCalled();

      // Chamada 2 antes de expirar o timer
      agendarPersistenciaRemota(cfg, itens2, 1000);
      expect(lerFavoritosLocal()).toEqual(itens2);

      // Avança mais 500ms (o primeiro teria disparado aos 1000ms, mas foi cancelado pelo segundo)
      await vi.advanceTimersByTimeAsync(500);
      expect(spyGravar).not.toHaveBeenCalled();

      // Avança os 500ms restantes do segundo timer
      await vi.advanceTimersByTimeAsync(500);

      expect(spyGravar).toHaveBeenCalledTimes(1);
      expect(spyGravar).toHaveBeenCalledWith(
        cfg,
        ".klaus/favoritos.json",
        expect.stringContaining("https://b.com"),
        expect.any(String),
        "sha-antigo",
      );

      vi.useRealTimers();
    });
  });
});
