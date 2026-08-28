import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ModalIADocumento } from "./ModalIADocumento";

afterEach(() => {
  cleanup();
});

vi.mock("@/lib/iaRapida", () => ({
  perguntarIARapida: vi.fn().mockImplementation(async (prompt: string) => {
    if (prompt.includes("conta")) return "Resultado: 100";
    return "Resposta da IA para teste.";
  }),
}));

describe("ModalIADocumento", () => {
  it("renderiza campo de pergunta quando aberto", () => {
    render(
      <ModalIADocumento
        aberto={true}
        aoFechar={() => {}}
        aoColarNoDocumento={() => {}}
      />
    );

    expect(
      screen.getByPlaceholderText(/pergunte algo, peça uma conta/i)
    ).toBeDefined();
    expect(screen.getByText("Inteligência Artificial")).toBeDefined();
  });

  it("envia pergunta e exibe os 4 botões de ação: Copiar, Colar, Responder e Excluir", async () => {
    const aoColar = vi.fn();
    const aoFechar = vi.fn();

    render(
      <ModalIADocumento
        aberto={true}
        aoFechar={aoFechar}
        aoColarNoDocumento={aoColar}
      />
    );

    const input = screen.getByPlaceholderText(/pergunte algo, peça uma conta/i);
    fireEvent.change(input, { target: { value: "conta 25 x 4" } });

    const botaoEnviar = screen.getByTitle(/enviar/i);
    fireEvent.click(botaoEnviar);

    // Aguarda exibição da resposta
    await screen.findByText(/Resultado: 100/i);

    // Verifica presença dos 4 ícones requeridos
    const botaoCopiar = screen.getByLabelText(/copiar resposta/i);
    const botaoColar = screen.getByLabelText(/colar no documento/i);
    const botaoResponder = screen.getByLabelText(/responder/i);
    const botaoExcluir = screen.getByLabelText(/excluir/i);

    expect(botaoCopiar).toBeDefined();
    expect(botaoColar).toBeDefined();
    expect(botaoResponder).toBeDefined();
    expect(botaoExcluir).toBeDefined();

    // Testa ação de Colar
    fireEvent.click(botaoColar);
    expect(aoColar).toHaveBeenCalledWith("Resultado: 100");
    expect(aoFechar).toHaveBeenCalled();
  });

  it("permite continuar a conversa ao clicar em Responder", async () => {
    render(
      <ModalIADocumento
        aberto={true}
        aoFechar={() => {}}
        aoColarNoDocumento={() => {}}
      />
    );

    const input = screen.getByPlaceholderText(/pergunte algo, peça uma conta/i);
    fireEvent.change(input, { target: { value: "olá" } });
    fireEvent.click(screen.getByTitle(/enviar/i));

    await screen.findByText(/Resposta da IA para teste/i);

    const botaoResponder = screen.getByLabelText(/responder/i);
    fireEvent.click(botaoResponder);

    // Retorna ao modo de pergunta para continuar o chat
    expect(
      screen.getByPlaceholderText(/pergunte algo, peça uma conta/i)
    ).toBeDefined();
  });

  it("fecha e descarta ao clicar em Excluir", async () => {
    const aoFechar = vi.fn();
    render(
      <ModalIADocumento
        aberto={true}
        aoFechar={aoFechar}
        aoColarNoDocumento={() => {}}
      />
    );

    const input = screen.getByPlaceholderText(/pergunte algo, peça uma conta/i);
    fireEvent.change(input, { target: { value: "teste descartar" } });
    fireEvent.click(screen.getByTitle(/enviar/i));

    await screen.findByText(/Resposta da IA para teste/i);

    const botaoExcluir = screen.getByLabelText(/excluir/i);
    fireEvent.click(botaoExcluir);

    expect(aoFechar).toHaveBeenCalled();
  });
});
