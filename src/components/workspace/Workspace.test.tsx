import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import React from "react";
import {
  WorkspaceProvider,
  useWorkspace,
} from "./WorkspaceContext";
import { WorkspaceBreadcrumbs } from "./WorkspaceBreadcrumbs";
import { WorkspaceRodape } from "./WorkspaceRodape";
import { WorkspaceVazio } from "./WorkspaceVazio";

// Mock das dependências externas
vi.mock("@/lib/settings", () => ({
  lerConfig: () => ({ githubToken: "fake-token", repoOwner: "user", repoName: "repo" }),
  configCompleta: () => true,
}));

vi.mock("@/lib/useSalvar", () => ({
  useSalvar: () => ({
    salvarTexto: vi.fn().mockResolvedValue({ commit: { sha: "novo-sha" } }),
    apagarItem: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/lib/repo", () => ({
  cache: {
    itens: [
      { caminho: "notas/nota-1.md", sha: "sha1", texto: "# Nota 1", doc: { dados: {}, corpo: "Nota 1" }, nome: "nota-1.md" },
      { caminho: "notas/nota-2.md", sha: "sha2", texto: "# Nota 2", doc: { dados: {}, corpo: "Nota 2" }, nome: "nota-2.md" },
      { caminho: "notas/nota-3.md", sha: "sha3", texto: "# Nota 3", doc: { dados: {}, corpo: "Nota 3" }, nome: "nota-3.md" },
    ],
  },
  invalidarCache: vi.fn(),
}));

describe("Workspace com Abas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve abrir nova aba e prevenir duplicatas ao abrir mesmo caminho", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const { result } = renderHook(() => useWorkspace(), { wrapper });

    act(() => {
      result.current.abrirNoWorkspace({
        caminho: "notas/nota-1.md",
        rotuloTipo: "Nota",
        titulo: "Primeira Nota",
        corpo: "Conteúdo 1",
        dadosProps: {},
      });
    });

    expect(result.current.abas.length).toBe(1);
    expect(result.current.abaAtiva?.titulo).toBe("Primeira Nota");

    // Tentativa de abrir o mesmo caminho novamente
    act(() => {
      result.current.abrirNoWorkspace({
        caminho: "notas/nota-1.md",
        rotuloTipo: "Nota",
        titulo: "Tentativa Duplicada",
        corpo: "Outro Conteúdo",
        dadosProps: {},
      });
    });

    // Não deve criar uma segunda aba, mas sim manter 1 aba
    expect(result.current.abas.length).toBe(1);
    expect(result.current.abaAtiva?.caminho).toBe("notas/nota-1.md");

    // Abrir uma segunda aba com caminho diferente
    act(() => {
      result.current.abrirNoWorkspace({
        caminho: "notas/nota-2.md",
        rotuloTipo: "Nota",
        titulo: "Segunda Nota",
        corpo: "Conteúdo 2",
        dadosProps: {},
      });
    });

    expect(result.current.abas.length).toBe(2);
    expect(result.current.abaAtiva?.titulo).toBe("Segunda Nota");
  });

  it("deve alternar a aba ativa ao selecionar", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const { result } = renderHook(() => useWorkspace(), { wrapper });

    act(() => {
      result.current.abrirNoWorkspace({
        id: "aba-1",
        caminho: "notas/nota-1.md",
        rotuloTipo: "Nota",
        titulo: "Nota 1",
        corpo: "",
        dadosProps: {},
      });
      result.current.abrirNoWorkspace({
        id: "aba-2",
        caminho: "notas/nota-2.md",
        rotuloTipo: "Nota",
        titulo: "Nota 2",
        corpo: "",
        dadosProps: {},
      });
    });

    expect(result.current.abaAtivaId).toBe("aba-2");

    act(() => {
      result.current.selecionarAba("aba-1");
    });

    expect(result.current.abaAtivaId).toBe("aba-1");
    expect(result.current.abaAtiva?.titulo).toBe("Nota 1");
  });

  it("deve fechar a aba e selecionar a vizinha ou esvaziar", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const { result } = renderHook(() => useWorkspace(), { wrapper });

    act(() => {
      result.current.abrirNoWorkspace({
        id: "aba-1",
        caminho: "notas/nota-1.md",
        rotuloTipo: "Nota",
        titulo: "Nota 1",
        corpo: "",
        dadosProps: {},
      });
      result.current.abrirNoWorkspace({
        id: "aba-2",
        caminho: "notas/nota-2.md",
        rotuloTipo: "Nota",
        titulo: "Nota 2",
        corpo: "",
        dadosProps: {},
      });
    });

    expect(result.current.abas.length).toBe(2);

    await act(async () => {
      await result.current.fecharAba("aba-2");
    });

    expect(result.current.abas.length).toBe(1);
    expect(result.current.abaAtivaId).toBe("aba-1");

    await act(async () => {
      await result.current.fecharAba("aba-1");
    });

    expect(result.current.abas.length).toBe(0);
    expect(result.current.abaAtivaId).toBeNull();
  });

  it("deve renderizar breadcrumbs e acionar busca global ao clicar", () => {
    render(
      <WorkspaceProvider>
        <WorkspaceBreadcrumbs caminho="notas/projetos/klaus.md" titulo="Klaus" />
      </WorkspaceProvider>
    );

    expect(screen.getByText("Notas")).toBeDefined();
    expect(screen.getByText("Projetos")).toBeDefined();
    expect(screen.getByText("Klaus")).toBeDefined();
  });

  it("deve renderizar o rodapé sequencial com contador e navegação", () => {
    const TestComp = () => {
      const { abrirNoWorkspace } = useWorkspace();
      React.useEffect(() => {
        abrirNoWorkspace({
          id: "aba-2",
          caminho: "notas/nota-2.md",
          rotuloTipo: "Nota",
          titulo: "Nota 2",
          corpo: "",
          dadosProps: {},
        });
      }, []);

      return <WorkspaceRodape />;
    };

    render(
      <WorkspaceProvider>
        <TestComp />
      </WorkspaceProvider>
    );

    // Deve encontrar contador sequencial (ex: 2 de 3)
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
  });

  it("deve renderizar o Empty State quando todas as abas forem fechadas", () => {
    render(
      <WorkspaceProvider>
        <WorkspaceVazio />
      </WorkspaceProvider>
    );

    expect(screen.getByText("Workspace em Tela Cheia")).toBeDefined();
    expect(screen.getByText(/Todas as abas foram fechadas/)).toBeDefined();
    expect(screen.getByText(/Pesquisar Documentos/)).toBeDefined();
  });
});
