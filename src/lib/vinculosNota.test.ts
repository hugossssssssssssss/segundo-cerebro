import { describe, it, expect } from "vitest";
import { obterTarefasVinculadas, obterReferenciasVinculadas } from "./vinculosNota";
import type { ItemRepo } from "./repo";

describe("vinculosNota", () => {
  const itensMock: ItemRepo[] = [
    {
      caminho: "tarefas/tarefa-1.md",
      nome: "tarefa-1.md",
      sha: "111",
      tamanho: 100,
      texto: "",
      doc: {
        dados: {
          titulo: "Design da Landing Page",
          status: "a-fazer",
          relacionamentos: ["@Identidade Visual"],
        },
        corpo: "Trabalhar em conjunto com @Identidade Visual",
      },
    },
    {
      caminho: "tarefas/tarefa-2.md",
      nome: "tarefa-2.md",
      sha: "222",
      tamanho: 100,
      texto: "",
      doc: {
        dados: {
          titulo: "Configurar Servidor",
          status: "feito",
          relacionamentos: ["@Infraestrutura"],
        },
        corpo: "Configurar banco",
      },
    },
    {
      caminho: "referencias/ref-1.md",
      nome: "ref-1.md",
      sha: "333",
      tamanho: 100,
      texto: "",
      doc: {
        dados: {
          titulo: "Paleta de Cores",
          relacionamentos: ["@Identidade Visual"],
        },
        corpo: "Referência ligada a @Identidade Visual",
      },
    },
    {
      caminho: "notas/identidade-visual.md",
      nome: "identidade-visual.md",
      sha: "444",
      tamanho: 100,
      texto: "",
      doc: {
        dados: {
          titulo: "Identidade Visual",
        },
        corpo: "Notas do projeto",
      },
    },
  ];

  it("retorna tarefas vinculadas à nota corretamente", () => {
    const tarefas = obterTarefasVinculadas("Identidade Visual", "notas/identidade-visual.md", [], itensMock);
    expect(tarefas.length).toBe(1);
    expect(tarefas[0].titulo).toBe("Design da Landing Page");
  });

  it("retorna lista vazia se não houver tarefas vinculadas", () => {
    const tarefas = obterTarefasVinculadas("Nota Sem Tarefas", "notas/sem-tarefas.md", [], itensMock);
    expect(tarefas.length).toBe(0);
  });

  it("retorna referências visuais vinculadas à nota corretamente", () => {
    const refs = obterReferenciasVinculadas("Identidade Visual", "notas/identidade-visual.md", [], itensMock);
    expect(refs.length).toBe(1);
    expect(refs[0].titulo).toBe("Paleta de Cores");
  });

  it("retorna lista vazia se não houver referências vinculadas", () => {
    const refs = obterReferenciasVinculadas("Nota Sem Refs", "notas/sem-refs.md", [], itensMock);
    expect(refs.length).toBe(0);
  });
});
