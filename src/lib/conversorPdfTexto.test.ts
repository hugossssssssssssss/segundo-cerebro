import { describe, it, expect } from "vitest";
import {
  reconstruirTextoEParagrafosPdf,
  detectarTituloCapitulo,
  agruparPaginasEmCapitulos,
  restaurarPrimeiraLetraSeTruncada,
} from "./conversorPdfTexto";
import type { ItemTextoPdf, PaginaProcessadaPdf } from "./conversorPdfTexto";

describe("Reconstrução de parágrafos e espaçamento do PDF", () => {
  it("não adiciona espaços indevidos entre letras ou trechos da mesma palavra", () => {
    const items: ItemTextoPdf[] = [
      { str: "Des", transform: [12, 0, 0, 12, 50, 700], width: 25, height: 12 },
      { str: "ign", transform: [12, 0, 0, 12, 75, 700], width: 20, height: 12 },
      { str: "Gráfico", transform: [12, 0, 0, 12, 105, 700], width: 45, height: 12 },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res).toEqual(["Design Gráfico"]);
  });

  it("junta linhas contínuas em um único parágrafo fluido sem quebrar frases", () => {
    const items: ItemTextoPdf[] = [
      { str: "O objetivo deste projeto é construir uma ferramenta", transform: [12, 0, 0, 12, 50, 700], width: 250, height: 12 },
      { str: "que permita converter livros e manuais com qualidade", transform: [12, 0, 0, 12, 50, 685], width: 260, height: 12 },
      { str: "direto para o formato EPUB do Kindle.", transform: [12, 0, 0, 12, 50, 670], width: 220, height: 12 },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res.length).toBe(1);
    expect(res[0]).toBe(
      "O objetivo deste projeto é construir uma ferramenta que permita converter livros e manuais com qualidade direto para o formato EPUB do Kindle."
    );
  });

  it("remove hifenização no fim de linha", () => {
    const items: ItemTextoPdf[] = [
      { str: "Esta é uma arquite-", transform: [12, 0, 0, 12, 50, 700], width: 120, height: 12 },
      { str: "tura moderna.", transform: [12, 0, 0, 12, 50, 685], width: 90, height: 12 },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res[0]).toBe("Esta é uma arquitetura moderna.");
  });

  it("reordena travessão emitido fora de ordem no stream do PDF", () => {
    const items: ItemTextoPdf[] = [
      { str: "Como você se chama? — perguntou ele.", transform: [12, 0, 0, 12, 50, 700], width: 200, height: 12 },
      { str: "—", transform: [12, 0, 0, 12, 30, 700], width: 10, height: 12 },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res[0]).toBe("— Como você se chama? — perguntou ele.");
  });

  it("reconcilia capitular (Drop Cap) com linha de base rebaixada abaixo da linha 1", () => {
    // Capitular "E" com baseline em 685 (abaixo da linha 1 em 705), mas topo em 685 + 36 = 721
    const items: ItemTextoPdf[] = [
      { str: "ra uma vez um reino encantado", transform: [12, 0, 0, 12, 80, 705], width: 200, height: 12 },
      { str: "E", transform: [36, 0, 0, 36, 45, 685], width: 30, height: 36 },
      { str: "onde todos viviam em paz.", transform: [12, 0, 0, 12, 80, 690], width: 180, height: 12 },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res[0]).toContain("Era uma vez um reino encantado");
  });

  it("separa parágrafos reais quando há espaçamento vertical maior", () => {
    const items: ItemTextoPdf[] = [
      { str: "Primeiro parágrafo do livro.", transform: [12, 0, 0, 12, 50, 700], width: 150, height: 12 },
      { str: "Segundo parágrafo independente.", transform: [12, 0, 0, 12, 50, 665], width: 160, height: 12 },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res.length).toBe(2);
    expect(res[0]).toBe("Primeiro parágrafo do livro.");
    expect(res[1]).toBe("Segundo parágrafo independente.");
  });
});

describe("Detecção de capítulos", () => {
  it("detecta títulos com palavra 'Capítulo' ou 'Chapter' e números por extenso", () => {
    expect(detectarTituloCapitulo("Capítulo 1: O Início").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("CAPÍTULO UM").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("CAPÍTULO UM").tituloNormalizado).toBe("Capítulo Um");
    expect(detectarTituloCapitulo("Capítulo Dois").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("CAPÍTULO II").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("Chapter 5 - The Journey").ehTitulo).toBe(true);
  });

  it("detecta seções clássicas de livros", () => {
    expect(detectarTituloCapitulo("Prólogo").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("Epílogo").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("Introdução").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("Prefácio").ehTitulo).toBe(true);
  });

  it("detecta números por extenso isolados como capítulos", () => {
    const det = detectarTituloCapitulo("Um");
    expect(det.ehTitulo).toBe(true);
    expect(det.tituloNormalizado).toBe("Capítulo Um");
  });

  it("não marca parágrafos normais de texto como capítulos", () => {
    expect(detectarTituloCapitulo("Ele caminhou até a esquina e olhou para trás com cautela.").ehTitulo).toBe(false);
  });
});

describe("Restauração contextual de início truncado", () => {
  it("restaura inícios de parágrafos truncados sem primeira letra", () => {
    expect(restaurarPrimeiraLetraSeTruncada("ra uma vez")).toBe("Era uma vez");
    expect(restaurarPrimeiraLetraSeTruncada("uando ele chegou")).toBe("Quando ele chegou");
    expect(restaurarPrimeiraLetraSeTruncada("aquele instante")).toBe("Naquele instante");
    expect(restaurarPrimeiraLetraSeTruncada("m dia ensolarado")).toBe("Um dia ensolarado");
    expect(restaurarPrimeiraLetraSeTruncada("avia muita gente")).toBe("Havia muita gente");
  });
});

describe("Agrupamento contínuo em capítulos", () => {
  it("agrupa texto de múltiplas páginas dentro do mesmo capítulo sem quebra forçada", () => {
    const paginas: PaginaProcessadaPdf[] = [
      {
        numPagina: 1,
        paragrafos: ["CAPÍTULO UM", "Primeiro parágrafo do capítulo 1."],
        imagens: [],
      },
      {
        numPagina: 2,
        paragrafos: ["Continuação do capítulo 1 na página seguinte."],
        imagens: [],
      },
      {
        numPagina: 3,
        paragrafos: ["CAPÍTULO DOIS", "Início do capítulo 2."],
        imagens: [],
      },
    ];

    const caps = agruparPaginasEmCapitulos(paginas);
    expect(caps.length).toBe(2);
    expect(caps[0].titulo).toBe("Capítulo Um");
    expect(caps[0].paragrafos).toContain("Continuação do capítulo 1 na página seguinte.");
    expect(caps[1].titulo).toBe("Capítulo Dois");
  });

  it("NUNCA fatia livros sem títulos de capítulos em 'Parte 1', 'Parte 2'", () => {
    // 30 páginas contínuas
    const paginas: PaginaProcessadaPdf[] = [];
    for (let i = 1; i <= 30; i++) {
      paginas.push({
        numPagina: i,
        paragrafos: [`Texto contínuo da página ${i}.`],
        imagens: [],
      });
    }

    const caps = agruparPaginasEmCapitulos(paginas);
    expect(caps.length).toBe(1);
    expect(caps[0].titulo).not.toContain("Parte");
    expect(caps[0].ocultarTitulo).toBe(true);
    expect(caps[0].paragrafos.length).toBe(30);
  });
});
