import { describe, it, expect, beforeEach } from "vitest";
import {
  salvarTextosPorSha,
  carregarTextosPorShas,
  limparCacheSha,
} from "./storageOffline";

describe("storageOffline - SHA Cache", () => {
  beforeEach(async () => {
    await limparCacheSha();
  });

  it("salva e recupera múltiplos textos por SHA", async () => {
    await salvarTextosPorSha([
      { sha: "sha_nota_1", texto: "# Nota 1" },
      { sha: "sha_nota_2", texto: "# Nota 2" },
    ]);

    const resultado = await carregarTextosPorShas(["sha_nota_1", "sha_nota_2", "sha_inexistente"]);
    expect(resultado.get("sha_nota_1")).toBe("# Nota 1");
    expect(resultado.get("sha_nota_2")).toBe("# Nota 2");
    expect(resultado.has("sha_inexistente")).toBe(false);
  });

  it("limpa todo o cache de SHAs", async () => {
    await salvarTextosPorSha([{ sha: "sha_x", texto: "Conteúdo X" }]);
    let res = await carregarTextosPorShas(["sha_x"]);
    expect(res.get("sha_x")).toBe("Conteúdo X");

    await limparCacheSha();
    res = await carregarTextosPorShas(["sha_x"]);
    expect(res.has("sha_x")).toBe(false);
  });
});
