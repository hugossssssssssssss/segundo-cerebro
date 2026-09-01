import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModalGuiaAtalhos } from "./ModalGuiaAtalhos";

afterEach(cleanup);

describe("ModalGuiaAtalhos", () => {
  it("não renderiza quando aberto for false", () => {
    render(<ModalGuiaAtalhos aberto={false} aoFechar={vi.fn()} />);
    expect(screen.queryByText("Atalhos do Teclado no Klaus")).toBeNull();
  });

  it("renderiza os grupos de atalhos quando aberto", () => {
    render(<ModalGuiaAtalhos aberto={true} aoFechar={vi.fn()} />);
    expect(screen.getByText("Atalhos do Teclado no Klaus")).toBeTruthy();
    expect(screen.getByText("Navegação e Ações Globais")).toBeTruthy();
    expect(screen.getByText("Produtividade no Kanban de Tarefas")).toBeTruthy();
    expect(screen.getByText("Editor e Conexões")).toBeTruthy();
  });

  it("chama aoFechar ao fechar o modal", async () => {
    const aoFechar = vi.fn();
    render(<ModalGuiaAtalhos aberto={true} aoFechar={aoFechar} />);
    const botaoFechar = screen.getByLabelText("Fechar");
    await userEvent.click(botaoFechar);
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });
});
