import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProjetoCustomizado from "./ProjetoCustomizado";
import { salvarProjetoCustomizado } from "@/lib/projetosExtensoes";

describe("Página ProjetoCustomizado", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renderiza aviso amigável quando projeto não é encontrado", () => {
    render(
      <MemoryRouter initialEntries={["/projeto/inexistente"]}>
        <Routes>
          <Route path="/projeto/:idProjeto" element={<ProjetoCustomizado />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getAllByText("Projeto não encontrado").length).toBeGreaterThan(0);
    expect(screen.getByText("Ir para a Biblioteca de Projetos")).toBeDefined();
  });

  it("renderiza projeto customizado com tipo URL", () => {
    salvarProjetoCustomizado({
      id: "teste_url",
      nome: "Calculadora de Orçamento",
      descricao: "Ferramenta para cálculo de propostas de design",
      categoria: "design",
      tipo: "url_integrada",
      ativo: true,
      urlEmbed: "https://example.com/calc",
      icone: "FolderGit2",
      cor: "#6366f1",
    });

    render(
      <MemoryRouter initialEntries={["/projeto/teste_url"]}>
        <Routes>
          <Route path="/projeto/:idProjeto" element={<ProjetoCustomizado />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Calculadora de Orçamento")).toBeDefined();
    expect(screen.getByText("Ferramenta para cálculo de propostas de design")).toBeDefined();
    expect(screen.getByText("Projeto Pessoal")).toBeDefined();
    expect(screen.getByText("Editar Projeto")).toBeDefined();
  });
});
