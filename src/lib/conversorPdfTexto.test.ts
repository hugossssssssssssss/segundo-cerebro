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

describe("Blindagem contra falsos capítulos (falas com números e palavra Conclusão)", () => {
  it("NUNCA transforma falas com números ou palavras isoladas em capítulos", () => {
    // Falas com travessão
    expect(detectarTituloCapitulo("— Sete.").ehTitulo).toBe(false);
    expect(detectarTituloCapitulo("— Oito.").ehTitulo).toBe(false);
    expect(detectarTituloCapitulo("— Três, disse ele.").ehTitulo).toBe(false);
    expect(detectarTituloCapitulo("— Quatro pessoas estavam na sala.").ehTitulo).toBe(false);

    // Palavras com números em minúsculas
    expect(detectarTituloCapitulo("oito").ehTitulo).toBe(false);
    expect(detectarTituloCapitulo("sete").ehTitulo).toBe(false);
    expect(detectarTituloCapitulo("cinco").ehTitulo).toBe(false);

    // Palavras com números em fonte de corpo comum (12pt)
    expect(detectarTituloCapitulo("Sete", 12, 12).ehTitulo).toBe(false);
    expect(detectarTituloCapitulo("Oito", 12, 12).ehTitulo).toBe(false);

    // Mas com destaque tipográfico real de título (ex: 20pt) deve ser aceito
    expect(detectarTituloCapitulo("Sete", 20, 12).ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("Capítulo Sete", 12, 12).ehTitulo).toBe(true);
  });

  it("NUNCA transforma texto corrido iniciado por 'Conclusão' em capítulo", () => {
    expect(
      detectarTituloCapitulo("Conclusão do raciocínio anterior nos leva a crer que tudo foi feito.").ehTitulo
    ).toBe(false);
    expect(
      detectarTituloCapitulo("Conclusão que podemos tirar deste caso é evidente.").ehTitulo
    ).toBe(false);
    expect(
      detectarTituloCapitulo("Conclusão da análise mostra que os dados estão corretos.").ehTitulo
    ).toBe(false);

    // Mas a palavra isolada como seção do livro deve ser aceita
    expect(detectarTituloCapitulo("Conclusão").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("CONCLUSÃO").ehTitulo).toBe(true);
    expect(detectarTituloCapitulo("Conclusão: Considerações Finais").ehTitulo).toBe(true);
  });

  it("agruparPaginasEmCapitulos não quebra a página anterior por frase com 'Conclusão' nem por falas com números", () => {
    const paginas: PaginaProcessadaPdf[] = [
      {
        numPagina: 1,
        paragrafos: [
          "Texto da página 1.",
          "Conclusão do raciocínio anterior nos leva a crer que a tese se sustenta.",
          "Texto final da página 1.",
        ],
        imagens: [],
      },
      {
        numPagina: 2,
        paragrafos: [
          "— Quantos eram?",
          "— Oito.",
          "— Tem certeza?",
          "— Sim, eram sete ou oito pessoas ao todo.",
        ],
        imagens: [],
      },
    ];

    const caps = agruparPaginasEmCapitulos(paginas);
    // Deve manter como um único fluxo de leitura sem capítulos falsos
    expect(caps.length).toBe(1);
    expect(caps[0].titulo).toBe("Leitura");
    expect(caps[0].ocultarTitulo).toBe(true);
    expect(caps[0].paragrafos).toContain(
      "Conclusão do raciocínio anterior nos leva a crer que a tese se sustenta."
    );
    expect(caps[0].paragrafos).toContain("— Oito.");

    // No modo estritamente contínuo, mesmo com capítulos explícitos, mantém fluxo único sem cortes
    const paginasComCapitulo: PaginaProcessadaPdf[] = [
      { numPagina: 1, paragrafos: ["CAPÍTULO 1", "Texto do capítulo 1."], imagens: [] },
      { numPagina: 2, paragrafos: ["CAPÍTULO 2", "Texto do capítulo 2."], imagens: [] },
    ];
    const capsContinuo = agruparPaginasEmCapitulos(paginasComCapitulo, { modo: "continuo" });
    expect(capsContinuo.length).toBe(1);
    expect(capsContinuo[0].titulo).toBe("Leitura");
    expect(capsContinuo[0].ocultarTitulo).toBe(true);
    expect(capsContinuo[0].paragrafos.length).toBe(4);
  });
});

