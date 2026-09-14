/**
 * Seletor de Workspace (Espaço de Trabalho)
 *
 * Permite alternar rapidamente entre o Klaus Pessoal e o Klaus da Equipe.
 * Projetado para viver no Header e na Sidebar do Klaus.
 */

import { useState, useEffect, useRef } from "react";
import {
  Users,
  User,
  ChevronDown,
  Check,
  Plus,
  FolderGit2,
} from "lucide-react";
import {
  listarWorkspaces,
  obterWorkspaceAtivo,
  alternarWorkspace,
  salvarWorkspace,
  EVENTO_WORKSPACE_ALTERADO,
  type WorkspaceConfig,
} from "@/lib/workspaces";
import { cn } from "@/lib/utils";

interface SeletorWorkspaceProps {
  className?: string;
  compacto?: boolean; // Se true, exibe apenas o ícone no modo colapsado
}

export function SeletorWorkspace({ className, compacto = false }: SeletorWorkspaceProps) {
  const [ativo, setAtivo] = useState<WorkspaceConfig>(obterWorkspaceAtivo);
  const [workspaces, setWorkspaces] = useState<WorkspaceConfig[]>(listarWorkspaces);
  const [menuAberto, setMenuAberto] = useState(false);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const refMenu = useRef<HTMLDivElement>(null);

  // Formulário do novo workspace
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<"pessoal" | "equipe">("equipe");
  const [novoOwner, setNovoOwner] = useState("");
  const [novoRepo, setNovoRepo] = useState("");
  const [novaBranch, setNovaBranch] = useState("main");
  const [erroForm, setErroForm] = useState("");

  const sincronizar = () => {
    setAtivo(obterWorkspaceAtivo());
    setWorkspaces(listarWorkspaces());
  };

  useEffect(() => {
    window.addEventListener(EVENTO_WORKSPACE_ALTERADO, sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(EVENTO_WORKSPACE_ALTERADO, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  // Fecha menu ao clicar fora
  useEffect(() => {
    const aoClicarFora = (e: MouseEvent) => {
      if (refMenu.current && !refMenu.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    };
    if (menuAberto) {
      document.addEventListener("mousedown", aoClicarFora);
    }
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [menuAberto]);

  const aoSelecionar = (id: string) => {
    if (id === ativo.id) {
      setMenuAberto(false);
      return;
    }
    alternarWorkspace(id);
    setMenuAberto(false);
  };

  const aoCriarWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoOwner.trim() || !novoRepo.trim()) {
      setErroForm("Preencha o nome do espaço, dono e nome do repositório.");
      return;
    }

    const idGerado = `ws_${Date.now().toString(36)}`;
    const novoWs: WorkspaceConfig = {
      id: idGerado,
      nome: novoNome.trim(),
      tipo: novoTipo,
      repoOwner: novoOwner.trim(),
      repoName: novoRepo.trim(),
      branch: novaBranch.trim() || "main",
      cor: novoTipo === "equipe" ? "#10b981" : "#6366f1",
    };

    salvarWorkspace(novoWs);
    alternarWorkspace(idGerado);
    setModalNovoAberto(false);
    setNovoNome("");
    setNovoOwner("");
    setNovoRepo("");
    setNovaBranch("main");
    setErroForm("");
  };

  const IconeAtivo = ativo.tipo === "equipe" ? Users : User;

  return (
    <div className={cn("relative inline-block text-left", className)} ref={refMenu}>
      {/* Botão Gatilho */}
      <button
        type="button"
        onClick={() => setMenuAberto((v) => !v)}
        title={`Espaço atual: ${ativo.nome}`}
        className={cn(
          "flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border/40 text-xs font-medium transition-all duration-200 cursor-pointer select-none",
          "bg-background/80 hover:bg-accent/60 backdrop-blur-md shadow-sm hover:shadow",
          ativo.tipo === "equipe"
            ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            : "text-foreground border-border/40",
          compacto && "px-2 py-2"
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded-lg shrink-0",
            ativo.tipo === "equipe"
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
          )}
        >
          <IconeAtivo size={13} />
        </span>

        {!compacto && (
          <>
            <span className="truncate max-w-[130px] font-semibold tracking-tight text-left">
              {ativo.nome}
            </span>
            <ChevronDown size={12} className={cn("opacity-60 transition-transform", menuAberto && "rotate-180")} />
          </>
        )}
      </button>

      {/* Menu Dropdown Flutuante */}
      {menuAberto && (
        <div className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-card border border-border/60 shadow-xl backdrop-blur-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
            Espaços de Trabalho
          </div>

          <div className="py-1 max-h-60 overflow-y-auto">
            {workspaces.map((ws) => {
              const IconeItem = ws.tipo === "equipe" ? Users : User;
              const ehAtivo = ws.id === ativo.id;

              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => aoSelecionar(ws.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left",
                    ehAtivo ? "bg-accent/70 font-semibold text-foreground" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs",
                        ws.tipo === "equipe"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                      )}
                    >
                      <IconeItem size={13} />
                    </span>
                    <div className="truncate">
                      <div className="truncate text-[13px] font-medium leading-tight">{ws.nome}</div>
                      <div className="text-[10px] text-muted-foreground truncate opacity-70">
                        {ws.repoOwner}/{ws.repoName}
                      </div>
                    </div>
                  </div>

                  {ehAtivo && <Check size={14} className="text-primary shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Rodapé de Ações do Dropdown */}
          <div className="border-t border-border/40 p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setMenuAberto(false);
                setModalNovoAberto(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Adicionar Espaço da Equipe</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Criar Novo Workspace */}
      {modalNovoAberto && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border/70 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FolderGit2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Conectar Novo Espaço</h3>
                <p className="text-xs text-muted-foreground">Adicione o repositório compartilhado da sua equipe.</p>
              </div>
            </div>

            {erroForm && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl">
                {erroForm}
              </div>
            )}

            <form onSubmit={aoCriarWorkspace} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Nome do Espaço
                </label>
                <input
                  type="text"
                  placeholder="Ex: Estúdio Criativo, Time Marketing..."
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Tipo
                  </label>
                  <select
                    value={novoTipo}
                    onChange={(e) => setNovoTipo(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="equipe">👥 Equipe</option>
                    <option value="pessoal">👤 Pessoal</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Branch
                  </label>
                  <input
                    type="text"
                    placeholder="main"
                    value={novaBranch}
                    onChange={(e) => setNovaBranch(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Dono no GitHub
                  </label>
                  <input
                    type="text"
                    placeholder="ex: empresa ou usuario"
                    value={novoOwner}
                    onChange={(e) => setNovoOwner(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Repositório
                  </label>
                  <input
                    type="text"
                    placeholder="ex: segundo-cerebro-dados"
                    value={novoRepo}
                    onChange={(e) => setNovoRepo(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  Salvar e Alternar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
