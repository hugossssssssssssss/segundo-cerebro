import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Sparkles, Trash2, Copy, Check } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { montarContexto } from "@/lib/github";
import { conversar, PROMPTS, type Mensagem, type PromptSalvo } from "@/lib/gemini";
import { Botao, Cartao, AreaTexto, Aviso, Vazio } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function Chat() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [entrada, setEntrada] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState("");
  const [statusContexto, setStatusContexto] = useState("");
  const [copiado, setCopiado] = useState<number | null>(null);

  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, pensando]);

  async function enviar(texto: string, pastas: string[] = []) {
    if (!texto.trim() || pensando) return;

    const novas: Mensagem[] = [...mensagens, { papel: "user", texto }];
    setMensagens(novas);
    setEntrada("");
    setPensando(true);
    setErro("");

    try {
      let contexto: string | undefined;
      if (pastas.length) {
        setStatusContexto("Lendo seus arquivos…");
        const r = await montarContexto(cfg, pastas);
        contexto = r.texto;
        setStatusContexto(
          r.arquivos === 0
            ? "Nenhum arquivo encontrado nessas pastas ainda."
            : `Li ${r.arquivos} arquivo${r.arquivos > 1 ? "s" : ""}${r.cortou ? " (parcial: muito conteúdo)" : ""}.`,
        );
      }

      const resposta = await conversar(cfg, novas, contexto);
      setMensagens([...novas, { papel: "model", texto: resposta }]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setMensagens(novas); // mantém o que você escreveu
    } finally {
      setPensando(false);
      setStatusContexto("");
    }
  }

  function usarPrompt(p: PromptSalvo) {
    if (p.precisa.length === 0) {
      // Prompt que espera você colar algo: só preenche a caixa
      setEntrada(p.texto);
      return;
    }
    enviar(p.texto, p.precisa);
  }

  async function copiar(texto: string, i: number) {
    await navigator.clipboard.writeText(texto);
    setCopiado(i);
    setTimeout(() => setCopiado(null), 1500);
  }

  if (!pronto) {
    return (
      <Vazio
        titulo="Falta conectar sua conta"
        descricao="Preencha sua conta do GitHub e o token na aba de Ajustes."
        acao={
          <Link to="/config">
            <Botao>Ir para Ajustes</Botao>
          </Link>
        }
      />
    );
  }

  if (!cfg.geminiKey) {
    return (
      <Vazio
        titulo="Falta a chave do Gemini"
        descricao="O chat conversa com suas notas, tarefas e metas. Para isso precisa de uma chave do Google AI Studio, que tem plano gratuito."
        acao={
          <Link to="/config">
            <Botao>Configurar a chave</Botao>
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conversar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ele lê o que você escreveu e responde sobre isso.
          </p>
        </div>
        {mensagens.length > 0 && (
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            onClick={() => {
              setMensagens([]);
              setErro("");
            }}
          >
            <Trash2 size={15} />
            Limpar
          </Botao>
        )}
      </div>

      {/* atalhos */}
      {mensagens.length === 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {PROMPTS.map((p) => (
            <button
              key={p.id}
              onClick={() => usarPrompt(p)}
              className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-primary" />
                <span className="font-medium">{p.nome}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.descricao}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* conversa */}
      {mensagens.length > 0 && (
        <div className="space-y-4">
          {mensagens.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.papel === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "group relative max-w-[85%] rounded-2xl px-4 py-3",
                  m.papel === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card",
                )}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {m.texto}
                </p>
                {m.papel === "model" && (
                  <button
                    onClick={() => copiar(m.texto, i)}
                    className="absolute -right-1 -top-1 rounded-md border border-border bg-card p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                    title="Copiar"
                  >
                    {copiado === i ? (
                      <Check size={13} className="text-[var(--success)]" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {pensando && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
              {statusContexto || "Pensando…"}
            </div>
          )}
          <div ref={fim} />
        </div>
      )}

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {/* caixa de envio */}
      <Cartao className="sticky bottom-20 sm:bottom-4 p-3">
        <AreaTexto
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => {
            // Enter envia; Shift+Enter quebra linha. No celular sempre quebra.
            if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 640) {
              e.preventDefault();
              enviar(entrada);
            }
          }}
          placeholder="Pergunte sobre suas notas, cole uma transcrição de reunião…"
          className="min-h-20 resize-none border-0 bg-transparent focus-visible:ring-0"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {cfg.geminiModel}
          </span>
          <Botao
            tamanho="pequeno"
            onClick={() => enviar(entrada)}
            disabled={pensando || !entrada.trim()}
          >
            <Send size={15} />
            Enviar
          </Botao>
        </div>
      </Cartao>
    </div>
  );
}
