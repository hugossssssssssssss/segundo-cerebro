import { describe, it, expect } from "vitest";
import { limparTextoLido, anexarTextoLido, CABECALHO_OCR } from "./ocr";

describe("limparTextoLido", () => {
  it("junta espaços e corta linhas em branco em excesso", () => {
    expect(limparTextoLido("Grade   editorial\n\n\n\nda revista")).toBe(
      "Grade editorial\n\nda revista",
    );
  });

  it("descarta ruído de borda que o OCR leu como letra solta", () => {
    expect(limparTextoLido("|\nTipografia\n.\n-")).toBe("Tipografia");
  });

  it("mantém número solto — pode ser número de página ou preço", () => {
    expect(limparTextoLido("12\nTipografia")).toBe("12\nTipografia");
  });

  it("devolve vazio quando não achou nada legível", () => {
    expect(limparTextoLido("\n \n|\n")).toBe("");
  });
});

describe("anexarTextoLido", () => {
  it("cria o bloco no fim de um corpo que já tem texto", () => {
    const r = anexarTextoLido("Minhas anotações.", "Texto da imagem aqui");
    expect(r).toContain("Minhas anotações.");
    expect(r).toContain(CABECALHO_OCR);
    expect(r.indexOf("Minhas anotações.")).toBeLessThan(r.indexOf(CABECALHO_OCR));
  });

  it("funciona com o corpo vazio", () => {
    expect(anexarTextoLido("", "Olá")).toBe(`${CABECALHO_OCR}\n\nOlá\n`);
  });

  it("SUBSTITUI o bloco anterior em vez de empilhar cópias", () => {
    const primeiro = anexarTextoLido("Nota", "primeira leitura");
    const segundo = anexarTextoLido(primeiro, "segunda leitura");

    expect(segundo.match(new RegExp(CABECALHO_OCR, "g"))).toHaveLength(1);
    expect(segundo).toContain("segunda leitura");
    expect(segundo).not.toContain("primeira leitura");
  });

  it("preserva o que vem depois do bloco — o pomodoro mora num ## Tempo", () => {
    const corpo = `Nota\n\n${CABECALHO_OCR}\n\nvelho\n\n## Tempo\n- 2026-08-13 14:20 → 14:45 (25min)`;
    const r = anexarTextoLido(corpo, "novo");

    expect(r).toContain("## Tempo");
    expect(r).toContain("(25min)");
    expect(r).toContain("novo");
    expect(r).not.toContain("velho");
  });

  it("não perde as anotações que vieram antes", () => {
    const corpo = `![](imagens/foto.jpg)\n\nPor que salvei isso.\n\n${CABECALHO_OCR}\n\nvelho`;
    const r = anexarTextoLido(corpo, "novo");

    expect(r).toContain("![](imagens/foto.jpg)");
    expect(r).toContain("Por que salvei isso.");
  });
});
