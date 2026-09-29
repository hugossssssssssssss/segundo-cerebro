import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  carregarProjetosExtensoes,
  alternarStatusProjetoExtensao,
  salvarProjetoCustomizado,
  removerProjetoCustomizado,
  obterExtensoesAtivas,
  CATALOGO_EXTENSOES_NATIVAS,
  sincronizarProjetosComGithub,
} from "./projetosExtensoes";
import * as github from "./github";

vi.mock("./github", () => ({
  ler: vi.fn(),
  gravar: vi.fn().mockResolvedValue("novo-sha-teste"),
}));

describe("Módulo de Projetos e Extensões", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("carrega o catálogo padrão se o localStorage estiver vazio", () => {
    const lista = carregarProjetosExtensoes();
    expect(lista.length).toBe(CATALOGO_EXTENSOES_NATIVAS.length);
    expect(lista[0].id).toBe("it_tools");
  });

  it("permite ativar e desativar uma extensão nativa", () => {
    const res = alternarStatusProjetoExtensao("it_tools");
    expect(res.sucesso).toBe(true);
    expect(res.ativo).toBe(true);

    const ativas = obterExtensoesAtivas();
    expect(ativas.some((e) => e.id === "it_tools")).toBe(true);

    const res2 = alternarStatusProjetoExtensao("it_tools");
    expect(res2.ativo).toBe(false);
  });

  it("permite criar, atualizar e remover projeto customizado do usuário", () => {
    const criado = salvarProjetoCustomizado({
      id: "meu_projeto_teste",
      nome: "Painel de Métricas",
      descricao: "Dashboard externo da equipe",
      icone: "BarChart3",
      cor: "#10b981",
      categoria: "produtividade",
      tipo: "url_integrada",
      ativo: true,
      urlEmbed: "https://example.com/dashboard",
    });

    expect(criado.id).toBe("meu_projeto_teste");
    expect(criado.origem).toBe("usuario");
    expect(criado.rota).toBe("/projeto/meu_projeto_teste");

    let lista = carregarProjetosExtensoes();
    expect(lista.some((p) => p.id === "meu_projeto_teste")).toBe(true);

    const ativas = obterExtensoesAtivas();
    expect(ativas.some((p) => p.id === "meu_projeto_teste")).toBe(true);

    // Remove
    const removido = removerProjetoCustomizado("meu_projeto_teste");
    expect(removido).toBe(true);

    lista = carregarProjetosExtensoes();
    expect(lista.some((p) => p.id === "meu_projeto_teste")).toBe(false);
  });

  it("sincroniza lista remota do GitHub se disponível", async () => {
    const fakeRemoto = [
      {
        id: "pdf",
        nome: "Ferramentas PDF",
        ativo: true,
        categoria: "produtividade",
        tipo: "nativa",
        origem: "catalogo",
        descricao: "teste",
        icone: "FileCheck",
      },
    ];

    vi.mocked(github.ler).mockResolvedValueOnce({
      texto: JSON.stringify(fakeRemoto),
      sha: "sha-123",
    });

    const res = await sincronizarProjetosComGithub({
      githubToken: "token-valido",
      repoOwner: "hugo",
      repoName: "segundo-cerebro-dados",
      branch: "main",
      nomeUsuario: "Hugo",
      profissaoUsuario: "Designer",
      onboardingConcluido: true,
      geminiKey: "",
      geminiModel: "gemini-2.0-flash",
    });

    expect(res.sincronizado).toBe(true);
    expect(res.projetos.length).toBe(1);
    expect(res.projetos[0].id).toBe("pdf");
  });
});
