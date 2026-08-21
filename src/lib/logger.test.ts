import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  adicionarLog, 
  obterLogs, 
  limparLogs, 
  higienizar, 
  inscreverLogs, 
  inicializarLogger
} from "./logger";

// Mock de lerConfig de settings para isolar os testes
vi.mock("./settings", () => ({
  lerConfig: () => ({
    githubToken: "github_pat_FakeTokenDeTeste_1234",
    geminiKey: "AIzaSyFakeKeyExemplo",
    telegramBotToken: "123456:TelegramBotTokenTest",
  }),
}));

describe("Logger e Higienizador de Dados Sensíveis", () => {
  beforeEach(() => {
    limparLogs();
  });

  it("deve registrar logs em memória e recuperar usando obterLogs", () => {
    adicionarLog("info", "Mensagem de teste de info");
    adicionarLog("error", "Erro crítico simulado");

    const logs = obterLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].tipo).toBe("info");
    expect(logs[0].mensagem).toBe("Mensagem de teste de info");
    expect(logs[1].tipo).toBe("error");
    expect(logs[1].mensagem).toBe("Erro crítico simulado");
  });

  it("deve limpar logs ao chamar limparLogs", () => {
    adicionarLog("info", "Log temporário");
    expect(obterLogs()).toHaveLength(1);

    limparLogs();
    expect(obterLogs()).toHaveLength(0);
  });

  it("deve disparar o callback quando um novo log for adicionado", () => {
    const callback = vi.fn();
    const cancelar = inscreverLogs(callback);

    adicionarLog("info", "Testando eventos");
    expect(callback).toHaveBeenCalledTimes(1);

    cancelar();
    adicionarLog("info", "Outro teste");
    expect(callback).toHaveBeenCalledTimes(1); // não deve ser chamado após cancelar
  });

  describe("Higienização de credenciais", () => {
    it("deve mascarar tokens dinâmicos configurados no localStorage", () => {
      const logComToken = "Gravando arquivo usando token github_pat_FakeTokenDeTeste_1234";
      const logComGemini = "Chamando api do gemini com chave AIzaSyFakeKeyExemplo";
      const logComTelegram = "Aviso: Telegram disparado com 123456:TelegramBotTokenTest";

      expect(higienizar(logComToken)).toBe("Gravando arquivo usando token [TOKEN_GITHUB_OCULTO]");
      expect(higienizar(logComGemini)).toBe("Chamando api do gemini com chave [CHAVE_GEMINI_OCULTA]");
      expect(higienizar(logComTelegram)).toBe("Aviso: Telegram disparado com [TOKEN_TELEGRAM_OCULTO]");
    });

    it("deve mascarar tokens do GitHub usando regras de regex padrão (fallback)", () => {
      const classicToken = "Token antigo: ghp_FakeTokenCurto";
      const fineGrainedToken = "Token novo: github_pat_FakeTokenCurto_123456789";

      expect(higienizar(classicToken)).toBe("Token antigo: [TOKEN_GITHUB_OCULTO]");
      expect(higienizar(fineGrainedToken)).toBe("Token novo: [TOKEN_GITHUB_OCULTO]");
    });

    it("deve mascarar chaves do Gemini usando regex padrão (fallback)", () => {
      const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyFakeUrlKey";
      expect(higienizar(geminiUrl)).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=[CHAVE_GEMINI_OCULTA]");
    });

    it("deve mascarar cabeçalhos de autorização do tipo Bearer Token", () => {
      const headerStr = "Authorization: Bearer ghp_algumacoisa12345678";
      expect(higienizar(headerStr)).toBe("Authorization: Bearer [TOKEN_OCULTO]");
    });
  });

  describe("Monkey Patching do window.fetch", () => {
    it("deve capturar requisições fetch bem-sucedidas no logger", async () => {
      // Mock original do fetch
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/json" }),
        clone() {
          return {
            headers: new Headers({ "content-type": "application/json" }),
            text: async () => JSON.stringify({ success: true }),
          };
        },
      };
      
      const originalFetch = vi.fn().mockResolvedValue(mockResponse);
      vi.stubGlobal("fetch", originalFetch);

      inicializarLogger();

      await window.fetch("https://api.github.com/repos/owner/repo/contents/teste.md", {
        method: "PUT",
        headers: {
          "Authorization": "Bearer ghp_originaltoken",
        },
        body: "conteudo",
      });

      const logs = obterLogs();
      
      // Deve ter pelo menos 2 logs de request (envio e resposta)
      expect(logs.length).toBeGreaterThanOrEqual(2);
      
      // O log de envio (request) deve estar higienizado
      const logEnvio = logs.find(l => l.mensagem.includes("→ PUT"));
      expect(logEnvio).toBeDefined();
      expect(logEnvio?.detalhes).toContain("[TOKEN_OCULTO]");
    });
  });
});
