/**
 * Configuração do app — fica no localStorage do navegador.
 *
 * Nada disto vai para o código nem para o repositório público.
 * O token e a chave existem só no navegador de quem está usando o app.
 */

export type Settings = {
  /**
   * Nome de quem usa o app. Aparece no campo "criado por" e é o que a IA usa
   * para se dirigir à pessoa. Vazio é estado válido: o app inteiro funciona
   * sem isto, então nada aqui pode assumir que veio preenchido.
   */
  nomeUsuario: string;
  /**
   * Área de atuação, ex: "design gráfico". Só serve para a IA calibrar o
   * vocabulário — sem isto ela apenas evita jargão técnico por padrão.
   */
  profissaoUsuario: string;
  /**
   * Marca que o passo a passo inicial já foi concluído *ou dispensado*.
   * Separado de `configCompleta` de propósito: quem pulou a configuração
   * não pode ser jogado de volta no passo a passo a cada recarregamento.
   */
  onboardingConcluido: boolean;

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
 * ⚠️ ISTO NÃO É CRIPTOGRAFIA. É OFUSCAÇÃO. ⚠️
 *
 * O token e as chaves são embaralhados com um XOR cujo salt fica no
 * `localStorage`, ao lado do próprio dado embaralhado. Quem conseguir executar
 * JavaScript nesta origem lê os dois e desfaz o XOR em três linhas — e o mesmo
 * valeria para AES-GCM, porque a chave também estaria ali do lado. Trocar o
 * algoritmo sem tirar a chave do alcance do atacante só deixaria isto com
 * cara de seguro sem ser.
 *
 * O que isto protege: olho desatento no DevTools, extensão bisbilhoteira que
 * varre `localStorage` procurando algo com cara de token.
 * O que isto NÃO protege: absolutamente nada contra XSS.
 *
 * A proteção de verdade continua pendente e exige uma senha que o usuário
 * digita e que nunca é persistida (PBKDF2 → AES-GCM, chave só em memória).
 *
 * **Não chame isto de "protegido" ou "seguro" em código, comentário ou
 * interface.** Já houve uma rodada em que o nome de uma constante fez a
 * pendência parecer resolvida.
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
 * Deriva uma chave AES-GCM usando PBKDF2 via WebCrypto nativa.
 *
 * ⚠️ ESCRITA E AINDA NÃO LIGADA EM LUGAR NENHUM. Nada no app chama esta função
 * hoje — o que roda de fato é o XOR de `codificarTexto`. Ela existe porque é a
 * metade fácil da solução; a metade que falta é decidir de onde vem a `senha`,
 * e isso muda a experiência de uso (passa a ter uma tela de destravar ao abrir
 * o app). Enquanto essa decisão não for tomada, **a presença desta função não
 * significa que a configuração esteja criptografada.**
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
  nomeUsuario: "",
  profissaoUsuario: "",
  onboardingConcluido: false,

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
    // trim e não tirarInvisiveis: nome composto tem espaço no meio, e
    // "Hugo Silva" não pode virar "HugoSilva".
    nomeUsuario: (s.nomeUsuario || "").trim(),
    profissaoUsuario: (s.profissaoUsuario || "").trim(),
    onboardingConcluido: Boolean(s.onboardingConcluido),
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
    // 1. Tenta ler o formato ofuscado (ver o aviso em sessionKeyBuffer:
    //    ofuscado ≠ protegido)
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

    // Migra automaticamente para o formato ofuscado e remove o texto puro
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
  // Remove a versão em texto puro, que era pior ainda
  localStorage.removeItem(CHAVE);

  return limpo;
}

/** O app só consegue ler/escrever se estes três estiverem preenchidos. */
export function configCompleta(s: Settings): boolean {
  return Boolean(s.githubToken && s.repoOwner && s.repoName);
}

/**
 * Como a interface se refere a quem está usando — em "criado por", por exemplo.
 *
 * Cai para o usuário do GitHub antes de desistir, porque quem pulou o campo de
 * nome no passo a passo ainda assim configurou a conta, e ver o próprio
 * usuário do GitHub ali é melhor que ver "Você".
 */
export function nomeExibido(s: Settings): string {
  return s.nomeUsuario.trim() || s.repoOwner.trim() || "Você";
}

/**
 * Decide se o passo a passo inicial deve aparecer.
 *
 * Quem já tem configuração válida nunca vê — inclusive quem usava o app antes
 * deste campo existir, cuja config gravada não tem `onboardingConcluido`.
 */
export function precisaOnboarding(s: Settings): boolean {
  return !configCompleta(s) && !s.onboardingConcluido;
}
