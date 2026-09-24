import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// O app pode ser publicado no GitHub Pages (com prefixo /segundo-cerebro/)
// ou na Vercel / domínio próprio (com base /).
// Vercel define a variável de ambiente VERCEL=1 durante o build.
const base =
  process.env.VERCEL || process.env.BASE_PATH === "/"
    ? "/"
    : process.env.NODE_ENV === "production"
      ? "/segundo-cerebro/"
      : "/";


export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    // fileURLToPath e não .pathname: o caminho tem espaço e acento,
    // que .pathname devolveria percent-encoded ("Segundo%20Cere%CC%81bro").
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    minify: "oxc",
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/onnxruntime-web") || id.includes("@xenova")) {
            return "vendor-whisper";
          }
          if (id.includes("node_modules/pdf-lib") || id.includes("pdfjs-dist") || id.includes("html2pdf.js")) {
            return "vendor-pdf";
          }
          if (id.includes("node_modules/tesseract.js")) {
            return "vendor-ocr";
          }
          if (id.includes("node_modules/@excalidraw")) {
            return "vendor-excalidraw";
          }
          if (id.includes("node_modules/@blocknote")) {
            return "vendor-blocknote";
          }
        },
      },
    },
  },
});
