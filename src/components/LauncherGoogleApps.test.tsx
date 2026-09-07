import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { LauncherGoogleApps } from "./LauncherGoogleApps";

describe("LauncherGoogleApps", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderiza o botão dos 9 pontinhos corretamente", () => {
    render(<LauncherGoogleApps />);
    const botao = screen.getByLabelText("Google Apps e Favoritos");
    expect(botao).toBeDefined();
  });

  it("abre o popover com 'Seus favoritos' ao clicar no botão", async () => {
    render(<LauncherGoogleApps />);
    const botao = screen.getByLabelText("Google Apps e Favoritos");
    
    act(() => {
      fireEvent.click(botao);
    });

    expect(screen.getByText("Seus favoritos")).toBeDefined();
    expect(screen.getByText("Gmail")).toBeDefined();
    expect(screen.getByText("YouTube")).toBeDefined();
    expect(screen.getByText("Gemini")).toBeDefined();
  });

  it("permite ativar o modo de edição ao clicar no lápis", () => {
    render(<LauncherGoogleApps />);
    const botao = screen.getByLabelText("Google Apps e Favoritos");
    
    act(() => {
      fireEvent.click(botao);
    });

    const botaoLapis = screen.getByLabelText("Personalizar favoritos");
    act(() => {
      fireEvent.click(botaoLapis);
    });

    expect(screen.getByText(/Modo de edição ativo/i)).toBeDefined();
    expect(screen.getByText(/Adicionar/i)).toBeDefined();
  });

  it("chama aoAbrirBuscaKlaus quando o app Pesquisa for clicado", () => {
    const fnBusca = vi.fn();
    render(<LauncherGoogleApps aoAbrirBuscaKlaus={fnBusca} />);
    const botao = screen.getByLabelText("Google Apps e Favoritos");
    
    act(() => {
      fireEvent.click(botao);
    });

    const appPesquisa = screen.getByText("Pesquisa");
    act(() => {
      fireEvent.click(appPesquisa);
    });

    expect(fnBusca).toHaveBeenCalledTimes(1);
  });
});
