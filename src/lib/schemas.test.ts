import { describe, it, expect } from "vitest";
import {
  TarefaSchema,
  EntregaSchema,
  NotaSchema,
  MetaSchema,
  validarSchemaPassivo,
} from "./schemas";

describe("schemas - validação não-bloqueante", () => {
  it("valida NotaSchema e MetaSchema", () => {
    const nota = { titulo: "Nota 1", tipo: "nota", subtipo: "reuniao" };
    expect(NotaSchema.safeParse(nota).success).toBe(true);

    const meta = { titulo: "Meta 1", tipo: "meta", status: "em-andamento" };
    expect(MetaSchema.safeParse(meta).success).toBe(true);
  });
  it("aceita frontmatter válido sem alertas", () => {
    const dados = {
      titulo: "Desenhar Design System",
      tipo: "tarefa",
      status: "fazendo",
      prazo: "2026-08-30",
      prioridade: "alta",
      tags: ["design", "ui"],
    };
    const alertas = validarSchemaPassivo(TarefaSchema, dados);
    expect(alertas).toEqual([]);
  });

  it("identifica formato de data inválido sem lançar exceção", () => {
    const dados = {
      titulo: "Comprar fontes",
      tipo: "tarefa",
      prazo: "30/08/2026", // formato brasileiro incorreto para ISO
    };
    const alertas = validarSchemaPassivo(TarefaSchema, dados, "tarefas/compra.md");
    expect(alertas.length).toBeGreaterThan(0);
    expect(alertas[0].campo).toBe("prazo");
  });

  it("preserva campos desconhecidos ou de outras IAs graças ao .passthrough()", () => {
    const dados = {
      titulo: "Refatorar CSS",
      campo_customizado_ia: "analise_concluida",
      score_relevancia: 98,
    };
    const parsed = TarefaSchema.safeParse(dados);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as any).campo_customizado_ia).toBe("analise_concluida");
      expect((parsed.data as any).score_relevancia).toBe(98);
    }
  });

  it("valida schema de entrega e detecta metas associadas", () => {
    const dados = {
      titulo: "Lançamento da v1",
      tipo: "entrega",
      data: "2026-08-29",
      metas: ["meta_123", "meta_456"],
      ia_sugeriu: true,
    };
    const alertas = validarSchemaPassivo(EntregaSchema, dados);
    expect(alertas).toEqual([]);
  });
});
