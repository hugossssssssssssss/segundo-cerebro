import { useState, useEffect, useRef } from "react";
import {
  Mic,
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Copy,
  Check,
  FileCheck,
  Cpu,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Botao, Cartao, Aviso } from "@/components/ui";
import { cn } from "@/lib/utils";
import { lerConfig } from "@/lib/settings";
import {
  transcreverAudioLocalWhisper,
  transcreverComWebSpeechAPI,
} from "@/lib/whisperLocal";
import { transcreverAudioComIA } from "@/lib/gemini";
import { gravar } from "@/lib/github";
import { nomeLivre, escreverMarkdown } from "@/lib/markdown";

type MotorTranscricao = "whisper_base" | "native_speech" | "gemini";

interface ItemTranscricao {
  id: string;
  nomeArquivo: string;
  tamanhoMB: string;
  status: "pendente" | "processando" | "concluido" | "erro";
  progressoMsg: string;
  transcricao?: string;
  erroMsg?: string;
  dataCriacao: string;
}

const CHAVE_STORAGE = "sc_transcricoes_queue";

export default function Transcritor() {
  const [motorSelecionado, setMotorSelecionado] = useState<MotorTranscricao>("whisper_base");

  const [fila, setFila] = useState<ItemTranscricao[]>(() => {
    const salvo = localStorage.getItem(CHAVE_STORAGE);
    if (!salvo) return [];
    try {
      const lido: ItemTranscricao[] = JSON.parse(salvo);

      /**
       * Item que ficou "processando" quando a página foi recarregada não tem
       * como continuar: o áudio vive na memória da aba, e a aba se foi. Antes
       * ele voltava com a rodinha girando para sempre, sem nenhuma saída.
       * Vira erro com instrução do que fazer.
       */
      return lido.map((item) =>
        item.status === "processando" || item.status === "pendente"
          ? {
              ...item,
              status: "erro" as const,
              erroMsg:
                "A transcrição foi interrompida quando a página recarregou. Envie o áudio de novo.",
            }
          : item,
      );
    } catch {
      return [];
    }
  });

  const [itemSelecionadoId, setItemSelecionadoId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erro, setErro] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const arquivosCacheRef = useRef<Map<string, File>>(new Map());

  /**
   * Guarda a fila entre visitas — sem derrubar a página quando não couber.
   *
   * O `localStorage` tem cerca de 5 MB e as transcrições inteiras iam para lá.
   * Estourar a cota lança uma exceção, e como isto roda dentro de um efeito
   * sem `try`, a exceção subia e levava a tela junto. Agora guardamos só as
   * mais recentes e, se ainda assim não couber, seguimos sem guardar: perder
   * o histórico é chato, perder a transcrição que está na tela é inaceitável.
   */
  useEffect(() => {
    const tentarGuardar = (itens: ItemTranscricao[]) => {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(itens));
    };

    try {
      tentarGuardar(fila);
    } catch {
      try {
        tentarGuardar(fila.slice(0, 5));
      } catch {
        try {
          localStorage.removeItem(CHAVE_STORAGE);
        } catch {
          /* nada mais a fazer; a fila continua viva na memória da aba */
        }
      }
    }
  }, [fila]);

  /**
   * Qual item está sendo transcrito agora.
   *
   * Precisa ser `ref`, não estado: este efeito reage a cada mensagem de
   * progresso, e um estado faria o próximo render chegar tarde demais.
   *
   * Sem esta trava a "fila" não era fila. O efeito depende de `fila` e ele
   * mesmo altera `fila`: ao marcar o primeiro item como "processando" ele
   * reexecutava, achava o segundo pendente e começava também. Com o Whisper
   * local isso eram dois modelos carregando e dois áudios sendo processados
   * ao mesmo tempo dentro do navegador.
   */
  const emProcessamentoRef = useRef<string | null>(null);

  // Processador de Fila em Segundo Plano — um de cada vez
  useEffect(() => {
    if (emProcessamentoRef.current) return;

    const pendente = fila.find((i) => i.status === "pendente");
    if (!pendente) return;

    const arquivoFile = arquivosCacheRef.current.get(pendente.id);
    if (!arquivoFile) {
      setFila((prev) =>
        prev.map((item) =>
          item.id === pendente.id
            ? {
                ...item,
                status: "erro",
                erroMsg: "Arquivo expirou na memória. Por favor, reenvie o áudio.",
              }
            : item
        )
      );
      return;
    }

    emProcessamentoRef.current = pendente.id;

    setFila((prev) =>
      prev.map((item) =>
        item.id === pendente.id
          ? { ...item, status: "processando", progressoMsg: "Iniciando transcrição..." }
          : item
      )
    );

    const callbackProgresso = (msg: string) => {
      setFila((prev) =>
        prev.map((item) =>
          item.id === pendente.id ? { ...item, progressoMsg: msg } : item
        )
      );
    };

    let promessaTranscricao: Promise<string>;

    if (motorSelecionado === "native_speech") {
      promessaTranscricao = transcreverComWebSpeechAPI(arquivoFile, callbackProgresso);
    } else if (motorSelecionado === "gemini") {
      const cfg = lerConfig();
      promessaTranscricao = transcreverAudioComIA(cfg, arquivoFile, callbackProgresso);
    } else {
      // whisper_base (Whisper Base 100% Local)
      promessaTranscricao = transcreverAudioLocalWhisper(arquivoFile, "Xenova/whisper-base", callbackProgresso);
    }

    promessaTranscricao
      .then((texto) => {
        setFila((prev) =>
          prev.map((item) =>
            item.id === pendente.id
              ? {
                  ...item,
                  status: "concluido",
                  progressoMsg: "Transcrição concluída com sucesso!",
                  transcricao: texto,
                }
              : item
          )
        );
        if (!itemSelecionadoId) setItemSelecionadoId(pendente.id);
      })
      .catch((e: any) => {
        setFila((prev) =>
          prev.map((item) =>
            item.id === pendente.id
              ? {
                  ...item,
                  status: "erro",
                  erroMsg: e?.message || "Erro ao transcrever o áudio.",
                }
              : item
          )
        );
      })
      .finally(() => {
        // libera a vaga: o efeito reexecuta e pega o próximo da fila
        emProcessamentoRef.current = null;
      });
  }, [fila, itemSelecionadoId, motorSelecionado]);

  // Adicionar arquivos à fila
  function aoAdicionarArquivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErro("");
    setMensagemSucesso("");

    const novosItens: ItemTranscricao[] = [];

    Array.from(files).forEach((f) => {
      const id = `transc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      arquivosCacheRef.current.set(id, f);

      novosItens.push({
        id,
        nomeArquivo: f.name,
        tamanhoMB: (f.size / (1024 * 1024)).toFixed(2),
        status: "pendente",
        progressoMsg: "Aguardando na fila...",
        dataCriacao: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    });

    setFila((prev) => [...novosItens, ...prev]);
    if (novosItens.length > 0 && !itemSelecionadoId) {
      setItemSelecionadoId(novosItens[0].id);
    }
  }

  function removerItem(id: string) {
    arquivosCacheRef.current.delete(id);
    setFila((prev) => prev.filter((i) => i.id !== id));
    if (itemSelecionadoId === id) setItemSelecionadoId(null);
  }

  function limparFilaConcluidos() {
    setFila((prev) => prev.filter((i) => i.status !== "concluido" && i.status !== "erro"));
  }

  // Baixar transcrição como TXT ou MD
  function baixarTranscricao(item: ItemTranscricao) {
    if (!item.transcricao) return;
    const blob = new Blob([item.transcricao], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Transcricao_${item.nomeArquivo.replace(/\.[^/.]+$/, "")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Salvar transcrição como Nota no Segundo Cérebro do GitHub
  async function salvarComoNota(item: ItemTranscricao) {
    if (!item.transcricao) return;
    setSalvandoNota(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const cfg = lerConfig();
      const titulo = `Transcrição: ${item.nomeArquivo.replace(/\.[^/.]+$/, "")}`;
      const caminho = nomeLivre("notas", titulo, []);
      const doc = {
        dados: { titulo, criado_em: new Date().toISOString() },
        corpo: item.transcricao,
      };
      const textoMd = escreverMarkdown(doc);
      await gravar(cfg, caminho, textoMd, undefined, `Transcrição criada de ${item.nomeArquivo}`);
      setMensagemSucesso(`Salvo como nota "${titulo}" no repositório!`);
    } catch {
      setErro("Erro ao salvar como nota no repositório. Verifique suas chaves nos Ajustes.");
    } finally {
      setSalvandoNota(false);
    }
  }

  const itemAtivo = fila.find((i) => i.id === itemSelecionadoId) || fila[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Cabeçalho */}
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Mic size={20} />
          </div>
          Transcrição de Áudio
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Transcreva áudios do WhatsApp, reuniões e entrevistas com opções 100% locais no navegador ou via IA.
        </p>
      </div>

      {/* Seleção do Motor de Transcrição */}
      <div className="space-y-2 p-4 rounded-xl border border-border bg-card/60">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Escolha o Motor de Transcrição:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setMotorSelecionado("whisper_base")}
            className={cn(
              "p-3 rounded-xl border text-left transition-all space-y-1",
              motorSelecionado === "whisper_base"
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card hover:bg-accent"
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Cpu size={14} className="text-blue-500" />
              <span>Whisper Base (Local)</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              100% no navegador. Modelo superior e mais inteligente em pt-BR. Custo R$ 0.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMotorSelecionado("native_speech")}
            className={cn(
              "p-3 rounded-xl border text-left transition-all space-y-1",
              motorSelecionado === "native_speech"
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card hover:bg-accent"
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Volume2 size={14} className="text-green-500" />
              <span>Voz Nativa do Sistema</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Usa o reconhecedor nativo do Mac/Android. Leve, rápido e sem downloads.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMotorSelecionado("gemini")}
            className={cn(
              "p-3 rounded-xl border text-left transition-all space-y-1",
              motorSelecionado === "gemini"
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card hover:bg-accent"
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles size={14} className="text-purple-500" />
              <span>Gemini AI (Com Oradores)</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Usa sua chave do Gemini para separar Orador 1 e Orador 2 perfeitamente.
            </p>
          </button>
        </div>
      </div>

      {/* Mensagens de Sucesso ou Erro */}
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {mensagemSucesso && <Aviso tom="sucesso">{mensagemSucesso}</Aviso>}

      {/* Área de Seleção de Áudio (Dropzone) */}
      <Cartao className="p-6 border-dashed border-2 border-border/80 hover:border-primary/50 transition-colors text-center cursor-pointer bg-card/40">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac"
          onChange={(e) => aoAdicionarArquivos(e.target.files)}
          className="hidden"
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2.5 py-6"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Upload size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Clique ou arraste seus arquivos de áudio (MP3, M4A, WAV, OGG, WEBM)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Pode deixar transcrevendo na fila e ir mexendo em outra parte do aplicativo.
            </p>
          </div>
          <Botao variante="neutro" tamanho="pequeno" className="mt-2">
            Selecionar Áudios
          </Botao>
        </div>
      </Cartao>

      {/* Painel Principal: Fila de Execução vs Visualizador de Transcrição */}
      {fila.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Coluna 1: Lista da Fila em Segundo Plano */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Fila de Processamento ({fila.length})
              </h3>
              {fila.some((i) => i.status === "concluido") && (
                <button
                  onClick={limparFilaConcluidos}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Limpar Concluídos
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-none">
              {fila.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setItemSelecionadoId(item.id)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer space-y-1.5",
                    itemAtivo?.id === item.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card/60 hover:bg-accent/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground truncate">{item.nomeArquivo}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removerItem(item.id);
                      }}
                      className="text-muted-foreground hover:text-red-500 p-0.5"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{item.tamanhoMB} MB</span>
                    <div className="flex items-center gap-1 font-medium">
                      {item.status === "processando" && (
                        <>
                          <Loader2 size={12} className="animate-spin text-purple-500" />
                          <span className="text-purple-500">Transcrevendo...</span>
                        </>
                      )}
                      {item.status === "pendente" && (
                        <>
                          <Clock size={12} className="text-yellow-500" />
                          <span>Na fila</span>
                        </>
                      )}
                      {item.status === "concluido" && (
                        <>
                          <CheckCircle2 size={12} className="text-green-500" />
                          <span className="text-green-600 dark:text-green-400">Pronto</span>
                        </>
                      )}
                      {item.status === "erro" && (
                        <>
                          <XCircle size={12} className="text-red-500" />
                          <span className="text-red-500">Erro</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna 2: Visualizador da Transcrição Ativa */}
          <div className="lg:col-span-2 space-y-3">
            {itemAtivo ? (
              <Cartao className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground truncate">{itemAtivo.nomeArquivo}</h3>
                    <p className="text-xs text-muted-foreground">
                      Status: {itemAtivo.progressoMsg}
                    </p>
                  </div>

                  {itemAtivo.transcricao && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(itemAtivo.transcricao || "");
                          setCopiado(true);
                          setTimeout(() => setCopiado(false), 2000);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground border border-border px-2.5 py-1.5 rounded-lg"
                      >
                        {copiado ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiado ? "Copiado!" : "Copiar"}</span>
                      </button>

                      <Botao
                        variante="neutro"
                        tamanho="pequeno"
                        onClick={() => baixarTranscricao(itemAtivo)}
                        className="flex items-center gap-1"
                      >
                        <Download size={14} />
                        <span>Baixar .MD</span>
                      </Botao>

                      <Botao
                        variante="primario"
                        tamanho="pequeno"
                        disabled={salvandoNota}
                        onClick={() => salvarComoNota(itemAtivo)}
                        className="flex items-center gap-1"
                      >
                        {salvandoNota ? <Loader2 size={14} className="animate-spin" /> : <FileCheck size={14} />}
                        <span>Salvar no App</span>
                      </Botao>
                    </div>
                  )}
                </div>

                {itemAtivo.status === "processando" && (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                    <Loader2 size={32} className="animate-spin text-purple-500" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Transcrevendo áudio em segundo plano...
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Você pode navegar para outras abas. O resultado ficará salvo aqui esperando você baixar.
                      </p>
                    </div>
                  </div>
                )}

                {itemAtivo.status === "erro" && (
                  <Aviso tom="erro">
                    {itemAtivo.erroMsg || "Não foi possível transcrever este arquivo."}
                  </Aviso>
                )}

                {itemAtivo.transcricao && (
                  <textarea
                    readOnly
                    value={itemAtivo.transcricao}
                    rows={16}
                    className="w-full rounded-xl border border-border bg-background p-4 text-xs text-foreground outline-none resize-y font-mono leading-relaxed"
                  />
                )}
              </Cartao>
            ) : (
              <div className="p-12 border border-border rounded-xl text-center text-muted-foreground text-xs">
                Selecione um item da fila para visualizar a transcrição.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
