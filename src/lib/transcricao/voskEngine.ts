/**
 * Motor de Transcrição Vosk (WebAssembly + Modelo PT-BR).
 * 100% offline, independente de Whisper, sem loops de repetição e sem custos.
 */

import type { OpcoesTranscricao, SessaoTranscricao, SegmentoTranscricao } from "./tipos";
import { iniciarCapturaAudio, type StreamAudioAtivo } from "./audioCaptura";

// URL do modelo oficial pequeno e veloz para Português do Brasil (~31MB comprimido)
export const VOSK_MODELO_PT_URL =
  "https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.tar.gz";

// Cache em memória do modelo carregado para inicialização instantânea nas próximas vezes
let modeloVoskInstancia: any = null;

export async function carregarModeloVosk(
  aoProgresso?: (porcentagem: number, msg: string) => void
): Promise<any> {
  if (modeloVoskInstancia) return modeloVoskInstancia;

  aoProgresso?.(10, "Inicializando motor Vosk WebAssembly...");

  const { createModel } = await import("vosk-browser");

  aoProgresso?.(30, "Carregando modelo em Português do Brasil...");

  const promessaModelo = createModel(VOSK_MODELO_PT_URL);
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            "Tempo limite ao baixar modelo Vosk (servidor indisponível ou bloqueado por CORS)."
          )
        ),
      8000
    )
  );

  modeloVoskInstancia = await Promise.race([promessaModelo, timeout]);
  aoProgresso?.(100, "Modelo Vosk pronto!");

  return modeloVoskInstancia;
}

export function iniciarTranscricaoVosk(
  opcoes: OpcoesTranscricao
): SessaoTranscricao {
  let status: "carregando_modelo" | "gravando" | "pausado" | "inativo" | "erro" =
    "carregando_modelo";
  let streamAtivo: StreamAudioAtivo | null = null;
  let recognizer: any = null;
  let intencionalmenteParado = false;

  opcoes.aoStatusMudou?.("carregando_modelo");
  opcoes.aoProgressoModelo?.({
    motor: "vosk",
    etapa: "baixando",
    porcentagem: 10,
    mensagem: "Carregando Vosk em Português...",
  });

  const inicializar = async () => {
    try {
      const modelo = await carregarModeloVosk((porcentagem, msg) => {
        opcoes.aoProgressoModelo?.({
          motor: "vosk",
          etapa: porcentagem >= 100 ? "pronto" : "baixando",
          porcentagem,
          mensagem: msg,
        });
      });

      if (intencionalmenteParado) return;

      const sampleRate = 16000;
      recognizer = new modelo.KaldiRecognizer(sampleRate);

      recognizer.on("result", (msg: any) => {
        const texto = msg.result?.text?.trim();
        if (texto) {
          const agora = new Date();
          const timestamp = agora.toTimeString().slice(0, 8);
          const segmento: SegmentoTranscricao = {
            id: `vosk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp,
            texto,
            ehFinal: true,
          };
          opcoes.aoReceberSegmento(segmento);
          opcoes.aoAtualizarTextoParcial("");
        }
      });

      recognizer.on("partialresult", (msg: any) => {
        const parcial = msg.result?.partial?.trim() || "";
        opcoes.aoAtualizarTextoParcial(parcial);
      });

      // Inicia captura do microfone ou da reunião
      streamAtivo = await iniciarCapturaAudio({
        fonte: opcoes.fonte,
        sampleRate,
        aoReceberPCM: (buffer) => {
          if (status === "gravando" && recognizer) {
            try {
              recognizer.acceptWaveform(buffer);
            } catch {}
          }
        },
        aoNivelVolume: (vol) => {
          opcoes.aoNivelVolume?.(vol);
        },
        aoErro: (err) => {
          opcoes.aoErro?.(err);
        },
      });

      status = "gravando";
      opcoes.aoStatusMudou?.("gravando");
    } catch (err: any) {
      status = "erro";
      opcoes.aoStatusMudou?.("erro");
      opcoes.aoErro?.(
        err?.message || "Erro ao carregar ou iniciar o motor Vosk no navegador."
      );
    }
  };

  inicializar();

  return {
    obterStatus: () => status,
    pausar: () => {
      status = "pausado";
      streamAtivo?.pausar();
      opcoes.aoStatusMudou?.("pausado");
    },
    retomar: () => {
      status = "gravando";
      streamAtivo?.retomar();
      opcoes.aoStatusMudou?.("gravando");
    },
    parar: async () => {
      intencionalmenteParado = true;
      status = "inativo";
      opcoes.aoStatusMudou?.("inativo");

      if (streamAtivo) {
        await streamAtivo.parar();
      }

      try {
        recognizer?.free();
      } catch {}
    },
  };
}
