/**
 * Testes do contrato de conversão arquivo ↔ entidade.
 *
 * A regra que estes testes existem para proteger: `paraArquivo` NUNCA pode
 * perder um campo que o app não conhece. Se alguém editar um .md pelo celular
 * e colocar um campo novo no frontmatter, esse campo tem que sobreviver ao
 * próximo save feito pelo app.
 */

import { describe, it, expect } from "vitest";
import { lerMarkdown } from "./markdown";
import {
  comoNota,
  notaParaArquivo,
  comoTarefa,
  tarefaParaArquivo,
  comoMeta,
  metaParaArquivo,
  comoEntrega,
  entregaParaArquivo,
  comoReferencia,
  referenciaParaArquivo,
  dataDoNome,
  textoPrazoTarefa,
  textoPrazoMeta,
} from "./entidades";
import { PASTAS } from "./tipos";

/** Monta um Documento a partir de texto markdown cru. */
const doc = (texto: string) => lerMarkdown(texto);

describe("PASTAS", () => {
  it("mapeia as entidades para os caminhos do repositório", () => {
    expect(PASTAS).toEqual({
      notas: "notas",
      tarefas: "tarefas",
      metas: "pdi/metas",
      entregas: "pdi/entregas",
      referencias: "referencias",
      lousas: "lousas",
      processos: "processos",
      cardsProcesso: "processos/cards",
      caixaEntrada: "caixa-entrada",
    });
  });
});

describe("dataDoNome", () => {
  it("extrai a data do prefixo do nome do arquivo", () => {
    expect(dataDoNome("pdi/entregas/2026-08-13-cartaz.md")).toBe("2026-08-13");
  });

  it("devolve string vazia quando não há prefixo de data", () => {
    expect(dataDoNome("notas/ideia-solta.md")).toBe("");
  });
});

describe("comoNota", () => {
  it("lê os campos conhecidos do frontmatter", () => {
    const n = comoNota(
      doc("---\ntitulo: Minha nota\ntipo: rascunho\ntags: [design, cor]\n---\n\nCorpo"),
      "notas/a.md",
      "sha1",
      "fallback",
    );
    expect(n.titulo).toBe("Minha nota");
    expect(n.tipo).toBe("rascunho");
    expect(n.tags).toEqual(["design", "cor"]);
    expect(n.corpo.trim()).toBe("Corpo");
    expect(n.caminho).toBe("notas/a.md");
    expect(n.sha).toBe("sha1");
  });

  it("usa o título de fallback quando o frontmatter não tem título", () => {
    const n = comoNota(doc("Só corpo"), "notas/a.md", "sha1", "Título do arquivo");
    expect(n.titulo).toBe("Título do arquivo");
  });

  it("usa o fallback quando o título é só espaço em branco", () => {
    const n = comoNota(doc("---\ntitulo: '   '\n---\n"), "notas/a.md", "s", "Fallback");
    expect(n.titulo).toBe("Fallback");
  });

  it("normaliza tipo desconhecido para 'nota'", () => {
    const n = comoNota(doc("---\ntipo: coisa-estranha\n---\n"), "notas/a.md", "s", "t");
    expect(n.tipo).toBe("nota");
  });

  it("guarda o frontmatter inteiro em bruto", () => {
    const n = comoNota(
      doc("---\ntitulo: X\ncampo_do_futuro: 42\n---\n"),
      "notas/a.md",
      "s",
      "t",
    );
    expect(n.bruto.campo_do_futuro).toBe(42);
  });
});

