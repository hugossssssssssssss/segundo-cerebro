import { describe, it, expect } from "vitest";
import { verificarIntegridadeReferencias } from "./links";
import type { ItemRepo } from "./repo";
import { lerMarkdown } from "./markdown";

function item(caminho: string, texto: string): ItemRepo {
  return {
    caminho,
    nome: caminho.split("/").pop()!,
    sha: "sha_" + caminho,
    tamanho: texto.length,
    texto,
    doc: lerMarkdown(texto),
  };
}

describe("Resiliência de Links e Integridade Referencial", () => {
  it("deve detectar menções quebradas para itens que não existem no repositório", () => {
    const itens: ItemRepo[] = [
      item("notas/nota-1.md", "---\ntitulo: Nota Um\n---\nMenção para @ItemInexistente e @OutraCoisa."),
      item("tarefas/tarefa-1.md", "---\ntitulo: Tarefa Real\n---\nTexto da tarefa."),
    ];

    const rel = verificarIntegridadeReferencias(itens);
    expect(rel.totalProblemas).toBe(2);
    expect(rel.problemas[0].tipo).toBe("mencao_quebrada");
    expect(rel.problemas[0].referencia).toBe("ItemInexistente");
  });

  it("deve detectar IDs órfãos em metas de entregas e pai_id de contatos", () => {
    const itens: ItemRepo[] = [
      item("pdi/entregas/entrega-1.md", "---\nid: entrega-1\ntitulo: Entrega 1\nmetas:\n  - meta-inexistente\n---\nCorpo"),
      item("contatos/ana.md", "---\nid: ana\ntitulo: Ana\npai_id: contato-fantasma\n---\nCorpo"),
    ];

    const rel = verificarIntegridadeReferencias(itens);
    expect(rel.totalProblemas).toBe(2);
    expect(rel.problemas.some((p) => p.tipo === "meta_orfa")).toBe(true);
    expect(rel.problemas.some((p) => p.tipo === "pai_contato_orfao")).toBe(true);
  });

  it("não deve apontar problemas quando todas as referências são válidas", () => {
    const itens: ItemRepo[] = [
      item("pdi/metas/aprender-ts.md", "---\nid: aprender-ts\ntitulo: Aprender TypeScript\n---\nCorpo"),
      item("pdi/entregas/curso-concluido.md", "---\nid: curso-concluido\ntitulo: Curso Concluído\nmetas:\n  - aprender-ts\n---\nEstudei muito com @Aprender TypeScript"),
    ];

    const rel = verificarIntegridadeReferencias(itens);
    expect(rel.totalProblemas).toBe(0);
  });
});
