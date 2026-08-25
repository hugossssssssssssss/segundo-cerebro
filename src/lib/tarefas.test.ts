import { describe, it, expect, vi } from "vitest";
import { dataISO } from "./utils";
import { lerMarkdown } from "./markdown";
import {
  comoTarefa,
  ordenar,
  urgencia,
  registrarCiclo,
  minutosRegistrados,
  statusValido,
  extrairIntervaloTarefa,
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
/**
 * Data relativa a hoje, no fuso LOCAL.
 *
 * Usava toISOString() (UTC) e por isso os testes passavam de manhã e
 * falhavam depois das 21h no horário de Brasília — o mesmo bug que o
 * código de produção tinha. Teste que depende da hora não prova nada.
 */
const emDias = (n: number) => dataISO(new Date(Date.now() + n * 86_400_000));

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

describe("a data do pomodoro", () => {
  it("usa o dia LOCAL, não o UTC", () => {
    // às 22h em Brasília o UTC já virou: o ciclo era registrado em amanhã,
    // no arquivo, para sempre. O teste antigo só conferia os minutos, e foi
    // por isso que o bug sobreviveu a duas auditorias.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T22:30:00-03:00"));

    expect(registrarCiclo("", 25)).toContain("2026-08-13");
    expect(registrarCiclo("", 25)).not.toContain("2026-08-14");

    vi.useRealTimers();
  });

  it("registra o intervalo com a duração pedida", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T14:45:00-03:00"));
    expect(registrarCiclo("", 25)).toContain("14:20 → 14:45 (25min)");
    vi.useRealTimers();
  });

  it("garante duracao minima de 1 minuto em registrarCiclo", () => {
    expect(registrarCiclo("", 0)).toContain("(1min)");
    expect(registrarCiclo("", -10)).toContain("(1min)");
  });
});

describe("extrairIntervaloTarefa", () => {
  it("extrai data única normalmente", () => {
    const t = base({ prazo: "2026-08-20" });
    const res = extrairIntervaloTarefa(t);
    expect(res).not.toBeNull();
    expect(res?.ehIntervalo).toBe(false);
    expect(res?.textoFormatado).toBe("2026-08-20");
  });

  it("extrai intervalos com seta →", () => {
    const t = base({ prazo: "2026-08-20 → 2026-08-25" });
    const res = extrairIntervaloTarefa(t);
    expect(res).not.toBeNull();
    expect(res?.ehIntervalo).toBe(true);
    expect(res?.textoFormatado).toBe("2026-08-20 → 2026-08-25");
  });

  it("extrai intervalos com campos separados no frontmatter", () => {
    const t = base({
      prazo: "2026-08-28",
      bruto: { data_inicio: "2026-08-22" },
    });
    const res = extrairIntervaloTarefa(t);
    expect(res).not.toBeNull();
    expect(res?.ehIntervalo).toBe(true);
    expect(res?.textoFormatado).toBe("2026-08-22 → 2026-08-28");
  });
});

