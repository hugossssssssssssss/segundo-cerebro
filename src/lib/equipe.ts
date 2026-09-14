/**
 * Módulo de Gestão de Equipe e Permissões do Klaus
 *
 * Controla os membros da equipe, papéis hierárquicos e permissões no repositório.
 * Os dados vivem em `equipe.json` no repositório compartilhado.
 */

import type { Settings } from "./settings";
import type { PerfilUsuario } from "./usuario";
import { ler, gravar, ErroGitHub } from "./github";

export const CAMINHO_EQUIPE = "equipe.json";

export type PapelEquipe = "dono" | "admin" | "membro" | "leitor";

export interface MembroEquipe {
  login: string;
  nome: string;
  papel: PapelEquipe;
  avatar?: string;
  ativo: boolean;
  adicionadoEm?: string;
}

export interface ConfigEquipe {
  versao_schema: number;
  nome_equipe: string;
  atualizado_em: string;
  atualizado_por?: string;
  membros: MembroEquipe[];
}

export interface PermissoesPapel {
  gerenciarMembros: boolean;
  gerenciarConfig: boolean;
  excluirEntregas: boolean;
  editarTudo: boolean;
  atribuirTarefas: boolean;
}

export const TABELA_PERMISSOES: Record<PapelEquipe, PermissoesPapel> = {
  dono: {
    gerenciarMembros: true,
    gerenciarConfig: true,
    excluirEntregas: true,
    editarTudo: true,
    atribuirTarefas: true,
  },
  admin: {
    gerenciarMembros: false,
    gerenciarConfig: false,
    excluirEntregas: true,
    editarTudo: true,
    atribuirTarefas: true,
  },
  membro: {
    gerenciarMembros: false,
    gerenciarConfig: false,
    excluirEntregas: false,
    editarTudo: true,
    atribuirTarefas: true,
  },
  leitor: {
    gerenciarMembros: false,
    gerenciarConfig: false,
    excluirEntregas: false,
    editarTudo: false,
    atribuirTarefas: false,
  },
};

/**
 * Retorna as permissões para um determinado papel.
 */
export function obterPermissoes(papel: PapelEquipe): PermissoesPapel {
  return TABELA_PERMISSOES[papel] || TABELA_PERMISSOES.membro;
}

/**
 * Cria a estrutura inicial padrão para uma nova equipe ou repositório pessoal.
 */
