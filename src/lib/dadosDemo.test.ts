import { describe, it, expect } from "vitest";
import { gerarItensDemo } from "./dadosDemo";

describe("dadosDemo", () => {
  it("gera ecossistema completo de dados com notas, tarefas, metas, entregas, contatos e referências", () => {
    const itens = gerarItensDemo("Hugo Designer");
    expect(itens.length).toBeGreaterThanOrEqual(20);

    const notas = itens.filter((i) => i.caminho.startsWith("notas/"));
    const tarefas = itens.filter((i) => i.caminho.startsWith("tarefas/"));
    const metas = itens.filter((i) => i.caminho.startsWith("pdi/metas/"));
    const entregas = itens.filter((i) => i.caminho.startsWith("pdi/entregas/"));
    const contatos = itens.filter((i) => i.caminho.startsWith("contatos/"));
    const referencias = itens.filter((i) => i.caminho.startsWith("referencias/"));

    expect(notas.length).toBeGreaterThanOrEqual(5);
    expect(tarefas.length).toBeGreaterThanOrEqual(5);
    expect(metas.length).toBeGreaterThanOrEqual(3);
    expect(entregas.length).toBeGreaterThanOrEqual(2);
    expect(contatos.length).toBeGreaterThanOrEqual(4);
    expect(referencias.length).toBeGreaterThanOrEqual(3);

    // Todos os itens devem conter a tag 'demo' para remoção fácil
    for (const item of itens) {
      expect(item.conteudo).toContain("demo");
    }
  });
});
