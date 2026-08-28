import { describe, it, expect } from "vitest";
import {
  montarMatrizCruzadinha,
  obterCoordenadasPista,
  verificarVitoriaCruzadinha,
  verificarRespostasCruzadinha,
  chaveCelula,
} from "./cruzadinhaEngine";
import { TABULEIROS_CRUZADINHA, obterCruzadinhaDoDia } from "./bancoCruzadinhas";
import {
  criarDadosIniciaisCruzadinha,
  mesclarDadosCruzadinha,
} from "./cruzadinhaStorage";

describe("cruzadinhaEngine.ts - Lógica das Palavras Cruzadas", () => {
  const tabuleiro = TABULEIROS_CRUZADINHA[0];

  it("monta a matriz com células desbloqueadas e bloqueadas", () => {
    const matriz = montarMatrizCruzadinha(tabuleiro);
    expect(matriz.length).toBe(tabuleiro.linhas);
    expect(matriz[0].length).toBe(tabuleiro.colunas);

    // Célula 0,0 deve estar desbloqueada (início de AMAPÁ e ABA)
    expect(matriz[0][0].bloqueada).toBe(false);
    expect(matriz[0][0].numero).toBe(1);

    // Célula 5,5 deve estar bloqueada
    expect(matriz[5][5].bloqueada).toBe(true);
  });

  it("retorna as coordenadas de uma pista horizontal e vertical", () => {
    const coordsAcross = obterCoordenadasPista(tabuleiro, "across", 1);
    expect(coordsAcross.length).toBe(5); // AMAPA tem 5 letras
    expect(coordsAcross[0]).toEqual({ linha: 0, coluna: 0 });
    expect(coordsAcross[4]).toEqual({ linha: 0, coluna: 4 });

    const coordsDown = obterCoordenadasPista(tabuleiro, "down", 1);
    expect(coordsDown.length).toBe(3); // ABA tem 3 letras
    expect(coordsDown[0]).toEqual({ linha: 0, coluna: 0 });
    expect(coordsDown[2]).toEqual({ linha: 2, coluna: 0 });
  });

  it("avalia acertos e erros na verificação", () => {
    const estadoParcial = {
      [chaveCelula(0, 0)]: "A", // correto
      [chaveCelula(0, 1)]: "Z", // incorreto (era M)
    };

    const avaliacao = verificarRespostasCruzadinha(tabuleiro, estadoParcial);
    expect(avaliacao.corretas).toBe(1);
    expect(avaliacao.incorretas).toBe(1);
    expect(avaliacao.celulasStatus[chaveCelula(0, 0)]).toBe("correta");
    expect(avaliacao.celulasStatus[chaveCelula(0, 1)]).toBe("incorreta");
  });

  it("identifica vitória quando todas as células estão corretas", () => {
    const matriz = montarMatrizCruzadinha(tabuleiro);
    const estadoCompleto: Record<string, string> = {};

    for (let r = 0; r < tabuleiro.linhas; r++) {
      for (let c = 0; c < tabuleiro.colunas; c++) {
        if (!matriz[r][c].bloqueada) {
          estadoCompleto[chaveCelula(r, c)] = matriz[r][c].letraCorreta;
        }
      }
    }

    expect(verificarVitoriaCruzadinha(tabuleiro, estadoCompleto)).toBe(true);
  });

  it("retorna cruzadinha do dia de forma consistente", () => {
    const c1 = obterCruzadinhaDoDia(new Date("2026-08-28T12:00:00"));
    const c2 = obterCruzadinhaDoDia(new Date("2026-08-28T18:00:00"));
    expect(c1.id).toBe(c2.id);
  });

  it("mescla dados de progresso e preserva conclusões", () => {
    const local = criarDadosIniciaisCruzadinha();
    const remoto = {
      versao: 1,
      progresso: {
        "cruzadinha-brasil-1": {
          letrasDigitadas: { "0_0": "A" },
          tempoSegundos: 45,
          concluido: true,
        },
      },
      totalConcluidas: 1,
    };

    const mesclado = mesclarDadosCruzadinha(local, remoto);
    expect(mesclado.progresso["cruzadinha-brasil-1"].concluido).toBe(true);
    expect(mesclado.totalConcluidas).toBe(1);
  });
});
