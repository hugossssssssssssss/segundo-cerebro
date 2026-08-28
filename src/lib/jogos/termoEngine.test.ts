import { describe, it, expect } from "vitest";
import {
  avaliarChute,
  calcularStatusTecladoMulti,
  gerarTextoCompartilhamentoMulti,
} from "./termoEngine";
import {
  palavraExisteNoDicionario,
  obterPalavrasDoDia,
  obterPalavrasAleatorias,
  normalizarPalavra,
  obterPalavraOriginal,
} from "./palavras";
import {
  ESTATISTICAS_INICIAIS_MODO,
  atualizarEstatisticasComResultado,
  criarNovoJogo,
} from "./termoStorage";

describe("palavras.ts - multi-modos", () => {
  it("normaliza palavras removendo acentos e espaços", () => {
    expect(normalizarPalavra("  Ábaco  ")).toBe("ABACO");
    expect(normalizarPalavra("maçã")).toBe("MACA");
    expect(normalizarPalavra("jóia")).toBe("JOIA");
    expect(normalizarPalavra("Coração")).toBe("CORACAO");
  });

  it("identifica palavras válidas no dicionário português", () => {
    expect(palavraExisteNoDicionario("TERMO")).toBe(true);
    expect(palavraExisteNoDicionario("termo")).toBe(true);
    expect(palavraExisteNoDicionario("CASAS")).toBe(true);
    expect(palavraExisteNoDicionario("LIVRO")).toBe(true);
    expect(palavraExisteNoDicionario("ÁBACO")).toBe(true);
    
    // Palavras inválidas
    expect(palavraExisteNoDicionario("ZZZZZ")).toBe(false);
    expect(palavraExisteNoDicionario("ABCDE")).toBe(false);
  });

  it("recupera a acentuação original da palavra", () => {
    expect(obterPalavraOriginal("ABACO")).toBe("ÁBACO");
    expect(obterPalavraOriginal("ACUDA")).toBe("AÇUDA");
  });

  it("calcula palavras determinísticas para Dueto (2) e Quarteto (4)", () => {
    const data = new Date("2026-08-28T12:00:00");
    const dueto = obterPalavrasDoDia("dueto", data);
    const quarteto = obterPalavrasDoDia("quarteto", data);

    expect(dueto.palavras.length).toBe(2);
    expect(dueto.palavras[0]).not.toBe(dueto.palavras[1]);

    expect(quarteto.palavras.length).toBe(4);
    const setQuarteto = new Set(quarteto.palavras);
    expect(setQuarteto.size).toBe(4);
  });

  it("sorteia N palavras aleatórias distintas para modo infinito", () => {
    const duetoInf = obterPalavrasAleatorias(2);
    const quartetoInf = obterPalavrasAleatorias(4);

    expect(duetoInf.length).toBe(2);
    expect(new Set(duetoInf).size).toBe(2);

    expect(quartetoInf.length).toBe(4);
    expect(new Set(quartetoInf).size).toBe(4);
  });
});

