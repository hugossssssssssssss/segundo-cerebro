import { describe, it, expect } from "vitest";
import {
  distancia,
  calcularDimensoesRetificadas,
  cantosPadrao,
  calcularMatrizProjetivaReversa,
} from "./scannerUtils";

describe("scannerUtils", () => {
  it("calcula a distância euclidiana corretamente", () => {
    expect(distancia({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distancia({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0);
  });

  it("calcula dimensões retificadas com base nos 4 cantos", () => {
    const cantos = {
      tl: { x: 0, y: 0 },
      tr: { x: 100, y: 0 },
      br: { x: 100, y: 200 },
      bl: { x: 0, y: 200 },
    };

    const { largura, altura } = calcularDimensoesRetificadas(cantos);
    expect(largura).toBe(100);
    expect(altura).toBe(200);
  });

  it("gera cantos padrão com margem proporcional", () => {
    const cantos = cantosPadrao(1000, 2000);
    expect(cantos.tl).toEqual({ x: 50, y: 100 });
    expect(cantos.tr).toEqual({ x: 950, y: 100 });
    expect(cantos.br).toEqual({ x: 950, y: 1900 });
    expect(cantos.bl).toEqual({ x: 50, y: 1900 });
  });

  it("calcula a matriz projetiva reversa sem erros de divisão por zero", () => {
    const cantos = {
      tl: { x: 10, y: 20 },
      tr: { x: 190, y: 15 },
      br: { x: 200, y: 280 },
      bl: { x: 15, y: 290 },
    };

    const matriz = calcularMatrizProjetivaReversa(200, 300, cantos);
    expect(matriz).toHaveLength(9);
    matriz.forEach((val) => {
      expect(Number.isFinite(val)).toBe(true);
    });
  });
});
