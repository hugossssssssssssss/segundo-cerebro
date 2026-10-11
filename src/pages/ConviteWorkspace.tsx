import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  FolderGit2,
  GitBranch,
  KeyRound,
  ExternalLink,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import {
  decodificarConviteWorkspace,
  salvarWorkspace,
  alternarWorkspace,
  obterTokenGlobalBase,
  type WorkspaceConfig,
} from "@/lib/klausWorkspaces";
import { lerConfig, salvarConfig } from "@/lib/settings";
import { testarConexao } from "@/lib/github";
import { obterPerfilUsuario } from "@/lib/usuario";
import { toast } from "@/lib/toast";
import { Botao, Campo, Cartao, Rotulo, Aviso, Carregando } from "@/components/ui";

export default function ConviteWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();

  // Lê payload codificado da query string ?dados=... ou hash #invite=...
  const convite = useMemo(() => {
    const search = new URLSearchParams(location.search);
    const dadosQuery = search.get("dados") || search.get("invite");
    if (dadosQuery) {
      return decodificarConviteWorkspace(dadosQuery);
    }

    // Suporte caso venha em formato hash direto #invite=...
    if (window.location.hash.includes("invite=")) {
      const match = window.location.hash.match(/invite=([^&]+)/);
      if (match && match[1]) {
        return decodificarConviteWorkspace(match[1]);
      }
    }
    return null;
  }, [location.search]);

  const tokenExistente = useMemo(() => {
    const cfg = lerConfig();
    return cfg.githubToken?.trim() || obterTokenGlobalBase() || "";
  }, []);

  const [usarTokenExistente, setUsarTokenExistente] = useState(Boolean(tokenExistente));
  const [tokenDigitado, setTokenDigitado] = useState(tokenExistente || "");
  const [verToken, setVerToken] = useState(false);
  const [validando, setValidando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!convite) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Cartao className="max-w-md w-full p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-foreground">Convite Inválido ou Incompleto</h2>
          <p className="text-sm text-muted-foreground">
            O link de convite para este espaço de trabalho parece incorreto ou corrompido.
            Peça ao administrador para gerar um novo link de compartilhamento.
          </p>
          <div className="pt-2">
            <Botao variante="primario" onClick={() => navigate("/home")} className="w-full">
              Ir para o Início
            </Botao>
          </div>
        </Cartao>
      </div>
    );
  }

  const corTema = convite.cor || "#10b981";
  const urlCriarToken = `https://github.com/settings/tokens/new?scopes=repo&description=Klaus%20-%20${encodeURIComponent(convite.nome)}`;

  const lidarEntrarNoEspaço = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokenFinal = (usarTokenExistente ? tokenExistente : tokenDigitado).trim();

    if (!tokenFinal) {
      setErro("Insira seu token do GitHub para acessar este repositório.");
      return;
    }

    setValidando(true);
    setErro(null);

    try {
      const cfgTeste = {
        ...lerConfig(),
        repoOwner: convite.repoOwner,
        repoName: convite.repoName,
        branch: convite.branch || "main",
        githubToken: tokenFinal,
      };

      // 1. Testa permissão real de acesso ao repositório
      await testarConexao(cfgTeste);

      // 2. Busca perfil do usuário no GitHub para boas-vindas
      const perfil = await obterPerfilUsuario({ githubToken: tokenFinal });

      // 3. Monta e salva o novo workspace no navegador
      const novoWs: WorkspaceConfig = {
        id: convite.id || `ws_${Date.now().toString(36)}`,
        nome: convite.nome,
        tipo: convite.tipo || "equipe",
        repoOwner: convite.repoOwner,
        repoName: convite.repoName,
        branch: convite.branch || "main",
        githubToken: tokenFinal,
        cor: corTema,
        icone: convite.icone || "Users",
      };

      salvarWorkspace(novoWs);
      alternarWorkspace(novoWs.id);

      // Atualiza também as configurações ativas
      const configAtual = lerConfig();
      salvarConfig({
        ...configAtual,
        repoOwner: convite.repoOwner,
        repoName: convite.repoName,
        branch: convite.branch || "main",
        githubToken: tokenFinal,
      });

      toast(
        perfil?.nome
          ? `Bem-vindo ao espaço ${convite.nome}, ${perfil.nome}!`
          : `Bem-vindo ao espaço ${convite.nome}!`,
        { tipo: "sucesso" }
      );

      navigate("/home");
    } catch (err: any) {
      setErro(
        err?.message ||
          "Não foi possível conectar ao repositório. Verifique se seu token tem permissão de colaborador."
      );
    } finally {
      setValidando(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Cartao className="max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-xl border-border/80">
        {/* Cabeçalho do Convite com Identidade Visual */}
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md"
            style={{ backgroundColor: corTema }}
          >
            <Users size={32} />
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-0.5 rounded-full bg-secondary">
              Convite de Espaço de Trabalho
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mt-2">
              {convite.nome}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Convidado por <strong className="text-foreground">@{convite.convidadoPor || convite.repoOwner}</strong> para colaborar neste repositório.
            </p>
          </div>
        </div>

        {/* Resumo do Repositório */}
        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 text-xs space-y-1.5 font-mono">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5 font-sans font-medium text-foreground">
              <FolderGit2 size={13} className="text-primary" /> Repositório:
            </span>
            <span className="text-foreground font-semibold">
              {convite.repoOwner}/{convite.repoName}
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5 font-sans font-medium text-foreground">
              <GitBranch size={13} className="text-primary" /> Branch:
            </span>
            <span>{convite.branch || "main"}</span>
          </div>
        </div>

        {erro && <Aviso tom="erro">{erro}</Aviso>}

        {/* Formulário de Acesso e Token */}
        <form onSubmit={lidarEntrarNoEspaço} className="space-y-4">
          {tokenExistente && (
            <div className="p-3 rounded-xl border border-border/60 bg-card space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={usarTokenExistente}
                  onChange={(e) => setUsarTokenExistente(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <UserCheck size={16} className="text-emerald-500 shrink-0" />
                <span>Usar meu token do GitHub já configurado neste navegador</span>
              </label>
              <p className="text-[11px] text-muted-foreground pl-6">
                Você já possui um token conectado no Klaus. Se ele tiver permissão de colaborador neste repositório, basta continuar.
              </p>
            </div>
          )}

          {!usarTokenExistente && (
            <div className="space-y-3">
              <div>
                <Rotulo dica="Gere um token clássico com escopo 'repo' ou um Fine-Grained token com permissão de Contents no repositório.">
                  Seu Token de Acesso Pessoal (GitHub PAT)
                </Rotulo>

                <div className="relative flex items-center">
                  <Campo
                    type={verToken ? "text" : "password"}
                    value={tokenDigitado}
                    onChange={(e) => setTokenDigitado(e.target.value)}
                    placeholder="ghp_..."
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="pr-10 font-mono text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setVerToken(!verToken)}
                    className="absolute right-0 h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={verToken ? "Ocultar token" : "Exibir token"}
                  >
                    {verToken ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Botão de 1 clique para gerar token no GitHub */}
              <div className="flex items-center justify-between text-xs pt-1">
                <a
                  href={urlCriarToken}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                >
                  <KeyRound size={13} /> Gerar token no GitHub com 1 clique <ExternalLink size={11} />
                </a>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                <span>
                  O Klaus é 100% estático e não possui servidores. Seu token fica gravado exclusivamente neste navegador para falar direto com o GitHub.
                </span>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Botao
              type="submit"
              variante="primario"
              disabled={validando}
              className="w-full flex items-center justify-center gap-2 cursor-pointer h-11"
            >
              {validando ? (
                <>
                  <Carregando texto="Validando acesso ao repositório..." />
                </>
              ) : (
                <>
                  <span>Entrar e Sincronizar Espaço</span>
                  <ArrowRight size={16} />
                </>
              )}
            </Botao>
          </div>
        </form>
      </Cartao>
    </div>
  );
}