export function criarConfigEquipePadrao(usuario?: PerfilUsuario | null): ConfigEquipe {
  const loginDono = usuario?.login || "usuario";
  const nomeDono = usuario?.nome || "Responsável";
  const avatarDono = usuario?.avatarUrl || `https://github.com/${loginDono}.png`;

  return {
    versao_schema: 1,
    nome_equipe: "Minha Equipe",
    atualizado_em: new Date().toISOString(),
    atualizado_por: loginDono,
    membros: [
      {
        login: loginDono,
        nome: nomeDono,
        papel: "dono",
        avatar: avatarDono,
        ativo: true,
        adicionadoEm: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Mescla duas listas de membros de equipe por login, garantindo que nenhum membro
 * adicionado simultaneamente em outro aparelho seja descartado.
 */
export function mesclarMembrosEquipe(
  locais: MembroEquipe[],
  remotos: MembroEquipe[],
): MembroEquipe[] {
  const mapa = new Map<string, MembroEquipe>();

  for (const m of remotos) {
    if (m && m.login) {
      mapa.set(m.login.toLowerCase().trim(), m);
    }
  }

  for (const m of locais) {
    if (m && m.login) {
      const chave = m.login.toLowerCase().trim();
      const existente = mapa.get(chave);
      mapa.set(chave, {
        ...(existente || {}),
        ...m,
      });
    }
  }

  return Array.from(mapa.values());
}

/**
 * Carrega a configuração da equipe (`equipe.json`) do repositório.
 * Se o arquivo não existir (404), devolve a configuração padrão.
 * Se o arquivo existir mas estiver corrompido (SyntaxError), LANÇA ERRO para não sobrescrever.
 */
export async function carregarEquipe(
  cfg: Settings,
  usuarioAtual?: PerfilUsuario | null,
): Promise<{ config: ConfigEquipe; sha?: string }> {
  let res: { texto: string; sha: string } | null = null;
  try {
    res = await ler(cfg, CAMINHO_EQUIPE, { silenciar404: true });
  } catch (e) {
    if (e instanceof ErroGitHub && e.status === 404) {
      return { config: criarConfigEquipePadrao(usuarioAtual) };
    }
    throw e;
  }

  if (!res || !res.texto.trim()) {
    return { config: criarConfigEquipePadrao(usuarioAtual) };
  }

  try {
    const parsed = JSON.parse(res.texto) as ConfigEquipe;
    if (!Array.isArray(parsed.membros)) {
      parsed.membros = [];
    }
    return { config: parsed, sha: res.sha };
  } catch (parseErr) {
    throw new Error(
      `O arquivo ${CAMINHO_EQUIPE} no repositório contém erros de formatação JSON e não pôde ser lido. Corrija-o no GitHub para evitar perda de dados dos colaboradores.`,
    );
  }
}

/**
 * Salva a configuração da equipe no repositório (`equipe.json`).
 * Se houver conflito 409 (outro admin editou a equipe simultaneamente),
 * realiza a união automática dos membros para não apagar ninguém.
 */
export async function salvarEquipe(
  cfg: Settings,
  config: ConfigEquipe,
  sha?: string,
  autorLogin?: string,
): Promise<string> {
  const configAtualizada: ConfigEquipe = {
    ...config,
    atualizado_em: new Date().toISOString(),
    atualizado_por: autorLogin || config.atualizado_por,
  };

  const jsonFormatado = JSON.stringify(configAtualizada, null, 2);

  try {
    return await gravar(
      cfg,
      CAMINHO_EQUIPE,
      jsonFormatado,
      sha,
      `atualiza equipe.json (${autorLogin || "klaus"})`,
    );
  } catch (e) {
    if (e instanceof ErroGitHub && e.status === 409) {
      // Concorrência: busca versão remota fresca e mescla membros
      try {
        const remoto = await carregarEquipe(cfg, null);
        const membrosMesclados = mesclarMembrosEquipe(config.membros, remoto.config.membros);
        const configMesclada: ConfigEquipe = {
          ...config,
          nome_equipe: config.nome_equipe || remoto.config.nome_equipe,
          membros: membrosMesclados,
          atualizado_em: new Date().toISOString(),
          atualizado_por: autorLogin || config.atualizado_por,
        };
        return await gravar(
          cfg,
          CAMINHO_EQUIPE,
          JSON.stringify(configMesclada, null, 2),
          remoto.sha,
          `atualiza e mescla membros equipe.json (${autorLogin || "klaus"})`,
        );
      } catch (mergeErr) {
        throw mergeErr;
      }
    }
    throw e;
  }
}

/**
 * Retorna o papel de um determinado usuário dentro da equipe.
 * Se a equipe não tiver o usuário cadastrado, presume 'membro' se ele tiver permissão no repo.
 */
export function papelDoUsuario(config: ConfigEquipe, login?: string): PapelEquipe {
  if (!login) return "membro";
  const loginLimpo = login.toLowerCase().trim();
  const encontrado = config.membros.find((m) => m.login.toLowerCase().trim() === loginLimpo && m.ativo);
  return encontrado ? encontrado.papel : "membro";
}

/**
 * Verifica se um usuário possui autorização para gerenciar a equipe.
 */
export function podeGerenciarEquipe(config: ConfigEquipe, login?: string): boolean {
  const papel = papelDoUsuario(config, login);
  return obterPermissoes(papel).gerenciarMembros;
}
