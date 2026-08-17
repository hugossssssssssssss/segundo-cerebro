import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Sparkles, Trash2, Copy, Check, RefreshCw, MessageSquare } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, type ItemRepo } from "@/lib/repo";
import { conversar, PROMPTS, type Mensagem, type PromptSalvo } from "@/lib/gemini";
import { acoesDeChamadas, executar, type Acao } from "@/lib/acoes";
import { CartaoAcao } from "@/components/CartaoAcao";
import { Botao, Cartao, AreaTexto, Aviso, Vazio, Selo } from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { cn } from "@/lib/utils";

import { buscar } from "@/lib/busca";

/** Uma fala da conversa, com as ações que a IA propôs junto dela. */
type Fala = Mensagem & { acoes?: Acao[] };

export default function Chat() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const [falas, setFalas] = useState<Fala[]>([]);
  const [entrada, setEntrada] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState("");
  const [acervo, setAcervo] = useState<ItemRepo[]>([]);
  const [carregandoAcervo, setCarregandoAcervo] = useState(false);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set());

  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [falas, pensando]);

  useEffect(() => {
    const aoAtualizar = () => setAcervo([]);
    window.addEventListener("acervo-atualizado", aoAtualizar);
    return () => window.removeEventListener("acervo-atualizado", aoAtualizar);
  }, []);

  /**
   * Carrega o acervo uma vez e mantém.
   *
   * Antes o conteúdo só ia junto nos prompts prontos: qualquer pergunta de
   * seguimento saía sem contexto nenhum, e a IA parecia esquecer no meio da
   * conversa o que tinha acabado de discutir.
   */
  async function garantirAcervo(): Promise<ItemRepo[]> {
    if (acervo.length > 0) return acervo;
    setCarregandoAcervo(true);
    try {
      const itens = await carregarRepo(cfg);
      setAcervo(itens);
      return itens;
    } finally {
      setCarregandoAcervo(false);
    }
  }

  function montarContextoTexto(itens: ItemRepo[], consulta?: string): string {
    const TETO = 120_000;
    let total = 0;
    const partes: string[] = [];

    // 1. Busca por itens relevantes baseados na consulta do usuário
    let itensOrdenados: ItemRepo[] = [...itens];
    if (consulta && consulta.trim().length >= 2) {
      const resultadosBusca = buscar(itens, consulta);
      const caminhosRelevantes = new Set(resultadosBusca.map((r) => r.caminho));
      const relevantes = itens.filter((i) => caminhosRelevantes.has(i.caminho));
      const outros = itens.filter((i) => !caminhosRelevantes.has(i.caminho));
      itensOrdenados = [...relevantes, ...outros];
    }

    for (const i of itensOrdenados) {
      const bloco = `\n### ${i.caminho}\n${i.texto}`;
      if (total + bloco.length > TETO) {
        partes.push(
          `\n... (contexto cortado em ${TETO} caracteres para não exceder o limite do modelo)`,
        );
        break;
      }
      partes.push(bloco);
      total += bloco.length;
    }
    return partes.join("\n");
  }

  async function enviar(texto: string) {
    if (!texto.trim() || pensando) return;

    const novas: Fala[] = [...falas, { papel: "user", texto }];
    setFalas(novas);
    setEntrada("");
    setPensando(true);
    setErro("");

    try {
      const itens = await garantirAcervo();
      const { texto: limpo, chamadas } = await conversar(
        cfg,
        novas.map(({ papel, texto }) => ({ papel, texto })),
        montarContextoTexto(itens, texto),
      );

      const acoes = acoesDeChamadas(chamadas);
      setFalas([
        ...novas,
        { papel: "model", texto: limpo || "(sem texto)", acoes },
      ]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setFalas(novas); // mantém o que você escreveu
    } finally {
      setPensando(false);
    }
  }

  function usarPrompt(p: PromptSalvo) {
    // prompt que espera você colar algo apenas preenche a caixa
    if (p.precisa.length === 0) setEntrada(p.texto);
    else enviar(p.texto);
  }

  async function aplicar(acao: Acao) {
    const itens = await garantirAcervo();
    await executar(cfg, acao, itens);
    // o acervo mudou: força recarga na próxima pergunta
    setAcervo([]);
  }

  async function copiar(texto: string, i: number) {
    await navigator.clipboard.writeText(texto);
    setCopiado(i);
    setTimeout(() => setCopiado(null), 1500);
  }

  /* ------------------------------------------------------- pré-requisitos */

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
        descricao="O chat lê suas notas, tarefas e metas e responde sobre elas. Para isso precisa de uma chave do Google AI Studio, que tem plano gratuito."
        acao={
          <Link to="/config">
            <Botao>Configurar a chave</Botao>
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Conversar com a IA"
        descricao="A IA lê seus documentos e pode criar ou editar registros com sua aprovação."
        icone={<MessageSquare size={20} />}
        corIcone="bg-purple-500/10 text-purple-600 dark:text-purple-400"
        acoes={
          falas.length > 0 ? (
            <Botao
              variante="fantasma"
              tamanho="pequeno"
              onClick={() => {
                setFalas([]);
                setErro("");
                setDescartadas(new Set());
              }}
            >
              <Trash2 size={15} />
              Limpar Conversa
            </Botao>
          ) : undefined
        }
      />

      {falas.length === 0 && (
        <>
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

          <Aviso>
            Você também pode pedir direto: <em>“cria uma tarefa para revisar a
            proposta até sexta”</em> ou <em>“transforma isso em três tarefas”</em>.
            Ele monta a proposta e você aprova com um clique.
          </Aviso>
        </>
      )}

      {falas.length > 0 && (
        <div className="space-y-4">
          {falas.map((m, i) => (
            <div key={i} className="space-y-2">
              <div
                className={cn(
                  "flex",
                  m.papel === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    m.papel === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card",
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {m.texto}
                  </p>
                  {m.papel === "model" && (
                    // botão sempre visível: no Android não existe hover, e
                    // antes ele só aparecia ao passar o mouse — inalcançável
                    <button
                      onClick={() => copiar(m.texto, i)}
                      className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {copiado === i ? (
                        <>
                          <Check size={13} className="text-[var(--success)]" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          Copiar
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* ações propostas junto desta resposta */}
              {m.acoes
                ?.filter((_, n) => !descartadas.has(`${i}-${n}`))
                .map((a, n) => (
                  <CartaoAcao
                    key={`${i}-${n}`}
                    acao={a}
                    aoAprovar={() => aplicar(a)}
                    aoDescartar={() =>
                      setDescartadas((s) => new Set(s).add(`${i}-${n}`))
                    }
                  />
                ))}
            </div>
          ))}

          {pensando && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
              {carregandoAcervo ? "Lendo suas coisas…" : "Pensando…"}
            </div>
          )}
          <div ref={fim} />
        </div>
      )}

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <Cartao className="sticky bottom-20 sm:bottom-4 p-3">
        <AreaTexto
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => {
            // Enter envia no computador; no celular sempre quebra linha
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              matchMedia("(min-width: 640px)").matches
            ) {
              e.preventDefault();
              enviar(entrada);
            }
          }}
          placeholder="Pergunte, cole uma transcrição, ou peça para criar algo…"
          className="min-h-20 resize-none border-0 bg-transparent focus-visible:ring-0"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Selo>{cfg.geminiModel}</Selo>
            {acervo.length > 0 && (
              <button
                onClick={() => setAcervo([])}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                title="Reler seus arquivos"
              >
                <RefreshCw size={12} />
                {acervo.length} arquivos lidos
              </button>
            )}
          </div>
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
