import { describe, it, expect } from "vitest";
import { extrairAcoes, descrever } from "./acoes";

describe("extrairAcoes", () => {
  it("separa a conversa do bloco de ações", () => {
    const resposta = [
      "Vou criar essa tarefa para sexta.",
      "```acoes",
      '[{"tipo":"criar","pasta":"tarefas","titulo":"Revisar proposta"}]',
      "```",
    ].join("\n");

    const { texto, acoes } = extrairAcoes(resposta);
    expect(texto).toBe("Vou criar essa tarefa para sexta.");
    expect(acoes).toHaveLength(1);
    expect(acoes[0].titulo).toBe("Revisar proposta");
  });

  it("resposta sem bloco nenhum não gera ação", () => {
    const { texto, acoes } = extrairAcoes("Só uma conversa normal.");
    expect(texto).toBe("Só uma conversa normal.");
    expect(acoes).toEqual([]);
  });

  it("JSON quebrado não derruba a conversa", () => {
    const { texto, acoes } = extrairAcoes("Olha só\n```acoes\n[{quebrado\n```");
    expect(acoes).toEqual([]);
    expect(texto).toContain("Olha só");
  });

  it("aceita um objeto solto, não só lista", () => {
    const { acoes } = extrairAcoes(
      '```acoes\n{"tipo":"criar","pasta":"notas","titulo":"X"}\n```',
    );
    expect(acoes).toHaveLength(1);
  });
});

describe("validação — a IA não pode escrever onde quiser", () => {
  const extrair = (json: string) => extrairAcoes("```acoes\n" + json + "\n```").acoes;

  it("recusa pasta fora da lista conhecida", () => {
    expect(extrair('[{"tipo":"criar","pasta":"etc","titulo":"X"}]')).toEqual([]);
    expect(extrair('[{"tipo":"criar","pasta":".github","titulo":"X"}]')).toEqual([]);
  });

  it("recusa caminho tentando subir de diretório", () => {
    expect(
      extrair('[{"tipo":"apagar","caminho":"tarefas/../../.git/config.md"}]'),
    ).toEqual([]);
  });

  it("recusa caminho fora das pastas de conteúdo", () => {
    expect(extrair('[{"tipo":"apagar","caminho":"AGENTS.md"}]')).toEqual([]);
    expect(extrair('[{"tipo":"editar","caminho":"README.md"}]')).toEqual([]);
  });

  it("recusa criar sem título", () => {
    expect(extrair('[{"tipo":"criar","pasta":"tarefas","titulo":"  "}]')).toEqual([]);
    expect(extrair('[{"tipo":"criar","pasta":"tarefas"}]')).toEqual([]);
  });

  it("recusa tipo de ação inventado", () => {
    expect(extrair('[{"tipo":"executar","caminho":"tarefas/x.md"}]')).toEqual([]);
  });

  it("aceita as pastas válidas, inclusive as de dois níveis", () => {
    expect(extrair('[{"tipo":"criar","pasta":"pdi/metas","titulo":"Meta"}]')).toHaveLength(1);
    expect(
      extrair('[{"tipo":"editar","caminho":"pdi/entregas/2026-08-13-x.md"}]'),
    ).toHaveLength(1);
  });

  it("descarta só a ação inválida, mantendo as boas", () => {
    const acoes = extrair(
      '[{"tipo":"criar","pasta":"tarefas","titulo":"Boa"},{"tipo":"apagar","caminho":"/etc/passwd"}]',
    );
    expect(acoes).toHaveLength(1);
    expect(acoes[0].titulo).toBe("Boa");
  });
});

describe("descrever", () => {
  it("diz em português o que vai acontecer", () => {
    expect(descrever({ tipo: "criar", pasta: "tarefas", titulo: "Ligar" })).toBe(
      'Criar a tarefa "Ligar"',
    );
    expect(
      descrever({ tipo: "apagar", caminho: "notas/2026-08-13-velha.md" }),
    ).toBe('Apagar "2026-08-13-velha"');
    expect(
      descrever({ tipo: "editar", caminho: "pdi/metas/branding.md" }),
    ).toBe('Editar "branding"');
  });

  it("cada pasta tem seu rótulo", () => {
    expect(descrever({ tipo: "criar", pasta: "pdi/metas", titulo: "X" })).toContain(
      "a meta",
    );
    expect(
      descrever({ tipo: "criar", pasta: "referencias", titulo: "X" }),
    ).toContain("a referência");
  });
});
