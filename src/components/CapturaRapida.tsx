import { useEffect, useRef, useState, useMemo } from "react";
import { CheckSquare, FileText, Image, Send, X, Calendar, Folder, Camera, Mic, MicOff, Loader2 } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, cache, invalidarCache } from "@/lib/repo";
import { escreverMarkdown, nomeLivre } from "@/lib/markdown";
import { hojeISO } from "@/lib/utils";
import { useSalvar } from "@/lib/useSalvar";
import { Botao, AreaTexto, Cartao } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { suportaDitadoVoz, iniciarDitadoVoz, type SessaoDitado } from "@/lib/vozCaptura";
import { prepararImagem } from "@/lib/imagem";
import { gravarBinario } from "@/lib/github";
import { arquivoParaBase64, PASTA_IMAGENS } from "@/lib/referencias";

function calcularDataPrazo(tipo: string): string | undefined {
  const d = new Date();
  if (tipo === "hoje") return hojeISO();
  if (tipo === "amanha") {
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (tipo === "segunda") {
    const diaSemana = d.getDay();
    const diasAteSegunda = ((8 - diaSemana) % 7) || 7;
    d.setDate(d.getDate() + diasAteSegunda);
    return d.toISOString().slice(0, 10);
  }
  return undefined;
}

/**
 * Captura rápida: uma caixa, você escreve ou fala, tirou foto, salvou.
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
  const [prazoSelecionado, setPrazoSelecionado] = useState<string>("sem_prazo");
  const [subpastaSelecionada, setSubpastaSelecionada] = useState<string>("");

  // Foto capturada via câmera ou arquivo
  const [fotoCapturada, setFotoCapturada] = useState<{ arquivo: File; preview: string } | null>(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const inputCameraRef = useRef<HTMLInputElement>(null);

  // Ditado de voz
  const [ouvindoVoz, setOuvindoVoz] = useState(false);
  const sessaoVozRef = useRef<SessaoDitado | null>(null);

  // campos que a captura da web descobriu (autor, data, site) e que vão para
  // o frontmatter na hora de salvar
  const [dadosDaCaptura, setDadosDaCaptura] = useState<Record<string, string>>({});
  const area = useRef<HTMLTextAreaElement>(null);
  const [arrastoY, setArrastoY] = useState(0);
  const [toqueInicialY, setToqueInicialY] = useState<number | null>(null);

  const lidarTouchStart = (e: React.TouchEvent) => {
    setToqueInicialY(e.touches[0].clientY);
  };

  const lidarTouchMove = (e: React.TouchEvent) => {
    if (toqueInicialY === null) return;
    const deltaY = e.touches[0].clientY - toqueInicialY;
    if (deltaY > 0) {
      setArrastoY(deltaY);
    }
  };

  const lidarTouchEnd = () => {
    if (arrastoY > 75) {
      aoFechar();
    }
    setArrastoY(0);
    setToqueInicialY(null);
  };

  // Pastas disponíveis baseadas no destino selecionado
  const pastasDisponiveis = useMemo(() => {
    if (!cache?.itens) return [];
    const prefixo = `${destino}/`;
    const conjunto = new Set<string>();
    for (const item of cache.itens) {
      if (item.caminho.startsWith(prefixo)) {
        const resto = item.caminho.slice(prefixo.length);
        const partes = resto.split("/");
        if (partes.length > 1) {
          conjunto.add(partes.slice(0, -1).join("/"));
        }
      }
    }
    return Array.from(conjunto).sort();
  }, [destino]);

  // Limpeza de recursos e reset ao abrir/fechar
  useEffect(() => {
    if (!aberta) {
      if (sessaoVozRef.current) {
        sessaoVozRef.current.parar();
        sessaoVozRef.current = null;
      }
      setOuvindoVoz(false);
      if (fotoCapturada?.preview) {
        URL.revokeObjectURL(fotoCapturada.preview);
      }
      setFotoCapturada(null);
      return;
    }
    setTexto(textoInicial);
    const dest = textoInicial ? adivinharDestino(textoInicial) : "notas";
    setDestino(dest);
    setTocouNoDestino(false);
    setErro("");
    setSalvo(false);
    setSubpastaSelecionada("");
    setPrazoSelecionado("sem_prazo");
    setDadosDaCaptura({});
    setTimeout(() => area.current?.focus(), 50);
  }, [aberta, textoInicial]);

  // enquanto você não escolher à mão, o destino e prazo acompanham o que está escrito
  useEffect(() => {
    if (!tocouNoDestino && texto.trim()) {
      const dest = adivinharDestino(texto);
      setDestino(dest);

      // Detecção inteligente de prazo
      const tNorm = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (/\bhoje\b/.test(tNorm)) setPrazoSelecionado("hoje");
      else if (/\bamanha\b/.test(tNorm)) setPrazoSelecionado("amanha");
      else if (/\bsegunda\b/.test(tNorm)) setPrazoSelecionado("segunda");
    }
  }, [texto, tocouNoDestino]);

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta, aoFechar]);

  // Alternar Ditado de Voz
  function alternarVoz() {
    if (ouvindoVoz) {
      sessaoVozRef.current?.parar();
      sessaoVozRef.current = null;
      setOuvindoVoz(false);
      return;
    }

    setErro("");
    const sessao = iniciarDitadoVoz({
      idioma: "pt-BR",
      aoIniciar: () => setOuvindoVoz(true),
      aoReceberTexto: (transcricao) => {
        setTexto((prev) => {
          const base = prev.trim();
          return base ? `${base} ${transcricao}` : transcricao;
        });
      },
      aoFinalizar: () => {
        setOuvindoVoz(false);
        sessaoVozRef.current = null;
      },
      aoErro: (msg) => {
        setErro(msg);
        setOuvindoVoz(false);
      },
    });

    sessaoVozRef.current = sessao;
  }

  // Foto capturada pela câmera ou galeria
  async function lidarArquivoFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessandoFoto(true);
    setErro("");
    try {
      const preview = URL.createObjectURL(file);
      setFotoCapturada({ arquivo: file, preview });
      setDestino("referencias");
      setTocouNoDestino(true);
      if (!texto.trim()) {
        const nomeFormatado = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTexto(nomeFormatado || "Foto capturada");
      }
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessandoFoto(false);
      if (inputCameraRef.current) inputCameraRef.current.value = "";
    }
  }

  async function salvar() {
    if ((!texto.trim() && !fotoCapturada) || salvando) return;

    const cfg = lerConfig();
    if (!configCompleta(cfg)) {
      setErro("Configure sua conta do GitHub em Ajustes antes de capturar.");
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      const { titulo, corpo } = partir(texto.trim() || (fotoCapturada ? "Foto capturada" : "Sem título"));
      const acervo = await carregarRepo(cfg);
      const pastaDestino = subpastaSelecionada
        ? `${destino}/${subpastaSelecionada}`
        : destino;
      const caminho = nomeLivre(
        pastaDestino,
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

      let linkImagemSalva: string | undefined = undefined;

      // Se houver foto capturada da câmera
      if (fotoCapturada) {
        const prep = await prepararImagem(fotoCapturada.arquivo);
        const base64 = await arquivoParaBase64(prep.arquivo);
        const agora = new Date();
        const carimbo = agora.toISOString().slice(0, 10);
        const rand = Math.random().toString(36).slice(2, 6);
        const nomeArquivoFoto = `${carimbo}-${rand}.webp`;
        const caminhoFoto = `${PASTA_IMAGENS}/${nomeArquivoFoto}`;

        await gravarBinario(cfg, caminhoFoto, base64, `upload foto: ${titulo}`);
        invalidarCache();
        linkImagemSalva = `imagens/${nomeArquivoFoto}`;
      }

      let corpoFinal = corpo;
      if (linkImagemSalva) {
        corpoFinal = corpoFinal ? `![](${linkImagemSalva})\n\n${corpoFinal}` : `![](${linkImagemSalva})`;
      } else if (destino === "referencias" && (ehImagemUrl || (ehUrl && !corpo))) {
        corpoFinal = corpo ? `![](${fonteUrl})\n\n${corpo}` : `![](${fonteUrl})`;
      }

      const prazoFinal = destino === "tarefas" ? calcularDataPrazo(prazoSelecionado) : undefined;

      const conteudo = escreverMarkdown({
        dados: {
          titulo,
          tipo: tipos[destino],
          ...dadosDaCaptura,
          ...(destino === "tarefas" ? { status: "a-fazer", ...(prazoFinal ? { prazo: prazoFinal } : {}) } : {}),
          ...(destino === "notas" ? { atualizado: hojeISO() } : {}),
          ...(destino === "referencias" && (fonteUrl || linkImagemSalva)
            ? { fonte: fonteUrl, imagem: linkImagemSalva || (ehImagemUrl ? fonteUrl : undefined) }
            : {}),
        },
        corpo: corpoFinal,
      });

      await salvarTexto(caminho, conteudo, undefined, `captura: ${titulo}`);

      setSalvo(true);
      setTexto("");
      setFotoCapturada(null);
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
      className="fixed inset-0 z-[600] flex items-end justify-center bg-black/50 p-0 sm:items-start sm:p-4 sm:pt-28 backdrop-blur-xs animate-in fade-in duration-150 overscroll-none select-none sm:select-auto"
      onClick={aoFechar}
    >
      <Cartao
        style={{
          transform: arrastoY > 0 ? `translateY(${arrastoY}px)` : undefined,
          transition: arrastoY === 0 ? "transform 0.2s ease" : "none",
        }}
        className="w-full rounded-t-3xl rounded-b-none p-4 pb-[max(env(safe-area-inset-bottom),16px)] sm:max-w-lg sm:rounded-2xl border-t border-border shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Puxador com gesto de arrasto no mobile */}
        <div
          onTouchStart={lidarTouchStart}
          onTouchMove={lidarTouchMove}
          onTouchEnd={lidarTouchEnd}
          className="w-full pt-1 pb-2 sm:hidden flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 select-none hover:bg-muted-foreground/50 transition-colors" />
        </div>

        <div
          onTouchStart={lidarTouchStart}
          onTouchMove={lidarTouchMove}
          onTouchEnd={lidarTouchEnd}
          className="mb-2.5 flex items-center justify-between touch-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-foreground">Captura rápida</span>
            {ouvindoVoz && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 text-[11px] font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Ouvindo...
              </span>
            )}
          </div>
          <button
            onClick={aoFechar}
            className="-m-1.5 rounded-md p-2 text-muted-foreground hover:bg-accent cursor-pointer transition-colors touch-manipulation"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input Oculto de Câmera Nativa Android / Mobile */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={inputCameraRef}
          onChange={lidarArquivoFoto}
          className="hidden"
          aria-label="Tirar foto com a câmera"
        />

        {/* Pré-visualização de foto anexada */}
        {fotoCapturada && (
          <div className="relative mb-2.5 rounded-xl overflow-hidden border border-border/80 bg-black/5 max-h-40 flex items-center justify-center">
            <img
              src={fotoCapturada.preview}
              alt="Foto capturada"
              className="w-full h-36 object-cover"
            />
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(fotoCapturada.preview);
                setFotoCapturada(null);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90 cursor-pointer shadow-md transition-transform active:scale-95"
              aria-label="Remover foto"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="relative">
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
            placeholder={ouvindoVoz ? "Fale agora, o Klaus está ouvindo..." : "O que passou pela cabeça?"}
            className={cn(
              "min-h-28 resize-none pr-10 text-base sm:text-sm",
              ouvindoVoz && "border-red-500/50 ring-1 ring-red-500/30"
            )}
          />

          {/* Botão de Ditado por Voz dentro do campo */}
          {suportaDitadoVoz() && (
            <button
              type="button"
              onClick={alternarVoz}
              className={cn(
                "absolute right-2.5 bottom-2.5 p-2 rounded-xl transition-all cursor-pointer touch-manipulation",
                ouvindoVoz
                  ? "bg-red-500 text-white shadow-md scale-105 animate-pulse"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/80 active:scale-95"
              )}
              title={ouvindoVoz ? "Parar gravação" : "Falar por voz"}
              aria-label={ouvindoVoz ? "Parar gravação de voz" : "Iniciar gravação de voz"}
            >
              {ouvindoVoz ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>

        {/* Barra de atalhos rápidos e chips contextuais */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border/50 text-xs">
          {destino === "tarefas" && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                <Calendar size={11} /> Prazo:
              </span>
              {[
                { id: "hoje", rotulo: "Hoje" },
                { id: "amanha", rotulo: "Amanhã" },
                { id: "segunda", rotulo: "Segunda" },
                { id: "sem_prazo", rotulo: "Sem prazo" },
              ].map((p) => {
                const ativo = prazoSelecionado === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPrazoSelecionado(ativo ? "sem_prazo" : p.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer touch-manipulation",
                      ativo
                        ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
                        : "bg-secondary/70 text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {p.rotulo}
                  </button>
                );
              })}
            </div>
          )}

          {pastasDisponiveis.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 ml-1">
                <Folder size={11} /> Pasta:
              </span>
              <select
                value={subpastaSelecionada}
                onChange={(e) => setSubpastaSelecionada(e.target.value)}
                className="text-[11px] rounded-md border border-border bg-background px-1.5 py-0.5 text-muted-foreground focus:text-foreground focus:outline-hidden"
              >
                <option value="">(Raiz)</option>
                {pastasDisponiveis.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
          {DESTINOS.map(({ id, rotulo, Icone }) => (
            <button
              key={id}
              onClick={() => {
                setDestino(id);
                setTocouNoDestino(true);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer touch-manipulation",
                destino === id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary text-secondary-foreground hover:bg-accent",
              )}
            >
              <Icone size={14} />
              {rotulo}
            </button>
          ))}

          {/* Botão de Disparo da Câmera Nativa */}
          <button
            type="button"
            onClick={() => inputCameraRef.current?.click()}
            disabled={processandoFoto}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors cursor-pointer touch-manipulation active:scale-95 disabled:opacity-50"
            title="Tirar foto ou escolher imagem"
            aria-label="Tirar foto com a câmera"
          >
            {processandoFoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            <span className="hidden sm:inline">Câmera</span>
          </button>

          <Tooltip conteudo="Baixa a página web ou converte o HTML colado em Markdown limpo">
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
                  setDadosDaCaptura(res.dados);
                  setDestino("notas");
                } catch (e) {
                  setErro(e instanceof Error ? e.message : String(e));
                } finally {
                  setSalvando(false);
                }
              }}
              disabled={salvando || !texto.trim()}
              className="touch-manipulation"
            >
              {salvando ? "Buscando…" : "Web"}
            </Botao>
          </Tooltip>

          <Botao
            tamanho="pequeno"
            onClick={salvar}
            disabled={salvando || (!texto.trim() && !fotoCapturada)}
            className="ml-auto touch-manipulation font-semibold"
          >
            <Send size={14} />
            {salvo ? "Salvo!" : salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </div>

        {erro && <p className="mt-2 text-xs text-destructive">{erro}</p>}

        {/^https?:\/\//i.test(texto.trim()) && (
          <p className="mt-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Antes de capturar um site:</strong>{" "}
            a maioria das páginas recusa o pedido direto do navegador, e aí o
            endereço passa por um serviço público de terceiros para ser baixado.
          </p>
        )}

        <p className="mt-2 text-[11px] sm:text-xs text-muted-foreground">
          Organizar depois. Aqui é só despejar.
        </p>
      </Cartao>
    </div>
  );
}

