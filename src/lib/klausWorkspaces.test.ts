import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listarWorkspaces,
  obterWorkspaceAtivo,
  alternarWorkspace,
  salvarWorkspace,
  removerWorkspace,
  type WorkspaceConfig,
} from "./klausWorkspaces";
import * as repo from "./repo";

describe("workspaces.ts - Gestão de Múltiplos Espaços", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("migra automaticamente da configuração existente e cria workspace padrão", () => {
    const lista = listarWorkspaces();
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe("pessoal");
    expect(lista[0].tipo).toBe("pessoal");

    const ativo = obterWorkspaceAtivo();
    expect(ativo.id).toBe("pessoal");
  });

  it("permite adicionar novo workspace de equipe e alternar para ele", () => {
    const spyInvalidar = vi.spyOn(repo, "invalidarCache");

    const wsEquipe: WorkspaceConfig = {
      id: "estudio",
      nome: "Estúdio Alfa",
      tipo: "equipe",
      repoOwner: "empresa-design",
      repoName: "klaus-equipe-dados",
      branch: "main",
    };

    salvarWorkspace(wsEquipe);

    const lista = listarWorkspaces();
    expect(lista).toHaveLength(2);
    expect(lista.find((w) => w.id === "estudio")).toBeDefined();

    const alternou = alternarWorkspace("estudio");
    expect(alternou).toBe(true);

    expect(obterWorkspaceAtivo().id).toBe("estudio");
    expect(obterWorkspaceAtivo().repoName).toBe("klaus-equipe-dados");
    expect(spyInvalidar).toHaveBeenCalled();
  });

  it("não permite remover o último workspace", () => {
    const removido = removerWorkspace("pessoal");
    expect(removido).toBe(false);
    expect(listarWorkspaces()).toHaveLength(1);
  });

  it("ao remover o workspace ativo, alterna automaticamente para o próximo", () => {
    const wsEquipe: WorkspaceConfig = {
      id: "estudio",
      nome: "Estúdio Alfa",
      tipo: "equipe",
      repoOwner: "empresa",
      repoName: "dados",
      branch: "main",
    };
    salvarWorkspace(wsEquipe);
    alternarWorkspace("estudio");
    expect(obterWorkspaceAtivo().id).toBe("estudio");

    const removido = removerWorkspace("estudio");
    expect(removido).toBe(true);
    expect(obterWorkspaceAtivo().id).toBe("pessoal");
  });

  it("ofusca tokens de workspaces e restaura token global base ao alternar de volta", async () => {
    // Configura token global pessoal base
    const { salvarConfig, lerConfig, PADRAO } = await import("./settings");
    salvarConfig({ ...PADRAO, githubToken: "ghp_token_pessoal_hugo", repoOwner: "hugo", repoName: "dados" });

    // Cria workspace de equipe com token específico da organização
    const wsEquipe: WorkspaceConfig = {
      id: "organizacao",
      nome: "Equipe Org",
      tipo: "equipe",
      repoOwner: "empresa-acme",
      repoName: "dados-equipe",
      branch: "main",
      githubToken: "ghp_token_especifico_equipe",
    };
    salvarWorkspace(wsEquipe);

    // Verifica se não salvou o token em texto puro no localStorage
    const rawWorkspaces = localStorage.getItem("segundo-cerebro:workspaces");
    expect(rawWorkspaces).not.toContain("ghp_token_especifico_equipe");
    expect(rawWorkspaces).toContain("enc_");

    // Alterna para o workspace da organização
    alternarWorkspace("organizacao");
    expect(lerConfig().githubToken).toBe("ghp_token_especifico_equipe");

    // Alterna de volta para o workspace pessoal (que herda o token global base)
    alternarWorkspace("pessoal");
    expect(lerConfig().githubToken).toBe("ghp_token_pessoal_hugo");
  });

  it("gera e decodifica links de convite seguro com dados completos", async () => {
    const {
      gerarLinkConviteWorkspace,
      decodificarConviteWorkspace,
    } = await import("./klausWorkspaces");

    const ws: WorkspaceConfig = {
      id: "design_time",
      nome: "Time de Design",
      tipo: "equipe",
      repoOwner: "hugosilva",
      repoName: "segundo-cerebro-dados",
      branch: "main",
      cor: "#8b5cf6",
      icone: "Palette",
    };

    const link = gerarLinkConviteWorkspace(ws, "hugosilva", "https://klaus.app/");
    expect(link).toContain("https://klaus.app/#/convite?dados=");

    const url = new URL(link.replace("#/", ""));
    const dadosQuery = url.searchParams.get("dados");
    expect(dadosQuery).toBeTruthy();

    const decodificado = decodificarConviteWorkspace(dadosQuery!);
    expect(decodificado).not.toBeNull();
    expect(decodificado?.id).toBe("design_time");
    expect(decodificado?.nome).toBe("Time de Design");
    expect(decodificado?.repoOwner).toBe("hugosilva");
    expect(decodificado?.repoName).toBe("segundo-cerebro-dados");
    expect(decodificado?.convidadoPor).toBe("hugosilva");
    expect(decodificado?.cor).toBe("#8b5cf6");
  });

  it("carrega e salva manifesto canônico do workspace no repositório", async () => {
    const {
      carregarManifestoWorkspace,
      salvarManifestoWorkspace,
      CAMINHO_MANIFESTO_WORKSPACE,
    } = await import("./klausWorkspaces");
    const github = await import("./github");

    const manifestoMock = {
      versao: 1,
      id: "estudio-criativo",
      nome: "Estúdio Criativo",
      tipo: "equipe" as const,
      cor: "#10b981",
      icone: "Users",
    };

    const spyGravar = vi.spyOn(github, "gravar").mockResolvedValue("sha_manifesto_123");
    const spyLerOuVazio = vi.spyOn(github, "lerOuVazio").mockResolvedValue(JSON.stringify(manifestoMock));

    const { PADRAO } = await import("./settings");
    const cfg = {
      ...PADRAO,
      repoOwner: "estudio",
      repoName: "dados",
      branch: "main",
      githubToken: "ghp_teste",
    };

    const sha = await salvarManifestoWorkspace(cfg, manifestoMock);
    expect(sha).toBe("sha_manifesto_123");
    expect(spyGravar).toHaveBeenCalledWith(
      expect.objectContaining({ repoOwner: "estudio" }),
      CAMINHO_MANIFESTO_WORKSPACE,
      expect.stringContaining("Estúdio Criativo"),
      undefined,
      expect.any(String)
    );

    const carregado = await carregarManifestoWorkspace(cfg);
    expect(spyLerOuVazio).toHaveBeenCalled();
    expect(carregado).not.toBeNull();
    expect(carregado?.nome).toBe("Estúdio Criativo");
    expect(carregado?.id).toBe("estudio-criativo");
  });
});

