import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ZonasArrastoGlobal } from "./ZonasArrastoGlobal";
import { ProvedorFlutuanteGlobal } from "./ItemFlutuanteContext";
import { EVENTO_DRAG_INICIADO } from "@/lib/arrastoItem";

describe("ZonasArrastoGlobal", () => {
  beforeEach(() => {
    cleanup();
  });

  it("não renderiza quando não há arrasto ativo", () => {
    render(
      <ProvedorFlutuanteGlobal>
        <ZonasArrastoGlobal />
      </ProvedorFlutuanteGlobal>
    );

    expect(screen.queryByText("Abrir à Esquerda")).toBeNull();
  });

  it("renderiza as 3 zonas quando evento de drag é iniciado", () => {
    render(
      <ProvedorFlutuanteGlobal>
        <ZonasArrastoGlobal />
      </ProvedorFlutuanteGlobal>
    );

    fireEvent(
      window,
      new CustomEvent(EVENTO_DRAG_INICIADO, {
        detail: { caminho: "notas/minha-nota.md", titulo: "Minha Nota" },
      })
    );

    expect(screen.getByText("Abrir à Esquerda")).toBeDefined();
    expect(screen.getByText("Abrir no Centro")).toBeDefined();
    expect(screen.getByText("Abrir à Direita")).toBeDefined();
  });
});
