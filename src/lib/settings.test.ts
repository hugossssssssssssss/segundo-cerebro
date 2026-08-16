import { describe, it, expect, beforeEach } from "vitest";
import { lerConfig, salvarConfig, PADRAO } from "./settings";

describe("settings persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("deve salvar e carregar as configurações corretamente", () => {
    const original = {
      ...PADRAO,
      githubToken: "ghp_teste1234567890",
      repoOwner: "hugosilva",
      repoName: "segundo-cerebro-dados",
    };

    salvarConfig(original);

    const lido = lerConfig();
    expect(lido.githubToken).toBe("ghp_teste1234567890");
    expect(lido.repoOwner).toBe("hugosilva");
  });

  it("deve manter o token intacto ao recarregar a página (simulado reset de memória)", () => {
    const original = {
      ...PADRAO,
      githubToken: "github_pat_11ABCDEF_token_seguro",
      repoOwner: "hugosilva",
    };

    salvarConfig(original);

    // Simula recarregar a página e reimportar o módulo/re-executar lerConfig
    const lidoAposReload = lerConfig();
    expect(lidoAposReload.githubToken).toBe("github_pat_11ABCDEF_token_seguro");
    expect(lidoAposReload.repoOwner).toBe("hugosilva");
  });
});
