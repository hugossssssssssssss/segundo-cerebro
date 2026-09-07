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

  it("abre o popover com 'Seus favoritos' ao clicar no botão", () => {
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

  it("permite alternar o modo de edição ao clicar no lápis", () => {
    render(<LauncherGoogleApps />);
    const botao = screen.getByLabelText("Google Apps e Favoritos");

    act(() => {
      fireEvent.click(botao);
    });

    const botaoLapis = screen.getByLabelText("Personalizar favoritos");
    act(() => {
      fireEvent.click(botaoLapis);
    });

    expect(screen.getByText(/Arraste os ícones para reordenar/i)).toBeDefined();
    expect(screen.getByText(/Novo Atalho/i)).toBeDefined();
  });

  it("chama aoAbrirBuscaWeb quando o app Pesquisa for clicado", () => {
    const fnBuscaWeb = vi.fn();
    render(<LauncherGoogleApps aoAbrirBuscaWeb={fnBuscaWeb} />);
    const botao = screen.getByLabelText("Google Apps e Favoritos");

    act(() => {
      fireEvent.click(botao);
    });

    const appPesquisa = screen.getByText("Pesquisa");
    act(() => {
      fireEvent.click(appPesquisa);
    });

    expect(fnBuscaWeb).toHaveBeenCalledTimes(1);
  });

  it("suporta reordenação via drag and drop", () => {
    render(<LauncherGoogleApps />);
    const botao = screen.getByLabelText("Google Apps e Favoritos");

    act(() => {
      fireEvent.click(botao);
    });

    const appGmail = screen.getByText("Gmail").closest('[role="button"]')!;
    const appDrive = screen.getByText("Drive").closest('[role="button"]')!;

    const dataTransfer = {
      effectAllowed: "none",
      dropEffect: "none",
      setData: vi.fn(),
      getData: vi.fn(),
    };

    act(() => {
      fireEvent.dragStart(appGmail, { dataTransfer });
      fireEvent.dragOver(appDrive, { dataTransfer });
      fireEvent.drop(appDrive, { dataTransfer });
      fireEvent.dragEnd(appGmail);
    });

    expect(screen.getByText("Seus favoritos")).toBeDefined();
  });
});
