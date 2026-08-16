import { describe, it, expect } from "vitest";
import { sanitizarHTML } from "./sanitizer";

describe("sanitizarHTML", () => {
  it("permite tags SVG e HTML inofensivas", () => {
    const input = '<div class="teste"><span>Olá <b>mundo</b></span></div>';
    expect(sanitizarHTML(input)).toBe(input);
  });

  it("remove tags <script> maliciosas", () => {
    const input = '<div><script>alert("hack")</script><p>seguro</p></div>';
    const resultado = sanitizarHTML(input);
    expect(resultado).not.toContain("<script>");
    expect(resultado).not.toContain("alert");
    expect(resultado).toContain("<p>seguro</p>");
  });

  it("remove atributos de evento inline on*", () => {
    const input = '<img src="foto.jpg" onload="alert(1)" onerror="alert(2)" />';
    const resultado = sanitizarHTML(input);
    expect(resultado).not.toContain("onload");
    expect(resultado).not.toContain("onerror");
    expect(resultado).toContain('src="foto.jpg"');
  });

  it("remove links javascript:", () => {
    const input = '<a href="javascript:alert(1)">Clique aqui</a>';
    const resultado = sanitizarHTML(input);
    expect(resultado).not.toContain("javascript:");
    expect(resultado).toContain("Clique aqui");
  });

  it("remove <iframe> e <embed>", () => {
    const input = '<iframe src="https://malicious.com"></iframe><embed src="test.swf"></embed>';
    const resultado = sanitizarHTML(input);
    expect(resultado).not.toContain("<iframe");
    expect(resultado).not.toContain("<embed");
  });

  it("remove vetores mXSS e eventos avançados (<svg onload>, <details ontoggle>)", () => {
    const input = '<svg onload=alert(1)><details ontoggle=alert(2)><summary>Click</summary></details></svg>';
    const resultado = sanitizarHTML(input);
    expect(resultado).not.toContain("onload");
    expect(resultado).not.toContain("ontoggle");
    expect(resultado).not.toContain("alert");
  });
});
