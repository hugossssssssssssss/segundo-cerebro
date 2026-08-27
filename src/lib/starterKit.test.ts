import { describe, it, expect, vi } from "vitest";
import { gerarItensKitInicial, criarKitInicial } from "./starterKit";
import { PASTAS } from "./tipos";
import { PADRAO, type Settings } from "./settings";

vi.mock("./github", () => ({
  gravar: vi.fn().mockResolvedValue("mock_sha_123"),
}));

vi.mock("./repo", () => ({
  invalidarCache: vi.fn(),
}));

describe("starterKit", () => {
  it("deve gerar itens com os caminhos e conteúdos esperados", () => {
    const itens = gerarItensKitInicial("Hugo Silva");
    expect(itens.length).toBe(3);

    const caminhos = itens.map((i) => i.caminho);
    expect(caminhos).toContain(`${PASTAS.notas}/Bem-vindo ao Klaus.md`);
    expect(caminhos).toContain(`${PASTAS.tarefas}/Primeiros passos no seu Segundo Cérebro.md`);
    expect(caminhos).toContain(`${PASTAS.metas}/Construir meu Segundo Cérebro.md`);

    const nota = itens.find((i) => i.caminho.includes("Bem-vindo"));
    expect(nota?.conteudo).toContain("Hugo Silva");
    expect(nota?.conteudo).toContain("---");
    expect(nota?.conteudo).toContain("tipo: nota");
  });

  it("deve gravar os arquivos no repositório se a config for válida", async () => {
    const cfg: Settings = {
      ...PADRAO,
      githubToken: "ghp_validToken123",
      repoOwner: "hugos",
      repoName: "segundo-cerebro-dados",
      nomeUsuario: "Hugo",
      profissaoUsuario: "Design Gráfico",
    };

    const criados = await criarKitInicial(cfg);
    expect(criados).toBe(3);
  });

  it("não deve tentar gravar se a config estiver incompleta", async () => {
    const cfg: Settings = {
      ...PADRAO,
      githubToken: "",
      repoOwner: "",
      repoName: "",
    };

    const criados = await criarKitInicial(cfg);
    expect(criados).toBe(0);
  });
});
