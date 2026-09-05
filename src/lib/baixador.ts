/**
 * Módulo de Baixador de Mídia Open Source para o Klaus.
 * Utiliza instâncias públicas / configuráveis da API do Cobalt (baseada em yt-dlp)
 * para download direto de vídeos, fotos e áudios de redes sociais sem anúncios ou rastreadores.
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

export interface RespostaDownloadSucesso {
  sucesso: true;
  tipo: "stream" | "picker" | "redirect";
  urlDownload?: string;
  nomeArquivo?: string;
  itensPicker?: ItemPicker[];
  plataforma: PlataformaMidia;
  urlOriginal: string;
  titulo?: string;
}

export interface RespostaDownloadErro {
  sucesso: false;
  erro: string;
  detalhe?: string;
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

export const INSTANCIAS_COBALT_PADRAO = [
  "https://api.cobalt.tools",
  "https://cobalt-api.kwiatekm.pl",
  "https://api.wuk.sh",
  "https://cobalt.api.sc",
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
 * Processa uma requisição de download via Cobalt API com fallback automático.
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
    };
  }

  const plataforma = detectarPlataforma(urlLimpa);

  // Lista de instâncias a tentar
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

  let ultimoErro = "Não foi possível conectar ao serviço de download.";

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
            ultimoErro = `Erro (${jsonErro.error.code}): ${jsonErro.error.context?.service || "Plataforma recusou ou vídeo indisponível"}`;
          } else if (jsonErro?.text) {
            ultimoErro = jsonErro.text;
          }
        } catch {
          ultimoErro = `Servidor retornou status ${res.status}`;
        }
        continue;
      }

      const data = await res.json();

      // Tratamento de resposta Cobalt v10 / v7
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
        };
      }

      if (data.status === "error") {
        return {
          sucesso: false,
          erro: data.error?.code || "Erro ao processar mídia.",
          detalhe: JSON.stringify(data.error?.context || {}),
        };
      }
    } catch (err: any) {
      ultimoErro = err?.message || "Falha de conexão com a API.";
    }
  }

  return {
    sucesso: false,
    erro: "Não foi possível baixar esta mídia no momento.",
    detalhe: `${ultimoErro} - Verifique se o link é público ou tente novamente em instantes.`,
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
    const atualizada = [novo, ...lista.slice(0, 49)]; // Guarda até 50 itens
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
