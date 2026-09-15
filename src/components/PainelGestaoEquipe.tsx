import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  RefreshCw,
  Trash2,
  UserCheck,
  UserX,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Botao, Campo, Cartao, Rotulo, Aviso, Selo, Carregando, ModalConfirmacao } from "@/components/ui";
import { AvatarUsuario } from "@/components/AvatarUsuario";
import { lerConfig } from "@/lib/settings";
import { lerPerfilLocal } from "@/lib/usuario";
import {
  carregarEquipe,
  salvarEquipe,
  obterPermissoes,
  type ConfigEquipe,
  type MembroEquipe,
  type PapelEquipe,
} from "@/lib/equipe";
import { obterWorkspaceAtivo } from "@/lib/workspaces";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const DESCRICAO_PAPEIS: Record<PapelEquipe, { rotulo: string; descricao: string; cor: string }> = {
  dono: {
    rotulo: "Dono do Espaço",
    descricao: "Controle total, gerencia membros, configurações e permissões.",
    cor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  admin: {
    rotulo: "Administrador",
    descricao: "Pode editar tudo, atribuir tarefas e excluir entregas e notas.",
    cor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  },
  membro: {
    rotulo: "Membro",
    descricao: "Cria e edita notas, tarefas e referências livremente.",
    cor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  leitor: {
    rotulo: "Leitor",
    descricao: "Acesso de apenas leitura ao acervo compartilhado.",
    cor: "bg-stone-500/15 text-stone-600 dark:text-stone-400 border-stone-500/30",
  },
};

export function PainelGestaoEquipe() {
  const cfg = lerConfig();
  const perfil = lerPerfilLocal();
  const workspaceAtivo = obterWorkspaceAtivo();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [configEquipe, setConfigEquipe] = useState<ConfigEquipe | null>(null);
  const [shaEquipe, setShaEquipe] = useState<string | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  // Form de novo membro
  const [novoLogin, setNovoLogin] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoPapel, setNovoPapel] = useState<PapelEquipe>("membro");
  const [membroParaRemover, setMembroParaRemover] = useState<MembroEquipe | null>(null);

  const loginUsuario = (perfil?.login || cfg.repoOwner || "").toLowerCase().trim();

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await carregarEquipe(cfg, perfil);
      setConfigEquipe(res.config);
      setShaEquipe(res.sha);
    } catch (e: any) {
      setErro(e?.message || "Não foi possível carregar a configuração da equipe.");
    } finally {
      setCarregando(false);
    }
  }, [cfg.repoOwner, cfg.githubToken, perfil?.login]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const membroAtual = configEquipe?.membros.find(
    (m) => m.login.toLowerCase() === loginUsuario
  );
  const papelAtual: PapelEquipe = membroAtual?.papel || (workspaceAtivo.tipo === "equipe" ? "dono" : "membro");
  const permissoes = obterPermissoes(papelAtual);
  const podeGerenciar = permissoes.gerenciarMembros || papelAtual === "dono";

  const lidarAdicionarMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpo = novoLogin.trim().replace(/^@/, "");
    if (!limpo) {
      toast("Digite o login do usuário no GitHub.", { tipo: "erro" });
      return;
    }

    if (!configEquipe) return;

    // Checa se já existe
    if (configEquipe.membros.some((m) => m.login.toLowerCase() === limpo.toLowerCase())) {
      toast(`O usuário @${limpo} já faz parte desta equipe.`, { tipo: "erro" });
      return;
    }

    const novo: MembroEquipe = {
      login: limpo,
      nome: novoNome.trim() || limpo,
      papel: novoPapel,
      avatar: `https://github.com/${limpo}.png`,
      ativo: true,
      adicionadoEm: new Date().toISOString(),
    };

    const novaConfig: ConfigEquipe = {
      ...configEquipe,
      membros: [...configEquipe.membros, novo],
    };

    setSalvando(true);
    try {
      const novoSha = await salvarEquipe(cfg, novaConfig, shaEquipe, loginUsuario);
      setShaEquipe(novoSha);
      setConfigEquipe(novaConfig);
      setNovoLogin("");
      setNovoNome("");
      setNovoPapel("membro");
      toast(`@${limpo} adicionado com sucesso à equipe!`, { tipo: "sucesso" });
    } catch (err: any) {
      toast(`Erro ao salvar membro: ${err?.message || err}`, { tipo: "erro" });
    } finally {
      setSalvando(false);
    }
  };

  const lidarMudarPapel = async (loginAlvo: string, novoPapel: PapelEquipe) => {
    if (!configEquipe || !podeGerenciar) return;

    const novaConfig: ConfigEquipe = {
      ...configEquipe,
      membros: configEquipe.membros.map((m) =>
        m.login.toLowerCase() === loginAlvo.toLowerCase()
          ? { ...m, papel: novoPapel }
          : m
      ),
    };

    setSalvando(true);
    try {
      const novoSha = await salvarEquipe(cfg, novaConfig, shaEquipe, loginUsuario);
      setShaEquipe(novoSha);
      setConfigEquipe(novaConfig);
      toast(`Papel de @${loginAlvo} alterado para ${DESCRICAO_PAPEIS[novoPapel].rotulo}!`, { tipo: "sucesso" });
    } catch (err: any) {
      toast(`Erro ao alterar papel: ${err?.message || err}`, { tipo: "erro" });
    } finally {
      setSalvando(false);
    }
  };

  const lidarAlternarAtivo = async (loginAlvo: string) => {
    if (!configEquipe || !podeGerenciar) return;

    const membro = configEquipe.membros.find((m) => m.login.toLowerCase() === loginAlvo.toLowerCase());
    if (!membro) return;

    if (membro.papel === "dono") {
      toast("O dono da equipe não pode ser desativado.", { tipo: "erro" });
      return;
    }

    const novoStatus = !membro.ativo;
    const novaConfig: ConfigEquipe = {
      ...configEquipe,
      membros: configEquipe.membros.map((m) =>
        m.login.toLowerCase() === loginAlvo.toLowerCase()
          ? { ...m, ativo: novoStatus }
          : m
      ),
    };

    setSalvando(true);
    try {
      const novoSha = await salvarEquipe(cfg, novaConfig, shaEquipe, loginUsuario);
      setShaEquipe(novoSha);
      setConfigEquipe(novaConfig);
      toast(`@${loginAlvo} ${novoStatus ? "reativado" : "desativado"} com sucesso.`, { tipo: "sucesso" });
    } catch (err: any) {
      toast(`Erro ao alterar status: ${err?.message || err}`, { tipo: "erro" });
    } finally {
      setSalvando(false);
    }
  };

  const lidarConfirmarRemover = async () => {
    if (!membroParaRemover || !configEquipe) return;

    if (membroParaRemover.papel === "dono") {
      toast("Não é possível remover o dono da equipe.", { tipo: "erro" });
      setMembroParaRemover(null);
      return;
    }

    const novaConfig: ConfigEquipe = {
      ...configEquipe,
      membros: configEquipe.membros.filter(
        (m) => m.login.toLowerCase() !== membroParaRemover.login.toLowerCase()
      ),
    };

    setSalvando(true);
    try {
      const novoSha = await salvarEquipe(cfg, novaConfig, shaEquipe, loginUsuario);
      setShaEquipe(novoSha);
      setConfigEquipe(novaConfig);
      toast(`@${membroParaRemover.login} removido da equipe.`, { tipo: "sucesso" });
    } catch (err: any) {
      toast(`Erro ao remover membro: ${err?.message || err}`, { tipo: "erro" });
    } finally {
      setSalvando(false);
      setMembroParaRemover(null);
    }
  };

  if (carregando) {
    return <Carregando texto="Carregando dados da equipe..." />;
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {/* Cartão Informativo da Equipe */}
      <Cartao className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm sm:text-base">
                {configEquipe?.nome_equipe || "Equipe do Klaus"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Repositório: <span className="font-mono">{cfg.repoOwner}/{cfg.repoName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Selo tom={papelAtual === "dono" ? "aviso" : "primario"}>
              {DESCRICAO_PAPEIS[papelAtual].rotulo}
            </Selo>
            <Botao
              variante="neutro"
              onClick={carregarDados}
              disabled={salvando}
              className="text-xs h-8 px-2.5"
              title="Recarregar dados da equipe"
            >
              <RefreshCw size={13} className={salvando ? "animate-spin" : ""} />
            </Botao>
          </div>
        </div>

        {/* Banner Informativo de Transparência e Permissões Técnicas */}
        <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground">Como funcionam as permissões no Klaus</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                O Klaus opera sem backend, comunicando-se diretamente do seu navegador com a API do GitHub. Os papéis organizam as atribuições e fluxos na interface, enquanto o acesso técnico real de leitura e escrita é configurado nas permissões do repositório no GitHub.
              </p>
            </div>
          </div>

          <a
            href={`https://github.com/${cfg.repoOwner}/${cfg.repoName}/settings/access`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-accent/70 text-foreground font-medium transition-colors shrink-0 text-xs shadow-2xs"
          >
            <span>Colaboradores no GitHub</span>
            <ExternalLink size={12} className="opacity-70" />
          </a>
        </div>

        {/* Lista de Membros da Equipe */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Membros ({configEquipe?.membros.length || 0})</span>
            <span>Permissão</span>
          </div>

          <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card/60 overflow-hidden">
            {configEquipe?.membros.map((membro) => {
              const ehVoce = membro.login.toLowerCase() === loginUsuario;
              const ehDono = membro.papel === "dono";

              return (
                <div
                  key={membro.login}
                  className={cn(
                    "p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors",
                    !membro.ativo && "opacity-50 bg-secondary/20"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarUsuario
                      login={membro.login}
                      nome={membro.nome}
                      avatarUrl={membro.avatar}
                      tamanho="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {membro.nome}
                        </span>
                        {ehVoce && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-bold">
                            você
                          </span>
                        )}
                        {!membro.ativo && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-destructive/15 text-destructive font-bold">
                            inativo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">@{membro.login}</p>
                    </div>
                  </div>

                  {/* Ações e Seletor de Papel */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {podeGerenciar && !ehDono ? (
                      <select
                        value={membro.papel}
                        onChange={(e) => lidarMudarPapel(membro.login, e.target.value as PapelEquipe)}
                        disabled={salvando}
                        className="text-xs rounded-lg border border-input bg-card px-2.5 py-1 text-foreground focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                      >
                        <option value="admin">Administrador</option>
                        <option value="membro">Membro</option>
                        <option value="leitor">Leitor</option>
                      </select>
                    ) : (
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg border", DESCRICAO_PAPEIS[membro.papel].cor)}>
                        {DESCRICAO_PAPEIS[membro.papel].rotulo}
                      </span>
                    )}

                    {podeGerenciar && !ehDono && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => lidarAlternarAtivo(membro.login)}
                          disabled={salvando}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors cursor-pointer text-xs",
                            membro.ativo
                              ? "text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                              : "text-emerald-500 hover:bg-emerald-500/10"
                          )}
                          title={membro.ativo ? "Desativar colaborador" : "Reativar colaborador"}
                        >
                          {membro.ativo ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setMembroParaRemover(membro)}
                          disabled={salvando}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Remover da equipe"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Cartao>

      {/* Cartão Adicionar Novo Membro (Apenas Dono / Admin) */}
      {podeGerenciar && (
        <Cartao className="p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                Convidar Colaborador
              </h3>
              <p className="text-xs text-muted-foreground">
                Adicione um membro informando o login do GitHub para atribuição de tarefas e colaboração.
              </p>
            </div>
          </div>

          <form onSubmit={lidarAdicionarMembro} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Rotulo dica="O nome de usuário que ele usa no GitHub (sem o @).">
                  Usuário do GitHub *
                </Rotulo>
                <Campo
                  value={novoLogin}
                  onChange={(e) => setNovoLogin(e.target.value)}
                  placeholder="Ex: mariadesigner"
                  required
                />
              </div>

              <div>
                <Rotulo dica="Nome amigável para exibição nos avatares e cartões.">
                  Nome do colaborador
                </Rotulo>
                <Campo
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Maria Santos"
                />
              </div>

              <div>
                <Rotulo dica="Nível de acesso aos dados do repositório da equipe.">
                  Papel na equipe
                </Rotulo>
                <select
                  value={novoPapel}
                  onChange={(e) => setNovoPapel(e.target.value as PapelEquipe)}
                  className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="admin">Administrador</option>
                  <option value="membro">Membro (padrão)</option>
                  <option value="leitor">Leitor (apenas leitura)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-muted-foreground">
                * Para salvar arquivos no GitHub, lembre-se de conceder acesso de colaborador ao usuário no repositório.
              </span>
              <Botao
                type="submit"
                variante="primario"
                disabled={salvando || !novoLogin.trim()}
                className="gap-1.5"
              >
                <UserPlus size={14} />
                <span>{salvando ? "Adicionando..." : "Adicionar à Equipe"}</span>
              </Botao>
            </div>
          </form>
        </Cartao>
      )}

      {/* Modal de Confirmação de Remoção */}
      {membroParaRemover && (
        <ModalConfirmacao
          aberto={true}
          titulo="Remover membro da equipe"
          descricao={`Tem certeza que deseja remover @${membroParaRemover.login} (${membroParaRemover.nome}) da equipe?`}
          textoConfirmar="Sim, remover"
          varianteConfirmar="perigo"
          aoConfirmar={lidarConfirmarRemover}
          aoCancelar={() => setMembroParaRemover(null)}
        />
      )}
    </div>
  );
}
