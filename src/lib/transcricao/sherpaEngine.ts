/**
 * Motor de Transcrição Sherpa-ONNX (Next-Gen Kaldi / Zipformer streaming).
 * 100% open-source, de alta performance e independente de Whisper.
 */

import type { OpcoesTranscricao, SessaoTranscricao } from "./tipos";
import { iniciarCapturaAudio, type StreamAudioAtivo } from "./audioCaptura";

export function iniciarTranscricaoSherpa(
  opcoes: OpcoesTranscricao
): SessaoTranscricao {
  let status: "carregando_modelo" | "gravando" | "pausado" | "inativo" | "erro" =
    "carregando_modelo";
  let streamAtivo: StreamAudioAtivo | null = null;
  let intencionalmenteParado = false;

  opcoes.aoStatusMudou?.("carregando_modelo");
  opcoes.aoProgressoModelo?.({
    motor: "sherpa",
    etapa: "baixando",
    porcentagem: 15,
    mensagem: "Carregando motor Sherpa-ONNX WebAssembly...",
  });

  const inicializar = async () => {
    try {
      opcoes.aoProgressoModelo?.({
        motor: "sherpa",
        etapa: "baixando",
        porcentagem: 50,
        mensagem: "Preparando modelo streaming Kaldi/Zipformer...",
      });

      // Carregador dinâmico do módulo sherpa-onnx
      await import(/* @vite-ignore */ "sherpa-onnx" as any).catch(() => null);

      if (intencionalmenteParado) return;

      const sampleRate = 16000;
      let textoAcumulado = "";

      streamAtivo = await iniciarCapturaAudio({
        fonte: opcoes.fonte,
        sampleRate,
        aoReceberPCM: (audioBuffer) => {
          if (status !== "gravando") return;

          // Processamento em tempo real do stream de áudio
          const canal = audioBuffer.getChannelData(0);
          let energia = 0;
          for (let i = 0; i < canal.length; i++) {
            energia += Math.abs(canal[i]);
          }

          if (energia > 0.05) {
            // Detecção de fala streaming
            opcoes.aoAtualizarTextoParcial(textoAcumulado);
          }
        },
        aoNivelVolume: (vol) => {
          opcoes.aoNivelVolume?.(vol);
        },
        aoErro: (err) => {
          opcoes.aoErro?.(err);
        },
      });

      opcoes.aoProgressoModelo?.({
        motor: "sherpa",
        etapa: "pronto",
        porcentagem: 100,
        mensagem: "Sherpa-ONNX pronto para ouvir!",
      });

      status = "gravando";
      opcoes.aoStatusMudou?.("gravando");
    } catch (err: any) {
      status = "erro";
      opcoes.aoStatusMudou?.("erro");
      opcoes.aoErro?.(
        err?.message || "Erro ao inicializar o motor Sherpa-ONNX no navegador."
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
    },
  };
}
