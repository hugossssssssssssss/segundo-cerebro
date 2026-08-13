import { describe, it, expect } from "vitest";
import { lerMarkdown } from "./markdown";
import {
  comoMeta,
  comoEntrega,
  resumir,
  paradas,
  semMeta,
  aConferir,
  idDoCaminho,
  type Meta,
  type Entrega,
} from "./pdi";

const emDias = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const meta = (over: Partial<Meta> = {}): Meta => ({
  bruto: {},
  caminho: "pdi/metas/dominio-tecnico.md",
  id: "dominio-tecnico",
  sha: "s",
  titulo: "Domínio técnico",
  status: "em-andamento",
  indicador: "",
  corpo: "",
  ...over,
});

const entrega = (over: Partial<Entrega> = {}): Entrega => ({
  bruto: {},
  caminho: "pdi/entregas/2026-08-01-x.md",
  id: "2026-08-01-x",
  sha: "s",
  titulo: "Entrega",
  data: "2026-08-01",
  metas: [],
  iaSugeriu: false,
  corpo: "",
  ...over,
});

describe("idDoCaminho", () => {
  it("extrai o nome do arquivo sem extensão", () => {
    expect(idDoCaminho("pdi/metas/dominio-tecnico.md")).toBe("dominio-tecnico");
  });
});

describe("comoMeta", () => {
  it("lê os campos", () => {
    const doc = lerMarkdown(
      "---\ntitulo: Branding\nstatus: em-andamento\nindicador: conduzir um projeto sozinho\nprazo: 2026-12-31\n---\n\nnotas",
    );
    const m = comoMeta(doc, "pdi/metas/branding.md", "s", "fb");
    expect(m.titulo).toBe("Branding");
    expect(m.status).toBe("em-andamento");
    expect(m.indicador).toBe("conduzir um projeto sozinho");
    expect(m.id).toBe("branding");
  });

  it("status inválido vira a-fazer em vez de quebrar", () => {
    const m = comoMeta(lerMarkdown("---\nstatus: xpto\n---\n\nx"), "p/a.md", "s", "t");
    expect(m.status).toBe("a-fazer");
  });
});

describe("comoEntrega", () => {
  it("lê a lista de metas ligadas", () => {
    const doc = lerMarkdown(
      "---\ntitulo: Campanha\ndata: 2026-08-10\nmetas: [branding, lideranca]\n---\n\nx",
    );
    const e = comoEntrega(doc, "pdi/entregas/2026-08-10-campanha.md", "s", "fb");
    expect(e.metas).toEqual(["branding", "lideranca"]);
    expect(e.data).toBe("2026-08-10");
  });

  it("aceita meta única escrita sem lista", () => {
    const doc = lerMarkdown("---\nmetas: branding\n---\n\nx");
    expect(comoEntrega(doc, "p/a.md", "s", "t").metas).toEqual(["branding"]);
  });

  it("marca o que a IA sugeriu", () => {
    const doc = lerMarkdown("---\nmetas: [x]\nia_sugeriu: true\n---\n\nx");
    expect(comoEntrega(doc, "p/a.md", "s", "t").iaSugeriu).toBe(true);
  });
});

describe("resumir", () => {
  it("agrupa entregas sob a meta certa", () => {
    const metas = [meta({ id: "a" }), meta({ id: "b", caminho: "pdi/metas/b.md" })];
    const entregas = [
      entrega({ id: "1", metas: ["a"] }),
      entrega({ id: "2", metas: ["a", "b"] }),
      entrega({ id: "3", metas: [] }),
    ];
    const r = resumir(metas, entregas);
    expect(r[0].entregas).toHaveLength(2);
    expect(r[1].entregas).toHaveLength(1);
  });

  it("calcula dias desde a última entrega", () => {
    const r = resumir(
      [meta({ id: "a" })],
      [entrega({ metas: ["a"], data: emDias(-10) })],
    );
    expect(r[0].diasSemMovimento).toBe(10);
  });

  it("meta sem entrega nenhuma não conta como parada", () => {
    const r = resumir([meta({ id: "a" })], []);
    expect(r[0].diasSemMovimento).toBeNull();
    expect(paradas(r)).toHaveLength(0);
  });
});

describe("paradas", () => {
  it("aponta meta sem movimento há mais de 30 dias", () => {
    const r = resumir(
      [meta({ id: "a" })],
      [entrega({ metas: ["a"], data: emDias(-45) })],
    );
    expect(paradas(r)).toHaveLength(1);
  });

  it("meta concluída nunca aparece como parada", () => {
    const r = resumir(
      [meta({ id: "a", status: "concluida" })],
      [entrega({ metas: ["a"], data: emDias(-200) })],
    );
    expect(paradas(r)).toHaveLength(0);
  });

  it("movimento recente não é parada", () => {
    const r = resumir(
      [meta({ id: "a" })],
      [entrega({ metas: ["a"], data: emDias(-5) })],
    );
    expect(paradas(r)).toHaveLength(0);
  });
});

describe("filas de revisão", () => {
  it("separa entregas sem meta e sugestões a conferir", () => {
    const lista = [
      entrega({ id: "1", metas: [] }),
      entrega({ id: "2", metas: ["a"] }),
      entrega({ id: "3", metas: ["a"], iaSugeriu: true }),
    ];
    expect(semMeta(lista).map((e) => e.id)).toEqual(["1"]);
    expect(aConferir(lista).map((e) => e.id)).toEqual(["3"]);
  });
});