describe("Reconstrução de diálogos com travessão e estrofes de poesia", () => {
  it("reconcilia linha física com travessão órfão no início da fala", () => {
    const items: ItemTextoPdf[] = [
      // Travessão emitido isolado em uma linha física (y=700)
      { str: "—", transform: [12, 0, 0, 12, 40, 700], width: 8, height: 12 },
      // Texto da fala na mesma altura ou ligeiramente deslocado
      { str: "Você tem certeza de que quer fazer isso?", transform: [12, 0, 0, 12, 52, 698], width: 220, height: 12 },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res.length).toBe(1);
    expect(res[0]).toBe("— Você tem certeza de que quer fazer isso?");
  });

  it("não quebra parágrafo no meio de uma fala longa dividida em múltiplas linhas do PDF", () => {
    const items: ItemTextoPdf[] = [
      {
        str: "— Eu estive pensando bastante sobre tudo o que aconteceu durante",
        transform: [12, 0, 0, 12, 50, 700],
        width: 320,
        height: 12,
      },
      {
        str: "aquela tarde e cheguei à conclusão de que devemos esperar.",
        transform: [12, 0, 0, 12, 50, 686],
        width: 300,
        height: 12,
      },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res.length).toBe(1);
    expect(res[0]).toBe(
      "— Eu estive pensando bastante sobre tudo o que aconteceu durante aquela tarde e cheguei à conclusão de que devemos esperar."
    );
  });

  it("mantém fala unida mesmo com inciso do narrador que fecha com travessão na linha seguinte", () => {
    const items: ItemTextoPdf[] = [
      {
        str: "— Não posso aceitar essa proposta — disse ele com firmeza —",
        transform: [12, 0, 0, 12, 50, 700],
        width: 310,
        height: 12,
      },
      {
        str: "— enquanto não tivermos todas as garantias necessárias.",
        transform: [12, 0, 0, 12, 50, 686],
        width: 290,
        height: 12,
      },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res.length).toBe(1);
    expect(res[0]).toContain("— Não posso aceitar essa proposta — disse ele com firmeza");
    expect(res[0]).toContain("enquanto não tivermos todas as garantias necessárias.");
  });

  it("preserva estrofes de versos mantendo cada verso em sua linha com quebra", () => {
    const items: ItemTextoPdf[] = [
      { str: "Amor é fogo que arde sem se ver,", transform: [12, 0, 0, 12, 100, 700], width: 170, height: 12 },
      { str: "É ferida que dói e não se sente;", transform: [12, 0, 0, 12, 100, 686], width: 165, height: 12 },
      { str: "É um contentamento descontente;", transform: [12, 0, 0, 12, 100, 672], width: 168, height: 12 },
      { str: "É dor que desatina sem doer.", transform: [12, 0, 0, 12, 100, 658], width: 155, height: 12 },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res.length).toBe(1);
    expect(res[0]).toContain("\n");
    const versos = res[0].split("\n");
    expect(versos.length).toBe(4);
    expect(versos[0]).toBe("Amor é fogo que arde sem se ver,");
    expect(versos[1]).toBe("É ferida que dói e não se sente;");
  });

  it("não confunde frases com 'livro.' ou que começam com minúscula como capítulos", () => {
    // Caso real do livro Chama de Ferro pág. 37
    const fraseLivro = "livro. O que você escreveu pra ela.";
    expect(detectarTituloCapitulo(fraseLivro).ehTitulo).toBe(false);

    // Diálogo quebrado com a palavra 'livro.' na linha seguinte
    const items: ItemTextoPdf[] = [
      {
        str: "— Foi ela que mandou fazer. Ela também me deu seu",
        transform: [12, 0, 0, 12, 50, 700],
        width: 320,
        height: 12,
      },
      {
        str: "livro. O que você escreveu pra ela.",
        transform: [12, 0, 0, 12, 50, 686],
        width: 250,
        height: 12,
      },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res.length).toBe(1);
    expect(res[0]).toBe(
      "— Foi ela que mandou fazer. Ela também me deu seu livro. O que você escreveu pra ela."
    );
  });

  it("reconcilia Drop Cap (capitular) com parágrafo e não gruda no título do capítulo anterior", () => {
    // Caso real do livro Chama de Ferro pág. 13 (Capítulo Um + Letra capitular 'O')
    const items: ItemTextoPdf[] = [
      { str: "CAPÍTULO", transform: [30, 0, 0, 30, 200, 750], width: 140, height: 30 },
      { str: "UM", transform: [30, 0, 0, 30, 200, 715], width: 40, height: 30 },
      { str: "O", transform: [51, 0, 0, 51, 50, 630], width: 35, height: 51 },
      {
        str: "gosto da revolução é doce.",
        transform: [15, 0, 0, 15, 90, 650],
        width: 380,
        height: 15,
      },
      {
        str: "Encaro meu irmão mais velho.",
        transform: [15, 0, 0, 15, 50, 630],
        width: 370,
        height: 15,
      },
    ];

    const res = reconstruirTextoEParagrafosPdf(items);
    expect(res).toContain("CAPÍTULO UM");
    expect(res).not.toContain("CAPÍTULO UM O");
    expect(res.join(" ")).toContain("O gosto da revolução é doce.");
    expect(res.join(" ")).toContain("Encaro meu irmão mais velho.");
  });
});

