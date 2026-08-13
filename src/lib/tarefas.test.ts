import { describe, it, expect } from "vitest";
import { lerMarkdown } from "./markdown";
import {
  comoTarefa,
  ordenar,
  urgencia,
  registrarCiclo,
  minutosRegistrados,
  statusValido,
  type Tarefa,
} from "./tarefas";

const base = (over: Partial<Tarefa> = {}): Tarefa => ({
  bruto: {},
  caminho: "tarefas/x.md",
  sha: "abc",
  titulo: "Tarefa",
  status: "a-fazer",
  tags: [],
  corpo: "",
  ...over,
});

/** Data relativa a hoje, para os testes não quebrarem com o tempo. */
const emDias = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

describe("comoTarefa", () => {
  it("lê os campos do frontmatter", () => {
    const doc = lerMarkdown(
      "---\ntitulo: Apresentação\nstatus: fazendo\nprazo: 2026-08-20\ntags: [design]\n---\n\nnotas",
    );
    const t = comoTarefa(doc, "tarefas/a.md", "sha1", "fallback");
    expect(t.titulo).toBe("Apresentação");
    expect(t.status).toBe("fazendo");
    expect(t.prazo).toBe("2026-08-20");
    expect(t.tags).toEqual(["design"]);
  });

  it("usa padrões quando o arquivo não tem frontmatter", () => {
    const t = comoTarefa(lerMarkdown("só texto"), "tarefas/a.md", "s", "Do nome");
    expect(t.titulo).toBe("Do nome");
    expect(t.status).toBe("a-fazer");
    expect(t.prazo).toBeUndefined();
  });

  it("ignora status inventado em vez de quebrar", () => {
    const doc = lerMarkdown("---\nstatus: qualquer-coisa\n---\n\nx");
    expect(comoTarefa(doc, "p", "s", "t").status).toBe("a-fazer");
    expect(statusValido("feito")).toBe("feito");
  });
});

describe("ordenar", () => {
  it("põe atrasadas primeiro e concluídas por último", () => {
    const lista = [
      base({ titulo: "feita", status: "feito", prazo: emDias(-9) }),
      base({ titulo: "sem prazo" }),
      base({ titulo: "futura", prazo: emDias(5) }),
      base({ titulo: "atrasada", prazo: emDias(-2) }),
    ];
    expect(ordenar(lista).map((t) => t.titulo)).toEqual([
      "atrasada",
      "futura",
      "sem prazo",
      "feita",
    ]);
  });
});

describe("urgencia", () => {
  it("classifica pelo prazo", () => {
    expect(urgencia(base({ prazo: emDias(-1) }))).toBe("atrasada");
    expect(urgencia(base({ prazo: emDias(0) }))).toBe("hoje");
    expect(urgencia(base({ prazo: emDias(2) }))).toBe("proxima");
    expect(urgencia(base({ prazo: emDias(30) }))).toBe("tranquila");
    expect(urgencia(base())).toBe("nenhuma");
  });

  it("tarefa concluída nunca aparece como atrasada", () => {
    expect(urgencia(base({ status: "feito", prazo: emDias(-30) }))).toBe("nenhuma");
  });
});

describe("pomodoro", () => {
  it("cria a seção Tempo na primeira vez", () => {
    const corpo = registrarCiclo("Minhas notas", 25);
    expect(corpo).toContain("Minhas notas");
    expect(corpo).toContain("## Tempo");
    expect(corpo).toMatch(/\(25min\)/);
  });

  it("acumula ciclos sem duplicar o cabeçalho", () => {
    let corpo = registrarCiclo("", 25);
    corpo = registrarCiclo(corpo, 25);
    corpo = registrarCiclo(corpo, 15);
    expect(corpo.match(/## Tempo/g)).toHaveLength(1);
    expect(minutosRegistrados(corpo)).toBe(65);
  });

  it("nunca apaga o que já estava escrito", () => {
    const corpo = registrarCiclo("texto importante do usuário", 25);
    expect(corpo).toContain("texto importante do usuário");
  });

  it("conta zero quando não há registro", () => {
    expect(minutosRegistrados("nenhum ciclo aqui")).toBe(0);
  });
});
