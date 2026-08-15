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
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return { ...PADRAO };
    return limpar({ ...PADRAO, ...JSON.parse(bruto) });
  } catch {
    return { ...PADRAO };
  }
}

export function salvarConfig(s: Settings): Settings {
  const limpo = limpar(s);
  localStorage.setItem(CHAVE, JSON.stringify(limpo));
  return limpo;
}

/** O app só consegue ler/escrever se estes três estiverem preenchidos. */
export function configCompleta(s: Settings): boolean {
  return Boolean(s.githubToken && s.repoOwner && s.repoName);
}
