import { describe, it, expect, vi } from "vitest";
import {
  sugerirIconePorUrl,
  obterUrlSimpleIcon,
  CATALOGO_ICONES_MARCAS,
  CATEGORIAS_ICONES_MARCAS,
  EMOJIS_POPULARES_FAVORITOS,
  buscarIconesIconify,
} from "./catalogoIconesMarcas";

describe("catalogoIconesMarcas", () => {
  describe("sugerirIconePorUrl", () => {
    it("sugere ícone do WhatsApp para URLs de whatsapp", () => {
      expect(sugerirIconePorUrl("https://web.whatsapp.com")).toBe("si:whatsapp");
      expect(sugerirIconePorUrl("https://api.whatsapp.com/send")).toBe("si:whatsapp");
      expect(sugerirIconePorUrl("wa.me/5511999999999")).toBe("si:whatsapp");
    });

    it("sugere ícone do Gmail para URLs do Gmail ou Google Mail", () => {
      expect(sugerirIconePorUrl("https://mail.google.com/mail/u/0")).toBe("si:gmail");
      expect(sugerirIconePorUrl("gmail.com")).toBe("si:gmail");
    });

    it("sugere ícone do Google Drive para drive.google.com", () => {
      expect(sugerirIconePorUrl("https://drive.google.com/drive/my-drive")).toBe("si:googledrive");
    });

    it("sugere ícones de serviços famosos como Figma, GitHub e Notion", () => {
      expect(sugerirIconePorUrl("https://www.figma.com/files")).toBe("si:figma");
      expect(sugerirIconePorUrl("https://github.com/hugos")).toBe("si:github");
      expect(sugerirIconePorUrl("https://notion.so/workspace")).toBe("si:notion");
    });

    it("sugere novos serviços de design, IA e redes", () => {
      expect(sugerirIconePorUrl("https://framer.com/projects")).toBe("si:framer");
      expect(sugerirIconePorUrl("https://webflow.com/dashboard")).toBe("si:webflow");
      expect(sugerirIconePorUrl("https://gemini.google.com")).toBe("si:googlegemini");
      expect(sugerirIconePorUrl("https://bsky.app")).toBe("si:bluesky");
    });

    it("retorna undefined para sites genéricos não catalogados", () => {
      expect(sugerirIconePorUrl("https://meu-site-pessoal.com.br")).toBeUndefined();
    });
  });

  describe("obterUrlSimpleIcon", () => {
    it("gera URL oficial do Simple Icons", () => {
      expect(obterUrlSimpleIcon("whatsapp")).toBe("https://cdn.simpleicons.org/whatsapp");
      expect(obterUrlSimpleIcon("whatsapp", "#25D366")).toBe("https://cdn.simpleicons.org/whatsapp/25D366");
    });
  });

  describe("CATALOGO_ICONES_MARCAS", () => {
    it("contém itens válidos e categorias mapeadas", () => {
      expect(CATALOGO_ICONES_MARCAS.length).toBeGreaterThan(100);
      for (const item of CATALOGO_ICONES_MARCAS) {
        expect(item.id).toBeDefined();
        expect(item.nome).toBeDefined();
        expect(CATEGORIAS_ICONES_MARCAS).toContain(item.categoria);
      }
    });

    it("contém símbolos de interface e emojis populares", () => {
      const temLucide = CATALOGO_ICONES_MARCAS.some((i) => i.id.startsWith("lucide:"));
      const temEmoji = CATALOGO_ICONES_MARCAS.some((i) => i.id.startsWith("emoji:"));
      expect(temLucide).toBe(true);
      expect(temEmoji).toBe(true);
    });
  });

  describe("EMOJIS_POPULARES_FAVORITOS", () => {
    it("possui lista rica de emojis com tags", () => {
      expect(EMOJIS_POPULARES_FAVORITOS.length).toBeGreaterThan(20);
      for (const e of EMOJIS_POPULARES_FAVORITOS) {
        expect(e.emoji).toBeDefined();
        expect(e.tags && e.tags.length).toBeGreaterThan(0);
      }
    });
  });

  describe("buscarIconesIconify", () => {
    it("retorna lista vazia para termos muito curtos", async () => {
      const res = await buscarIconesIconify("a");
      expect(res).toEqual([]);
    });

    it("faz requisição e formata resultados quando a API responde", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ icons: ["tabler:coffee", "lucide:camera"] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await buscarIconesIconify("teste-mock");
      expect(res.length).toBe(2);
      expect(res[0].id).toBe("iconify:tabler:coffee");
      expect(res[1].id).toBe("iconify:lucide:camera");

      vi.unstubAllGlobals();
    });
  });
});
