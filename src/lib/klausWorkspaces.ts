/**
 * Klaus Workspaces Core Module
 *
 * Permite alternar entre repositórios diferentes (ex: Espaço Pessoal ⇄ Espaço da Equipe)
 * com isolamento de cache e migração transparente das configurações legadas.
 */

import { lerConfig, salvarConfig, codificarTexto, decodificarTexto, type Settings } from "./settings";
import { invalidarCache } from "./repo";
import { dispararAtualizacaoAcervo } from "./eventos";
import { lerOuVazio, gravar } from "./github";

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

export type KlausWorkspace = WorkspaceConfig;
export type { KlausWorkspaceType } from "./klaus.types";

import { KLAUS_STORAGE, getKlausItem, setKlausItem } from "./klausStorage";
import { KLAUS_EVENTS, dispatchKlausEvent } from "./klausEvents";

const CHAVE_WORKSPACES = KLAUS_STORAGE.WORKSPACES_LIST;
const CHAVE_WORKSPACE_ATIVO = KLAUS_STORAGE.WORKSPACES_ACTIVE;
const CHAVE_TOKEN_GLOBAL_BASE = KLAUS_STORAGE.AUTH_GLOBAL_TOKEN;
export const EVENTO_WORKSPACE_ALTERADO = KLAUS_EVENTS.WORKSPACE_CHANGE;

/**
 * Lê o token global base do usuário (definido nas Configurações principais).
 */
export function obterTokenGlobalBase(): string {
  try {
    const enc = getKlausItem(CHAVE_TOKEN_GLOBAL_BASE);
    if (enc) {
      const dec = decodificarTexto(enc);
      if (dec) return dec.trim();
    }
  } catch {}
  return "";
}

/**
 * Salva o token global base do usuário de forma ofuscada.
 */
export function salvarTokenGlobalBase(token: string): void {
  if (!token) return;
  try {
    setKlausItem(CHAVE_TOKEN_GLOBAL_BASE, codificarTexto(token.trim()));
  } catch {}
}

/**
 * Cria a configuração padrão a partir do Settings atual.
 */
