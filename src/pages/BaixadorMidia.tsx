import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download,
  Video,
  Music,
  Copy,
  Check,
  Trash2,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  Play,
  Volume2,
  Image as ImageIcon,
  History,
  Settings2,
  CheckCircle2,
  Layers,
  FileVideo,
} from "lucide-react";
import { Botao, Cartao, Aviso } from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  type PlataformaMidia,
  type QualidadeVideo,
  type FormatoAudio,
  type ModoDownload,
  type RespostaDownloadSucesso,
  type ItemHistoricoDownload,
  type StreamDisponivel,
  detectarPlataforma,
  processarDownloadMidia,
  listarHistoricoDownloads,
  adicionarAoHistoricoDownload,
  removerDoHistoricoDownload,
  limparHistoricoDownloads,
  obterInstanciaCobalt,
  salvarInstanciaCobalt,
  INSTANCIAS_COBALT_PADRAO,
} from "@/lib/baixador";
import { lerConfig, configCompleta } from "@/lib/settings";
import { gravar } from "@/lib/github";
import { invalidarCache } from "@/lib/repo";
import { nomeLivre, escreverMarkdown } from "@/lib/markdown";

interface AbaFerramenta {
  id: PlataformaMidia;
  titulo: string;
  subtitulo: string;
  icone: any;
  corBadge: string;
  placeholder: string;
}

const ABAS_PLATAFORMAS: AbaFerramenta[] = [
  {
    id: "universal",
    titulo: "Universal",
    subtitulo: "Cole qualquer link e detectamos a rede",
    icone: Sparkles,
    corBadge: "bg-primary/10 text-primary border-primary/20",
    placeholder: "Cole qualquer link do YouTube, Instagram, TikTok, X, Pinterest...",
  },
  {
    id: "youtube",
    titulo: "YouTube",
    subtitulo: "Vídeos em HD/4K ou extração de MP3",
    icone: Video,
    corBadge: "bg-red-500/10 text-red-500 border-red-500/20",
    placeholder: "https://www.youtube.com/watch?v=... ou https://youtu.be/...",
  },
  {
    id: "instagram",
    titulo: "Instagram",
    subtitulo: "Reels, posts em vídeo e fotos",
    icone: ImageIcon,
    corBadge: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    placeholder: "https://www.instagram.com/reel/... ou /p/...",
  },
  {
    id: "tiktok",
    titulo: "TikTok",
    subtitulo: "Vídeos sem marca d'água e áudio",
    icone: Play,
    corBadge: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    placeholder: "https://www.tiktok.com/@usuario/video/... ou https://vm.tiktok.com/...",
  },
  {
    id: "twitter",
    titulo: "X / Twitter",
    subtitulo: "Vídeos e GIFs em qualidade máxima",
    icone: LinkIcon,
    corBadge: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    placeholder: "https://x.com/usuario/status/... ou https://twitter.com/...",
  },
  {
    id: "facebook",
    titulo: "Facebook",
    subtitulo: "Vídeos e Reels públicos do Facebook",
    icone: Layers,
    corBadge: "bg-blue-600/10 text-blue-600 border-blue-600/20",
    placeholder: "https://www.facebook.com/watch/?v=... ou https://fb.watch/...",
  },
  {
    id: "pinterest",
    titulo: "Pinterest",
    subtitulo: "Vídeos de referências e inspirações",
    icone: ImageIcon,
    corBadge: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    placeholder: "https://www.pinterest.com/pin/... ou https://pin.it/...",
  },
  {
    id: "audio",
    titulo: "Extrair MP3",
    subtitulo: "Transforme qualquer vídeo em áudio MP3",
    icone: Volume2,
    corBadge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    placeholder: "Cole o link de qualquer vídeo ou música para extrair o áudio...",
  },
];

