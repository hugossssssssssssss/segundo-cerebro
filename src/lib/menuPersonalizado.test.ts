import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  carregarMenuPersonalizado,
  salvarMenuPersonalizado,
  restaurarMenuPadrao,
  GRUPOS_MENU_PADRAO,
  CHAVE_STORAGE_MENU,
  type GrupoMenuPersonalizado,
} from "./menuPersonalizado";

describe("menuPersonalizado", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("deve carregar o menu padrão quando não há nada no localStorage", () => {
    const grupos = carregarMenuPersonalizado();
    expect(grupos).toEqual(GRUPOS_MENU_PADRAO);
  });

  it("deve salvar e carregar as personalizações corretamente", () => {
    const gruposCustom: GrupoMenuPersonalizado[] = [
      {
        id: "dia-a-dia",
        titulo: "Minha Rotina",
        itens: [
          { id: "home", para: "/home", rotulo: "Painel Principal", iconeNome: "Sparkles", cor: "#f59e0b" },
          { id: "tarefas", para: "/tarefas", rotulo: "A Fazer", iconeNome: "CheckSquare" },
        ],
      },
    ];

    salvarMenuPersonalizado(gruposCustom);
    const carregados = carregarMenuPersonalizado();

    expect(carregados[0].titulo).toBe("Minha Rotina");
    expect(carregados[0].itens[0].rotulo).toBe("Painel Principal");
    expect(carregados[0].itens[0].iconeNome).toBe("Sparkles");
    expect(carregados[0].itens[0].cor).toBe("#f59e0b");
  });

  it("deve suportar criação de novas categorias personalizadas pelo usuário", () => {
    const gruposCustom: GrupoMenuPersonalizado[] = [
      ...GRUPOS_MENU_PADRAO,
      {
        id: "categoria-customizada-1",
        titulo: "Projetos Pessoais",
        itens: [
          { id: "lousas", para: "/lousas", rotulo: "Meus Esboços", iconeNome: "Palette", cor: "#ec4899" },
        ],
      },
    ];

    salvarMenuPersonalizado(gruposCustom);
    const carregados = carregarMenuPersonalizado();

    expect(carregados.length).toBe(4);
    expect(carregados[3].titulo).toBe("Projetos Pessoais");
    expect(carregados[3].itens[0].rotulo).toBe("Meus Esboços");
  });

  it("deve restaurar os padrões ao chamar restaurarMenuPadrao", () => {
    const gruposCustom: GrupoMenuPersonalizado[] = [
      {
        id: "dia-a-dia",
        titulo: "Editado",
        itens: [{ id: "home", para: "/home", rotulo: "Home Editado", iconeNome: "Star" }],
      },
    ];

    salvarMenuPersonalizado(gruposCustom);
    restaurarMenuPadrao();

    expect(localStorage.getItem(CHAVE_STORAGE_MENU)).toBeNull();
    expect(carregarMenuPersonalizado()).toEqual(GRUPOS_MENU_PADRAO);
  });

  it("deve lidar graciosamente com JSON corrompido no localStorage", () => {
    localStorage.setItem(CHAVE_STORAGE_MENU, "{ json_invalido: ");
    const grupos = carregarMenuPersonalizado();
    expect(grupos).toEqual(GRUPOS_MENU_PADRAO);
  });
});
