import { describe, it, expect, vi, afterEach } from "vitest";
import {
  hojeISO,
  dataISO,
  diasAte,
  dataCurta,
  correspondeBusca,
  formatarCaminhoAmigavel,
  formatarTituloAmigavel,
  formatarAtalho,
  ehMac,
} from "./utils";
import { nomeLivre, nomeDeArquivo } from "./markdown";
import { dataDoNome } from "./pdi";

afterEach(() => vi.useRealTimers());

describe("datas no fuso local", () => {
  it("às 22h no horário de Brasília, hoje ainda é hoje", () => {
    // toISOString() daria 2026-08-14 aqui — era o bug: o app e o calendário
    // discordavam sobre que dia era, toda noite depois das 21h.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T22:30:00-03:00"));
    expect(hojeISO()).toBe("2026-08-13");
  });

  it("dataISO e hojeISO concordam sempre", () => {
    vi.useFakeTimers();
    for (const h of ["00:30", "12:00", "21:30", "23:59"]) {
      vi.setSystemTime(new Date(`2026-08-13T${h}:00-03:00`));
      expect(hojeISO()).toBe(dataISO(new Date()));
    }
  });

  it("nome de arquivo usa a data local, não UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T23:00:00-03:00"));
    expect(nomeDeArquivo("teste")).toMatch(/^2026-08-13-teste\.md$/);
  });

  it("diasAte conta em dias inteiros", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T15:00:00-03:00"));
    expect(diasAte("2026-08-13")).toBe(0);
    expect(diasAte("2026-08-14")).toBe(1);
    expect(diasAte("2026-08-10")).toBe(-3);
    expect(diasAte(undefined)).toBeNull();
    expect(diasAte("data-invalida")).toBeNull();
  });

  it("dataCurta não quebra com lixo", () => {
    expect(dataCurta("")).toBe("");
    expect(dataCurta("ade-visual")).toBe("ade-visual"); // devolve como veio
    expect(dataCurta("2026-08-13")).toContain("13");
  });
});

describe("dataDoNome", () => {
  it("lê a data do PREFIXO do nome do arquivo", () => {
    // O bug antigo usava slice(-13,-3), que pegava o FIM do nome e devolvia
    // pedaços do título como se fossem data.
    expect(dataDoNome("pdi/entregas/2026-08-13-identidade-visual.md")).toBe("2026-08-13");
    expect(dataDoNome("pdi/entregas/2026-08-13-x.md")).toBe("2026-08-13");
  });

  it("devolve vazio quando não há data, em vez de inventar", () => {
    expect(dataDoNome("pdi/entregas/sem-data.md")).toBe("");
  });
});

describe("nomeLivre", () => {
  it("dois itens com o mesmo título no mesmo dia não colidem", () => {
    const ocupados = new Set<string>();
    const a = nomeLivre("tarefas", "Reunião", ocupados);
    ocupados.add(a);
    const b = nomeLivre("tarefas", "Reunião", ocupados);
    ocupados.add(b);
    const c = nomeLivre("tarefas", "Reunião", ocupados);

    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(b).toMatch(/-2\.md$/);
    expect(c).toMatch(/-3\.md$/);
  });

  it("títulos só de símbolo também não colidem entre si", () => {
    const ocupados = new Set<string>();
    const a = nomeLivre("notas", "!!!", ocupados);
    ocupados.add(a);
    const b = nomeLivre("notas", "???", ocupados);
    expect(a).toContain("sem-titulo");
    expect(b).not.toBe(a);
  });

  it("primeiro nome não ganha sufixo à toa", () => {
    expect(nomeLivre("notas", "Única", [])).not.toMatch(/-2\.md$/);
  });
});

describe("correspondeBusca", () => {
  it("encontra trechos internos de palavras (ex: uinho em Huguinho)", () => {
    expect(correspondeBusca("Huguinho", "uinho")).toBe(true);
    expect(correspondeBusca("Huguinho (CEO)", "uinho")).toBe(true);
  });

  it("é insensível a acentos e maiúsculas", () => {
    expect(correspondeBusca("Reunião de alinhamento", "reuniao")).toBe(true);
    expect(correspondeBusca("Grade suíça", "SUICA")).toBe(true);
  });

  it("retorna true para termo de busca vazio ou nulo (mostra todos os itens)", () => {
    expect(correspondeBusca("Qualquer texto", "")).toBe(true);
    expect(correspondeBusca("Qualquer texto", "   ")).toBe(true);
    expect(correspondeBusca("Qualquer texto", null)).toBe(true);
    expect(correspondeBusca("Qualquer texto", undefined)).toBe(true);
    expect(correspondeBusca(null, "")).toBe(true);
  });

  it("retorna false quando não encontra", () => {
    expect(correspondeBusca("Huguinho", "marcelo")).toBe(false);
    expect(correspondeBusca(null, "teste")).toBe(false);
  });
});

describe("formatarCaminhoAmigavel e formatarTituloAmigavel", () => {
  it("formata caminhos técnicos em trilhas limpas", () => {
    expect(formatarCaminhoAmigavel("pdi/metas/2026-08-13-meta.md")).toBe("PDI › Metas");
    expect(formatarCaminhoAmigavel("notas/projetos/klaus.md")).toBe("Notas › Projetos");
    expect(formatarCaminhoAmigavel("tarefas/2026-08-13-fazer-capa.md")).toBe("Tarefas");
    expect(formatarCaminhoAmigavel("referencias/logos/identidade.md")).toBe("Referências › Logos");
  });

  it("limpa títulos técnicos com carimbos e extensões", () => {
    expect(formatarTituloAmigavel("", "2026-08-13-fazer-a-capa.md")).toBe("Fazer a capa");
    expect(formatarTituloAmigavel("2026-08-13-minha-tarefa.md")).toBe("Minha tarefa");
    expect(formatarTituloAmigavel("meu-projeto-klaus")).toBe("Meu projeto klaus");
    expect(formatarTituloAmigavel("Documento Principal")).toBe("Documento Principal");
  });
});

describe("ehMac e formatarAtalho", () => {
  it("ehMac retorna um booleano", () => {
    expect(typeof ehMac()).toBe("boolean");
  });

  it("formatarAtalho retorna vazio para entrada nula ou vazia", () => {
    expect(formatarAtalho("")).toBe("");
    expect(formatarAtalho(undefined)).toBe("");
  });

  it("formata atalhos corretamente de acordo com o ambiente", () => {
    const res = formatarAtalho("⌘K");
    expect(res === "⌘K" || res === "Ctrl+K").toBe(true);

    const resB = formatarAtalho("⌘B");
    expect(resB === "⌘B" || resB === "Ctrl+B").toBe(true);
  });
});

