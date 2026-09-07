import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Busca } from "./Busca";
import * as repo from "@/lib/repo";
import { lerMarkdown } from "@/lib/markdown";

vi.mock("@/lib/settings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settings")>("@/lib/settings");
  return {
    ...actual,
    lerConfig: () => ({
      repoOwner: "test",
      repoName: "test",
      githubToken: "token123",
      branch: "main",
    }),
    configCompleta: () => true,
  };
});

vi.mock("@/lib/repo", async () => {
  const actual = await vi.importActual<typeof import("@/lib/repo")>("@/lib/repo");
  return {
    ...actual,
    carregarRepo: vi.fn(),
  };
});

describe("Busca - Exclusão de itens da lixeira e recentes", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("não exibe notas ou tarefas da lixeira nos documentos recentes", async () => {
    const mockAcervo: repo.ItemRepo[] = [
      {
        caminho: "notas/nota-ativa.md",
        nome: "nota-ativa.md",
        sha: "sha1",
        tamanho: 100,
        texto: "---\ntitulo: Nota Ativa Recente\natualizado: '2026-09-07T10:00:00.000Z'\n---\nConteudo ativo",
        doc: lerMarkdown("---\ntitulo: Nota Ativa Recente\natualizado: '2026-09-07T10:00:00.000Z'\n---\nConteudo ativo"),
      },
      {
        caminho: ".lixeira/notas/nota-excluida.md",
        nome: "nota-excluida.md",
        sha: "sha2",
        tamanho: 100,
        texto: "---\ntitulo: Nota Excluída na Lixeira\napagado_em: '2026-09-07T10:30:00.000Z'\n---\nConteudo lixeira",
        doc: lerMarkdown("---\ntitulo: Nota Excluída na Lixeira\napagado_em: '2026-09-07T10:30:00.000Z'\n---\nConteudo lixeira"),
      },
    ];

    vi.spyOn(repo, "carregarRepo").mockResolvedValue(mockAcervo);

    render(
      <MemoryRouter>
        <Busca aberta={true} aoFechar={() => {}} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Nota Ativa Recente")).toBeDefined();
    });

    // A nota da lixeira não pode estar na tela
    expect(screen.queryByText("Nota Excluída na Lixeira")).toBeNull();
  });
});
