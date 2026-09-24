import JSZip from "jszip";

/**
 * Escapa caracteres reservados de XML/HTML
 */
function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface MetadadosEpub {
  titulo: string;
  autor: string;
  editora: string;
  idioma: string;
  descricao: string;
  tags: string[];
  dataCriacao: string;
}

export interface CapituloEpub {
  id: string;
  titulo: string;
  paragrafos: string[];
}

/**
 * Gerador de arquivos EPUB 100% puro e sem dependências externas de templates (sem EJS).
 * Produz EPUBs válidos e compatíveis com leitores modernos (Apple Books, Kindle, Kobo, Calibre).
 */
export class GeradorEpub {
  private metadados: MetadadosEpub;
  private capitulos: CapituloEpub[] = [];
  private uuid: string;

  constructor() {
    this.uuid =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `urn:uuid:klaus-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    this.metadados = {
      titulo: "Documento Klaus",
      autor: "Autor Desconhecido",
      editora: "Klaus",
      idioma: "pt",
      descricao: "",
      tags: ["klaus", "epub"],
      dataCriacao: new Date().toISOString().split("T")[0],
    };
  }

  /**
   * Configura os metadados do livro
   */
  init(detalhes: {
    title?: string;
    author?: string;
    publisher?: string;
    description?: string;
    tags?: string[];
    i18n?: string;
  }): this {
    if (detalhes.title?.trim()) this.metadados.titulo = detalhes.title.trim();
    if (detalhes.author?.trim()) this.metadados.autor = detalhes.author.trim();
    if (detalhes.publisher?.trim()) this.metadados.editora = detalhes.publisher.trim();
    if (detalhes.description?.trim()) this.metadados.descricao = detalhes.description.trim();
    if (detalhes.tags && Array.isArray(detalhes.tags)) this.metadados.tags = detalhes.tags;
    if (detalhes.i18n?.trim()) this.metadados.idioma = detalhes.i18n.trim();
    return this;
  }

  /**
   * Adiciona um capítulo ou página ao livro
   */
  add(titulo: string, conteudo: string | string[]): this {
    const id = `capitulo_${this.capitulos.length + 1}`;
    let paragrafos: string[] = [];

    if (Array.isArray(conteudo)) {
      paragrafos = conteudo
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    } else if (typeof conteudo === "string") {
      paragrafos = conteudo
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    }

    this.capitulos.push({
      id,
      titulo: titulo.trim() || `Capítulo ${this.capitulos.length + 1}`,
      paragrafos,
    });

    return this;
  }

  /**
   * Gera o arquivo EPUB como Blob ou Uint8Array
   */
  async generate(formato?: "blob"): Promise<Blob>;
  async generate(formato: "uint8array"): Promise<Uint8Array>;
  async generate(formato: "blob" | "uint8array" = "blob"): Promise<Blob | Uint8Array> {
    const zip = new JSZip();

    // 1. mimetype: obrigatório ser o primeiro arquivo e NÃO comprimido
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    // 2. META-INF/container.xml
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    zip.file("META-INF/container.xml", containerXml);

    // 3. Estilos CSS limpos e compatíveis com tema claro/escuro
    const cssContent = `
@charset "utf-8";
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  margin: 5% 8%;
  padding: 0;
  text-align: justify;
}
h1, h2, h3 {
  text-align: left;
  line-height: 1.25;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 700;
}
h1.title {
  text-align: center;
  margin-top: 2em;
  font-size: 2em;
}
p.meta {
  text-align: center;
  color: #666;
  font-size: 0.9em;
  margin: 0.25em 0;
}
p {
  margin: 0 0 1em 0;
  text-indent: 1.2em;
}
p.first {
  text-indent: 0;
}
.chapter-title {
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.3em;
  margin-bottom: 1.2em;
}
`;
    zip.file("OEBPS/estilo.css", cssContent);

    // 4. Página de rosto (Title Page)
    const titlePageHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escaparXml(this.metadados.idioma)}">
<head>
  <title>${escaparXml(this.metadados.titulo)}</title>
  <link rel="stylesheet" type="text/css" href="estilo.css"/>
</head>
<body>
  <div style="text-align: center; margin-top: 20%;">
    <h1 class="title">${escaparXml(this.metadados.titulo)}</h1>
    <p class="meta"><strong>Autor:</strong> ${escaparXml(this.metadados.autor)}</p>
    <p class="meta"><strong>Publicador:</strong> ${escaparXml(this.metadados.editora)}</p>
    ${this.metadados.descricao ? `<p class="meta" style="margin-top: 1.5em; font-style: italic;">${escaparXml(this.metadados.descricao)}</p>` : ""}
  </div>
</body>
</html>`;
    zip.file("OEBPS/title.xhtml", titlePageHtml);

