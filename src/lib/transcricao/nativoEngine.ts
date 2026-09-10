/**
 * Motor de Transcrição Nativa do Navegador (Web Speech API / Google & Apple Engine).
 * Latência zero, 100% gratuito, sem download de modelos.
 */

import type { OpcoesTranscricao, SessaoTranscricao, SegmentoTranscricao } from "./tipos";
import { obterMediaStream } from "./audioCaptura";

interface IWindowComSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function iniciarTranscricaoNativa(
  opcoes: OpcoesTranscricao
): SessaoTranscricao {
  const win = typeof window !== "undefined" ? (window as IWindowComSpeech) : null;
  const SpeechClass = win?.SpeechRecognition || win?.webkitSpeechRecognition;

  if (!SpeechClass) {
    opcoes.aoErro?.("Reconhecimento de voz nativo não suportado neste navegador.");
    opcoes.aoStatusMudou?.("erro");
    return {
      parar: async () => {},
      pausar: () => {},
      retomar: () => {},
      obterStatus: () => "erro",
    };
  }

  let status: "gravando" | "pausado" | "inativo" | "erro" = "gravando";
  let intencionalmenteParado = false;
  let instancia: any = null;
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let animacaoId: number | null = null;

  opcoes.aoStatusMudou?.("gravando");

  // Iniciar monitor de volume
  obterMediaStream(opcoes.fonte)
    .then((stream) => {
      mediaStream = stream;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (status === "inativo" || !audioContext) return;
        analyser.getByteFrequencyData(dataArray);
        let soma = 0;
        for (let i = 0; i < dataArray.length; i++) soma += dataArray[i];
        const media = soma / dataArray.length;
        opcoes.aoNivelVolume?.(Math.min(100, Math.round((media / 128) * 100)));
        animacaoId = requestAnimationFrame(loop);
      };
      animacaoId = requestAnimationFrame(loop);
    })
    .catch(() => {
      // Falha ao obter stream para medidor de volume não impede o SpeechRecognition
    });

  const criarEIniciarInstancia = () => {
    if (intencionalmenteParado) return;

    try {
      instancia = new SpeechClass();
      instancia.lang = opcoes.idioma || "pt-BR";
      instancia.continuous = true;
      instancia.interimResults = true;
      instancia.maxAlternatives = 1;

      instancia.onresult = (event: any) => {
        if (status === "pausado") return;

        let parcial = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const texto = res[0]?.transcript?.trim() || "";
          if (res.isFinal && texto) {
            const agora = new Date();
            const timestamp = agora.toTimeString().slice(0, 8);
            const segmento: SegmentoTranscricao = {
              id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              timestamp,
              texto,
              ehFinal: true,
            };
            opcoes.aoReceberSegmento(segmento);
          } else if (!res.isFinal && texto) {
            parcial = texto;
          }
        }
        opcoes.aoAtualizarTextoParcial(parcial);
      };

      instancia.onerror = (event: any) => {
        if (intencionalmenteParado) return;
        const err = event.error;
        if (err === "no-speech") {
          // Normal em pausas de silêncio, não interrompe
          return;
        }
        if (err === "not-allowed") {
          status = "erro";
          opcoes.aoStatusMudou?.("erro");
          opcoes.aoErro?.("Permissão de microfone/áudio negada.");
          return;
        }
      };

      instancia.onend = () => {
        if (!intencionalmenteParado && status === "gravando") {
          try {
            instancia.start();
          } catch {
            setTimeout(criarEIniciarInstancia, 300);
          }
        }
      };

      instancia.start();
    } catch (e: any) {
      if (!intencionalmenteParado) {
        opcoes.aoErro?.(e?.message || "Erro ao iniciar reconhecimento de voz nativo.");
      }
    }
  };

  criarEIniciarInstancia();

  return {
    obterStatus: () => status,
    pausar: () => {
      status = "pausado";
      opcoes.aoStatusMudou?.("pausado");
      try {
        instancia?.stop();
      } catch {}
    },
    retomar: () => {
      status = "gravando";
      opcoes.aoStatusMudou?.("gravando");
      criarEIniciarInstancia();
    },
    parar: async () => {
      intencionalmenteParado = true;
      status = "inativo";
      opcoes.aoStatusMudou?.("inativo");

      try {
        instancia?.stop();
      } catch {}

      if (animacaoId !== null) {
        cancelAnimationFrame(animacaoId);
        animacaoId = null;
      }

      mediaStream?.getTracks().forEach((t) => t.stop());
      if (audioContext && audioContext.state !== "closed") {
        await audioContext.close();
      }
    },
  };
}
