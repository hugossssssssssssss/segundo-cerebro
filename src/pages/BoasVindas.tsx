/**
 * Passo a passo de primeira execução (Onboarding) do Klaus.
 *
 * Apresenta as funcionalidades do app para profissionais criativos e
 * guia a configuração do repositório privado do GitHub e da chave Gemini
 * com total clareza, validações inteligentes e sem jargões técnicos.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FolderGit2,
  KeyRound,
  Sparkles,
  UserRound,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  FileText,
  CheckSquare,
  Image as ImageIcon,
  Target,
  Network,
  Bot,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import {
  lerConfig,
  salvarConfig,
  configCompleta,
  type Settings,
} from "@/lib/settings";
import { testarConexao } from "@/lib/github";
import { criarKitInicial } from "@/lib/starterKit";
import { Botao, Campo, Rotulo, Aviso } from "@/components/ui";
import { LogoKlaus } from "@/components/LogoKlaus";

/** Os passos do Onboarding, na ordem. */
const PASSOS = [
  { id: "tour", rotulo: "Conhecer", Icone: Sparkles },
  { id: "voce", rotulo: "Perfil", Icone: UserRound },
  { id: "repo", rotulo: "Repositório", Icone: FolderGit2 },
  { id: "token", rotulo: "Acesso", Icone: KeyRound },
  { id: "gemini", rotulo: "IA", Icone: Bot },
  { id: "pronto", rotulo: "Pronto", Icone: CheckCircle2 },
] as const;

/** Sugestões rápidas de profissão para 1-clique */
const SUGESTOES_PROFISSAO = [
  "Design Gráfico",
  "UI/UX Design",
  "Direção de Arte",
  "Branding & Identidade",
  "Marketing & Mídia",
  "Desenvolvimento",
  "Audiovisual",
];

