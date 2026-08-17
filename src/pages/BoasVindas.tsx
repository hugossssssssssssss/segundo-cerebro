/**
 * Passo a passo de primeira execução.
 *
 * Existe porque o app não tem servidor: sem um repositório e um token que a
 * própria pessoa cria, ele não consegue ler nem gravar nada. Jogar alguém
 * direto na tela de Ajustes, com nove campos de uma vez, faz a pessoa
 * desistir antes do primeiro salvamento — então aqui cada tela pede uma
 * coisa só, na ordem em que o GitHub exige que sejam criadas.
 *
 * Roda fora da estrutura do app (sem barra lateral) de propósito: nada do
 * menu funciona antes da conexão existir, e um menu inerte só confunde.
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
} from "lucide-react";
import {
  lerConfig,
  salvarConfig,
  configCompleta,
  type Settings,
} from "@/lib/settings";
import { testarConexao } from "@/lib/github";
import { Botao, Campo, Rotulo, Aviso } from "@/components/ui";
import { LogoKlaus } from "@/components/LogoKlaus";

/** Os passos, na ordem. O rótulo aparece na trilha de progresso. */
const PASSOS = [
  { id: "inicio", rotulo: "Início", Icone: Sparkles },
  { id: "voce", rotulo: "Você", Icone: UserRound },
  { id: "repo", rotulo: "Repositório", Icone: FolderGit2 },
  { id: "token", rotulo: "Acesso", Icone: KeyRound },
  { id: "pronto", rotulo: "Pronto", Icone: CheckCircle2 },
] as const;

