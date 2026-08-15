/**
 * Sanitizador de HTML / SVG seguro e leve contra XSS.
 *
 * Remove elementos perigosos (<script>, <iframe>, <object>, <embed>, <link>, etc.)
 * e atributos de eventos Inline (onload=, onerror=, onclick=, etc.) ou URIs com javascript:.
 */

const TAGS_PROIBIDAS = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "link",
  "style",
  "meta",
  "base",
  "form",
]);

/**
 * Sanitiza uma string HTML/SVG removendo elementos e atributos inseguros usando o DOMParser nativo.
 */
export function sanitizarHTML(htmlCru: string): string {
  if (!htmlCru || typeof htmlCru !== "string") return "";

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlCru, "text/html");

    const limparNo = (no: Node) => {
      if (no.nodeType === Node.ELEMENT_NODE) {
        const el = no as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (TAGS_PROIBIDAS.has(tag)) {
          el.remove();
          return;
        }

        // Remove atributos de evento (on*) e javascript: URIs
        const attrs = Array.from(el.attributes);
        for (const attr of attrs) {
          const nomeAttr = attr.name.toLowerCase();
          const valAttr = attr.value.toLowerCase().trim();

          if (nomeAttr.startsWith("on")) {
            el.removeAttribute(attr.name);
          } else if (
            (nomeAttr === "href" || nomeAttr === "src" || nomeAttr === "xlink:href" || nomeAttr === "action") &&
            valAttr.startsWith("javascript:")
          ) {
            el.removeAttribute(attr.name);
          }
        }
      }

      let filho = no.firstChild;
      while (filho) {
        const proximo = filho.nextSibling;
        limparNo(filho);
        filho = proximo;
      }
    };

    Array.from(doc.body.childNodes).forEach((child) => limparNo(child));
    return doc.body.innerHTML;
  } catch {
    // Se falhar o parser, retorna texto escapado
    return htmlCru.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
