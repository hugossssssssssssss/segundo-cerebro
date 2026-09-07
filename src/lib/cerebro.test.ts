import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ehItemAtivo,
  filtrarItensAtivos,
  extrairTagsDeDoc,
  extrairCerebroDeArquivos,
  carregarCerebro,
  excluirTagCascata,
  renomearTagCascata,
  CAMINHO_CEREBRO,
} from "./cerebro";
import type { ItemRepo } from "./repo";
import type { Settings } from "./settings";
import * as github from "./github";

describe("Módulo Cérebro Central (cerebro.ts)", () => {
  const cfgValida: Settings = {
    nomeUsuario: "Hugo",
    profissaoUsuario: "Designer",
    onboardingConcluido: true,
    repoOwner: "hugo",
    repoName: "segundo-cerebro-dados",
    githubToken: "ghp_teste",
    branch: "main",
    geminiKey: "",
    geminiModel: "gemini-2.5-flash",
  };

  const itemNotaAtiva1: ItemRepo = {
    caminho: "notas/briefing-design.md",
    nome: "briefing-design.md",
    sha: "sha111",
    tamanho: 100,
    texto: "---\ntitulo: Briefing Design\ntags: [design, branding]\noutro_campo_ia: 123\n---\nCorpo da nota.",
    doc: {
      dados: { titulo: "Briefing Design", tags: ["design", "branding"], outro_campo_ia: 123 },
      corpo: "Corpo da nota.",
    },
  };

  const itemNotaAtiva2: ItemRepo = {
    caminho: "tarefas/fazer-logo.md",
    nome: "fazer-logo.md",
    sha: "sha222",
    tamanho: 120,
    texto: "---\ntitulo: Fazer Logo\ntags: [design, urgente]\n---\nCorpo da tarefa.",
    doc: {
      dados: { titulo: "Fazer Logo", tags: ["design", "urgente"] },
      corpo: "Corpo da tarefa.",
    },
  };

  const itemLixeira: ItemRepo = {
    caminho: "lixeira/antigo-rascunho.md",
    nome: "antigo-rascunho.md",
    sha: "sha333",
    tamanho: 80,
    texto: "---\ntitulo: Rascunho Velho\ntags: [tag_lixeira, design]\n---\nLixo.",
    doc: {
      dados: { titulo: "Rascunho Velho", tags: ["tag_lixeira", "design"] },
      corpo: "Lixo.",
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("ehItemAtivo & filtrarItensAtivos", () => {
    it("deve rejeitar arquivos da lixeira, internos ou que não sejam .md", () => {
      expect(ehItemAtivo("lixeira/nota.md")).toBe(false);
      expect(ehItemAtivo("pasta/lixeira/nota.md")).toBe(false);
      expect(ehItemAtivo(".klaus/cerebro.json")).toBe(false);
      expect(ehItemAtivo(".github/workflows/deploy.yml")).toBe(false);
      expect(ehItemAtivo("caixa-entrada/estado.json")).toBe(false);
      expect(ehItemAtivo("notas/foto.png")).toBe(false);

      expect(ehItemAtivo("notas/ideias.md")).toBe(true);
      expect(ehItemAtivo("tarefas/fazer-layout.md")).toBe(true);
      expect(ehItemAtivo("pdi/metas/estudar.md")).toBe(true);
    });

    it("deve filtrar itens ativos descartando a lixeira", () => {
      const lista = [itemNotaAtiva1, itemLixeira, itemNotaAtiva2];
      const ativos = filtrarItensAtivos(lista);
      expect(ativos).toHaveLength(2);
      expect(ativos.map((i) => i.caminho)).toEqual(["notas/briefing-design.md", "tarefas/fazer-logo.md"]);
    });
  });

  describe("extrairTagsDeDoc", () => {
    it("extrai tags de array ou string e ignora vazios", () => {
      expect(extrairTagsDeDoc({ tags: ["design", "  frontend "] })).toEqual(["design", "frontend"]);
      expect(extrairTagsDeDoc({ tags: "design, branding" })).toEqual(["design", "branding"]);
      expect(extrairTagsDeDoc({ tag: "pessoal" })).toEqual(["pessoal"]);
      expect(extrairTagsDeDoc({})).toEqual([]);
      expect(extrairTagsDeDoc(undefined)).toEqual([]);
    });
  });

  describe("Auto-Seed & carregarCerebro", () => {
    it("faz auto-seed a partir de arquivos ativos ignorando tags exclusivas da lixeira", () => {
      const lista = [itemNotaAtiva1, itemNotaAtiva2, itemLixeira];
      const cerebro = extrairCerebroDeArquivos(lista, { design: "roxo" });

      expect(cerebro.tags["design"]).toBeDefined();
      expect(cerebro.tags["design"].cor).toBe("roxo");
      expect(cerebro.tags["branding"]).toBeDefined();
      expect(cerebro.tags["urgente"]).toBeDefined();
      // Tag exclusiva da lixeira NUNCA deve ser incluída
      expect(cerebro.tags["tag_lixeira"]).toBeUndefined();
    });

    it("carrega cerebro.json existente e reconcilia com novas tags ativas", () => {
      const itemCerebroSalvo: ItemRepo = {
        caminho: CAMINHO_CEREBRO,
        nome: "cerebro.json",
        sha: "shacerebro",
        tamanho: 200,
        texto: JSON.stringify({
          versao: 1,
          atualizado_em: "2026-09-01T00:00:00.000Z",
          tags: {
            design: { cor: "roxo" },
          },
          propriedades: {},
        }),
        doc: { dados: {}, corpo: "" },
      };

      const lista = [itemCerebroSalvo, itemNotaAtiva1, itemNotaAtiva2];
      const cerebro = carregarCerebro(lista);

      // A cor salva "roxo" deve ser preservada
      expect(cerebro.tags["design"].cor).toBe("roxo");
      // As tags novas dos arquivos ativos são reconciliadas automaticamente
      expect(cerebro.tags["branding"]).toBeDefined();
      expect(cerebro.tags["urgente"]).toBeDefined();
    });
  });

  describe("Operações em Cascata (Excluir e Renomear)", () => {
    it("exclui tag em cascata de todos os arquivos ativos preservando campos desconhecidos", async () => {
      const gravarMock = vi.spyOn(github, "gravar").mockResolvedValue({
        content: { sha: "novoSha" },
      } as any);

      const lista = [itemNotaAtiva1, itemNotaAtiva2, itemLixeira];
      const resultado = await excluirTagCascata("design", lista, cfgValida);

      expect(resultado.totalModificados).toBe(2);
      expect(gravarMock).toHaveBeenCalled();

      // Verifica que o arquivo 1 teve a tag removida mas manteve outro_campo_ia
      const alt1 = resultado.itensAtualizados.find((x) => x.caminho === "notas/briefing-design.md");
      expect(alt1).toBeDefined();
      expect(alt1?.textoDepois).toContain("outro_campo_ia: 123");
      expect(alt1?.textoDepois).toContain("branding");
      expect(alt1?.textoDepois).not.toContain("design");
    });

    it("renomeia tag em cascata atualizando o frontmatter de todos os arquivos ativos", async () => {
      vi.spyOn(github, "gravar").mockResolvedValue({
        content: { sha: "novoSha" },
      } as any);

      const lista = [itemNotaAtiva1, itemNotaAtiva2];
      const resultado = await renomearTagCascata("design", "Design Gráfico", lista, cfgValida, "rosa");

      expect(resultado.totalModificados).toBe(2);
      const alt1 = resultado.itensAtualizados.find((x) => x.caminho === "notas/briefing-design.md");
      expect(alt1?.textoDepois).toContain("Design Gráfico");
      expect(alt1?.textoDepois).not.toContain("design");
    });
  });
});
