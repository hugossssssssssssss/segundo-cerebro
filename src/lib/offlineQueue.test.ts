import { describe, it, expect, beforeEach } from "vitest";
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

  it("remove rascunho salvo", () => {
    salvarRascunhoLocal("notas/teste.md", "Conteúdo");
    expect(obterRascunhosLocais()).toHaveLength(1);

    removerRascunhoLocal("notas/teste.md");
    expect(obterRascunhosLocais()).toHaveLength(0);
  });
});
