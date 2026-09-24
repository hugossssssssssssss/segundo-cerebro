import { describe, it, expect } from "vitest";
import {
  reconstruirTextoEParagrafosPdf,
  detectarTituloCapitulo,
  agruparPaginasEmCapitulos,
} from "./conversorPdfTexto";
import type { ItemTextoPdf, PaginaProcessadaPdf } from "./conversorPdfTexto";

describe("Reconstrução de parágrafos e espaçamento do PDF", () => {
  it("não adiciona espaços indevidos entre letras ou trechos da mesma palavra", () => {
    // Simulando PDF onde "Design" vem fatiado em "Des" e "ign"
    const items: ItemTextoPdf[] = [
      { str: "Des", transform: [12, 0, 0, 12, 50, 700], width: 25, height: 12 },
      { str: "ign", transform: [12, 0, 0, 12, 75, 700], width: 20, height: 12 },
      { str: "Gráfico", transform: [12, 0, 0, 12, 105, 700], width: 45, height: 12 }, // gap > 1.8 -> espaço
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res).toEqual(["Design Gráfico"]);
  });

  it("junta linhas contínuas em um único parágrafo fluido sem quebrar frases", () => {
    const items: ItemTextoPdf[] = [
      { str: "O objetivo deste projeto é construir uma ferramenta", transform: [12, 0, 0, 12, 50, 700], width: 250, height: 12 },
      { str: "que permita converter livros e manuais com qualidade", transform: [12, 0, 0, 12, 50, 685], width: 260, height: 12 }, // salto de 15pt (~1.25x)
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
    // No PDF, o texto da fala veio antes na lista, e o travessão veio depois,
    // mas geometricamente o travessão está à esquerda (x=30 vs x=50).
    const items: ItemTextoPdf[] = [
      { str: "Como você se chama? — perguntou ele.", transform: [12, 0, 0, 12, 50, 700], width: 200, height: 12 },
      { str: "—", transform: [12, 0, 0, 12, 30, 700], width: 10, height: 12 },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res[0]).toBe("— Como você se chama? — perguntou ele.");
  });

  it("reconcilia letra capitular (Drop Cap) inicial separada do parágrafo", () => {
    // Capitular "O" com fontSize 32pt e Y na linha de base,
    // seguida do resto da palavra "utro dia acordei cedo"
    const items: ItemTextoPdf[] = [
      { str: "O", transform: [32, 0, 0, 32, 40, 700], width: 25, height: 32 },
      { str: "utro dia acordei cedo e saí para caminhar.", transform: [12, 0, 0, 12, 70, 700], width: 250, height: 12 },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res[0]).toBe("Outro dia acordei cedo e saí para caminhar.");
  });

  it("separa parágrafos reais quando há espaçamento vertical maior", () => {
    const items: ItemTextoPdf[] = [
      { str: "Primeiro parágrafo do livro.", transform: [12, 0, 0, 12, 50, 700], width: 150, height: 12 },
      // Salto vertical de 35pt (> 2x o fontSize 12)
      { str: "Segundo parágrafo independente.", transform: [12, 0, 0, 12, 50, 665], width: 160, height: 12 },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res.length).toBe(2);
    expect(res[0]).toBe("Primeiro parágrafo do livro.");
    expect(res[1]).toBe("Segundo parágrafo independente.");
  });
});

describe("Detecção de capítulos", () => {
  it("detecta títulos com palavra 'Capítulo' ou 'Chapter'", () => {
    expect(detectarTituloCapitulo("Capítulo 1: O Início").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("CAPÍTULO II").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("Chapter 5 - The Journey").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("PARTE PRIMEIRA").ehTitulo).toBe(true);
  });

  it("detecta seções clássicas de livros", () => {
    expect(detectarTituloCapitulo("Prólogo").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("Epílogo").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("Introdução").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("Prefácio").ehTitulo).toBe(true);
  });

  it("detecta algarismos romanos isolados como capítulos", () => {
    const det = detectarTituloCapitulo("IV");
    expect(det.ehTitulo).toBe(true);
    expect(det.tituloNormalizado).toBe("Capítulo IV");
  });

  it("não marca parágrafos normais de texto como capítulos", () => {
    expect(detectarTituloCapitulo("Ele caminhou até a esquina e olhou para trás com cautela.").ehTitulo).toBe(false);
  });
});

describe("Agrupamento contínuo em capítulos", () => {
  it("agrupa texto de múltiplas páginas dentro do mesmo capítulo sem quebra forçada", () => {
    const paginas: PaginaProcessadaPdf[] = [
      {
        numPagina: 1,
        paragrafos: ["Capítulo 1", "Primeiro parágrafo do capítulo 1."],
        imagens: [],
      },
      {
        numPagina: 2,
        paragrafos: ["Continuação do capítulo 1 na página seguinte."],
        imagens: [],
      },
      {
        numPagina: 3,
        paragrafos: ["Capítulo 2", "Início do capítulo 2."],
        imagens: [],
      },
    ];

    const caps = agruparPaginasEmCapitulos(paginas);
    expect(caps.length).toBe(2);
    expect(caps[0].titulo).toContain("Capítulo 1");
    // O texto da página 2 foi agregado no Capítulo 1
    expect(caps[0].paragrafos).toContain("Continuação do capítulo 1 na página seguinte.");
    expect(caps[1].titulo).toContain("Capítulo 2");
  });

  it("mantém fluxo contínuo quando não há títulos explícitos de capítulos", () => {
    const paginas: PaginaProcessadaPdf[] = [
      { numPagina: 1, paragrafos: ["Texto da página 1."], imagens: [] },
      { numPagina: 2, paragrafos: ["Texto da página 2."], imagens: [] },
    ];

    const caps = agruparPaginasEmCapitulos(paginas);
    expect(caps.length).toBe(1);
    expect(caps[0].paragrafos).toEqual(["Texto da página 1.", "Texto da página 2."]);
    expect(caps[0].ocultarTitulo).toBe(true);
  });
});
