import { describe, it, expect } from "vitest";
import {
  validateKlausManifest,
  packKlausExtension,
  unpackKlausExtension,
  KLAUS_PACKAGE_FORMAT,
} from "./klausPackage";
import type { KlausAppManifest } from "./klaus.types";

describe("Klaus Package & Manifest Validator", () => {
  const manifestValido: KlausAppManifest = {
    id: "meu_app",
    name: "Meu App Criativo",
    version: "1.0.0",
    entry: "index.html",
    category: "design",
    permissions: ["theme", "ui"],
  };

  describe("validateKlausManifest", () => {
    it("aprova manifesto com campos obrigatórios e válidos", () => {
      const res = validateKlausManifest(manifestValido);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it("rejeita manifesto sem campos obrigatórios", () => {
      const res = validateKlausManifest({ id: "app" });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("name"))).toBe(true);
      expect(res.errors.some((e) => e.includes("version"))).toBe(true);
      expect(res.errors.some((e) => e.includes("entry"))).toBe(true);
    });

    it("rejeita id com caracteres inválidos", () => {
      const res = validateKlausManifest({
        ...manifestValido,
        id: "meu app inválido!",
      });
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain("letras, números");
    });

    it("rejeita permissão desconhecida", () => {
      const res = validateKlausManifest({
        ...manifestValido,
        permissions: ["theme", "hack_tudo" as any],
      });
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain("Permissão desconhecida");
    });
  });

  describe("packKlausExtension & unpackKlausExtension", () => {
    it("empacota e desempacota com integridade garantida", () => {
      const files = {
        "index.html": "<!DOCTYPE html><h1>App</h1>",
        "style.css": "body { margin: 0; }",
      };

      const pacote = packKlausExtension(manifestValido, files);
      expect(pacote.format).toBe(KLAUS_PACKAGE_FORMAT);
      expect(pacote.manifest.id).toBe("meu_app");
      expect(pacote.files["index.html"]).toBe("<!DOCTYPE html><h1>App</h1>");

      const serializado = JSON.stringify(pacote);
      const extraido = unpackKlausExtension(serializado);

      expect(extraido.manifest.name).toBe("Meu App Criativo");
      expect(extraido.files["style.css"]).toBe("body { margin: 0; }");
    });

    it("falha ao empacotar se o arquivo de entrada declarado não existir", () => {
      expect(() => {
        packKlausExtension(manifestValido, { "outro.html": "oi" });
      }).toThrow(/Arquivo de entrada 'index.html'/);
    });

    it("rejeita pacote com formato corrompido", () => {
      expect(() => {
        unpackKlausExtension("{ invalid json ");
      }).toThrow(/não é um JSON válido/);

      expect(() => {
        unpackKlausExtension({ format: "outro" } as any);
      }).toThrow(/Formato de pacote incompatível/);
    });
  });
});
