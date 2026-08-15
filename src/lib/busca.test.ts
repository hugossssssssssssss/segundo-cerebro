import { describe, it, expect, beforeEach } from "vitest";
import { lerMarkdown } from "./markdown";
import {
  buscar,
  agrupar,
  tipoDoItem,
  buscarFerramentas,
  filtrarPorCategoria,
  alternarFavoritoBusca,
  ehFavoritoBusca,
} from "./busca";
import type { ItemRepo } from "./repo";

function item(caminho: string, texto: string): ItemRepo {
  return {
    caminho,
    nome: caminho.split("/").pop()!,
    sha: caminho,
    tamanho: texto.length,
    texto,
    doc: lerMarkdown(texto),
  };
}

const acervo: ItemRepo[] = [
  item(
    "notas/2026-05-01-briefing-acme.md",
    "---\ntitulo: Briefing Acme\ntags: [cliente, branding]\n---\n\nO cliente quer algo mais sóbrio. Falamos de tipografia serifada.",
  ),
  item(
    "tarefas/2026-08-13-revisar-layout.md",
    "---\ntitulo: Revisar layout\ntipo: tarefa\n---\n\nAjustar a grade do material da Acme.",
  ),
  item(
    "referencias/2026-07-02-grade-suica.md",
    "---\ntitulo: Grade suíça\ntipo: referencia\ntags: [tipografia]\n---\n\nMüller-Brockmann. A grade respira.",
  ),
  item(
    "pdi/metas/branding.md",
    "---\ntitulo: Domínio em branding\ntipo: meta\n---\n\nConduzir projetos sozinho.",
  ),
];

describe("buscar", () => {
  it("acha palavra que só existe no meio do corpo", () => {
    const r = buscar(acervo, "serifada");
    expect(r).toHaveLength(1);
    expect(r[0].titulo).toBe("Briefing Acme");
  });

  it("ignora acento e caixa nos dois lados", () => {
    expect(buscar(acervo, "SUICA")[0].titulo).toBe("Grade suíça");
    expect(buscar(acervo, "suíça")[0].titulo).toBe("Grade suíça");
    expect(buscar(acervo, "dominio")[0].titulo).toBe("Domínio em branding");
  });

  it("acha por tag", () => {
    const r = buscar(acervo, "tipografia");
    expect(r.map((x) => x.titulo)).toContain("Grade suíça");
  });

  it("título pesa mais que corpo", () => {
    const r = buscar(acervo, "acme");
    expect(r[0].titulo).toBe("Briefing Acme");
    expect(r).toHaveLength(2);
  });

  it("acha em tipos diferentes de uma vez", () => {
    const r = buscar(acervo, "branding");
    expect(new Set(r.map((x) => x.tipo))).toEqual(new Set(["nota", "meta"]));
  });

  it("devolve trecho em volta do que casou", () => {
    const r = buscar(acervo, "sóbrio");
    expect(r[0].trecho).toContain("sóbrio");
    expect(r[0].trecho.length).toBeLessThan(160);
  });

  it("termo curto demais não busca nada", () => {
    expect(buscar(acervo, "a")).toEqual([]);
    expect(buscar(acervo, " ")).toEqual([]);
  });

  it("sem resultado devolve lista vazia, não erro", () => {
    expect(buscar(acervo, "xilofone")).toEqual([]);
  });

  it("perdoa erro de digitação", () => {
    expect(buscar(acervo, "tipografa").map((x) => x.titulo)).toContain("Grade suíça");
    expect(buscar(acervo, "brandng").map((x) => x.titulo)).toContain(
      "Domínio em branding",
    );
  });

  it("acha por começo de palavra", () => {
    expect(buscar(acervo, "tipo").map((x) => x.titulo)).toContain("Grade suíça");
    expect(buscar(acervo, "serif").map((x) => x.titulo)).toContain("Briefing Acme");
  });

  it("duas palavras exigem as duas — não devolve o mundo inteiro", () => {
    const r = buscar(acervo, "grade acme");
    expect(r).toHaveLength(1);
    expect(r[0].titulo).toBe("Revisar layout");
  });

  it("reaproveita o índice entre chamadas com o mesmo acervo", () => {
    expect(buscar(acervo, "acme")).toEqual(buscar(acervo, "acme"));
  });

  it("acervo novo é reindexado em vez de servir o índice velho", () => {
    const outro = [
      item("notas/nova.md", "---\ntitulo: Assunto Novo\n---\n\nrecém-criada."),
    ];
    expect(buscar(outro, "acme")).toEqual([]);
    expect(buscar(outro, "assunto")[0].titulo).toBe("Assunto Novo");
    expect(buscar(acervo, "acme")[0].titulo).toBe("Briefing Acme");
  });
});

