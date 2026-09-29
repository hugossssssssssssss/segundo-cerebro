/**
 * Klaus Projects & Extensions Core Module
 *
 * Permite que ferramentas do Klaus e mini-aplicativos customizados
 * vivam no repositório privado do usuário (.klaus/projetos.json e .klaus/projetos/)
 * com catálogo nativo, ativação opcional e integração completa com layout/sistema.
 */

import type { Settings } from "./settings";
import { ler, gravar } from "./github";
import { sincronizarExtensaoNoMenu } from "./klausMenu";
import { KLAUS_STORAGE, getKlausItem, setKlausItem } from "./klausStorage";
import { KLAUS_EVENTS, dispatchKlausEvent } from "./klausEvents";

export type TipoExtensao =
  | "nativa"
  | "url_integrada"
  | "codigo_customizado"
  | "dashboard_markdown";

export type CategoriaExtensao =
  | "design"
  | "produtividade"
  | "ia"
  | "utilitarios"
  | "pessoal";

export interface ProjetoExtensao {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  cor?: string;
  categoria: CategoriaExtensao;
  tipo: TipoExtensao;
  ativo: boolean;
  origem: "catalogo" | "usuario";
  rota?: string;
  urlEmbed?: string;
  codigoHtml?: string;
  caminhoPastaMarkdown?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export type KlausProject = ProjetoExtensao;
export type KlausExtension = ProjetoExtensao;
export type { KlausExtensionType, KlausExtensionCategory } from "./klaus.types";

export const CAMINHO_PROJETOS_CONFIG = ".klaus/projetos.json";
export const PASTA_PROJETOS_CUSTOMIZADOS = ".klaus/projetos";
export const CHAVE_STORAGE_PROJETOS = KLAUS_STORAGE.PROJECTS_REGISTRY;
export const EVENTO_PROJETOS_ALTERADOS = KLAUS_EVENTS.PROJECTS_UPDATE;

/**
 * Catálogo mestre de extensões nativas disponíveis na biblioteca do Klaus.
 * O usuário pode ativá-las ou desativá-las a qualquer momento.
 */
export const CATALOGO_EXTENSOES_NATIVAS: ProjetoExtensao[] = [
  {
    id: "it_tools",
    nome: "IT-Tools Criativas",
    descricao: "Conversores de medidas px/rem, aspect ratio, verificador WCAG de contraste e geradores úteis.",
    icone: "Wrench",
    cor: "#f59e0b",
    categoria: "design",
    tipo: "nativa",
    ativo: false,
    origem: "catalogo",
    rota: "/it-tools",
  },
  {
    id: "conversor",
    nome: "Conversor Multimídia",
    descricao: "Conversão ágil de formatos de imagens, vetores, áudios e documentos no navegador.",
    icone: "RefreshCw",
    cor: "#06b6d4",
    categoria: "utilitarios",
    tipo: "nativa",
    ativo: false,
    origem: "catalogo",
    rota: "/conversor",
  },
  {
    id: "pdf",
    nome: "Ferramentas PDF & Scanner",
    descricao: "Unir, dividir, escanear documentos e extrair texto com OCR direto no navegador.",
    icone: "FileCheck",
    cor: "#ef4444",
    categoria: "produtividade",
    tipo: "nativa",
    ativo: false,
    origem: "catalogo",
    rota: "/pdf",
  },
  {
    id: "baixador",
    nome: "Baixador de Mídia",
    descricao: "Download facilitado de vídeos, áudios e conteúdos sociais a partir de links externos.",
    icone: "Download",
    cor: "#10b981",
    categoria: "utilitarios",
    tipo: "nativa",
    ativo: false,
    origem: "catalogo",
    rota: "/baixador",
  },
  {
    id: "sons",
    nome: "Sons de Foco & Binaurais",
    descricao: "Gerador de ruído marrom, chuva, floresta e frequências sonoras para concentração e trabalho profundo.",
    icone: "Headphones",
    cor: "#8b5cf6",
    categoria: "produtividade",
    tipo: "nativa",
    ativo: false,
    origem: "catalogo",
    rota: "/sons",
  },
  {
    id: "testador_hardware",
    nome: "Testador de Hardware",
    descricao: "Diagnóstico e teste em tempo real de webcam, microfone, taxa de quadros e áudio.",
    icone: "Video",
    cor: "#3b82f6",
    categoria: "utilitarios",
    tipo: "nativa",
    ativo: false,
    origem: "catalogo",
    rota: "/testador",
  },
  {
    id: "grafo",
    nome: "Grafo Neural de Links",
    descricao: "Visualização tridimensional e constelação interativa dos vínculos e menções entre suas notas.",
    icone: "Network",
    cor: "#ec4899",
    categoria: "produtividade",
    tipo: "nativa",
    ativo: false,
    origem: "catalogo",
    rota: "/grafo",
  },
  {
    id: "lousas",
    nome: "Lousas Visuais (Excalidraw)",
    descricao: "Canvas infinito para rascunhos livres, mapas mentais, diagramas e wireframes de design.",
    icone: "Layout",
    cor: "#f97316",
    categoria: "design",
    tipo: "nativa",
    ativo: false,
    origem: "catalogo",
    rota: "/lousas",
  },
  {
    id: "referencias",
    nome: "Mural de Referências Visuais",
    descricao: "Galeria de inspirações visuais com extração automática de paletas de cor HEX e tags.",
    icone: "Image",
    cor: "#eab308",
    categoria: "design",
    tipo: "nativa",
    ativo: false,
    origem: "catalogo",
    rota: "/referencias",
  },
  {
    id: "transcritor",
    nome: "Transcrição de Áudio com IA",
    descricao: "Grave pensamentos ou reuniões e converta a fala em notas estruturadas com IA.",
    icone: "Mic",
    cor: "#a855f7",
    categoria: "ia",
    tipo: "nativa",
    ativo: false,
    origem: "catalogo",
    rota: "/transcritor",
  },
  {
    id: "chat",
    nome: "Assistente de Conversa IA",
    descricao: "Brainstorming inteligente, geração de ideias e consultas diretas ao seu segundo cérebro.",
    icone: "MessageCircle",
    cor: "#0ea5e9",
    categoria: "ia",
    tipo: "nativa",
    ativo: false,
    origem: "catalogo",
    rota: "/chat",
  },
];

let ultimoShaProjetos: string | undefined = undefined;
let timerDebounceProjetos: ReturnType<typeof setTimeout> | null = null;

export function registrarShaProjetos(sha?: string): void {
  if (sha) ultimoShaProjetos = sha;
}

export function obterShaProjetos(): string | undefined {
  return ultimoShaProjetos;
}

/**
 * Carrega a lista de projetos e extensões do localStorage,
 * garantindo catálogo mestre e mesclagem tolerante a falhas.
 */
export function carregarProjetosExtensoes(): ProjetoExtensao[] {
  try {
    const salvo = getKlausItem(CHAVE_STORAGE_PROJETOS);
    if (!salvo) {
      return [...CATALOGO_EXTENSOES_NATIVAS];
    }

    const parsed = JSON.parse(salvo);
    if (!Array.isArray(parsed)) {
      return [...CATALOGO_EXTENSOES_NATIVAS];
    }

    const mapaSalvos = new Map<string, ProjetoExtensao>();
    for (const item of parsed) {
      if (item && typeof item === "object" && item.id) {
        mapaSalvos.set(item.id, item);
      }
    }

    const listaResultante: ProjetoExtensao[] = CATALOGO_EXTENSOES_NATIVAS.map((nativo) => {
      const salvoItem = mapaSalvos.get(nativo.id);
      if (salvoItem) {
        return {
          ...nativo,
          ativo: Boolean(salvoItem.ativo),
          cor: salvoItem.cor || nativo.cor,
        };
      }
      return { ...nativo };
    });

    for (const item of parsed) {
      if (item && item.origem === "usuario" && !listaResultante.some((x) => x.id === item.id)) {
        listaResultante.push(item);
      }
    }

    return listaResultante;
  } catch (err) {
    console.error("[Klaus] Erro ao carregar projetos e extensões:", err);
    return [...CATALOGO_EXTENSOES_NATIVAS];
  }
}

/**
 * Salva a lista de projetos e extensões localmente e agenda sincronização remota
 * no repositório privado do usuário (.klaus/projetos.json).
 */
export function salvarProjetosExtensoes(
  lista: ProjetoExtensao[],
  cfg?: Settings,
): boolean {
  try {
    setKlausItem(CHAVE_STORAGE_PROJETOS, JSON.stringify(lista));
    dispatchKlausEvent(EVENTO_PROJETOS_ALTERADOS, lista);

    if (cfg && cfg.githubToken && cfg.repoOwner && cfg.repoName) {
      agendarPersistenciaProjetosRemoto(cfg, lista);
    }
    return true;
  } catch (err) {
    console.error("[Klaus] Falha ao salvar projetos/extensões:", err);
    return false;
  }
}

/**
 * Alterna a ativação (instalação) de uma extensão ou projeto.
 */
export function alternarStatusProjetoExtensao(
  id: string,
  cfg?: Settings,
): { sucesso: boolean; ativo: boolean } {
  const lista = carregarProjetosExtensoes();
  const index = lista.findIndex((p) => p.id === id);
  if (index === -1) return { sucesso: false, ativo: false };

  const novoAtivo = !lista[index].ativo;
  lista[index] = { ...lista[index], ativo: novoAtivo, atualizadoEm: new Date().toISOString() };
  salvarProjetosExtensoes(lista, cfg);

  const itemAtualizado = lista[index];
  try {
    sincronizarExtensaoNoMenu(
      {
        id: itemAtualizado.id,
        para: itemAtualizado.rota || `/projeto/${itemAtualizado.id}`,
        rotulo: itemAtualizado.nome,
        iconeNome: itemAtualizado.icone,
        cor: itemAtualizado.cor,
        ativo: novoAtivo,
      },
      cfg,
    );
  } catch {}

  return { sucesso: true, ativo: novoAtivo };
}

/**
 * Cria ou atualiza um projeto personalizado criado pelo usuário.
 */
export function salvarProjetoCustomizado(
  projeto: Omit<ProjetoExtensao, "origem" | "tipo"> & {
    tipo?: TipoExtensao;
  },
  cfg?: Settings,
): ProjetoExtensao {
  const lista = carregarProjetosExtensoes();
  const id = projeto.id || `projeto_${Date.now()}`;
  const agora = new Date().toISOString();

  const novoOuAtualizado: ProjetoExtensao = {
    id,
    nome: projeto.nome.trim() || "Novo Projeto",
    descricao: projeto.descricao.trim(),
    icone: projeto.icone || "FolderGit2",
    cor: projeto.cor || "#6366f1",
    categoria: projeto.categoria || "pessoal",
    tipo: projeto.tipo || "url_integrada",
    ativo: projeto.ativo !== undefined ? projeto.ativo : true,
    origem: "usuario",
    rota: `/projeto/${id}`,
    urlEmbed: projeto.urlEmbed,
    codigoHtml: projeto.codigoHtml,
    caminhoPastaMarkdown: projeto.caminhoPastaMarkdown,
    criadoEm: projeto.criadoEm || agora,
    atualizadoEm: agora,
  };

  const index = lista.findIndex((p) => p.id === id);
  if (index >= 0) {
    lista[index] = novoOuAtualizado;
  } else {
    lista.push(novoOuAtualizado);
  }

  salvarProjetosExtensoes(lista, cfg);

  try {
    sincronizarExtensaoNoMenu(
      {
        id: novoOuAtualizado.id,
        para: novoOuAtualizado.rota || `/projeto/${novoOuAtualizado.id}`,
        rotulo: novoOuAtualizado.nome,
        iconeNome: novoOuAtualizado.icone,
        cor: novoOuAtualizado.cor,
        ativo: novoOuAtualizado.ativo,
      },
      cfg,
    );
  } catch {}

  return novoOuAtualizado;
}

/**
 * Remove um projeto personalizado criado pelo usuário.
 */
export function removerProjetoCustomizado(id: string, cfg?: Settings): boolean {
  const lista = carregarProjetosExtensoes();
  const filtrada = lista.filter((p) => !(p.id === id && p.origem === "usuario"));
  if (filtrada.length === lista.length) return false;

  try {
    sincronizarExtensaoNoMenu(
      {
        id,
        para: `/projeto/${id}`,
        rotulo: "",
        iconeNome: "",
        ativo: false,
      },
      cfg,
    );
  } catch {}

  return salvarProjetosExtensoes(filtrada, cfg);
}

/**
 * Enfileira persistência com debounce no arquivo .klaus/projetos.json do repo privado.
 */
export function agendarPersistenciaProjetosRemoto(
  cfg: Settings,
  lista: ProjetoExtensao[],
  delayMs = 1500,
): void {
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) return;

