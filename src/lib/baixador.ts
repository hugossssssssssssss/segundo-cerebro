/**
 * Módulo de Baixador de Mídia 100% nativo para o Klaus.
 * Utiliza o motor Piped Streams para YouTube e Cobalt API para instâncias personalizadas.
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

export interface RespostaDownloadErro {
  sucesso: false;
  erro: string;
  detalhe?: string;
  plataforma: PlataformaMidia;
  urlOriginal: string;
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
  "https://pipedapi.kavin.rocks/streams/",
  "https://api.piped.yt/streams/",
];

export const INSTANCIAS_TWITTER = [
  "https://api.fxtwitter.com/x/status/",
  "https://api.fixupx.com/x/status/",
  "https://api.twittpr.com/x/status/",
];

export const INSTANCIAS_COBALT_PADRAO = [
  "https://api.cobalt.tools",
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
 * Extrai o ID do vídeo do YouTube de qualquer formato de link.
 */
export function extrairIdYouTube(url: string): string | null {
  try {
    const limpa = (url || "").trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(limpa)) return limpa;
    const match = limpa.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/);
    if (match && match[1]) return match[1];

    if (limpa.includes("v=")) {
      const parsed = new URL(limpa);
      const v = parsed.searchParams.get("v");
      if (v && v.length === 11) return v;
    }
  } catch {
    // silencioso
  }
  return null;
}

/**
 * Extrai o ID do Tweet / Post do X de links variados.
 */