describe("termoEngine.ts - Dueto & Quarteto", () => {
  it("avalia acerto perfeito (todas verdes)", () => {
    const resultado = avaliarChute("TERMO", "TERMO");
    expect(resultado.ehCorreta).toBe(true);
    expect(resultado.letras.every((l) => l.status === "correta")).toBe(true);
  });

  it("avalia letras existentes na posição errada (amarelas)", () => {
    const resultado = avaliarChute("METRO", "TERMO");
    expect(resultado.ehCorreta).toBe(false);
    expect(resultado.letras[0].status).toBe("existe");
    expect(resultado.letras[1].status).toBe("correta");
    expect(resultado.letras[2].status).toBe("existe");
    expect(resultado.letras[3].status).toBe("existe");
    expect(resultado.letras[4].status).toBe("correta");
  });

  it("calcula teclado multi-status para o Dueto (2 tabuleiros)", () => {
    // Tabuleiro 1: TERMO (tentativa: "TESTE")
    // Tabuleiro 2: AMORA (tentativa: "TESTE")
    const tentativasPorTab = [["TESTE"], ["TESTE"]];
    const palavras = ["TERMO", "AMORA"];

    const statusMulti = calcularStatusTecladoMulti(tentativasPorTab, palavras);

    // Letra T:
    // Tab 1 (TERMO): correta na pos 0 -> "correta"
    // Tab 2 (AMORA): não tem T -> "errada"
    expect(statusMulti["T"]).toEqual(["correta", "errada"]);

    // Letra E:
    // Tab 1 (TERMO): correta na pos 1 -> "correta"
    // Tab 2 (AMORA): não tem E -> "errada"
    expect(statusMulti["E"]).toEqual(["correta", "errada"]);
  });

  it("calcula teclado multi-status para o Quarteto (4 tabuleiros)", () => {
    const tentativasPorTab = [["PLUMA"], ["PLUMA"], ["PLUMA"], ["PLUMA"]];
    const palavras = ["PLUMA", "NOITE", "AMORA", "LIVRO"];

    const statusMulti = calcularStatusTecladoMulti(tentativasPorTab, palavras);

    // Letra P:
    // Tab 1 (PLUMA): correta
    // Tab 2 (NOITE): errada
    // Tab 3 (AMORA): errada
    // Tab 4 (LIVRO): errada
    expect(statusMulti["P"]).toEqual(["correta", "errada", "errada", "errada"]);

    // Letra L:
    // Tab 1 (PLUMA): correta
    // Tab 2 (NOITE): errada
    // Tab 3 (AMORA): errada
    // Tab 4 (LIVRO): existe
    expect(statusMulti["L"]).toEqual(["correta", "errada", "errada", "existe"]);
  });

  it("gera texto de compartilhamento para Dueto e Quarteto", () => {
    const shareDueto = gerarTextoCompartilhamentoMulti(
      "dueto",
      50,
      [["TERMO", "AMORA"], ["TERMO", "AMORA"]],
      ["TERMO", "AMORA"],
      true,
      "diario"
    );

    expect(shareDueto).toContain("Klaus Dueto #50 2/7");

    const shareQuarteto = gerarTextoCompartilhamentoMulti(
      "quarteto",
      50,
      [["TERMO"], ["TERMO"], ["TERMO"], ["TERMO"]],
      ["TERMO", "AMORA", "LIVRO", "NOITE"],
      false,
      "infinito"
    );

    expect(shareQuarteto).toContain("Klaus Quarteto (Infinito) X/9");
  });
});

describe("termoStorage.ts - Estatísticas e Criação de Jogos", () => {
  it("cria jogos com a quantidade correta de tabuleiros para cada modo", () => {
    const jogoTermo = criarNovoJogo("termo", new Date(), "diario");
    const jogoDueto = criarNovoJogo("dueto", new Date(), "diario");
    const jogoQuarteto = criarNovoJogo("quarteto", new Date(), "diario");

    expect(jogoTermo.palavras.length).toBe(1);
    expect(jogoTermo.tentativasPorTabuleiro.length).toBe(1);

    expect(jogoDueto.palavras.length).toBe(2);
    expect(jogoDueto.tentativasPorTabuleiro.length).toBe(2);

    expect(jogoQuarteto.palavras.length).toBe(4);
    expect(jogoQuarteto.tentativasPorTabuleiro.length).toBe(4);
  });

  it("atualiza estatísticas respeitando o limite de tentativas do modo", () => {
    const estDueto = ESTATISTICAS_INICIAIS_MODO("dueto");
    expect(Object.keys(estDueto.distribuicao).length).toBe(7);

    const estAtualizada = atualizarEstatisticasComResultado(
      estDueto,
      true,
      7,
      "2026-08-28"
    );

    expect(estAtualizada.vitorias).toBe(1);
    expect(estAtualizada.distribuicao[7]).toBe(1);
  });
});
