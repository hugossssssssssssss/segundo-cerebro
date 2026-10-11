import { describe, it, expect } from "vitest";
import {
  extrairTrechoMencao,
  contemMencaoUsuario,
  estaAtribuidoAoUsuario,
  compilarNotificacoesColaborativas,
} from "./klausNotifications";
import type { ItemRepo } from "./repo";

describe("klausNotifications - Notificações Colaborativas de Equipe", () => {
  describe("extrairTrechoMencao", () => {
    it("extrai trecho contextual ao redor de @usuario", () => {
      const texto = "Olá pessoal, favor alinhar os prazos com @hugosilva para a entrega final.";
      const trecho = extrairTrechoMencao(texto, "hugosilva", 20);
      expect(trecho).toContain("@hugosilva");
      expect(trecho).toContain("prazos");
    });

    it("retorna null se a menção não for encontrada", () => {
      const trecho = extrairTrechoMencao("Nenhum alvo aqui", "maria");
      expect(trecho).toBeNull();
    });
  });

  describe("contemMencaoUsuario", () => {
    it("detecta menção pelo login do usuário", () => {
      const texto = "Revisado por @hugosilva ontem.";
      const resultado = contemMencaoUsuario(texto, "hugosilva");
      expect(resultado.encontrou).toBe(true);
      expect(resultado.trecho).toContain("@hugosilva");
    });

    it("detecta menção pelo primeiro nome do usuário se fornecido", () => {
      const texto = "Aprovado por @Hugo no briefing.";
      const resultado = contemMencaoUsuario(texto, "hugosilva", "Hugo Silva");
      expect(resultado.encontrou).toBe(true);
      expect(resultado.trecho).toContain("@Hugo");
    });

    it("não confunde com menções de outros usuários", () => {
      const texto = "Conversar com @carlos e @fernanda.";
      const resultado = contemMencaoUsuario(texto, "hugosilva", "Hugo Silva");
      expect(resultado.encontrou).toBe(false);
    });
  });

  describe("estaAtribuidoAoUsuario", () => {
    it("detecta quando o login está na lista de responsaveis", () => {
      const fm = { responsaveis: ["hugosilva", "maria"] };
      expect(estaAtribuidoAoUsuario(fm, "hugosilva")).toBe(true);
      expect(estaAtribuidoAoUsuario(fm, "joao")).toBe(false);
    });

    it("detecta quando o responsavel é uma string única", () => {
      const fm = { responsavel: "hugosilva" };
      expect(estaAtribuidoAoUsuario(fm, "hugosilva")).toBe(true);
      expect(estaAtribuidoAoUsuario(fm, "maria")).toBe(false);
    });

    it("detecta participantes de reuniões", () => {
      const fm = { participantes: ["Hugo Silva", "Ana"] };
      expect(estaAtribuidoAoUsuario(fm, "hugosilva", "Hugo Silva")).toBe(true);
    });
  });

  describe("compilarNotificacoesColaborativas", () => {
    const criarMock = (caminho: string, nome: string, sha: string, texto: string): ItemRepo => ({
      caminho,
      nome,
      sha,
      texto,
      tamanho: texto.length,
      doc: { dados: {}, corpo: texto },
    });

    const mockItens: ItemRepo[] = [
      criarMock(
        "tarefas/2026-10-12-design-system.md",
        "design-system.md",
        "sha1",
        `---
titulo: Atualizar Tokens de Cor
status: a-fazer
responsavel: hugosilva
atualizadoPor: maria
prazo: 2026-10-15
---
Por favor revisar a paleta.`,
      ),
      criarMock(
        "notas/2026-10-11-briefing-campanha.md",
        "briefing-campanha.md",
        "sha2",
        `---
titulo: Briefing de Campanha
atualizadoPor: carlos
---
Alinhar com @hugosilva as entregas da semana.`,
      ),
      criarMock(
        "tarefas/2026-10-10-minha-propria-tarefa.md",
        "minha-propria-tarefa.md",
        "sha3",
        `---
titulo: Minha Tarefa
status: a-fazer
atualizadoPor: hugosilva
---
Falar comigo mesmo @hugosilva.`,
      ),
      criarMock(
        "tarefas/2026-10-09-tarefa-feita.md",
        "tarefa-feita.md",
        "sha4",
        `---
titulo: Tarefa Concluída
status: feito
responsavel: hugosilva
atualizadoPor: maria
---
Concluído.`,
      ),
    ];

    it("compila menções e atribuições ignorando auto-menções e tarefas feitas", () => {
      const res = compilarNotificacoesColaborativas(mockItens, "hugosilva", "Hugo Silva");

      // Deve ter 1 atribuição (design system) e 1 menção (briefing campanha)
      expect(res.length).toBe(2);

      const atribuicao = res.find((r) => r.tipo === "atribuicao");
      expect(atribuicao).toBeDefined();
      expect(atribuicao?.titulo).toContain("Atualizar Tokens de Cor");
      expect(atribuicao?.autor).toBe("maria");

      const mencao = res.find((r) => r.tipo === "mencao");
      expect(mencao).toBeDefined();
      expect(mencao?.titulo).toContain("Briefing de Campanha");
      expect(mencao?.autor).toBe("carlos");
      expect(mencao?.trecho).toContain("@hugosilva");
    });

    it("respeita estado descartado no mapa", () => {
      const mapa = {
        "atribuicao-tarefas-2026-10-12-design-system-md-hugosilva": {
          visto: true,
          descartado: true,
        },
      };

      const res = compilarNotificacoesColaborativas(mockItens, "hugosilva", "Hugo Silva", mapa);
      expect(res.length).toBe(1);
      expect(res[0].tipo).toBe("mencao");
    });
  });
});
