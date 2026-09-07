import { describe, it, expect, vi, beforeEach } from "vitest";
import { suportaDitadoVoz, iniciarDitadoVoz } from "./vozCaptura";

describe("vozCaptura", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve detectar se o navegador suporta ditado de voz", () => {
    // Sem SpeechRecognition
    (window as any).SpeechRecognition = undefined;
    (window as any).webkitSpeechRecognition = undefined;
    expect(suportaDitadoVoz()).toBe(false);

    // Com webkitSpeechRecognition (Chrome)
    (window as any).webkitSpeechRecognition = vi.fn();
    expect(suportaDitadoVoz()).toBe(true);
  });

  it("deve avisar se iniciar ditado sem suporte", () => {
    (window as any).SpeechRecognition = undefined;
    (window as any).webkitSpeechRecognition = undefined;

    const aoErro = vi.fn();
    const sessao = iniciarDitadoVoz({
      aoReceberTexto: vi.fn(),
      aoErro,
    });

    expect(aoErro).toHaveBeenCalledWith(expect.stringContaining("não suportado"));
    expect(sessao.estaOuvindo()).toBe(false);
  });

  it("deve instanciar SpeechRecognition e responder aos eventos", () => {
    let ultimaInstancia: any = null;
    const startMock = vi.fn();
    const stopMock = vi.fn();

    class MockSpeech {
      onstart: any;
      onresult: any;
      onend: any;
      onerror: any;
      lang = "";
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      start = startMock;
      stop = stopMock;

      constructor() {
        ultimaInstancia = this;
      }
    }

    (window as any).webkitSpeechRecognition = MockSpeech;

    const aoReceberTexto = vi.fn();
    const aoIniciar = vi.fn();
    const aoFinalizar = vi.fn();

    const sessao = iniciarDitadoVoz({
      aoReceberTexto,
      aoIniciar,
      aoFinalizar,
    });

    expect(startMock).toHaveBeenCalled();

    // Simula evento onstart
    ultimaInstancia.onstart();
    expect(aoIniciar).toHaveBeenCalled();
    expect(sessao.estaOuvindo()).toBe(true);

    // Simula evento onresult
    ultimaInstancia.onresult({
      resultIndex: 0,
      results: [
        [
          {
            transcript: "Lembrar de comprar pão",
          },
        ],
      ],
    });

    expect(aoReceberTexto).toHaveBeenCalledWith("Lembrar de comprar pão", false);

    // Para a sessão
    sessao.parar();
    expect(stopMock).toHaveBeenCalled();
  });
});
