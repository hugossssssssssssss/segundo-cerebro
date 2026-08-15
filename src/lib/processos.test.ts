import { describe, it, expect } from "vitest";
import {
  comoProcesso,
  processoParaFrontmatter,
  comoCardProcesso,
  cardProcessoParaFrontmatter,
  MODELOS_PROCESSO_PADRAO,
} from "./processos";
import {
  executarRegrasAoChecklist,
  executarRegrasAoMudarEtapa,
} from "./automacoesProcesso";
import type { Processo, CardProcesso } from "./tipos";

describe("Módulo de Processos e Funis", () => {
  it("deve conter modelos padrão pré-configurados", () => {
    expect(MODELOS_PROCESSO_PADRAO.length).toBeGreaterThanOrEqual(3);
    expect(MODELOS_PROCESSO_PADRAO[0].titulo).toContain("Kanban Geral");
  });

  it("deve converter DocumentoMarkdown em Processo e retornar frontmatter", () => {
    const doc = {
      dados: {
        id: "p1",
        titulo: "Processo Teste",
        descricao: "Descrição do processo",
        etapas: [{ id: "e1", nome: "Etapa 1", cor: "blue", checklistsPadrao: [] }],
        regras: [],
      },
      corpo: "",
    };

    const processo = comoProcesso(doc, "processos/p1.md", "sha123");
    expect(processo.id).toBe("p1");
    expect(processo.titulo).toBe("Processo Teste");
    expect(processo.etapas).toHaveLength(1);

    const fm = processoParaFrontmatter(processo);
    expect(fm.id).toBe("p1");
    expect(fm.titulo).toBe("Processo Teste");
  });

  it("deve converter DocumentoMarkdown em CardProcesso com campos de CRM", () => {
    const doc = {
      dados: {
        id: "c1",
        processoId: "p1",
        etapaId: "e1",
        titulo: "Contato Comercial ACME",
        cliente: "Fulano de Tal",
        empresa: "ACME Corp",
        email: "fulano@acme.com",
        telefone: "5511999999999",
        valor: 2500,
        prazo: "2026-12-31",
        prioridade: "alta",
        checklists: { b1: true },
        comentarios: [{ id: "com1", data: "2026-08-15", autor: "Hugo", texto: "Iniciado" }],
        urgente: false,
      },
      corpo: "Corpo do cartão",
    };

    const card = comoCardProcesso(doc, "processos/cards/c1.md", "sha456");
    expect(card.id).toBe("c1");
    expect(card.cliente).toBe("Fulano de Tal");
    expect(card.empresa).toBe("ACME Corp");
    expect(card.email).toBe("fulano@acme.com");
    expect(card.telefone).toBe("5511999999999");
    expect(card.valor).toBe(2500);
    expect(card.prioridade).toBe("alta");

    const fm = cardProcessoParaFrontmatter(card);
    expect(fm.empresa).toBe("ACME Corp");
    expect(fm.email).toBe("fulano@acme.com");
  });

  it("deve executar regra de automação ao concluir checklist", () => {
    const processo: Processo = {
      caminho: "processos/p1.md",
      sha: "sha1",
      bruto: {},
      id: "p1",
      titulo: "Branding",
      corpo: "",
      descricao: "",
      etapas: [
        { id: "briefing", nome: "Briefing", cor: "blue", checklistsPadrao: [] },
        { id: "criacao", nome: "Criação", cor: "purple", checklistsPadrao: [] },
      ],
      regras: [
        {
          id: "r1",
          gatilho: "ao_concluir_checklist",
          condicao: { checklistId: "chk_briefing_ok" },
          acao: "mudar_etapa",
          parametros: { etapaDestinoId: "criacao" },
        },
      ],
    };

    const card: CardProcesso = {
      caminho: "processos/cards/c1.md",
      sha: "sha2",
      bruto: {},
      id: "c1",
      processoId: "p1",
      etapaId: "briefing",
      titulo: "Projeto Teste",
      corpo: "",
      checklists: {},
      comentarios: [],
      tags: [],
      urgente: false,
      atualizadoEm: "2026-08-15",
    };

    const res = executarRegrasAoChecklist(card, processo, "chk_briefing_ok", true);
    expect(res.modificado).toBe(true);
    expect(res.cardAtualizado.etapaId).toBe("criacao");
  });

  it("deve registrar histórico de comentário ao mudar de etapa", () => {
    const processo: Processo = {
      caminho: "processos/p1.md",
      sha: "sha1",
      bruto: {},
      id: "p1",
      titulo: "Processo",
      corpo: "",
      descricao: "",
      etapas: [
        { id: "e1", nome: "Etapa 1", cor: "blue", checklistsPadrao: [] },
        { id: "e2", nome: "Etapa 2", cor: "emerald", checklistsPadrao: [] },
      ],
      regras: [],
    };

    const card: CardProcesso = {
      caminho: "processos/cards/c1.md",
      sha: "sha2",
      bruto: {},
      id: "c1",
      processoId: "p1",
      etapaId: "e1",
      titulo: "Card 1",
      corpo: "",
      checklists: {},
      comentarios: [],
      tags: [],
      urgente: false,
      atualizadoEm: "2026-08-15",
    };

    const res = executarRegrasAoMudarEtapa(card, processo, "e1", "e2");
    expect(res.cardAtualizado.etapaId).toBe("e2");
    expect(res.cardAtualizado.comentarios.length).toBe(1);
    expect(res.cardAtualizado.comentarios[0].texto).toContain("Etapa 1");
  });
});
