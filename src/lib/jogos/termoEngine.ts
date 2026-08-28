/**
 * ENGINE DE REGRAS E AVALIAÇÃO DO TERMO, DUETO E QUARTETO (WORDLE PT-BR)
 * 
 * Regras:
 * - Termo: 1 palavra, 6 tentativas.
 * - Dueto: 2 palavras simultâneas, 7 tentativas.
 * - Quarteto: 4 palavras simultâneas, 9 tentativas.
 * 
 * Cores:
 * - "correta" (Verde): Letra faz parte da palavra e está na posição exata.
 * - "existe" (Amarelo): Letra faz parte da palavra, mas está em outra posição.
 * - "errada" (Cinza): Letra não faz parte da palavra (ou ocorrências esgotadas).
 * - "vazio" (Neutro): Ainda não testada.
 */

import { normalizarPalavra } from "./palavras";

export const TAMANHO_PALAVRA = 5;

export type TipoJogo = "termo" | "dueto" | "quarteto";

export interface ConfigModoJogo {
  id: TipoJogo;
  rotulo: string;
  tabuleiros: number;
  tentativas: number;
}

export const CONFIG_MODOS: Record<TipoJogo, ConfigModoJogo> = {
  termo: {
    id: "termo",
    rotulo: "Termo",
    tabuleiros: 1,
    tentativas: 6,
  },
  dueto: {
    id: "dueto",
    rotulo: "Dueto",
    tabuleiros: 2,
    tentativas: 7,
  },
  quarteto: {
    id: "quarteto",
    rotulo: "Quarteto",
    tabuleiros: 4,
    tentativas: 9,
  },
};

export const MAX_TENTATIVAS = 6; // retrocompatibilidade para o modo individual

export type StatusLetra = "correta" | "existe" | "errada" | "vazio";

export interface ResultadoLetra {
  letra: string;
  status: StatusLetra;
}

export interface ResultadoChute {
  palavra: string;
  letras: ResultadoLetra[];
  ehCorreta: boolean;
}

export type MapaStatusTeclado = Record<string, StatusLetra>;
export type MapaStatusTecladoMulti = Record<string, StatusLetra[]>;

/**
 * Avalia um chute contra a palavra solução usando o algoritmo padrão de 2 passos.
 */
export function avaliarChute(chute: string, solucao: string): ResultadoChute {
  const chuteNorm = normalizarPalavra(chute);
  const solucaoNorm = normalizarPalavra(solucao);

  const tamanho = Math.min(chuteNorm.length, TAMANHO_PALAVRA);
  const statusArray: StatusLetra[] = new Array(tamanho).fill("errada");
  const letrasSolucaoDisponiveis: (string | null)[] = solucaoNorm.split("");

  // 1º Passo: Encontrar posições exatas (Verde / "correta")
  for (let i = 0; i < tamanho; i++) {
    if (chuteNorm[i] === solucaoNorm[i]) {
      statusArray[i] = "correta";
      letrasSolucaoDisponiveis[i] = null; // consome a letra da solução
    }
  }

  // 2º Passo: Encontrar letras existentes na posição errada (Amarelo / "existe")
  for (let i = 0; i < tamanho; i++) {
    if (statusArray[i] === "correta") continue;

    const letraChute = chuteNorm[i];
    const indiceDisponivel = letrasSolucaoDisponiveis.indexOf(letraChute);

    if (indiceDisponivel !== -1) {
      statusArray[i] = "existe";
      letrasSolucaoDisponiveis[indiceDisponivel] = null; // consome a ocorrência disponível
    } else {
      statusArray[i] = "errada";
    }
  }

  const letras: ResultadoLetra[] = [];
  for (let i = 0; i < tamanho; i++) {
    letras.push({
      letra: chuteNorm[i],
      status: statusArray[i],
    });
  }

  const ehCorreta = statusArray.length === TAMANHO_PALAVRA && statusArray.every((s) => s === "correta");

  return {
    palavra: chuteNorm,
    letras,
    ehCorreta,
  };
}

/**
 * Hierarquia de prioridade para o status no teclado:
 * correta (verde) > existe (amarelo) > errada (cinza) > vazio
 */
const PESO_STATUS: Record<StatusLetra, number> = {
  vazio: 0,
  errada: 1,
  existe: 2,
  correta: 3,
};

/**
 * Consolida o estado de cada tecla do teclado virtual para 1 tabuleiro.
 */
export function calcularStatusTeclado(tentativas: string[], solucao: string): MapaStatusTeclado {
  const mapa: MapaStatusTeclado = {};

  for (const tentativa of tentativas) {
    const avaliacao = avaliarChute(tentativa, solucao);
    for (const { letra, status } of avaliacao.letras) {
      const statusAtual = mapa[letra] || "vazio";
      if (PESO_STATUS[status] > PESO_STATUS[statusAtual]) {
        mapa[letra] = status;
      }
    }
  }

  return mapa;
}

