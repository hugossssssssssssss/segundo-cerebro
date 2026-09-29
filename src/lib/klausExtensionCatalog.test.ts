import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  obterCatalogoBiblioteca,
  instalarExtensaoNoRepositorio,
  desinstalarExtensaoDoRepositorio,
  verificarExtensaoInstalada,
} from "./klausExtensionCatalog";
import * as github from "./github";
import type { Settings } from "./settings";

vi.mock("./github", () => ({
  ler: vi.fn(),
  gravar: vi.fn().mockResolvedValue("sha-mock-123"),
  apagar: vi.fn().mockResolvedValue(true),
}));

describe("Módulo klausExtensionCatalog", () => {
  const cfgMock: Settings = {
    githubToken: "token-teste",
    repoOwner: "hugossssssssssssss",
    repoName: "segundo-cerebro-dados",
    branch: "main",
    nomeUsuario: "Hugo Silva",
    profissaoUsuario: "Designer",
    onboardingConcluido: true,
    geminiKey: "",
    geminiModel: "gemini-2.0-flash",
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("retorna o catálogo de extensões curadas", () => {
    const catalogo = obterCatalogoBiblioteca();
    expect(catalogo.length).toBeGreaterThan(0);
    expect(catalogo.some((c) => c.id === "conversor")).toBe(true);
    expect(catalogo.some((c) => c.id === "it_tools")).toBe(true);
  });

  it("instala extensão no repositório privado do usuário", async () => {
    expect(verificarExtensaoInstalada("conversor")).toBe(false);

    const res = await instalarExtensaoNoRepositorio("conversor", cfgMock);
    expect(res.sucesso).toBe(true);

    // Verifica se gravou arquivos no GitHub (.klaus/projetos/conversor/manifest.json e index.html)
    expect(github.gravar).toHaveBeenCalledTimes(2);
    expect(github.gravar).toHaveBeenCalledWith(
      cfgMock,
      ".klaus/projetos/conversor/manifest.json",
      expect.any(String),
      undefined,
      expect.stringContaining("manifesto")
    );
    expect(github.gravar).toHaveBeenCalledWith(
      cfgMock,
      ".klaus/projetos/conversor/index.html",
      expect.any(String),
      undefined,
      expect.stringContaining("código")
    );

    // Agora deve constar como instalada
    expect(verificarExtensaoInstalada("conversor")).toBe(true);
  });

  it("desinstala extensão do repositório privado", async () => {
    // Instala primeiro
    await instalarExtensaoNoRepositorio("conversor", cfgMock);
    expect(verificarExtensaoInstalada("conversor")).toBe(true);

    // Mock para encontrar SHA ao ler antes de apagar
    vi.mocked(github.ler).mockResolvedValue({ texto: "{}", sha: "sha-existente" });

    // Desinstala
    const res = await desinstalarExtensaoDoRepositorio("conversor", cfgMock);
    expect(res.sucesso).toBe(true);

    expect(github.apagar).toHaveBeenCalledWith(
      cfgMock,
      ".klaus/projetos/conversor/manifest.json",
      "sha-existente"
    );

    expect(verificarExtensaoInstalada("conversor")).toBe(false);
  });
});
