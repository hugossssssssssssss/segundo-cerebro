import { describe, it, expect, vi } from "vitest";
import { iniciarTranscricao } from "./transcricao";

describe("Módulo de Transcrição Independente do Klaus", () => {
  it("inicia transcrição com fallback nativo sem erros em ambiente de teste", () => {
    const mockReceber = vi.fn();
    const mockParcial = vi.fn();
    const mockStatus = vi.fn();

    const sessao = iniciarTranscricao({
      motor: "nativo",
      fonte: "microfone",
      aoReceberSegmento: mockReceber,
      aoAtualizarTextoParcial: mockParcial,
      aoStatusMudou: mockStatus,
    });

    expect(sessao).toBeDefined();
    expect(typeof sessao.parar).toBe("function");
    expect(typeof sessao.pausar).toBe("function");
    expect(typeof sessao.retomar).toBe("function");
    expect(typeof sessao.obterStatus).toBe("function");
  });

  it("permite selecionar motor Vosk e retorna interface de sessão válida", () => {
    const sessao = iniciarTranscricao({
      motor: "vosk",
      fonte: "reuniao_aba",
      aoReceberSegmento: vi.fn(),
      aoAtualizarTextoParcial: vi.fn(),
    });

    expect(sessao).toBeDefined();
    expect(typeof sessao.parar).toBe("function");
  });

  it("permite selecionar motor Sherpa e retorna interface de sessão válida", () => {
    const sessao = iniciarTranscricao({
      motor: "sherpa",
      fonte: "microfone",
      aoReceberSegmento: vi.fn(),
      aoAtualizarTextoParcial: vi.fn(),
    });

    expect(sessao).toBeDefined();
    expect(typeof sessao.parar).toBe("function");
  });
});
