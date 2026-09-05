/**
 * Módulo de Baixador de Mídia para o Klaus.
 * Combina múltiplos motores open source (Piped Streams para YouTube, Cobalt API para instâncias personalizadas
 * e geradores de ponte rápida para redes com bloqueio de robô como Twitter/X e Instagram).
 */

export type PlataformaMidia =
  | "universal"
  | "youtube"
  | "instagram"
  | "tiktok"
  | "twitter"
  | "facebook"
  | "pinterest"
  | "audio"
  | "reddit"
  | "soundcloud";

export type QualidadeVideo = "max" | "2160" | "1440" | "1080" | "720" | "480" | "360";
export type FormatoAudio = "mp3" | "ogg" | "wav" | "opus";
export type ModoDownload = "auto" | "audio" | "mute";

export interface OpcoesDownload {
  url: string;
  qualidadeVideo?: QualidadeVideo;
  formatoAudio?: FormatoAudio;
  modo?: ModoDownload;
  codecYoutube?: "h264" | "av1" | "vp9";
  tiktokAudioCompleto?: boolean;
  instanciaPersonalizada?: string;
}

export interface ItemPicker {
  tipo: "photo" | "video";
  url: string;
  thumb?: string;
}

export interface StreamDisponivel {
  url: string;
  formato: string;
  qualidade: string;
  ehVideo: boolean;
  mimeType?: string;
}

export interface RespostaDownloadSucesso {
  sucesso: true;
  tipo: "stream" | "picker" | "redirect";
  urlDownload?: string;
  nomeArquivo?: string;
  itensPicker?: ItemPicker[];
  streamsDisponiveis?: StreamDisponivel[];
  plataforma: PlataformaMidia;
  urlOriginal: string;
  titulo?: string;
  thumbnail?: string;
  servicoUtilizado?: string;
}

export interface AtalhoDownloadExterno {
  nome: string;
  url: string;
  descricao: string;
}

export interface RespostaDownloadErro {
  sucesso: false;
  erro: string;
  detalhe?: string;
  plataforma: PlataformaMidia;
  urlOriginal: string;
  atalhosRecomendados?: AtalhoDownloadExterno[];
}

export type RespostaDownload = RespostaDownloadSucesso | RespostaDownloadErro;

export interface ItemHistoricoDownload {
  id: string;
  dataIso: string;
  plataforma: PlataformaMidia;
  urlOriginal: string;
  urlDownload: string;
  nomeArquivo: string;
  tipo: "video" | "audio" | "foto" | "galeria";
  thumbnail?: string;
  titulo?: string;
}

export const INSTANCIAS_PIPED_YOUTUBE = [
  "https://api.piped.private.coffee/streams/",
  "https://pipedapi.tokhmi.xyz/streams/",
  "https://piped-api.lunar.icu/streams/",
];

export const INSTANCIAS_COBALT_PADRAO = [
  "https://api.cobalt.tools",
  "https://cobalt-api.kwiatekm.pl",
  "https://api.wuk.sh",
];

export const CHAVE_STORAGE_HISTORICO_DOWNLOADS = "klaus_historico_downloads";
export const CHAVE_STORAGE_INSTANCIA_COBALT = "klaus_instancia_cobalt";

/**
 * Detecta a plataforma a partir de uma URL.
 */
