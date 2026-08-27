import { describe, it, expect, vi, beforeEach } from "vitest";
import { dispararAtualizacaoAcervo, EVENTO_ACERVO_ATUALIZADO, type DetalheEventoAcervo } from "./eventos";

describe("eventos - dispararAtualizacaoAcervo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agrupa múltiplos disparos síncronos em um único evento com microtask", async () => {
    const ouvinte = vi.fn();
    window.addEventListener(EVENTO_ACERVO_ATUALIZADO, ouvinte);

    dispararAtualizacaoAcervo("notas/1.md");
    dispararAtualizacaoAcervo("notas/2.md");
    dispararAtualizacaoAcervo(["tarefas/t1.md", "tarefas/t2.md"]);

    // Antes da microtask rodar, nada foi disparado ainda
    expect(ouvinte).toHaveBeenCalledTimes(0);

    // Aguarda o flush das microtasks
    await new Promise((resolve) => queueMicrotask(() => resolve(null)));

    expect(ouvinte).toHaveBeenCalledTimes(1);
    const evento = ouvinte.mock.calls[0][0] as CustomEvent<DetalheEventoAcervo>;
    expect(evento.detail.caminhosModificados).toContain("notas/1.md");
    expect(evento.detail.caminhosModificados).toContain("notas/2.md");
    expect(evento.detail.caminhosModificados).toContain("tarefas/t1.md");
    expect(evento.detail.pastasAfetadas).toContain("notas");
    expect(evento.detail.pastasAfetadas).toContain("tarefas");

    window.removeEventListener(EVENTO_ACERVO_ATUALIZADO, ouvinte);
  });
});
