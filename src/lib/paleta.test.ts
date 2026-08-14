import { describe, it, expect } from "vitest";
import { rgbParaHex } from "./paleta";

describe("paleta", () => {
  it("converte RGB para HEX corretamente", () => {
    expect(rgbParaHex(255, 255, 255)).toBe("#ffffff");
    expect(rgbParaHex(0, 0, 0)).toBe("#000000");
    expect(rgbParaHex(30, 41, 59)).toBe("#1e293b");
    expect(rgbParaHex(59, 130, 246)).toBe("#3b82f6");
  });
});
