import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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

  it("renderiza o cabeçalho e estatísticas da biblioteca", () => {
    render(
      <MemoryRouter>
        <BibliotecaExtensoes />
      </MemoryRouter>
    );

    expect(screen.getByText("Biblioteca de Projetos & Extensões")).toBeDefined();
    expect(screen.getByText("Total Disponível")).toBeDefined();
    expect(screen.getByText("Extensões Ativas")).toBeDefined();
    expect(screen.getByText("Projetos Criados")).toBeDefined();
  });

  it("lista extensões nativas do catálogo", () => {
    render(
      <MemoryRouter>
        <BibliotecaExtensoes />
      </MemoryRouter>
    );

    expect(screen.getByText("IT-Tools Criativas")).toBeDefined();
    expect(screen.getByText("Conversor Multimídia")).toBeDefined();
    expect(screen.getByText("Ferramentas PDF & Scanner")).toBeDefined();
  });

  it("permite filtrar extensões pela busca", () => {
    render(
      <MemoryRouter>
        <BibliotecaExtensoes />
      </MemoryRouter>
    );

    const inputBusca = screen.getByPlaceholderText(
      "Buscar extensões por nome, recurso ou categoria..."
    );
    fireEvent.change(inputBusca, { target: { value: "PDF" } });

    expect(screen.getByText("Ferramentas PDF & Scanner")).toBeDefined();
    expect(screen.queryByText("Sons de Foco & Binaurais")).toBeNull();
  });

  it("permite ativar e desativar uma extensão com clique", () => {
    render(
      <MemoryRouter>
        <BibliotecaExtensoes />
      </MemoryRouter>
    );

    // Encontra os botões de ativação
    const botoes = screen.getAllByTitle("Clique para ativar no menu");
    expect(botoes.length).toBeGreaterThan(0);

    // Clica para ativar o primeiro
    fireEvent.click(botoes[0]);

    // Agora deve constar como ativo
    expect(screen.getAllByText("Ativa").length).toBeGreaterThan(0);
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
