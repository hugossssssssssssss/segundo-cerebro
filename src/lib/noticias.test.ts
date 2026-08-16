import { describe, it, expect, beforeEach } from "vitest";
import {
  CATEGORIAS_NOTICIAS,
  obterIdsCurtidos,
  alternarCurtidaNoticia,
  limparHtml,
  extrairImagemDoHtml,
} from "./noticias";

describe("Módulo de Notícias", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("deve conter as categorias básicas incluindo futebol", () => {
    const ids = CATEGORIAS_NOTICIAS.map((c) => c.id);
    expect(ids).toContain("futebol");
    expect(ids).toContain("design");
    expect(ids).toContain("tech");
    expect(ids).toContain("brasil");
    expect(ids).toContain("curiosidades");
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

  it("deve limpar HTML de descrições RSS", () => {
    const htmlSujeito = "<p>Texto da notícia com <a href='#'>link</a> e <img src='foto.jpg'/> &nbsp; teste &amp; teste</p>";
    const limpo = limparHtml(htmlSujeito);
    expect(limpo).toBe("Texto da notícia com link e teste & teste");
  });

  it("deve extrair URL da imagem do HTML da descrição", () => {
    const htmlComImg = '<div><p>Resumo</p><img src="https://exemplo.com/foto.jpg" alt="foto" /></div>';
    const imgUrl = extrairImagemDoHtml(htmlComImg);
    expect(imgUrl).toBe("https://exemplo.com/foto.jpg");
  });
});
