import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import BibliotecaExtensoes from "./BibliotecaExtensoes";

describe("Página BibliotecaExtensoes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renderiza o cabeçalho clean da biblioteca e catálogo", () => {
    render(
      <MemoryRouter>
        <BibliotecaExtensoes />
      </MemoryRouter>
    );

    expect(screen.getByText("Biblioteca de Projetos")).toBeDefined();
    expect(screen.getByText("Catálogo de Extensões")).toBeDefined();
    expect(screen.queryByText("Total Disponível")).toBeNull();
  });

  it("lista extensões curadas do catálogo da biblioteca", () => {
    render(
      <MemoryRouter>
        <BibliotecaExtensoes />
      </MemoryRouter>
    );

    expect(screen.getByText("Conversor de Formatos")).toBeDefined();
    expect(screen.getByText("Utilitários Criativos")).toBeDefined();
    expect(screen.getByText("Ferramentas de PDF & Documentos")).toBeDefined();
  });

  it("permite filtrar extensões pela busca direta", () => {
    render(
      <MemoryRouter>
        <BibliotecaExtensoes />
      </MemoryRouter>
    );

    const inputBusca = screen.getByPlaceholderText(
      "Buscar extensões e projetos na biblioteca..."
    );
    fireEvent.change(inputBusca, { target: { value: "PDF" } });

    expect(screen.getByText("Ferramentas de PDF & Documentos")).toBeDefined();
    expect(screen.queryByText("Sons de Concentração & Foco")).toBeNull();
  });

  it("permite instalar uma extensão no repositório de dados ao clicar", async () => {
    render(
      <MemoryRouter>
        <BibliotecaExtensoes />
      </MemoryRouter>
    );

    const botoesInstalar = screen.getAllByText("Instalar no Repositório");
    expect(botoesInstalar.length).toBeGreaterThan(0);

    fireEvent.click(botoesInstalar[0]);

    await waitFor(() => {
      expect(screen.getAllByText("No repositório").length).toBeGreaterThan(0);
    });
  });

  it("abre modal para criar novo projeto ao clicar no botão", () => {
    render(
      <MemoryRouter>
        <BibliotecaExtensoes />
      </MemoryRouter>
    );

    const botaoNovo = screen.getByText("Novo Projeto");
    fireEvent.click(botaoNovo);

    expect(screen.getByText("Novo Projeto no Repositório")).toBeDefined();
    expect(screen.getByPlaceholderText("Ex: Painel de Briefings, Ferramenta de Custos...")).toBeDefined();
  });
});