export function extrairIdTwitter(url: string): string | null {
  try {
    const limpa = (url || "").trim();
    if (/^\d{15,22}$/.test(limpa)) return limpa;
    const match = limpa.match(/(?:twitter\.com|x\.com)\/(?:#!\/)?(?:i|[a-zA-Z0-9_]+)\/status(?:es)?\/(\d+)/i);
    if (match && match[1]) return match[1];
    const matchGeneric = limpa.match(/\/status\/(\d+)/i);
    if (matchGeneric && matchGeneric[1]) return matchGeneric[1];
  } catch {
    // silencioso
  }
  return null;
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
 * Processa download do YouTube usando instâncias abertas do Piped Streams.
 */
async function processarYouTubePiped(
  videoId: string,
  urlOriginal: string,
  modo: ModoDownload
): Promise<RespostaDownloadSucesso | null> {
  for (const baseUrl of INSTANCIAS_PIPED_YOUTUBE) {
    try {
      const res = await fetch(`${baseUrl}${videoId}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const titulo = data.title || "Video_YouTube";
      const thumbnail = data.thumbnailUrl || (data.previewFrames?.[0]?.urls?.[0]) || "";

      // Filtra streams válidas e remove espelhos como odycdn que exigem autenticação
      const videoStreams: StreamDisponivel[] = (data.videoStreams || [])
        .filter((s: any) => s && s.url && !s.url.includes("odycdn.com") && !s.quality?.toUpperCase().includes("LBRY"))
        .map((s: any) => ({
          url: s.url,
          formato: (s.format || "MP4").toUpperCase(),
          qualidade: s.quality || "HD",
          ehVideo: true,
          mimeType: s.mimeType || "video/mp4",
        }));

      const audioStreams: StreamDisponivel[] = (data.audioStreams || [])
        .filter((s: any) => s && s.url && !s.url.includes("odycdn.com"))
        .map((s: any) => ({
          url: s.url,
          formato: (s.format || "M4A").toUpperCase(),
          qualidade: `${s.quality || "Áudio"} (${s.bitrate ? Math.round(s.bitrate / 1000) + "kbps" : "HQ"})`,
          ehVideo: false,
          mimeType: s.mimeType || "audio/mp4",
        }));

      const streams = modo === "audio" ? audioStreams : [...videoStreams, ...audioStreams];
      // Escolhe stream prioritária
      const streamPrincipal = modo === "audio" 
        ? audioStreams[0] || streams[0] 
        : videoStreams[0] || streams[0];

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
          servicoUtilizado: "Piped Streams",
        };
      }
    } catch {
      // tenta próxima instância
    }
  }
  return null;
}

/**
 * Processa download do Twitter / X usando a API aberta FixTweet.
 */
async function processarTwitter(
  tweetId: string,
  urlOriginal: string,
  modo: ModoDownload
): Promise<RespostaDownloadSucesso | null> {
  for (const baseUrl of INSTANCIAS_TWITTER) {
    try {
      const res = await fetch(`${baseUrl}${tweetId}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      if (!data || data.code !== 200 || !data.tweet) continue;

      const tweet = data.tweet;
      const autor = tweet.author?.name ? `${tweet.author.name} (@${tweet.author.screen_name || "x"})` : "X / Twitter";
      const textoLimpo = (tweet.text || "").replace(/https?:\/\/\S+/g, "").trim();
      const titulo = textoLimpo ? `${textoLimpo.slice(0, 60)}` : `Post de ${autor}`;
      const nomeBase = (textoLimpo || `twitter_${tweetId}`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);

      const media = tweet.media;
      if (!media) continue;

      // 1. Vídeos ou GIFs
      const videos = media.videos || media.all?.filter((m: any) => m.type === "video" || m.type === "gif") || [];
      if (videos.length > 0) {
        const videoPrincipal = videos[0];
        const thumbnail = videoPrincipal.thumbnail_url || "";
        
        // Extrai todas as variantes MP4 disponíveis
        const variantes = (videoPrincipal.variants || videoPrincipal.formats || [])
          .filter((v: any) => v && v.url && (v.content_type === "video/mp4" || v.url.includes(".mp4") || v.container === "mp4"))
          .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

        const streams: StreamDisponivel[] = variantes.map((v: any, idx: number) => {
          let label = "MP4";
          if (v.bitrate) {
            const kbps = Math.round(v.bitrate / 1000);
            label = kbps > 1000 ? `Full HD / 720p (${kbps} kbps)` : `${kbps} kbps`;
          } else if (idx === 0) {
            label = "Qualidade Máxima";
          }
          return {
            url: v.url,
            formato: "MP4",
            qualidade: label,
            ehVideo: true,
            mimeType: "video/mp4",
          };
        });

        // Se não houver variantes listadas, usa a url direta do vídeo
        if (streams.length === 0 && videoPrincipal.url) {
          streams.push({
            url: videoPrincipal.url,
            formato: "MP4",
            qualidade: "Qualidade Padrão",
            ehVideo: true,
            mimeType: "video/mp4",
          });
        }

        const streamPrincipal = streams[0];

        if (streamPrincipal) {
          return {
            sucesso: true,
            tipo: "stream",
            urlDownload: streamPrincipal.url,
            nomeArquivo: `${nomeBase}.${modo === "audio" ? "mp3" : "mp4"}`,
            titulo: `${titulo} - ${autor}`,
            thumbnail,
            streamsDisponiveis: streams,
            plataforma: "twitter",
            urlOriginal,
            servicoUtilizado: "FixTweet Native",
          };
        }
      }

      // 2. Fotos / Galeria de Imagens do Post
      const fotos = media.photos || media.all?.filter((m: any) => m.type === "photo") || [];
      if (fotos.length > 0) {
        const itens: ItemPicker[] = fotos.map((f: any) => ({
          tipo: "photo",
          url: f.url,
          thumb: f.url,
        }));

        return {
          sucesso: true,
          tipo: "picker",
          itensPicker: itens,
          titulo: `${titulo} - ${autor}`,
          thumbnail: fotos[0]?.url,
          plataforma: "twitter",
          urlOriginal,
          nomeArquivo: `${nomeBase}_fotos`,
          servicoUtilizado: "FixTweet Native",
        };
      }
    } catch {
      // tenta próxima instância
    }
  }
  return null;
}

/**
 * Processa uma requisição de download de mídia.
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

  // 2. Twitter / X via FixTweet Engine Direto
  if (plataforma === "twitter") {
    const tweetId = extrairIdTwitter(urlLimpa);
    if (tweetId) {
      const resTwitter = await processarTwitter(tweetId, urlLimpa, modo);
      if (resTwitter) return resTwitter;
    }
  }

  // 3. Cobalt API (para instâncias personalizadas e auto-hospedadas)
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

  let ultimoErro = "Não foi possível conectar ao servidor de download.";

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
            ultimoErro = `Cobalt (${jsonErro.error.code}): Servidor protegido ou requer chave de acesso`;
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

  // 4. Resposta de erro clara e transparente
  return {
    sucesso: false,
    erro: `Não foi possível extrair a mídia de ${plataforma.toUpperCase()} no momento.`,
    detalhe: `${ultimoErro}. Verifique se a postagem/vídeo é pública ou configure uma instância do Cobalt no botão acima.`,
    plataforma,
    urlOriginal: urlLimpa,
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
