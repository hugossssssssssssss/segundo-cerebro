import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ModalResolverConflito } from "./ModalResolverConflito";
import * as github from "@/lib/github";
import * as offlineQueue from "@/lib/offlineQueue";

describe("ModalResolverConflito", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  const rascunhoMock: any = {
    id: "rascunho_1",
    caminho: "notas/briefing.md",
    texto: "# Minha Edição Local\n\nTexto modificado localmente.",
    sha: "sha_local_123",
    status: "conflito",
  };

  it("carrega e exibe as versões remota e local no modal", async () => {
    vi.spyOn(github, "ler").mockResolvedValue({
      texto: "# Versão Remota\n\nTexto modificado no GitHub por outro membro.",
      sha: "sha_remoto_456",
    });

    render(
      <ModalResolverConflito
        aberto={true}
        aoFechar={vi.fn()}
        rascunho={rascunhoMock}
        aoResolvido={vi.fn()}
      />
    );

    expect(screen.getByText(/Resolver Conflito de Edição: notas\/briefing.md/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText(/Manter Minha Versão/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Descartar Local/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Mesclar Ambos/i).length).toBeGreaterThan(0);
    });
  });

  it("permite descartar a versão local preservando o GitHub", async () => {
    vi.spyOn(github, "ler").mockResolvedValue({
      texto: "# Versão Remota",
      sha: "sha_remoto_456",
    });

    const spyRemover = vi.spyOn(offlineQueue, "removerRascunhoLocal").mockImplementation(() => {});
    const aoResolvidoMock = vi.fn();
    const aoFecharMock = vi.fn();

    render(
      <ModalResolverConflito
        aberto={true}
        aoFechar={aoFecharMock}
        rascunho={rascunhoMock}
        aoResolvido={aoResolvidoMock}
      />
    );

    // Aguarda carregar versão remota
    await waitFor(() => {
      expect(screen.getByText(/Manter Minha Versão/i)).toBeDefined();
    });

    const botaoDescartar = screen.getByText(/Descartar Local/i);
    fireEvent.click(botaoDescartar);

    expect(spyRemover).toHaveBeenCalledWith("rascunho_1");
    expect(aoResolvidoMock).toHaveBeenCalled();
    expect(aoFecharMock).toHaveBeenCalled();
  });
});
