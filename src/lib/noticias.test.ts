import { describe, it, expect, beforeEach } from "vitest";
import {
  CATEGORIAS_NOTICIAS,
  obterIdsCurtidos,
  alternarCurtidaNoticia,
  limparTexto,
  obterModoExibicao,
  salvarModoExibicao,
  obterCategoriasAtivas,
  salvarCategoriasAtivas,
  obterImagemIlustrativa,
} from "./noticias";

describe("Módulo de Notícias (Refatorado)", () => {
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

  it("deve gerenciar preferências de modo de exibição (feed, carrossel, posts)", () => {
    expect(obterModoExibicao()).toBe("feed");
    salvarModoExibicao("carrossel");
    expect(obterModoExibicao()).toBe("carrossel");
    salvarModoExibicao("posts");
    expect(obterModoExibicao()).toBe("posts");
  });

  it("deve gerenciar seleção de categorias ativas do usuário", () => {
    expect(obterCategoriasAtivas()).toEqual(["futebol", "design", "tech", "brasil", "curiosidades"]);
    salvarCategoriasAtivas(["futebol", "design"]);
    expect(obterCategoriasAtivas()).toEqual(["futebol", "design"]);
  });

  it("deve retornar imagens ilustrativas válidas como fallback", () => {
    const imgFutebol = obterImagemIlustrativa("futebol");
    expect(imgFutebol).toContain("images.unsplash.com");

    const imgCustom = obterImagemIlustrativa("design", "https://exemplo.com/foto.jpg");
    expect(imgCustom).toBe("https://exemplo.com/foto.jpg");
  });

  it("deve gerenciar curtidas no localStorage", () => {
    expect(obterIdsCurtidos()).toEqual([]);
    const curtido1 = alternarCurtidaNoticia("noticia-1");
    expect(curtido1).toBe(true);
    expect(obterIdsCurtidos()).toEqual(["noticia-1"]);

    const curtido2 = alternarCurtidaNoticia("noticia-1");
    expect(curtido2).toBe(false);
    expect(obterIdsCurtidos()).toEqual([]);
  });

  it("deve limpar textos e resumos de marcas HTML", () => {
    const limpo = limparTexto("<p>Notícia em <b>destaque</b> com &nbsp; espaços &amp; teste</p>");
    expect(limpo).toBe("Notícia em destaque com espaços & teste");
  });
});
