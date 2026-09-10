/**
 * Utilitários para captura de áudio (Microfone e Áudio de Reunião/Aba) e
 * processamento de stream PCM para motores de IA locais (Vosk, Sherpa-ONNX).
 */

import type { FonteAudio } from "./tipos";

export interface CapturaAudioConfig {
  fonte: FonteAudio;
  sampleRate?: number;
  aoReceberPCM?: (buffer: AudioBuffer) => void;
  aoNivelVolume?: (nivelPercentual: number) => void;
  aoErro?: (erroMsg: string) => void;
}

export interface StreamAudioAtivo {
  mediaStream: MediaStream;
  audioContext: AudioContext;
  parar: () => Promise<void>;
  pausar: () => void;
  retomar: () => void;
}

/**
 * Obtém a fonte de áudio do microfone ou da tela/aba de reunião.
 */
export async function obterMediaStream(fonte: FonteAudio): Promise<MediaStream> {
  if (fonte === "reuniao_aba") {
    // Captura áudio de uma aba do navegador ou tela (Google Meet, Zoom web, Teams, etc.)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error("Seu navegador não suporta captura de tela/aba de reunião.");
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: 1,
        height: 1,
        frameRate: 1,
      },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      // O usuário compartilhou a aba sem marcar a caixinha "Compartilhar áudio da aba"
      stream.getTracks().forEach((t) => t.stop());
      throw new Error(
        "Nenhum áudio foi detectado na reunião. Certifique-se de marcar a opção 'Compartilhar áudio da aba/sistema' na janela do navegador."
      );
    }

    return stream;
  }

  // Microfone convencional
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Seu navegador não suporta captura de microfone.");
  }

  return await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
    video: false,
  });
}

/**
 * Inicia o processamento de áudio contínuo para os motores locais.
 */
export async function iniciarCapturaAudio(
  config: CapturaAudioConfig
): Promise<StreamAudioAtivo> {
  const sampleRateDesejado = config.sampleRate || 16000;
  const mediaStream = await obterMediaStream(config.fonte);

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  const audioContext = new AudioCtx({
    sampleRate: sampleRateDesejado,
    latencyHint: "interactive",
  });

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const sourceNode = audioContext.createMediaStreamSource(mediaStream);
  const analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 256;
  analyserNode.smoothingTimeConstant = 0.3;

  // ScriptProcessorNode para alimentar o reconhecedor
  const bufferSize = 4096;
  const processorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

  let pausado = false;
  let animacaoId: number | null = null;
  const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

  // Monitor de volume para a UI (Waveform / Barras)
  const monitorarVolume = () => {
    if (pausado || audioContext.state === "closed") return;
    analyserNode.getByteFrequencyData(dataArray);

    let soma = 0;
    for (let i = 0; i < dataArray.length; i++) {
      soma += dataArray[i];
    }
    const media = soma / dataArray.length;
    const percentual = Math.min(100, Math.round((media / 128) * 100));

    config.aoNivelVolume?.(percentual);
    animacaoId = requestAnimationFrame(monitorarVolume);
  };

  animacaoId = requestAnimationFrame(monitorarVolume);

  processorNode.onaudioprocess = (e) => {
    if (pausado) return;
    config.aoReceberPCM?.(e.inputBuffer);
  };

  sourceNode.connect(analyserNode);
  sourceNode.connect(processorNode);
  // Conectar ao destination para manter o ScriptProcessor ativo sem gerar eco
  const muteGain = audioContext.createGain();
  muteGain.gain.value = 0;
  processorNode.connect(muteGain);
  muteGain.connect(audioContext.destination);

  return {
    mediaStream,
    audioContext,
    pausar: () => {
      pausado = true;
    },
    retomar: () => {
      pausado = false;
      if (animacaoId === null) {
        animacaoId = requestAnimationFrame(monitorarVolume);
      }
    },
    parar: async () => {
      pausado = true;
      if (animacaoId !== null) {
        cancelAnimationFrame(animacaoId);
        animacaoId = null;
      }
      try {
        processorNode.disconnect();
        analyserNode.disconnect();
        sourceNode.disconnect();
        muteGain.disconnect();
      } catch {}

      mediaStream.getTracks().forEach((t) => t.stop());

      if (audioContext.state !== "closed") {
        await audioContext.close();
      }
    },
  };
}