function criarWorkspacePessoalPadrao(cfg: Settings): WorkspaceConfig {
  if (cfg.githubToken) {
    salvarTokenGlobalBase(cfg.githubToken);
  }
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
    const salvo = getKlausItem(CHAVE_WORKSPACES);
    if (salvo) {
      const lista: WorkspaceConfig[] = JSON.parse(salvo);
      if (Array.isArray(lista) && lista.length > 0) {
        return lista.map((ws) => {
          if (ws.githubToken && ws.githubToken.startsWith("enc_")) {
            return { ...ws, githubToken: decodificarTexto(ws.githubToken.slice(4)) };
          }
          return ws;
        });
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
 * Salva a lista de workspaces no localStorage, protegendo tokens individuais.
 */
export function salvarWorkspaces(workspaces: WorkspaceConfig[]): void {
  try {
    const paraSalvar = workspaces.map((ws) => {
      if (ws.githubToken) {
        return {
          ...ws,
          githubToken: ws.githubToken.startsWith("enc_")
            ? ws.githubToken
            : `enc_${codificarTexto(ws.githubToken)}`,
        };
      }
      return ws;
    });
    setKlausItem(CHAVE_WORKSPACES, JSON.stringify(paraSalvar));
  } catch {}
}

/**
 * Retorna o ID do workspace atualmente selecionado.
 */
export function obterIdWorkspaceAtivo(): string {
  try {
    const salvo = getKlausItem(CHAVE_WORKSPACE_ATIVO);
    if (salvo) return salvo;
  } catch {}
  return "pessoal";
}

/**
 * Salva o ID do workspace ativo no localStorage.
 */
export function salvarIdWorkspaceAtivo(id: string): void {
  try {
    setKlausItem(CHAVE_WORKSPACE_ATIVO, id);
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
  if (cfg.githubToken && !obterTokenGlobalBase()) {
    salvarTokenGlobalBase(cfg.githubToken);
  }

  // Se o workspace de destino não tem token próprio, restaura o token global base
  const tokenParaUsar = destino.githubToken?.trim() || obterTokenGlobalBase() || cfg.githubToken;

  const novaCfg: Settings = {
    ...cfg,
    repoOwner: destino.repoOwner,
    repoName: destino.repoName,
    branch: destino.branch,
    githubToken: tokenParaUsar,
  };
  salvarConfig(novaCfg);

  // Invalida cache de repo para não misturar conteúdos entre repositórios diferentes
  invalidarCache();

  // Dispara atualização reativa do acervo (sem filtro de pasta, atinge todas as telas abertas)
  dispararAtualizacaoAcervo();

  // Dispara evento reativo para recarregar telas e componentes
  dispatchKlausEvent(KLAUS_EVENTS.WORKSPACE_CHANGE, { workspace: destino });

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
    const tokenParaUsar = ws.githubToken?.trim() || obterTokenGlobalBase() || cfg.githubToken;
    salvarConfig({
      ...cfg,
      repoOwner: ws.repoOwner,
      repoName: ws.repoName,
      branch: ws.branch,
      githubToken: tokenParaUsar,
    });
    invalidarCache();
    dispararAtualizacaoAcervo();
    dispatchKlausEvent(KLAUS_EVENTS.WORKSPACE_CHANGE, { workspace: ws });
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

// ── Manifesto de Workspace (.klaus/workspace.json) ───────────────────────────
export const CAMINHO_MANIFESTO_WORKSPACE = ".klaus/workspace.json";

export interface KlausWorkspaceManifest {
  versao: number;
  id: string;
  nome: string;
  tipo: "pessoal" | "equipe";
  cor?: string;
  icone?: string;
  descricao?: string;
  criadoPor?: string;
  criadoEm?: string;
}

export interface ConviteWorkspacePayload {
  id: string;
  nome: string;
  tipo: "pessoal" | "equipe";
  repoOwner: string;
  repoName: string;
  branch: string;
  cor?: string;
  icone?: string;
  descricao?: string;
  convidadoPor?: string;
  geradoEm?: string;
}

/**
 * Lê o manifesto do workspace (.klaus/workspace.json) diretamente do repositório.
 */
export async function carregarManifestoWorkspace(
  cfg: Pick<Settings, "repoOwner" | "repoName" | "branch" | "githubToken">,
): Promise<KlausWorkspaceManifest | null> {
  try {
    const texto = await lerOuVazio(cfg as Settings, CAMINHO_MANIFESTO_WORKSPACE);
    if (!texto || !texto.trim()) return null;
    const parsed = JSON.parse(texto);
    if (parsed && typeof parsed.nome === "string") {
      return parsed as KlausWorkspaceManifest;
    }
  } catch {}
  return null;
}

/**
 * Salva o manifesto canônico do workspace (.klaus/workspace.json) no repositório.
 */
export async function salvarManifestoWorkspace(
  cfg: Pick<Settings, "repoOwner" | "repoName" | "branch" | "githubToken">,
  manifesto: KlausWorkspaceManifest,
): Promise<string> {
  const json = JSON.stringify(manifesto, null, 2);
  return await gravar(
    cfg as Settings,
    CAMINHO_MANIFESTO_WORKSPACE,
    json,
    undefined,
    `atualiza manifesto do workspace (.klaus/workspace.json)`,
  );
}

/**
 * Gera um link de convite seguro para compartilhar um espaço com um colega.
 * O token pessoal do usuário NUNCA é incluído no link.
 */
export function gerarLinkConviteWorkspace(
  ws: WorkspaceConfig,
  convidadoPor?: string,
  urlBase?: string,
): string {
  const payload: ConviteWorkspacePayload = {
    id: ws.id,
    nome: ws.nome,
    tipo: ws.tipo,
    repoOwner: ws.repoOwner,
    repoName: ws.repoName,
    branch: ws.branch || "main",
    cor: ws.cor,
    icone: ws.icone,
    convidadoPor: convidadoPor || ws.repoOwner,
    geradoEm: new Date().toISOString(),
  };

  const json = JSON.stringify(payload);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  const base = urlBase || (typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "");
  return `${base}#/convite?dados=${encodeURIComponent(base64)}`;
}

/**
 * Decodifica um token/payload de convite em Base64.
 */
export function decodificarConviteWorkspace(
  dadosCodificados: string,
): ConviteWorkspacePayload | null {
  if (!dadosCodificados) return null;
  try {
    const limpo = decodeURIComponent(dadosCodificados.trim());
    const json = decodeURIComponent(escape(atob(limpo)));
    const parsed = JSON.parse(json) as ConviteWorkspacePayload;
    if (parsed && parsed.repoOwner && parsed.repoName) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Nomes Canônicos do Klaus SDK ─────────────────────────────────────────────
export const loadKlausWorkspaces = listarWorkspaces;
export const getActiveKlausWorkspace = obterWorkspaceAtivo;
export const setActiveKlausWorkspace = alternarWorkspace;
export const saveKlausWorkspace = salvarWorkspace;
export const removeKlausWorkspace = removerWorkspace;
export const loadKlausWorkspaceManifest = carregarManifestoWorkspace;
export const saveKlausWorkspaceManifest = salvarManifestoWorkspace;
export const createKlausWorkspaceInviteLink = gerarLinkConviteWorkspace;
export const decodeKlausWorkspaceInvite = decodificarConviteWorkspace;

