import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  obterPermissoes,
  criarConfigEquipePadrao,
  carregarEquipe,
  salvarEquipe,
  papelDoUsuario,
  podeGerenciarEquipe,
  CAMINHO_EQUIPE,
  type ConfigEquipe,
} from "./equipe";
import * as github from "./github";

describe("equipe.ts - Gestão e Permissões de Equipe", () => {
  const cfg = {
    nomeUsuario: "Hugo",
    profissaoUsuario: "Design",
    onboardingConcluido: true,
    githubToken: "tok",
    repoOwner: "hugo",
    repoName: "dados",
    branch: "main",
    geminiKey: "",
    geminiModel: "",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("verifica permissões por papel", () => {
    expect(obterPermissoes("dono").gerenciarMembros).toBe(true);
    expect(obterPermissoes("dono").excluirEntregas).toBe(true);

    expect(obterPermissoes("admin").gerenciarMembros).toBe(false);
    expect(obterPermissoes("admin").excluirEntregas).toBe(true);

    expect(obterPermissoes("membro").gerenciarMembros).toBe(false);
    expect(obterPermissoes("membro").excluirEntregas).toBe(false);
    expect(obterPermissoes("membro").editarTudo).toBe(true);

    expect(obterPermissoes("leitor").editarTudo).toBe(false);
  });

  it("cria config padrão quando equipe.json não existe", () => {
    const config = criarConfigEquipePadrao({
      login: "hugosilva",
      nome: "Hugo Silva",
      avatarUrl: "https://avatar.png",
      atualizadoEm: "2026-09-14",
    });

    expect(config.membros).toHaveLength(1);
    expect(config.membros[0].login).toBe("hugosilva");
    expect(config.membros[0].papel).toBe("dono");
    expect(config.membros[0].ativo).toBe(true);
  });

  it("carrega equipe.json existente do repositório", async () => {
    const mockEquipe: ConfigEquipe = {
      versao_schema: 1,
      nome_equipe: "Estúdio Alfa",
      atualizado_em: "2026-09-14T12:00:00Z",
      membros: [
        { login: "hugosilva", nome: "Hugo", papel: "dono", ativo: true },
        { login: "beatriz", nome: "Beatriz", papel: "admin", ativo: true },
      ],
    };

    vi.spyOn(github, "ler").mockResolvedValue({
      texto: JSON.stringify(mockEquipe),
      sha: "sha_equipe_123",
    });

    const { config, sha } = await carregarEquipe(cfg);
    expect(sha).toBe("sha_equipe_123");
    expect(config.nome_equipe).toBe("Estúdio Alfa");
    expect(config.membros).toHaveLength(2);
  });

  it("papelDoUsuario e podeGerenciarEquipe avaliam corretamente", () => {
    const equipe: ConfigEquipe = {
      versao_schema: 1,
      nome_equipe: "Estúdio Alfa",
      atualizado_em: "2026-09-14T12:00:00Z",
      membros: [
        { login: "hugosilva", nome: "Hugo", papel: "dono", ativo: true },
        { login: "beatriz", nome: "Beatriz", papel: "admin", ativo: true },
        { login: "lucas", nome: "Lucas", papel: "membro", ativo: true },
      ],
    };

    expect(papelDoUsuario(equipe, "hugosilva")).toBe("dono");
    expect(podeGerenciarEquipe(equipe, "hugosilva")).toBe(true);

    expect(papelDoUsuario(equipe, "beatriz")).toBe("admin");
    expect(podeGerenciarEquipe(equipe, "beatriz")).toBe(false);

    expect(papelDoUsuario(equipe, "lucas")).toBe("membro");
    expect(podeGerenciarEquipe(equipe, "lucas")).toBe(false);

    // Usuário não listado assume membro por padrão
    expect(papelDoUsuario(equipe, "desconhecido")).toBe("membro");
  });

  it("salvarEquipe serializa e grava em equipe.json", async () => {
    const gravarSpy = vi.spyOn(github, "gravar").mockResolvedValue("novo_sha");

    const equipe = criarConfigEquipePadrao({
      login: "hugosilva",
      nome: "Hugo",
      avatarUrl: "",
      atualizadoEm: "",
    });

    const novoSha = await salvarEquipe(cfg, equipe, "sha_anterior", "hugosilva");
    expect(novoSha).toBe("novo_sha");
    expect(gravarSpy).toHaveBeenCalledWith(
      cfg,
      CAMINHO_EQUIPE,
      expect.stringContaining("hugosilva"),
      "sha_anterior",
      expect.stringContaining("atualiza equipe.json"),
    );
  });

  it("mesclarMembrosEquipe combina listas sem apagar membros de outros admins", async () => {
    const { mesclarMembrosEquipe } = await import("./equipe");
    const locais = [
      { login: "hugosilva", nome: "Hugo", papel: "dono" as const, ativo: true },
      { login: "beatriz", nome: "Beatriz", papel: "admin" as const, ativo: true },
    ];
    const remotos = [
      { login: "hugosilva", nome: "Hugo", papel: "dono" as const, ativo: true },
      { login: "lucas", nome: "Lucas", papel: "membro" as const, ativo: true },
    ];

    const mesclados = mesclarMembrosEquipe(locais, remotos);
    expect(mesclados).toHaveLength(3);
    const logins = mesclados.map((m) => m.login);
    expect(logins).toContain("hugosilva");
    expect(logins).toContain("beatriz");
    expect(logins).toContain("lucas");
  });

  it("carregarEquipe lança erro explicativo se equipe.json estiver corrompido", async () => {
    vi.spyOn(github, "ler").mockResolvedValue({
      texto: "{ json quebrado com virgula faltando: ",
      sha: "sha_corrompido",
    });

    await expect(carregarEquipe(cfg)).rejects.toThrow(/erros de formatação JSON/);
  });
});

