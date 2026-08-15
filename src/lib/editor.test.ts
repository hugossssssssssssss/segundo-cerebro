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
import { lerSubtarefas, minutosRegistrados } from "./tarefas";
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
  it("o link volta intacto como menção @", () => {
    expect(idaEVolta("Ver o @Briefing Acme.")).toContain(
      "@Briefing Acme",
    );
  });

  it("link com apelido também", () => {
    expect(idaEVolta("Ver o @nota|apelido.")).toContain("@nota|apelido");
  });

  it("vários links na mesma linha", () => {
    const r = idaEVolta("@a e @b e @c");
    expect(r).toContain("@a");
    expect(r).toContain("@b");
    expect(r).toContain("@c");
    expect(r).not.toContain("\\[");
  });

  it("o app continua reconhecendo o link depois de salvar", () => {
    const indice = montarIndice([alvo("Briefing Acme")]);
    const depoisDeSalvar = idaEVolta("Ver o @Briefing Acme aqui.");

    const links = extrairLinks(depoisDeSalvar, indice);
    expect(links).toHaveLength(1);
    expect(links[0].alvo?.titulo).toBe("Briefing Acme");
  });

  it("salvar dez vezes seguidas não acumula barras", () => {
    let texto = "Ver o @Briefing Acme.";
    for (let i = 0; i < 10; i++) texto = idaEVolta(texto);
    expect(texto).toContain("@Briefing Acme");
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

  it("não transforma em link o que o usuário escapou de propósito", () => {
    // O teste antigo passava um texto SEM barra invertida, que a função nunca
    // poderia tocar — provava nada. Estes têm barra e devem sobreviver.
    expect(restaurarWikilinks("custa \\[muito]")).toBe("custa \\[muito]");
    expect(restaurarWikilinks("veja [o site](https://x.com)")).toBe(
      "veja [o site](https://x.com)",
    );
  });

  it("desfaz o escape nos dois lados quando existe", () => {
    expect(restaurarWikilinks("\\[\\[x\\]\\]")).toBe("@x");
  });

  it("dois links na mesma linha", () => {
    expect(restaurarWikilinks("\\[\\[a]] e \\[\\[b]]")).toBe("@a e @b");
  });
});

describe("o corpo real de uma tarefa sobrevive ao editor", () => {
  const corpoReal = [
    "Ajustar a grade do material. Ver o @Briefing Acme.",
    "",
    "- [ ] escolher as imagens",
    "- [x] revisar os textos",
    "",
    "## Tempo",
    "- 2026-08-13 14:20 → 14:45 (25min)",
    "- 2026-08-13 15:00 → 15:25 (25min)",
  ].join("\n");

  const depois = idaEVolta(corpoReal);

  it("mantém a seção Tempo e o total de minutos", () => {
    expect(depois).toContain("## Tempo");
    expect(minutosRegistrados(depois)).toBe(50);
  });

  it("mantém as subtarefas e o que está marcado", () => {
    const subs = lerSubtarefas(depois);
    expect(subs).toHaveLength(2);
    expect(subs.filter((s) => s.feita)).toHaveLength(1);
  });

  it("mantém o link e a seta do registro", () => {
    expect(depois).toContain("@Briefing Acme");
    expect(depois).toContain("→");
  });
});

/**
 * A menção do `@` é gravada como TEXTO PURO, não como link.
 *
 * A versão anterior inseria `[@Nome](notas/arquivo.md)`. O caminho era contado
 * da raiz do repositório, mas o arquivo que contém a menção mora numa
 * subpasta — o link resolvia errado e dava 404 no GitHub. Como texto puro
 * não há caminho para quebrar, e o app resolve pelo próprio texto.
 */
describe("menção com @ como texto puro", () => {
  const indice = montarIndice([alvo("Briefing Acme"), alvo("Grade suíça")]);

  it("sobrevive à ida e volta pelo serializador, sem escape", () => {
    const depois = idaEVolta("Falar com @Briefing Acme antes de sexta.");
    expect(depois).toContain("@Briefing Acme");
    expect(depois).not.toContain("\\@");
  });

  it("continua resolvendo para o item depois de passar pelo editor", () => {
    const depois = idaEVolta("Ver @Grade suíça.");
    const links = extrairLinks(depois, indice);
    expect(links).toHaveLength(1);
    expect(links[0].alvo?.titulo).toBe("Grade suíça");
  });

  it("não deixa caminho de arquivo no meio do texto", () => {
    // era o sintoma do formato antigo: o .md ficava poluído de caminho
    const depois = idaEVolta("Falar com @Briefing Acme.");
    expect(depois).not.toContain("notas/");
    expect(depois).not.toContain(".md");
  });

  it("duas menções na mesma linha resolvem as duas", () => {
    const depois = idaEVolta("De @Grade suíça para @Briefing Acme.");
    const links = extrairLinks(depois, indice);
    expect(links.map((l) => l.alvo?.titulo).sort()).toEqual([
      "Briefing Acme",
      "Grade suíça",
    ]);
  });

  it("o [[link]] antigo continua funcionando, para não quebrar o que já existe", () => {
    const depois = idaEVolta("Ver [[Briefing Acme]] e @Grade suíça.");
    const links = extrairLinks(depois, indice);
    expect(links.map((l) => l.alvo?.titulo).sort()).toEqual([
      "Briefing Acme",
      "Grade suíça",
    ]);
  });
});
