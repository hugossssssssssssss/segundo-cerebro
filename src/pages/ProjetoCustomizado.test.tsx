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

  it("renderiza projeto do tipo código customizado com sandbox do Klaus Engine", () => {
    salvarProjetoCustomizado({
      id: "teste_codigo",
      nome: "Gerador de Paletas",
      descricao: "Mini-app em HTML/JS",
      categoria: "design",
      tipo: "codigo_customizado",
      ativo: true,
      codigoHtml: "<div id='paleta'>Conteudo do App</div>",
      icone: "FolderGit2",
      cor: "#f59e0b",
    });

    render(
      <MemoryRouter initialEntries={["/projeto/teste_codigo"]}>
        <Routes>
          <Route path="/projeto/:idProjeto" element={<ProjetoCustomizado />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Gerador de Paletas")).toBeDefined();
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeDefined();
    expect(iframe?.getAttribute("sandbox")).toBe("allow-scripts allow-forms allow-popups");
  });
});
