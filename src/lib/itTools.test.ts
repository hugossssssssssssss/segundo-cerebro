import { describe, it, expect } from "vitest";
import {
  converterUnidades,
  calcularAspectRatio,
  verificarContrasteWCAG,
  converterTextoCases,
  analisarEstatisticasTexto,
  limparTexto,
  gerarLoremIpsum,
  gerarSvgQrCode,
  gerarUUID,
  textoParaBase64,
  base64ParaTexto,
  formatarJSON,
  minificarJSON,
} from "./itTools";

describe("itTools - Módulo de Utilitários", () => {
  describe("Conversor de Unidades", () => {
    it("converte 16px para 1rem com base 16", () => {
      const res = converterUnidades(16, "px", 16);
      expect(res.px).toBe(16);
      expect(res.rem).toBe(1);
      expect(res.em).toBe(1);
    });

    it("converte 2rem para 32px com base 16", () => {
      const res = converterUnidades(2, "rem", 16);
      expect(res.px).toBe(32);
      expect(res.rem).toBe(2);
    });

    it("converte 72pt para 96px", () => {
      const res = converterUnidades(72, "pt", 16);
      expect(res.px).toBe(96);
    });
  });

  describe("Calculadora de Aspect Ratio", () => {
    it("calcula altura correta para 16:9 dada largura 1920", () => {
      const res = calcularAspectRatio(16, 9, 1920);
      expect(res.largura).toBe(1920);
      expect(res.altura).toBe(1080);
      expect(res.formatoSimplificado).toBe("16:9");
    });

    it("calcula largura correta para 4:3 dada altura 600", () => {
      const res = calcularAspectRatio(4, 3, undefined, 600);
      expect(res.largura).toBe(800);
      expect(res.altura).toBe(600);
    });
  });

  describe("Verificador de Contraste WCAG", () => {
    it("valida contraste máximo entre preto e branco (21:1)", () => {
      const res = verificarContrasteWCAG("#000000", "#ffffff");
      expect(res.ratio).toBe(21);
      expect(res.textoNormalAA).toBe(true);
      expect(res.textoNormalAAA).toBe(true);
    });

    it("detecta baixo contraste entre cinza claro e branco", () => {
      const res = verificarContrasteWCAG("#e0e0e0", "#ffffff");
      expect(res.ratio).toBeLessThan(3);
      expect(res.textoNormalAA).toBe(false);
    });
  });

  describe("Conversor de Cases & Slugs", () => {
    it("converte título para kebab-case, snake_case, camelCase e slug", () => {
      const res = converterTextoCases("Design de Interface 2026");
      expect(res.kebabCase).toBe("design-de-interface-2026");
      expect(res.snakeCase).toBe("design_de_interface_2026");
      expect(res.camelCase).toBe("designDeInterface2026");
      expect(res.pascalCase).toBe("DesignDeInterface2026");
      expect(res.constantCase).toBe("DESIGN_DE_INTERFACE_2026");
      expect(res.slugLimpo).toBe("design-de-interface-2026");
    });
  });

  describe("Estatísticas de Texto", () => {
    it("calcula contagem de palavras e caracteres corretamente", () => {
      const res = analisarEstatisticasTexto("O Klaus é um segundo cérebro incrível.\n\nSimplicidade e foco.");
      expect(res.palavras).toBeGreaterThan(5);
      expect(res.caracteresTotal).toBeGreaterThan(20);
      expect(res.paragrafos).toBe(2);
      expect(res.linhas).toBe(3);
    });
  });

  describe("Limpeza de Texto", () => {
    it("remove quebras duplicadas e espaços extras", () => {
      const entrada = "Texto com     espaços extras.\n\n\n\nOutro parágrafo.";
      const res = limparTexto(entrada, {
        removerEspacosExtras: true,
        removerQuebrasDuplicadas: true,
      });
      expect(res).toBe("Texto com espaços extras.\n\nOutro parágrafo.");
    });
  });

  describe("Geradores (Lorem, QR Code, Base64, JSON)", () => {
    it("gera lorem ipsum no formato solicitado", () => {
      const lorem = gerarLoremIpsum(2, "paragrafos");
      expect(lorem.length).toBeGreaterThan(50);
      expect(lorem.startsWith("Lorem ipsum")).toBe(true);
    });

    it("gera SVG de QR Code com tags válidas", async () => {
      const svg = await gerarSvgQrCode("https://klaus.app", "#000000", "#ffffff");
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.includes("</svg>")).toBe(true);
    });

    it("codifica e decodifica Base64 de forma reversível", () => {
      const original = "Segundo Cérebro Klaus";
      const b64 = textoParaBase64(original);
      expect(base64ParaTexto(b64)).toBe(original);
    });

    it("formata e valida JSON", () => {
      const jsonBruto = '{"nome":"Klaus","versao":2}';
      const res = formatarJSON(jsonBruto, 2);
      expect(res.valido).toBe(true);
      expect(res.formatado).toContain('\n  "nome": "Klaus"');
    });

    it("minifica JSON", () => {
      const jsonFormatado = '{\n  "nome": "Klaus"\n}';
      const res = minificarJSON(jsonFormatado);
      expect(res.valido).toBe(true);
      expect(res.minificado).toBe('{"nome":"Klaus"}');
    });

    it("gera UUID v4 no formato padrão", () => {
      const uuid = gerarUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
});
