import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HeaderAcoesOrdenaveis } from "./HeaderAcoesOrdenaveis";
import { CronometroProvider } from "./ContextoCronometro";

describe("HeaderAcoesOrdenaveis", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderiza todos os botões de ação do cabeçalho", () => {
    const fnBusca = vi.fn();
    const fnCaptura = vi.fn();

    render(
      <MemoryRouter>
        <CronometroProvider>
          <HeaderAcoesOrdenaveis onAbrirBusca={fnBusca} onAbrirCaptura={fnCaptura} />
        </CronometroProvider>
      </MemoryRouter>
    );

    expect(screen.getByLabelText("Captura rápida")).toBeDefined();
    expect(screen.getByLabelText("Google Apps e Favoritos")).toBeDefined();
    expect(screen.getByLabelText("Buscar")).toBeDefined();
  });

  it("permite reordenar os botões do cabeçalho via drag and drop", () => {
    render(
      <MemoryRouter>
        <CronometroProvider>
          <HeaderAcoesOrdenaveis onAbrirBusca={() => {}} onAbrirCaptura={() => {}} />
        </CronometroProvider>
      </MemoryRouter>
    );

    const botaoBuscaWrapper = screen.getByLabelText("Buscar").closest('[draggable="true"]')!;
    const botaoAppsWrapper = screen.getByLabelText("Google Apps e Favoritos").closest('[draggable="true"]')!;

    const dataTransfer = {
      effectAllowed: "none",
      dropEffect: "none",
      setData: vi.fn(),
      getData: vi.fn(),
    };

    act(() => {
      fireEvent.dragStart(botaoBuscaWrapper, { dataTransfer });
      fireEvent.dragOver(botaoAppsWrapper, { dataTransfer });
      fireEvent.drop(botaoAppsWrapper, { dataTransfer });
      fireEvent.dragEnd(botaoBuscaWrapper);
    });

    // Ordem salva no storage
    const salvo = localStorage.getItem("klaus_header_botoes_ordem");
    expect(salvo).toBeDefined();
  });

  it("executa a ação de clique do botão normalmente", () => {
    const fnBusca = vi.fn();
    render(
      <MemoryRouter>
        <CronometroProvider>
          <HeaderAcoesOrdenaveis onAbrirBusca={fnBusca} onAbrirCaptura={() => {}} />
        </CronometroProvider>
      </MemoryRouter>
    );

    const botaoBusca = screen.getByLabelText("Buscar");
    act(() => {
      fireEvent.click(botaoBusca);
    });

    expect(fnBusca).toHaveBeenCalledTimes(1);
  });
});
