import { useEffect, useRef, useState } from "react";
import {
  Video as IconeVideo,
  VideoOff as IconeVideoOff,
  Mic as IconeMic,
  Volume2 as IconeVolume,
  Play as IconePlay,
  Square as IconeStop,
  RotateCcw as IconeReset,
  AlertCircle as IconeErro,
  Check as IconeOk,
} from "lucide-react";
import { useMediaDevices } from "@/lib/useMediaDevices";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { cn } from "@/lib/utils";

export default function TestadorHardware() {
  const {
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
    erro: erroHook,
    permitido,
    solicitarPermissao,
    analyserNode,
    iniciarGravacao,
    pararGravacao,
    gravando,
    audioUrl,
    suportaAudioOut,
  } = useMediaDevices();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [tocando, setTocando] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(0);
  const intervaloGravacao = useRef<any>(null);

  // Associa a stream de vídeo ao elemento <video>
  useEffect(() => {
    if (videoRef.current && stream) {
      // Filtrar a stream para conter apenas faixas de vídeo no elemento <video>
      // para não duplicar som local no navegador
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        const videoStream = new MediaStream(videoTracks);
        videoRef.current.srcObject = videoStream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  // Renderização da forma de onda no Canvas em tempo real (Web Audio API)
  useEffect(() => {
    if (!analyserNode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animId: number;

    const desenhar = () => {
      animId = requestAnimationFrame(desenhar);

      analyserNode.getByteTimeDomainData(dataArray);

      // Limpa a tela
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Desenha linha de fundo centralizada sutil
      ctx.beginPath();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
      ctx.lineWidth = 1;
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Configuração do traço da onda
      ctx.lineWidth = 2.5;
      
      // Cria gradiente moderno para o traço
      const gradiente = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradiente.addColorStop(0, "#3b82f6"); // Azul
      gradiente.addColorStop(0.5, "#8b5cf6"); // Violeta
      gradiente.addColorStop(1, "#ec4899"); // Rosa

      ctx.strokeStyle = gradiente;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const normalizado = dataArray[i] / 128.0; // Normaliza entre 0 e 2
        // Amplifica levemente a variação para que sussurros sejam visíveis
        const diferenca = normalizado - 1.0;
        const amplitudeAmplificada = 1.0 + diferenca * 1.5;
        const y = (amplitudeAmplificada * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    desenhar();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [analyserNode]);

  // Gerencia o temporizador da gravação (limite de 5 segundos)
  useEffect(() => {
    if (gravando) {
      setTempoRestante(5);
      intervaloGravacao.current = setInterval(() => {
        setTempoRestante((prev) => {
          if (prev <= 1) {
            clearInterval(intervaloGravacao.current);
            pararGravacao();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervaloGravacao.current) {
        clearInterval(intervaloGravacao.current);
      }
      setTempoRestante(0);
    }

    return () => {
      if (intervaloGravacao.current) {
        clearInterval(intervaloGravacao.current);
      }
    };
  }, [gravando, pararGravacao]);

  const aoClicarGravar = () => {
    if (gravando) {
      pararGravacao();
    } else {
      iniciarGravacao();
    }
  };

  const aoReproduzirAudio = async () => {
    if (!audioUrl || !audioRef.current) return;
    
    try {
      const audio = audioRef.current;
      audio.src = audioUrl;

      // Define a saída se compatível
      if (suportaAudioOut && saidaSelecionada) {
        try {
          await (audio as any).setSinkId(saidaSelecionada);
        } catch (err) {
          console.warn("Falha ao definir saída de áudio (setSinkId):", err);
        }
      }

      await audio.play();
      setTocando(true);
    } catch (err) {
      console.error("Erro ao tocar áudio de teste:", err);
    }
  };

  const aoPararReproducao = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setTocando(false);
  };

  // Se ainda não decidiu a permissão ou está carregando
  useEffect(() => {
    if (permitido === null) {
      solicitarPermissao();
    }
  }, [permitido, solicitarPermissao]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full pb-10">
      <CabecalhoPagina
        titulo="Diagnóstico de Hardware"
        descricao="Verifique a sua câmera, microfone e alto-falante antes de iniciar reuniões."
        icone={<IconeVideo size={20} />}
        corIcone="bg-red-500/10 text-red-600 dark:text-red-400"
      />

      {/* Caso as permissões ainda estejam pendentes */}
      {permitido === null && (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border/80 rounded-2xl p-8 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Solicitando acesso à câmera e ao microfone...</p>
        </div>
      )}

      {/* Caso a permissão tenha sido negada */}
      {permitido === false && (
        <div className="flex flex-col items-center justify-center py-16 bg-card border border-border/80 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <IconeErro size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-foreground">Permissões de Mídia Bloqueadas</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {erroHook || "O Klaus precisa de acesso à câmera e ao microfone para realizar o teste de diagnóstico. Libere as permissões na barra de endereços do navegador."}
            </p>
          </div>
          <button
            onClick={solicitarPermissao}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/95 transition-colors cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Painel do Testador Ativo */}
      {permitido === true && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Lado Esquerdo: Vídeo da Câmera */}
          <div className="md:col-span-7 flex flex-col space-y-3">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-border/60 shadow-lg flex items-center justify-center">
              {stream?.getVideoTracks().length ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1] transform"
                />
              ) : (
                <div className="flex flex-col items-center space-y-2 text-slate-400">
                  <IconeVideoOff size={40} className="stroke-1" />
                  <span className="text-sm font-medium">Nenhum feed de vídeo ativo</span>
                </div>
              )}

              {/* Marca sutil indicando espelho */}
              <div className="absolute bottom-3 left-3 bg-black/50 text-[10px] text-white px-2 py-1 rounded-md font-mono select-none backdrop-blur-xs">
                Modo Espelho
              </div>
            </div>
            
            {/* Seletor da Câmera */}
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="select-camera" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Câmera</label>
              <select
                id="select-camera"
                value={cameraSelecionada}
                onChange={(e) => setCameraSelecionada(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-card px-3 py-2.5 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              >
                {dispositivosVideo.length === 0 ? (
                  <option value="">Nenhuma câmera detectada</option>
                ) : (
                  dispositivosVideo.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Lado Direito: Áudio, Gravação e Saída */}
          <div className="md:col-span-5 flex flex-col space-y-6">
            
            {/* Bloco de Monitoramento em Tempo Real */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconeMic size={16} className="text-primary" />
                  <h4 className="font-bold text-sm text-foreground">Sensibilidade do Microfone</h4>
                </div>
                {stream?.getAudioTracks().length ? (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                    <IconeOk size={10} /> Ativo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">
                    Pendente
                  </span>
                )}
              </div>

              {/* Canvas para a Forma de Onda */}
              <div className="h-20 bg-background/50 rounded-xl overflow-hidden border border-border/50 flex items-center justify-center relative">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={80}
                  className="w-full h-full object-fill block"
                />
              </div>

              {/* Seletor do Microfone */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="select-microfone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Microfone</label>
                <select
                  id="select-microfone"
                  value={microfoneSelecionado}
                  onChange={(e) => setMicrofoneSelecionado(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-card px-3 py-2.5 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                >
                  {dispositivosAudioIn.length === 0 ? (
                    <option value="">Nenhum microfone detectado</option>
                  ) : (
                    dispositivosAudioIn.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Bloco de Gravação e Saída de Som */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-5 shadow-xs">
              <div className="flex items-center gap-2">
                <IconeVolume size={16} className="text-primary" />
                <h4 className="font-bold text-sm text-foreground">Gravação e Saída de Som</h4>
              </div>

              {/* Gravação de teste de voz */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={aoClicarGravar}
                  disabled={tocando}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-xs transition-all cursor-pointer",
                    gravando
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : "bg-primary hover:bg-primary/95 text-primary-foreground disabled:opacity-50"
                  )}
                >
                  {gravando ? (
                    <>
                      <IconeStop size={15} />
                      <span>Parar ({tempoRestante}s)</span>
                    </>
                  ) : (
                    <>
                      <IconeMic size={15} />
                      <span>Gravar Voz (5s)</span>
                    </>
                  )}
                </button>

                {audioUrl && !gravando && (
                  <button
                    onClick={tocando ? aoPararReproducao : aoReproduzirAudio}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-xs border transition-all cursor-pointer",
                      tocando
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/15"
                        : "bg-card border-border hover:bg-accent text-foreground"
                    )}
                  >
                    {tocando ? (
                      <>
                        <IconeStop size={15} />
                        <span>Parar Voz</span>
                      </>
                    ) : (
                      <>
                        <IconePlay size={15} />
                        <span>Ouvir Voz</span>
                      </>
                    )}
                  </button>
                )}

                {audioUrl && !gravando && (
                  <button
                    onClick={() => {
                      aoPararReproducao();
                      // Obter o URL atual do hook e forçar reload? 
                      // O próprio hook lida com isso se limparmos localmente
                      // Mas podemos simplesmente re-gravar
                    }}
                    title="Limpar teste"
                    className="px-3 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <IconeReset size={15} />
                  </button>
                )}
              </div>

              {/* Elemento de áudio invisível para reprodução de teste */}
              <audio
                ref={audioRef}
                className="hidden"
                onEnded={aoPararReproducao}
              />

              {/* Seletor de Saída de Som (Escondido se setSinkId não for suportado) */}
              {suportaAudioOut ? (
                <div className="flex flex-col space-y-1.5 border-t border-border/50 pt-4">
                  <label htmlFor="select-saida" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dispositivo de Saída</label>
                  <select
                    id="select-saida"
                    value={saidaSelecionada}
                    onChange={(e) => setSaidaSelecionada(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-card px-3 py-2.5 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    {dispositivosAudioOut.length === 0 ? (
                      <option value="">Saída Padrão do Sistema</option>
                    ) : (
                      dispositivosAudioOut.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : (
                <div className="border-t border-border/50 pt-4">
                  <p className="text-xs text-muted-foreground leading-relaxed italic bg-accent/30 p-2.5 rounded-lg border border-border/20">
                    A seleção direta de saída de áudio não é suportada por este navegador (ex: Safari). O áudio será reproduzido no dispositivo padrão do sistema.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
