import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { GerenciadorWorkspaces } from "./GerenciadorWorkspaces";
import { salvarWorkspaces, salvarIdWorkspaceAtivo, type WorkspaceConfig } from "@/lib/workspaces";

describe("GerenciadorWorkspaces", () => {
  beforeEach(() => {
    const mockWorkspaces: WorkspaceConfig[] = [
      {
        id: "pessoal",
        nome: "Meu Klaus Pessoal",
        tipo: "pessoal",
        repoOwner: "hugosilva",
        repoName: "segundo-cerebro-dados",
        branch: "main",
      },
      {
        id: "equipe",
        nome: "Klaus Estúdio Acme",
        tipo: "equipe",
        repoOwner: "acme-design",
        repoName: "klaus-equipe",
        branch: "main",
      },
    ];
    salvarWorkspaces(mockWorkspaces);
    salvarIdWorkspaceAtivo("pessoal");
  });

  afterEach(() => {
    cleanup();
  });

  it("renderiza a lista de workspaces e destaca o ativo", () => {
    render(<GerenciadorWorkspaces />);
    expect(screen.getByText("Meu Klaus Pessoal")).toBeTruthy();
    expect(screen.getByText("Klaus Estúdio Acme")).toBeTruthy();
    expect(screen.getByText("Ativo")).toBeTruthy();
  });

  it("abre modal para criar novo espaço ao clicar em Novo Espaço", () => {
    render(<GerenciadorWorkspaces />);
    const botaoNovo = screen.getByRole("button", { name: /Novo Espaço/i });
    fireEvent.click(botaoNovo);
    expect(screen.getByText("Novo Espaço de Trabalho")).toBeTruthy();
    expect(screen.getByPlaceholderText(/Klaus Estúdio/i)).toBeTruthy();
  });

  it("permite abrir modal de edição ao clicar no botão de editar", () => {
    render(<GerenciadorWorkspaces />);
    const botoesEditar = screen.getAllByLabelText("Editar espaço");
    expect(botoesEditar.length).toBe(2);
    fireEvent.click(botoesEditar[0]);
    expect(screen.getByText("Editar Espaço de Trabalho")).toBeTruthy();
  });
});
