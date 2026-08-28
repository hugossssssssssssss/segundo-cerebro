import { describe, it, expect, vi } from "vitest";
import { identificarArquivosProcessos, apagarArquivosProcessosEmLote } from "./limpezaProcessos";
import type { ItemRepo } from "./repo";
import { lerMarkdown } from "./markdown";

function mockItem(caminho: string): ItemRepo {
  return {
    caminho,
    nome: caminho.split("/").pop() || "",
    sha: "sha_" + caminho,
    tamanho: 10,
    texto: "# Titulo",
    doc: lerMarkdown("# Titulo"),
  };
}

describe("limpezaProcessos", () => {
  it("identifica corretamente arquivos na pasta processos/ e ignora outras pastas", () => {
    const acervo: ItemRepo[] = [
      mockItem("notas/ideia.md"),
      mockItem("tarefas/fazer.md"),
      mockItem("processos/proc_123.md"),
      mockItem("processos/cards/card_456.md"),
      mockItem("pdi/metas/meta1.md"),
    ];

    const proc = identificarArquivosProcessos(acervo);
    expect(proc.length).toBe(2);
    expect(proc.map((i) => i.caminho)).toEqual([
      "processos/proc_123.md",
      "processos/cards/card_456.md",
    ]);
  });

  it("exclui arquivos em fallback sequencial quando Git Trees falha", async () => {
    const cfg = {
      repoOwner: "test",
      repoName: "dados",
      githubToken: "ghp_123",
      branch: "main",
    } as any;

    const itens = [
      { caminho: "processos/p1.md", sha: "sha1" },
      { caminho: "processos/cards/c1.md", sha: "sha2" },
    ];

    // Mock global fetch para simular falha no git trees e sucesso no delete
    const globalFetch = global.fetch;
    const chamadasDelete: string[] = [];

    global.fetch = vi.fn(async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/git/ref/heads/")) {
        return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
      }
      if (init?.method === "DELETE") {
        chamadasDelete.push(urlStr);
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }) as any;

    const resultado = await apagarArquivosProcessosEmLote(cfg, itens);
    expect(resultado.sucessos).toBe(2);
    expect(resultado.falhas.length).toBe(0);
    expect(chamadasDelete.length).toBe(2);

    global.fetch = globalFetch;
  });
});
