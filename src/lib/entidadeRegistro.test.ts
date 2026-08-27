import { describe, it, expect } from "vitest";
import {
  detectarTipoDoItem,
  obterEntidadePorPasta,
  obterEntidadePorTipo,
} from "./entidadeRegistro";
import type { ItemRepo } from "./repo";

describe("entidadeRegistro", () => {
  it("detecta tipo a partir de frontmatter explícito", () => {
    const item: ItemRepo = {
      caminho: "qualquer/lugar/arquivo.md",
      nome: "arquivo.md",
      sha: "123",
      tamanho: 10,
      texto: "",
      doc: { dados: { tipo: "tarefa" }, corpo: "" },
    };
    expect(detectarTipoDoItem(item)).toBe("tarefa");
  });

  it("detecta tipo a partir do caminho da pasta", () => {
    const itemNota: ItemRepo = {
      caminho: "notas/projeto.md",
      nome: "projeto.md",
      sha: "123",
      tamanho: 10,
      texto: "",
      doc: { dados: {}, corpo: "" },
    };
    expect(detectarTipoDoItem(itemNota)).toBe("nota");

    const itemMeta: ItemRepo = {
      caminho: "pdi/metas/meta1.md",
      nome: "meta1.md",
      sha: "123",
      tamanho: 10,
      texto: "",
      doc: { dados: {}, corpo: "" },
    };
    expect(detectarTipoDoItem(itemMeta)).toBe("meta");

    const itemCard: ItemRepo = {
      caminho: "processos/cards/card1.md",
      nome: "card1.md",
      sha: "123",
      tamanho: 10,
      texto: "",
      doc: { dados: {}, corpo: "" },
    };
    expect(detectarTipoDoItem(itemCard)).toBe("card_processo");
  });

  it("busca entidade por pasta e por tipo corretamente", () => {
    const def = obterEntidadePorTipo("tarefa");
    expect(def.pasta).toBe("tarefas");

    const defPasta = obterEntidadePorPasta("notas");
    expect(defPasta?.tipo).toBe("nota");
  });
});
