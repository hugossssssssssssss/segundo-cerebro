import { describe, it, expect } from "vitest";
import { construirGrafo3D, simularPassoFisica3D } from "./grafo";
import type { ItemRepo } from "./repo";

describe("grafo 3D", () => {
  const mockItens: ItemRepo[] = [
    {
      caminho: "notas/nota1.md",
      nome: "nota1.md",
      sha: "sha1",
      tamanho: 100,
      texto: "Texto com menção a @Briefing e [[Projeto Marca]]",
      doc: {
        dados: { titulo: "Nota 1", tipo: "nota", tags: ["design"] },
        corpo: "Texto com menção a @Briefing e [[Projeto Marca]]",
      },
    },
    {
      caminho: "tarefas/tarefa1.md",
      nome: "tarefa1.md",
      sha: "sha2",
      tamanho: 100,
      texto: "Fazer briefing",
      doc: {
        dados: { titulo: "Briefing", tipo: "tarefa", tags: ["design"] },
        corpo: "Fazer briefing",
      },
    },
  ];

  it("constrói os nós e arestas do grafo 3D", () => {
    const dados = construirGrafo3D(mockItens, { incluirTags: true });
    expect(dados.nos.length).toBeGreaterThanOrEqual(2);

    const noNota = dados.nos.find((n) => n.caminho === "notas/nota1.md");
    expect(noNota).toBeDefined();
    expect(noNota?.tipo).toBe("nota");

    const noTarefa = dados.nos.find((n) => n.caminho === "tarefas/tarefa1.md");
    expect(noTarefa).toBeDefined();
    expect(noTarefa?.tipo).toBe("tarefa");

    // Verifica se a menção gerou uma aresta entre os dois documentos
    const arestaMencao = dados.arestas.find(
      (a) =>
        (a.origem === "notas/nota1.md" && a.destino === "tarefas/tarefa1.md") ||
        (a.origem === "tarefas/tarefa1.md" && a.destino === "notas/nota1.md")
    );
    expect(arestaMencao).toBeDefined();
  });

  it("ignora explicitamente arquivos da pasta .klaus/templates", () => {
    const itensComTemplates: ItemRepo[] = [
      ...mockItens,
      {
        caminho: ".klaus/templates/briefing.md",
        nome: "briefing.md",
        sha: "sha-tmpl",
        tamanho: 100,
        texto: "Modelo de briefing",
        doc: {
          dados: { titulo: "Template Briefing", tipo: "nota" },
          corpo: "Template content",
        },
      },
    ];

    const dados = construirGrafo3D(itensComTemplates);
    const noTemplate = dados.nos.find((n) => n.caminho.includes(".klaus/templates"));
    expect(noTemplate).toBeUndefined();
  });

  it("executa o passo da simulação física sem gerar valores NaN", () => {
    const dados = construirGrafo3D(mockItens);
    simularPassoFisica3D(dados);

    expect(Number.isNaN(dados.nos[0].x)).toBe(false);
    expect(Number.isNaN(dados.nos[0].y)).toBe(false);
    expect(Number.isNaN(dados.nos[0].z)).toBe(false);
  });
});
