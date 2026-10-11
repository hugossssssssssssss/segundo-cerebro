/**
 * Klaus Beacon - Detecção de Concorrência e Frescor de Arquivos
 *
 * Consulta o histórico de commits do GitHub para alertar quando outro membro da equipe
 * acabou de salvar alterações no mesmo documento.
 *
 * Utiliza cache em memória de 45s para economizar requisições e evitar bater no rate limit.
 */

import type { Settings } from "./settings";
import { limparToken } from "./settings";
import { lerPerfilLocal } from "./usuario";

export interface StatusFrescorArquivo {
  temCommit: boolean;
  sha?: string;
  autorLogin?: string;
  autorNome?: string;
  autorAvatar?: string;
  mensagem?: string;
  dataIso?: string;
  minutosAtras?: number;
  ehRecente: boolean;
  ehOutroAutor: boolean;
}

interface CacheEntradaBeacon {
  status: StatusFrescorArquivo;
  expiraEm: number;
}

const cacheBeacon = new Map<string, CacheEntradaBeacon>();
const TEMPO_CACHE_MS = 45_000; // 45 segundos

/**
 * Limpa o cache do Beacon (útil para testes e recarregamentos forçados).
 */
export function limparCacheBeacon(): void {
  cacheBeacon.clear();
}

/**
 * Consulta o commit mais recente de um arquivo específico no repositório do GitHub.
 *
 * @param cfg Configurações ativas do usuário e repositório
 * @param caminho Caminho relativo do arquivo (ex: "notas/briefing.md")
 * @param limiteMinutos Considerado recente se menor ou igual a este limite (padrão: 15 minutos)
 */
export async function verificarFrescorArquivo(
  cfg: Pick<Settings, "repoOwner" | "repoName" | "branch" | "githubToken">,
  caminho: string,
  limiteMinutos = 15,
): Promise<StatusFrescorArquivo> {
  const caminhoLimpo = caminho?.trim();
  if (!caminhoLimpo || !cfg.repoOwner || !cfg.repoName || !cfg.githubToken) {
    return { temCommit: false, ehRecente: false, ehOutroAutor: false };
  }

  const chaveCache = `${cfg.repoOwner}/${cfg.repoName}:${cfg.branch || "main"}:${caminhoLimpo}`;
  const emCache = cacheBeacon.get(chaveCache);
  if (emCache && Date.now() < emCache.expiraEm) {
    return emCache.status;
  }

  const token = limparToken(cfg.githubToken);
  const branch = cfg.branch || "main";
  const url = `https://api.github.com/repos/${cfg.repoOwner}/${cfg.repoName}/commits?path=${encodeURIComponent(
    caminhoLimpo,
  )}&sha=${encodeURIComponent(branch)}&page=1&per_page=1`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!res.ok) {
      const falhaPadrao: StatusFrescorArquivo = { temCommit: false, ehRecente: false, ehOutroAutor: false };
      return falhaPadrao;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      const semCommit: StatusFrescorArquivo = { temCommit: false, ehRecente: false, ehOutroAutor: false };
      cacheBeacon.set(chaveCache, { status: semCommit, expiraEm: Date.now() + TEMPO_CACHE_MS });
      return semCommit;
    }

    const primeiro = data[0];
    const sha = (primeiro.sha || "").substring(0, 7);
    const autorLogin = (primeiro.author?.login || primeiro.commit?.author?.name || "").toLowerCase().trim();
    const autorNome = primeiro.commit?.author?.name || autorLogin;
    const autorAvatar = primeiro.author?.avatar_url || `https://github.com/${autorLogin || "ghost"}.png`;
    const mensagem = (primeiro.commit?.message || "").split("\n")[0];
    const dataIso = primeiro.commit?.author?.date || new Date().toISOString();

    const dataCommit = new Date(dataIso).getTime();
    const minutosAtras = Math.max(0, Math.floor((Date.now() - dataCommit) / 60_000));
    const ehRecente = minutosAtras <= limiteMinutos;

    // Detecta usuário atual para checar se foi outra pessoa
    const perfilLocal = lerPerfilLocal();
    const loginAtual = (perfilLocal?.login || cfg.repoOwner || "").toLowerCase().trim();
    const ehOutroAutor = Boolean(autorLogin && loginAtual && autorLogin !== loginAtual);

    const resultado: StatusFrescorArquivo = {
      temCommit: true,
      sha,
      autorLogin: primeiro.author?.login || autorLogin,
      autorNome,
      autorAvatar,
      mensagem,
      dataIso,
      minutosAtras,
      ehRecente,
      ehOutroAutor,
    };

    cacheBeacon.set(chaveCache, { status: resultado, expiraEm: Date.now() + TEMPO_CACHE_MS });
    return resultado;
  } catch {
    return { temCommit: false, ehRecente: false, ehOutroAutor: false };
  }
}
