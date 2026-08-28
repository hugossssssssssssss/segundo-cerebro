import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  Send,
  Copy,
  Check,
  CornerDownLeft,
  MessageSquare,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { perguntarIARapida, type MensagemIARapida } from "@/lib/iaRapida";
import { cn } from "@/lib/utils";

interface ModalIADocumentoProps {
  aberto: boolean;
  aoFechar: () => void;
  aoColarNoDocumento: (texto: string) => void;
}

export function ModalIADocumento({
  aberto,
  aoFechar,
  aoColarNoDocumento,
}: ModalIADocumentoProps) {
  const [prompt, setPrompt] = useState("");
  const [resposta, setResposta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [modoPergunta, setModoPergunta] = useState(true);
  const [historico, setHistorico] = useState<MensagemIARapida[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const abertoEmRef = useRef<number>(0);
  const mouseDownOnBackdropRef = useRef<boolean>(false);

  // Reseta ou foca ao abrir
  useEffect(() => {
    if (aberto) {
      abertoEmRef.current = Date.now();
      mouseDownOnBackdropRef.current = false;
      setPrompt("");
      setResposta("");
      setCarregando(false);
      setErro("");
      setCopiado(false);
      setModoPergunta(true);
      setHistorico([]);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [aberto]);

  // Foco no input ao voltar para o modo pergunta
  useEffect(() => {
    if (aberto && modoPergunta) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [aberto, modoPergunta]);

  if (!aberto || typeof document === "undefined") return null;

  const enviarPergunta = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textoLimpo = prompt.trim();
    if (!textoLimpo || carregando) return;

    setCarregando(true);
    setErro("");

    try {
      const res = await perguntarIARapida(textoLimpo, historico);
      setResposta(res);
      setHistorico((antigo) => [
        ...antigo,
        { papel: "user", texto: textoLimpo },
        { papel: "model", texto: res },
      ]);
      setModoPergunta(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao consultar a IA.");
    } finally {
      setCarregando(false);
    }
  };

  const lidarCopiar = async () => {
    if (!resposta) return;
    try {
      await navigator.clipboard.writeText(resposta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback
    }
  };

  const lidarColar = () => {
    if (!resposta) return;
    aoColarNoDocumento(resposta);
    aoFechar();
  };

  const lidarResponder = () => {
    setPrompt("");
    setModoPergunta(true);
  };

  const lidarExcluir = () => {
    setPrompt("");
    setResposta("");
    setHistorico([]);
    aoFechar();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100"
      onMouseDown={(e) => {
        mouseDownOnBackdropRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Ignora cliques residuais nos primeiros 250ms após a abertura
        if (Date.now() - abertoEmRef.current < 250) return;
        if (e.target === e.currentTarget && mouseDownOnBackdropRef.current) {
          lidarExcluir();
        }
        mouseDownOnBackdropRef.current = false;
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") lidarExcluir();
      }}
    >
      <div
        className={cn(
          "w-full max-w-md bg-card border border-border/80 shadow-2xl rounded-2xl p-3.5 transition-all duration-150 backdrop-blur-md",
          "animate-in zoom-in-95 duration-100",
        )}
      >
        {/* Cabeçalho Minimalista */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles size={14} className="text-primary animate-pulse" />
            <span>Inteligência Artificial</span>
          </div>

          <button
            type="button"
            onClick={lidarExcluir}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X size={14} />
          </button>
        </div>

        {/* 1. Modo de Pergunta / Input */}
        {modoPergunta ? (
          <form onSubmit={enviarPergunta} className="space-y-2">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Pergunte algo, peça uma conta, correção..."
                disabled={carregando}
                className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!prompt.trim() || carregando}
                className="absolute right-1.5 p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-opacity cursor-pointer"
                title="Enviar (Enter)"
              >
                {carregando ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
              </button>
            </div>

            {erro && (
              <p className="text-[11px] text-destructive leading-tight px-1">
                {erro}
              </p>
            )}

            <p className="text-[10px] text-muted-foreground/70 px-1">
              Dica: você pode fazer contas como <span className="font-mono">15% de 850</span> ou <span className="font-mono">25 x 4</span>, correções e perguntas rápidas.
            </p>
          </form>
        ) : (
          /* 2. Modo de Resposta com os 4 Ícones Solicitados */
          <div className="space-y-3">
            <div className="max-h-60 overflow-y-auto p-2.5 rounded-xl bg-accent/40 border border-border/40 text-xs text-foreground leading-relaxed whitespace-pre-wrap selection:bg-primary/20">
              {resposta}
            </div>

            {/* Barra de 4 Ações: Copiar, Colar no Documento, Responder e Excluir */}
            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <span className="text-[10px] text-muted-foreground">
                Ações da resposta:
              </span>

              <div className="flex items-center gap-1">
                {/* 1. Copiar */}
                <Tooltip conteudo={copiado ? "Copiado!" : "Copiar resposta"} posicao="top">
                  <button
                    type="button"
                    onClick={lidarCopiar}
                    className="flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                    aria-label="Copiar resposta"
                  >
                    {copiado ? (
                      <Check size={14} className="text-emerald-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </Tooltip>

                {/* 2. Colar no Documento */}
                <Tooltip conteudo="Colar no documento onde está o cursor" posicao="top">
                  <button
                    type="button"
                    onClick={lidarColar}
                    className="flex items-center justify-center h-7 w-7 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    aria-label="Colar no documento"
                  >
                    <CornerDownLeft size={14} />
                  </button>
                </Tooltip>

                {/* 3. Responder / Continuar Chat */}
                <Tooltip conteudo="Responder (continuar conversa)" posicao="top">
                  <button
                    type="button"
                    onClick={lidarResponder}
                    className="flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                    aria-label="Responder"
                  >
                    <MessageSquare size={14} />
                  </button>
                </Tooltip>

                {/* 4. Excluir / Fechar sem guardar nada */}
                <Tooltip conteudo="Excluir (não salvar nada)" posicao="top">
                  <button
                    type="button"
                    onClick={lidarExcluir}
                    className="flex items-center justify-center h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    aria-label="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
