/**
 * Módulo de Gerenciamento de Workspaces (Espaços de Trabalho)
 *
 * Permite alternar entre repositórios diferentes (ex: Espaço Pessoal ⇄ Espaço da Equipe)
 * com isolamento de cache e migração transparente das configurações legadas.
 */

import { lerConfig, salvarConfig, type Settings } from "./settings";
import { invalidarCache } from "./repo";

export interface WorkspaceConfig {
  id: string;
  nome: string;
  tipo: "pessoal" | "equipe";
  repoOwner: string;
  repoName: string;
  branch: string;
  githubToken?: string; // Se omitido, herda o token global configurado
  cor?: string; // Cor de identificação visual (ex: "#3b82f6")
  icone?: string; // Nome de ícone ou emoji
}

const CHAVE_WORKSPACES = "segundo-cerebro:workspaces";
const CHAVE_WORKSPACE_ATIVO = "segundo-cerebro:workspace-ativo";
export const EVENTO_WORKSPACE_ALTERADO = "klaus-workspace-alterado";

/**
 * Cria a configuração padrão a partir do Settings atual.
 */
function criarWorkspacePessoalPadrao(cfg: Settings): WorkspaceConfig {
  return {
    id: "pessoal",
    nome: "Meu Klaus Pessoal",
    tipo: "pessoal",
    repoOwner: cfg.repoOwner || "",
    repoName: cfg.repoName || "",
    branch: cfg.branch || "main",
    cor: "#6366f1", // Índigo elegante
    icone: "User",
  };
}

/**
 * Retorna a lista de todos os workspaces configurados no navegador.
 * Se nenhum existir, realiza a migração automática das configurações atuais.
 */
export function listarWorkspaces(): WorkspaceConfig[] {
  try {
    const salvo = localStorage.getItem(CHAVE_WORKSPACES);
    if (salvo) {
      const lista = JSON.parse(salvo);
      if (Array.isArray(lista) && lista.length > 0) {
        return lista;
      }
    }
  } catch {}

  // Migração automática a partir do Settings
  const cfg = lerConfig();
  const padrao = criarWorkspacePessoalPadrao(cfg);
  salvarWorkspaces([padrao]);
  salvarIdWorkspaceAtivo(padrao.id);
  return [padrao];
}

/**
 * Salva a lista de workspaces no localStorage.
 */
export function salvarWorkspaces(workspaces: WorkspaceConfig[]): void {
  try {
    localStorage.setItem(CHAVE_WORKSPACES, JSON.stringify(workspaces));
  } catch {}
}

/**
 * Retorna o ID do workspace atualmente selecionado.
 */
export function obterIdWorkspaceAtivo(): string {
  try {
    const salvo = localStorage.getItem(CHAVE_WORKSPACE_ATIVO);
    if (salvo) return salvo;
  } catch {}
  return "pessoal";
}

/**
 * Salva o ID do workspace ativo no localStorage.
 */
export function salvarIdWorkspaceAtivo(id: string): void {
  try {
    localStorage.setItem(CHAVE_WORKSPACE_ATIVO, id);
  } catch {}
}

/**
 * Retorna a configuração completa do workspace ativo.
 */
export function obterWorkspaceAtivo(): WorkspaceConfig {
  const lista = listarWorkspaces();
  const idAtivo = obterIdWorkspaceAtivo();
  const encontrado = lista.find((w) => w.id === idAtivo);
  return encontrado || lista[0] || criarWorkspacePessoalPadrao(lerConfig());
}

/**
 * Alterna para outro workspace, atualizando as configurações ativas,
 * invalidando os caches do repositório em memória e notificando os componentes.
 */
export function alternarWorkspace(id: string): boolean {
  const lista = listarWorkspaces();
  const destino = lista.find((w) => w.id === id);
  if (!destino) return false;

  salvarIdWorkspaceAtivo(id);

  // Sincroniza as variáveis de repositório nas Settings globais
  const cfg = lerConfig();
  const novaCfg: Settings = {
    ...cfg,
    repoOwner: destino.repoOwner,
    repoName: destino.repoName,
    branch: destino.branch,
    ...(destino.githubToken ? { githubToken: destino.githubToken } : {}),
  };
  salvarConfig(novaCfg);

  // Invalida cache de repo para não misturar conteúdos entre repositórios diferentes
  invalidarCache();

  // Dispara evento reativo para recarregar telas e componentes
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENTO_WORKSPACE_ALTERADO, { detail: { workspace: destino } }),
    );
  }

  return true;
}

/**
 * Adiciona ou atualiza um workspace.
 */
export function salvarWorkspace(ws: WorkspaceConfig): void {
  const lista = listarWorkspaces();
  const idx = lista.findIndex((w) => w.id === ws.id);

  let novaLista: WorkspaceConfig[];
  if (idx >= 0) {
    novaLista = [...lista];
    novaLista[idx] = ws;
  } else {
    novaLista = [...lista, ws];
  }

  salvarWorkspaces(novaLista);

  // Se o workspace salvo for o ativo, sincroniza as Settings
  if (ws.id === obterIdWorkspaceAtivo()) {
    const cfg = lerConfig();
    salvarConfig({
      ...cfg,
      repoOwner: ws.repoOwner,
      repoName: ws.repoName,
      branch: ws.branch,
      ...(ws.githubToken ? { githubToken: ws.githubToken } : {}),
    });
    invalidarCache();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(EVENTO_WORKSPACE_ALTERADO, { detail: { workspace: ws } }),
      );
    }
  }
}

/**
 * Remove um workspace. Não permite remover o último restante.
 */
export function removerWorkspace(id: string): boolean {
  const lista = listarWorkspaces();
  if (lista.length <= 1) return false; // Impede remoção se só tiver um

  const novaLista = lista.filter((w) => w.id !== id);
  salvarWorkspaces(novaLista);

  if (obterIdWorkspaceAtivo() === id) {
    alternarWorkspace(novaLista[0].id);
  }

  return true;
}
