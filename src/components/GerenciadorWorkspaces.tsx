/**
 * Gerenciador de Workspaces (Espaços de Trabalho)
 *
 * Painel completo para listar, alternar, cadastrar, editar e excluir
 * múltiplos espaços de trabalho (repositórios pessoais e de equipes).
 */

import { useState, useEffect } from "react";
import {
  FolderGit2,
  Users,
  User,
  Plus,
  Edit2,
  Trash2,
  Check,
  KeyRound,
  GitBranch,
} from "lucide-react";
import {
  listarWorkspaces,
  obterWorkspaceAtivo,
  alternarWorkspace,
  salvarWorkspace,
  removerWorkspace,
  EVENTO_WORKSPACE_ALTERADO,
  type WorkspaceConfig,
} from "@/lib/workspaces";
import { Cartao, Botao, Campo, Rotulo, ModalConfirmacao } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GerenciadorWorkspacesProps {
  aoAlterarWorkspace?: () => void;
  className?: string;
}

const PALETA_CORES_WORKSPACE = [
  { cor: "#6366f1", nome: "Índigo" },
  { cor: "#10b981", nome: "Esmeralda" },
  { cor: "#0284c7", nome: "Céu" },
  { cor: "#f59e0b", nome: "Âmbar" },
  { cor: "#8b5cf6", nome: "Roxo" },
  { cor: "#ec4899", nome: "Rosa" },
  { cor: "#14b8a6", nome: "Teal" },
];

