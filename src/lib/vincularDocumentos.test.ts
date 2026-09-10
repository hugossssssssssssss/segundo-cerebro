import { describe, it, expect } from "vitest";
import {
  indexarDocumentosVinculaveis,
  montarEstruturaPastas,
  filtrarDocumentosVinculaveis,
} from "./vincularDocumentos";
import { type ItemRepo } from "./repo";

describe("vincularDocumentos", () => {
  const itensFalsos: ItemRepo[] = [
    {
      caminho: "tarefas/comprar-cafe.md",
      nome: "comprar-cafe.md",
      sha: "sha1",
      tamanho: 100,
      texto: "",
      doc: {
        dados: { titulo: "Comprar café", status: "a_fazer", tags: ["compras"] },
        corpo: "Comprar café em grãos especiais",
      },
    },
    {
      caminho: "tarefas/ajustar-layout.md",
      nome: "ajustar-layout.md",
      sha: "sha2",
      tamanho: 100,
      texto: "",
      doc: {
        dados: { titulo: "Ajustar layout", status: "fazendo", tags: ["design"] },
        corpo: "Rever espaçamento no grid",
      },
    },
    {
      caminho: "tarefas/entregar-projeto.md",
      nome: "entregar-projeto.md",
      sha: "sha3",
      tamanho: 100,
      texto: "",
      doc: {
        dados: { titulo: "Entregar projeto", status: "concluida" },
        corpo: "Entrega final realizada",
      },
    },
    {
      caminho: "notas/Reuniões Nitro/briefing.md",
      nome: "briefing.md",
      sha: "sha4",
      tamanho: 100,
      texto: "",
      doc: {
        dados: { titulo: "Briefing Nitro", pasta: "Reuniões Nitro" },
        corpo: "Anotações da reunião com cliente",
      },
    },
    {
      caminho: "pdi/metas/estudar-ux.md",
      nome: "estudar-ux.md",
      sha: "sha5",
      tamanho: 100,
      texto: "",
      doc: {
        dados: { titulo: "Estudar UX", status: "ativa" },
        corpo: "Leitura de Design System",
      },
    },
  ];

  it("indexa corretamente documentos por categoria e status/pasta", () => {
    const docs = indexarDocumentosVinculaveis(itensFalsos);
    expect(docs).toHaveLength(5);

    const tarefaAFazer = docs.find((d) => d.titulo === "Comprar café");
    expect(tarefaAFazer?.categoria).toBe("tarefas");
    expect(tarefaAFazer?.subpastaOuStatus).toBe("a_fazer");

    const tarefaFazendo = docs.find((d) => d.titulo === "Ajustar layout");
    expect(tarefaFazendo?.categoria).toBe("tarefas");
    expect(tarefaFazendo?.subpastaOuStatus).toBe("fazendo");

    const nota = docs.find((d) => d.titulo === "Briefing Nitro");
    expect(nota?.categoria).toBe("notas");
    expect(nota?.subpastaOuStatus).toBe("Reuniões Nitro");
  });

  it("monta estrutura de pastas incluindo status do Kanban para tarefas", () => {
    const docs = indexarDocumentosVinculaveis(itensFalsos);
    const pastas = montarEstruturaPastas(docs);

    const pastaTarefas = pastas.find((p) => p.id === "tarefas");
    expect(pastaTarefas).toBeDefined();
    expect(pastaTarefas?.total).toBe(3);

    const subAFazer = pastaTarefas?.subpastas?.find((s) => s.id === "a_fazer");
    expect(subAFazer?.total).toBe(1);

    const subFazendo = pastaTarefas?.subpastas?.find((s) => s.id === "fazendo");
    expect(subFazendo?.total).toBe(1);

    const subConcluida = pastaTarefas?.subpastas?.find((s) => s.id === "concluida");
    expect(subConcluida?.total).toBe(1);
  });

  it("filtra itens por categoria e termo de busca ignorando acentos", () => {
    const docs = indexarDocumentosVinculaveis(itensFalsos);

    const buscaCafe = filtrarDocumentosVinculaveis(docs, { termo: "cafe" });
    expect(buscaCafe).toHaveLength(1);
    expect(buscaCafe[0].titulo).toBe("Comprar café");

    const buscaNaPastaTarefas = filtrarDocumentosVinculaveis(docs, {
      categoria: "tarefas",
      subpastaOuStatus: "a_fazer",
    });
    expect(buscaNaPastaTarefas).toHaveLength(1);
    expect(buscaNaPastaTarefas[0].titulo).toBe("Comprar café");
  });
});
