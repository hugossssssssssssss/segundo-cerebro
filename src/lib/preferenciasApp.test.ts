import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  lerPreferenciasGeraisLocal,
  aplicarPreferenciasGerais,
  sincronizarTudoComGithub,
  type PreferenciasGerais,
} from "./preferenciasApp";
import { PADRAO, type Settings } from "./settings";

describe("preferenciasApp", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const cfg: Settings = {
    ...PADRAO,
    repoOwner: "usuario",
    repoName: "segundo-cerebro-dados",
    githubToken: "ghp_teste",
    branch: "main",
  };

  it("lê preferências locais com fallback seguro", () => {
    const prefs = lerPreferenciasGeraisLocal();
    expect(prefs).toBeDefined();
    expect(prefs.tema).toBeDefined();
  });

  it("aplica preferências no localStorage", () => {
    const novas: PreferenciasGerais = {
      tema: "escuro",
      modoEdicaoHome: true,
      noticiasModoExibicao: "grade",
      favoritosBusca: ["teste 1", "teste 2"],
    };

    aplicarPreferenciasGerais(novas);

    const salvas = lerPreferenciasGeraisLocal();
    expect(salvas.tema).toBe("escuro");
    expect(salvas.modoEdicaoHome).toBe(true);
    expect(salvas.noticiasModoExibicao).toBe("grade");
    expect(salvas.favoritosBusca).toEqual(["teste 1", "teste 2"]);
  });

  it("executa sincronização global de preferências sem estourar erros", async () => {
    await expect(sincronizarTudoComGithub(cfg)).resolves.not.toThrow();
  });
});
