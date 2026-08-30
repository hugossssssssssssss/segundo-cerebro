import { describe, it, expect } from "vitest";
import { listarItensLixeira, PASTA_LIXEIRA } from "./lixeira";
import type { ItemRepo } from "./repo";
import { lerMarkdown } from "./markdown";

describe("lixeira - Soberania e reversibilidade", () => {
  it("filtra itens da lixeira e extrai metadados de reversão", () => {
    const acervo: ItemRepo[] = [
      {
        caminho: `${PASTA_LIXEIRA}/notas/projeto.md`,
        nome: "projeto.md",
        sha: "s1",
        tamanho: 100,
        texto: "---\ntitulo: Projeto Secreto\napagado_em: '2026-08-30T10:00:00.000Z'\ncaminho_origem: notas/projeto.md\n---\nConteudo",
        doc: lerMarkdown("---\ntitulo: Projeto Secreto\napagado_em: '2026-08-30T10:00:00.000Z'\ncaminho_origem: notas/projeto.md\n---\nConteudo"),
      },
      {
        caminho: "notas/ativa.md",
        nome: "ativa.md",
        sha: "s2",
        tamanho: 50,
        texto: "---\ntitulo: Nota Ativa\n---\nViva",
        doc: lerMarkdown("---\ntitulo: Nota Ativa\n---\nViva"),
      },
    ];

    const lixeira = listarItensLixeira(acervo);
    expect(lixeira).toHaveLength(1);
    expect(lixeira[0].titulo).toBe("Projeto Secreto");
    expect(lixeira[0].caminhoOrigem).toBe("notas/projeto.md");
    expect(lixeira[0].apagadoEm).toBe("2026-08-30T10:00:00.000Z");
  });
});
