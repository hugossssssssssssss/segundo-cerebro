import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ConviteWorkspace from "./ConviteWorkspace";
import { gerarLinkConviteWorkspace, type WorkspaceConfig } from "@/lib/klausWorkspaces";

describe("ConviteWorkspace - Onboarding de Espaço", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("exibe aviso amigável quando o link de convite for inválido", () => {
    render(
      <MemoryRouter initialEntries={["/convite"]}>
        <ConviteWorkspace />
      </MemoryRouter>
    );

    expect(screen.getByText(/Convite Inválido ou Incompleto/i)).toBeDefined();
    expect(screen.getByText(/Ir para o Início/i)).toBeDefined();
  });

  it("renderiza os detalhes do convite seguro quando o payload for válido", () => {
    const ws: WorkspaceConfig = {
      id: "design-studio",
      nome: "Estúdio de Criação",
      tipo: "equipe",
      repoOwner: "hugo-designer",
      repoName: "dados-estudio",
      branch: "main",
      cor: "#6366f1",
      icone: "Palette",
    };

    const link = gerarLinkConviteWorkspace(ws, "hugo-designer", "http://localhost/");
    const query = link.split("?")[1];

    render(
      <MemoryRouter initialEntries={[`/convite?${query}`]}>
        <ConviteWorkspace />
      </MemoryRouter>
    );

    expect(screen.getByText("Estúdio de Criação")).toBeDefined();
    expect(screen.getByText(/hugo-designer\/dados-estudio/i)).toBeDefined();
    expect(screen.getByText(/Entrar e Sincronizar Espaço/i)).toBeDefined();
    expect(screen.getByText(/Gerar token no GitHub com 1 clique/i)).toBeDefined();
  });
});
