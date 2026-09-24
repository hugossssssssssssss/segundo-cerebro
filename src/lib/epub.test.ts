import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { GeradorEpub } from "./epub";

describe("GeradorEpub nativo", () => {
  it("deve inicializar com metadados padrão e permitir personalização", () => {
    const gerador = new GeradorEpub();
    gerador.init({
      title: "Minha Obra",
      author: "Hugo Designer",
      publisher: "Klaus Studio",
      description: "Livro sobre design e criatividade",
      tags: ["design", "arte"],
      i18n: "pt",
    });

    expect(gerador).toBeDefined();
  });

  it("deve adicionar capítulos e lidar com strings ou listas de parágrafos", () => {
    const gerador = new GeradorEpub();
    gerador.add("Capítulo 1", ["Parágrafo 1", "Parágrafo 2"]);
    gerador.add("Capítulo 2", "Linha A\nLinha B\nLinha C");

    expect(gerador).toBeDefined();
  });

  it("deve gerar um arquivo EPUB válido contendo a estrutura padrão", async () => {
    const gerador = new GeradorEpub();
    gerador.init({
      title: "Guia de Tipografia",
      author: "Hugo Silva",
      description: "Um guia prático sobre fontes & cores",
    });

    gerador.add("Introdução", [
      "Bem-vindo ao guia de tipografia.",
      "Caracteres especiais como & e <tag> e 100% devem ser preservados sem quebrar!",
    ]);

    gerador.add("Capítulo 1: Serifas", [
      "Fontes serifadas transmitem tradição e autoridade.",
    ]);

    const epubData = await gerador.generate("uint8array");
    expect(epubData).toBeDefined();

    // Inspeciona o arquivo EPUB gerado descompactando com JSZip
    const zip = await JSZip.loadAsync(epubData);

    // 1. mimetype
    const mimetype = await zip.file("mimetype")?.async("string");
    expect(mimetype).toBe("application/epub+zip");

    // 2. container.xml
    const container = await zip.file("META-INF/container.xml")?.async("string");
    expect(container).toContain("OEBPS/content.opf");

    // 3. content.opf
    const contentOpf = await zip.file("OEBPS/content.opf")?.async("string");
    expect(contentOpf).toContain("<dc:title>Guia de Tipografia</dc:title>");
    expect(contentOpf).toContain("<dc:creator>Hugo Silva</dc:creator>");
    expect(contentOpf).toContain("capitulo_1.xhtml");
    expect(contentOpf).toContain("capitulo_2.xhtml");

    // 4. toc.ncx e nav.xhtml
    const tocNcx = await zip.file("OEBPS/toc.ncx")?.async("string");
    expect(tocNcx).toContain("Introdução");
    expect(tocNcx).toContain("Capítulo 1: Serifas");

    const navXhtml = await zip.file("OEBPS/nav.xhtml")?.async("string");
    expect(navXhtml).toContain("Introdução");
    expect(navXhtml).toContain("Capítulo 1: Serifas");

    // 5. Capítulos
    const cap1 = await zip.file("OEBPS/capitulo_1.xhtml")?.async("string");
    expect(cap1).toContain("&amp;");
    expect(cap1).toContain("&lt;tag&gt;");
    expect(cap1).toContain("100%");
    expect(cap1).toContain("Introdução");

    // 6. Title page
    const titlePage = await zip.file("OEBPS/title.xhtml")?.async("string");
    expect(titlePage).toContain("Guia de Tipografia");
    expect(titlePage).toContain("Hugo Silva");
  });

  it("deve gerar Blob para download no navegador", async () => {
    const gerador = new GeradorEpub();
    gerador.init({ title: "Teste Blob" });
    gerador.add("Página 1", ["Conteúdo"]);

    const blob = (await gerador.generate("blob")) as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(500);
    expect(blob.type).toBe("application/epub+zip");
  });
});
