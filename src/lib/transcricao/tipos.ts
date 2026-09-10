/**
 * Tipos para o sistema de Transcrição Local e Independente do Klaus.
 */

export type MotorTranscricao = "vosk" | "sherpa" | "nativo";

export type FonteAudio = "microfone" | "reuniao_aba";

export type StatusGravador =
  | "inativo"
  | "carregando_modelo"
  | "gravando"
  | "pausado"
  | "processando"
  | "erro";

export interface SegmentoTranscricao {
  id: string;
  timestamp: string;
  texto: string;
  ehFinal: boolean;
  orador?: string;
}

export interface ProgressoModelo {
  motor: MotorTranscricao;
  etapa: "baixando" | "compilando" | "pronto" | "erro";
  porcentagem?: number;
  mensagem: string;
}

export interface OpcoesTranscricao {
  motor: MotorTranscricao;
  fonte: FonteAudio;
  idioma?: string;
  aoReceberSegmento: (segmento: SegmentoTranscricao) => void;
  aoAtualizarTextoParcial: (textoParcial: string) => void;
  aoProgressoModelo?: (progresso: ProgressoModelo) => void;
  aoStatusMudou?: (status: StatusGravador) => void;
  aoNivelVolume?: (volumeDb: number) => void;
  aoErro?: (erroMsg: string) => void;
}

export interface SessaoTranscricao {
  parar: () => Promise<void>;
  pausar: () => void;
  retomar: () => void;
  obterStatus: () => StatusGravador;
}
