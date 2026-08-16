import { describe, it, expect, beforeEach } from "vitest";
import {
  CATEGORIAS_NOTICIAS,
  obterIdsCurtidos,
  alternarCurtidaNoticia,
  limparTexto,
  formatarHtmlEditorial,
  calcularTempoLeitura,
  obterModoExibicao,
  salvarModoExibicao,
  obterCategoriasAtivas,
  salvarCategoriasAtivas,
  obterFeedsCustomizados,
  adicionarFeedCustomizado,
  removerFeedCustomizado,
  obterImagemIlustrativa,
} from "./noticias";

describe("Módulo de Notícias & Revista (Reconstruído)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("deve conter as categorias padrão incluindo futebol", () => {
    const ids = CATEGORIAS_NOTICIAS.map((c) => c.id);
    expect(ids).toContain("futebol");
    expect(ids).toContain("design");
    expect(ids).toContain("tech");
    expect(ids).toContain("brasil");
    expect(ids).toContain("curiosidades");
  });

  it("deve calcular o tempo estimado de leitura", () => {
    const texto200Palavras = new Array(200).fill("palavra").join(" ");
    expect(calcularTempoLeitura(texto200Palavras)).toBeGreaterThanOrEqual(1);
  });

  it("deve gerenciar modo de exibição revista/cards/feed", () => {
    expect(obterModoExibicao()).toBe("revista");
    salvarModoExibicao("cards");
    expect(obterModoExibicao()).toBe("cards");
  });

  it("deve gerenciar categorias ativas configuradas pelo usuário", () => {
    expect(obterCategoriasAtivas()).toEqual(["futebol", "design", "tech", "brasil", "curiosidades"]);
    salvarCategoriasAtivas(["futebol", "tech"]);
    expect(obterCategoriasAtivas()).toEqual(["futebol", "tech"]);
  });

  it("deve retornar imagem ilustrativa para fallbacks", () => {
    const img = obterImagemIlustrativa("futebol");
    expect(img).toContain("images.unsplash.com");

    const imgCustom = obterImagemIlustrativa("design", "https://exemplo.com/foto.jpg");
    expect(imgCustom).toBe("https://exemplo.com/foto.jpg");
  });

  it("deve gerenciar curtidas e leituras no localStorage", () => {
    expect(obterIdsCurtidos()).toEqual([]);
    const c1 = alternarCurtidaNoticia("item-1");
    expect(c1).toBe(true);
    expect(obterIdsCurtidos()).toEqual(["item-1"]);

    const c2 = alternarCurtidaNoticia("item-1");
    expect(c2).toBe(false);
    expect(obterIdsCurtidos()).toEqual([]);
  });

  it("deve gerenciar inclusão e remoção de feeds customizados", () => {
    expect(obterFeedsCustomizados()).toEqual([]);
    const adic = adicionarFeedCustomizado("Meu Blog", "https://meublog.com/feed.xml", "design");
    expect(adic.length).toBe(1);
    expect(adic[0].nome).toBe("Meu Blog");

    const rem = removerFeedCustomizado(adic[0].id);
    expect(rem.length).toBe(0);
  });

  it("deve limpar ruídos HTML de RSS", () => {
    const limpo = limparTexto("<![CDATA[<p>Notícia com <a href='#'>link</a> &amp; imagem</p>]]>");
    expect(limpo).toBe("Notícia com link & imagem");
  });
});

// ── formatarHtmlEditorial ───────────────────────────────────────────────────
// Este HTML vem de feed RSS de terceiro e é injetado com dangerouslySetInnerHTML.
// A sanitização acontece por ÚLTIMO, depois das regex de estilo, para que a
// segurança não dependa de nenhuma dessas regex se comportar bem.
describe("formatarHtmlEditorial", () => {
  const casos: Array<[string, string]> = [
    ["svg com onload", '<svg onload="alert(1)"></svg>'],
    ["img com onerror", '<img src=x onerror="alert(1)">'],
    ["iframe sem fechamento", '<iframe src="javascript:alert(1)">'],
    ["script sem fechamento", '<script src="//evil.com/x.js">'],
    ["link javascript:", '<a href="javascript:alert(1)">clique</a>'],
    ["body com onload", '<body onload="alert(1)">texto</body>'],
    ["details com ontoggle", '<details open ontoggle="alert(1)">x</details>'],
    ["style com expression", '<style>body{background:url("javascript:alert(1)")}</style>'],
    ["form com action", '<form action="//evil.com"><input name="t"></form>'],
  ];

  for (const [nome, payload] of casos) {
    it(`neutraliza ${nome}`, () => {
      const saida = formatarHtmlEditorial(payload);
      expect(saida).not.toMatch(/onload=/i);
      expect(saida).not.toMatch(/onerror=/i);
      expect(saida).not.toMatch(/ontoggle=/i);
      expect(saida).not.toMatch(/javascript:/i);
      expect(saida).not.toMatch(/<script/i);
      expect(saida).not.toMatch(/<iframe/i);
      expect(saida).not.toMatch(/<style/i);
      expect(saida).not.toMatch(/<form/i);
    });
  }

  it("preserva o conteúdo legítimo e aplica as classes de estilo", () => {
    const saida = formatarHtmlEditorial("<p>Olá <strong>mundo</strong></p>");
    expect(saida).toContain("mundo");
    expect(saida).toContain("<strong>");
    expect(saida).toContain('class="mb-4');
  });

  it("usa o atributo 'class' e nunca 'className'", () => {
    const saida = formatarHtmlEditorial("<h2>Título</h2><p>corpo</p>");
    expect(saida).not.toContain("className");
    expect(saida).toContain("class=");
  });

  it("transforma texto puro em parágrafos", () => {
    const saida = formatarHtmlEditorial("primeiro\n\nsegundo");
    expect(saida).toContain("primeiro");
    expect(saida).toContain("segundo");
  });
});
