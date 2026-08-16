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

describe("Módulo de Notícias (Integrações e Leitor)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("deve conter as 5 categorias padrão incluindo futebol", () => {
    const ids = CATEGORIAS_NOTICIAS.map((c) => c.id);
    expect(ids).toContain("futebol");
    expect(ids).toContain("design");
    expect(ids).toContain("tech");
    expect(ids).toContain("brasil");
    expect(ids).toContain("curiosidades");
  });

  it("deve gerenciar preferências de modo de exibição", () => {
    expect(obterModoExibicao()).toBe("feed");
    salvarModoExibicao("carrossel");
    expect(obterModoExibicao()).toBe("carrossel");
    salvarModoExibicao("posts");
    expect(obterModoExibicao()).toBe("posts");
  });

  it("deve gerenciar categorias ativas configuradas pelo usuário", () => {
    expect(obterCategoriasAtivas()).toEqual(["futebol", "design", "tech", "brasil", "curiosidades"]);
    salvarCategoriasAtivas(["futebol", "tech"]);
    expect(obterCategoriasAtivas()).toEqual(["futebol", "tech"]);
  });

  it("deve gerar imagem de fallback ilustrativa segura", () => {
    const imgFutebol = obterImagemIlustrativa("futebol");
    expect(imgFutebol).toContain("images.unsplash.com");

    const imgValida = obterImagemIlustrativa("design", "https://site.com/foto.jpg");
    expect(imgValida).toBe("https://site.com/foto.jpg");
  });

  it("deve alternar curtidas no localStorage", () => {
    expect(obterIdsCurtidos()).toEqual([]);
    const c1 = alternarCurtidaNoticia("n1");
    expect(c1).toBe(true);
    expect(obterIdsCurtidos()).toEqual(["n1"]);

    const c2 = alternarCurtidaNoticia("n1");
    expect(c2).toBe(false);
    expect(obterIdsCurtidos()).toEqual([]);
  });

  it("deve limpar código HTML de descrições", () => {
    const limpo = limparTexto("<div>Matéria com <a href='#'>link</a> &amp; imagem</div>");
    expect(limpo).toBe("Matéria com link & imagem");
  });
});
