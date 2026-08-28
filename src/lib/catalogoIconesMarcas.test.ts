import { describe, it, expect } from "vitest";
import {
  sugerirIconePorUrl,
  obterUrlSimpleIcon,
  CATALOGO_ICONES_MARCAS,
  CATEGORIAS_ICONES_MARCAS,
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
      expect(CATALOGO_ICONES_MARCAS.length).toBeGreaterThan(30);
      for (const item of CATALOGO_ICONES_MARCAS) {
        expect(item.id).toBeDefined();
        expect(item.nome).toBeDefined();
        expect(CATEGORIAS_ICONES_MARCAS).toContain(item.categoria);
      }
    });
  });
});
