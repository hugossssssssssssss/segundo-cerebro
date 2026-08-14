import { describe, it, expect } from "vitest";
import {
  lerSubtarefas,
  alternarSubtarefa,
  adicionarSubtarefa,
  removerSubtarefa,
  progressoSubtarefas,
} from "./tarefas";

const corpo = [
  "Notas sobre a capa.",
  "",
  "- [ ] escolher as imagens",
  "- [x] revisar os textos",
  "  - [ ] conferir a legenda",
  "",
  "Outro parágrafo.",
].join("\n");

describe("lerSubtarefas", () => {
  it("acha as caixinhas e sabe quais estão marcadas", () => {
    const s = lerSubtarefas(corpo);
    expect(s).toHaveLength(3);
    expect(s[0]).toMatchObject({ feita: false, texto: "escolher as imagens" });
    expect(s[1]).toMatchObject({ feita: true, texto: "revisar os textos" });
    expect(s[2]).toMatchObject({ feita: false, texto: "conferir a legenda" });
  });

  it("aceita X maiúsculo e asterisco como marcador", () => {
    const s = lerSubtarefas("* [X] feita\n* [ ] aberta");
    expect(s[0].feita).toBe(true);
    expect(s[1].feita).toBe(false);
  });

  it("ignora lista comum sem caixinha", () => {
    expect(lerSubtarefas("- item solto\n- outro")).toEqual([]);
  });

  it("corpo vazio não quebra", () => {
    expect(lerSubtarefas("")).toEqual([]);
  });
});

describe("alternarSubtarefa", () => {
  it("marca e desmarca", () => {
    const marcado = alternarSubtarefa(corpo, 2);
    expect(lerSubtarefas(marcado)[0].feita).toBe(true);

    const desmarcado = alternarSubtarefa(marcado, 2);
    expect(lerSubtarefas(desmarcado)[0].feita).toBe(false);
  });

  it("preserva a indentação da subtarefa aninhada", () => {
    const r = alternarSubtarefa(corpo, 4);
    expect(r.split("\n")[4]).toBe("  - [x] conferir a legenda");
  });

  it("NUNCA mexe no resto do texto", () => {
    const r = alternarSubtarefa(corpo, 2);
    expect(r).toContain("Notas sobre a capa.");
    expect(r).toContain("Outro parágrafo.");
    expect(r.split("\n")).toHaveLength(corpo.split("\n").length);
  });

  it("linha que não é caixinha devolve o corpo intacto", () => {
    expect(alternarSubtarefa(corpo, 0)).toBe(corpo);
    expect(alternarSubtarefa(corpo, 999)).toBe(corpo);
  });
});

describe("adicionarSubtarefa", () => {
  it("insere depois da última caixinha, não no fim do texto", () => {
    const r = adicionarSubtarefa(corpo, "aprovar com o cliente");
    const linhas = r.split("\n");
    expect(linhas[5]).toContain("aprovar com o cliente");
    // o parágrafo final continua no fim
    expect(r.trimEnd().endsWith("Outro parágrafo.")).toBe(true);
  });

  it("cria a primeira caixinha quando não há nenhuma", () => {
    const r = adicionarSubtarefa("Só um texto.", "primeira");
    expect(r).toContain("Só um texto.");
    expect(lerSubtarefas(r)).toHaveLength(1);
  });

  it("funciona em corpo vazio", () => {
    expect(lerSubtarefas(adicionarSubtarefa("", "única"))).toHaveLength(1);
  });

  it("texto em branco não cria caixinha vazia", () => {
    expect(adicionarSubtarefa(corpo, "   ")).toBe(corpo);
  });
});

describe("removerSubtarefa", () => {
  it("remove só aquela linha", () => {
    const r = removerSubtarefa(corpo, 3);
    const s = lerSubtarefas(r);
    expect(s).toHaveLength(2);
    expect(s.map((x) => x.texto)).not.toContain("revisar os textos");
    expect(r).toContain("Outro parágrafo.");
  });

  it("linha que não é caixinha não remove nada", () => {
    expect(removerSubtarefa(corpo, 0)).toBe(corpo);
  });
});

describe("progressoSubtarefas", () => {
  it("conta feitas e total", () => {
    expect(progressoSubtarefas(corpo)).toEqual({
      feitas: 1,
      total: 3,
      porcento: 33,
    });
  });

  it("sem subtarefa nenhuma não divide por zero", () => {
    expect(progressoSubtarefas("texto puro")).toEqual({
      feitas: 0,
      total: 0,
      porcento: 0,
    });
  });

  it("todas feitas dá 100", () => {
    expect(progressoSubtarefas("- [x] a\n- [x] b").porcento).toBe(100);
  });
});
