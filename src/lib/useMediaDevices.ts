import { useState, useEffect, useRef, useCallback } from "react";

export interface DispositivoMidia {
  deviceId: string;
  label: string;
}

export function useMediaDevices() {
  const [dispositivosVideo, setDispositivosVideo] = useState<DispositivoMidia[]>([]);
  const [dispositivosAudioIn, setDispositivosAudioIn] = useState<DispositivoMidia[]>([]);
  const [dispositivosAudioOut, setDispositivosAudioOut] = useState<DispositivoMidia[]>([]);

  const [cameraSelecionada, setCameraSelecionada] = useState<string>("");
  const [microfoneSelecionado, setMicrofoneSelecionado] = useState<string>("");
  const [saidaSelecionada, setSaidaSelecionada] = useState<string>("");

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [permitido, setPermitido] = useState<boolean | null>(null); // null = ainda não solicitado, true = concedido, false = negado

  const [gravando, setGravando] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const suportaAudioOut = typeof HTMLMediaElement.prototype.setSinkId !== "undefined";

  // Lista os dispositivos disponíveis de hardware no sistema
  const listarDispositivos = useCallback(async () => {
    try {
      const lista = await navigator.mediaDevices.enumerateDevices();
      
      const videos = lista
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Câmera (${d.deviceId.slice(0, 5)})` }));
      
      const audiosIn = lista
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microfone (${d.deviceId.slice(0, 5)})` }));
      
      const audiosOut = lista
        .filter((d) => d.kind === "audiooutput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Saída (${d.deviceId.slice(0, 5)})` }));

      setDispositivosVideo(videos);
      setDispositivosAudioIn(audiosIn);
      setDispositivosAudioOut(audiosOut);

      // Define os dispositivos iniciais
      setCameraSelecionada((prev) => {
        if (prev && videos.some((v) => v.deviceId === prev)) return prev;
        return videos[0]?.deviceId || "";
      });
      setMicrofoneSelecionado((prev) => {
        if (prev && audiosIn.some((a) => a.deviceId === prev)) return prev;
        return audiosIn[0]?.deviceId || "";
      });
      setSaidaSelecionada((prev) => {
        if (prev && audiosOut.some((o) => o.deviceId === prev)) return prev;
        return audiosOut[0]?.deviceId || "";
      });

    } catch (err) {
      console.error("Erro ao listar dispositivos:", err);
    }
  }, []);

  // Solicita permissão para Câmera e Microfone
  const solicitarPermissao = useCallback(async () => {
    setErro(null);
    try {
      const streamInicial = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      // Libera a stream inicial logo após obter a permissão com sucesso
      streamInicial.getTracks().forEach((track) => track.stop());
      
      setPermitido(true);
      await listarDispositivos();
    } catch (err: any) {
      console.error("Erro ao solicitar permissão de hardware:", err);
      setPermitido(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErro("Permissão negada. Por favor, ative o acesso à câmera e microfone nas configurações do navegador.");
      } else {
        setErro(`Não foi possível acessar a câmera ou microfone: ${err.message || err}`);
      }
    }
  }, [listarDispositivos]);

  // Gerencia a stream ativa com base no dispositivo selecionado
  useEffect(() => {
    if (permitido !== true) return;

    let ativo = true;
    let streamLocal: MediaStream | null = null;

    const iniciarStream = async () => {
      // Parar faixas da stream anterior
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }

      try {
        const restricoes: MediaStreamConstraints = {
          video: cameraSelecionada ? { deviceId: { exact: cameraSelecionada } } : true,
          audio: microfoneSelecionado ? { deviceId: { exact: microfoneSelecionado } } : true,
        };

        streamLocal = await navigator.mediaDevices.getUserMedia(restricoes);

        if (!ativo) {
          streamLocal.getTracks().forEach((t) => t.stop());
          return;
        }

        setStream(streamLocal);
        setErro(null);

        // Inicializa AudioContext e conecta o analisador de volume
        try {
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const audioCtx = audioContextRef.current;
          
          if (audioCtx.state === "suspended") {
            await audioCtx.resume();
          }

          if (!analyserRef.current) {
            analyserRef.current = audioCtx.createAnalyser();
            analyserRef.current.fftSize = 256;
          }

          const source = audioCtx.createMediaStreamSource(streamLocal);
          sourceRef.current = source;
          source.connect(analyserRef.current);
          setAnalyserNode(analyserRef.current);
        } catch (audioErr) {
          console.warn("Erro ao inicializar visualização de áudio:", audioErr);
        }

      } catch (err: any) {
        console.error("Erro ao iniciar streams de hardware:", err);
        if (ativo) {
          setErro(`Erro ao conectar com os dispositivos: ${err.message || err}`);
        }
      }
    };

    iniciarStream();

    return () => {
      ativo = false;
      if (streamLocal) {
        streamLocal.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraSelecionada, microfoneSelecionado, permitido]);

  // Escuta alteração física nos dispositivos (ex: plugar microfone USB)
  useEffect(() => {
    navigator.mediaDevices.addEventListener("devicechange", listarDispositivos);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", listarDispositivos);
    };
  }, [listarDispositivos]);

  // Gravação de teste
  const iniciarGravacao = useCallback(() => {
    if (!stream) return;
    setAudioUrl(null);
    chunksRef.current = [];

    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        setErro("Nenhum microfone ativo encontrado para gravação.");
        return;
      }

      // Cria uma nova stream contendo apenas as faixas de áudio
      const streamGravacao = new MediaStream(audioTracks);
      const mediaRecorder = new MediaRecorder(streamGravacao);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setGravando(true);
    } catch (err: any) {
      console.error("Erro ao iniciar gravação rápida:", err);
      setErro(`Falha ao gravar áudio: ${err.message || err}`);
    }
  }, [stream]);

  const pararGravacao = useCallback(() => {
    if (mediaRecorderRef.current && gravando) {
      mediaRecorderRef.current.stop();
      setGravando(false);
    }
  }, [gravando]);

  // Limpa as conexões quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [stream, audioUrl]);

  return {
    dispositivosVideo,
    dispositivosAudioIn,
    dispositivosAudioOut,
    cameraSelecionada,
    microfoneSelecionado,
    saidaSelecionada,
    setCameraSelecionada,
    setMicrofoneSelecionado,
    setSaidaSelecionada,
    stream,
    erro,
    permitido,
    solicitarPermissao,
    analyserNode,
    iniciarGravacao,
    pararGravacao,
    gravando,
    audioUrl,
    suportaAudioOut,
  };
}
