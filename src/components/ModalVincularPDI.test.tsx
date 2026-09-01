import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ModalVincularPDI } from "./ModalVincularPDI";
import type { Tarefa } from "@/lib/tarefas";

afterEach(cleanup);

const mockTarefa: Tarefa = {
  bruto: {},
  caminho: "tarefas/marca-x.md",
  sha: "abc",
  titulo: "Entrega Marca X",
  status: "feito",
  tags: ["marca"],
  corpo: "Identidade visual concluída.",
};

describe("ModalVincularPDI", () => {
  it("não renderiza quando aberto for false", () => {
    render(
      <ModalVincularPDI
        tarefa={mockTarefa}
        aberto={false}
        aoFechar={vi.fn()}
      />
    );
    expect(screen.queryByText("Registrar como Entrega de Meta (PDI)")).toBeNull();
  });

  it("renderiza quando aberto for true com tarefa", () => {
    render(
      <ModalVincularPDI
        tarefa={mockTarefa}
        aberto={true}
        aoFechar={vi.fn()}
      />
    );
    expect(screen.getByText("Registrar como Entrega de Meta (PDI)")).toBeTruthy();
  });
});
