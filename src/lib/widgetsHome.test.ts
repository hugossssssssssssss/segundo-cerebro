import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  carregarConfigWidgetsLocal,
  salvarConfigWidgetsLocal,
  sincronizarWidgetsComGithub,
} from "./widgetsHome";
import { CONFIG_PADRAO_WIDGETS } from "@/components/home/types";
import { PADRAO, type Settings } from "./settings";
import * as github from "./github";

vi.mock("./github", () => ({
  ler: vi.fn(),
  gravar: vi.fn(),
}));

describe("widgetsHome", () => {
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

  it("retorna configuração padrão quando localStorage está vazio", () => {
    const config = carregarConfigWidgetsLocal();
    expect(config).toEqual(CONFIG_PADRAO_WIDGETS);
  });

  it("salva e carrega configuração localmente", () => {
    const custom = [
      { id: "busca_web", ativo: true, colunas: 12 as const, alturaPx: 100, ordem: 0 },
      { id: "scratchpad", ativo: false, colunas: 6 as const, alturaPx: 300, ordem: 1 },
    ];
    salvarConfigWidgetsLocal(custom);
    const carregados = carregarConfigWidgetsLocal();
    expect(carregados).toEqual(custom);
  });

  it("sincroniza widgets a partir do GitHub quando disponível", async () => {
    const remotos = [
      { id: "foco_hoje", ativo: true, colunas: 6 as const, alturaPx: 250, ordem: 0 },
    ];

    vi.mocked(github.ler).mockResolvedValueOnce({
      texto: JSON.stringify(remotos),
      sha: "sha-widgets-123",
    });

    const res = await sincronizarWidgetsComGithub(cfg);
    expect(res.sincronizado).toBe(true);
    expect(res.config).toEqual(remotos);
    expect(carregarConfigWidgetsLocal()).toEqual(remotos);
  });
});
