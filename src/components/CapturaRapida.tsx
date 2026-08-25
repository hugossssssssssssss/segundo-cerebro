import { useEffect, useRef, useState } from "react";
import { CheckSquare, FileText, Image, Send, X } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo } from "@/lib/repo";
import { escreverMarkdown, nomeLivre } from "@/lib/markdown";
import { hojeISO } from "@/lib/utils";
import { useSalvar } from "@/lib/useSalvar";
import { Botao, AreaTexto, Cartao } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Captura rápida: uma caixa, você escreve, salvou.
 *
 * O atrito de capturar era o problema real — abrir o app, escolher a aba,
 * clicar em Nova, preencher um formulário. Para anotar algo no meio da rua
 * isso é demais, e captura com atrito é captura que não acontece.
 *
 * Abre com ⌘J (ou Ctrl+J) e pelo botão flutuante no celular.
 */

type Destino = "tarefas" | "notas" | "referencias";

const DESTINOS: { id: Destino; rotulo: string; Icone: typeof CheckSquare }[] = [
  { id: "tarefas", rotulo: "Tarefa", Icone: CheckSquare },
  { id: "notas", rotulo: "Nota", Icone: FileText },
  { id: "referencias", rotulo: "Referência", Icone: Image },
];

/**
 * Adivinha o destino pelo jeito do texto.
 *
 * Só um palpite — o seletor fica visível e você troca com um toque. Errar em
 * silêncio seria pior que não adivinhar.
 */
