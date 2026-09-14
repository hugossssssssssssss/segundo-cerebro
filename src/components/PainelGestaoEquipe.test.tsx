import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { PainelGestaoEquipe } from "./PainelGestaoEquipe";

vi.mock("@/lib/equipe", () => ({
  carregarEquipe: vi.fn().mockResolvedValue({
    sha: "sha123",
    config: {
      nome_equipe: "Studio Design",
      membros: [
        { login: "hugosilva", nome: "Hugo Silva", papel: "dono", ativo: true },
        { login: "mariadesign", nome: "Maria Santos", papel: "membro", ativo: true },
      ],
    },
  }),
  salvarEquipe: vi.fn().mockResolvedValue("sha456"),
  obterPermissoes: vi.fn().mockReturnValue({
    gerenciarMembros: true,
    gerenciarConfig: true,
    excluirEntregas: true,
    editarTudo: true,
    atribuirTarefas: true,
  }),
}));

vi.mock("@/lib/settings", () => ({
  lerConfig: vi.fn().mockReturnValue({ repoOwner: "hugosilva", repoName: "studio-dados" }),
}));

vi.mock("@/lib/usuario", () => ({
  lerPerfilLocal: vi.fn().mockReturnValue({ login: "hugosilva", nome: "Hugo Silva" }),
}));

vi.mock("@/lib/workspaces", () => ({
  obterWorkspaceAtivo: vi.fn().mockReturnValue({ tipo: "equipe", nome: "Studio Equipe" }),
}));

describe("PainelGestaoEquipe", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderiza o painel com membros da equipe", async () => {
    render(<PainelGestaoEquipe />);

    await waitFor(() => {
      expect(screen.getByText("Studio Design")).toBeTruthy();
      expect(screen.getByText("Hugo Silva")).toBeTruthy();
      expect(screen.getByText("Maria Santos")).toBeTruthy();
    });
  });

  it("exibe formulário para convidar colaborador para dono ou admin", async () => {
    render(<PainelGestaoEquipe />);

    await waitFor(() => {
      expect(screen.getByText("Convidar Colaborador")).toBeTruthy();
      expect(screen.getByPlaceholderText(/Ex: mariadesigner/i)).toBeTruthy();
    });
  });
});
