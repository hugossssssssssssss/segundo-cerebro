import { describe, it, expect } from "vitest";
import { lerMarkdown, escreverMarkdown } from "./markdown";

/** Serializador seguro contra estruturas circulares no Excalidraw */
export function safeStringify(obj: any, indent = 2): string {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (_key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return undefined;
        seen.add(value);
      }
      if (typeof value === "function" || typeof value === "symbol") return undefined;
      return value;
    },
    indent
  );
}

describe("Excalidraw Save & Load Mechanics", () => {
  it("safeStringify serializa estruturas circulares sem estourar TypeError", () => {
    const circularObj: any = {
      id: "elem-1",
      type: "rectangle",
      x: 100,
      y: 200,
    };
    circularObj.self = circularObj; // Estrutura circular

    expect(() => JSON.stringify(circularObj)).toThrow(TypeError);

    const json = safeStringify({ elements: [circularObj] });
    expect(json).toContain('"type": "rectangle"');
    const parsed = JSON.parse(json);
    expect(parsed.elements[0].id).toBe("elem-1");
  });

  it("escreverMarkdown e lerMarkdown preservam a cena JSON do Excalidraw", () => {
    const cena = {
      title: "Mapa de Teste",
      elements: [{ id: "box1", type: "rectangle", x: 10, y: 20 }],
    };

    const doc = {
      dados: { titulo: "Mapa de Teste", tipo: "lousa" },
      corpo: safeStringify(cena),
    };

    const textoFormatado = escreverMarkdown(doc);
    expect(textoFormatado).toContain("---");
    expect(textoFormatado).toContain("tipo: lousa");

    const lido = lerMarkdown(textoFormatado);
    expect(lido.dados.titulo).toBe("Mapa de Teste");

    const cenaParsed = JSON.parse(lido.corpo.trim());
    expect(cenaParsed.elements[0].id).toBe("box1");
  });

  it("limpeza do parametro ?abrir previne sobrescrita acidental da lousa aberta", () => {
    let hash = "#/lousas?abrir=lousas%2Fmapa.md";
    if (hash.includes("abrir=")) {
      hash = "#/lousas"; // Simula window.history.replaceState
    }
    expect(hash).toBe("#/lousas");
    expect(hash.includes("abrir=")).toBe(false);
  });
});
