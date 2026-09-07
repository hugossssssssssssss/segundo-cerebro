import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  carregarConfigWidgetsLocal,
  salvarConfigWidgetsLocal,
  sincronizarWidgetsComGithub,
  obterCatalogoWidgetsPersonalizado,
  obterInfoWidgetPersonalizado,
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

  it("obterCatalogoWidgetsPersonalizado reflete nomes, ícones e cores customizados no Personalizar Menu", () => {
    const gruposCustom = [
      {
        id: "grupo-1",
        titulo: "Dia a Dia",
        itens: [
          { id: "tarefas", para: "/tarefas", rotulo: "Minhas Ações", iconeNome: "CheckCircle2", cor: "#10b981" },
          { id: "notas", para: "/notas", rotulo: "Caderno Digital", iconeNome: "BookOpen", cor: "#f59e0b" },
          { id: "referencias", para: "/referencias", rotulo: "Mural de Inspiração", iconeNome: "Eye", cor: "#8b5cf6" },
        ],
      },
      {
        id: "grupo-2",
        titulo: "Ferramentas",
        itens: [
          { id: "pdf", para: "/pdf", rotulo: "PDF Studio", iconeNome: "FileCheck", cor: "#ef4444" },
          { id: "conversor", para: "/conversor", rotulo: "Format Switcher", iconeNome: "RefreshCw" },
        ],
      },
    ];

    const catalogo = obterCatalogoWidgetsPersonalizado(gruposCustom);

    const widgetTarefas = catalogo.find((w: any) => w.id === "foco_hoje");
    expect(widgetTarefas).toBeDefined();
    expect(widgetTarefas?.titulo).toBe("Minhas Ações");
    expect(widgetTarefas?.icone).toBe("CheckCircle2");
    expect(widgetTarefas?.cor).toBe("#10b981");

    const widgetNotas = catalogo.find((w: any) => w.id === "notas_recentes");
    expect(widgetNotas).toBeDefined();
    expect(widgetNotas?.titulo).toBe("Caderno Digital");
    expect(widgetNotas?.icone).toBe("BookOpen");
    expect(widgetNotas?.cor).toBe("#f59e0b");

    const widgetPDF = catalogo.find((w: any) => w.id === "ferramentas_pdf");
    expect(widgetPDF?.titulo).toBe("PDF Studio");
    expect(widgetPDF?.icone).toBe("FileCheck");
    expect(widgetPDF?.cor).toBe("#ef4444");

    const widgetScratchpad = catalogo.find((w: any) => w.id === "scratchpad");
    expect(widgetScratchpad?.titulo).toBe("Rascunho Rápido");

    const infoEspecifico = obterInfoWidgetPersonalizado("referencias_mural", gruposCustom);
    expect(infoEspecifico?.titulo).toBe("Mural de Inspiração");
    expect(infoEspecifico?.cor).toBe("#8b5cf6");
  });
});
