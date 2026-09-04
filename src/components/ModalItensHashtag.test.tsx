import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModalItensHashtag, obterItensPorHashtag } from "./ModalItensHashtag";
import type { ItemRepo } from "@/lib/repo";

describe("ModalItensHashtag e obterItensPorHashtag", () => {
  const mockItens: ItemRepo[] = [
    {
      caminho: "notas/social-media.md",
      nome: "social-media.md",
      sha: "sha1",
      tamanho: 100,
      texto: "Planejamento para redes sociais",
      doc: {
        dados: { titulo: "Estratégia Social Media", tipo: "nota", tags: ["Social media", "marketing"] },
        corpo: "Planejamento para redes sociais",
      },
    },
    {
      caminho: "tarefas/post-instagram.md",
      nome: "post-instagram.md",
      sha: "sha2",
      tamanho: 100,
      texto: "Criar carrossel #social-media",
      doc: {
        dados: { titulo: "Criar Carrossel", tipo: "tarefa", status: "a-fazer", prazo: "2026-09-10", tags: ["design"] },
        corpo: "Criar carrossel #social-media",
      },
    },
    {
      caminho: "contatos/influenciador.md",
      nome: "influenciador.md",
      sha: "sha3",
      tamanho: 100,
      texto: "Contato de influenciador",
      doc: {
        dados: { titulo: "Ana Designer", tipo: "contato", empresa: "Agência X", tags: ["social media"] },
        corpo: "Contato de influenciador",
      },
    },
    {
      caminho: "notas/outra-coisa.md",
      nome: "outra-coisa.md",
      sha: "sha4",
      tamanho: 100,
      texto: "Outra anotação sem relação",
      doc: {
        dados: { titulo: "Anotação Financeira", tags: ["financeiro"] },
        corpo: "Outra anotação sem relação",
      },
    },
  ];

  it("filtra corretamente os itens vinculados a uma hashtag tolerando hífens e maiúsculas", () => {
    const itensComTag = obterItensPorHashtag(mockItens, "#social-media");
    expect(itensComTag).toHaveLength(3);

    const titulos = itensComTag.map((i) => i.titulo);
    expect(titulos).toContain("Estratégia Social Media");
    expect(titulos).toContain("Criar Carrossel");
    expect(titulos).toContain("Ana Designer");
    expect(titulos).not.toContain("Anotação Financeira");
  });

  it("renderiza o modal de hashtag e permite abrir um documento ao clicar", () => {
    const aoAbrirItemMock = vi.fn();
    const aoFecharMock = vi.fn();

    render(
      <ModalItensHashtag
        tag="social-media"
        aberto={true}
        acervo={mockItens}
        aoFechar={aoFecharMock}
        aoAbrirItem={aoAbrirItemMock}
      />
    );

    expect(screen.getAllByText(/social-media/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Estratégia Social Media")).toBeDefined();
    expect(screen.getByText("Criar Carrossel")).toBeDefined();

    // Clica no item para abrir
    fireEvent.click(screen.getByText("Estratégia Social Media"));
    expect(aoAbrirItemMock).toHaveBeenCalledWith("notas/social-media.md");
    expect(aoFecharMock).toHaveBeenCalled();
  });
});
