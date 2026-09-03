import { describe, it, expect } from "vitest";
import {
  converterHtmlParaMarkdownClipboard,
  ehHtmlFormatadoRelevante,
} from "./pasteHtmlParaMarkdown";

describe("pasteHtmlParaMarkdown", () => {
  it("converte elementos básicos de texto, títulos e estilos", () => {
    const html = `
      <h1>Título Principal</h1>
      <p>Este é um <strong>texto em negrito</strong> e <em>itálico</em> com <code>código inline</code>.</p>
      <h2>Subtítulo</h2>
      <p>Um <del>texto riscado</del> com uma citação:</p>
      <blockquote>Esta é uma citação importante.</blockquote>
    `;

    const md = converterHtmlParaMarkdownClipboard(html);
    expect(md).toContain("# Título Principal");
    expect(md).toContain("## Subtítulo");
    expect(md).toContain("**texto em negrito**");
    expect(md).toContain("*itálico*");
    expect(md).toContain("`código inline`");
    expect(md).toContain("~~texto riscado~~");
    expect(md).toContain("> Esta é uma citação importante.");
  });

  it("converte listas ordenadas e não-ordenadas", () => {
    const html = `
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
      <ol>
        <li>Passo A</li>
        <li>Passo B</li>
      </ol>
    `;

    const md = converterHtmlParaMarkdownClipboard(html);
    expect(md).toContain("- Item 1");
    expect(md).toContain("- Item 2");
    expect(md).toContain("1. Passo A");
    expect(md).toContain("2. Passo B");
  });

  it("converte links e imagens, tornando URLs relativas absolutas quando apropriado", () => {
    const html = `
      <p>Veja mais na <a href="/wiki/Albert_Einstein">Wikipedia de Einstein</a> ou no <a href="//google.com">Google</a>.</p>
      <p><img src="//upload.wikimedia.org/foto.jpg" alt="Foto Histórica" /></p>
    `;

    const md = converterHtmlParaMarkdownClipboard(html);
    expect(md).toContain("[Wikipedia de Einstein](https://pt.wikipedia.org/wiki/Albert_Einstein)");
    expect(md).toContain("[Google](https://google.com)");
    expect(md).toContain("![Foto Histórica](https://upload.wikimedia.org/foto.jpg)");
  });

  it("remove ruídos típicos da Wikipedia como referências e botões de editar", () => {
    const html = `
      <h2>História<span class="mw-editsection"><a href="#">editar</a></span></h2>
      <p>A teoria da relatividade foi proposta em 1905<sup class="reference"><a href="#cite_note-1">[1]</a></sup> por Einstein.</p>
    `;

    const md = converterHtmlParaMarkdownClipboard(html);
    expect(md).toContain("## História");
    expect(md).not.toContain("editar");
    expect(md).not.toContain("[1]");
    expect(md).toContain("A teoria da relatividade foi proposta em 1905 por Einstein.");
  });

  it("converte tabelas HTML padrão em sintaxe GFM", () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Cargo</th>
            <th>Idade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Hugo</td>
            <td>Designer</td>
            <td>28</td>
          </tr>
          <tr>
            <td>Klaus</td>
            <td>IA</td>
            <td>1</td>
          </tr>
        </tbody>
      </table>
    `;

    const md = converterHtmlParaMarkdownClipboard(html);
    expect(md).toContain("| Nome | Cargo | Idade |");
    expect(md).toContain("| --- | --- | --- |");
    expect(md).toContain("| Hugo | Designer | 28 |");
    expect(md).toContain("| Klaus | IA | 1 |");
  });

  it("converte tabelas complexas com colspan e rowspan sem quebrar a estrutura GFM", () => {
    const html = `
      <table>
        <tr>
          <th colspan="2">Dados do Projeto</th>
          <th>Status</th>
        </tr>
        <tr>
          <td rowspan="2">Klaus</td>
          <td>Backend</td>
          <td>N/A (Serverless)</td>
        </tr>
        <tr>
          <td>Frontend</td>
          <td>React + Vite</td>
        </tr>
      </table>
    `;

    const md = converterHtmlParaMarkdownClipboard(html);
    expect(md).toContain("| Dados do Projeto | Dados do Projeto | Status |");
    expect(md).toContain("| --- | --- | --- |");
    expect(md).toContain("| Klaus | Backend | N/A (Serverless) |");
    expect(md).toContain("| Klaus | Frontend | React + Vite |");
  });

  it("escapa pipes | e quebras de linha dentro de células de tabelas", () => {
    const html = `
      <table>
        <tr>
          <th>Coluna 1</th>
          <th>Coluna 2</th>
        </tr>
        <tr>
          <td>Texto com | pipe</td>
          <td>Texto com<br/>linha 2</td>
        </tr>
      </table>
    `;

    const md = converterHtmlParaMarkdownClipboard(html);
    expect(md).toContain("Texto com \\| pipe");
    expect(md).toContain("Texto com linha 2");
  });

  it("sanitiza scripts, styles e tags perigosas", () => {
    const html = `
      <script>alert('hack');</script>
      <style>body { color: red; }</style>
      <p style="color: blue; font-size: 30px;">Texto Seguro</p>
    `;

    const md = converterHtmlParaMarkdownClipboard(html);
    expect(md).not.toContain("<script>");
    expect(md).not.toContain("alert");
    expect(md).not.toContain("<style>");
    expect(md).toContain("Texto Seguro");
  });

  it("identifica corretamente se o HTML é relevante para conversão rica", () => {
    expect(ehHtmlFormatadoRelevante("")).toBe(false);
    expect(ehHtmlFormatadoRelevante("Texto puro sem tags")).toBe(false);
    expect(ehHtmlFormatadoRelevante("<p>Apenas texto simples</p>", "Apenas texto simples")).toBe(false);
    expect(ehHtmlFormatadoRelevante("<h2>Título</h2><p>Texto</p>")).toBe(true);
    expect(ehHtmlFormatadoRelevante("<table><tr><td>A</td></tr></table>")).toBe(true);
    expect(ehHtmlFormatadoRelevante("<p>Texto com <strong>negrito</strong></p>")).toBe(true);
    expect(ehHtmlFormatadoRelevante("<a href='https://exemplo.com'>Link</a>")).toBe(true);
  });
});