export function adivinharDestino(texto: string): Destino {
  const bruto = texto.trim();
  if (/^https?:\/\//i.test(bruto)) return "referencias";

  // Sem acento antes de comparar: `\b` em regex JavaScript é ASCII, então
  // `\bamanhã\b` nunca casa — a palavra termina em "ã", que não conta como
  // caractere de palavra. Normalizar evita essa classe inteira de falha.
  const t = bruto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const verbos =
    /^(ligar|comprar|enviar|mandar|fazer|revisar|terminar|marcar|agendar|responder|pagar|confirmar|entregar|ajustar|corrigir|falar com|lembrar de)\b/;
  if (verbos.test(t)) return "tarefas";

  const prazos =
    /\b(ate|amanha|hoje|segunda|terca|quarta|quinta|sexta|sabado|domingo)\b/;
  if (prazos.test(t) && t.length < 120) return "tarefas";

  return "notas";
}

/** Primeira linha vira o título; o resto vira corpo. */
function partir(texto: string): { titulo: string; corpo: string } {
  const linhas = texto.trim().split("\n");
  const primeira = linhas[0].trim();
  const titulo = primeira.length > 80 ? `${primeira.slice(0, 77)}…` : primeira;
  return { titulo: titulo || "Sem título", corpo: linhas.slice(1).join("\n").trim() };
}

export function CapturaRapida({
  aberta,
  aoFechar,
  textoInicial = "",
}: {
  aberta: boolean;
  aoFechar: () => void;
  /** Preenchido quando vem do compartilhamento do Android */
  textoInicial?: string;
}) {
  const cfg = lerConfig();
  const { salvarTexto } = useSalvar(cfg);
  const [texto, setTexto] = useState(textoInicial);
  const [destino, setDestino] = useState<Destino>("notas");
  const [tocouNoDestino, setTocouNoDestino] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);
  // campos que a captura da web descobriu (autor, data, site) e que vão para
  // o frontmatter na hora de salvar
  const [dadosDaCaptura, setDadosDaCaptura] = useState<Record<string, string>>({});
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!aberta) return;
    setTexto(textoInicial);
    setDestino(textoInicial ? adivinharDestino(textoInicial) : "notas");
    setTocouNoDestino(false);
    setErro("");
    setSalvo(false);
    // sem isto, o autor da captura anterior grudava na próxima nota
    setDadosDaCaptura({});
    setTimeout(() => area.current?.focus(), 50);
  }, [aberta, textoInicial]);

  // enquanto você não escolher à mão, o destino acompanha o que está escrito
  useEffect(() => {
    if (!tocouNoDestino && texto.trim()) setDestino(adivinharDestino(texto));
  }, [texto, tocouNoDestino]);

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta, aoFechar]);

  async function salvar() {
    if (!texto.trim() || salvando) return;

    const cfg = lerConfig();
    if (!configCompleta(cfg)) {
      setErro("Configure sua conta do GitHub em Ajustes antes de capturar.");
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      const { titulo, corpo } = partir(texto);
      const acervo = await carregarRepo(cfg);
      const caminho = nomeLivre(
        destino,
        titulo,
        acervo.map((i) => i.caminho),
      );

      const tipos: Record<Destino, string> = {
        tarefas: "tarefa",
        notas: "nota",
        referencias: "referencia",
      };

      const ehUrl = /^https?:\/\//i.test(texto.trim());
      const fonteUrl = ehUrl ? texto.trim().split("\n")[0] : undefined;
      const ehImagemUrl = fonteUrl ? /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(fonteUrl) : false;

      const corpoFinal =
        destino === "referencias" && (ehImagemUrl || (ehUrl && !corpo))
          ? (corpo ? `![](${fonteUrl})\n\n${corpo}` : `![](${fonteUrl})`)
          : corpo;

      const conteudo = escreverMarkdown({
        dados: {
          titulo,
          tipo: tipos[destino],
          // o que a captura da web descobriu (autor, publicado, site, fonte)
          // vem primeiro, para os campos abaixo ainda poderem ter a palavra
          // final sobre título e tipo
          ...dadosDaCaptura,
          ...(destino === "tarefas" ? { status: "a-fazer" } : {}),
          ...(destino === "notas" ? { atualizado: hojeISO() } : {}),
          ...(destino === "referencias" && fonteUrl
            ? { fonte: fonteUrl, ...(ehImagemUrl ? { imagem: fonteUrl } : {}) }
            : {}),
        },
        corpo: corpoFinal,
      });

      await salvarTexto(caminho, conteudo, undefined, `captura: ${titulo}`);

      setSalvo(true);
      setTexto("");
      // fecha sozinho, para não interromper o que você estava fazendo
      setTimeout(aoFechar, 700);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  if (!aberta) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-end justify-center bg-black/50 p-0 sm:items-start sm:p-4 sm:pt-28"
      onClick={aoFechar}
    >
      <Cartao
        className="w-full rounded-b-none p-4 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Captura rápida</span>
          <button
            onClick={aoFechar}
            className="-m-1.5 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <AreaTexto
          ref={area}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              salvar();
            }
          }}
          placeholder="O que passou pela cabeça?"
          className="min-h-28 resize-none"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {DESTINOS.map(({ id, rotulo, Icone }) => (
            <button
              key={id}
              onClick={() => {
                setDestino(id);
                setTocouNoDestino(true);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                destino === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent",
              )}
            >
              <Icone size={14} />
              {rotulo}
            </button>
          ))}

          <Botao
            tamanho="pequeno"
            variante="neutro"
            onClick={async () => {
              const entrada = texto.trim();
              if (!entrada || salvando) return;
              setSalvando(true);
              setErro("");
              try {
                const { capturarUrlWeb, converterHtmlParaMarkdown } = await import("@/lib/clipper");
                let res;
                if (/^https?:\/\//i.test(entrada)) {
                  res = await capturarUrlWeb(entrada);
                } else {
                  res = converterHtmlParaMarkdown(entrada);
                }
                setTexto(`${res.titulo}\n\n${res.markdown}`);
                // autor, data e site vão para o frontmatter, não para o meio
                // do texto: assim a busca e as outras telas os enxergam como
                // campos, e não como uma linha solta que ninguém lê
                setDadosDaCaptura(res.dados);
                setDestino("notas");
              } catch (e) {
                setErro(e instanceof Error ? e.message : String(e));
              } finally {
                setSalvando(false);
              }
            }}
            disabled={salvando || !texto.trim()}
            title="Baixa a página web ou converte o HTML colado em Markdown limpo"
          >
            {salvando ? "Buscando site…" : "Capturar Web"}
          </Botao>

          <Botao
            tamanho="pequeno"
            onClick={salvar}
            disabled={salvando || !texto.trim()}
            className="ml-auto"
          >
            <Send size={14} />
            {salvo ? "Salvo!" : salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </div>

        {erro && <p className="mt-2 text-xs text-destructive">{erro}</p>}

        {/*
          O aviso aparece assim que o texto vira uma URL, e não depois de
          clicar: a informação só serve ANTES da decisão. O comentário sobre
          isso já existia dentro de `capturarUrlWeb`, mas comentário fica no
          código e quem está capturando está aqui.
        */}
        {/^https?:\/\//i.test(texto.trim()) && (
          <p className="mt-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Antes de capturar um site:</strong>{" "}
            a maioria das páginas recusa o pedido direto do navegador, e aí o
            endereço passa por um serviço público de terceiros para ser baixado.
            Para um artigo público, tudo bem. Para uma página do trabalho ou
            atrás de login, copie e cole o texto aqui em vez do endereço — assim
            nada sai do seu aparelho.
          </p>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          Organizar depois. Aqui é só despejar.
        </p>
      </Cartao>
    </div>
  );
}
