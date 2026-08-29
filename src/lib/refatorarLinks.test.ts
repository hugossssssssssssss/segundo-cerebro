import { describe, it, expect } from "vitest";
import {
  substituirMencoesSeguras,
  isolarBlocosCodigo,
  restaurarBlocosCodigo,
  planejarRefatoracao,
} from "./refatorarLinks";
import type { ItemRepo } from "./repo";
import { lerMarkdown } from "./markdown";

describe("refatorarLinks - proteção e refatoração em cascata", () => {
  it("isola e restaura blocos de código com perfeição", () => {
    const texto = "Texto inicial `código inline` e bloco:\n```\nbloco fenced\n```\nFim.";
    const { textoSemCodigo, blocos } = isolarBlocosCodigo(texto);
    expect(blocos).toHaveLength(2);
    expect(textoSemCodigo).not.toContain("bloco fenced");
    const restaurado = restaurarBlocosCodigo(textoSemCodigo, blocos);
    expect(restaurado).toBe(texto);
  });

  it("substitui menção simples @Design por @Identidade Visual", () => {
    const texto = "Revisar com @Design amanhã cedo.";
    const res = substituirMencoesSeguras(texto, "Design", "Identidade Visual", ["Design"]);
    expect(res).toBe("Revisar com @Identidade Visual amanhã cedo.");
  });

  it("NÃO corrompe título mais longo que começa com o mesmo prefixo", () => {
    const texto = "Ler o manual do @Design System e conversar com @Design.";
    const titulos = ["Design", "Design System"];
    const res = substituirMencoesSeguras(texto, "Design", "Identidade Visual", titulos);
    // @Design System DEVE permanecer intacto; apenas @Design isolado deve mudar
    expect(res).toBe("Ler o manual do @Design System e conversar com @Identidade Visual.");
  });

  it("protege menções dentro de blocos de código fenced (```)", () => {
    const texto = `Aqui está o código:
\`\`\`ts
const usuario = "@Design";
\`\`\`
Favor checar com @Design.`;

    const res = substituirMencoesSeguras(texto, "Design", "Identidade", ["Design"]);
    expect(res).toContain('const usuario = "@Design";');
    expect(res).toContain("Favor checar com @Identidade.");
  });

  it("protege menções dentro de código inline (`...`)", () => {
    const texto = "Execute `@Design` no terminal e avise o @Design.";
    const res = substituirMencoesSeguras(texto, "Design", "Identidade", ["Design"]);
    expect(res).toBe("Execute `@Design` no terminal e avise o @Identidade.");
  });

  it("atualiza wikilinks legados [[Design]] e preserva alias", () => {
    const texto = "Veja [[Design]] e também [[Design|Nosso Design]].";
    const res = substituirMencoesSeguras(texto, "Design", "Identidade", ["Design"]);
    expect(res).toBe("Veja [[Identidade]] e também [[Identidade|Nosso Design]].");
  });

  it("atualiza URLs internas ?abrir=...", () => {
    const texto = "Link para nota: https://klaus.app/#/notas?abrir=notas%2Fdesign.md";
    const res = substituirMencoesSeguras(
      texto,
      "Design",
      "Identidade",
      ["Design"],
      "notas/design.md",
      "notas/identidade.md"
    );
    expect(res).toContain("?abrir=notas%2Fidentidade.md");
  });

  it("planeja refatoração detectando apenas arquivos com menções reais", () => {
    const item1: ItemRepo = {
      caminho: "notas/briefing.md",
      nome: "briefing.md",
      sha: "sha1",
      tamanho: 100,
      texto: "Alinhado com @Design.",
      doc: lerMarkdown("Alinhado com @Design."),
    };

    const item2: ItemRepo = {
      caminho: "tarefas/codigo.md",
      nome: "codigo.md",
      sha: "sha2",
      tamanho: 100,
      texto: "Sem menções a ninguém.",
      doc: lerMarkdown("Sem menções a ninguém."),
    };

    const plano = planejarRefatoracao([item1, item2], "Design", "Identidade");
    expect(plano.totalArquivos).toBe(1);
    expect(plano.alteracoes[0].caminho).toBe("notas/briefing.md");
    expect(plano.alteracoes[0].textoDepois).toBe("Alinhado com @Identidade.");
  });
});
