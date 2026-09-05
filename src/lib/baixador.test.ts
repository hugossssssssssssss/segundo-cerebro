import { describe, it, expect, beforeEach } from "vitest";
import {
  detectarPlataforma,
  extrairIdYouTube,
  obterInstanciaCobalt,
  salvarInstanciaCobalt,
  listarHistoricoDownloads,
  adicionarAoHistoricoDownload,
  removerDoHistoricoDownload,
  limparHistoricoDownloads,
  INSTANCIAS_COBALT_PADRAO,
} from "./baixador";

describe("Módulo Baixador de Mídia", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("detectarPlataforma", () => {
    it("detecta URLs do YouTube", () => {
      expect(detectarPlataforma("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("youtube");
      expect(detectarPlataforma("https://youtu.be/dQw4w9WgXcQ")).toBe("youtube");
    });

    it("detecta URLs do Instagram", () => {
      expect(detectarPlataforma("https://www.instagram.com/reel/C123456/")).toBe("instagram");
      expect(detectarPlataforma("https://instagram.com/p/ABC123xyz")).toBe("instagram");
    });

    it("detecta URLs do TikTok", () => {
      expect(detectarPlataforma("https://www.tiktok.com/@user/video/123456789")).toBe("tiktok");
      expect(detectarPlataforma("https://vm.tiktok.com/ZM123456/")).toBe("tiktok");
    });

    it("detecta URLs do Twitter / X", () => {
      expect(detectarPlataforma("https://twitter.com/user/status/123456")).toBe("twitter");
      expect(detectarPlataforma("https://x.com/user/status/123456")).toBe("twitter");
    });

    it("detecta URLs do Facebook", () => {
      expect(detectarPlataforma("https://www.facebook.com/watch/?v=123456")).toBe("facebook");
      expect(detectarPlataforma("https://fb.watch/123456")).toBe("facebook");
    });

    it("detecta URLs do Pinterest", () => {
      expect(detectarPlataforma("https://pin.it/123456")).toBe("pinterest");
      expect(detectarPlataforma("https://www.pinterest.com/pin/123456")).toBe("pinterest");
    });

    it("detecta URLs do Reddit", () => {
      expect(detectarPlataforma("https://www.reddit.com/r/design/comments/123456/cool_video")).toBe("reddit");
      expect(detectarPlataforma("https://v.redd.it/123456")).toBe("reddit");
    });

    it("retorna 'universal' para outros links", () => {
      expect(detectarPlataforma("https://vimeo.com/123456")).toBe("universal");
      expect(detectarPlataforma("https://exemplo.com/video.mp4")).toBe("universal");
    });
  });

  describe("extrairIdYouTube", () => {
    it("extrai ID de links padrão do YouTube", () => {
      expect(extrairIdYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extrairIdYouTube("https://youtu.be/dQw4w9WgXcQ?t=10")).toBe("dQw4w9WgXcQ");
      expect(extrairIdYouTube("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extrairIdYouTube("https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share")).toBe("dQw4w9WgXcQ");
    });
  });

  describe("Instâncias Cobalt", () => {
    it("devolve a instância padrão quando não há personalizada", () => {
      expect(obterInstanciaCobalt()).toBe(INSTANCIAS_COBALT_PADRAO[0]);
    });

    it("salva e recupera uma instância personalizada", () => {
      salvarInstanciaCobalt("https://meu-cobalt.local/");
      expect(obterInstanciaCobalt()).toBe("https://meu-cobalt.local");
      salvarInstanciaCobalt("");
      expect(obterInstanciaCobalt()).toBe(INSTANCIAS_COBALT_PADRAO[0]);
    });
  });

  describe("Histórico de Downloads", () => {
    it("armazena, lista e remove itens do histórico", () => {
      expect(listarHistoricoDownloads()).toEqual([]);

      const item1 = adicionarAoHistoricoDownload({
        plataforma: "youtube",
        urlOriginal: "https://youtube.com/watch?v=123",
        urlDownload: "https://stream.cobalt.tools/123",
        nomeArquivo: "video.mp4",
        tipo: "video",
        titulo: "Vídeo de Teste",
      });

      expect(listarHistoricoDownloads().length).toBe(1);
      expect(listarHistoricoDownloads()[0].id).toBe(item1.id);

      removerDoHistoricoDownload(item1.id);
      expect(listarHistoricoDownloads()).toEqual([]);
    });

    it("limpa todo o histórico", () => {
      adicionarAoHistoricoDownload({
        plataforma: "instagram",
        urlOriginal: "https://instagram.com/reel/123",
        urlDownload: "https://stream.cobalt.tools/reel.mp4",
        nomeArquivo: "reel.mp4",
        tipo: "video",
      });
      limparHistoricoDownloads();
      expect(listarHistoricoDownloads()).toEqual([]);
    });
  });
});
