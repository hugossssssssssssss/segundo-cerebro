import { describe, it, expect, beforeEach } from "vitest";
import {
  sanitizarNomePasta,
  carregarPastasCriadas,
  salvarPastaCriada,
  renomearPastaCriada,
  removerPastaCriada,
} from "./pastas";

describe("sanitizarNomePasta", () => {
  it("preserva caracteres acentuados, cedilhas e pontuações válidas", () => {
    expect(sanitizarNomePasta("Reuniões de Gestão 2026")).toBe("Reuniões de Gestão 2026");
    expect(sanitizarNomePasta("Ações & Estratégia")).toBe("Ações & Estratégia");
    expect(sanitizarNomePasta("  Design Gráfico - Identidade  ")).toBe("Design Gráfico - Identidade");
  });

  it("remove apenas caracteres ilegais para nomes de diretórios", () => {
    expect(sanitizarNomePasta("Projeto: Alpha/Beta?")).toBe("Projeto AlphaBeta");
    expect(sanitizarNomePasta('<Pasta "Especial" | Teste>')).toBe("Pasta Especial Teste");
  });

  it("retorna string vazia se nome for nulo ou inválido", () => {
    expect(sanitizarNomePasta("")).toBe("");
    expect(sanitizarNomePasta("   ")).toBe("");
  });
});

describe("gerenciamento de pastas no storage e sincronização", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("salva e carrega pastas criadas para notas", () => {
    expect(carregarPastasCriadas("notas")).toEqual([]);
    salvarPastaCriada("notas", "Projetos 2026");
    expect(carregarPastasCriadas("notas")).toEqual(["Projetos 2026"]);

    salvarPastaCriada("notas", "Projetos 2026/Apresentação");
    expect(carregarPastasCriadas("notas")).toEqual(["Projetos 2026", "Projetos 2026/Apresentação"]);
  });

  it("renomeia pasta e subpastas", () => {
    salvarPastaCriada("notas", "Projetos");
    salvarPastaCriada("notas", "Projetos/Design");
    salvarPastaCriada("notas", "Outra");

    renomearPastaCriada("notas", "Projetos", "Trabalhos");
    expect(carregarPastasCriadas("notas")).toEqual(["Outra", "Trabalhos", "Trabalhos/Design"]);
  });

  it("remove pasta e subpastas", () => {
    salvarPastaCriada("notas", "Trabalhos");
    salvarPastaCriada("notas", "Trabalhos/Design");
    salvarPastaCriada("notas", "Outra");

    removerPastaCriada("notas", "Trabalhos");
    expect(carregarPastasCriadas("notas")).toEqual(["Outra"]);
  });
});