describe("notaParaArquivo", () => {
  it("preserva campos desconhecidos do frontmatter original", () => {
    const n = comoNota(
      doc("---\ntitulo: X\ncampo_do_futuro: 42\nautor: Hugo\n---\n\nCorpo"),
      "notas/a.md",
      "s",
      "t",
    );
    n.titulo = "Novo título";
    const { dados, corpo } = notaParaArquivo(n);

    expect(dados.campo_do_futuro).toBe(42);
    expect(dados.autor).toBe("Hugo");
    expect(dados.titulo).toBe("Novo título");
    expect(corpo.trim()).toBe("Corpo");
  });

  it("omite tags quando a lista está vazia", () => {
    const n = comoNota(doc("---\ntitulo: X\n---\n"), "notas/a.md", "s", "t");
    expect(notaParaArquivo(n).dados.tags).toBeUndefined();
  });

  it("carimba a data de atualização", () => {
    const n = comoNota(doc("---\ntitulo: X\n---\n"), "notas/a.md", "s", "t");
    expect(notaParaArquivo(n).dados.atualizado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("comoTarefa", () => {
  it("lê status, prazo e tags", () => {
    const t = comoTarefa(
      doc("---\ntitulo: Fazer\nstatus: fazendo\nprazo: 2026-09-01\ntags: [urgente]\n---\n"),
      "tarefas/a.md",
      "s",
      "t",
    );
    expect(t.status).toBe("fazendo");
    expect(t.prazo).toBe("2026-09-01");
    expect(t.tags).toEqual(["urgente"]);
  });

  it("normaliza status inválido para 'a-fazer'", () => {
    const t = comoTarefa(doc("---\nstatus: inventado\n---\n"), "tarefas/a.md", "s", "t");
    expect(t.status).toBe("a-fazer");
  });

  it("normaliza status ausente para 'a-fazer'", () => {
    const t = comoTarefa(doc("Sem frontmatter"), "tarefas/a.md", "s", "t");
    expect(t.status).toBe("a-fazer");
  });
});

describe("tarefaParaArquivo", () => {
  it("preserva a data de criação original", () => {
    const t = comoTarefa(
      doc("---\ntitulo: X\ncriado: 2026-01-01\n---\n"),
      "tarefas/a.md",
      "s",
      "t",
    );
    expect(tarefaParaArquivo(t).dados.criado).toBe("2026-01-01");
  });

  it("aceita o campo legado criado_em como origem da data de criação", () => {
    const t = comoTarefa(
      doc("---\ntitulo: X\ncriado_em: 2025-05-05\n---\n"),
      "tarefas/a.md",
      "s",
      "t",
    );
    expect(tarefaParaArquivo(t).dados.criado).toBe("2025-05-05");
  });

  it("cria a data de criação quando o arquivo não tem nenhuma", () => {
    const t = comoTarefa(doc("---\ntitulo: X\n---\n"), "tarefas/a.md", "s", "t");
    expect(tarefaParaArquivo(t).dados.criado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("sempre grava tipo: tarefa", () => {
    const t = comoTarefa(doc("---\ntitulo: X\n---\n"), "tarefas/a.md", "s", "t");
    expect(tarefaParaArquivo(t).dados.tipo).toBe("tarefa");
  });

  it("preserva campos desconhecidos", () => {
    const t = comoTarefa(
      doc("---\ntitulo: X\npomodoros: 3\n---\n"),
      "tarefas/a.md",
      "s",
      "t",
    );
    expect(tarefaParaArquivo(t).dados.pomodoros).toBe(3);
  });
});

describe("comoMeta", () => {
  it("deriva o id do nome do arquivo", () => {
    const m = comoMeta(doc("---\ntitulo: X\n---\n"), "pdi/metas/dominar-tipografia.md", "s", "t");
    expect(m.id).toBe("dominar-tipografia");
  });

  it("normaliza status inválido para 'a-fazer'", () => {
    const m = comoMeta(doc("---\nstatus: xyz\n---\n"), "pdi/metas/a.md", "s", "t");
    expect(m.status).toBe("a-fazer");
  });

  it("aceita os status válidos de meta", () => {
    const m = comoMeta(doc("---\nstatus: em-andamento\n---\n"), "pdi/metas/a.md", "s", "t");
    expect(m.status).toBe("em-andamento");
  });

  it("indicador ausente vira string vazia", () => {
    const m = comoMeta(doc("---\ntitulo: X\n---\n"), "pdi/metas/a.md", "s", "t");
    expect(m.indicador).toBe("");
  });
});

describe("metaParaArquivo", () => {
  it("omite indicador vazio em vez de gravar string vazia", () => {
    const m = comoMeta(doc("---\ntitulo: X\n---\n"), "pdi/metas/a.md", "s", "t");
    expect(metaParaArquivo(m).dados.indicador).toBeUndefined();
  });

  it("preserva campos desconhecidos", () => {
    const m = comoMeta(
      doc("---\ntitulo: X\nrevisado_por: chefe\n---\n"),
      "pdi/metas/a.md",
      "s",
      "t",
    );
    expect(metaParaArquivo(m).dados.revisado_por).toBe("chefe");
  });
});

describe("comoEntrega", () => {
  it("lê data, metas e ia_sugeriu", () => {
    const e = comoEntrega(
      doc("---\ntitulo: Cartaz\ndata: 2026-08-13\nmetas: [tipografia]\nia_sugeriu: true\n---\n"),
      "pdi/entregas/a.md",
      "s",
      "t",
    );
    expect(e.data).toBe("2026-08-13");
    expect(e.metas).toEqual(["tipografia"]);
    expect(e.iaSugeriu).toBe(true);
  });

  it("cai para a data do nome do arquivo quando o frontmatter não tem data", () => {
    const e = comoEntrega(
      doc("---\ntitulo: X\n---\n"),
      "pdi/entregas/2026-08-13-cartaz.md",
      "s",
      "t",
    );
    expect(e.data).toBe("2026-08-13");
  });

  it("iaSugeriu só é true para o booleano true, não para strings", () => {
    const e = comoEntrega(doc("---\nia_sugeriu: 'sim'\n---\n"), "pdi/entregas/a.md", "s", "t");
    expect(e.iaSugeriu).toBe(false);
  });
});

describe("entregaParaArquivo", () => {
  it("omite ia_sugeriu quando falso — o padrão não polui o arquivo", () => {
    const e = comoEntrega(doc("---\ntitulo: X\n---\n"), "pdi/entregas/a.md", "s", "t");
    expect(entregaParaArquivo(e).dados.ia_sugeriu).toBeUndefined();
  });

  it("grava ia_sugeriu quando verdadeiro", () => {
    const e = comoEntrega(doc("---\nia_sugeriu: true\n---\n"), "pdi/entregas/a.md", "s", "t");
    expect(entregaParaArquivo(e).dados.ia_sugeriu).toBe(true);
  });

  it("faz a volta completa sem perder as metas", () => {
    const original = "---\ntitulo: Cartaz\ndata: 2026-08-13\nmetas:\n  - tipografia\n  - cor\n---\n\nCorpo";
    const e = comoEntrega(doc(original), "pdi/entregas/a.md", "s", "t");
    expect(entregaParaArquivo(e).dados.metas).toEqual(["tipografia", "cor"]);
  });
});

describe("comoReferencia", () => {
  it("lê imagem, fonte, porque e tags do frontmatter", () => {
    const r = comoReferencia(
      doc("---\ntitulo: X\nimagem: imagens/a.jpg\nfonte: https://exemplo.com\nporque: gradiente\ntags: [cor]\n---\n"),
      "referencias/a.md",
      "s",
      "t",
    );
    expect(r.imagem).toBe("imagens/a.jpg");
    expect(r.fonte).toBe("https://exemplo.com");
    expect(r.porque).toBe("gradiente");
    expect(r.tags).toEqual(["cor"]);
  });

  it("acha a imagem no corpo quando o frontmatter não a declara", () => {
    const r = comoReferencia(
      doc("---\ntitulo: X\n---\n\n![](imagens/achada.png)\n\ntexto"),
      "referencias/a.md",
      "s",
      "t",
    );
    expect(r.imagem).toBe("imagens/achada.png");
  });

  it("imagem fica indefinida quando não há nenhuma", () => {
    const r = comoReferencia(doc("---\ntitulo: X\n---\n\nsó texto"), "referencias/a.md", "s", "t");
    expect(r.imagem).toBeUndefined();
  });
});

describe("referenciaParaArquivo", () => {
  it("preserva campos desconhecidos como paleta e ocr", () => {
    const r = comoReferencia(
      doc("---\ntitulo: X\npaleta: ['#fff', '#000']\nocr: texto lido\n---\n"),
      "referencias/a.md",
      "s",
      "t",
    );
    const { dados } = referenciaParaArquivo(r);
    expect(dados.paleta).toEqual(["#fff", "#000"]);
    expect(dados.ocr).toBe("texto lido");
  });
});

describe("textoPrazoTarefa", () => {
  const tarefaCom = (prazo?: string) =>
    comoTarefa(
      doc(prazo ? `---\nprazo: ${prazo}\n---\n` : "---\ntitulo: X\n---\n"),
      "tarefas/a.md",
      "s",
      "t",
    );

  const emDias = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  it("sem prazo devolve string vazia", () => {
    expect(textoPrazoTarefa(tarefaCom())).toBe("");
  });

  it("vencendo hoje", () => {
    expect(textoPrazoTarefa(tarefaCom(emDias(0)))).toBe("vence hoje");
  });

  it("vencendo amanhã", () => {
    expect(textoPrazoTarefa(tarefaCom(emDias(1)))).toBe("amanhã");
  });

  it("dentro da semana", () => {
    expect(textoPrazoTarefa(tarefaCom(emDias(4)))).toBe("em 4 dias");
  });

  it("atrasada um dia usa o singular", () => {
    expect(textoPrazoTarefa(tarefaCom(emDias(-1)))).toBe("atrasada 1 dia");
  });

  it("atrasada vários dias usa o plural", () => {
    expect(textoPrazoTarefa(tarefaCom(emDias(-3)))).toBe("atrasada 3 dias");
  });
});

describe("textoPrazoMeta", () => {
  const metaCom = (prazo: string, status = "a-fazer") =>
    comoMeta(doc(`---\nprazo: ${prazo}\nstatus: ${status}\n---\n`), "pdi/metas/a.md", "s", "t");

  const emDias = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  it("meta concluída não mostra prazo, mesmo vencido", () => {
    expect(textoPrazoMeta(metaCom(emDias(-10), "concluida"))).toBe("");
  });

  it("vencida mostra há quantos dias", () => {
    expect(textoPrazoMeta(metaCom(emDias(-2)))).toBe("venceu há 2 dias");
  });

  it("vencida ontem usa o singular", () => {
    expect(textoPrazoMeta(metaCom(emDias(-1)))).toBe("venceu há 1 dia");
  });

  it("prazo longo é mostrado em meses", () => {
    expect(textoPrazoMeta(metaCom(emDias(60)))).toBe("2 meses");
  });
});
