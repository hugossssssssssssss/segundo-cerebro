import DOMPurify from "dompurify";

/**
 * Sanitizador de HTML / SVG seguro contra XSS usando DOMPurify.
 *
 * Previne injeções de script, mXSS e atributos perigosos (onload, onerror, javascript: URIs).
 */
export function sanitizarHTML(htmlCru: string): string {
  if (!htmlCru || typeof htmlCru !== "string") return "";

  return DOMPurify.sanitize(htmlCru, {
    USE_PROFILES: { html: true, svg: true },
    FORBID_TAGS: ["script", "iframe", "object", "embed", "link", "style", "meta", "base", "form"],
    FORBID_ATTR: ["on*", "action"],
  });
}
