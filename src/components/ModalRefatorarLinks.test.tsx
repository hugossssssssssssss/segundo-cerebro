import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModalRefatorarLinks } from "./ModalRefatorarLinks";
import type { PlanoRefatoracao } from "@/lib/refatorarLinks";

afterEach(() => {
  cleanup();
});

const planoMock: PlanoRefatoracao = {
  totalArquivos: 2,
  alteracoes: [
    {
      caminho: "notas/briefing.md",
      titulo: "Briefing Inicial",
      textoAntes: "Alinhar com @Design amanhã.",
      textoDepois: "Alinhar com @Identidade Visual amanhã.",
      sha: "sha1",
    },
    {
      caminho: "tarefas/layout.md",
      titulo: "Fazer Layout",
      textoAntes: "Ver referências em @Design.",
      textoDepois: "Ver referências em @Identidade Visual.",
      sha: "sha2",
    },
  ],
};

describe("ModalRefatorarLinks", () => {
  it("não renderiza nada se estiver fechado ou se o plano for vazio", () => {
    const { container } = render(
      <ModalRefatorarLinks
        aberto={false}
        onFechar={() => {}}
        tituloAntigo="Design"
        tituloNovo="Identidade Visual"
        plano={planoMock}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("exibe títulos antigo e novo, contagem e arquivos afetados quando aberto", () => {
    render(
      <ModalRefatorarLinks
        aberto={true}
        onFechar={() => {}}
        tituloAntigo="Design"
        tituloNovo="Identidade Visual"
        plano={planoMock}
      />
    );

    expect(screen.getByText("Atualizar referências em cascata")).toBeDefined();
    expect(screen.getAllByText(/Design/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Identidade Visual/).length).toBeGreaterThan(0);
    expect(screen.getByText("Briefing Inicial")).toBeDefined();
    expect(screen.getByText("Fazer Layout")).toBeDefined();
    expect(screen.getByText("Atualizar 2 notas")).toBeDefined();
  });

  it("aciona onFechar ao clicar em 'Manter como está'", async () => {
    const onFechar = vi.fn();
    render(
      <ModalRefatorarLinks
        aberto={true}
        onFechar={onFechar}
        tituloAntigo="Design"
        tituloNovo="Identidade Visual"
        plano={planoMock}
      />
    );

    const botaoManter = screen.getByText("Manter como está");
    await userEvent.click(botaoManter);
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