    // 5. Capítulos / Páginas de conteúdo
    this.capitulos.forEach((cap) => {
      const paragrafosHtml = cap.paragrafos
        .map((p, pIdx) => `<p${pIdx === 0 ? ' class="first"' : ""}>${escaparXml(p)}</p>`)
        .join("\n    ");

      const capituloHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escaparXml(this.metadados.idioma)}">
<head>
  <title>${escaparXml(cap.titulo)}</title>
  <link rel="stylesheet" type="text/css" href="estilo.css"/>
</head>
<body>
  <section>
    <h2 class="chapter-title">${escaparXml(cap.titulo)}</h2>
    ${paragrafosHtml || '<p class="first"><em>Página sem conteúdo de texto legível.</em></p>'}
  </section>
</body>
</html>`;
      zip.file(`OEBPS/${cap.id}.xhtml`, capituloHtml);
    });

    // 6. Tabela de Conteúdos EPUB 3 (nav.xhtml)
    const navItemsHtml = this.capitulos
      .map((cap) => `      <li><a href="${cap.id}.xhtml">${escaparXml(cap.titulo)}</a></li>`)
      .join("\n");

    const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escaparXml(this.metadados.idioma)}">
<head>
  <title>Índice</title>
  <link rel="stylesheet" type="text/css" href="estilo.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h2>Índice</h2>
    <ol>
      <li><a href="title.xhtml">Início</a></li>
${navItemsHtml}
    </ol>
  </nav>
</body>
</html>`;
    zip.file("OEBPS/nav.xhtml", navXhtml);

    // 7. Tabela de Conteúdos Legada EPUB 2 (toc.ncx para compatibilidade máxima)
    const navPointsXml = this.capitulos
      .map((cap, idx) => `    <navPoint id="navPoint-${idx + 2}" playOrder="${idx + 2}">
      <navLabel><text>${escaparXml(cap.titulo)}</text></navLabel>
      <content src="${cap.id}.xhtml"/>
    </navPoint>`)
      .join("\n");

    const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escaparXml(this.uuid)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escaparXml(this.metadados.titulo)}</text></docTitle>
  <docAuthor><text>${escaparXml(this.metadados.autor)}</text></docAuthor>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>Início</text></navLabel>
      <content src="title.xhtml"/>
    </navPoint>
${navPointsXml}
  </navMap>
</ncx>`;
    zip.file("OEBPS/toc.ncx", tocNcx);

    // 8. Manifesto content.opf (central do EPUB)
    const manifestItems = this.capitulos
      .map((cap) => `    <item id="${cap.id}" href="${cap.id}.xhtml" media-type="application/xhtml+xml"/>`)
      .join("\n");

    const spineItems = this.capitulos
      .map((cap) => `    <itemref idref="${cap.id}"/>`)
      .join("\n");

    const tagsXml = this.metadados.tags
      .map((t) => `    <dc:subject>${escaparXml(t)}</dc:subject>`)
      .join("\n");

    const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId">${escaparXml(this.uuid)}</dc:identifier>
    <dc:title>${escaparXml(this.metadados.titulo)}</dc:title>
    <dc:language>${escaparXml(this.metadados.idioma)}</dc:language>
    <dc:creator>${escaparXml(this.metadados.autor)}</dc:creator>
    <dc:publisher>${escaparXml(this.metadados.editora)}</dc:publisher>
    <dc:date>${escaparXml(this.metadados.dataCriacao)}</dc:date>
    ${this.metadados.descricao ? `<dc:description>${escaparXml(this.metadados.descricao)}</dc:description>` : ""}
${tagsXml}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="estilo.css" media-type="text/css"/>
    <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
    <itemref idref="title"/>
${spineItems}
  </spine>
</package>`;
    zip.file("OEBPS/content.opf", contentOpf);

    // Gera o pacote final com compressão
    if (formato === "uint8array") {
      return await zip.generateAsync({
        type: "uint8array",
        mimeType: "application/epub+zip",
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
      });
    }

    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/epub+zip",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });
  }
}

// Compatibilidade de interface com jEpub
export default GeradorEpub;
