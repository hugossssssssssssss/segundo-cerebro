import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// O app é publicado em https://<usuario>.github.io/segundo-cerebro/,
// então em produção os assets precisam sair com esse prefixo.
// Em desenvolvimento a base é "/" para o localhost funcionar normalmente.
const base = process.env.NODE_ENV === "production" ? "/segundo-cerebro/" : "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  esbuild: {
    keepNames: true,
    minifyIdentifiers: false,
  } as any,
  resolve: {
    // fileURLToPath e não .pathname: o caminho tem espaço e acento,
    // que .pathname devolveria percent-encoded ("Segundo%20Cere%CC%81bro").
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    minify: false,
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
