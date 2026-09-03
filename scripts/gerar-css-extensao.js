import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distAssetsDir = path.resolve(__dirname, "../dist/assets");
const targetFile = path.resolve(__dirname, "../src/extensao/cssInjetado.ts");

try {
  let cssConteudo = "";
  if (fs.existsSync(distAssetsDir)) {
    const arquivos = fs.readdirSync(distAssetsDir);
    const cssIndex = arquivos.find((f) => f.startsWith("index-") && f.endsWith(".css"));
    if (cssIndex) {
      cssConteudo = fs.readFileSync(path.join(distAssetsDir, cssIndex), "utf8");
    }
  }

  // Fallback caso dist ainda não exista
  if (!cssConteudo) {
    const rawCssPath = path.resolve(__dirname, "../src/index.css");
    if (fs.existsSync(rawCssPath)) {
      cssConteudo = fs.readFileSync(rawCssPath, "utf8");
    }
  }

  // Escapa acentos graves e $ para ser uma template string válida
  const escapedCss = cssConteudo.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\${/g, "\\${");

  const tsContent = `// Gerado automaticamente pelo build\nexport const cssKlaus = \`${escapedCss}\`;\n`;
  fs.writeFileSync(targetFile, tsContent, "utf8");
  console.log(`[CSS Extensão] Gerado com sucesso (${cssConteudo.length} bytes)!`);
} catch (e) {
  console.error("[CSS Extensão] Erro ao gerar:", e);
}
