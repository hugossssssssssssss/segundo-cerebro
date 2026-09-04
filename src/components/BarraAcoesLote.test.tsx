import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BarraAcoesLote, BotaoAcaoLote } from "./BarraAcoesLote";
import { Trash2 } from "lucide-react";

afterEach(() => {
  cleanup();
});


describe("BarraAcoesLote", () => {
  it("não deve renderizar nada quando totalSelecionados for 0", () => {
    const { container } = render(
      <BarraAcoesLote totalSelecionados={0} aoLimparSelecao={() => {}}>
        <button>Ação</button>
      </BarraAcoesLote>
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza a quantidade e o rótulo singular/plural corretamente", () => {
    const { rerender } = render(
      <BarraAcoesLote totalSelecionados={1} rotuloItem="tarefa" aoLimparSelecao={() => {}}>
        <button>Ação</button>
      </BarraAcoesLote>
    );

    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText(/tarefa selecionada/i)).toBeTruthy();

    rerender(
      <BarraAcoesLote totalSelecionados={3} rotuloItem="tarefa" aoLimparSelecao={() => {}}>
        <button>Ação</button>
      </BarraAcoesLote>
    );

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText(/tarefas selecionadas/i)).toBeTruthy();
  });

  it("chama aoLimparSelecao ao clicar no botão de fechar", () => {
    const limpar = vi.fn();
    render(
      <BarraAcoesLote totalSelecionados={2} aoLimparSelecao={limpar}>
        <button>Ação</button>
      </BarraAcoesLote>
    );

    const botaoFechar = screen.getByLabelText("Desmarcar seleção");
    fireEvent.click(botaoFechar);
    expect(limpar).toHaveBeenCalledTimes(1);
  });

  it("chama aoLimparSelecao ao pressionar a tecla Escape", () => {
    const limpar = vi.fn();
    render(
      <BarraAcoesLote totalSelecionados={2} aoLimparSelecao={limpar}>
        <button>Ação</button>
      </BarraAcoesLote>
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(limpar).toHaveBeenCalledTimes(1);
  });

  it("renderiza botões de ação e dispara cliques", () => {
    const cliqueExcluir = vi.fn();
    render(
      <BarraAcoesLote totalSelecionados={4} rotuloItem="entrega" aoLimparSelecao={() => {}}>
        <BotaoAcaoLote
          icone={<Trash2 size={14} data-testid="icone-trash" />}
          rotulo="Excluir"
          variante="perigo"
          onClick={cliqueExcluir}
        />
      </BarraAcoesLote>
    );

    const botao = screen.getByText("Excluir");
    fireEvent.click(botao);
    expect(cliqueExcluir).toHaveBeenCalledTimes(1);
  });
});
