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
      texto: "Texto com menção a @Briefing e [[Projeto Marca]] e [Minha Referência](referencias/ref1.md)",
      doc: {
        dados: { titulo: "Nota 1", tipo: "nota", tags: ["design"], relacionamentos: ["@Gestão de Marca"] },
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
    {
      caminho: "notas/gestao.md",
      nome: "gestao.md",
      sha: "sha3",
      tamanho: 100,
      texto: "Planejamento de gestão",
      doc: {
        dados: { titulo: "Gestão de Marca", tipo: "nota" },
        corpo: "Planejamento de gestão",
      },
    },
  ];

  it("constrói os nós e arestas do grafo 3D", () => {
    const dados = construirGrafo3D(mockItens, { incluirTags: true });
    expect(dados.nos.length).toBeGreaterThanOrEqual(3);

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

    // Verifica se o relacionamento do frontmatter com acento foi resolvido
    const arestaRel = dados.arestas.find(
      (a) =>
        (a.origem === "notas/nota1.md" && a.destino === "notas/gestao.md") ||
        (a.origem === "notas/gestao.md" && a.destino === "notas/nota1.md")
    );
    expect(arestaRel).toBeDefined();
  });

  it("ignora arquivos internos de jogos como jogos/termo.json e títulos como '{'", () => {
    const itensComJogos: ItemRepo[] = [
      ...mockItens,
      {
        caminho: "jogos/termo.json",
        nome: "termo.json",
        sha: "sha-termo",
        tamanho: 500,
        texto: '{\n  "tipo": "termo"\n}',
        doc: {
          dados: { titulo: "{" },
          corpo: '{\n  "tipo": "termo"\n}',
        },
      },
    ];

    const dados = construirGrafo3D(itensComJogos);
    const noTermo = dados.nos.find((n) => n.caminho.startsWith("jogos/") || n.titulo === "{");
    expect(noTermo).toBeUndefined();
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

  it("preserva as posições espaciais de nós existentes de um grafo anterior", () => {
    const grafoOriginal = construirGrafo3D(mockItens);
    const noOriginal = grafoOriginal.nos.find((n) => n.caminho === "notas/nota1.md");
    expect(noOriginal).toBeDefined();

    // Altera propositalmente a posição no grafo original
    noOriginal!.x = 55.5;
    noOriginal!.y = 77.7;

    const grafoNovo = construirGrafo3D(mockItens, { grafoAnterior: grafoOriginal });
    const noNovo = grafoNovo.nos.find((n) => n.caminho === "notas/nota1.md");
    expect(noNovo).toBeDefined();
    expect(noNovo!.x).toBe(55.5);
    expect(noNovo!.y).toBe(77.7);
  });

  it("executa o passo da simulação física com retorno de velocidade e sem gerar valores NaN", () => {
    const dados = construirGrafo3D(mockItens);
    const velMax = simularPassoFisica3D(dados, 0.85, 1.0);

    expect(Number.isNaN(dados.nos[0].x)).toBe(false);
    expect(Number.isNaN(dados.nos[0].y)).toBe(false);
    expect(Number.isNaN(dados.nos[0].z)).toBe(false);
    expect(velMax).toBeGreaterThanOrEqual(0);
  });
});
