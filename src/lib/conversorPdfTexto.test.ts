import { describe, it, expect } from "vitest";
import { reconstruirTextoEParagrafosPdf } from "./conversorPdfTexto";
import type { ItemTextoPdf } from "./conversorPdfTexto";

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
