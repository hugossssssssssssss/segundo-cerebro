import { describe, it, expect } from "vitest";
import {
  aplicarAlinhamentoAoMarkdown,
  extrairAlinhamentoDoMarkdown,
  restaurarAlinhamentoEmBlocos,
  type BlocoComAlinhamento,
} from "./alinhamentoMarkdown";

describe("alinhamentoMarkdown", () => {
  it("preserva e restaura alinhamento ao centro e à direita", () => {
    const blocosOriginais: BlocoComAlinhamento[] = [
      {
        id: "1",
        type: "heading",
        props: { textAlignment: "center", level: 1 },
        content: [{ type: "text", text: "Título Centralizado" }],
      },
      {
        id: "2",
        type: "paragraph",
        props: { textAlignment: "left" },
        content: [{ type: "text", text: "Parágrafo normal à esquerda" }],
      },
      {
        id: "3",
        type: "paragraph",
        props: { textAlignment: "right" },
        content: [{ type: "text", text: "Assinatura alinhada à direita" }],
      },
    ];

    const mdBase = "# Título Centralizado\n\nParágrafo normal à esquerda\n\nAssinatura alinhada à direita";
    const mdComAlinhamento = aplicarAlinhamentoAoMarkdown(mdBase, blocosOriginais);

    expect(mdComAlinhamento).toContain("<!-- align:center -->");
    expect(mdComAlinhamento).toContain("<!-- align:right -->");

    const { markdownLimpo, alinhamentos } = extrairAlinhamentoDoMarkdown(mdComAlinhamento);
    expect(markdownLimpo).not.toContain("<!-- align:");
    expect(markdownLimpo).toContain("# Título Centralizado");
    expect(alinhamentos).toEqual(["center", "left", "right"]);

    // Simula blocos gerados pelo BlockNote a partir do markdownLimpo
    const blocosParseados: BlocoComAlinhamento[] = [
      {
        id: "b1",
        type: "heading",
        props: { textAlignment: "left", level: 1 },
        content: [{ type: "text", text: "Título Centralizado" }],
      },
      {
        id: "b2",
        type: "paragraph",
        props: { textAlignment: "left" },
        content: [{ type: "text", text: "Parágrafo normal à esquerda" }],
      },
      {
        id: "b3",
        type: "paragraph",
        props: { textAlignment: "left" },
        content: [{ type: "text", text: "Assinatura alinhada à direita" }],
      },
    ];

    const blocosRestaurados = restaurarAlinhamentoEmBlocos(blocosParseados, alinhamentos);

    expect(blocosRestaurados[0].props?.textAlignment).toBe("center");
    expect(blocosRestaurados[1].props?.textAlignment).toBe("left");
    expect(blocosRestaurados[2].props?.textAlignment).toBe("right");
  });

  it("reconhece tags HTML <p align='center'> e <div align='center'> existentes", () => {
    const md = '<div align="center">\n# Meu Título\n</div>\n\nTexto comum';
    const blocos: BlocoComAlinhamento[] = [
      {
        id: "1",
        type: "heading",
        props: { textAlignment: "left" },
        content: [{ type: "text", text: "# Meu Título" }],
      },
      {
        id: "2",
        type: "paragraph",
        props: { textAlignment: "left" },
        content: [{ type: "text", text: "Texto comum" }],
      },
    ];

    const restaurados = restaurarAlinhamentoEmBlocos(blocos, md);
    expect(restaurados[0].props?.textAlignment).toBe("center");
    expect(restaurados[1].props?.textAlignment).toBe("left");
  });
});
