import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Mic,
  Monitor,
  Square,
  Play,
  Pause,
  Download,
  Loader2,
  Trash2,
  Copy,
  Check,
  FileCheck,
  Zap,
  Activity,
  Layers,
  Radio,
} from "lucide-react";
import { Botao, Cartao, Aviso, Vazio } from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { cn } from "@/lib/utils";
import { lerConfig, configCompleta } from "@/lib/settings";
import { nomeLivre, escreverMarkdown } from "@/lib/markdown";
import { useSalvar } from "@/lib/useSalvar";
import { useAcervoRepo } from "@/lib/useItemRepo";
import {
  type MotorTranscricao,
  type FonteAudio,
  type SegmentoTranscricao,
  type StatusGravador,
  type ProgressoModelo,
  type SessaoTranscricao,
  iniciarTranscricao,
} from "@/lib/transcricao";

export default function Transcritor() {
  const cfg = lerConfig();
  const { salvarTexto } = useSalvar(cfg);
  const { acervo } = useAcervoRepo(cfg);
  const pronto = configCompleta(cfg);

  // Estados de Configuração da Sessão
  const [motor, setMotor] = useState<MotorTranscricao>("nativo");
  const [fonte, setFonte] = useState<FonteAudio>("microfone");
  const [status, setStatus] = useState<StatusGravador>("inativo");
  const [nivelVolume, setNivelVolume] = useState<number>(0);
  const [progressoMsg, setProgressoMsg] = useState<string>("");

  // Transcrição ao vivo
  const [segmentos, setSegmentos] = useState<SegmentoTranscricao[]>([]);
  const [textoParcial, setTextoParcial] = useState<string>("");
  const [segundosGravados, setSegundosGravados] = useState<number>(0);

  // UI Feedback
  const [copiado, setCopiado] = useState(false);
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erro, setErro] = useState("");

  const sessaoRef = useRef<SessaoTranscricao | null>(null);
  const timerRef = useRef<number | null>(null);
  const finalTranscricaoRef = useRef<HTMLDivElement>(null);

  // Auto-scroll da transcrição
  useEffect(() => {
    if (finalTranscricaoRef.current) {
      finalTranscricaoRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [segmentos, textoParcial]);

  // Cronômetro da gravação
  useEffect(() => {
    if (status === "gravando") {
      timerRef.current = window.setInterval(() => {
        setSegundosGravados((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      if (sessaoRef.current) {
        sessaoRef.current.parar().catch(() => {});
      }
    };
  }, []);

  function formatarTempo(segundosTotal: number): string {
    const mins = Math.floor(segundosTotal / 60)
      .toString()
      .padStart(2, "0");
    const secs = (segundosTotal % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  // Iniciar Gravação ao Vivo
  async function iniciarGravacao() {
    setErro("");
    setMensagemSucesso("");
    setTextoParcial("");

    try {
      const sessao = iniciarTranscricao({
        motor,
        fonte,
        idioma: "pt-BR",
        aoReceberSegmento: (seg) => {
          setSegmentos((prev) => [...prev, seg]);
        },
        aoAtualizarTextoParcial: (parcial) => {
          setTextoParcial(parcial);
        },
        aoProgressoModelo: (prog: ProgressoModelo) => {
          setProgressoMsg(prog.mensagem);
        },
        aoStatusMudou: (novoStatus) => {
          setStatus(novoStatus);
        },
        aoNivelVolume: (vol) => {
          setNivelVolume(vol);
        },
        aoErro: (err) => {
          setErro(err);
          setStatus("erro");
        },
      });

      sessaoRef.current = sessao;
    } catch (e: any) {
      setErro(e?.message || "Não foi possível iniciar a captura de áudio.");
      setStatus("erro");
    }
  }

  // Pausar Gravação
  function pausarGravacao() {
    if (sessaoRef.current) {
      sessaoRef.current.pausar();
      setStatus("pausado");
    }
  }

  // Retomar Gravação
  function retomarGravacao() {
    if (sessaoRef.current) {
      sessaoRef.current.retomar();
      setStatus("gravando");
    }
  }

  // Parar Gravação
  async function pararGravacao() {
    if (sessaoRef.current) {
      await sessaoRef.current.parar();
      sessaoRef.current = null;
    }
    setStatus("inativo");
    setNivelVolume(0);
    setTextoParcial("");
  }

  // Limpar transcrição atual
  function limparTudo() {
    if (status === "gravando" || status === "pausado") {
      pararGravacao();
    }
    setSegmentos([]);
    setTextoParcial("");
    setSegundosGravados(0);
    setMensagemSucesso("");
    setErro("");
  }

  const textoCompleto = segmentos
    .map((s) => `[${s.timestamp}] ${s.texto}`)
    .join("\n\n");

  // Copiar para a área de transferência
  function copiarTexto() {
    if (!textoCompleto) return;
    navigator.clipboard.writeText(textoCompleto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  // Baixar arquivo .md
  function baixarMarkdown() {
    if (!textoCompleto) return;
    const nome = `Transcricao_${new Date().toISOString().slice(0, 10)}_${motor}.md`;
    const blob = new Blob([textoCompleto], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Salvar como Nota no Segundo Cérebro (GitHub)
  async function salvarComoNota() {
    if (!textoCompleto) return;
    setSalvandoNota(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const dataFormatada = new Date().toLocaleDateString("pt-BR");
      const titulo = `Transcrição de Reunião - ${dataFormatada}`;
      const caminho = nomeLivre("notas", titulo, acervo.map((i) => i.caminho));

      const corpoMarkdown = `## Transcrição Realizada com ${motor.toUpperCase()} (${fonte === "reuniao_aba" ? "Áudio da Reunião" : "Microfone"})\n\n**Data:** ${dataFormatada}\n**Duração:** ${formatarTempo(segundosGravados)}\n\n---\n\n${textoCompleto}`;

      const doc = {
        dados: {
          titulo,
          criado_em: new Date().toISOString(),
          tags: ["transcricao", "reuniao", motor],
        },
        corpo: corpoMarkdown,
      };

      const textoMd = escreverMarkdown(doc);
      await salvarTexto(caminho, textoMd, undefined, `Criada nota de transcrição ${titulo}`);
      setMensagemSucesso(`Salvo com sucesso como nota "${titulo}" no seu repositório!`);
    } catch (err: any) {
      setErro(err?.message || "Erro ao salvar a nota no repositório. Verifique seus Ajustes.");
    } finally {
      setSalvandoNota(false);
    }
  }

  if (!pronto) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Vazio
          titulo="Falta conectar sua conta"
          descricao="Para utilizar o Transcritor de Áudio e salvar suas notas no GitHub, preencha sua conta e token na aba de Ajustes."
          acao={
            <Link to="/config">
              <Botao>Ir para Ajustes</Botao>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Transcrição de Reuniões & Voz"
        descricao="Transcreva reuniões do Google Meet/Zoom ou grave suas ideias com motores 100% gratuitos e livres de Whisper."
        icone={<Mic size={20} />}
        corIcone="bg-purple-500/10 text-purple-600 dark:text-purple-400"
      />

      {/* Painel de Configuração do Motor e Fonte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Escolha do Motor */}
        <div className="space-y-2 p-4 rounded-2xl border border-border bg-card/60">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500" />
            <span>1. Motor de Transcrição (100% Gratuito):</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={status === "gravando" || status === "carregando_modelo"}
              onClick={() => setMotor("vosk")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all space-y-1",
                motor === "vosk"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:bg-accent disabled:opacity-50"
              )}
            >
              <div className="text-xs font-bold text-foreground">Vosk (PT-BR)</div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Modelo acústico PT. Sem alucinações.
              </p>
            </button>

            <button
              type="button"
              disabled={status === "gravando" || status === "carregando_modelo"}
              onClick={() => setMotor("sherpa")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all space-y-1",
                motor === "sherpa"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:bg-accent disabled:opacity-50"
              )}
            >
              <div className="text-xs font-bold text-foreground">Sherpa-ONNX</div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Next-Gen Kaldi / Zipformer streaming.
              </p>
            </button>

            <button
              type="button"
              disabled={status === "gravando" || status === "carregando_modelo"}
              onClick={() => setMotor("nativo")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all space-y-1",
                motor === "nativo"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:bg-accent disabled:opacity-50"
              )}
            >
              <div className="text-xs font-bold text-foreground">Voz Nativa</div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Zero download. Reconhecimento instantâneo.
              </p>
            </button>
          </div>
        </div>

        {/* 2. Escolha da Fonte de Áudio */}
        <div className="space-y-2 p-4 rounded-2xl border border-border bg-card/60">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={14} className="text-blue-500" />
            <span>2. Fonte do Áudio:</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={status === "gravando" || status === "carregando_modelo"}
              onClick={() => setFonte("microfone")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all flex items-center gap-2.5",
                fonte === "microfone"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:bg-accent disabled:opacity-50"
              )}
            >
              <Mic size={18} className="text-purple-500" />
              <div>
                <div className="text-xs font-bold text-foreground">Microfone</div>
                <p className="text-[10px] text-muted-foreground">Sua voz direta</p>
              </div>
            </button>

            <button
              type="button"
              disabled={status === "gravando" || status === "carregando_modelo"}
              onClick={() => setFonte("reuniao_aba")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all flex items-center gap-2.5",
                fonte === "reuniao_aba"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:bg-accent disabled:opacity-50"
              )}
            >
              <Monitor size={18} className="text-blue-500" />
              <div>
                <div className="text-xs font-bold text-foreground">Reunião / Aba</div>
                <p className="text-[10px] text-muted-foreground">Google Meet, Zoom, etc.</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Avisos */}
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {mensagemSucesso && <Aviso tom="sucesso">{mensagemSucesso}</Aviso>}

      {/* Painel Central de Controle de Gravação */}
      <Cartao className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/60 pb-5">
          {/* Status e Cronômetro */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl transition-all",
                status === "gravando"
                  ? "bg-red-500/15 text-red-600 animate-pulse ring-2 ring-red-500/30"
                  : status === "pausado"
                  ? "bg-yellow-500/15 text-yellow-600"
                  : status === "carregando_modelo"
                  ? "bg-blue-500/15 text-blue-600"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {status === "gravando" ? (
                <Radio size={24} className="animate-pulse" />
              ) : status === "carregando_modelo" ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Mic size={24} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {status === "gravando"
                    ? "Ouvindo e Transcrevendo..."
                    : status === "pausado"
                    ? "Gravação Pausada"
                    : status === "carregando_modelo"
                    ? "Carregando Modelo..."
                    : "Pronto para Gravar"}
                </h3>
                {status === "gravando" && (
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {status === "carregando_modelo"
                  ? progressoMsg || "Baixando IA WebAssembly..."
                  : `Tempo: ${formatarTempo(segundosGravados)}`}
              </p>
            </div>
          </div>

          {/* Medidor de Volume / Atividade Sonora */}
          <div className="w-full sm:w-48 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Activity size={12} className="text-green-500" />
                Volume
              </span>
              <span className="font-mono">{nivelVolume}%</span>
            </div>
            <div className="h-2 w-full bg-secondary/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-75 rounded-full"
                style={{ width: `${nivelVolume}%` }}
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            {status === "inativo" || status === "erro" ? (
              <Botao
                variante="primario"
                onClick={iniciarGravacao}
                className="flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <Play size={16} />
                <span>Iniciar Transcrição</span>
              </Botao>
            ) : status === "carregando_modelo" ? (
              <Botao variante="neutro" disabled className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Carregando...</span>
              </Botao>
            ) : (
              <>
                {status === "gravando" ? (
                  <Botao
                    variante="neutro"
                    onClick={pausarGravacao}
                    className="flex items-center gap-1.5"
                  >
                    <Pause size={15} />
                    <span>Pausar</span>
                  </Botao>
                ) : (
                  <Botao
                    variante="primario"
                    onClick={retomarGravacao}
                    className="flex items-center gap-1.5"
                  >
                    <Play size={15} />
                    <span>Retomar</span>
                  </Botao>
                )}

                <Botao
                  variante="perigo"
                  onClick={pararGravacao}
                  className="flex items-center gap-1.5"
                >
                  <Square size={15} />
                  <span>Finalizar</span>
                </Botao>
              </>
            )}

            {segmentos.length > 0 && status === "inativo" && (
              <button
                onClick={limparTudo}
                className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-destructive/10 transition-colors"
                title="Limpar Transcrição"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Caixa de Texto / Transcrição em Tempo Real */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Transcrição em Tempo Real ({segmentos.length} falas)
            </h4>

            {segmentos.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copiarTexto}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground border border-border px-2.5 py-1 rounded-lg"
                >
                  {copiado ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                  <span>{copiado ? "Copiado!" : "Copiar"}</span>
                </button>

                <Botao
                  variante="neutro"
                  tamanho="pequeno"
                  onClick={baixarMarkdown}
                  className="flex items-center gap-1"
                >
                  <Download size={13} />
                  <span>Baixar .MD</span>
                </Botao>

                <Botao
                  variante="primario"
                  tamanho="pequeno"
                  disabled={salvandoNota}
                  onClick={salvarComoNota}
                  className="flex items-center gap-1"
                >
                  {salvandoNota ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <FileCheck size={13} />
                  )}
                  <span>Salvar como Nota</span>
                </Botao>
              </div>
            )}
          </div>

          <div className="min-h-[260px] max-h-[460px] overflow-y-auto rounded-2xl border border-border bg-background p-4 space-y-3 font-sans">
            {segmentos.length === 0 && !textoParcial ? (
              <div className="py-16 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
                <Mic size={32} className="opacity-30" />
                <p className="text-sm font-medium">Nenhuma fala registrada ainda.</p>
                <p className="text-xs max-w-sm">
                  Escolha o motor, selecione se quer capturar o Microfone ou a Aba de Reunião e clique em{" "}
                  <strong>"Iniciar Transcrição"</strong>.
                </p>
              </div>
            ) : (
              <>
                {segmentos.map((seg) => (
                  <div
                    key={seg.id}
                    className="p-2.5 rounded-xl bg-card border border-border/60 space-y-1 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                      <span className="bg-secondary px-1.5 py-0.5 rounded font-bold">
                        {seg.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed font-normal">
                      {seg.texto}
                    </p>
                  </div>
                ))}

                {textoParcial && (
                  <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1 animate-pulse">
                    <div className="text-[10px] font-mono text-primary font-bold">
                      Ouvindo agora...
                    </div>
                    <p className="text-sm text-foreground italic">{textoParcial}</p>
                  </div>
                )}
                <div ref={finalTranscricaoRef} />
              </>
            )}
          </div>
        </div>
      </Cartao>
    </div>
  );
}