export default function BoasVindas() {
  const navegar = useNavigate();
  const [cfg, setCfg] = useState<Settings>(lerConfig);
  const [passo, setPasso] = useState(0);
  const [testando, setTestando] = useState(false);
  const [verToken, setVerToken] = useState(false);
  const [verGemini, setVerGemini] = useState(false);
  const [copiadoRepo, setCopiadoRepo] = useState(false);
  const [gerarExemplos, setGerarExemplos] = useState(true);
  const [concluindo, setConcluindo] = useState(false);
  const [resultado, setResultado] = useState<{
    ok: boolean;
    texto: string;
    dica?: string;
  } | null>(null);

  const atualizar = (campo: keyof Settings, valor: string) => {
    // Autodetecção inteligente: se colar URL do GitHub em repoOwner ou repoName
    if (campo === "repoOwner" || campo === "repoName") {
      const match = valor.match(/github\.com[/:]([^/]+)\/([^/#?]+)/);
      if (match) {
        const dono = match[1].trim();
        const repo = match[2].replace(/\.git$/, "").trim();
        setCfg((c) => ({ ...c, repoOwner: dono, repoName: repo }));
        setResultado(null);
        return;
      }
    }

    setCfg((c) => ({ ...c, [campo]: valor }));
    setResultado(null);
  };

  /** Copia o nome sugerido do repositório para a área de transferência */
  const copiarNomeRepo = async () => {
    try {
      await navigator.clipboard.writeText("segundo-cerebro-dados");
      setCopiadoRepo(true);
      setTimeout(() => setCopiadoRepo(false), 2000);
      if (!cfg.repoName) {
        atualizar("repoName", "segundo-cerebro-dados");
      }
    } catch {
      // Fallback simples
      if (!cfg.repoName) {
        atualizar("repoName", "segundo-cerebro-dados");
      }
    }
  };

  /** Salva e navega para outro passo */
  const irPara = (indice: number) => {
    setCfg(salvarConfig(cfg));
    setPasso(Math.max(0, Math.min(PASSOS.length - 1, indice)));
  };

  /** Testa a conexão com o GitHub */
  async function testar() {
    const limpa = salvarConfig(cfg);
    setCfg(limpa);
    setTestando(true);
    setResultado(null);

    if (!limpa.githubToken || !limpa.repoOwner || !limpa.repoName) {
      setResultado({
        ok: false,
        texto: "Preencha o repositório e o token antes de testar.",
      });
      setTestando(false);
      return;
    }

    const r = await testarConexao(limpa);
    if (r.ok) {
      setResultado({
        ok: true,
        texto: `Conectado com sucesso em ${r.repo}!`,
      });
    } else {
      let dica = "";
      if (r.erro.includes("404") || r.erro.includes("não encontrado")) {
        dica = "Dica: Verifique se o nome do repositório está idêntico e se o token tem permissão 'Only select repositories' apontando para ele.";
      } else if (r.erro.includes("401") || r.erro.includes("credenciais")) {
        dica = "Dica: Seu token pode ter expirado ou contém caracteres inválidos.";
      }
      setResultado({
        ok: false,
        texto: r.erro,
        dica,
      });
    }
    setTestando(false);
  }

  /** Conclui o onboarding e vai para a Home */
  async function encerrar() {
    setConcluindo(true);
    const configFinal = salvarConfig({ ...cfg, onboardingConcluido: true });

    if (gerarExemplos && configCompleta(configFinal)) {
      try {
        await criarKitInicial(configFinal);
      } catch {
        // Prossegue mesmo se a gravação de exemplos falhar
      }
    }

    navegar("/home", { replace: true });
  }

  // ───────────────────────────────────────────────────────────── Conteúdos dos Passos
  const conteudo = [
    // ────────────────────────────────────────────────── 0. Conhecer o Klaus
    <div key="tour" className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Sparkles size={13} />
          Seu Novo Centro Criativo
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Bem-vindo ao Klaus
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O Klaus é o seu segundo cérebro digital: um ambiente integrado para organizar ideias, projetos, referências visuais e metas sem fricção.
        </p>
      </div>

      {/* Grade de Recursos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-card/50 hover:bg-card/90 transition-colors space-y-1.5">
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
            <FileText size={16} />
            <span>Notas & @Menções</span>
          </div>
          <p className="text-xs text-muted-foreground leading-normal">
            Conecte pensamentos e projetos em Markdown bidirecional com retrocompatibilidade total.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/50 hover:bg-card/90 transition-colors space-y-1.5">
          <div className="flex items-center gap-2 text-blue-500 font-semibold text-sm">
            <CheckSquare size={16} />
            <span>Tarefas & Pomodoro</span>
          </div>
          <p className="text-xs text-muted-foreground leading-normal">
            Listas Kanban, prioridades, subtarefas e cronômetro de foco direto na sua rotina.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/50 hover:bg-card/90 transition-colors space-y-1.5">
          <div className="flex items-center gap-2 text-pink-500 font-semibold text-sm">
            <ImageIcon size={16} />
            <span>Referências Visuais</span>
          </div>
          <p className="text-xs text-muted-foreground leading-normal">
            Mural com extração automática de paletas de cor HEX e tags para seus projetos de design.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/50 hover:bg-card/90 transition-colors space-y-1.5">
          <div className="flex items-center gap-2 text-teal-500 font-semibold text-sm">
            <Target size={16} />
            <span>Plano de Carreira (PDI)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-normal">
            Metas trimestrais, entregas mensuráveis e acompanhamento visual do seu progresso.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/50 hover:bg-card/90 transition-colors space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-500 font-semibold text-sm">
            <Network size={16} />
            <span>Grafo & Lousas</span>
          </div>
          <p className="text-xs text-muted-foreground leading-normal">
            Mapa neural 3D das conexões e lousas infinitas para desenhar e rascunhar.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/50 hover:bg-card/90 transition-colors space-y-1.5">
          <div className="flex items-center gap-2 text-purple-500 font-semibold text-sm">
            <Bot size={16} />
            <span>Assistente IA Gemini</span>
          </div>
          <p className="text-xs text-muted-foreground leading-normal">
            IA inteligente sob sua aprovação, resumindo documentos e sugerindo melhorias.
          </p>
        </div>
      </div>

      {/* Pilares do App */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
        <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
          <strong className="text-foreground font-semibold block">
            100% sob seu controle e custo zero
          </strong>
          Seus dados vivem num repositório <strong>privado seu</strong> no GitHub em arquivos comuns (.md). Não há banco de dados proprietário e você nunca fica refém de uma plataforma.
        </div>
      </div>
    </div>,

    // ────────────────────────────────────────────────── 1. Perfil do Usuário
    <div key="voce" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Como devemos te chamar?
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Essas informações são opcionais e servem para assinar suas anotações e calibrar o tom das respostas do assistente.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Rotulo dica="Seu primeiro nome ou como prefere ser chamado.">
            Seu Nome
          </Rotulo>
          <Campo
            value={cfg.nomeUsuario}
            onChange={(e) => atualizar("nomeUsuario", e.target.value)}
            placeholder="Ex: Hugo Silva"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Rotulo dica="Com o que você trabalha atualmente.">
            Sua Área de Atuação / Profissão
          </Rotulo>
          <Campo
            value={cfg.profissaoUsuario}
            onChange={(e) => atualizar("profissaoUsuario", e.target.value)}
            placeholder="Ex: Design Gráfico"
          />

          {/* Chips de seleção rápida */}
          <div className="pt-1">
            <span className="text-[11px] text-muted-foreground block mb-1.5">
              Sugestões rápidas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SUGESTOES_PROFISSAO.map((prof) => (
                <button
                  key={prof}
                  type="button"
                  onClick={() => atualizar("profissaoUsuario", prof)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                    cfg.profissaoUsuario === prof
                      ? "border-primary bg-primary text-primary-foreground font-medium"
                      : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {prof}
                </button>
              ))}
            </div>
          </div>
        </div>

        {cfg.nomeUsuario?.trim() && (
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles size={14} className="text-primary shrink-0" />
            <span>
              Muito prazer, <strong className="text-foreground">{cfg.nomeUsuario}</strong>! Vamos configurar seu cofre de dados.
            </span>
          </div>
        )}
      </div>
    </div>,

    // ────────────────────────────────────────────────── 2. Repositório GitHub
    <div key="repo" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Onde seus dados vão morar
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Crie um repositório <strong>privado</strong> no GitHub para guardar suas notas e tarefas. É seguro, gratuito e acessível de qualquer lugar.
        </p>
      </div>

      {/* Guia Rápido */}
      <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
        <ol className="space-y-2 text-xs text-muted-foreground list-decimal pl-4">
          <li>
            Abra a página de criação de repositório no GitHub.
          </li>
          <li className="flex flex-wrap items-center gap-1.5">
            <span>No campo <strong>Repository name</strong>, use</span>
            <code className="px-1.5 py-0.5 rounded bg-card border border-border text-foreground font-semibold">
              segundo-cerebro-dados
            </code>
            <button
              type="button"
              onClick={copiarNomeRepo}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline ml-1"
            >
              {copiadoRepo ? <Check size={12} /> : <Copy size={12} />}
              {copiadoRepo ? "Copiado!" : "Copiar nome"}
            </button>
          </li>
          <li>
            Selecione <strong className="text-foreground">Private</strong> (privado) para garantir total sigilo dos seus dados.
          </li>
          <li>Clique em <strong>Create repository</strong> e volte aqui.</li>
        </ol>

        <a
          href="https://github.com/new?name=segundo-cerebro-dados"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-1"
        >
          Criar repositório no GitHub <ExternalLink size={12} />
        </a>
      </div>

      <div className="space-y-3">
        <div>
          <Rotulo
            obrigatorio
            faltando={!cfg.repoOwner}
            dica="Seu nome de usuário no GitHub (ex: hugos)."
          >
            Seu Usuário do GitHub
          </Rotulo>
          <Campo
            value={cfg.repoOwner}
            onChange={(e) => atualizar("repoOwner", e.target.value)}
            placeholder="Ex: hugos"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div>
          <Rotulo
            obrigatorio
            faltando={!cfg.repoName}
            dica="O nome exato do repositório criado."
          >
            Nome do Repositório
          </Rotulo>
          <Campo
            value={cfg.repoName}
            onChange={(e) => atualizar("repoName", e.target.value)}
            placeholder="segundo-cerebro-dados"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <p className="text-[11px] text-muted-foreground">
          💡 Dica: Se preferir, cole a URL completa do repositório em qualquer um dos campos que preenchemos automaticamente.
        </p>
      </div>
    </div>,

    // ────────────────────────────────────────────────── 3. Token de Acesso
    <div key="token" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Chave de Acesso do GitHub
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O token autoriza este navegador a ler e gravar seus arquivos. Criamos um token restrito exclusivamente ao seu repositório de dados.
        </p>
      </div>

      {/* Instruções para Fine-Grained Token */}
      <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3 text-xs text-muted-foreground">
        <ol className="space-y-1.5 list-decimal pl-4">
          <li>Clique no link abaixo para criar um <strong>Fine-grained token</strong>.</li>
          <li>
            Em <strong className="text-foreground">Repository access</strong>: selecione <em>Only select repositories</em> e escolha{" "}
            <code className="text-foreground font-semibold">
              {cfg.repoName || "segundo-cerebro-dados"}
            </code>.
          </li>
          <li>
            Em <strong className="text-foreground">Permissions</strong> → <strong>Repository permissions</strong>: encontre{" "}
            <strong className="text-foreground">Contents</strong> e marque <strong className="text-foreground">Read and write</strong>.
          </li>
          <li>Gere o token, copie e cole no campo abaixo.</li>
        </ol>

        <a
          href="https://github.com/settings/personal-access-tokens/new"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-1"
        >
          Gerar Token no GitHub <ExternalLink size={12} />
        </a>
      </div>

      <div className="space-y-3">
        <div>
          <Rotulo obrigatorio faltando={!cfg.githubToken}>
            Token do GitHub (Personal Access Token)
          </Rotulo>
          <div className="relative flex items-center">
            <Campo
              type={verToken ? "text" : "password"}
              value={cfg.githubToken}
              onChange={(e) => atualizar("githubToken", e.target.value)}
              placeholder="github_pat_..."
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="pr-10 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setVerToken(!verToken)}
              className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
              title={verToken ? "Ocultar token" : "Exibir token"}
            >
              {verToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <Botao
            variante="neutro"
            onClick={testar}
            disabled={testando || !cfg.githubToken}
            className="w-full sm:w-auto"
          >
            {testando ? "Testando conexão…" : "Testar Conexão"}
          </Botao>

          {resultado && (
            <div
              className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border ${
                resultado.ok
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}
            >
              {resultado.ok ? (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              ) : (
                <XCircle size={16} className="shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-semibold block">{resultado.texto}</span>
                {resultado.dica && (
                  <span className="text-[11px] opacity-90 block">
                    {resultado.dica}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Aviso>
        <strong>Privacidade garantida:</strong> Seu token é armazenado exclusivamente no armazenamento local deste navegador e nunca é enviado para nenhum outro servidor além da API oficial do GitHub.
      </Aviso>
    </div>,

    // ────────────────────────────────────────────────── 4. IA Gemini (Opcional)
    <div key="gemini" className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold">
          <Bot size={13} />
          Inteligência Artificial Opcional
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Turbine com o Google Gemini
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Adicione uma chave gratuita da API Gemini para habilitar o assistente de chat, sugestões automáticas de tags, resumo de notas e leitura inteligente de imagens.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Rotulo dica="Chave de API obtida no Google AI Studio (plano gratuito disponível).">
            Chave de API do Gemini (opcional)
          </Rotulo>
          <div className="relative flex items-center">
            <Campo
              type={verGemini ? "text" : "password"}
              value={cfg.geminiKey}
              onChange={(e) => atualizar("geminiKey", e.target.value)}
              placeholder="AIzaSy..."
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="pr-10 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setVerGemini(!verGemini)}
              className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
              title={verGemini ? "Ocultar chave" : "Exibir chave"}
            >
              {verGemini ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
          >
            Obter chave gratuita no Google AI Studio <ExternalLink size={12} />
          </a>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-1 text-xs text-muted-foreground">
          <strong className="text-foreground font-medium block">
            Não quer configurar agora?
          </strong>
          Sem problemas! O Klaus é 100% funcional sem IA. Você pode adicionar ou alterar sua chave a qualquer momento em <strong>Ajustes</strong>.
        </div>
      </div>
    </div>,

    // ────────────────────────────────────────────────── 5. Pronto & Kit Inicial
    <div key="pronto" className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <CheckCircle2 size={13} />
          {configCompleta(cfg) ? "Configuração Concluída" : "Quase Pronto"}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {configCompleta(cfg) ? "Seu Segundo Cérebro está pronto!" : "Finalizando a configuração"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {configCompleta(cfg)
            ? "Tudo configurado para você começar a criar, organizar e focar."
            : "Você pode começar agora mesmo e ajustar os detalhes de conexão depois pela tela de Ajustes."}
        </p>
      </div>

      {/* Resumo da Configuração */}
      <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2.5 text-xs">
        <div className="flex items-center justify-between py-1 border-b border-border">
          <span className="text-muted-foreground">Usuário:</span>
          <span className="font-medium text-foreground">{cfg.nomeUsuario || "Não informado"}</span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-border">
          <span className="text-muted-foreground">Repositório:</span>
          <span className="font-medium text-foreground">
            {cfg.repoOwner && cfg.repoName ? `${cfg.repoOwner}/${cfg.repoName}` : "Pendente"}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-border">
          <span className="text-muted-foreground">Token GitHub:</span>
          <span className="font-medium text-foreground">
            {cfg.githubToken ? "Configurado ✓" : "Pendente"}
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-muted-foreground">Assistente IA:</span>
          <span className="font-medium text-foreground">
            {cfg.geminiKey ? "Ativo ✓" : "Opcional (Desativado)"}
          </span>
        </div>
      </div>

      {/* Opção de Kit Inicial */}
      {configCompleta(cfg) && (
        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
          <input
            type="checkbox"
            checked={gerarExemplos}
            onChange={(e) => setGerarExemplos(e.target.checked)}
            className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
          />
          <div className="space-y-0.5 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Wand2 size={13} className="text-primary" />
              Criar Kit de Início do Klaus (Recomendado)
            </span>
            <p className="text-muted-foreground leading-normal">
              Gera automaticamente um tutorial interativo de @menções, uma lista de primeiras tarefas e uma meta de exemplo para você experimentar imediatamente.
            </p>
          </div>
        </label>
      )}
    </div>,
  ][passo];

  const ultimo = passo === PASSOS.length - 1;

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center px-4 py-8 sm:py-12 animate-in fade-in duration-300">
      <div className="w-full max-w-lg space-y-6">
        {/* Topo: Logo & Ação de Pular */}
        <div className="flex items-center justify-between gap-4">
          <LogoKlaus tamanho={32} comTexto />
          <button
            onClick={encerrar}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Configurar depois
          </button>
        </div>

        {/* Trilha de Progresso Visual e Clicável */}
        <div className="space-y-2">
          <ol className="flex items-center gap-2" aria-label="Progresso do Onboarding">
            {PASSOS.map((p, i) => {
              const ativo = i === passo;
              const concluido = i < passo;
              const Icone = p.Icone;

              return (
                <li key={p.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => irPara(i)}
                    className={`w-full group text-left focus:outline-none`}
                    title={`Ir para ${p.rotulo}`}
                  >
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        concluido
                          ? "bg-primary"
                          : ativo
                          ? "bg-primary ring-2 ring-primary/30"
                          : "bg-border"
                      }`}
                    />
                    <div className="hidden sm:flex items-center gap-1 mt-1 text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      <Icone size={12} className={ativo ? "text-primary" : ""} />
                      <span className={ativo ? "text-foreground font-semibold" : ""}>
                        {p.rotulo}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Cartão de Conteúdo Central */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 sm:p-8 shadow-sm">
          {conteudo}
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between gap-3">
          {passo > 0 ? (
            <Botao variante="fantasma" onClick={() => irPara(passo - 1)}>
              <ArrowLeft size={16} />
              Voltar
            </Botao>
          ) : (
            <span />
          )}

          {ultimo ? (
            <Botao onClick={encerrar} disabled={concluindo} className="shadow-md">
              {concluindo ? (
                "Inicializando..."
              ) : (
                <>
                  Começar a Usar o Klaus
                  <ArrowRight size={16} />
                </>
              )}
            </Botao>
          ) : (
            <Botao onClick={() => irPara(passo + 1)} className="shadow-sm">
              {passo === 0 ? "Começar Apresentação" : "Continuar"}
              <ArrowRight size={16} />
            </Botao>
          )}
        </div>
      </div>
    </div>
  );
}
