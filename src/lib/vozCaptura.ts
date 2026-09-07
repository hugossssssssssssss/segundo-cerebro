/**
 * Módulo de Captura e Reconhecimento de Voz do Klaus.
 *
 * Utiliza o SpeechRecognition nativo do navegador (Google Speech Recognition no Chrome/Android e Safari no iOS)
 * para converter fala em texto em tempo real com latência zero e sem necessidade de baixar modelos pesados.
 */

export interface OpcoesDitado {
  idioma?: string;
  continuo?: boolean;
  aoReceberTexto: (texto: string, ehFinal: boolean) => void;
  aoIniciar?: () => void;
  aoFinalizar?: () => void;
  aoErro?: (erroMsg: string) => void;
}

export interface SessaoDitado {
  parar: () => void;
  estaOuvindo: () => boolean;
}

// Interface TypeScript para SpeechRecognition do DOM (nem todos os tsconfigs possuem a tipagem global por padrão)
interface IWindowComSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

/**
 * Verifica se o navegador atual tem suporte ao SpeechRecognition nativo.
 */
export function suportaDitadoVoz(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as IWindowComSpeech;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

/**
 * Inicia uma sessão de reconhecimento de voz contínuo.
 */
export function iniciarDitadoVoz(opcoes: OpcoesDitado): SessaoDitado {
  const win = typeof window !== "undefined" ? (window as IWindowComSpeech) : null;
  const SpeechClass = win?.SpeechRecognition || win?.webkitSpeechRecognition;

  if (!SpeechClass) {
    opcoes.aoErro?.("Reconhecimento de voz não suportado neste navegador.");
    return {
      parar: () => {},
      estaOuvindo: () => false,
    };
  }

  let ouvindo = false;
  let instancia: any = null;

  try {
    instancia = new SpeechClass();
    instancia.lang = opcoes.idioma || "pt-BR";
    instancia.continuous = opcoes.continuo ?? true;
    instancia.interimResults = true;
    instancia.maxAlternatives = 1;

    instancia.onstart = () => {
      ouvindo = true;
      opcoes.aoIniciar?.();
    };

    instancia.onresult = (event: any) => {
      let transcricaoCompleta = "";
      let ehFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        const trecho = item[0]?.transcript || "";
        transcricaoCompleta += trecho;
        if (item.isFinal) {
          ehFinal = true;
        }
      }

      if (transcricaoCompleta) {
        opcoes.aoReceberTexto(transcricaoCompleta, ehFinal);
      }
    };

    instancia.onerror = (event: any) => {
      ouvindo = false;
      const erro = event.error;
      let msg = "Erro ao capturar áudio.";
      if (erro === "not-allowed") {
        msg = "Permissão de microfone negada. Ative o microfone nas configurações.";
      } else if (erro === "no-speech") {
        msg = "Nenhuma fala detectada.";
      } else if (erro === "network") {
        msg = "Sem conexão para reconhecimento de voz.";
      }
      opcoes.aoErro?.(msg);
    };

    instancia.onend = () => {
      ouvindo = false;
      opcoes.aoFinalizar?.();
    };

    instancia.start();
  } catch (err: any) {
    ouvindo = false;
    opcoes.aoErro?.(err.message || "Não foi possível iniciar o microfone.");
  }

  return {
    parar: () => {
      if (instancia && ouvindo) {
        try {
          instancia.stop();
        } catch {
          // Ignora erro ao parar
        }
      }
      ouvindo = false;
    },
    estaOuvindo: () => ouvindo,
  };
}
