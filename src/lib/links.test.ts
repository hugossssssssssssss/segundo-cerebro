import { describe, it, expect } from "vitest";
import { lerMarkdown } from "./markdown";
import {
  montarIndice,
  extrairLinks,
  mencoesA,
  sugerir,
} from "./links";
import type { ItemRepo } from "./repo";

function item(caminho: string, texto: string): ItemRepo {
  return {
    caminho,
    nome: caminho.split("/").pop()!,
    sha: caminho,
    tamanho: texto.length,
    texto,
    doc: lerMarkdown(texto),
  };
}

const acervo: ItemRepo[] = [
  item(
    "notas/2026-05-01-briefing-acme.md",
    "---\ntitulo: Briefing Acme\n---\n\nCliente quer algo sóbrio.",
  ),
  item(
    "tarefas/2026-08-13-revisar-layout.md",
    "---\ntitulo: Revisar layout\ntipo: tarefa\n---\n\nBaseado no [[Briefing Acme]], ajustar a grade.",
  ),
  item(
    "pdi/entregas/2026-08-12-identidade.md",
    "---\ntitulo: Identidade Acme\ntipo: entrega\n---\n\nSaiu do [[Briefing Acme|briefing]] e usou a [[Grade suíça]].",
  ),
  item(
    "referencias/2026-07-02-grade-suica.md",
    "---\ntitulo: Grade suíça\ntipo: referencia\n---\n\nMüller-Brockmann.",
  ),
];

const indice = montarIndice(acervo);

describe("extrairLinks", () => {
  it("acha [[link]] e resolve o alvo pelo título", () => {
    const r = extrairLinks(acervo[1].texto, indice);
    expect(r).toHaveLength(1);
    expect(r[0].bruto).toBe("Briefing Acme");
    expect(r[0].alvo?.caminho).toBe("notas/2026-05-01-briefing-acme.md");
    expect(r[0].alvo?.tipo).toBe("nota");
  });

  it("suporta [[alvo|texto exibido]]", () => {
    const r = extrairLinks("veja o [[Briefing Acme|briefing]]", indice);
    expect(r[0].exibir).toBe("briefing");
    expect(r[0].alvo?.titulo).toBe("Briefing Acme");
  });

  it("ignora acento e caixa ao resolver", () => {
    expect(extrairLinks("[[grade suica]]", indice)[0].alvo?.titulo).toBe(
      "Grade suíça",
    );
    expect(extrairLinks("[[BRIEFING ACME]]", indice)[0].alvo).not.toBeNull();
  });

  it("link para item inexistente resolve como null, sem quebrar", () => {
    const r = extrairLinks("[[Não existe ainda]]", indice);
    expect(r[0].alvo).toBeNull();
    expect(r[0].exibir).toBe("Não existe ainda");
  });

  it("não repete o mesmo alvo citado duas vezes", () => {
    expect(extrairLinks("[[Grade suíça]] e de novo [[Grade suíça]]", indice)).toHaveLength(1);
  });

  it("texto sem link nenhum devolve lista vazia", () => {
    expect(extrairLinks("só texto comum", indice)).toEqual([]);
    expect(extrairLinks("[[]]", indice)).toEqual([]);
  });

  it("resolve também pelo nome do arquivo", () => {
    // é assim que a IA às vezes escreve
    expect(extrairLinks("[[2026-07-02-grade-suica]]", indice)[0].alvo).not.toBeNull();
  });

  /* ------------------------------------------------ menções escritas com @ */

  it("acha @Título e resolve o alvo", () => {
    const r = extrairLinks("Falar com @Briefing Acme amanhã.", indice);
    expect(r).toHaveLength(1);
    expect(r[0].bruto).toBe("Briefing Acme");
    expect(r[0].alvo?.caminho).toBe("notas/2026-05-01-briefing-acme.md");
  });

  it("acha @Título no fim da linha, sem pontuação", () => {
    expect(extrairLinks("ver @Grade suíça", indice)[0].alvo?.titulo).toBe("Grade suíça");
  });

  it("e-mail NÃO vira menção fantasma", () => {
    // o `@` de um e-mail vem grudado numa letra; sem essa guarda,
    // "h.hugosilvaz1@gmail.com" criava uma menção a "gmail" em toda nota
    expect(extrairLinks("Escreva para h.hugosilvaz1@gmail.com hoje.", indice)).toEqual([]);
    expect(extrairLinks("contato@empresa.com.br", indice)).toEqual([]);
  });

  it("arroba solta antes de número NÃO vira menção", () => {
    // "3 canetas @ 5 reais" criava uma menção a "5"
    expect(extrairLinks("comprei 3 canetas @ 5 reais.", indice)).toEqual([]);
    expect(extrairLinks("@ 10h na segunda.", indice)).toEqual([]);
  });

  it("os dois formatos convivem no mesmo texto", () => {
    const r = extrairLinks("De [[Grade suíça]] para @Briefing Acme.", indice);
    expect(r.map((x) => x.alvo?.titulo).sort()).toEqual(["Briefing Acme", "Grade suíça"]);
  });

  it("duas menções seguidas: NENHUMA pode sumir", () => {
    // era perda silenciosa: entre a primeira menção e o ponto final havia um
    // `@`, e a expressão nunca fechava — a primeira menção desaparecia
    const r = extrairLinks("De @Grade suíça para @Briefing Acme.", indice);
    expect(r.map((x) => x.alvo?.titulo).sort()).toEqual(["Briefing Acme", "Grade suíça"]);
  });

  it("menção antes de parêntese, aspas ou travessão continua sendo achada", () => {
    expect(extrairLinks("ver @Grade suíça (urgente)", indice)[0].alvo).not.toBeNull();
    expect(extrairLinks('ver @Grade suíça"', indice)[0].alvo).not.toBeNull();
    expect(extrairLinks("ver @Grade suíça — hoje", indice)[0].alvo).not.toBeNull();
  });

  it("menção no fim da linha não engole a linha seguinte", () => {
    // a quebra de linha não cabe num título; sem essa guarda a menção
    // capturava o parágrafo inteiro abaixo dela
    const r = extrairLinks("Ver @Grade suíça\nOutra coisa qualquer aqui", indice);
    expect(r).toHaveLength(1);
    expect(r[0].bruto).toBe("Grade suíça");
  });

  it("três menções numa linha só", () => {
    const r = extrairLinks("@Grade suíça e @Briefing Acme e @Grade suíça de novo.", indice);
    // a repetida não conta duas vezes
    expect(r.map((x) => x.alvo?.titulo).sort()).toEqual(["Briefing Acme", "Grade suíça"]);
  });
});

