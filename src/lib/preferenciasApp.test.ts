import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  lerPreferenciasGeraisLocal,
  aplicarPreferenciasGerais,
  lerTodasPreferenciasLocal,
  aplicarTodasPreferenciasLocal,
  obterStatusSincronizacao,
  sincronizarTudoComGithub,
  type PreferenciasGerais,
  type PreferenciasKlausConsolidadas,
} from "./preferenciasApp";
import { PADRAO, type Settings } from "./settings";
import * as github from "./github";

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

  it("lê preferências gerais locais com fallback seguro", () => {
    const prefs = lerPreferenciasGeraisLocal();
    expect(prefs).toBeDefined();
    expect(prefs.tema).toBeDefined();
  });

  it("aplica preferências gerais no localStorage", () => {
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

  it("lê e aplica conjunto completo consolidado de preferências", () => {
    const todas = lerTodasPreferenciasLocal();
    expect(todas.versaoSchema).toBe(2);
    expect(Array.isArray(todas.favoritos)).toBe(true);
    expect(Array.isArray(todas.menu)).toBe(true);
    expect(Array.isArray(todas.widgets)).toBe(true);

    const custom: Partial<PreferenciasKlausConsolidadas> = {
      favoritos: [{ id: "f-1", url: "https://klaus.app", nome: "Klaus Web" }],
      gerais: { tema: "escuro", modoEdicaoHome: false },
    };

    aplicarTodasPreferenciasLocal(custom);
    const posAplicacao = lerTodasPreferenciasLocal();
    expect(posAplicacao.favoritos[0]?.nome).toBe("Klaus Web");
    expect(posAplicacao.gerais?.tema).toBe("escuro");
  });

  it("sincroniza preferências consolidadas recebidas do GitHub", async () => {
    const mockRemoto: PreferenciasKlausConsolidadas = {
      versaoSchema: 2,
      atualizadoEm: "2026-09-07T12:00:00Z",
      favoritos: [{ id: "remoto-1", url: "https://google.com", nome: "Google" }],
      menu: [],
      widgets: [],
      gerais: { tema: "escuro" },
    };

    vi.spyOn(github, "ler").mockResolvedValue({
      texto: JSON.stringify(mockRemoto),
      sha: "sha_teste_123",
    });

    const res = await sincronizarTudoComGithub(cfg);
    expect(res.sucesso).toBe(true);

    const status = obterStatusSincronizacao();
    expect(status.sucesso).toBe(true);
    expect(status.ultimaSincronizacao).toBeDefined();

    const locais = lerTodasPreferenciasLocal();
    expect(locais.favoritos[0]?.nome).toBe("Google");
  });

  it("reconcilia favoritos e menus vindos de arquivos específicos (.klaus/favoritos.json e .klaus/menu.json)", async () => {
    vi.spyOn(github, "ler").mockImplementation(async (_cfg, caminho) => {
      if (caminho === ".klaus/favoritos.json") {
        return {
          texto: JSON.stringify([
            { id: "fav-remoto-especifico", url: "https://github.com", nome: "GitHub" },
          ]),
          sha: "sha_fav",
        };
      }
      if (caminho === ".klaus/menu.json") {
        return {
          texto: JSON.stringify([
            {
              id: "grupo-custom",
              titulo: "Trabalho",
              itens: [{ id: "tarefas", para: "/tarefas", rotulo: "Minhas Tarefas", iconeNome: "CheckSquare" }],
            },
          ]),
          sha: "sha_menu",
        };
      }
      return null as any;
    });

    const res = await sincronizarTudoComGithub(cfg);
    expect(res.sucesso).toBe(true);

    const locais = lerTodasPreferenciasLocal();
    expect(locais.favoritos.some((f) => f.id === "fav-remoto-especifico")).toBe(true);
    expect(locais.menu[0]?.titulo).toBe("Trabalho");
    expect(locais.menu[0]?.itens[0]?.rotulo).toBe("Minhas Tarefas");
  });

  it("executa envio forçado local para o GitHub sem erros", async () => {
    vi.spyOn(github, "gravar").mockResolvedValue("novo_sha_456");

    const res = await sincronizarTudoComGithub(cfg, { forcarEnvioLocal: true });
    expect(res.sucesso).toBe(true);
  });
});
