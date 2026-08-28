import { describe, it, expect } from "vitest";
import { analisarAcervoParaMigracao, normalizarDocumento } from "./migracaoLote";
import { lerMarkdown } from "./markdown";
import type { ItemRepo } from "./repo";

function criarItem(caminho: string, texto: string): ItemRepo {
  const nome = caminho.split("/").pop() || "";
  return {
    caminho,
    nome,
    sha: "sha123",
    texto,
    tamanho: texto.length,
    doc: lerMarkdown(texto),
  };
}

describe("migracaoLote", () => {
  it("detecta arquivo com campos legados em tarefas e normaliza para snake_case", () => {
    const textoAntigo = "---\ntitulo: Comprar café\nPomodoro: 2\nstatus: a-fazer\n---\n\nTexto";
    const item = criarItem("tarefas/2026-08-28-comprar-cafe.md", textoAntigo);

    const normalizado = normalizarDocumento(item);
    expect(normalizado).not.toBeNull();
    expect(normalizado).toContain("pomodoros_estimados: 2");
    expect(normalizado).toContain("tipo: tarefa");
    expect(normalizado).toContain("criado_em:");
    expect(normalizado).toContain("atualizado_em:");
    expect(normalizado).not.toContain("Pomodoro:");
  });

  it("detecta arquivo com processoId em cards e normaliza para processo_id", () => {
    const textoAntigo = "---\ntitulo: Card 1\nprocessoId: vendas\netapaId: triagem\n---\n\nDetalhes";
    const item = criarItem("processos/cards/2026-08-28-card.md", textoAntigo);

    const normalizado = normalizarDocumento(item);
    expect(normalizado).not.toBeNull();
    expect(normalizado).toContain("processo_id: vendas");
    expect(normalizado).toContain("etapa_id: triagem");
    expect(normalizado).toContain("tipo: card_processo");
    expect(normalizado).not.toContain("processoId:");
  });

  it("não marca arquivo já padronizado como pendente", () => {
    const itemNormalizado = criarItem("notas/2026-08-28-nota.md", "---\ntitulo: Nota Antiga\n---\n\nTexto");
    const textoPadrao = normalizarDocumento(itemNormalizado);
    expect(textoPadrao).not.toBeNull();

    // Cria um item com o texto exatamente padronizado
    const itemPronto = criarItem("notas/2026-08-28-nota.md", textoPadrao!);
    const relatorio = analisarAcervoParaMigracao([itemPronto]);
    expect(relatorio.arquivosPendentes).toBe(0);
    expect(relatorio.arquivosPadronizados).toBe(1);
  });
});
