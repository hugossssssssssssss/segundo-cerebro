/**
 * O texto tem que sobreviver a uma ida e volta pelo editor.
 *
 * O editor serializa com remark-stringify, que escapa `[[` como `\[\[`. Isso
 * sujava o arquivo no repositório E fazia o app parar de reconhecer o link —
 * `\[\[` não tem dois colchetes seguidos, então a busca por links achava zero.
 *
 * Estes testes rodam o serializador de verdade, não uma imitação.
 */

import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { restaurarWikilinks, lerMarkdown } from "./markdown";
import { montarIndice, extrairLinks } from "./links";
import { lerSubtarefas } from "./tarefas";
import type { ItemRepo } from "./repo";

/** Reproduz o que o BlockNote faz ao gravar. */
function comoOEditorGrava(markdown: string): string {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkStringify)
      .processSync(markdown),
  );
}

/** Ida e volta completa, com a correção aplicada. */
function idaEVolta(markdown: string): string {
  return restaurarWikilinks(comoOEditorGrava(markdown));
}

const alvo = (titulo: string): ItemRepo => {
  const texto = `---\ntitulo: ${titulo}\n---\n\nx`;
  return {
    caminho: `notas/${titulo}.md`,
    nome: `${titulo}.md`,
    sha: titulo,
    tamanho: texto.length,
    texto,
    doc: lerMarkdown(texto),
  };
};

describe("o editor escapa os wikilinks — este é o comportamento a corrigir", () => {
  it("sem correção, o link sai quebrado do serializador", () => {
    const cru = comoOEditorGrava("Ver o [[Briefing Acme]].");
    expect(cru).toContain("\\[\\[");
    expect(cru).not.toContain("[[Briefing Acme]]");
  });
});

describe("com a correção, o texto sobrevive", () => {
  it("o link volta intacto", () => {
    expect(idaEVolta("Ver o [[Briefing Acme]].")).toContain(
      "[[Briefing Acme]]",
    );
  });

  it("link com apelido também", () => {
    expect(idaEVolta("Ver o [[nota|apelido]].")).toContain("[[nota|apelido]]");
  });

  it("vários links na mesma linha", () => {
    const r = idaEVolta("[[a]] e [[b]] e [[c]]");
    expect(r).toContain("[[a]]");
    expect(r).toContain("[[b]]");
    expect(r).toContain("[[c]]");
    expect(r).not.toContain("\\[");
  });

  it("o app continua reconhecendo o link depois de salvar", () => {
    // era isto que quebrava de verdade: extrairLinks achava zero
    const indice = montarIndice([alvo("Briefing Acme")]);
    const depoisDeSalvar = idaEVolta("Ver o [[Briefing Acme]] aqui.");

    const links = extrairLinks(depoisDeSalvar, indice);
    expect(links).toHaveLength(1);
    expect(links[0].alvo?.titulo).toBe("Briefing Acme");
  });

  it("salvar dez vezes seguidas não acumula barras", () => {
    let texto = "Ver o [[Briefing Acme]].";
    for (let i = 0; i < 10; i++) texto = idaEVolta(texto);
    expect(texto).toContain("[[Briefing Acme]]");
    expect(texto).not.toContain("\\");
  });
});

describe("o resto do texto também precisa sobreviver", () => {
  it("as caixinhas continuam sendo lidas mesmo virando asterisco", () => {
    const r = idaEVolta("- [ ] passo aberto\n- [x] passo feito");
    const subs = lerSubtarefas(r);
    expect(subs).toHaveLength(2);
    expect(subs[0].feita).toBe(false);
    expect(subs[1].feita).toBe(true);
  });

  it("acentos e emoji passam sem dano", () => {
    const r = idaEVolta("Coração, ação, ünïcode 🍅");
    expect(r).toContain("Coração, ação, ünïcode 🍅");
  });

  it("texto sem link nenhum não é alterado à toa", () => {
    expect(restaurarWikilinks("texto comum")).toBe("texto comum");
  });

  it("não estraga colchete solto legítimo", () => {
    // um link markdown normal não pode virar wikilink
    const r = restaurarWikilinks("veja [o site](https://x.com)");
    expect(r).toBe("veja [o site](https://x.com)");
  });
});
