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

    expect(screen.getByLabelText("Marcar como feita")).toBeTruthy();
    expect(screen.getByText("Adiar")).toBeTruthy();
    expect(screen.getByText("Registrar entrega no PDI")).toBeTruthy();
    expect(screen.getByLabelText("Duplicar tarefa")).toBeTruthy();
    expect(screen.getByText("Excluir tarefa")).toBeTruthy();

    // Clica no botão de alternar status
    await userEvent.click(screen.getByLabelText("Marcar como feita"));
    expect(aoAlternarStatus).toHaveBeenCalledTimes(1);
  });

  it("abre o submenu de adiar e dispara aoAdiarPrazo", async () => {
    const aoAdiarPrazo = vi.fn();

    render(
      <MenuAcoesTarefa
        tarefa={mockTarefa}
        triggerVisivelSempre={true}
        aoAdiarPrazo={aoAdiarPrazo}
      />
    );

    const trigger = screen.getByLabelText("Opções para Criar Design System");
    await userEvent.click(trigger);

    const btnAdiar = screen.getByText("Adiar");
    await userEvent.click(btnAdiar);

    expect(screen.getByText("Amanhã")).toBeTruthy();
    expect(screen.getByText("3 dias")).toBeTruthy();
    expect(screen.getByText("1 semana")).toBeTruthy();
    expect(screen.getByText("1 mês")).toBeTruthy();

    await userEvent.click(screen.getByText("Amanhã"));
    expect(aoAdiarPrazo).toHaveBeenCalledWith(1);
  });
});
