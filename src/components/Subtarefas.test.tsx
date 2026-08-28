/**
 * Primeiros testes de componente do projeto.
 *
 * Três das quatro perdas de dados que as auditorias encontraram viviam em
 * componentes — e eram estruturalmente invisíveis para uma suíte que só
 * exercitava funções puras. Isto começa a fechar essa lacuna, pela parte que
 * o Hugo mais toca no dia a dia.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Subtarefas } from "./Subtarefas";
import { lerSubtarefas, minutosRegistrados } from "@/lib/tarefas";

afterEach(cleanup);

const corpo = [
  "Ajustar a grade.",
  "",
  "- [ ] escolher as imagens",
  "- [x] revisar os textos",
  "",
  "## Tempo",
  "- 2026-08-13 14:20 → 14:45 (25min)",
].join("\n");

describe("Subtarefas", () => {
  it("mostra as caixinhas e o progresso", () => {
    render(<Subtarefas corpo={corpo} onChange={() => {}} />);

    expect(screen.getByText("escolher as imagens")).toBeDefined();
    expect(screen.getByText("revisar os textos")).toBeDefined();
    expect(screen.getByText("1/2")).toBeDefined();
  });

  it("marcar uma caixinha NÃO apaga o resto do corpo", async () => {
    // é isto que importa: o componente edita o mesmo texto que o editor,
    // e o registro do pomodoro vive nele
    const aoMudar = vi.fn();
    render(<Subtarefas corpo={corpo} onChange={aoMudar} />);

    await userEvent.click(screen.getByLabelText("Marcar como feita"));

    const novo: string = aoMudar.mock.calls[0][0];
    expect(lerSubtarefas(novo).filter((s) => s.feita)).toHaveLength(2);
    expect(novo).toContain("Ajustar a grade.");
    expect(novo).toContain("## Tempo");
    expect(minutosRegistrados(novo)).toBe(25);
  });

  it("desmarcar volta ao estado anterior", async () => {
    const aoMudar = vi.fn();
    render(<Subtarefas corpo={corpo} onChange={aoMudar} />);

    await userEvent.click(screen.getByLabelText("Desmarcar"));

    const novo: string = aoMudar.mock.calls[0][0];
    expect(lerSubtarefas(novo).filter((s) => s.feita)).toHaveLength(0);
  });

  it("adicionar um passo escreve no fim da lista, não no fim do texto", async () => {
    const aoMudar = vi.fn();
    render(<Subtarefas corpo={corpo} onChange={aoMudar} />);

    await userEvent.type(
      screen.getByPlaceholderText("Adicionar um passo…"),
      "aprovar com o cliente{Enter}",
    );

    const novo: string = aoMudar.mock.calls.at(-1)![0];
    expect(lerSubtarefas(novo).map((s) => s.texto)).toContain(
      "aprovar com o cliente",
    );
    // o registro de tempo continua depois das caixinhas
    expect(novo.indexOf("aprovar com o cliente")).toBeLessThan(
      novo.indexOf("## Tempo"),
    );
  });

  it("remover um passo tira só aquele", async () => {
    const aoMudar = vi.fn();
    render(<Subtarefas corpo={corpo} onChange={aoMudar} />);

    await userEvent.click(screen.getAllByLabelText("Remover subtarefa")[0]);

    const novo: string = aoMudar.mock.calls[0][0];
    const restantes = lerSubtarefas(novo);
    expect(restantes).toHaveLength(1);
    expect(restantes[0].texto).toBe("revisar os textos");
    expect(novo).toContain("## Tempo");
  });

  it("sem subtarefa nenhuma não mostra barra de progresso", () => {
    render(<Subtarefas corpo="só um texto" onChange={() => {}} />);
    expect(screen.queryByText("0/0")).toBeNull();
  });

  it("renderiza formatação em markdown como negrito e itálico nos passos", () => {
    const textoComNegrito = "- [ ] comprar **tinta guache** e *pincel fino*";
    render(<Subtarefas corpo={textoComNegrito} onChange={() => {}} />);

    const negrito = screen.getByText("tinta guache");
    expect(negrito.tagName.toLowerCase()).toBe("strong");

    const italico = screen.getByText("pincel fino");
    expect(italico.tagName.toLowerCase()).toBe("em");
  });
});