export default function BaixadorMidia() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlParam = searchParams.get("url") || "";
  const ferramentaParam = (searchParams.get("ferramenta") || "universal") as PlataformaMidia;

  const [abaAtiva, setAbaAtiva] = useState<PlataformaMidia>(() => {
    return ABAS_PLATAFORMAS.some((a) => a.id === ferramentaParam) ? ferramentaParam : "universal";
  });

  const [urlInput, setUrlInput] = useState(urlParam);
  const [processando, setProcessando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [qualidadeVideo, setQualidadeVideo] = useState<QualidadeVideo>("1080");
  const [formatoAudio, setFormatoAudio] = useState<FormatoAudio>("mp3");
  const [modoDownload, setModoDownload] = useState<ModoDownload>("auto");
  const [resultado, setResultado] = useState<RespostaDownloadSucesso | null>(null);
  const [streamSelecionada, setStreamSelecionada] = useState<StreamDisponivel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [detalheErro, setDetalheErro] = useState<string | null>(null);

  const [plataformaDetectada, setPlataformaDetectada] = useState<PlataformaMidia>("universal");

  // Instância e Configurações
  const [mostrarConfigInstancia, setMostrarConfigInstancia] = useState(false);
  const [instanciaAtual, setInstanciaAtual] = useState(obterInstanciaCobalt);
  const [instanciaInput, setInstanciaInput] = useState(obterInstanciaCobalt);

  // Histórico
  const [historico, setHistorico] = useState<ItemHistoricoDownload[]>([]);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [salvandoKlaus, setSalvandoKlaus] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistorico(listarHistoricoDownloads());
  }, []);

  useEffect(() => {
    if (ferramentaParam && ABAS_PLATAFORMAS.some((a) => a.id === ferramentaParam)) {
      setAbaAtiva(ferramentaParam);
    }
  }, [ferramentaParam]);

  useEffect(() => {
    if (urlParam && urlParam !== urlInput) {
      setUrlInput(urlParam);
      setPlataformaDetectada(detectarPlataforma(urlParam));
    }
  }, [urlParam]);

  const lidarMudancaUrl = (valor: string) => {
    setUrlInput(valor);
    setErro(null);
    setResultado(null);
    setStreamSelecionada(null);
    setPlataformaDetectada(detectarPlataforma(valor));
  };

  const colarDaAreaTransferencia = async () => {
    try {
      const texto = await navigator.clipboard.readText();
      if (texto && texto.startsWith("http")) {
        lidarMudancaUrl(texto.trim());
        toast("Link colado com sucesso!", { tipo: "info" });
      } else {
        toast("Nenhum link encontrado na área de transferência.", { tipo: "erro" });
      }
    } catch {
      toast("Não foi possível acessar a área de transferência.", { tipo: "erro" });
    }
  };

  const executarDownload = async (urlCustom?: string) => {
    const alvo = (urlCustom || urlInput).trim();
    if (!alvo) {
      setErro("Por favor, informe a URL do vídeo ou áudio para baixar.");
      return;
    }

    setProcessando(true);
    setErro(null);
    setDetalheErro(null);
    setResultado(null);
    setStreamSelecionada(null);

    const modoEfetivo: ModoDownload = abaAtiva === "audio" ? "audio" : modoDownload;

    try {
      const res = await processarDownloadMidia({
        url: alvo,
        qualidadeVideo,
        formatoAudio,
        modo: modoEfetivo,
        instanciaPersonalizada: instanciaAtual,
      });

      if (res.sucesso) {
        setResultado(res);
        if (res.streamsDisponiveis && res.streamsDisponiveis.length > 0) {
          setStreamSelecionada(res.streamsDisponiveis[0]);
        }
        toast("Mídia localizada com sucesso!", { tipo: "sucesso" });

        // Salva no histórico
        if (res.urlDownload) {
          const itemSalvo = adicionarAoHistoricoDownload({
            plataforma: res.plataforma,
            urlOriginal: res.urlOriginal,
            urlDownload: res.urlDownload,
            nomeArquivo: res.nomeArquivo || "download.mp4",
            tipo: modoEfetivo === "audio" ? "audio" : "video",
            titulo: res.titulo || res.nomeArquivo,
            thumbnail: res.thumbnail,
          });
          setHistorico((prev) => [itemSalvo, ...prev.filter((i) => i.id !== itemSalvo.id)]);
        }
      } else {
        setErro(res.erro);
        setDetalheErro(res.detalhe || null);
      }
    } catch (e: any) {
      setErro("Falha inesperada ao processar o download.");
      setDetalheErro(e?.message || null);
    } finally {
      setProcessando(false);
    }
  };

  const copiarLinkDownload = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiadoId(id);
    toast("Link copiado para a área de transferência!", { tipo: "sucesso" });
    setTimeout(() => setCopiadoId(null), 2500);
  };

  /**
   * Executa o download 100% nativo no navegador do usuário sem abrir abas externas
   */
  const baixarNativo = async (url: string, nomeArquivo?: string) => {
    setBaixando(true);
    toast("Iniciando download nativo no seu dispositivo...", { tipo: "info" });

    try {
      // Tenta baixar via fetch Blob
      const res = await fetch(url);
      if (!res.ok) throw new Error("Bloqueio CORS na URL direta");

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = nomeArquivo || `klaus_download_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
      toast("Download concluído com sucesso!", { tipo: "sucesso" });
    } catch {
      // Fallback sem _blank (não abre aba nova, dispara no próprio navegador)
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo || `klaus_download_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast("Download disparado no navegador!", { tipo: "sucesso" });
    } finally {
      setBaixando(false);
    }
  };

  const salvarComoReferenciaKlaus = async (
    tituloOriginal?: string,
    urlOrig?: string,
    urlMidia?: string,
    plat?: PlataformaMidia
  ) => {
    const cfg = lerConfig();
    if (!configCompleta(cfg)) {
      toast("Configure seu GitHub em Ajustes para salvar referências.", { tipo: "erro" });
      return;
    }

    const plataformaFinal = plat || plataformaDetectada || "midia";
    const alvoUrl = urlOrig || urlInput;

    setSalvandoKlaus(true);
    try {
      const tituloReferencia = `Vídeo ${plataformaFinal.toUpperCase()} - ${tituloOriginal || new Date().toLocaleDateString("pt-BR")}`;
      const nomeBase = nomeLivre("referencias", tituloReferencia, []);
      
      const frontmatter = {
        titulo: tituloReferencia,
        data: new Date().toISOString().split("T")[0],
        tags: ["video", plataformaFinal, "baixador"],
        url_original: alvoUrl,
        url_midia: urlMidia || "",
      };

      const corpo = `## Referência de Mídia\n\n- **Origem:** [Acessar Link Original](${alvoUrl})\n- **Rede:** ${plataformaFinal.toUpperCase()}\n- **Salvo em:** ${new Date().toLocaleString("pt-BR")}\n\n> Salvo pelo Baixador de Mídia do Klaus.\n`;

      const markdownCompleto = escreverMarkdown({ dados: frontmatter, corpo });
      await gravar(cfg, nomeBase, markdownCompleto, `feat(referencia): video ${plataformaFinal}`);
      invalidarCache();
      toast("Referência criada com sucesso no Klaus!", { tipo: "sucesso" });
    } catch (e: any) {
      toast(`Erro ao salvar no Klaus: ${e.message}`, { tipo: "erro" });
    } finally {
      setSalvandoKlaus(false);
    }
  };

  const salvarNovaInstancia = () => {
    salvarInstanciaCobalt(instanciaInput);
    setInstanciaAtual(obterInstanciaCobalt());
    setMostrarConfigInstancia(false);
    toast("Servidor atualizado!", { tipo: "sucesso" });
  };

  const restaurarInstanciaPadrao = () => {
    salvarInstanciaCobalt("");
    setInstanciaAtual(INSTANCIAS_COBALT_PADRAO[0]);
    setInstanciaInput(INSTANCIAS_COBALT_PADRAO[0]);
    setMostrarConfigInstancia(false);
    toast("Restaurado para o servidor padrão!", { tipo: "info" });
  };

  const limparTodoHistorico = () => {
    limparHistoricoDownloads();
    setHistorico([]);
    toast("Histórico limpo.", { tipo: "info" });
  };

  const abaConfig = ABAS_PLATAFORMAS.find((a) => a.id === abaAtiva) || ABAS_PLATAFORMAS[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Cabeçalho da Página */}
      <CabecalhoPagina
        titulo="Baixador de Mídia"
        descricao="Baixe vídeos, reels, shorts, fotos e áudios MP3 de qualquer rede social sem anúncios e 100% nativo no Klaus."
      />

      {/* Grade de Ferramentas / Plataformas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {ABAS_PLATAFORMAS.map((aba) => {
          const Icone = aba.icone;
          const ativa = abaAtiva === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => {
                setAbaAtiva(aba.id);
                setSearchParams({ ferramenta: aba.id });
                setErro(null);
                setResultado(null);
                setStreamSelecionada(null);
              }}
              className={cn(
                "flex flex-col items-start text-left p-3.5 rounded-xl border transition-all cursor-pointer relative",
                ativa
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                  : "border-border bg-card hover:bg-secondary/40 hover:border-border/80"
              )}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={cn("p-2 rounded-lg border", aba.corBadge)}>
                  <Icone size={18} />
                </div>
                {ativa && (
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              <h3 className="font-semibold text-xs sm:text-sm text-foreground">{aba.titulo}</h3>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{aba.subtitulo}</p>
            </button>
          );
        })}
      </div>

      {/* Área Central de Entrada e Download */}
      <Cartao className="p-4 sm:p-6 border-border/80 bg-card space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-md border", abaConfig.corBadge)}>
              <abaConfig.icone size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Download {abaConfig.titulo === "Universal" ? "de Vídeo ou Áudio" : abaConfig.titulo}
              </h2>
              <p className="text-xs text-muted-foreground">{abaConfig.subtitulo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMostrarConfigInstancia((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/60 hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <Settings2 size={13} />
              <span>Configurar Servidor</span>
            </button>
          </div>
        </div>

        {/* Painel Expansível de Configurações de Servidor */}
        {mostrarConfigInstancia && (
          <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Settings2 size={14} className="text-primary" />
                Servidor de Download Open Source (Cobalt / Piped)
              </span>
              <button
                type="button"
                onClick={restaurarInstanciaPadrao}
                className="text-[11px] text-primary hover:underline cursor-pointer"
              >
                Restaurar Padrão
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              O Klaus executa downloads 100% nativos. Se você tiver um servidor próprio Cobalt ou Piped:
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={instanciaInput}
                onChange={(e) => setInstanciaInput(e.target.value)}
                placeholder="https://api.cobalt.tools"
                className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Botao tamanho="pequeno" onClick={salvarNovaInstancia}>
                Salvar
              </Botao>
            </div>
          </div>
        )}

        {/* Input de URL */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>Link do vídeo, post ou áudio</span>
              {plataformaDetectada !== "universal" && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                  {plataformaDetectada} detectado
                </span>
              )}
            </span>
            <span className="text-[11px] text-muted-foreground">Suporta links públicos e curtos</span>
          </label>
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="url"
              value={urlInput}
              onChange={(e) => lidarMudancaUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !processando) {
                  executarDownload();
                }
              }}
              placeholder={abaConfig.placeholder}
              className="w-full pl-3.5 pr-24 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {urlInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput("");
                    setResultado(null);
                    setErro(null);
                    setStreamSelecionada(null);
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary cursor-pointer"
                  title="Limpar campo"
                >
                  <Trash2 size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={colarDaAreaTransferencia}
                  className="px-2.5 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Copy size={13} />
                  <span>Colar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Configurações de Qualidade e Formato */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Modo de Download */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Modo</label>
            <select
              value={abaAtiva === "audio" ? "audio" : modoDownload}
              onChange={(e) => setModoDownload(e.target.value as ModoDownload)}
              disabled={abaAtiva === "audio"}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="auto">Vídeo Completo (com áudio)</option>
              <option value="audio">Somente Áudio (MP3 / M4A)</option>
              <option value="mute">Somente Vídeo (Mudo)</option>
            </select>
          </div>

          {/* Qualidade de Vídeo */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Qualidade de Vídeo</label>
            <select
              value={qualidadeVideo}
              onChange={(e) => setQualidadeVideo(e.target.value as QualidadeVideo)}
              disabled={abaAtiva === "audio" || modoDownload === "audio"}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value="max">Melhor Disponível (1080p / 4K / HD)</option>
              <option value="1080">1080p (Full HD)</option>
              <option value="720">720p (HD)</option>
              <option value="480">480p (Padrão)</option>
              <option value="360">360p (Econômico)</option>
            </select>
          </div>

          {/* Formato de Áudio */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Formato de Áudio</label>
            <select
              value={formatoAudio}
              onChange={(e) => setFormatoAudio(e.target.value as FormatoAudio)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="mp3">MP3 / M4A (Mais compatível)</option>
              <option value="ogg">OGG</option>
              <option value="wav">WAV (Sem perdas)</option>
              <option value="opus">Opus</option>
            </select>
          </div>
        </div>

        {/* Botão de Ação */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span>Processamento nativo dentro do Klaus, sem abas externas e sem anúncios.</span>
          </p>

          <Botao
            variante="primario"
            tamanho="normal"
            onClick={() => executarDownload()}
            disabled={processando || !urlInput.trim()}
            className="w-full sm:w-auto min-w-[160px]"
          >
            {processando ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Processando no Klaus...
              </>
            ) : (
              <>
                <Download size={16} className="mr-2" />
                Obter Download
              </>
            )}
          </Botao>
        </div>
      </Cartao>

      {/* Exibição de Erro */}
      {erro && (
        <Aviso tom="erro">
          <div className="space-y-1">
            <p className="font-semibold text-sm">{erro}</p>
            {detalheErro && <p className="text-xs opacity-90">{detalheErro}</p>}
          </div>
        </Aviso>
      )}

      {/* Card de Resultado 100% Nativo no Klaus */}
      {resultado && (
        <Cartao className="p-5 border-emerald-500/30 bg-emerald-500/5 space-y-4 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  {resultado.titulo || "Mídia Pronta para Download"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Rede: {resultado.plataforma.toUpperCase()} {resultado.servicoUtilizado ? `• Motor ${resultado.servicoUtilizado}` : ""}
                </p>
              </div>
            </div>

            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              Pronto no Klaus
            </span>
          </div>

          {/* Player de Vídeo Nativo Incorporado */}
          {(streamSelecionada?.url || resultado.urlDownload) && (
            <div className="rounded-xl overflow-hidden bg-black/90 border border-border flex items-center justify-center max-h-80 shadow-inner">
              {streamSelecionada?.ehVideo || resultado.tipo === "stream" ? (
                <video
                  src={streamSelecionada?.url || resultado.urlDownload}
                  controls
                  className="w-full max-h-80 object-contain"
                  poster={resultado.thumbnail}
                />
              ) : (
                <div className="p-6 w-full flex flex-col items-center justify-center gap-3">
                  <div className="p-4 rounded-full bg-primary/20 text-primary">
                    <Music size={32} />
                  </div>
                  <audio src={streamSelecionada?.url || resultado.urlDownload} controls className="w-full max-w-md" />
                </div>
              )}
            </div>
          )}

          {/* Múltiplos Formatos e Qualidades (Seleção Nativa) */}
          {resultado.streamsDisponiveis && resultado.streamsDisponiveis.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileVideo size={14} className="text-primary" />
                Selecione a qualidade para baixar direto:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {resultado.streamsDisponiveis.map((st, i) => {
                  const ativa = streamSelecionada?.url === st.url;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded-xl border transition-all flex items-center justify-between gap-2 shadow-2xs",
                        ativa ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary/40"
                      )}
                    >
                      <div
                        className="min-w-0 cursor-pointer flex-1"
                        onClick={() => setStreamSelecionada(st)}
                      >
                        <p className="text-xs font-bold text-foreground flex items-center gap-1">
                          <span>{st.qualidade}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground uppercase">
                            {st.formato}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {st.ehVideo ? "Vídeo MP4" : "Faixa de Áudio"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Botao
                          tamanho="pequeno"
                          variante="primario"
                          disabled={baixando}
                          onClick={() =>
                            baixarNativo(
                              st.url,
                              `${resultado.titulo || "video"}_${st.qualidade}.${st.ehVideo ? "mp4" : "m4a"}`
                            )
                          }
                        >
                          <Download size={13} className="mr-1" />
                          Baixar
                        </Botao>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Galeria Picker (Instagram Carrossel / TikTok Fotos) */}
          {resultado.tipo === "picker" && resultado.itensPicker && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-foreground">
                Múltiplas mídias encontradas ({resultado.itensPicker.length} itens):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {resultado.itensPicker.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border bg-card flex flex-col items-center gap-2 text-center"
                  >
                    {item.thumb ? (
                      <img
                        src={item.thumb}
                        alt={`Item ${idx + 1}`}
                        className="w-full h-28 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-28 bg-secondary/50 rounded-lg flex items-center justify-center text-muted-foreground">
                        {item.tipo === "video" ? <Video size={24} /> : <ImageIcon size={24} />}
                      </div>
                    )}
                    <span className="text-[11px] font-medium text-foreground">
                      {item.tipo === "video" ? `Vídeo #${idx + 1}` : `Foto #${idx + 1}`}
                    </span>
                    <Botao
                      tamanho="pequeno"
                      variante="primario"
                      disabled={baixando}
                      onClick={() => baixarNativo(item.url, `midia_${idx + 1}.mp4`)}
                      className="w-full"
                    >
                      <Download size={13} className="mr-1" />
                      Baixar no Mac
                    </Botao>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações de Download e Armazenamento no Klaus */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-emerald-500/20">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground line-clamp-1">
                {resultado.nomeArquivo || resultado.titulo}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Download direto salvo na pasta padrão de transferências do seu computador/celular.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {resultado.urlDownload && (
                <Botao
                  tamanho="normal"
                  variante="primario"
                  disabled={baixando}
                  onClick={() =>
                    baixarNativo(
                      streamSelecionada?.url || resultado.urlDownload!,
                      resultado.nomeArquivo
                    )
                  }
                  className="flex-1 sm:flex-initial"
                >
                  {baixando ? (
                    <Loader2 size={16} className="animate-spin mr-1.5" />
                  ) : (
                    <Download size={16} className="mr-1.5" />
                  )}
                  Baixar Arquivo
                </Botao>
              )}

              <Botao
                tamanho="normal"
                variante="neutro"
                onClick={() =>
                  copiarLinkDownload(streamSelecionada?.url || resultado.urlDownload || resultado.urlOriginal, "btn-resultado")
                }
              >
                {copiadoId === "btn-resultado" ? (
                  <Check size={16} className="text-emerald-500 mr-1.5" />
                ) : (
                  <Copy size={16} className="mr-1.5" />
                )}
                {copiadoId === "btn-resultado" ? "Copiado!" : "Copiar Link"}
              </Botao>

              <Botao
                tamanho="normal"
                variante="neutro"
                disabled={salvandoKlaus}
                onClick={() =>
                  salvarComoReferenciaKlaus(
                    resultado.titulo,
                    resultado.urlOriginal,
                    streamSelecionada?.url || resultado.urlDownload,
                    resultado.plataforma
                  )
                }
                title="Cria uma nova Referência no Klaus vinculada a esta mídia"
              >
                {salvandoKlaus ? (
                  <Loader2 size={16} className="animate-spin mr-1.5" />
                ) : (
                  <Sparkles size={16} className="text-amber-500 mr-1.5" />
                )}
                Salvar no Klaus
              </Botao>
            </div>
          </div>
        </Cartao>
      )}

      {/* Histórico de Downloads Recentes */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Downloads Recentes no Klaus</h3>
            {historico.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {historico.length}
              </span>
            )}
          </div>

          {historico.length > 0 && (
            <button
              type="button"
              onClick={limparTodoHistorico}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Limpar Histórico</span>
            </button>
          )}
        </div>

        {historico.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2 bg-card/40">
            <div className="p-3 rounded-full bg-secondary/50 text-muted-foreground inline-flex">
              <Download size={20} />
            </div>
            <p className="text-xs font-medium text-foreground">Nenhum download recente</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              Seus downloads e links salvos ficam guardados aqui localmente para acesso imediato.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border/80 rounded-xl bg-card overflow-hidden shadow-xs">
            {historico.map((item) => (
              <div
                key={item.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary text-foreground shrink-0 mt-0.5 sm:mt-0">
                    {item.tipo === "audio" ? <Music size={16} /> : <Video size={16} />}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground line-clamp-1">
                      {item.nomeArquivo || item.titulo || "Download de Mídia"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="uppercase font-medium text-[10px] px-1.5 py-0.5 rounded-md bg-secondary">
                        {item.plataforma}
                      </span>
                      <span>•</span>
                      <span>{new Date(item.dataIso).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <Botao
                    tamanho="pequeno"
                    variante="primario"
                    disabled={baixando}
                    onClick={() => baixarNativo(item.urlDownload, item.nomeArquivo)}
                  >
                    <Download size={13} className="mr-1" />
                    Baixar
                  </Botao>
                  <Tooltip conteudo="Copiar Link">
                    <button
                      type="button"
                      onClick={() => copiarLinkDownload(item.urlDownload, item.id)}
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                    >
                      {copiadoId === item.id ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </Tooltip>
                  <Tooltip conteudo="Remover do Histórico">
                    <button
                      type="button"
                      onClick={() => {
                        removerDoHistoricoDownload(item.id);
                        setHistorico((prev) => prev.filter((i) => i.id !== item.id));
                      }}
                      className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
