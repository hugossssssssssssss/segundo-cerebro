import { describe, it, expect } from "vitest";
import { classificarIntencaoConsulta, montarContextoSemantico } from "./ragLocal";
import type { ItemRepo } from "./repo";
import { lerMarkdown } from "./markdown";

describe("ragLocal - injeção contextual seletiva", () => {
  it("classifica intenções de metas, tarefas e contatos", () => {
    expect(classificarIntencaoConsulta("quais são minhas metas do PDI?")).toBe("metas");
    expect(classificarIntencaoConsulta("o que tenho a fazer hoje de tarefas?")).toBe("tarefas");
    expect(classificarIntencaoConsulta("qual o email do contato João?")).toBe("contatos");
    expect(classificarIntencaoConsulta("me fale sobre tipografia suíça")).toBe("geral");
  });

  it("seleciona metas prioritariamente quando a pergunta é sobre metas", () => {
    const metaItem: ItemRepo = {
      caminho: "pdi/metas/ingles.md",
      nome: "ingles.md",
      sha: "s1",
      tamanho: 50,
      texto: "---\ntitulo: Falar inglês\ntipo: meta\n---\nMeta de idioma",
      doc: lerMarkdown("---\ntitulo: Falar inglês\ntipo: meta\n---\nMeta de idioma"),
    };

    const notaItem: ItemRepo = {
      caminho: "notas/cafe.md",
      nome: "cafe.md",
      sha: "s2",
      tamanho: 50,
      texto: "---\ntitulo: Café especial\n---\nReceita de café",
      doc: lerMarkdown("---\ntitulo: Café especial\n---\nReceita de café"),
    };

    const contexto = montarContextoSemantico([metaItem, notaItem], "Como estão minhas metas?");
    expect(contexto).toContain("Falar inglês");
    expect(contexto).toContain("pdi/metas/ingles.md");
  });

  it("respeita o teto de caracteres sem ultrapassar", () => {
    const itemGrande: ItemRepo = {
      caminho: "notas/livro.md",
      nome: "livro.md",
      sha: "s3",
      tamanho: 5000,
      texto: "Conteúdo longo ".repeat(300),
      doc: lerMarkdown("Conteúdo longo ".repeat(300)),
    };

    const contexto = montarContextoSemantico([itemGrande], "livro", 500);
    expect(contexto.length).toBeLessThan(700);
    expect(contexto).toContain("limitado em 500 caracteres");
  });
});
