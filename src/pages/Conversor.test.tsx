import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Conversor from "./Conversor";
import { GeradorEpub } from "@/lib/epub";

describe("Página Conversor", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderiza os cards de seleção de ferramentas do conversor", () => {
    render(
      <MemoryRouter initialEntries={["/conversor"]}>
        <Conversor />
      </MemoryRouter>
    );

    expect(screen.getByText("Conversor de Arquivos")).toBeDefined();
    expect(screen.getByText("PDF para PNG")).toBeDefined();
    expect(screen.getByText("PDF para EPUB")).toBeDefined();
    expect(screen.getByText("Trocar Capa de EPUB")).toBeDefined();
    expect(screen.getByText("Imagens para PDF")).toBeDefined();
  });

  it("abre a ferramenta PDF para EPUB ao clicar na opção", () => {
    render(
      <MemoryRouter initialEntries={["/conversor?ferramenta=pdf_para_epub"]}>
        <Conversor />
      </MemoryRouter>
    );

    expect(
      screen.getByText("O texto do PDF será extraído para criar um livro EPUB fluido")
    ).toBeDefined();
    expect(screen.getByText("Selecionar PDF")).toBeDefined();
  });

  it("permite mudar de ferramenta clicando no grid", () => {
    render(
      <MemoryRouter initialEntries={["/conversor"]}>
        <Conversor />
      </MemoryRouter>
    );

    const btnEpub = screen.getByRole("button", { name: /PDF para EPUB/i });
    fireEvent.click(btnEpub);

    expect(
      screen.getByText("O texto do PDF será extraído para criar um livro EPUB fluido")
    ).toBeDefined();
  });

  it("valida instanciação e criação de documento com GeradorEpub nativo", async () => {
    expect(typeof GeradorEpub).toBe("function");

    const inst = new GeradorEpub();
    inst.init({
      i18n: "pt",
      title: "Livro de Teste",
      author: "Hugo Silva",
      publisher: "Klaus",
    });

    inst.add("Página 1", [
      "Primeiro parágrafo do livro.",
      "Segundo parágrafo com caracteres especiais: 100% & <teste> e tags <%= algo %>.",
    ]);
    const epubData = await inst.generate("uint8array");
    expect(epubData).toBeDefined();
    expect((epubData as Uint8Array).length).toBeGreaterThan(500);

    // Valida também geração em formato Blob
    const blob = (await inst.generate("blob")) as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(500);
  });
});
