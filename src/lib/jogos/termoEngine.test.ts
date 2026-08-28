import { describe, it, expect } from "vitest";
import {
  avaliarChute,
  calcularStatusTeclado,
  gerarTextoCompartilhamento,
} from "./termoEngine";
import {
  palavraExisteNoDicionario,
  obterPalavraDoDia,
  obterPalavraAleatoria,
  normalizarPalavra,
  obterPalavraOriginal,
} from "./palavras";
import {
  ESTATISTICAS_INICIAIS,
  atualizarEstatisticasComResultado,
} from "./termoStorage";

describe("palavras.ts", () => {
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
    
    // Palavras inválidas / inventadas
    expect(palavraExisteNoDicionario("ZZZZZ")).toBe(false);
    expect(palavraExisteNoDicionario("ABCDE")).toBe(false);
    expect(palavraExisteNoDicionario("")).toBe(false);
    expect(palavraExisteNoDicionario("TEST")).toBe(false);
  });

  it("recupera a acentuação original da palavra", () => {
    expect(obterPalavraOriginal("ABACO")).toBe("ÁBACO");
    expect(obterPalavraOriginal("ACUDA")).toBe("AÇUDA");
  });

  it("calcula palavra do dia de forma determinística", () => {
    const dataA = new Date("2026-08-28T12:00:00");
    const dataB = new Date("2026-08-28T22:30:00");
    const infoA = obterPalavraDoDia(dataA);
    const infoB = obterPalavraDoDia(dataB);

    expect(infoA.palavra).toBe(infoB.palavra);
    expect(infoA.numeroJogo).toBe(infoB.numeroJogo);
    expect(infoA.dataIso).toBe("2026-08-28");
    expect(infoA.palavra.length).toBe(5);
  });

  it("sorteia palavra aleatória para modo infinito", () => {
    const palavra = obterPalavraAleatoria();
    expect(palavra).toBeDefined();
    expect(palavra.length).toBe(5);
    expect(palavraExisteNoDicionario(palavra)).toBe(true);
  });
});

