/**
 * O arquivo .md é a fonte da verdade — e o app não é o único a escrever nele.
 *
 * Hugo edita pelo github.com, o Gemini escreve pelo chat, e outra IA pode
 * enriquecer os arquivos por fora. Se um save do app apagar o que ele não
 * conhece, a promessa central da ferramenta está quebrada.
 *
 * Estes testes existem para impedir que isso volte a acontecer.
 */

import { describe, it, expect } from "vitest";
import { lerMarkdown, escreverMarkdown } from "./markdown";
import { comoTarefa, paraFrontmatter } from "./tarefas";
import {
  comoMeta,
  comoEntrega,
  metaParaFrontmatter,
  entregaParaFrontmatter,
} from "./pdi";
import { comoReferencia, refParaFrontmatter } from "./referencias";

/** Salva e relê, devolvendo os campos que sobreviveram. */
function idaEVolta(
  original: string,
  converter: (doc: ReturnType<typeof lerMarkdown>) => Record<string, unknown>,
) {
  const doc = lerMarkdown(original);
  const texto = escreverMarkdown({ dados: converter(doc), corpo: doc.corpo });
  return lerMarkdown(texto);
}

describe("um save nunca pode apagar campo que o app não conhece", () => {
  it("tarefa: preserva projeto, prioridade e qualquer outro campo", () => {
    const original = [
      "---",
      "titulo: Revisar layout",
      "tipo: tarefa",
      "status: fazendo",
      "projeto: cliente-x",
      "prioridade: alta",
      "campo_inventado: valor",
      "---",
      "",
      "corpo",
    ].join("\n");

    const r = idaEVolta(original, (doc) =>
      paraFrontmatter(comoTarefa(doc, "tarefas/x.md", "s", "fb")),
    );

    expect(r.dados.projeto).toBe("cliente-x");
    expect(r.dados.prioridade).toBe("alta");
    expect(r.dados.campo_inventado).toBe("valor");
    // e os campos que o app gerencia continuam certos
    expect(r.dados.titulo).toBe("Revisar layout");
    expect(r.dados.status).toBe("fazendo");
  });

  it("meta: preserva campos extras", () => {
    const original =
      "---\ntitulo: Branding\ntipo: meta\nstatus: em-andamento\nmentor: Ana\n---\n\nx";
    const r = idaEVolta(original, (doc) =>
      metaParaFrontmatter(comoMeta(doc, "pdi/metas/b.md", "s", "fb")),
    );
    expect(r.dados.mentor).toBe("Ana");
    expect(r.dados.titulo).toBe("Branding");
  });

  it("entrega: preserva campos extras sem perder as metas ligadas", () => {
    const original =
      "---\ntitulo: Campanha\ntipo: entrega\ndata: 2026-08-10\nmetas: [branding]\ncliente: Acme\n---\n\nx";
    const r = idaEVolta(original, (doc) =>
      entregaParaFrontmatter(comoEntrega(doc, "pdi/entregas/a.md", "s", "fb")),
    );
    expect(r.dados.cliente).toBe("Acme");
    expect(r.dados.metas).toEqual(["branding"]);
  });

  it("referência: preserva campos extras", () => {
    const original =
      "---\ntitulo: Grade\ntipo: referencia\nautor: Muller-Brockmann\n---\n\nx";
    const r = idaEVolta(original, (doc) =>
      refParaFrontmatter(comoReferencia(doc, "referencias/g.md", "s", "fb")),
    );
    expect(r.dados.autor).toBe("Muller-Brockmann");
  });

  it("o app ainda sobrescreve os campos que ELE gerencia", () => {
    // preservar o desconhecido não pode virar desculpa para não atualizar o conhecido
    const original = "---\ntitulo: Antigo\nstatus: a-fazer\nextra: fica\n---\n\nx";
    const doc = lerMarkdown(original);
    const t = comoTarefa(doc, "tarefas/x.md", "s", "fb");
    t.titulo = "Novo";
    t.status = "feito";

    const r = lerMarkdown(
      escreverMarkdown({ dados: paraFrontmatter(t), corpo: t.corpo }),
    );
    expect(r.dados.titulo).toBe("Novo");
    expect(r.dados.status).toBe("feito");
    expect(r.dados.extra).toBe("fica");
  });

  it("campo gerenciado que ficou vazio é removido, não vira lixo", () => {
    const original = "---\ntitulo: X\nprazo: 2026-08-20\nextra: fica\n---\n\nx";
    const doc = lerMarkdown(original);
    const t = comoTarefa(doc, "tarefas/x.md", "s", "fb");
    t.prazo = undefined; // o usuário limpou a data

    const r = lerMarkdown(
      escreverMarkdown({ dados: paraFrontmatter(t), corpo: t.corpo }),
    );
    expect(r.dados.prazo).toBeUndefined();
    expect(r.dados.extra).toBe("fica");
  });
});
