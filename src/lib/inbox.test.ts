import { describe, it, expect, beforeEach } from "vitest";
import {
  formatarTagLembrete,
  extrairLembretesDeTexto,
  compilarItensInbox,
  precisaEscalationInatividade,
  lerEstadoInboxLocal,
  salvarEstadoInboxLocal,
  adiarDataHora,
  aplicarEstadoInboxNoFrontmatter,
} from "./inbox";
import type { ItemRepo } from "./repo";

describe("inbox", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("formatarTagLembrete gera tag limpa sem colchetes indesejados", () => {
    const res = formatarTagLembrete("Comprar tintas", "2026-08-18 15:00");
    expect(res).toBe("[⏰ Lembrete: Comprar tintas | 2026-08-18 15:00]");
  });

  it("extrairLembretesDeTexto extrai lembretes no formato de tag padronizada", () => {
    const texto = `
    Aqui está uma nota importante.
    [⏰ Lembrete: Enviar briefing para cliente | 2026-08-20 14:00]
    Outro parágrafo qualquer.
    `;

    const lembretes = extrairLembretesDeTexto(texto, "notas/briefing.md", "Briefing Cliente");
    expect(lembretes).toHaveLength(1);
    expect(lembretes[0].titulo).toBe("Enviar briefing para cliente");
    expect(lembretes[0].dataHora).toBe("2026-08-20 14:00");
    expect(lembretes[0].caminhoOrigem).toBe("notas/briefing.md");
    expect(lembretes[0].tituloOrigem).toBe("Briefing Cliente");
  });

  it("extrairLembretesDeTexto extrai lembretes no formato @lembrete", () => {
    const texto = `
    Reunião de alinhamento.
    @lembrete 2026-08-18 Comprar materiais de escritório
    `;

    const lembretes = extrairLembretesDeTexto(texto, "notas/reuniao.md", "Reunião");
    expect(lembretes).toHaveLength(1);
    expect(lembretes[0].titulo).toBe("Comprar materiais de escritório");
    expect(lembretes[0].dataHora).toBe("2026-08-18");
  });

  it("compilarItensInbox identifica tarefas atrasadas", () => {
    const itensRepo: ItemRepo[] = [
      {
        caminho: "tarefas/projeto-alpha.md",
        nome: "projeto-alpha.md",
        sha: "123",
        tamanho: 100,
        texto: `---
status: a-fazer
prazo: 2026-08-10
---
# Projeto Alpha`,
        doc: {
          dados: { status: "a-fazer", prazo: "2026-08-10" },
          corpo: "# Projeto Alpha",
        },
      },
    ];

    const agora = new Date("2026-08-15T12:00:00Z");
    const caixa = compilarItensInbox(itensRepo, {}, agora);

    expect(caixa).toHaveLength(1);
    expect(caixa[0].tipo).toBe("tarefa_atrasada");
    expect(caixa[0].titulo).toContain("Projeto Alpha");
    expect(caixa[0].visto).toBe(false);
  });

  it("compilarItensInbox não inclui tarefas já concluídas", () => {
    const itensRepo: ItemRepo[] = [
      {
        caminho: "tarefas/projeto-concluido.md",
        nome: "projeto-concluido.md",
        sha: "123",
        tamanho: 100,
        texto: `---
status: feito
prazo: 2026-08-10
---
# Concluído`,
        doc: {
          dados: { status: "feito", prazo: "2026-08-10" },
          corpo: "# Concluído",
        },
      },
    ];

    const agora = new Date("2026-08-15T12:00:00Z");
    const caixa = compilarItensInbox(itensRepo, {}, agora);

    expect(caixa).toHaveLength(0);
  });

  it("precisaEscalationInatividade retorna true quando ultrapassa as horas sem visualização", () => {
    const item = {
      id: "lembrete-1",
      tipo: "lembrete" as const,
      titulo: "Comprar papel",
      caminhoOrigem: "notas/1.md",
      tituloOrigem: "Nota 1",
      dataVencimento: "2026-08-15T10:00:00Z",
      visto: false,
    };

    const agoraMais4Horas = new Date("2026-08-15T14:30:00Z");
    expect(precisaEscalationInatividade(item, 3, agoraMais4Horas)).toBe(true);

    const agoraMais1Hora = new Date("2026-08-15T10:30:00Z");
    expect(precisaEscalationInatividade(item, 3, agoraMais1Hora)).toBe(false);
  });

  it("lerEstadoInboxLocal e salvarEstadoInboxLocal funcionam no localStorage", () => {
    const estadoInicial = lerEstadoInboxLocal();
    expect(estadoInicial).toEqual({});

    salvarEstadoInboxLocal({ "item-1": { visto: true, vistoEm: "2026-08-15" } });
    const atualizado = lerEstadoInboxLocal();
    expect(atualizado["item-1"].visto).toBe(true);
  });

  it("adiarDataHora calcula a nova data corretamente para 1h e amanhã", () => {
    const agora = new Date("2026-08-15T10:00:00Z");
    const em1h = adiarDataHora("2026-08-15 10:00", "1h", agora);
    expect(em1h).toContain("11:00");

    const amanha = adiarDataHora("2026-08-15 10:00", "amanha", agora);
    expect(amanha).toContain("09:00");
  });

  it("compilarItensInbox inclui metas ou notas com data apenas no dia correspondente (fuso local)", () => {
    const itensRepo: ItemRepo[] = [
      {
        caminho: "pdi/metas/meta-estudar.md",
        nome: "meta-estudar.md",
        sha: "abc",
        tamanho: 100,
        texto: `---
tipo: meta
prazo: 2026-08-21
---
# Estudar Design`,
        doc: {
          dados: { tipo: "meta", prazo: "2026-08-21" },
          corpo: "# Estudar Design",
        },
      },
      {
        caminho: "notas/evento.md",
        nome: "evento.md",
        sha: "def",
        tamanho: 120,
        texto: `---
tipo: nota
data: 2026-08-21
---
# Evento Importante`,
        doc: {
          dados: { tipo: "nota", data: "2026-08-21" },
          corpo: "# Evento Importante",
        },
      },
      {
        caminho: "notas/evento-futuro.md",
        nome: "evento-futuro.md",
        sha: "ghi",
        tamanho: 120,
        texto: `---
tipo: nota
data: 2026-08-22
---
# Evento Amanha`,
        doc: {
          dados: { tipo: "nota", data: "2026-08-22" },
          corpo: "# Evento Amanha",
        },
      }
    ];

    const agoraLocalDefinido = new Date(2026, 7, 21, 14, 20, 0); // 21 de Agosto de 2026

    const caixa = compilarItensInbox(itensRepo, {}, agoraLocalDefinido);

    const titulos = caixa.map(i => i.titulo);
    expect(titulos).toContain("Estudar Design");
    expect(titulos).toContain("Evento Importante");
    expect(titulos).not.toContain("Evento Amanha");
    expect(caixa).toHaveLength(2);
  });

  it("compilarItensInbox inclui tarefas com intervalo de datas", () => {
    const itensRepo: ItemRepo[] = [
      {
        caminho: "tarefas/redesign.md",
        nome: "redesign.md",
        sha: "123",
        tamanho: 100,
        texto: `---
status: fazendo
prazo: 2026-08-20 → 2026-08-25
---
# Redesign Geral`,
        doc: {
          dados: { status: "fazendo", prazo: "2026-08-20 → 2026-08-25" },
          corpo: "# Redesign Geral",
        },
      },
    ];

    const agora = new Date(2026, 7, 22, 10, 0, 0);
    const caixa = compilarItensInbox(itensRepo, {}, agora);

    expect(caixa).toHaveLength(1);
    expect(caixa[0].dataVencimento).toBe("2026-08-20 → 2026-08-25");
    expect(caixa[0].descricao).toContain("Em andamento hoje");
  });

  it("aplica estado diretamente no frontmatter e reconhece na compilação", () => {
    const textoOriginal = "---\ntitulo: Tarefa Urgente\nprazo: 2026-08-15\n---\nCorpo da tarefa";
    const textoComVisto = aplicarEstadoInboxNoFrontmatter(textoOriginal, {
      visto: true,
      vistoEm: "2026-08-15T12:00:00.000Z",
    });

    expect(textoComVisto).toContain("visto_em: '2026-08-15T12:00:00.000Z'");

    const doc = { dados: { titulo: "Tarefa Urgente", prazo: "2026-08-15", visto_em: "2026-08-15T12:00:00.000Z" }, corpo: "Corpo da tarefa" };
    const itensRepo: ItemRepo[] = [
      {
        caminho: "tarefas/urgente.md",
        nome: "urgente.md",
        sha: "111",
        tamanho: 100,
        texto: textoComVisto,
        doc,
      },
    ];

    const agora = new Date(2026, 7, 20);
    const caixa = compilarItensInbox(itensRepo, {}, agora);
    expect(caixa).toHaveLength(1);
    expect(caixa[0].visto).toBe(true);
  });
});