export function detectarPlataforma(url: string): PlataformaMidia {
  const u = (url || "").trim().toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
  if (u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.com")) return "facebook";
  if (u.includes("pinterest.com") || u.includes("pin.it")) return "pinterest";
  if (u.includes("reddit.com") || u.includes("v.redd.it")) return "reddit";
  if (u.includes("soundcloud.com")) return "soundcloud";
  return "universal";
}

/**
 * Extrai o ID do vídeo do YouTube.
 */
export function extrairIdYouTube(url: string): string | null {
  const limpa = (url || "").trim();
  if (limpa.includes("youtu.be/")) {
    return limpa.split("youtu.be/")[1].split("?")[0].split("&")[0];
  }
  if (limpa.includes("watch?v=")) {
    return limpa.split("watch?v=")[1].split("&")[0];
  }
  if (limpa.includes("shorts/")) {
    return limpa.split("shorts/")[1].split("?")[0].split("&")[0];
  }
  if (limpa.includes("embed/")) {
    return limpa.split("embed/")[1].split("?")[0].split("&")[0];
  }
  return null;
}

/**
 * Gera links de atalho para downloaders web dedicados quando a rede bloquear chamadas de robô.
 */
export function gerarAtalhosExternos(url: string, plataforma: PlataformaMidia): AtalhoDownloadExterno[] {
  const enc = encodeURIComponent(url);
  switch (plataforma) {
    case "twitter":
      return [
        {
          nome: "Cobalt Web Oficial",
          url: `https://cobalt.tools/#${enc}`,
          descricao: "Downloader open source sem anúncios",
        },
        {
          nome: "TwitSave",
          url: `https://twitsave.com/info?url=${enc}`,
          descricao: "Download direto de vídeos e GIFs do X/Twitter",
        },
        {
          nome: "SSSTwitter",
          url: `https://ssstwitter.com/pt`,
          descricao: "Opção rápida para vídeos do Twitter",
        },
      ];
    case "instagram":
      return [
        {
          nome: "Cobalt Web Oficial",
          url: `https://cobalt.tools/#${enc}`,
          descricao: "Baixar Reels e fotos sem marca",
        },
        {
          nome: "SnapInsta",
          url: `https://snapinsta.app/pt`,
          descricao: "Download de Reels, posts e carrosséis",
        },
        {
          nome: "FastDl",
          url: `https://fastdl.app/pt`,
          descricao: "Download de mídias do Instagram",
        },
      ];
    case "tiktok":
      return [
        {
          nome: "Cobalt Web Oficial",
          url: `https://cobalt.tools/#${enc}`,
          descricao: "TikTok em alta resolução sem marca d'água",
        },
        {
          nome: "SnapTik",
          url: `https://snaptik.app/pt`,
          descricao: "Baixar vídeo do TikTok sem marca",
        },
        {
          nome: "SSSTik",
          url: `https://ssstik.io/pt`,
          descricao: "Download de vídeos e MP3 do TikTok",
        },
      ];
    case "facebook":
      return [
        {
          nome: "Cobalt Web Oficial",
          url: `https://cobalt.tools/#${enc}`,
          descricao: "Download limpo sem anúncios",
        },
        {
          nome: "FDown",
          url: `https://fdown.net/`,
          descricao: "Download de vídeos públicos e Reels do Facebook",
        },
      ];
    case "pinterest":
      return [
        {
          nome: "Cobalt Web Oficial",
          url: `https://cobalt.tools/#${enc}`,
          descricao: "Vídeos e fotos do Pinterest",
        },
        {
          nome: "PinterestDownloader",
          url: `https://pinterestdownloader.com/`,
          descricao: "Download de vídeos de referências",
        },
      ];
    default:
      return [
        {
          nome: "Cobalt Web Oficial",
          url: `https://cobalt.tools/#${enc}`,
          descricao: "Downloader open source universal",
        },
        {
          nome: "SaveFrom",
          url: `https://pt.savefrom.net/`,
          descricao: "Downloader web para diversas redes",
        },
      ];
  }
}

/**
 * Obtém a instância configurada do Cobalt ou a padrão.
 */
export function obterInstanciaCobalt(): string {
  try {
    const salva = localStorage.getItem(CHAVE_STORAGE_INSTANCIA_COBALT);
    if (salva && salva.trim().startsWith("http")) {
      return salva.trim().replace(/\/+$/, "");
    }
  } catch {
    // silencioso
  }
  return INSTANCIAS_COBALT_PADRAO[0];
}

/**
 * Salva uma instância personalizada do Cobalt.
 */
export function salvarInstanciaCobalt(url: string): void {
  try {
    if (!url.trim()) {
      localStorage.removeItem(CHAVE_STORAGE_INSTANCIA_COBALT);
    } else {
      localStorage.setItem(CHAVE_STORAGE_INSTANCIA_COBALT, url.trim().replace(/\/+$/, ""));
    }
  } catch {
    // silencioso
  }
}

/**
 * Tenta baixar do YouTube diretamente usando o motor Piped.
 */
async function processarYouTubePiped(
  videoId: string,
  urlOriginal: string,
  modo: ModoDownload
): Promise<RespostaDownloadSucesso | null> {
  for (const baseUrl of INSTANCIAS_PIPED_YOUTUBE) {
    try {
      const res = await fetch(`${baseUrl}${videoId}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const titulo = data.title || "Video_YouTube";
      const thumbnail = data.thumbnailUrl || "";

      const videoStreams: StreamDisponivel[] = (data.videoStreams || [])
        .filter((s: any) => s && s.url)
        .map((s: any) => ({
          url: s.url,
          formato: s.format || "MP4",
          qualidade: s.quality || "HD",
          ehVideo: true,
          mimeType: s.mimeType || "video/mp4",
        }));

      const audioStreams: StreamDisponivel[] = (data.audioStreams || [])
        .filter((s: any) => s && s.url)
        .map((s: any) => ({
          url: s.url,
          formato: s.format || "M4A",
          qualidade: s.quality || "Áudio",
          ehVideo: false,
          mimeType: s.mimeType || "audio/mp4",
        }));

      const streams = modo === "audio" ? audioStreams : [...videoStreams, ...audioStreams];
      const streamPrincipal = streams[0] || videoStreams[0] || audioStreams[0];

      if (streamPrincipal) {
        return {
          sucesso: true,
          tipo: "stream",
          urlDownload: streamPrincipal.url,
          nomeArquivo: `${titulo.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)}.${modo === "audio" ? "m4a" : "mp4"}`,
          titulo,
          thumbnail,
          streamsDisponiveis: streams,
          plataforma: "youtube",
          urlOriginal,
          servicoUtilizado: "Piped Open Source Engine",
        };
      }
    } catch {
      // tenta próxima instância
    }
  }
  return null;
}

/**
 * Processa uma requisição de download via Cobalt API ou motores diretos.
 */
export async function processarDownloadMidia(opcoes: OpcoesDownload): Promise<RespostaDownload> {
  const {
    url,
    qualidadeVideo = "1080",
    formatoAudio = "mp3",
    modo = "auto",
    codecYoutube = "h264",
    tiktokAudioCompleto = true,
    instanciaPersonalizada,
  } = opcoes;

  const urlLimpa = url.trim();
  if (!urlLimpa || !urlLimpa.startsWith("http")) {
    return {
      sucesso: false,
      erro: "Informe uma URL válida iniciada por http:// ou https://",
      plataforma: "universal",
      urlOriginal: urlLimpa,
    };
  }

  const plataforma = detectarPlataforma(urlLimpa);

  // 1. YouTube via Piped Engine Direto
  if (plataforma === "youtube") {
    const videoId = extrairIdYouTube(urlLimpa);
    if (videoId) {
      const resYouTube = await processarYouTubePiped(videoId, urlLimpa, modo);
      if (resYouTube) return resYouTube;
    }
  }

  // 2. Cobalt API (com suporte a instâncias personalizadas e padrão)
  const instancias = instanciaPersonalizada
    ? [instanciaPersonalizada.replace(/\/+$/, "")]
    : [obterInstanciaCobalt(), ...INSTANCIAS_COBALT_PADRAO.filter((i) => i !== obterInstanciaCobalt())];

  const payload: Record<string, any> = {
    url: urlLimpa,
    videoQuality: qualidadeVideo === "max" ? "max" : qualidadeVideo,
    audioFormat: formatoAudio,
    downloadMode: modo,
    youtubeVideoCodec: codecYoutube,
    tiktokFullAudio: tiktokAudioCompleto,
  };

  let ultimoErro = "Não foi possível conectar ao serviço de download direto.";

  for (const baseUrl of instancias) {
    try {
      const endpoint = `${baseUrl}/`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txtErro = await res.text();
        try {
          const jsonErro = JSON.parse(txtErro);
          if (jsonErro?.error?.code) {
            ultimoErro = `Cobalt (${jsonErro.error.code}): ${jsonErro.error.context?.service || "Exige autorização ou servidor protegido"}`;
          } else if (jsonErro?.text) {
            ultimoErro = jsonErro.text;
          }
        } catch {
          ultimoErro = `Servidor retornou status ${res.status}`;
        }
        continue;
      }

      const data = await res.json();

      if (data.status === "tunnel" || data.status === "redirect" || data.url) {
        const urlFinal = data.url;
        const nomeArquivo = data.filename || `midia_${plataforma}_${Date.now()}.${modo === "audio" ? formatoAudio : "mp4"}`;

        return {
          sucesso: true,
          tipo: data.status === "tunnel" ? "stream" : "redirect",
          urlDownload: urlFinal,
          nomeArquivo,
          plataforma,
          urlOriginal: urlLimpa,
          servicoUtilizado: "Cobalt API",
        };
      }

      if (data.status === "picker" && Array.isArray(data.picker)) {
        const itens: ItemPicker[] = data.picker.map((item: any) => ({
          tipo: item.type === "photo" ? "photo" : "video",
          url: item.url,
          thumb: item.thumb,
        }));

        return {
          sucesso: true,
          tipo: "picker",
          itensPicker: itens,
          plataforma,
          urlOriginal: urlLimpa,
          nomeArquivo: `galeria_${plataforma}_${Date.now()}`,
          servicoUtilizado: "Cobalt API",
        };
      }
    } catch (err: any) {
      ultimoErro = err?.message || "Falha de conexão com a API.";
    }
  }

  // 3. Fallback informativo com Atalhos Rápidos de 1 Clique
  const atalhosRecomendados = gerarAtalhosExternos(urlLimpa, plataforma);

  return {
    sucesso: false,
    erro: `A rede ${plataforma.toUpperCase()} bloqueou o download direto por robô no navegador.`,
    detalhe: `${ultimoErro} - Use um dos atalhos rápidos abaixo para baixar com 1 clique.`,
    plataforma,
    urlOriginal: urlLimpa,
    atalhosRecomendados,
  };
}

/**
 * Carrega o histórico de downloads salvos localmente.
 */
export function listarHistoricoDownloads(): ItemHistoricoDownload[] {
  try {
    const raw = localStorage.getItem(CHAVE_STORAGE_HISTORICO_DOWNLOADS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Salva um novo download no histórico local.
 */
export function adicionarAoHistoricoDownload(item: Omit<ItemHistoricoDownload, "id" | "dataIso">): ItemHistoricoDownload {
  const novo: ItemHistoricoDownload = {
    ...item,
    id: `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    dataIso: new Date().toISOString(),
  };

  try {
    const lista = listarHistoricoDownloads();
    const atualizada = [novo, ...lista.slice(0, 49)];
    localStorage.setItem(CHAVE_STORAGE_HISTORICO_DOWNLOADS, JSON.stringify(atualizada));
  } catch {
    // silencioso
  }

  return novo;
}

/**
 * Remove um item do histórico de downloads.
 */
export function removerDoHistoricoDownload(id: string): void {
  try {
    const lista = listarHistoricoDownloads();
    const filtrada = lista.filter((i) => i.id !== id);
    localStorage.setItem(CHAVE_STORAGE_HISTORICO_DOWNLOADS, JSON.stringify(filtrada));
  } catch {
    // silencioso
  }
}

/**
 * Limpa todo o histórico de downloads.
 */
export function limparHistoricoDownloads(): void {
  try {
    localStorage.removeItem(CHAVE_STORAGE_HISTORICO_DOWNLOADS);
  } catch {
    // silencioso
  }
}
