import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
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