describe("mencoesA", () => {
  it("acha quem aponta para o item — a conexão aparecendo sozinha", () => {
    const m = mencoesA("notas/2026-05-01-briefing-acme.md", acervo, indice);
    expect(m.map((x) => x.titulo).sort()).toEqual([
      "Identidade Acme",
      "Revisar layout",
    ]);
  });

  it("cruza tipos diferentes: tarefa e entrega apontando para uma nota", () => {
    const m = mencoesA("notas/2026-05-01-briefing-acme.md", acervo, indice);
    expect(new Set(m.map((x) => x.tipo))).toEqual(new Set(["tarefa", "entrega"]));
  });

  it("traz um trecho com contexto da menção", () => {
    const m = mencoesA("referencias/2026-07-02-grade-suica.md", acervo, indice);
    expect(m[0].trecho).toContain("Grade suíça");
  });

  it("item sem ninguém apontando devolve lista vazia", () => {
    const m = mencoesA("tarefas/2026-08-13-revisar-layout.md", acervo, indice);
    expect(m).toEqual([]);
  });

  it("um item não menciona a si mesmo", () => {
    const proprio = item("notas/eu.md", "---\ntitulo: Eu\n---\n\nfalo de [[Eu]]");
    const idx = montarIndice([proprio]);
    expect(mencoesA("notas/eu.md", [proprio], idx)).toEqual([]);
  });
});

describe("sugerir", () => {
  it("sem termo, oferece opções para escolher", () => {
    expect(sugerir(indice, "").length).toBeGreaterThan(0);
  });

  it("filtra pelo que foi digitado", () => {
    const s = sugerir(indice, "grade");
    expect(s).toHaveLength(1);
    expect(s[0].titulo).toBe("Grade suíça");
  });

  it("quem começa com o termo vem antes de quem só contém", () => {
    const s = sugerir(indice, "acme");
    expect(s[0].titulo).toBe("Briefing Acme"); // não "Identidade Acme"
  });

  it("não repete o mesmo item por ter dois apelidos no índice", () => {
    const s = sugerir(indice, "");
    const caminhos = s.map((a) => a.caminho);
    expect(new Set(caminhos).size).toBe(caminhos.length);
  });
});

describe("título repetido", () => {
  const comData = (data: string, titulo: string): ItemRepo => {
    const texto = `---\ntitulo: ${titulo}\n---\n\nx`;
    return {
      caminho: `notas/${data}-x.md`,
      nome: `${data}-x.md`,
      sha: data,
      tamanho: texto.length,
      texto,
      doc: lerMarkdown(texto),
    };
  };

  it("o mais recente ganha o nome", () => {
    // a árvore do git chega em ordem crescente de caminho, então sem
    // ordenação explícita o mais ANTIGO vencia
    const idx = montarIndice([
      comData("2026-01-01", "Reunião"),
      comData("2026-08-13", "Reunião"),
    ]);
    expect(idx.get("reuniao")?.caminho).toBe("notas/2026-08-13-x.md");
  });

  it("a ordem de entrada não altera o resultado", () => {
    const antigo = comData("2026-01-01", "Reunião");
    const novo = comData("2026-08-13", "Reunião");
    expect(montarIndice([novo, antigo]).get("reuniao")?.caminho).toBe(
      montarIndice([antigo, novo]).get("reuniao")?.caminho,
    );
  });
});
