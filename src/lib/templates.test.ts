import { describe, it, expect, beforeEach } from "vitest";
import {
  MODELOS_PADRAO,
  obterTodosModelos,
  obterModelosPersonalizados,
  criarModeloPersonalizado,
  editarModeloPersonalizado,
  removerModeloPersonalizado,
  obterModeloPadraoId,
  definirModeloPadraoId,
  ehModeloCustom,
} from "./templates";

describe("templates", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("contém modelos padrões estruturados", () => {
    expect(MODELOS_PADRAO.length).toBeGreaterThan(0);
    const briefing = MODELOS_PADRAO.find((m) => m.id === "briefing-design");
    expect(briefing).toBeDefined();
    expect(briefing?.frontmatter.tipo).toBe("nota");
    expect(briefing?.corpoPadrao).toContain("Objetivo do Projeto");
  });

  it("obterTodosModelos retorna padrão + personalizados", () => {
    expect(obterTodosModelos().length).toBe(MODELOS_PADRAO.length);
    criarModeloPersonalizado({
      titulo: "Meu Modelo",
      categoria: "design",
      descricao: "Teste",
      frontmatter: { tipo: "nota", tags: ["teste"] },
      corpoPadrao: "## Corpo",
    });
    expect(obterTodosModelos().length).toBe(MODELOS_PADRAO.length + 1);
  });

  it("criarModeloPersonalizado cria com id custom_", () => {
    const criado = criarModeloPersonalizado({
      titulo: "Meu Modelo",
      categoria: "reuniao",
      descricao: "Teste",
      frontmatter: { tipo: "nota" },
      corpoPadrao: "",
    });
    expect(ehModeloCustom(criado.id)).toBe(true);
    expect(obterModelosPersonalizados().length).toBe(1);
  });

  it("editarModeloPersonalizado atualiza um modelo custom", () => {
    const criado = criarModeloPersonalizado({
      titulo: "Antes",
      categoria: "design",
      descricao: "Teste",
      frontmatter: { tipo: "nota" },
      corpoPadrao: "",
    });
    const ok = editarModeloPersonalizado(criado.id, { titulo: "Depois" });
    expect(ok).toBe(true);
    const atualizado = obterTodosModelos().find((m) => m.id === criado.id);
    expect(atualizado?.titulo).toBe("Depois");
  });

  it("editarModeloPersonalizado recusa modelo padrão", () => {
    const ok = editarModeloPersonalizado("briefing-design", { titulo: "X" });
    expect(ok).toBe(false);
  });

  it("removerModeloPersonalizado remove e limpa padrão", () => {
    const criado = criarModeloPersonalizado({
      titulo: "Para Remover",
      categoria: "tarefa",
      descricao: "Teste",
      frontmatter: { tipo: "nota" },
      corpoPadrao: "",
    });
    definirModeloPadraoId(criado.id);
    expect(obterModeloPadraoId()).toBe(criado.id);

    const ok = removerModeloPersonalizado(criado.id);
    expect(ok).toBe(true);
    expect(obterModelosPersonalizados().length).toBe(0);
    expect(obterModeloPadraoId()).toBeNull();
  });

  it("removerModeloPersonalizado recusa modelo padrão", () => {
    const ok = removerModeloPersonalizado("ata-reuniao");
    expect(ok).toBe(false);
  });
});