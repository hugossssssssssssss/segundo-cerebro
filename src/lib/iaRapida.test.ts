import { describe, it, expect } from "vitest";
import { tentarResolverContaLocal, perguntarIARapida } from "./iaRapida";

describe("iaRapida", () => {
  describe("tentarResolverContaLocal", () => {
    it("resolve porcentagens corretamente", () => {
      expect(tentarResolverContaLocal("quanto é 15% de 850")).toContain("127,5");
      expect(tentarResolverContaLocal("10% de 200")).toContain("20");
      expect(tentarResolverContaLocal("50% de 1000")).toContain("500");
    });

    it("resolve contas aritméticas básicas", () => {
      expect(tentarResolverContaLocal("25 * 4")).toContain("100");
      expect(tentarResolverContaLocal("25 x 4")).toContain("100");
      expect(tentarResolverContaLocal("100 / 4")).toContain("25");
      expect(tentarResolverContaLocal("100 ÷ 4")).toContain("25");
      expect(tentarResolverContaLocal("120 + 35 - 5")).toContain("150");
    });

    it("retorna null para perguntas de texto sem contas", () => {
      expect(tentarResolverContaLocal("como escrever um briefing?")).toBeNull();
      expect(tentarResolverContaLocal("resuma este texto")).toBeNull();
    });
  });

  describe("perguntarIARapida", () => {
    it("resolve conta rápida sem precisar de rede", async () => {
      const res = await perguntarIARapida("25 x 4");
      expect(res).toContain("100");
    });
  });
});
