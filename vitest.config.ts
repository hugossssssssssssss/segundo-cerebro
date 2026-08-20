import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Fuso fixo nos testes.
 *
 * Sem isto, os testes de data passavam na máquina do Hugo (UTC−3) e falhavam
 * no runner do GitHub (UTC) — teste que depende de onde roda não prova nada.
 * Fixar o fuso faz o teste medir o que ele quer medir: que `hojeISO()` usa o
 * horário local e não o UTC.
 */
process.env.TZ = "America/Sao_Paulo";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // jsdom para os testes de componente. Três das quatro perdas de dados
    // encontradas nas auditorias viviam em componentes e eram invisíveis
    // para uma suíte que só testava funções puras.
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