describe("buscarFerramentas", () => {
  it("encontra ferramenta por nome de conversão", () => {
    const f = buscarFerramentas("png");
    expect(f.map((x) => x.id)).toContain("pdf_para_png");
  });

  it("encontra transcritor por palavra chave áudio", () => {
    const f = buscarFerramentas("áudio");
    expect(f.map((x) => x.id)).toContain("transcritor");
  });

  it("retorna lista vazia para termos muito curtos", () => {
    expect(buscarFerramentas("a")).toEqual([]);
  });
});

describe("filtrarPorCategoria", () => {
  it("filtra apenas notas quando selecionado notas", () => {
    const r = buscar(acervo, "acme");
    const notas = filtrarPorCategoria(r, "notas");
    expect(notas).toHaveLength(1);
    expect(notas[0].tipo).toBe("nota");
  });

  it("filtra apenas tarefas", () => {
    const r = buscar(acervo, "acme");
    const tarefas = filtrarPorCategoria(r, "tarefas");
    expect(tarefas).toHaveLength(1);
    expect(tarefas[0].tipo).toBe("tarefa");
  });

  it("retorna tudo quando selecionado tudo", () => {
    const r = buscar(acervo, "acme");
    expect(filtrarPorCategoria(r, "tudo")).toEqual(r);
  });
});

describe("gerenciamento de favoritos da busca", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("alterna favoritos e salva no localStorage", () => {
    expect(ehFavoritoBusca("pdf_para_png")).toBe(false);

    const f1 = alternarFavoritoBusca("pdf_para_png");
    expect(f1).toContain("pdf_para_png");
    expect(ehFavoritoBusca("pdf_para_png")).toBe(true);

    const f2 = alternarFavoritoBusca("pdf_para_png");
    expect(f2).not.toContain("pdf_para_png");
    expect(ehFavoritoBusca("pdf_para_png")).toBe(false);
  });
});

describe("tipoDoItem", () => {
  it("usa o frontmatter quando existe", () => {
    expect(tipoDoItem(acervo[1])).toBe("tarefa");
  });

  it("cai para a pasta quando o frontmatter não diz", () => {
    expect(tipoDoItem(acervo[0])).toBe("nota");
    expect(tipoDoItem(item("pdi/entregas/2026-01-01-x.md", "sem frontmatter"))).toBe(
      "entrega",
    );
    expect(tipoDoItem(item("reunioes/x.md", "x"))).toBe("reuniao");
  });

  it("pasta desconhecida vira 'outro' em vez de quebrar", () => {
    expect(tipoDoItem(item("qualquer/x.md", "x"))).toBe("outro");
  });
});

describe("agrupar", () => {
  it("junta por tipo, grupo maior primeiro", () => {
    const grupos = agrupar(buscar(acervo, "a".repeat(1)).concat(buscar(acervo, "acme")));
    expect(grupos.length).toBeGreaterThan(0);
    expect(grupos[0][1].length).toBeGreaterThanOrEqual(grupos[grupos.length - 1][1].length);
  });
});
