import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

function stubHeavyModules() {
  const stubs = [
    "pdfjs-dist",
    "@xenova/transformers",
    "onnxruntime-web",
    "@excalidraw/excalidraw",
    "tesseract.js",
  ];
  return {
    name: "stub-heavy-modules",
    resolveId(id: string) {
      if (stubs.some((s) => id.includes(s))) {
        return `\0stub:${id}`;
      }
      return null;
    },
    load(id: string) {
      if (id.startsWith("\0stub:")) {
        return "export default {}; export const pipeline = () => {}; export const env = {};";
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [stubHeavyModules(), react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "import.meta.url": "undefined",
  },
  build: {
    outDir: "extensao",
    emptyOutDir: false,
    minify: "oxc",
    lib: {
      entry: path.resolve("src/extensao/entry.tsx"),
      name: "KlausExtension",
      formats: ["iife"],
      fileName: () => "content-bundle.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "content-bundle.css";
          }
          return "[name].[ext]";
        },
      },
    },
  },
});
