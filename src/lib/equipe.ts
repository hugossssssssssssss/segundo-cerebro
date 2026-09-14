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
 * Carrega a configuração da equipe (`equipe.json`) do repositório.
 * Se o arquivo ainda não existir, devolve a configuração padrão com o usuário atual como dono.
 */
export async function carregarEquipe(
  cfg: Settings,
  usuarioAtual?: PerfilUsuario | null,
): Promise<{ config: ConfigEquipe; sha?: string }> {
  try {
    const res = await ler(cfg, CAMINHO_EQUIPE, { silenciar404: true });
    if (res.texto) {
      const parsed = JSON.parse(res.texto) as ConfigEquipe;
      // Garante integridade básica de array
      if (!Array.isArray(parsed.membros)) {
        parsed.membros = [];
      }
      return { config: parsed, sha: res.sha };
    }
  } catch (e) {
    if (e instanceof ErroGitHub && e.status === 404) {
      // Arquivo ainda não existe no repositório; estado padrão esperado
    }
  }

  return { config: criarConfigEquipePadrao(usuarioAtual) };
}

/**
 * Salva a configuração da equipe no repositório (`equipe.json`).
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
  return await gravar(
    cfg,
    CAMINHO_EQUIPE,
    jsonFormatado,
    sha,
    `atualiza equipe.json (${autorLogin || "klaus"})`,
  );
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
