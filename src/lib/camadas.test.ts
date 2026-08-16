import { describe, it, expect, beforeEach, vi } from "vitest";
import { gerenciadorCamadas, NIVEIS_CAMADAS } from "./camadas";

describe("gerenciadorCamadas", () => {
  beforeEach(() => {
    gerenciadorCamadas.limpar();
    vi.restoreAllMocks();
  });

  it("deve registrar camadas e ordenar por nível de z-index", () => {
    const fnFecharModal = vi.fn();
    const fnFecharFerramenta = vi.fn();

    gerenciadorCamadas.registrar({
      id: "modal-busca",
      nivel: NIVEIS_CAMADAS.MODAIS_GLOBAIS,
      temBackdrop: true,
      aoFechar: fnFecharModal,
    });

    gerenciadorCamadas.registrar({
      id: "ferramenta-conversor",
      nivel: NIVEIS_CAMADAS.FERRAMENTAS_APP,
      temBackdrop: true,
      aoFechar: fnFecharFerramenta,
    });

    // O modal-busca tem nível 400 (maior que 300 de ferramentas), então fica no topo da pilha
    expect(gerenciadorCamadas.temBackdropAtivo()).toBe(true);

    // Fechar o topo deve fechar o modal-busca (nível 400)
    const fechou = gerenciadorCamadas.fecharTopo();
    expect(fechou).toBe(true);
    expect(fnFecharModal).toHaveBeenCalledTimes(1);
    expect(fnFecharFerramenta).not.toHaveBeenCalled();
  });

  it("não deve travar o scroll se a camada não possuir backdrop (ex: Janela Flutuante)", () => {
    const fnFechar = vi.fn();

    gerenciadorCamadas.registrar({
      id: "janela-postit",
      nivel: NIVEIS_CAMADAS.JANELA_FLUTUANTE,
      temBackdrop: false,
      aoFechar: fnFechar,
    });

    expect(gerenciadorCamadas.temBackdropAtivo()).toBe(false);
  });

  it("deve desregistrar a camada corretamente ao fechar", () => {
    const fnFechar = vi.fn();

    const limpar = gerenciadorCamadas.registrar({
      id: "modal-teste",
      nivel: NIVEIS_CAMADAS.MODAIS_GLOBAIS,
      temBackdrop: true,
      aoFechar: fnFechar,
    });

    expect(gerenciadorCamadas.temBackdropAtivo()).toBe(true);
    limpar();
    expect(gerenciadorCamadas.temBackdropAtivo()).toBe(false);
  });
});
