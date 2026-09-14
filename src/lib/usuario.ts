/**
 * Módulo de Identidade e Perfil do Usuário
 *
 * Detecta e armazena em cache o perfil do usuário logado através do token do GitHub.
 * Funciona 100% no cliente (sem servidor próprio).
 */

import type { Settings } from "./settings";

export interface PerfilUsuario {
  login: string;
  nome: string;
  avatarUrl: string;
  email?: string;
  atualizadoEm: string;
}

const CHAVE_CACHE_PERFIL = "segundo-cerebro:usuario-perfil";

/**
 * Lê o perfil do usuário salvo localmente no cache do navegador.
 */
export function lerPerfilLocal(): PerfilUsuario | null {
  try {
    const salvo = localStorage.getItem(CHAVE_CACHE_PERFIL);
    if (!salvo) return null;
    return JSON.parse(salvo) as PerfilUsuario;
  } catch {
    return null;
  }
}

/**
 * Salva o perfil do usuário no cache local.
 */
export function salvarPerfilLocal(perfil: PerfilUsuario): void {
  try {
    localStorage.setItem(CHAVE_CACHE_PERFIL, JSON.stringify(perfil));
  } catch {
    /* falha silenciosa de localStorage */
  }
}

/**
 * Limpa o perfil do usuário (ex: ao trocar de token ou desconectar).
 */
export function limparPerfilLocal(): void {
  try {
    localStorage.removeItem(CHAVE_CACHE_PERFIL);
  } catch {
    /* falha silenciosa */
  }
}

/**
 * Busca os dados do usuário autenticado diretamente na API do GitHub.
 * Atualiza o cache local e devolve o perfil consolidado.
 */
export async function obterPerfilUsuario(
  cfg: Pick<Settings, "githubToken">,
  opcoes?: { forcarAtualizacao?: boolean },
): Promise<PerfilUsuario | null> {
  const token = cfg.githubToken?.trim();
  if (!token) return null;

  if (!opcoes?.forcarAtualizacao) {
    const emCache = lerPerfilLocal();
    if (emCache && emCache.login) {
      return emCache;
    }
  }

  try {
    const resposta = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });

    if (!resposta.ok) {
      // Se a requisição falhar (ex: sem rede), recorre ao cache se existir
      return lerPerfilLocal();
    }

    const dados = await resposta.json();
    const perfil: PerfilUsuario = {
      login: dados.login || "",
      nome: dados.name || dados.login || "Usuário Klaus",
      avatarUrl: dados.avatar_url || `https://github.com/${dados.login || "ghost"}.png`,
      email: dados.email || undefined,
      atualizadoEm: new Date().toISOString(),
    };

    salvarPerfilLocal(perfil);
    return perfil;
  } catch {
    // Modo offline resiliente: devolve cache existente
    return lerPerfilLocal();
  }
}
