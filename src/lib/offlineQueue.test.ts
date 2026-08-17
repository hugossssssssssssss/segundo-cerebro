import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  obterRascunhosLocais,
  salvarRascunhoLocal,
  removerRascunhoLocal,
} from "./offlineQueue";

describe("offlineQueue", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("salva e recupera rascunhos offline", () => {
    expect(obterRascunhosLocais()).toEqual([]);

    salvarRascunhoLocal("notas/teste.md", "# Teste Offline", "sha123");
    const rascunhos = obterRascunhosLocais();

    expect(rascunhos).toHaveLength(1);
    expect(rascunhos[0].caminho).toBe("notas/teste.md");
    expect(rascunhos[0].texto).toBe("# Teste Offline");
  });

  it("substitui rascunho anterior para o mesmo caminho", () => {
    salvarRascunhoLocal("notas/teste.md", "Versão 1");
    salvarRascunhoLocal("notas/teste.md", "Versão 2");

    const rascunhos = obterRascunhosLocais();
    expect(rascunhos).toHaveLength(1);
    expect(rascunhos[0].texto).toBe("Versão 2");
  });

  it("remove rascunho salvo por ID único ou caminho", () => {
    const item = salvarRascunhoLocal("notas/teste.md", "Conteúdo");
    expect(obterRascunhosLocais()).toHaveLength(1);

    removerRascunhoLocal(item.id);
    expect(obterRascunhosLocais()).toHaveLength(0);
  });

  it("lança erro amigável ao atingir limite de cota do localStorage (QuotaExceededError)", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new Error("QuotaExceededError");
      err.name = "QuotaExceededError";
      throw err;
    });

    expect(() => salvarRascunhoLocal("notas/teste.md", "Muito grande")).toThrow(
      "Espaço de armazenamento local (localStorage) cheio",
    );

    spy.mockRestore();
  });
});
