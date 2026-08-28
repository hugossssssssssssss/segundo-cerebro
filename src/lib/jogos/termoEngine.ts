/**
 * ENGINE DE REGRAS E AVALIAÇÃO DO TERMO (WORDLE PT-BR)
 * 
 * Regras:
 * - 6 tentativas para adivinhar uma palavra de 5 letras.
 * - Cores:
 *   - "correta" (Verde): A letra faz parte da palavra e está na posição exata.
 *   - "existe" (Amarelo): A letra faz parte da palavra, mas está em outra posição.
 *   - "errada" (Cinza): A letra não faz parte da palavra (ou suas ocorrências já foram esgotadas).
 * 
 * Tratamento rigoroso de letras duplicadas (ex: chutar 'CASAS' para 'MASSA' ou 'ARARA').
 */

import { normalizarPalavra } from "./palavras";

export const MAX_TENTATIVAS = 6;
export const TAMANHO_PALAVRA = 5;

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
 * Consolida o estado de cada tecla do teclado virtual com base nas tentativas realizadas.
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
  const contagemTentativas = venceu ? String(tentativas.length) : "X";
  const prefixoTitulo = modo === "diario" ? `Klaus Termo #${numeroJogo}` : `Klaus Termo (Infinito)`;
  
  const linhasEmojis = tentativas.map((t) => {
    const res = avaliarChute(t, solucao);
    return res.letras.map((l) => statusParaEmoji(l.status)).join("");
  });

  return `${prefixoTitulo} ${contagemTentativas}/${MAX_TENTATIVAS}\n\n${linhasEmojis.join("\n")}`;
}
