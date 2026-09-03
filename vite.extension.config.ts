import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: /^@xenova\/.*/, replacement: path.resolve(__dirname, "src/lib/stubs/emptyStub.ts") },
      { find: /^onnxruntime-web(\/.*)?$/, replacement: path.resolve(__dirname, "src/lib/stubs/emptyStub.ts") },
      { find: /^pdfjs-dist(\/.*)?$/, replacement: path.resolve(__dirname, "src/lib/stubs/emptyStub.ts") },
      { find: /^@excalidraw\/.*/, replacement: path.resolve(__dirname, "src/lib/stubs/emptyStub.ts") },
      { find: /^cytoscape(\/.*)?$/, replacement: path.resolve(__dirname, "src/lib/stubs/emptyStub.ts") },
      { find: /^katex(\/.*)?$/, replacement: path.resolve(__dirname, "src/lib/stubs/emptyStub.ts") },
      { find: /^mermaid(\/.*)?$/, replacement: path.resolve(__dirname, "src/lib/stubs/emptyStub.ts") },
    ],
  },
  build: {
    outDir: "extensao",
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/extensao/entry.tsx"),
      name: "KlausExtensionContent",
      fileName: () => "content.js",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "content.css";
          }
          return "assets/[name].[ext]";
        },
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
