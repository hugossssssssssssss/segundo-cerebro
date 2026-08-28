/**
 * ENGINE DE REGRAS E MATRIZ DE PALAVRAS CRUZADAS (CROSSWORD)
 * 
 * Baseado no padrão matricial de The Guardian / JaredReisinger/react-crossword.
 */

import { normalizarPalavra } from "../palavras";
import type { TabuleiroCruzadinha, PistaDefinicao } from "./bancoCruzadinhas";

export type DirecaoPista = "across" | "down";

export interface InfoCelula {
  linha: number;
  coluna: number;
  bloqueada: boolean;
  letraCorreta: string;
  letraDigitada: string;
  numero?: number;
  pistaAcross?: number;
  pistaDown?: number;
  statusVerificacao?: "correta" | "incorreta" | "neutro";
}

export function chaveCelula(linha: number, coluna: number): string {
  return `${linha}_${coluna}`;
}

/**
 * Monta a matriz bidimensional de células a partir das definições do tabuleiro.
 */
export function montarMatrizCruzadinha(
  tabuleiro: TabuleiroCruzadinha,
  estadoDigitado: Record<string, string> = {},
  statusVerificacao: Record<string, "correta" | "incorreta"> = {}
): InfoCelula[][] {
  const matriz: InfoCelula[][] = [];

  // Inicializa com células bloqueadas (pretas)
  for (let r = 0; r < tabuleiro.linhas; r++) {
    const linhaArr: InfoCelula[] = [];
    for (let c = 0; c < tabuleiro.colunas; c++) {
      linhaArr.push({
        linha: r,
        coluna: c,
        bloqueada: true,
        letraCorreta: "",
        letraDigitada: "",
        statusVerificacao: "neutro",
      });
    }
    matriz.push(linhaArr);
  }

  // Preenche pistas Horizontais (across)
  for (const [numStr, pista] of Object.entries(tabuleiro.across)) {
    const num = Number(numStr);
    const respNorm = normalizarPalavra(pista.resposta);
    for (let i = 0; i < respNorm.length; i++) {
      const r = pista.linha;
      const c = pista.coluna + i;
      if (r < tabuleiro.linhas && c < tabuleiro.colunas) {
        const cel = matriz[r][c];
        cel.bloqueada = false;
        cel.letraCorreta = respNorm[i];
        cel.pistaAcross = num;
        if (i === 0) {
          cel.numero = cel.numero ? Math.min(cel.numero, num) : num;
        }
      }
    }
  }

  // Preenche pistas Verticais (down)
  for (const [numStr, pista] of Object.entries(tabuleiro.down)) {
    const num = Number(numStr);
    const respNorm = normalizarPalavra(pista.resposta);
    for (let i = 0; i < respNorm.length; i++) {
      const r = pista.linha + i;
      const c = pista.coluna;
      if (r < tabuleiro.linhas && c < tabuleiro.colunas) {
        const cel = matriz[r][c];
        cel.bloqueada = false;
        cel.letraCorreta = respNorm[i];
        cel.pistaDown = num;
        if (i === 0) {
          cel.numero = cel.numero ? Math.min(cel.numero, num) : num;
        }
      }
    }
  }

  // Aplica as letras digitadas pelo usuário e os status de verificação
  for (let r = 0; r < tabuleiro.linhas; r++) {
    for (let c = 0; c < tabuleiro.colunas; c++) {
      const cel = matriz[r][c];
      if (!cel.bloqueada) {
        const key = chaveCelula(r, c);
        cel.letraDigitada = estadoDigitado[key] || "";
        cel.statusVerificacao = statusVerificacao[key] || "neutro";
      }
    }
  }

  return matriz;
}

/**
 * Retorna as coordenadas sequenciais de todas as células que compõem uma pista específica.
 */
export function obterCoordenadasPista(
  tabuleiro: TabuleiroCruzadinha,
  direcao: DirecaoPista,
  numero: number
): { linha: number; coluna: number }[] {
  const pistasObj = direcao === "across" ? tabuleiro.across : tabuleiro.down;
  const pista: PistaDefinicao | undefined = pistasObj[numero];
  if (!pista) return [];

  const coords: { linha: number; coluna: number }[] = [];
  const tam = normalizarPalavra(pista.resposta).length;

  for (let i = 0; i < tam; i++) {
    if (direcao === "across") {
      coords.push({ linha: pista.linha, coluna: pista.coluna + i });
    } else {
      coords.push({ linha: pista.linha + i, coluna: pista.coluna });
    }
  }

  return coords;
}

/**
 * Verifica se todas as células desbloqueadas foram preenchidas com as letras corretas.
 */
export function verificarVitoriaCruzadinha(
  tabuleiro: TabuleiroCruzadinha,
  estadoDigitado: Record<string, string>
): boolean {
  const matriz = montarMatrizCruzadinha(tabuleiro, estadoDigitado);

  for (let r = 0; r < tabuleiro.linhas; r++) {
    for (let c = 0; c < tabuleiro.colunas; c++) {
      const cel = matriz[r][c];
      if (!cel.bloqueada) {
        if (!cel.letraDigitada || cel.letraDigitada.toUpperCase() !== cel.letraCorreta.toUpperCase()) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Avalia as respostas preenchidas pelo usuário para feedback visual.
 */
export function verificarRespostasCruzadinha(
  tabuleiro: TabuleiroCruzadinha,
  estadoDigitado: Record<string, string>
): {
  corretas: number;
  incorretas: number;
  totalDesbloqueadas: number;
  celulasStatus: Record<string, "correta" | "incorreta">;
} {
  const matriz = montarMatrizCruzadinha(tabuleiro, estadoDigitado);
  const celulasStatus: Record<string, "correta" | "incorreta"> = {};
  let corretas = 0;
  let incorretas = 0;
  let totalDesbloqueadas = 0;

  for (let r = 0; r < tabuleiro.linhas; r++) {
    for (let c = 0; c < tabuleiro.colunas; c++) {
      const cel = matriz[r][c];
      if (!cel.bloqueada) {
        totalDesbloqueadas++;
        const key = chaveCelula(r, c);
        if (cel.letraDigitada) {
          if (cel.letraDigitada.toUpperCase() === cel.letraCorreta.toUpperCase()) {
            corretas++;
            celulasStatus[key] = "correta";
          } else {
            incorretas++;
            celulasStatus[key] = "incorreta";
          }
        }
      }
    }
  }

  return {
    corretas,
    incorretas,
    totalDesbloqueadas,
    celulasStatus,
  };
}
