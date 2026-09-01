import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MenuAcoesTarefa } from "./MenuAcoesTarefa";
import type { Tarefa } from "@/lib/tarefas";

afterEach(cleanup);

const mockTarefa: Tarefa = {
  bruto: {},
  caminho: "tarefas/design-sistema.md",
  sha: "123",
  titulo: "Criar Design System",
  status: "a-fazer",
  tags: ["design"],
  corpo: "",
};

describe("MenuAcoesTarefa", () => {
  it("renderiza o botão de opções", () => {
    render(<MenuAcoesTarefa tarefa={mockTarefa} triggerVisivelSempre={true} />);
    expect(screen.getByLabelText("Opções para Criar Design System")).toBeTruthy();
  });

  it("abre o popover e dispara as ações correspondentes", async () => {
    const aoAlternarStatus = vi.fn();
    const aoAdiarPrazo = vi.fn();
    const aoDuplicar = vi.fn();
    const aoRegistrarEntregaPDI = vi.fn();
    const aoExcluir = vi.fn();

    render(
      <MenuAcoesTarefa
        tarefa={mockTarefa}
        triggerVisivelSempre={true}
        aoAlternarStatus={aoAlternarStatus}
        aoAdiarPrazo={aoAdiarPrazo}
        aoDuplicar={aoDuplicar}
        aoRegistrarEntregaPDI={aoRegistrarEntregaPDI}
        aoExcluir={aoExcluir}
      />
    );

    const trigger = screen.getByLabelText("Opções para Criar Design System");
    await userEvent.click(trigger);

    expect(screen.getByText("Marcar como feita")).toBeTruthy();
    expect(screen.getByText("Adiar para amanhã (+1 dia)")).toBeTruthy();
    expect(screen.getByText("Registrar entrega no PDI")).toBeTruthy();
    expect(screen.getByText("Duplicar tarefa")).toBeTruthy();
    expect(screen.getByText("Excluir tarefa")).toBeTruthy();

    await userEvent.click(screen.getByText("Marcar como feita"));
    expect(aoAlternarStatus).toHaveBeenCalledTimes(1);
  });
});