  if (timerDebounceProjetos) {
    clearTimeout(timerDebounceProjetos);
  }

  timerDebounceProjetos = setTimeout(async () => {
    timerDebounceProjetos = null;
    try {
      const conteudo = JSON.stringify(lista, null, 2);
      let shaFinal = ultimoShaProjetos;
      if (!shaFinal) {
        try {
          const res = await ler(cfg, CAMINHO_PROJETOS_CONFIG, { silenciar404: true });
          if (res?.sha) shaFinal = res.sha;
        } catch {}
      }
      const novoSha = await gravar(
        cfg,
        CAMINHO_PROJETOS_CONFIG,
        conteudo,
        shaFinal,
        "config: atualizar projetos e extensões instaladas",
      );
      if (novoSha) ultimoShaProjetos = novoSha;
    } catch (err) {
      console.warn("[Klaus] Falha ao sincronizar projetos com GitHub:", err);
    }
  }, delayMs);
}

/**
 * Baixa .klaus/projetos.json do repositório privado e atualiza o estado local.
 */
export async function sincronizarProjetosComGithub(
  cfg: Settings,
): Promise<{ sincronizado: boolean; projetos: ProjetoExtensao[] }> {
  const locais = carregarProjetosExtensoes();
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { sincronizado: false, projetos: locais };
  }

  try {
    const res = await ler(cfg, CAMINHO_PROJETOS_CONFIG, { silenciar404: true });
    if (res?.texto) {
      registrarShaProjetos(res.sha);
      const parsed = JSON.parse(res.texto);
      if (Array.isArray(parsed)) {
        setKlausItem(CHAVE_STORAGE_PROJETOS, JSON.stringify(parsed));
        dispatchKlausEvent(EVENTO_PROJETOS_ALTERADOS, parsed);
        return { sincronizado: true, projetos: parsed };
      }
    }
  } catch {}

  return { sincronizado: false, projetos: locais };
}

/**
 * Retorna somente os projetos e extensões que estão ativos para o usuário.
 */
export function obterExtensoesAtivas(): ProjetoExtensao[] {
  const todas = carregarProjetosExtensoes();
  return todas.filter((p) => p.ativo);
}

/**
 * Obtém um projeto ou extensão pelo seu identificador único.
 */
export function obterProjetoPorId(id: string): ProjetoExtensao | undefined {
  return carregarProjetosExtensoes().find((p) => p.id === id);
}

// ── Nomes Canônicos do Klaus SDK ─────────────────────────────────────────────
export const loadKlausProjects = carregarProjetosExtensoes;
export const getKlausProjectById = obterProjetoPorId;
export const saveKlausProject = salvarProjetoCustomizado;
export const toggleKlausExtension = alternarStatusProjetoExtensao;
export const removeKlausProject = removerProjetoCustomizado;
export const syncKlausProjects = sincronizarProjetosComGithub;
export const getActiveKlausExtensions = obterExtensoesAtivas;