export default function BoasVindas() {
  const navegar = useNavigate();
  const [cfg, setCfg] = useState<Settings>(lerConfig);
  const [passo, setPasso] = useState(0);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<
    { ok: boolean; texto: string } | null
  >(null);

  const atualizar = (campo: keyof Settings, valor: string) => {
    setCfg((c) => ({ ...c, [campo]: valor }));
    setResultado(null);
  };

  /**
   * Grava a cada troca de tela em vez de só no fim.
   *
   * Criar o token exige sair do app e ir ao github.com. Se o que já foi
   * digitado só existisse na memória do componente, essa ida e volta —
   * ou um toque errado no botão de voltar do celular — apagaria tudo.
   */
  const irPara = (indice: number) => {
    setCfg(salvarConfig(cfg));
    setPasso(Math.max(0, Math.min(PASSOS.length - 1, indice)));
  };

  async function testar() {
    const limpa = salvarConfig(cfg);
    setCfg(limpa);
    setTestando(true);
    setResultado(null);
    const r = await testarConexao(limpa);
    setResultado(
      r.ok
        ? { ok: true, texto: `Conectado em ${r.repo}. Está tudo certo.` }
        : { ok: false, texto: r.erro },
    );
    setTestando(false);
  }

  /** Sai do passo a passo para sempre — tanto no "Concluir" quanto no "pular". */
  function encerrar() {
    salvarConfig({ ...cfg, onboardingConcluido: true });
    navegar("/home", { replace: true });
  }

  const conteudo = [
    // ---------------------------------------------------------------- Início
    <div key="inicio" className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bem-vindo ao Klaus
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Suas tarefas, notas e referências viram arquivos de texto comuns,
          guardados num repositório privado <strong>seu</strong> no GitHub. Não
          existe servidor no meio: este site fala direto com a sua conta.
        </p>
      </div>

      <ul className="space-y-2.5 text-sm">
        {[
          "Os arquivos são seus e abrem em qualquer editor, mesmo sem este app",
          "Nada se perde: cada alteração fica no histórico do repositório",
          "Custo zero — GitHub gratuito e a camada grátis do Gemini",
        ].map((t) => (
          <li key={t} className="flex gap-2.5">
            <CheckCircle2
              size={17}
              className="mt-0.5 shrink-0 text-[var(--success)]"
            />
            <span className="text-muted-foreground">{t}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted-foreground">
        A configuração leva uns três minutos e é feita uma vez por aparelho.
        Você vai precisar de uma conta no GitHub — criar é gratuito.
      </p>
    </div>,

    // ------------------------------------------------------------------ Você
    <div key="voce" className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Como devemos te chamar?
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Os dois campos são opcionais. Servem para o app assinar o que você
          cria e para o assistente falar a sua língua em vez de despejar jargão
          técnico.
        </p>
      </div>

      <div>
        <Rotulo dica="Aparece no campo “criado por” dos seus itens.">
          Seu nome
        </Rotulo>
        <Campo
          value={cfg.nomeUsuario}
          onChange={(e) => atualizar("nomeUsuario", e.target.value)}
          placeholder="Maria Souza"
          autoFocus
        />
      </div>

      <div>
        <Rotulo dica="Com o que você trabalha. Ex: design gráfico, direito, enfermagem.">
          Sua área
        </Rotulo>
        <Campo
          value={cfg.profissaoUsuario}
          onChange={(e) => atualizar("profissaoUsuario", e.target.value)}
          placeholder="design gráfico"
        />
      </div>
    </div>,

    // ------------------------------------------------------------ Repositório
    <div key="repo" className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Onde seus dados vão morar
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Crie um repositório <strong>privado</strong> e vazio na sua conta do
          GitHub. É a pasta onde cada nota e cada tarefa vira um arquivo.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-3">
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-4">
          <li>Abra o link abaixo</li>
          <li>
            Em <strong className="text-foreground">Repository name</strong>,
            escreva <code className="text-foreground">segundo-cerebro-dados</code>
          </li>
          <li>
            Marque <strong className="text-foreground">Private</strong> — este é
            o passo que mantém suas anotações fora do alcance de estranhos
          </li>
          <li>Clique em Create repository e volte para cá</li>
        </ol>
        <a
          href="https://github.com/new?name=segundo-cerebro-dados"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Criar o repositório no GitHub <ExternalLink size={13} />
        </a>
      </div>

      <div>
        <Rotulo
          obrigatorio
          faltando={!cfg.repoOwner}
          dica="Seu usuário do GitHub, exatamente como aparece no perfil."
        >
          Sua conta
        </Rotulo>
        <Campo
          value={cfg.repoOwner}
          onChange={(e) => atualizar("repoOwner", e.target.value)}
          placeholder="mariasouza"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      <div>
        <Rotulo
          obrigatorio
          faltando={!cfg.repoName}
          dica="O nome exato que você deu ao repositório."
        >
          Repositório dos dados
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
    </div>,

    // ----------------------------------------------------------------- Token
    <div key="token" className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          A chave de acesso
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O token é o que autoriza este site a gravar no seu repositório. Crie
          um <strong>fine-grained</strong> e dê a ele o mínimo: um repositório,
          uma permissão.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-3">
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-4">
          <li>Abra o link abaixo</li>
          <li>
            <strong className="text-foreground">Repository access</strong> →
            Only select repositories → escolha{" "}
            <code className="text-foreground">
              {cfg.repoName || "segundo-cerebro-dados"}
            </code>
          </li>
          <li>
            <strong className="text-foreground">Permissions</strong> →
            Repository permissions → <strong className="text-foreground">Contents</strong>{" "}
            → Read and write
          </li>
          <li>Gere, copie e cole aqui embaixo</li>
        </ol>
        <a
          href="https://github.com/settings/personal-access-tokens/new"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Criar o token no GitHub <ExternalLink size={13} />
        </a>
      </div>

      <div>
        <Rotulo obrigatorio faltando={!cfg.githubToken}>
          Token do GitHub
        </Rotulo>
        <Campo
          type="password"
          value={cfg.githubToken}
          onChange={(e) => atualizar("githubToken", e.target.value)}
          placeholder="github_pat_..."
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Botao variante="neutro" onClick={testar} disabled={testando}>
          {testando ? "Testando…" : "Testar conexão"}
        </Botao>
        {resultado && (
          <span
            className={`inline-flex items-center gap-2 text-sm ${
              resultado.ok ? "text-[var(--success)]" : "text-destructive"
            }`}
          >
            {resultado.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {resultado.texto}
          </span>
        )}
      </div>

      <Aviso>
        <strong>Vale saber:</strong> o token fica guardado só no navegador deste
        aparelho, embaralhado para não aparecer em texto legível — mas isso não
        é criptografia, e quem tiver acesso a este aparelho consegue lê-lo. É
        por isso que ele deve valer para um repositório só: se algum dia vazar,
        você revoga no GitHub e mais nada da sua conta foi exposto. Em
        computador compartilhado, prefira não salvar.
      </Aviso>
    </div>,

    // ---------------------------------------------------------------- Pronto
    <div key="pronto" className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {configCompleta(cfg) ? "Tudo pronto" : "Quase lá"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {configCompleta(cfg)
            ? "Falta só uma coisa opcional: o assistente. Sem ele o app inteiro funciona — você só não terá a aba Conversar."
            : "Faltou preencher a conta, o repositório ou o token. Você pode voltar agora ou resolver depois em Ajustes."}
        </p>
      </div>

      <div>
        <Rotulo dica="Chave do Google AI Studio. Tem plano gratuito e leva um minuto.">
          Chave do Gemini (opcional)
        </Rotulo>
        <Campo
          type="password"
          value={cfg.geminiKey}
          onChange={(e) => atualizar("geminiKey", e.target.value)}
          placeholder="AIza..."
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          Pegar minha chave <ExternalLink size={12} />
        </a>
      </div>

      <Aviso tom={configCompleta(cfg) ? "sucesso" : "neutro"}>
        Dá para mudar qualquer coisa depois em <strong>Ajustes</strong>, e o
        botão <strong>Diagnóstico</strong> de lá diz exatamente onde a conexão
        parou quando algo não funcionar.
      </Aviso>
    </div>,
  ][passo];

  const ultimo = passo === PASSOS.length - 1;

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between gap-4">
          <LogoKlaus tamanho={32} comTexto />
          <button
            onClick={encerrar}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Configurar depois
          </button>
        </div>

        {/* Trilha de progresso: mostra quantas telas faltam, para a pessoa
            saber que isto acaba. */}
        <ol className="flex items-center gap-1.5" aria-label="Progresso">
          {PASSOS.map((p, i) => (
            <li key={p.id} className="flex-1">
              <div
                className={`h-1 rounded-full transition-colors ${
                  i <= passo ? "bg-primary" : "bg-border"
                }`}
              />
              <span className="sr-only">
                {p.rotulo}
                {i === passo ? " (atual)" : ""}
              </span>
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          {conteudo}
        </div>

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
            <Botao onClick={encerrar}>
              Começar a usar
              <ArrowRight size={16} />
            </Botao>
          ) : (
            <Botao onClick={() => irPara(passo + 1)}>
              {passo === 0 ? "Começar" : "Continuar"}
              <ArrowRight size={16} />
            </Botao>
          )}
        </div>
      </div>
    </div>
  );
}