export function GerenciadorWorkspaces({
  aoAlterarWorkspace,
  className,
}: GerenciadorWorkspacesProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceConfig[]>(listarWorkspaces);
  const [ativo, setAtivo] = useState<WorkspaceConfig>(obterWorkspaceAtivo);

  // Modal de Criação / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [workspaceEditando, setWorkspaceEditando] = useState<WorkspaceConfig | null>(null);

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"pessoal" | "equipe">("equipe");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [branch, setBranch] = useState("main");
  const [githubToken, setGithubToken] = useState("");
  const [cor, setCor] = useState("#10b981");
  const [erroForm, setErroForm] = useState("");

  // Modal de Exclusão
  const [idParaExcluir, setIdParaExcluir] = useState<string | null>(null);

  const sincronizar = () => {
    setWorkspaces(listarWorkspaces());
    setAtivo(obterWorkspaceAtivo());
  };

  useEffect(() => {
    window.addEventListener(EVENTO_WORKSPACE_ALTERADO, sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(EVENTO_WORKSPACE_ALTERADO, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  const abrirModalNovo = () => {
    setWorkspaceEditando(null);
    setNome("");
    setTipo("equipe");
    setRepoOwner("");
    setRepoName("");
    setBranch("main");
    setGithubToken("");
    setCor("#10b981");
    setErroForm("");
    setModalAberto(true);
  };

  const abrirModalEditar = (ws: WorkspaceConfig) => {
    setWorkspaceEditando(ws);
    setNome(ws.nome);
    setTipo(ws.tipo);
    setRepoOwner(ws.repoOwner);
    setRepoName(ws.repoName);
    setBranch(ws.branch || "main");
    setGithubToken(ws.githubToken || "");
    setCor(ws.cor || (ws.tipo === "equipe" ? "#10b981" : "#6366f1"));
    setErroForm("");
    setModalAberto(true);
  };

  const salvarFormulario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !repoOwner.trim() || !repoName.trim()) {
      setErroForm("Preencha o nome do espaço, dono e nome do repositório.");
      return;
    }

    const id = workspaceEditando ? workspaceEditando.id : `ws_${Date.now().toString(36)}`;
    const wsSalvar: WorkspaceConfig = {
      id,
      nome: nome.trim(),
      tipo,
      repoOwner: repoOwner.trim(),
      repoName: repoName.trim(),
      branch: branch.trim() || "main",
      githubToken: githubToken.trim() || undefined,
      cor,
      icone: tipo === "equipe" ? "Users" : "User",
    };

    salvarWorkspace(wsSalvar);
    sincronizar();
    aoAlterarWorkspace?.();
    setModalAberto(false);
  };

  const confirmarExclusao = () => {
    if (!idParaExcluir) return;
    removerWorkspace(idParaExcluir);
    setIdParaExcluir(null);
    sincronizar();
    aoAlterarWorkspace?.();
  };

  const lidarAtivar = (id: string) => {
    alternarWorkspace(id);
    sincronizar();
    aoAlterarWorkspace?.();
  };

  const workspaceParaRemover = workspaces.find((w) => w.id === idParaExcluir);

  return (
    <Cartao className={cn("p-5 space-y-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <FolderGit2 size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm sm:text-base">
              Espaços de Trabalho & Colaboração
            </h2>
            <p className="text-xs text-muted-foreground">
              Alterne, edite repositórios ou conecte novos espaços para trabalhar individualmente ou em equipe.
            </p>
          </div>
        </div>

        <Botao
          tamanho="pequeno"
          onClick={abrirModalNovo}
          className="cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>Novo Espaço</span>
        </Botao>
      </div>

      {/* Lista de Workspaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {workspaces.map((ws) => {
          const ehAtivo = ws.id === ativo.id;
          const corTema = ws.cor || (ws.tipo === "equipe" ? "#10b981" : "#6366f1");

          return (
            <div
              key={ws.id}
              className={cn(
                "p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3",
                ehAtivo
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                  : "border-border/60 bg-card hover:border-border hover:bg-accent/20"
              )}
            >
              <div className="flex items-start justify-between gap-2.5 min-w-0">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5"
                    style={{ backgroundColor: corTema }}
                  >
                    {ws.tipo === "equipe" ? <Users size={16} /> : <User size={16} />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-foreground truncate">
                        {ws.nome}
                      </h4>
                      {ehAtivo && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-primary text-primary-foreground">
                          <Check size={10} strokeWidth={3} /> Ativo
                        </span>
                      )}
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground">
                        {ws.tipo === "equipe" ? "Equipe" : "Pessoal"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 truncate">
                      <GitBranch size={11} className="shrink-0 opacity-70" />
                      <span className="truncate font-mono text-[11px]">
                        {ws.repoOwner}/{ws.repoName}
                      </span>
                      <span className="opacity-40">•</span>
                      <span className="text-[10px] opacity-75">{ws.branch || "main"}</span>
                    </div>

                    {ws.githubToken && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                        <KeyRound size={10} />
                        <span>Token individual configurado</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações do Workspace */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                <div>
                  {!ehAtivo && (
                    <Botao
                      tamanho="pequeno"
                      variante="neutro"
                      onClick={() => lidarAtivar(ws.id)}
                      className="cursor-pointer text-xs h-7 px-2.5"
                    >
                      Ativar este espaço
                    </Botao>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Tooltip conteudo="Editar configurações do espaço">
                    <button
                      type="button"
                      onClick={() => abrirModalEditar(ws)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                      aria-label="Editar espaço"
                    >
                      <Edit2 size={13} />
                    </button>
                  </Tooltip>

                  <Tooltip
                    conteudo={
                      workspaces.length <= 1
                        ? "Você deve manter pelo menos um espaço ativo"
                        : "Excluir espaço de trabalho"
                    }
                  >
                    <button
                      type="button"
                      disabled={workspaces.length <= 1}
                      onClick={() => setIdParaExcluir(ws.id)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        workspaces.length <= 1
                          ? "opacity-30 cursor-not-allowed text-muted-foreground"
                          : "text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      )}
                      aria-label="Excluir espaço"
                    >
                      <Trash2 size={13} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Criação / Edição */}
      <Modal
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        titulo={workspaceEditando ? "Editar Espaço de Trabalho" : "Novo Espaço de Trabalho"}
      >
        <form onSubmit={salvarFormulario} className="space-y-4 text-xs sm:text-sm">
          {erroForm && (
            <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 font-medium">
              {erroForm}
            </div>
          )}

          <div>
            <Rotulo obrigatorio>Nome de Exibição do Espaço</Rotulo>
            <Campo
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Klaus Estúdio, Projeto Acme..."
              autoFocus
            />
          </div>

          <div>
            <Rotulo>Tipo de Espaço</Rotulo>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTipo("pessoal");
                  if (cor === "#10b981") setCor("#6366f1");
                }}
                className={cn(
                  "p-2.5 rounded-xl border flex items-center justify-center gap-2 font-medium cursor-pointer transition-all",
                  tipo === "pessoal"
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "border-border/60 hover:bg-accent/50 text-muted-foreground"
                )}
              >
                <User size={15} />
                <span>Uso Pessoal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipo("equipe");
                  if (cor === "#6366f1") setCor("#10b981");
                }}
                className={cn(
                  "p-2.5 rounded-xl border flex items-center justify-center gap-2 font-medium cursor-pointer transition-all",
                  tipo === "equipe"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                    : "border-border/60 hover:bg-accent/50 text-muted-foreground"
                )}
              >
                <Users size={15} />
                <span>Equipe / Compartilhado</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Rotulo obrigatorio dica="Nome do usuário ou organização no GitHub.">
                Dono / Usuário GitHub
              </Rotulo>
              <Campo
                value={repoOwner}
                onChange={(e) => setRepoOwner(e.target.value)}
                placeholder="Ex: hugosilva ou minha-org"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div>
              <Rotulo obrigatorio dica="Nome do repositório onde os dados ficam guardados.">
                Nome do Repositório
              </Rotulo>
              <Campo
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="Ex: segundo-cerebro-dados"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <Rotulo dica="Branch padrão para salvar os arquivos.">Branch</Rotulo>
              <Campo
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                autoCapitalize="none"
              />
            </div>

            <div className="sm:col-span-2">
              <Rotulo dica="Opcional. Se vazio, usa o token configurado nas preferências principais.">
                Token GitHub Próprio (Opcional)
              </Rotulo>
              <Campo
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="Deixe em branco para herdar o padrão"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div>
            <Rotulo>Cor de Destaque Visual</Rotulo>
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              {PALETA_CORES_WORKSPACE.map((item) => (
                <button
                  key={item.cor}
                  type="button"
                  onClick={() => setCor(item.cor)}
                  style={{ backgroundColor: item.cor }}
                  className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center text-white transition-transform cursor-pointer shadow-xs",
                    cor === item.cor ? "scale-110 ring-2 ring-foreground/40" : "hover:scale-105 opacity-80"
                  )}
                  title={item.nome}
                >
                  {cor === item.cor && <Check size={13} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border/60">
            <Botao
              type="button"
              variante="neutro"
              onClick={() => setModalAberto(false)}
            >
              Cancelar
            </Botao>
            <Botao type="submit">
              {workspaceEditando ? "Salvar Alterações" : "Criar Espaço"}
            </Botao>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Exclusão */}
      <ModalConfirmacao
        aberto={Boolean(idParaExcluir)}
        titulo="Excluir espaço de trabalho?"
        descricao={`Tem certeza que deseja remover o atalho para o espaço "${workspaceParaRemover?.nome || ""}"? Seus arquivos Markdown continuarão totalmente intactos no GitHub.`}
        textoConfirmar="Excluir Espaço"
        varianteConfirmar="perigo"
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setIdParaExcluir(null)}
      />
    </Cartao>
  );
}
