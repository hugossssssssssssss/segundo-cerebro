/**
 * O modal é a última barreira entre um toque desatento e o texto que você
 * acabou de escrever. Estes testes travam esse comportamento.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./ui";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function abrir(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  const aoFechar = vi.fn();
  render(
    <Modal aberto titulo="Editar tarefa" aoFechar={aoFechar} {...props}>
      <p>conteúdo</p>
    </Modal>,
  );
  return aoFechar;
}

describe("Modal", () => {
  it("fechado não renderiza nada", () => {
    render(
      <Modal aberto={false} titulo="X" aoFechar={() => {}}>
        <p>conteúdo</p>
      </Modal>,
    );
    expect(screen.queryByText("conteúdo")).toBeNull();
  });

  it("sem mudanças, o clique fora fecha direto", async () => {
    const aoFechar = abrir();
    await userEvent.click(screen.getByRole("dialog"));
    expect(aoFechar).toHaveBeenCalled();
  });

  it("com mudanças, o clique fora PEDE confirmação", async () => {
    // um toque desatento na área escura, rolando um campo longo, apagava
    // tudo que tinha sido digitado
    vi.stubGlobal("confirm", vi.fn(() => false));
    const aoFechar = abrir({ temMudancas: true });

    await userEvent.click(screen.getByRole("dialog"));

    expect(confirm).toHaveBeenCalled();
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it("confirmando o descarte, fecha", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    const aoFechar = abrir({ temMudancas: true });

    await userEvent.click(screen.getByRole("dialog"));

    expect(aoFechar).toHaveBeenCalled();
  });

  it("Esc respeita a mesma proteção", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const aoFechar = abrir({ temMudancas: true });

    await userEvent.keyboard("{Escape}");

    expect(aoFechar).not.toHaveBeenCalled();
  });

  it("clicar DENTRO do modal nunca fecha", async () => {
    const aoFechar = abrir({ temMudancas: true });
    await userEvent.click(screen.getByText("conteúdo"));
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it("trava a rolagem do fundo enquanto está aberto", () => {
    abrir();
    expect(document.body.style.overflow).toBe("hidden");
    cleanup();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