/**
 * Consolida o estado de cada tecla do teclado virtual para múltiplos tabuleiros (Dueto e Quarteto).
 * Cada tecla mapeia para um array de StatusLetra com tamanho = palavras.length.
 */
export function calcularStatusTecladoMulti(
  tentativasPorTabuleiro: string[][],
  palavras: string[]
): MapaStatusTecladoMulti {
  const qtdTabuleiros = palavras.length;
  const mapa: MapaStatusTecladoMulti = {};

  for (let tIdx = 0; tIdx < qtdTabuleiros; tIdx++) {
    const solucao = palavras[tIdx];
    const tentativas = tentativasPorTabuleiro[tIdx] || [];
    const statusTab = calcularStatusTeclado(tentativas, solucao);

    for (const [letra, status] of Object.entries(statusTab)) {
      if (!mapa[letra]) {
        mapa[letra] = new Array(qtdTabuleiros).fill("vazio");
      }
      mapa[letra][tIdx] = status;
    }
  }

  return mapa;
}

/**
 * Converte o status de uma letra no emoji correspondente para compartilhamento.
 */
function statusParaEmoji(status: StatusLetra): string {
  switch (status) {
    case "correta":
      return "🟩";
    case "existe":
      return "🟨";
    case "errada":
    default:
      return "⬛";
  }
}

/**
 * Gera a mensagem textual com a grade de emojis para compartilhar nas redes sociais ou WhatsApp.
 */
export function gerarTextoCompartilhamento(
  numeroJogo: number,
  tentativas: string[],
  solucao: string,
  venceu: boolean,
  modo: "diario" | "infinito" = "diario"
): string {
  return gerarTextoCompartilhamentoMulti(
    "termo",
    numeroJogo,
    [tentativas],
    [solucao],
    venceu,
    modo
  );
}

/**
 * Gera a mensagem de compartilhamento para Termo, Dueto ou Quarteto.
 */
export function gerarTextoCompartilhamentoMulti(
  tipoJogo: TipoJogo,
  numeroJogo: number,
  tentativasPorTabuleiro: string[][],
  palavras: string[],
  venceu: boolean,
  modo: "diario" | "infinito" = "diario"
): string {
  const config = CONFIG_MODOS[tipoJogo];
  const maxTentativas = config.tentativas;
  const rotulo = config.rotulo;
  
  // Total de tentativas usadas (o maior tamanho entre os tabuleiros)
  const tentativasTotais = Math.max(1, ...tentativasPorTabuleiro.map((t) => t.length));
  const contagem = venceu ? String(tentativasTotais) : "X";
  const prefixoTitulo =
    modo === "diario" ? `Klaus ${rotulo} #${numeroJogo}` : `Klaus ${rotulo} (Infinito)`;

  if (tipoJogo === "termo") {
    const linhasEmojis = (tentativasPorTabuleiro[0] || []).map((t) => {
      const res = avaliarChute(t, palavras[0]);
      return res.letras.map((l) => statusParaEmoji(l.status)).join("");
    });
    return `${prefixoTitulo} ${contagem}/${maxTentativas}\n\n${linhasEmojis.join("\n")}`;
  }

  if (tipoJogo === "dueto") {
    const linhas: string[] = [];
    for (let i = 0; i < tentativasTotais; i++) {
      const t1 = tentativasPorTabuleiro[0]?.[i];
      const t2 = tentativasPorTabuleiro[1]?.[i];
      const emojis1 = t1 ? avaliarChute(t1, palavras[0]).letras.map((l) => statusParaEmoji(l.status)).join("") : "⬛⬛⬛⬛⬛";
      const emojis2 = t2 ? avaliarChute(t2, palavras[1]).letras.map((l) => statusParaEmoji(l.status)).join("") : "⬛⬛⬛⬛⬛";
      linhas.push(`${emojis1} ${emojis2}`);
    }
    return `${prefixoTitulo} ${contagem}/${maxTentativas}\n\n${linhas.join("\n")}`;
  }

  // Quarteto
  const linhas: string[] = [];
  for (let i = 0; i < tentativasTotais; i++) {
    const emojis = palavras.map((p, idx) => {
      const t = tentativasPorTabuleiro[idx]?.[i];
      return t ? avaliarChute(t, p).letras.map((l) => statusParaEmoji(l.status)).join("") : "⬛⬛⬛⬛⬛";
    });
    linhas.push(`${emojis[0]} ${emojis[1]}\n${emojis[2]} ${emojis[3]}`);
  }
  return `${prefixoTitulo} ${contagem}/${maxTentativas}\n\n${linhas.join("\n\n")}`;
}
