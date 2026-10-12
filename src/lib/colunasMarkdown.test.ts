import { describe, it, expect } from "vitest";
import {
  formatarColunasParaMarkdown,
  dividirMarkdownEmSegmentos,
} from "./colunasMarkdown";

describe("colunasMarkdown", () => {
  it("deve formatar 2 colunas com proporções", () => {
    const formatado = formatarColunasParaMarkdown(
      ["Coluna A texto", "Coluna B texto"],
      [1, 2]
    );

    expect(formatado).toContain('<!-- klaus:colunas proporcoes="1,2" -->');
    expect(formatado).toContain("<!-- klaus:coluna -->\n\nColuna A texto");
    expect(formatado).toContain("<!-- klaus:coluna -->\n\nColuna B texto");
    expect(formatado).toContain("<!-- klaus:fim-colunas -->");
  });

  it("deve limitar ao máximo de 5 colunas", () => {
    const formatado = formatarColunasParaMarkdown(
      ["C1", "C2", "C3", "C4", "C5", "C6 excesso"],
      [1, 1, 1, 1, 1, 1]
    );

    expect(formatado).toContain('<!-- klaus:colunas proporcoes="1,1,1,1,1" -->');
    expect(formatado).not.toContain("C6 excesso");
  });

  it("deve dividir markdown com texto comum e bloco de colunas", () => {
    const md = `
# Introdução

Texto antes das colunas.

<!-- klaus:colunas proporcoes="1,1.5" -->
<!-- klaus:coluna -->
### Esquerda
Conteúdo 1

<!-- klaus:coluna -->
### Direita
Conteúdo 2
<!-- klaus:fim-colunas -->

Texto final depois das colunas.
`;

    const segmentos = dividirMarkdownEmSegmentos(md);
    expect(segmentos).toHaveLength(3);

    expect(segmentos[0].tipo).toBe("texto");
    expect(segmentos[0].conteudo).toContain("# Introdução");

    expect(segmentos[1].tipo).toBe("colunas");
    expect(segmentos[1].proporcoes).toEqual([1, 1.5]);
    expect(segmentos[1].colunas).toHaveLength(2);
    expect(segmentos[1].colunas?.[0]).toContain("### Esquerda");
    expect(segmentos[1].colunas?.[1]).toContain("### Direita");

    expect(segmentos[2].tipo).toBe("texto");
    expect(segmentos[2].conteudo).toBe("Texto final depois das colunas.");
  });

  it("deve lidar com markdown puro sem colunas", () => {
    const md = "Apenas um parágrafo comum.";
    const segmentos = dividirMarkdownEmSegmentos(md);
    expect(segmentos).toHaveLength(1);
    expect(segmentos[0].tipo).toBe("texto");
    expect(segmentos[0].conteudo).toBe("Apenas um parágrafo comum.");
  });

  it("deve serializar e desserializar blocos com colunas de forma bidirecional", async () => {
    const { serializarBlocosComColunas, converterMarkdownParaBlocosComColunas } = await import("./colunasMarkdown");

    const editorMock = {
      blocksToMarkdownLossy: async (blocos: any[]) => {
        return blocos.map((b) => b.content || b.text || "texto").join("\n");
      },
      tryParseMarkdownToBlocks: async (md: string) => {
        return [{ type: "paragraph", content: md.trim(), props: {} }];
      },
    };

    const blocosOriginais = [
      { type: "paragraph", content: "Título acima", props: {} },
      {
        type: "columnList",
        props: {},
        children: [
          {
            type: "column",
            props: { width: 1 },
            children: [{ type: "paragraph", content: "Coluna 1", props: {} }],
          },
          {
            type: "column",
            props: { width: 2 },
            children: [{ type: "paragraph", content: "Coluna 2", props: {} }],
          },
        ],
      },
    ];

    const markdownSerializado = await serializarBlocosComColunas(editorMock, blocosOriginais);
    expect(markdownSerializado).toContain('<!-- klaus:colunas proporcoes="1,2" -->');
    expect(markdownSerializado).toContain("Coluna 1");
    expect(markdownSerializado).toContain("Coluna 2");

    const blocosReconstruidos = await converterMarkdownParaBlocosComColunas(editorMock, markdownSerializado);
    expect(blocosReconstruidos).toHaveLength(2);
    expect(blocosReconstruidos[0].content).toBe("Título acima");
    expect(blocosReconstruidos[1].type).toBe("columnList");
    expect(blocosReconstruidos[1].children).toHaveLength(2);
    expect(blocosReconstruidos[1].children[0].props.width).toBe(1);
    expect(blocosReconstruidos[1].children[1].props.width).toBe(2);
  });
});
