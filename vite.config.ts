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
  resolve: {
    // fileURLToPath e não .pathname: o caminho tem espaço e acento,
    // que .pathname devolveria percent-encoded ("Segundo%20Cere%CC%81bro").
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
