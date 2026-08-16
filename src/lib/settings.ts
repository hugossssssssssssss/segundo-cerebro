/**
 * Configuração do app — fica no localStorage do navegador.
 *
 * Nada disto vai para o código nem para o repositório público.
 * O token e a chave existem só no navegador do Hugo.
 */

export type Settings = {
  /** Token fine-grained do GitHub, com permissão de Contents no repo de dados */
  githubToken: string;
  /** Dono do repositório, ex: "hugosilva" */
  repoOwner: string;
  /** Nome do repositório de dados, ex: "segundo-cerebro-dados" */
  repoName: string;
  /** Branch onde os arquivos vivem */
  branch: string;
  /** Chave da API do Gemini (usada só na tela de Chat) */
  geminiKey: string;
  /** Modelo do Gemini */
  geminiModel: string;

  /** Token do bot do Telegram para notificações */
  telegramBotToken?: string;
  /** Chat ID do usuário no Telegram */
  telegramChatId?: string;
  /** Se as notificações por Telegram estão ativas */
  inboxTelegramAtivo?: boolean;
  /** Modo do Telegram: "imediatamente", "inatividade" ou "ambos" */
  inboxTelegramModo?: "imediatamente" | "inatividade" | "ambos";
  /** Horas sem visualizar até escalar notificação (ex: 3) */
  inboxEscalaHoras?: number;

  /** URL da Webhook do Google Apps Script para e-mail */
  googleAppsScriptUrl?: string;
  /** Se o envio por e-mail está ativo */
  googleEmailAtivo?: boolean;
};

const CHAVE = "segundo-cerebro:config";
const CHAVE_OFUSCADA = "segundo-cerebro:config:enc";
const CHAVE_SALT = "segundo-cerebro:device-salt";

/**
 * Chave de ofuscação persistida no localStorage do navegador/dispositivo.
 * Permite que a configuração decodifique com sucesso após recarregar a página (F5).
 */
let sessionKeyBuffer: Uint8Array | null = null;

function obterSaltSessao(): Uint8Array {
  if (sessionKeyBuffer) return sessionKeyBuffer;

  // 1. Tenta carregar o salt persistido do localStorage
  try {
    const salvo = typeof window !== "undefined" ? localStorage.getItem(CHAVE_SALT) : null;
    if (salvo) {
      const binStr = atob(salvo);
      const arr = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        arr[i] = binStr.charCodeAt(i);
      }
      sessionKeyBuffer = arr;
      return arr;
    }
  } catch {
    // se falhar ao ler do localStorage, gera novo
  }

  // 2. Se não existir salt salvo, gera novo salt de 32 bytes
  const arr = new Uint8Array(32);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(arr as any);
  } else {
    arr.fill(42);
  }

  // 3. Salva o novo salt no localStorage para futuras leituras nesta origem/dispositivo
  try {
    let binStr = "";
    arr.forEach((b) => (binStr += String.fromCharCode(b)));
    if (typeof window !== "undefined") {
      localStorage.setItem(CHAVE_SALT, btoa(binStr));
    }
  } catch {
    // ignora se localStorage estiver desativado
  }

  sessionKeyBuffer = arr;
  return arr;
}

/**
 * Deriva uma chave AES-GCM usando PBKDF2 via WebCrypto Nativa.
 */
export async function derivarChaveWebCrypto(senha: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(senha),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function codificarTexto(texto: string): string {
  if (!texto) return "";
  try {
    const bytes = new TextEncoder().encode(texto);
    const saltBytes = obterSaltSessao();
    const xorBytes = bytes.map((b, i) => b ^ saltBytes[i % saltBytes.length]);
    let binario = "";
    xorBytes.forEach((b) => (binario += String.fromCharCode(b)));
    return btoa(binario);
  } catch {
    return texto;
  }
}

function decodificarTexto(b64: string): string {
  if (!b64) return "";
  try {
    const binario = atob(b64);
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    const saltBytes = obterSaltSessao();
    const xorBytes = bytes.map((b, i) => b ^ saltBytes[i % saltBytes.length]);
    return new TextDecoder().decode(xorBytes);
  } catch {
    return b64;
  }
}

export const PADRAO: Settings = {
  githubToken: "",
  repoOwner: "",
  repoName: "segundo-cerebro-dados",
  branch: "main",
  geminiKey: "",
  geminiModel: "gemini-2.5-flash",

  telegramBotToken: "",
  telegramChatId: "",
  inboxTelegramAtivo: false,
  inboxTelegramModo: "ambos",
  inboxEscalaHoras: 3,

  googleAppsScriptUrl: "",
  googleEmailAtivo: false,
};

/**
 * Limpa o que veio de copiar e colar.
 *
 * Colar um token costuma trazer espaço ou quebra de linha junto. Uma quebra de
 * linha dentro do cabeçalho Authorization torna a requisição inválida e o
 * navegador aborta com "Failed to fetch" — erro que não diz nada ao usuário.
 * Por isso a limpeza acontece aqui, no ponto de entrada, e não em cada uso.
 */
function limpar(s: Settings): Settings {
  const tirarInvisiveis = (v: string) =>
    (v || "").replace(/[\s\u200B-\u200D\uFEFF]/g, "");
  return {
    ...s,
    githubToken: tirarInvisiveis(s.githubToken),
    geminiKey: tirarInvisiveis(s.geminiKey),
    repoOwner: tirarInvisiveis(s.repoOwner),
    repoName: tirarInvisiveis(s.repoName),
    branch: tirarInvisiveis(s.branch) || "main",
    geminiModel: (s.geminiModel || "gemini-2.5-flash").trim(),
    telegramBotToken: tirarInvisiveis(s.telegramBotToken || ""),
    telegramChatId: (s.telegramChatId || "").trim(),
    inboxTelegramAtivo: Boolean(s.inboxTelegramAtivo),
    inboxTelegramModo: s.inboxTelegramModo || "ambos",
    inboxEscalaHoras: Number(s.inboxEscalaHoras) || 3,
    googleAppsScriptUrl: (s.googleAppsScriptUrl || "").trim(),
    googleEmailAtivo: Boolean(s.googleEmailAtivo),
  };
}

export function lerConfig(): Settings {
  try {
    // 1. Tenta ler o formato protegido
    const enc = localStorage.getItem(CHAVE_OFUSCADA);
    if (enc) {
      const decodificado = decodificarTexto(enc);
      const parsed = JSON.parse(decodificado);
      return limpar({ ...PADRAO, ...parsed });
    }

    // 2. Fallback para formato antigo em texto puro (migração transparente)
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return { ...PADRAO };

    const parsedLegacy = JSON.parse(bruto);
    const configLimpa = limpar({ ...PADRAO, ...parsedLegacy });

    // Migra automaticamente para o formato protegido e remove o antigo
    salvarConfig(configLimpa);
    localStorage.removeItem(CHAVE);

    return configLimpa;
  } catch {
    return { ...PADRAO };
  }
}

export function salvarConfig(s: Settings): Settings {
  const limpo = limpar(s);
  const jsonStr = JSON.stringify(limpo);
  const encStr = codificarTexto(jsonStr);

  localStorage.setItem(CHAVE_OFUSCADA, encStr);
  // Remove o armazenamento legado sem proteção
  localStorage.removeItem(CHAVE);

  return limpo;
}

/** O app só consegue ler/escrever se estes três estiverem preenchidos. */
export function configCompleta(s: Settings): boolean {
  return Boolean(s.githubToken && s.repoOwner && s.repoName);
}
