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
};

const CHAVE = "segundo-cerebro:config";

export const PADRAO: Settings = {
  githubToken: "",
  repoOwner: "",
  repoName: "segundo-cerebro-dados",
  branch: "main",
  geminiKey: "",
  geminiModel: "gemini-2.5-flash",
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
    v.replace(/[\s\u200B-\u200D\uFEFF]/g, "");
  return {
    ...s,
    githubToken: tirarInvisiveis(s.githubToken),
    geminiKey: tirarInvisiveis(s.geminiKey),
    repoOwner: tirarInvisiveis(s.repoOwner),
    repoName: tirarInvisiveis(s.repoName),
    branch: tirarInvisiveis(s.branch) || "main",
    geminiModel: s.geminiModel.trim(),
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
