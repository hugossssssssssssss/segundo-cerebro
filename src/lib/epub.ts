import JSZip from "jszip";

/**
 * Escapa caracteres reservados de XML/HTML
 */
export function escaparXml(texto: string): string {
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

export interface ImagemReferenciada {
  id: string;
  legenda?: string;
  posicao?: "inicio" | "fim";
}

export interface CapituloEpub {
  id: string;
  titulo: string;
  paragrafos: string[];
  imagens?: ImagemReferenciada[];
  ocultarTitulo?: boolean;
}

export interface ImagemArmazenada {
  id: string;
  arquivoNome: string;
  dados: Blob | Uint8Array;
  mimeType: string;
}

/**
 * Gerador de arquivos EPUB 100% puro e sem dependências externas de templates (sem EJS).
 * Produz EPUBs válidos e compatíveis com leitores modernos (Apple Books, Kindle, Kobo, Calibre).
 */
export class GeradorEpub {
  private metadados: MetadadosEpub;
  private capitulos: CapituloEpub[] = [];
  private imagens: Map<string, ImagemArmazenada> = new Map();
  private capaDados: { dados: Blob | Uint8Array; mimeType: string } | null = null;
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
   * Define a imagem da capa do livro (exibida na biblioteca do Kindle)
   */
  definirCapa(dados: Blob | Uint8Array, mimeType: string = "image/jpeg"): this {
    this.capaDados = { dados, mimeType };
    return this;
  }

  /**
   * Armazena uma imagem no pacote EPUB
   */
  adicionarImagem(id: string, dados: Blob | Uint8Array, mimeType: string = "image/jpeg"): string {
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    const arquivoNome = `${id}.${ext}`;
    this.imagens.set(id, { id, arquivoNome, dados, mimeType });
    return arquivoNome;
  }

  /**
   * Adiciona um capítulo ou página ao livro
   */
  add(
    titulo: string,
    conteudo: string | string[],
    opcoes?: {
      ocultarTitulo?: boolean;
      imagens?: ImagemReferenciada[];
    }
  ): this {
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
      imagens: opcoes?.imagens,
      ocultarTitulo: opcoes?.ocultarTitulo ?? false,
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

    // 3. Estilos CSS otimizados para leitura fluida no Kindle (Kindle Paperwhite, Oasis, Scribe e App)
    const cssContent = `
@charset "utf-8";
body {
  font-family: serif;
  line-height: 1.55;
  margin: 0;
  padding: 0;
  text-align: justify;
}
h1, h2, h3, h4 {
  text-align: left;
  line-height: 1.25;
  margin-top: 1.4em;
  margin-bottom: 0.6em;
  font-weight: 700;
  page-break-after: avoid;
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
  margin: 0.3em 0;
}
p {
  margin: 0 0 0.85em 0;
  line-height: 1.55;
  text-align: justify;
  text-justify: inter-word;
}
p.dialogo {
  text-indent: 0;
  margin-bottom: 0.7em;
  text-align: justify;
}
p.estrofe {
  margin: 1.2em 0 1.2em 1.5em;
  line-height: 1.45;
  text-align: left;
  font-style: italic;
}
p.separador-cena {
  text-align: center;
  margin: 1.8em auto;
  letter-spacing: 0.4em;
  font-size: 1.1em;
  text-indent: 0;
  color: #555;
}
.chapter-title {
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.3em;
  margin-bottom: 1em;
}
.figura {
  text-align: center;
  margin: 1.5em auto;
  page-break-inside: avoid;
}
.figura img {
  max-width: 100%;
  max-height: 85vh;
  height: auto;
  width: auto;
  margin: 0 auto;
  display: block;
}
.figura-legenda {
  font-size: 0.85em;
  color: #666;
  text-align: center;
  margin-top: 0.4em;
  font-style: italic;
}
`;
    zip.file("OEBPS/estilo.css", cssContent);

    // 4. Salva a Capa (se houver)
    let capaItemXml = "";
    let capaMetaXml = "";
    let capaSpineXml = "";
    let capaNavXml = "";
    let capaTocXml = "";

    if (this.capaDados) {
      const extCapa = this.capaDados.mimeType.includes("png") ? "png" : "jpg";
      const nomeCapa = `cover.${extCapa}`;
      zip.file(`OEBPS/${nomeCapa}`, this.capaDados.dados);

      capaItemXml = `    <item id="cover-image" href="${nomeCapa}" media-type="${this.capaDados.mimeType}" properties="cover-image"/>
    <item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>`;
      capaMetaXml = `    <meta name="cover" content="cover-image"/>`;
      capaSpineXml = `    <itemref idref="cover-page" linear="no"/>`;
      capaNavXml = `      <li><a href="cover.xhtml">Capa</a></li>`;
      capaTocXml = `    <navPoint id="navPoint-cover" playOrder="1">
      <navLabel><text>Capa</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>`;

      const coverPageHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Capa</title>
  <style type="text/css">
    @page { margin: 0; }
    body { margin: 0; padding: 0; text-align: center; background-color: #ffffff; }
    .cover-container { height: 100vh; display: flex; align-items: center; justify-content: center; }
    img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; }
  </style>
</head>
<body>
  <div class="cover-container">
    <img src="${nomeCapa}" alt="Capa do Livro"/>
  </div>
</body>
</html>`;
      zip.file("OEBPS/cover.xhtml", coverPageHtml);
    }

    // 5. Salva as imagens internas
    for (const img of this.imagens.values()) {
      zip.file(`OEBPS/images/${img.arquivoNome}`, img.dados);
    }

    // 6. Página de rosto (Title Page)
    const titlePageHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escaparXml(this.metadados.idioma)}">
<head>
  <title>${escaparXml(this.metadados.titulo)}</title>
  <link rel="stylesheet" type="text/css" href="estilo.css"/>
</head>
<body>
  <div style="text-align: center; margin-top: 15%;">
    <h1 class="title">${escaparXml(this.metadados.titulo)}</h1>
    <p class="meta"><strong>Autor:</strong> ${escaparXml(this.metadados.autor)}</p>
    <p class="meta"><strong>Publicador:</strong> ${escaparXml(this.metadados.editora)}</p>
    ${this.metadados.descricao ? `<p class="meta" style="margin-top: 1.5em; font-style: italic;">${escaparXml(this.metadados.descricao)}</p>` : ""}
  </div>
</body>
</html>`;
    zip.file("OEBPS/title.xhtml", titlePageHtml);

    // 7. Capítulos / Páginas de conteúdo
    this.capitulos.forEach((cap) => {
      // Monta blocos de imagens no início
      const imagensInicioHtml = (cap.imagens || [])
        .filter((img) => img.posicao !== "fim")
        .map((img) => {
          const dadosImg = this.imagens.get(img.id);
          if (!dadosImg) return "";
          return `<div class="figura"><img src="images/${dadosImg.arquivoNome}" alt="Ilustração"/>${img.legenda ? `<p class="figura-legenda">${escaparXml(img.legenda)}</p>` : ""}</div>`;
        })
        .join("\n    ");

      // Monta parágrafos com suporte a diálogos, versos de estrofes e separadores de cena
      const paragrafosHtml = cap.paragrafos
        .map((p) => {
          const pLimpo = p.trim();
          if (/^(\*\s*){2,}\*?$|^[*•·~—–-]{2,}$/.test(pLimpo)) {
            return `<p class="separador-cena">${escaparXml(pLimpo)}</p>`;
          }
          if (pLimpo.includes("\n")) {
            const versos = pLimpo
              .split("\n")
              .map((v) => escaparXml(v.trim()))
              .join("<br/>\n      ");
            return `<p class="estrofe">${versos}</p>`;
          }
          const ehDialogo = /^[\u2014\u2013\u2015\-]/.test(pLimpo);
          if (ehDialogo) {
            return `<p class="dialogo">${escaparXml(pLimpo)}</p>`;
          }
          return `<p>${escaparXml(pLimpo)}</p>`;
        })
        .join("\n    ");

      // Monta blocos de imagens no fim
      const imagensFimHtml = (cap.imagens || [])
        .filter((img) => img.posicao === "fim")
        .map((img) => {
          const dadosImg = this.imagens.get(img.id);
          if (!dadosImg) return "";
          return `<div class="figura"><img src="images/${dadosImg.arquivoNome}" alt="Ilustração"/>${img.legenda ? `<p class="figura-legenda">${escaparXml(img.legenda)}</p>` : ""}</div>`;
        })
        .join("\n    ");

      // IMPORTANTE: se ocultarTitulo for true, NÃO renderiza o <h2> no topo do texto!
      const tituloHtml = cap.ocultarTitulo
        ? ""
        : `<h2 class="chapter-title">${escaparXml(cap.titulo)}</h2>\n    `;

      const capituloHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escaparXml(this.metadados.idioma)}">
<head>
  <title>${escaparXml(cap.titulo)}</title>
  <link rel="stylesheet" type="text/css" href="estilo.css"/>
</head>
<body>
  <section>
    ${tituloHtml}${imagensInicioHtml}
    ${paragrafosHtml}
    ${imagensFimHtml}
  </section>
</body>
</html>`;
      zip.file(`OEBPS/${cap.id}.xhtml`, capituloHtml);
    });

    // 8. Tabela de Conteúdos EPUB 3 (nav.xhtml)
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
${capaNavXml}
      <li><a href="title.xhtml">Início</a></li>
${navItemsHtml}
    </ol>
  </nav>
</body>
</html>`;
    zip.file("OEBPS/nav.xhtml", navXhtml);

    // 9. Tabela de Conteúdos Legada EPUB 2 (toc.ncx para compatibilidade máxima Kindle/Mobi)
    let ordemPlay = this.capaDados ? 2 : 1;
    const navPointsXml = this.capitulos
      .map((cap) => {
        ordemPlay++;
        return `    <navPoint id="navPoint-${ordemPlay}" playOrder="${ordemPlay}">
      <navLabel><text>${escaparXml(cap.titulo)}</text></navLabel>
      <content src="${cap.id}.xhtml"/>
    </navPoint>`;
      })
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
${capaTocXml}
    <navPoint id="navPoint-title" playOrder="${this.capaDados ? 2 : 1}">
      <navLabel><text>Início</text></navLabel>
      <content src="title.xhtml"/>
    </navPoint>
${navPointsXml}
  </navMap>
</ncx>`;
    zip.file("OEBPS/toc.ncx", tocNcx);

    // 10. Manifesto content.opf
    const manifestItemsCapitulos = this.capitulos
      .map((cap) => `    <item id="${cap.id}" href="${cap.id}.xhtml" media-type="application/xhtml+xml"/>`)
      .join("\n");

    const manifestItemsImagens = Array.from(this.imagens.values())
      .map((img) => `    <item id="img-${img.id}" href="images/${img.arquivoNome}" media-type="${img.mimeType}"/>`)
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
${capaMetaXml}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="estilo.css" media-type="text/css"/>
    <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>
${capaItemXml}
${manifestItemsCapitulos}
${manifestItemsImagens}
  </manifest>
  <spine toc="ncx">
${capaSpineXml}
    <itemref idref="title"/>
${spineItems}
  </spine>
</package>`;
    zip.file("OEBPS/content.opf", contentOpf);

    // 11. Gera o pacote final com compressão
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

export default GeradorEpub;
