import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  obterTokenGoogleSalvo,
  salvarTokenGoogle,
  desconectarGoogle,
  estaConectadoGoogle,
  listarAgendasGoogle,
  listarEventosGoogle,
  criarEventoGoogle,
  atualizarEventoGoogle,
  excluirEventoGoogle,
  mapearCorNotionParaGoogleColorId,
  obterEstiloEventoGoogle,
  PALETA_CORES_GOOGLE,
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

  describe("mapeamento de cores bidirecional", () => {
    it("mapeia cores do Notion/Klaus para colorId do Google Calendar", () => {
      expect(mapearCorNotionParaGoogleColorId("vermelho")).toBe("11");
      expect(mapearCorNotionParaGoogleColorId("verde")).toBe("10");
      expect(mapearCorNotionParaGoogleColorId("azul")).toBe("9");
      expect(mapearCorNotionParaGoogleColorId("amarelo")).toBe("5");
      expect(mapearCorNotionParaGoogleColorId("laranja")).toBe("6");
      expect(mapearCorNotionParaGoogleColorId("roxo")).toBe("3");
      expect(mapearCorNotionParaGoogleColorId("rosa")).toBe("4");
      expect(mapearCorNotionParaGoogleColorId("cinza")).toBe("8");
      expect(mapearCorNotionParaGoogleColorId(undefined)).toBeUndefined();
    });

    it("obterEstiloEventoGoogle usa corId individual do evento se existir", () => {
      const estilo = obterEstiloEventoGoogle({
        id: "ev1",
        titulo: "Evento Vermelho",
        inicio: "2026-09-10",
        fim: "2026-09-10",
        oDiaTodo: true,
        corId: "11",
      });
      expect(estilo.corHex).toBe(PALETA_CORES_GOOGLE["11"].hex);
      expect(estilo.bg).toBe(PALETA_CORES_GOOGLE["11"].bg);
    });

    it("obterEstiloEventoGoogle usa agendaCor se não houver corId próprio", () => {
      const estilo = obterEstiloEventoGoogle({
        id: "ev2",
        titulo: "Evento da Agenda da Equipe",
        inicio: "2026-09-10",
        fim: "2026-09-10",
        oDiaTodo: true,
        agendaCor: "#9c27b0",
      });
      expect(estilo.corHex).toBe("#9c27b0");
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

    it("listarAgendasGoogle mapeia agendas primárias e secundárias", async () => {
      const calendarListMock = {
        items: [
          {
            id: "primary",
            summary: "Hugo Silva",
            primary: true,
            selected: true,
            backgroundColor: "#039be5",
          },
          {
            id: "equipe@empresa.com",
            summary: "Agenda da Equipe",
            selected: true,
            backgroundColor: "#e67c73",
            accessRole: "reader",
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => calendarListMock,
      } as any);

      const agendas = await listarAgendasGoogle("token-mock");
      expect(agendas).toHaveLength(2);
      expect(agendas[0].id).toBe("primary");
      expect(agendas[0].principal).toBe(true);
      expect(agendas[1].id).toBe("equipe@empresa.com");
      expect(agendas[1].somenteLeitura).toBe(true);
    });

    it("listarEventosGoogle busca eventos de múltiplas agendas", async () => {
      const agendas = [
        { id: "primary", nome: "Minha Agenda", principal: true, selecionada: true, somenteLeitura: false },
        { id: "outra@agenda.com", nome: "Outras Agendas", principal: false, selecionada: true, corFundo: "#33b679", somenteLeitura: true },
      ];

      const eventosPrimaryMock = {
        items: [
          {
            id: "ev1",
            summary: "Reunião de Design",
            start: { dateTime: "2026-09-10T14:00:00Z" },
            end: { dateTime: "2026-09-10T15:00:00Z" },
            colorId: "9",
          },
        ],
      };

      const eventosOutraMock = {
        items: [
          {
            id: "ev2",
            summary: "Prazo Entrega Cliente",
            start: { date: "2026-09-15" },
            end: { date: "2026-09-15" },
          },
        ],
      };

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => eventosPrimaryMock,
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => eventosOutraMock,
        } as any);

      const resultado = await listarEventosGoogle(
        new Date("2026-09-01T00:00:00Z"),
        new Date("2026-09-30T23:59:59Z"),
        agendas
      );

      expect(resultado.eventos).toHaveLength(2);
      expect(resultado.eventos[0].id).toBe("ev1");
      expect(resultado.eventos[0].corId).toBe("9");
      expect(resultado.eventos[1].id).toBe("ev2");
      expect(resultado.eventos[1].agendaNome).toBe("Outras Agendas");
    });

    it("criarEventoGoogle envia payload correto com corId e retorna id", async () => {
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
        corId: "11",
      });

      expect(id).toBe("novo-id-google");
      expect(requisicaoFeita.init.method).toBe("POST");
      const corpo = JSON.parse(requisicaoFeita.init.body);
      expect(corpo.summary).toBe("Entrega do PDI");
      expect(corpo.colorId).toBe("11");
      expect(corpo.start.date).toBe("2026-09-20");
    });

    it("atualizarEventoGoogle envia PATCH com dados e corId atualizados", async () => {
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
        corId: "5",
      });

      expect(requisicaoFeita.url).toContain("evento-123");
      expect(requisicaoFeita.init.method).toBe("PATCH");
      const corpo = JSON.parse(requisicaoFeita.init.body);
      expect(corpo.summary).toBe("Título Alterado");
      expect(corpo.colorId).toBe("5");
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

