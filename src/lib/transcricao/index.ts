/**
 * Ponto de entrada do módulo de Transcrição Independente do Klaus.
 */

import type { OpcoesTranscricao, SessaoTranscricao } from "./tipos";
import { iniciarTranscricaoVosk } from "./voskEngine";
import { iniciarTranscricaoSherpa } from "./sherpaEngine";
import { iniciarTranscricaoNativa } from "./nativoEngine";

export * from "./tipos";
export * from "./audioCaptura";
export * from "./voskEngine";
export * from "./sherpaEngine";
export * from "./nativoEngine";

/**
 * Inicia a transcrição utilizando o motor selecionado pelo usuário.
 */
export function iniciarTranscricao(opcoes: OpcoesTranscricao): SessaoTranscricao {
  switch (opcoes.motor) {
    case "vosk":
      return iniciarTranscricaoVosk(opcoes);
    case "sherpa":
      return iniciarTranscricaoSherpa(opcoes);
    case "nativo":
    default:
      return iniciarTranscricaoNativa(opcoes);
  }
}
