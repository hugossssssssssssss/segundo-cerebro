import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  obterTokenGoogleSalvo,
  salvarTokenGoogle,
  desconectarGoogle,
  estaConectadoGoogle,
  listarEventosGoogle,
  criarEventoGoogle,
  atualizarEventoGoogle,
  excluirEventoGoogle,
} from "./googleCalendar";

describe("googleCalendar", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("gestão de tokens", () => {
    it("salva e recupera token válido", () => {
      salvarTokenGoogle("meu-token-123", 3600);
      expect(obterTokenGoogleSalvo()).toBe("meu-token-123");
    });

    it("retorna null e limpa se o token estiver expirado", () => {
      // Salva token que expirou no passado
      localStorage.setItem("klaus:gcal:access_token", "token-velho");
      localStorage.setItem("klaus:gcal:expires_at", (Date.now() - 1000).toString());

      expect(obterTokenGoogleSalvo()).toBeNull();
      expect(localStorage.getItem("klaus:gcal:access_token")).toBeNull();
    });

    it("desconecta e limpa token da sessão", () => {
      salvarTokenGoogle("token-ativo", 3600);
      desconectarGoogle();
      expect(obterTokenGoogleSalvo()).toBeNull();
    });
  });

  describe("estaConectadoGoogle", () => {
    it("retorna true quando possui clientId e token ativo", () => {
      salvarTokenGoogle("token-ativo", 3600);
      const conectado = estaConectadoGoogle({
        googleCalendarClientId: "client-id-xyz.apps.googleusercontent.com",
        googleCalendarAtivo: true,
      } as any);
      expect(conectado).toBe(true);
    });

    it("retorna false quando não há clientId", () => {
      const conectado = estaConectadoGoogle({
        googleCalendarClientId: "",
        googleCalendarAtivo: false,
      } as any);
      expect(conectado).toBe(false);
    });
  });

  describe("operações de API REST (mock fetch)", () => {
    beforeEach(() => {
      salvarTokenGoogle("token-mock", 3600);
    });

    it("listarEventosGoogle mapeia eventos corretamente", async () => {
      const eventosMock = {
        items: [
          {
            id: "ev1",
            summary: "Reunião de Design",
            description: "Alinhar novo layout",
            start: { dateTime: "2026-09-10T14:00:00Z" },
            end: { dateTime: "2026-09-10T15:00:00Z" },
            htmlLink: "https://calendar.google.com/event?id=ev1",
          },
          {
            id: "ev2",
            summary: "Feriado",
            start: { date: "2026-09-15" },
            end: { date: "2026-09-15" },
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => eventosMock,
      } as any);

      const eventos = await listarEventosGoogle(
        new Date("2026-09-01T00:00:00Z"),
        new Date("2026-09-30T23:59:59Z")
      );

      expect(eventos).toHaveLength(2);
      expect(eventos[0].id).toBe("ev1");
      expect(eventos[0].titulo).toBe("Reunião de Design");
      expect(eventos[0].oDiaTodo).toBe(false);

      expect(eventos[1].id).toBe("ev2");
      expect(eventos[1].titulo).toBe("Feriado");
      expect(eventos[1].oDiaTodo).toBe(true);
    });

    it("criarEventoGoogle envia payload correto e retorna id", async () => {
      let requisicaoFeita: any = null;
      vi.spyOn(globalThis, "fetch").mockImplementationOnce(async (url, init) => {
        requisicaoFeita = { url, init };
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "novo-id-google" }),
        } as any;
      });

      const id = await criarEventoGoogle({
        titulo: "Entrega do PDI",
        dataInicio: "2026-09-20",
        descricao: "Finalizar metas",
      });

      expect(id).toBe("novo-id-google");
      expect(requisicaoFeita.init.method).toBe("POST");
      const corpo = JSON.parse(requisicaoFeita.init.body);
      expect(corpo.summary).toBe("Entrega do PDI");
      expect(corpo.start.date).toBe("2026-09-20");
    });

    it("atualizarEventoGoogle envia PATCH com dados atualizados", async () => {
      let requisicaoFeita: any = null;
      vi.spyOn(globalThis, "fetch").mockImplementationOnce(async (url, init) => {
        requisicaoFeita = { url, init };
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as any;
      });

      await atualizarEventoGoogle("evento-123", {
        titulo: "Título Alterado",
        dataInicio: "2026-09-25",
      });

      expect(requisicaoFeita.url).toContain("evento-123");
      expect(requisicaoFeita.init.method).toBe("PATCH");
      const corpo = JSON.parse(requisicaoFeita.init.body);
      expect(corpo.summary).toBe("Título Alterado");
      expect(corpo.start.date).toBe("2026-09-25");
    });

    it("excluirEventoGoogle faz chamada DELETE", async () => {
      let requisicaoFeita: any = null;
      vi.spyOn(globalThis, "fetch").mockImplementationOnce(async (url, init) => {
        requisicaoFeita = { url, init };
        return {
          ok: true,
          status: 204,
        } as any;
      });

      await excluirEventoGoogle("evento-123");

      expect(requisicaoFeita.url).toContain("evento-123");
      expect(requisicaoFeita.init.method).toBe("DELETE");
    });
  });
});
