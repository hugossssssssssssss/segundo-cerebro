/**
 * Testes do núcleo de Markdown.
 *
 * Rode com: npm test
 *
 * Estes testes protegem a única coisa que não pode falhar nunca:
 * o texto que o Hugo escreveu não pode ser perdido nem corrompido.
 */

import { describe, it, expect } from "vitest";
import {
  lerMarkdown,
  escreverMarkdown,
  tituloProvavel,
  nomeDeArquivo,
  comoLista,
} from "./markdown";

describe("lerMarkdown", () => {
  it("separa frontmatter do corpo", () => {
    const doc = lerMarkdown("---\ntitulo: Teste\n---\n\nCorpo aqui");
    expect(doc.dados.titulo).toBe("Teste");
    expect(doc.corpo.trim()).toBe("Corpo aqui");
  });

  it("lê listas do YAML", () => {
    const doc = lerMarkdown("---\ntags:\n  - design\n  - cliente\n---\n\nx");
    expect(doc.dados.tags).toEqual(["design", "cliente"]);
  });

  it("aceita arquivo sem frontmatter nenhum", () => {
    const doc = lerMarkdown("# Só um título\n\ntexto solto");
    expect(doc.dados).toEqual({});
    expect(doc.corpo).toContain("texto solto");
  });

  it("NUNCA perde o texto quando o YAML está quebrado", () => {
    const doc = lerMarkdown("---\ntitulo: [não fecha\n---\n\ntexto importante");
    expect(doc.corpo).toContain("texto importante");
  });

  it("preserva acentos e emoji", () => {
    const doc = lerMarkdown("---\ntitulo: Ação\n---\n\nCoração 🍅 àéîõü");
    expect(doc.dados.titulo).toBe("Ação");
    expect(doc.corpo).toContain("Coração 🍅 àéîõü");
  });

  it("mantém datas como texto, não como objeto Date", () => {
    const doc = lerMarkdown("---\nprazo: 2026-08-20\n---\n\nx");
    expect(doc.dados.prazo).toBe("2026-08-20");
  });
});

describe("escreverMarkdown", () => {
  it("faz ida e volta sem perder nada", () => {
    const entrada = {
      dados: { titulo: "Reunião", tags: ["a", "b"], prazo: "2026-08-20" },
      corpo: "Corpo com ção e 🍅",
    };
    const refeito = lerMarkdown(escreverMarkdown(entrada));
    expect(refeito.dados.titulo).toBe("Reunião");
    expect(refeito.dados.tags).toEqual(["a", "b"]);
    expect(refeito.corpo.trim()).toBe("Corpo com ção e 🍅");
  });

  it("não gera bloco --- quando não há campos", () => {
    const saida = escreverMarkdown({ dados: {}, corpo: "só texto" });
    expect(saida).toBe("só texto");
    expect(saida.startsWith("---")).toBe(false);
  });

  it("descarta campos vazios em vez de gravar lixo", () => {
    const saida = escreverMarkdown({
      dados: { titulo: "ok", vazio: "", nulo: null },
      corpo: "x",
    });
    expect(saida).toContain("titulo: ok");
    expect(saida).not.toContain("vazio");
    expect(saida).not.toContain("nulo");
  });

  it("não quebra linhas longas do frontmatter", () => {
    const longo = "a".repeat(200);
    const saida = escreverMarkdown({ dados: { titulo: longo }, corpo: "x" });
    expect(lerMarkdown(saida).dados.titulo).toBe(longo);
  });
});

describe("tituloProvavel", () => {
  it("prefere o campo titulo", () => {
    const doc = lerMarkdown("---\ntitulo: Do campo\n---\n\n# Do cabeçalho");
    expect(tituloProvavel(doc, "x.md")).toBe("Do campo");
  });

  it("cai para o cabeçalho markdown", () => {
    expect(tituloProvavel(lerMarkdown("# Do cabeçalho\n\ntexto"), "x.md")).toBe(
      "Do cabeçalho",
    );
  });

  it("cai para a primeira linha com conteúdo", () => {
    expect(tituloProvavel(lerMarkdown("\n\nprimeira linha"), "x.md")).toBe(
      "primeira linha",
    );
  });

  it("cai para o nome do arquivo quando não há nada", () => {
    expect(tituloProvavel(lerMarkdown(""), "minha-nota.md")).toBe("minha-nota");
  });
});

describe("nomeDeArquivo", () => {
  it("tira acento e símbolo", () => {
    expect(nomeDeArquivo("Reunião com o cliente!")).toMatch(
      /^\d{4}-\d{2}-\d{2}-reuniao-com-o-cliente\.md$/,
    );
  });

  it("não gera nome inválido a partir de título vazio", () => {
    expect(nomeDeArquivo("")).toContain("sem-titulo");
  });

  it("não gera nome inválido a partir de título só com símbolos", () => {
    expect(nomeDeArquivo("!!!???")).toContain("sem-titulo");
  });
});

describe("comoLista", () => {
  it("aceita lista, string única e ausência", () => {
    expect(comoLista(["a", "b"])).toEqual(["a", "b"]);
    expect(comoLista("só uma")).toEqual(["só uma"]);
    expect(comoLista(undefined)).toEqual([]);
    expect(comoLista("")).toEqual([]);
  });
});
