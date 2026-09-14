import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listarWorkspaces,
  obterWorkspaceAtivo,
  alternarWorkspace,
  salvarWorkspace,
  removerWorkspace,
  type WorkspaceConfig,
} from "./workspaces";
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
});
