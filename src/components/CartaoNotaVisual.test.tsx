import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CartaoNotaVisual } from "./CartaoNotaVisual";
import type { Nota } from "@/lib/tipos";

describe("CartaoNotaVisual", () => {
  afterEach(() => {
    cleanup();
  });

  const notaMock: Nota = {
    caminho: "notas/teste.md",
    sha: "123",
    bruto: {},
    titulo: "Design System Klaus",
    corpo: "Conteúdo descritivo da nota com orientações.",
    tipo: "nota",
    tags: ["design", "ui"],
    responsaveis: ["mariadesign", "hugosilva"],
  };

  it("renderiza o título da nota e as tags", () => {
    render(<CartaoNotaVisual nota={notaMock} tituloNota="Design System Klaus" visao="grade" />);
    expect(screen.getByText("Design System Klaus")).toBeTruthy();
    expect(screen.getAllByText(/design/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ui/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renderiza avatares dos responsáveis na visualização em grade", () => {
    render(<CartaoNotaVisual nota={notaMock} tituloNota="Design System Klaus" visao="grade" />);
    const avatares = screen.getAllByRole("img");
    expect(avatares.length).toBeGreaterThanOrEqual(2);
    expect(avatares[0].getAttribute("src")).toContain("mariadesign.png");
    expect(avatares[1].getAttribute("src")).toContain("hugosilva.png");
  });

  it("renderiza avatar do autor criadoPor se não houver responsáveis específicos", () => {
    const notaSemResp: Nota = {
      ...notaMock,
      responsaveis: [],
      criadoPor: "carlos",
    };
    render(<CartaoNotaVisual nota={notaSemResp} tituloNota="Design System Klaus" visao="grade" />);
    const avatares = screen.getAllByRole("img");
    expect(avatares.length).toBeGreaterThanOrEqual(1);
    expect(avatares[0].getAttribute("src")).toContain("carlos.png");
  });

  it("renderiza corretamente na visão em lista", () => {
    render(<CartaoNotaVisual nota={notaMock} tituloNota="Design System Klaus" visao="lista" />);
    expect(screen.getByText("Design System Klaus")).toBeTruthy();
    const avatares = screen.getAllByRole("img");
    expect(avatares.length).toBeGreaterThanOrEqual(2);
  });
});