describe("termoEngine.ts", () => {
  it("avalia acerto perfeito (todas verdes)", () => {
    const resultado = avaliarChute("TERMO", "TERMO");
    expect(resultado.ehCorreta).toBe(true);
    expect(resultado.letras.every((l) => l.status === "correta")).toBe(true);
  });

  it("avalia erro total (todas cinzas)", () => {
    const resultado = avaliarChute("PLUMA", "NOITE");
    expect(resultado.ehCorreta).toBe(false);
    expect(resultado.letras.every((l) => l.status === "errada")).toBe(true);
  });

  it("avalia letras existentes na posição errada (amarelas)", () => {
    // Solução: "TERMO" (T:0, E:1, R:2, M:3, O:4), Chute: "METRO" (M:0, E:1, T:2, R:3, O:4)
    // M: existe, E: correta, T: existe, R: existe (pois R na solução fica na pos 2), O: correta
    const resultado = avaliarChute("METRO", "TERMO");
    expect(resultado.ehCorreta).toBe(false);
    expect(resultado.letras[0].status).toBe("existe"); // M
    expect(resultado.letras[1].status).toBe("correta"); // E
    expect(resultado.letras[2].status).toBe("existe"); // T
    expect(resultado.letras[3].status).toBe("existe"); // R
    expect(resultado.letras[4].status).toBe("correta"); // O
  });

  it("trata corretamente letras duplicadas no chute", () => {
    // Solução tem 1 'A': "BARCO", Chute tem 2 'A': "ARARA"
    // A (0): existe (amarelo)
    // R (1): existe (amarelo)
    // A (2): errada (cinza, já usou o único A da solução)
    // R (3): errada (cinza, já usou o único R da solução)
    // A (4): errada (cinza)
    const resultado = avaliarChute("ARARA", "BARCO");
    expect(resultado.letras[0].status).toBe("existe");
    expect(resultado.letras[1].status).toBe("existe");
    expect(resultado.letras[2].status).toBe("errada");
    expect(resultado.letras[3].status).toBe("errada");
    expect(resultado.letras[4].status).toBe("errada");
  });

  it("prioriza acerto exato (verde) antes de atribuir amarelo em duplicadas", () => {
    // Solução: "AMORA" (A:0, M:1, O:2, R:3, A:4), Chute: "ARARA" (A:0, R:1, A:2, R:3, A:4)
    // Pos 0 (A): correta (verde) - consome 1 A
    // Pos 3 (R): correta (verde) - consome o único R da solução
    // Pos 4 (A): correta (verde) - consome o 2º A da solução
    // Pos 1 (R): errada (cinza, pois o único R já foi consumido na pos 3)
    // Pos 2 (A): errada (cinza, pois os dois A já foram consumidos)
    const resultado = avaliarChute("ARARA", "AMORA");
    expect(resultado.letras[0].status).toBe("correta"); // 1º A
    expect(resultado.letras[1].status).toBe("errada"); // 1º R (pois o único R foi verde na pos 3)
    expect(resultado.letras[2].status).toBe("errada"); // 2º A
    expect(resultado.letras[3].status).toBe("correta"); // 2º R
    expect(resultado.letras[4].status).toBe("correta"); // 3º A
  });

  it("calcula o mapa de status das teclas do teclado", () => {
    const tentativas = ["CASAS", "TERMO"];
    const solucao = "TERMO";
    const statusTeclado = calcularStatusTeclado(tentativas, solucao);

    expect(statusTeclado["T"]).toBe("correta");
    expect(statusTeclado["E"]).toBe("correta");
    expect(statusTeclado["R"]).toBe("correta");
    expect(statusTeclado["M"]).toBe("correta");
    expect(statusTeclado["O"]).toBe("correta");
    expect(statusTeclado["C"]).toBe("errada");
    expect(statusTeclado["A"]).toBe("errada");
    expect(statusTeclado["S"]).toBe("errada");
    expect(statusTeclado["Z"]).toBeUndefined();
  });

  it("gera texto formatado com emojis para compartilhamento", () => {
    const texto = gerarTextoCompartilhamento(
      100,
      ["METRO", "TERMO"],
      "TERMO",
      true,
      "diario"
    );

    expect(texto).toContain("Klaus Termo #100 2/6");
    expect(texto).toContain("🟨🟩🟨🟨🟩");
    expect(texto).toContain("🟩🟩🟩🟩🟩");
  });
});

describe("termoStorage.ts", () => {
  it("atualiza estatísticas em caso de vitória", () => {
    const est = atualizarEstatisticasComResultado(
      ESTATISTICAS_INICIAIS,
      true,
      3,
      "2026-08-28"
    );

    expect(est.totalJogos).toBe(1);
    expect(est.vitorias).toBe(1);
    expect(est.derrotas).toBe(0);
    expect(est.sequenciaAtual).toBe(1);
    expect(est.melhorSequencia).toBe(1);
    expect(est.distribuicao[3]).toBe(1);
    expect(est.ultimaDataJogada).toBe("2026-08-28");
  });

  it("mantém sequência (streak) ao vencer em dias consecutivos", () => {
    let est = atualizarEstatisticasComResultado(
      ESTATISTICAS_INICIAIS,
      true,
      2,
      "2026-08-27"
    );
    est = atualizarEstatisticasComResultado(est, true, 4, "2026-08-28");

    expect(est.totalJogos).toBe(2);
    expect(est.vitorias).toBe(2);
    expect(est.sequenciaAtual).toBe(2);
    expect(est.melhorSequencia).toBe(2);
  });

  it("zera sequência ao sofrer derrota", () => {
    let est = atualizarEstatisticasComResultado(
      ESTATISTICAS_INICIAIS,
      true,
      2,
      "2026-08-27"
    );
    expect(est.sequenciaAtual).toBe(1);

    est = atualizarEstatisticasComResultado(est, false, 6, "2026-08-28");
    expect(est.totalJogos).toBe(2);
    expect(est.vitorias).toBe(1);
    expect(est.derrotas).toBe(1);
    expect(est.sequenciaAtual).toBe(0);
    expect(est.melhorSequencia).toBe(1);
  });
});
