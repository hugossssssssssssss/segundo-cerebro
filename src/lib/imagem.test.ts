import { describe, it, expect } from "vitest";
import {
  precisaComprimir,
  ehIntocavel,
  resumoCompressao,
  erroDeTamanho,
  MINIMO_PARA_COMPRIMIR,
} from "./imagem";

const MB = 1024 * 1024;

describe("precisaComprimir", () => {
  it("comprime foto de celular", () => {
    expect(precisaComprimir("image/jpeg", 9 * MB)).toBe(true);
  });

  it("comprime print grande de PNG", () => {
    expect(precisaComprimir("image/png", 3 * MB)).toBe(true);
  });

  it("deixa em paz o que já é pequeno", () => {
    expect(precisaComprimir("image/jpeg", MINIMO_PARA_COMPRIMIR - 1)).toBe(false);
  });

  it("nunca toca em SVG — virar bitmap destruiria o vetor", () => {
    expect(precisaComprimir("image/svg+xml", 5 * MB)).toBe(false);
    expect(ehIntocavel("image/svg+xml")).toBe(true);
  });

  it("nunca toca em GIF — perderia a animação", () => {
    expect(precisaComprimir("image/gif", 5 * MB)).toBe(false);
  });

  it("ignora o que não é imagem", () => {
    expect(precisaComprimir("application/pdf", 8 * MB)).toBe(false);
  });
});

describe("resumoCompressao", () => {
  it("conta a economia em português", () => {
    const texto = resumoCompressao({
      arquivo: {} as File,
      antes: 8 * MB,
      depois: 2 * MB,
      comprimida: true,
    });
    expect(texto).toContain("8,0 MB");
    expect(texto).toContain("2,0 MB");
    expect(texto).toContain("75%");
  });

  it("cala a boca quando o arquivo passou direto", () => {
    expect(
      resumoCompressao({ arquivo: {} as File, antes: MB, depois: MB, comprimida: false }),
    ).toBe("");
  });

  it("cala a boca quando a economia é irrisória", () => {
    expect(
      resumoCompressao({
        arquivo: {} as File,
        antes: 1000,
        depois: 980,
        comprimida: true,
      }),
    ).toBe("");
  });
});

describe("erroDeTamanho", () => {
  it("não reclama do que cabe", () => {
    expect(
      erroDeTamanho({ arquivo: {} as File, antes: 8 * MB, depois: 2 * MB, comprimida: true }),
    ).toBeNull();
  });

  it("avisa que já tentou encolher antes de desistir", () => {
    const msg = erroDeTamanho({
      arquivo: {} as File,
      antes: 20 * MB,
      depois: 7 * MB,
      comprimida: true,
    });
    expect(msg).toContain("depois de encolher");
    expect(msg).toContain("7,0 MB");
  });

  it("não menciona compressão no que passou direto (SVG)", () => {
    const msg = erroDeTamanho({
      arquivo: {} as File,
      antes: 6 * MB,
      depois: 6 * MB,
      comprimida: false,
    });
    expect(msg).not.toContain("depois de encolher");
  });
});
