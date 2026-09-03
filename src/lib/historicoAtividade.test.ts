import { describe, it, expect } from "vitest";
import { compilarHistoricoAtividades, calcularNivelIntensidade, normalizarDataParaIso } from "./historicoAtividade";
import type { ItemRepo } from "./repo";

describe("historicoAtividade", () => {
  it("normaliza formatos de datas variados para YYYY-MM-DD", () => {
    expect(normalizarDataParaIso("2026-09-03")).toBe("2026-09-03");
    expect(normalizarDataParaIso("2026-09-03T14:30:00.000Z")).toBe("2026-09-03");
    expect(normalizarDataParaIso("2026-09-03 15:00")).toBe("2026-09-03");
    expect(normalizarDataParaIso(new Date(2026, 8, 3))).toBe("2026-09-03");
    expect(normalizarDataParaIso("")).toBeNull();
  });

  it("calcula os níveis de intensidade de 0 a 4 estilo GitHub", () => {
    expect(calcularNivelIntensidade(0)).toBe(0);
    expect(calcularNivelIntensidade(1)).toBe(1);
    expect(calcularNivelIntensidade(2)).toBe(1);
    expect(calcularNivelIntensidade(3)).toBe(2);
    expect(calcularNivelIntensidade(4)).toBe(2);
    expect(calcularNivelIntensidade(5)).toBe(3);
    expect(calcularNivelIntensidade(7)).toBe(3);
    expect(calcularNivelIntensidade(8)).toBe(4);
    expect(calcularNivelIntensidade(20)).toBe(4);
  });

  it("compila atividades de notas, tarefas, metas e referências por dia", () => {
    const itensMock: ItemRepo[] = [
      {
        caminho: "notas/2026-09-03-brainstorm.md",
        nome: "2026-09-03-brainstorm.md",
        sha: "s1",
        tamanho: 100,
        texto: "---\ntitulo: Brainstorm\ncriado: '2026-09-03'\n---\n# Brainstorm",
        doc: {
          dados: { titulo: "Brainstorm", criado: "2026-09-03" },
          corpo: "# Brainstorm",
        },
      },
      {
        caminho: "tarefas/design.md",
        nome: "design.md",
        sha: "s2",
        tamanho: 100,
        texto: "---\ntitulo: Design Final\nstatus: feito\ncriado: '2026-09-02'\nconcluida_em: '2026-09-03'\n---\n# Design Final",
        doc: {
          dados: { titulo: "Design Final", status: "feito", criado: "2026-09-02", concluida_em: "2026-09-03" },
          corpo: "# Design Final",
        },
      },
      {
        caminho: "referencias/grid.md",
        nome: "grid.md",
        sha: "s3",
        tamanho: 100,
        texto: "---\ntitulo: Grid Suíço\ncriado: '2026-09-03'\nimagem: referencias/imagens/grid.png\n---\n# Grid Suíço",
        doc: {
          dados: { titulo: "Grid Suíço", criado: "2026-09-03", imagem: "referencias/imagens/grid.png" },
          corpo: "# Grid Suíço",
        },
      },
    ];

    const mapa = compilarHistoricoAtividades(itensMock);

    expect(mapa["2026-09-03"]).toBeDefined();
    // No dia 03: criação da nota, conclusão da tarefa e criação da referência
    expect(mapa["2026-09-03"].length).toBeGreaterThanOrEqual(3);

    const tipos = mapa["2026-09-03"].map((a) => a.tipo);
    expect(tipos).toContain("nota");
    expect(tipos).toContain("tarefa");
    expect(tipos).toContain("referencia");

    // No dia 02: criação da tarefa
    expect(mapa["2026-09-02"]).toBeDefined();
    expect(mapa["2026-09-02"][0].acao).toBe("Criou tarefa");
  });
});
