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
  Keyboard as IconeTeclado,
  MousePointer as IconeMouse,
  Move,
} from "lucide-react";
import { useMediaDevices } from "@/lib/useMediaDevices";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { AlternadorVisao } from "@/components/AlternadorVisao";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type AbaHardware = "audio_video" | "teclado" | "mouse";

export default function TestadorHardware() {
  const [abaAtiva, setAbaAtiva] = useState<AbaHardware>("audio_video");

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

  // ── ESTADO DO TESTADOR DE TECLADO ──────────────────────────────────────────
  const [teclasPressionadas, setTeclasPressionadas] = useState<Set<string>>(new Set());
  const [teclasTestadas, setTeclasTestadas] = useState<Set<string>>(new Set());
  const [ultimaTecla, setUltimaTecla] = useState<string>("");

  // ── ESTADO DO TESTADOR DE MOUSE ────────────────────────────────────────────
  const [botoesMouse, setBotoesMouse] = useState<{
    esquerdo: boolean;
    direito: boolean;
    meio: boolean;
    duplo: boolean;
    scrollCima: boolean;
    scrollBaixo: boolean;
  }>({
    esquerdo: false,
    direito: false,
    meio: false,
    duplo: false,
    scrollCima: false,
    scrollBaixo: false,
  });
  const [posicaoMouse, setPosicaoMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ultimoEventoMouse, setUltimoEventoMouse] = useState<string>("");

  // Associa a stream de vídeo ao elemento <video>
  useEffect(() => {
    if (videoRef.current && stream && abaAtiva === "audio_video") {
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
  }, [stream, abaAtiva]);

  // Renderização da forma de onda no Canvas em tempo real (Web Audio API)
  useEffect(() => {
    if (!analyserNode || !canvasRef.current || abaAtiva !== "audio_video") return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animId: number;

    const desenhar = () => {
      animId = requestAnimationFrame(desenhar);

      analyserNode.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Linha central de guia
      ctx.beginPath();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
      ctx.lineWidth = 1;
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Configuração do traço da onda
      ctx.lineWidth = 2.5;
      const gradiente = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradiente.addColorStop(0, "#3b82f6");
      gradiente.addColorStop(0.5, "#8b5cf6");
      gradiente.addColorStop(1, "#ec4899");

      ctx.strokeStyle = gradiente;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const normalizado = dataArray[i] / 128.0;
        const diferenca = normalizado - 1.0;
        const amplitudeAmplificada = 1.0 + diferenca * 1.6;
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
  }, [analyserNode, abaAtiva]);

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

  // Testador de Teclado: Event listeners
  useEffect(() => {
    if (abaAtiva !== "teclado") return;

    const aoPressionar = (e: KeyboardEvent) => {
      e.preventDefault();
      const code = e.code || e.key;
      setTeclasPressionadas((prev) => new Set(prev).add(code));
      setTeclasTestadas((prev) => new Set(prev).add(code));
      setUltimaTecla(`${e.key} (${code})`);
    };

    const aoSoltar = (e: KeyboardEvent) => {
      e.preventDefault();
      const code = e.code || e.key;
      setTeclasPressionadas((prev) => {
        const novo = new Set(prev);
        novo.delete(code);
        return novo;
      });
    };

    window.addEventListener("keydown", aoPressionar);
    window.addEventListener("keyup", aoSoltar);

    return () => {
      window.removeEventListener("keydown", aoPressionar);
      window.removeEventListener("keyup", aoSoltar);
    };
  }, [abaAtiva]);

  const aoClicarGravar = () => {
    if (gravando) {
      pararGravacao();
    } else {
      iniciarGravacao();
    }
  };

  const aoReproduzirAudio = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current
        .play()
        .then(() => setTocando(true))
        .catch((err) => logger.error("Falha ao reproduzir áudio gravado:", err));
    }
  };

  const aoPararReproducao = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setTocando(false);
  };

  useEffect(() => {
    if (permitido === null) {
      solicitarPermissao();
    }
  }, [permitido, solicitarPermissao]);

  // Layout de Teclado Visual
  const LINHAS_TECLADO = [
    ["Escape", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"],
    ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", "Backspace"],
    ["Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash"],
    ["CapsLock", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote", "Enter"],
    ["ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash", "ShiftRight"],
    ["ControlLeft", "AltLeft", "MetaLeft", "Space", "MetaRight", "AltRight", "ControlRight", "ArrowLeft", "ArrowUp", "ArrowDown", "ArrowRight"],
  ];

  const NOMES_TECLAS: Record<string, string> = {
    Escape: "Esc",
    Backquote: "'",
    Minus: "-",
    Equal: "=",
    Backspace: "⌫",
    Tab: "Tab ⇥",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    CapsLock: "Caps ⇪",
    Semicolon: ";",
    Quote: "~",
    Enter: "Enter ↵",
    ShiftLeft: "⇧ Shift",
    ShiftRight: "⇧ Shift",
    ControlLeft: "Ctrl",
    ControlRight: "Ctrl",
    AltLeft: "Alt / Opt",
    AltRight: "Alt / Opt",
    MetaLeft: "⌘ Cmd",
    MetaRight: "⌘ Cmd",
    Space: "Espaço",
    ArrowLeft: "←",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowRight: "→",
    Comma: ",",
    Period: ".",
    Slash: "/",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full pb-10">
      <CabecalhoPagina
        titulo="Diagnóstico de Hardware"
        descricao="Teste sua câmera, microfone, alto-falante, teclado e mouse antes de iniciar reuniões e trabalhos."
        icone={<IconeVideo size={20} />}
        corIcone="bg-red-500/10 text-red-600 dark:text-red-400"
        acoes={
          <AlternadorVisao
            valorAtivo={abaAtiva}
            aoAlternar={(v) => setAbaAtiva(v as AbaHardware)}
            opcoes={[
              { id: "audio_video", rotulo: "Áudio & Vídeo", icone: <IconeVideo size={14} /> },
              { id: "teclado", rotulo: "Teclado", icone: <IconeTeclado size={14} /> },
              { id: "mouse", rotulo: "Mouse", icone: <IconeMouse size={14} /> },
            ]}
          />
        }
      />

      {/* ABA 1: ÁUDIO & VÍDEO */}
      {abaAtiva === "audio_video" && (
        <>
          {permitido === null && (
            <div className="flex flex-col items-center justify-center py-20 bg-card border border-border/80 rounded-2xl p-8 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Solicitando acesso à câmera e ao microfone...</p>
            </div>
          )}

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

          {permitido === true && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Vídeo da Câmera */}
              <div className="md:col-span-7 flex flex-col space-y-3">
                <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden border border-border/80 shadow-md flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!stream && (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <IconeVideoOff size={32} />
                      <span className="text-xs">Câmera desligada ou indisponível</span>
                    </div>
                  )}
                  {stream && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Ao Vivo
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="select-camera" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dispositivo de Vídeo</label>
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

              {/* Microfone & Áudio */}
              <div className="md:col-span-5 flex flex-col space-y-4">
                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconeMic size={16} className="text-primary" />
                      <h4 className="font-bold text-sm text-foreground">Sensibilidade do Microfone</h4>
                    </div>
                    {analyserNode && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    )}
                  </div>

                  <div className="h-16 w-full rounded-xl bg-background border border-border/60 overflow-hidden flex items-center justify-center p-1">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={64}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label htmlFor="select-mic" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dispositivo de Entrada</label>
                    <select
                      id="select-mic"
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

                {/* Gravação e Saída */}
                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2">
                    <IconeVolume size={16} className="text-primary" />
                    <h4 className="font-bold text-sm text-foreground">Gravação & Teste de Eco</h4>
                  </div>

                  <div className="flex items-center gap-2">
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
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : "bg-card border-border hover:bg-accent text-foreground"
                        )}
                      >
                        {tocando ? (
                          <>
                            <IconeStop size={15} />
                            <span>Parar</span>
                          </>
                        ) : (
                          <>
                            <IconePlay size={15} />
                            <span>Ouvir Eco</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <audio ref={audioRef} className="hidden" onEnded={aoPararReproducao} />

                  {suportaAudioOut && (
                    <div className="flex flex-col space-y-1.5 border-t border-border/50 pt-3">
                      <label htmlFor="select-saida" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saída de Áudio</label>
                      <select
                        id="select-saida"
                        value={saidaSelecionada}
                        onChange={(e) => setSaidaSelecionada(e.target.value)}
                        className="w-full rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
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
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ABA 2: TECLADO INTERATIVO */}
      {abaAtiva === "teclado" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 p-4 bg-card border border-border/80 rounded-2xl">
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <IconeTeclado size={16} className="text-primary" />
                Pressione qualquer tecla para testar
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Última tecla: <span className="font-mono font-bold text-primary">{ultimaTecla || "Nenhuma ainda"}</span> • {teclasTestadas.size} teclas verificadas com sucesso
              </p>
            </div>
            <button
              onClick={() => {
                setTeclasTestadas(new Set());
                setTeclasPressionadas(new Set());
                setUltimaTecla("");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/40 hover:bg-accent text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              <IconeReset size={14} />
              <span>Limpar Teste</span>
            </button>
          </div>

          <div className="p-4 bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl overflow-x-auto space-y-2 select-none shadow-xs">
            {LINHAS_TECLADO.map((linha, lIdx) => (
              <div key={lIdx} className="flex gap-1.5 justify-center">
                {linha.map((tecla) => {
                  const estaPressionada = teclasPressionadas.has(tecla);
                  const foiTestada = teclasTestadas.has(tecla);
                  const rotulo = NOMES_TECLAS[tecla] || tecla.replace("Key", "").replace("Digit", "");

                  return (
                    <div
                      key={tecla}
                      className={cn(
                        "h-10 min-w-[38px] px-2 rounded-lg flex items-center justify-center text-xs font-mono font-bold border transition-all duration-75 shadow-xs",
                        estaPressionada
                          ? "bg-primary text-primary-foreground border-primary scale-95 shadow-md ring-2 ring-primary/50"
                          : foiTestada
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-bold"
                            : "bg-secondary/40 text-muted-foreground border-border/60 hover:border-border",
                        tecla === "Space" && "w-64",
                        (tecla === "Backspace" || tecla === "Tab" || tecla === "CapsLock" || tecla === "Enter") && "min-w-[70px]",
                        (tecla === "ShiftLeft" || tecla === "ShiftRight") && "min-w-[85px]"
                      )}
                    >
                      {rotulo}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 3: MOUSE INTERATIVO */}
      {abaAtiva === "mouse" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 p-4 bg-card border border-border/80 rounded-2xl">
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <IconeMouse size={16} className="text-primary" />
                Área de Teste de Precisão do Mouse
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Posição: <span className="font-mono font-semibold text-primary">X: {posicaoMouse.x}, Y: {posicaoMouse.y}</span> • Último evento: <span className="font-mono text-foreground">{ultimoEventoMouse || "Aguardando ação"}</span>
              </p>
            </div>
            <button
              onClick={() => {
                setBotoesMouse({
                  esquerdo: false,
                  direito: false,
                  meio: false,
                  duplo: false,
                  scrollCima: false,
                  scrollBaixo: false,
                });
                setUltimoEventoMouse("");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/40 hover:bg-accent text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              <IconeReset size={14} />
              <span>Limpar Teste</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { id: "esquerdo", label: "Botão Esquerdo", ativo: botoesMouse.esquerdo },
              { id: "direito", label: "Botão Direito", ativo: botoesMouse.direito },
              { id: "meio", label: "Botão do Meio (Scroll)", ativo: botoesMouse.meio },
              { id: "duplo", label: "Duplo Clique", ativo: botoesMouse.duplo },
              { id: "scrollCima", label: "Scroll para Cima", ativo: botoesMouse.scrollCima },
              { id: "scrollBaixo", label: "Scroll para Baixo", ativo: botoesMouse.scrollBaixo },
            ].map((btn) => (
              <div
                key={btn.id}
                className={cn(
                  "p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all shadow-xs",
                  btn.ativo
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "bg-card border-border text-muted-foreground"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", btn.ativo ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                <span className="text-xs">{btn.label}</span>
              </div>
            ))}
          </div>

          {/* Touchpad / Área de Teste */}
          <div
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setPosicaoMouse({
                x: Math.round(e.clientX - rect.left),
                y: Math.round(e.clientY - rect.top),
              });
            }}
            onMouseDown={(e) => {
              if (e.button === 0) {
                setBotoesMouse((prev) => ({ ...prev, esquerdo: true }));
                setUltimoEventoMouse("Clique Esquerdo (MouseDown)");
              } else if (e.button === 1) {
                setBotoesMouse((prev) => ({ ...prev, meio: true }));
                setUltimoEventoMouse("Clique do Meio (AuxClick)");
              } else if (e.button === 2) {
                setBotoesMouse((prev) => ({ ...prev, direito: true }));
                setUltimoEventoMouse("Clique Direito (ContextMenu)");
              }
            }}
            onDoubleClick={() => {
              setBotoesMouse((prev) => ({ ...prev, duplo: true }));
              setUltimoEventoMouse("Duplo Clique (DblClick)");
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setBotoesMouse((prev) => ({ ...prev, direito: true }));
              setUltimoEventoMouse("Menu de Contexto (Clique Direito)");
            }}
            onWheel={(e) => {
              if (e.deltaY < 0) {
                setBotoesMouse((prev) => ({ ...prev, scrollCima: true }));
                setUltimoEventoMouse("Roda do Scroll para CIMA");
              } else if (e.deltaY > 0) {
                setBotoesMouse((prev) => ({ ...prev, scrollBaixo: true }));
                setUltimoEventoMouse("Roda do Scroll para BAIXO");
              }
            }}
            className="h-64 rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/50 bg-card/40 flex flex-col items-center justify-center text-center p-6 cursor-crosshair select-none relative overflow-hidden group transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 transition-transform group-hover:scale-110">
              <Move size={24} />
            </div>
            <p className="font-bold text-sm text-foreground">Clique, role o scroll ou arraste o mouse dentro desta área</p>
            <p className="text-xs text-muted-foreground mt-1">Todos os botões e gestos serão capturados e validados em tempo real</p>
          </div>
        </div>
      )}
    </div>
  );
}
