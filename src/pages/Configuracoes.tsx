import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, ExternalLink, Palette, Sparkles, Download, Upload, FileUp, Settings as SettingsIcon, Terminal, RefreshCw, Layers, Trash2 } from "lucide-react";
import { lerConfig, salvarConfig, type Settings } from "@/lib/settings";
import { testarConexao, diagnosticar, type Etapa } from "@/lib/github";
import { carregarRepo, type ItemRepo } from "@/lib/repo";
import { useSalvar } from "@/lib/useSalvar";
import { Botao, Campo, Cartao, Rotulo, Aviso } from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { ModalPersonalizarMenu } from "@/components/ModalPersonalizarMenu";
import { ModalTourGuiado } from "@/components/ModalTourGuiado";
import { nomeLivre } from "@/lib/markdown";
import { PASTAS } from "@/lib/tipos";
import { analisarAcervoParaMigracao, executarMigracaoEmLote, type RelatorioAnaliseAcervo } from "@/lib/migracaoLote";
import { identificarArquivosProcessos, apagarArquivosProcessosEmLote } from "@/lib/limpezaProcessos";
import { CardConsumoGitHub } from "@/components/CardConsumoGitHub";

export default function Configuracoes() {
  const [cfg, setCfg] = useState<Settings>(lerConfig);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<
    { ok: boolean; texto: string } | null
  >(null);
  const [etapas, setEtapas] = useState<Etapa[] | null>(null);
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [modalPersonalizarAberta, setModalPersonalizarAberta] = useState(false);
  const [modalTourAberta, setModalTourAberta] = useState(false);
  const { salvarTexto } = useSalvar(cfg);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [msgBackup, setMsgBackup] = useState("");

  // Estados da Padronização Global do Acervo
  const [analisandoAcervo, setAnalisandoAcervo] = useState(false);
  const [migrandoAcervo, setMigrandoAcervo] = useState(false);
  const [relatorioMigracao, setRelatorioMigracao] = useState<RelatorioAnaliseAcervo | null>(null);
  const [progressoMigracao, setProgressoMigracao] = useState<{ atual: number; total: number; caminho: string } | null>(null);
  const [msgMigracao, setMsgMigracao] = useState<{ tom: "sucesso" | "erro"; texto: string } | null>(null);

  // Estados da Limpeza de Processos Residuais
  const [arquivosProcessos, setArquivosProcessos] = useState<ItemRepo[]>([]);
  const [excluindoProcessos, setExcluindoProcessos] = useState(false);
  const [progressoProcessos, setProgressoProcessos] = useState<{ atual: number; total: number; msg: string } | null>(null);
  const [msgProcessos, setMsgProcessos] = useState<{ tom: "sucesso" | "erro"; texto: string } | null>(null);

  const analisarPadronizacao = async () => {
    setAnalisandoAcervo(true);
    setMsgMigracao(null);
    setMsgProcessos(null);
    try {
      const itens = await carregarRepo(cfg);
      const rel = analisarAcervoParaMigracao(itens);
      setRelatorioMigracao(rel);
      const procs = identificarArquivosProcessos(itens);
      setArquivosProcessos(procs);

      if (rel.arquivosPendentes === 0 && procs.length === 0) {
        setMsgMigracao({ tom: "sucesso", texto: `Perfeito! Todos os ${rel.totalArquivos} arquivos do seu repositório já estão padronizados e limpos.` });
      }
    } catch (e: any) {
      setMsgMigracao({ tom: "erro", texto: `Erro ao analisar repositório: ${e?.message || e}` });
    } finally {
      setAnalisandoAcervo(false);
    }
  };

  const executarExclusaoProcessos = async () => {
    if (arquivosProcessos.length === 0) return;
    setExcluindoProcessos(true);
    setMsgProcessos(null);
    try {
      const res = await apagarArquivosProcessosEmLote(
        cfg,
        arquivosProcessos.map((i) => ({ caminho: i.caminho, sha: i.sha })),
        (atual, total, msg) => setProgressoProcessos({ atual, total, msg }),
      );

      if (res.falhas.length === 0) {
        setMsgProcessos({
          tom: "sucesso",
          texto: `Sucesso! Todos os ${res.sucessos} arquivo(s) de processos/CRM foram excluídos do GitHub.`,
        });
        setArquivosProcessos([]);
      } else {
        setMsgProcessos({
          tom: "erro",
          texto: `${res.sucessos} arquivo(s) excluídos, mas ${res.falhas.length} falharam ao excluir.`,
        });
      }

      // Re-analisa acervo
      const itensNovos = await carregarRepo(cfg);
      setArquivosProcessos(identificarArquivosProcessos(itensNovos));
      setRelatorioMigracao(analisarAcervoParaMigracao(itensNovos));
    } catch (e: any) {
      setMsgProcessos({ tom: "erro", texto: `Erro durante a exclusão: ${e?.message || e}` });
    } finally {
      setExcluindoProcessos(false);
      setProgressoProcessos(null);
    }
  };

  const executarPadronizacao = async () => {
    if (!relatorioMigracao || relatorioMigracao.itensPendentes.length === 0) return;
    setMigrandoAcervo(true);
    setMsgMigracao(null);
    try {
      const res = await executarMigracaoEmLote(
        cfg,
        relatorioMigracao.itensPendentes,
        (atual, total, caminho) => setProgressoMigracao({ atual, total, caminho }),
      );

      if (res.falhas.length === 0) {
        setMsgMigracao({
          tom: "sucesso",
          texto: `Sucesso! ${res.sucessos} arquivo(s) foram padronizados no GitHub com commit semântico.`,
        });
      } else {
        setMsgMigracao({
          tom: "erro",
          texto: `${res.sucessos} padronizados, mas ${res.falhas.length} falharam ao gravar.`,
        });
      }

      // Re-analisa para atualizar os números
      const itensNovos = await carregarRepo(cfg);
      setRelatorioMigracao(analisarAcervoParaMigracao(itensNovos));
    } catch (e: any) {
      setMsgMigracao({ tom: "erro", texto: `Erro durante a padronização: ${e?.message || e}` });
    } finally {
      setMigrandoAcervo(false);
      setProgressoMigracao(null);
    }
  };

  const exportarBackupJSON = async () => {
    setExportando(true);
    setMsgBackup("");
    try {
      const itens = await carregarRepo(cfg);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(itens, null, 2));
      const anchor = document.createElement("a");
      anchor.setAttribute("href", dataStr);
      anchor.setAttribute("download", `klaus_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setMsgBackup("Backup exportado com sucesso!");
    } catch (e) {
      setMsgBackup("Erro ao exportar backup: " + String(e));
    } finally {
      setExportando(false);
    }
  };

  const processarArquivosImportados = async (files: FileList) => {
    setImportando(true);
    setMsgBackup("");
    let importados = 0;
    try {
      const acervo = await carregarRepo(cfg).catch(() => []);
      const caminhosExistentes = new Set(acervo.map((i) => i.caminho));

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
          const conteudo = await file.text();
          const tituloBase = file.name.replace(/\.(md|txt)$/i, "");
          const caminhoFinal = nomeLivre(PASTAS.notas, tituloBase, caminhosExistentes);
          caminhosExistentes.add(caminhoFinal);
          await salvarTexto(caminhoFinal, conteudo);
          importados++;
        }
      }
      setMsgBackup(`${importados} arquivo(s) importado(s) com sucesso para notas/!`);
    } catch (e) {
      setMsgBackup("Erro ao importar arquivos: " + String(e));
    } finally {
      setImportando(false);
    }
  };

  async function rodarDiagnostico() {
    const limpa = salvarConfig(cfg);
    setCfg(limpa);
    setDiagnosticando(true);
    setEtapas(null);
    setEtapas(await diagnosticar(limpa));
    setDiagnosticando(false);
  }

  const atualizar = (campo: keyof Settings, valor: string) => {
    setCfg((c) => ({ ...c, [campo]: valor }));
    setResultado(null);
  };

  async function salvarETestar() {
    // salvarConfig devolve a versão já limpa (sem espaço nem quebra de linha
    // vindos do copiar e colar). Testamos essa, não a que está no formulário.
    const limpa = salvarConfig(cfg);
    setCfg(limpa);
    setTestando(true);
    setResultado(null);

    const r = await testarConexao(limpa);
    setResultado(
      r.ok
        ? { ok: true, texto: `Conectado em ${r.repo}. Tudo certo.` }
        : { ok: false, texto: r.erro },
    );
    setTestando(false);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Ajustes e Conexões"
        descricao="Configuração de tokens do GitHub, chave da API Gemini e preferências do navegador."
        icone={<SettingsIcon size={20} />}
        corIcone="bg-slate-500/10 text-slate-600 dark:text-slate-400"
      />

      <div className="rounded-xl border border-border bg-card/60 p-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <strong className="text-foreground font-semibold">Transparência sobre a proteção:</strong>{" "}
        seus tokens ficam armazenados localmente no navegador deste dispositivo. Por segurança, utilize um token do GitHub com escopo restrito exclusivamente ao repositório dos seus dados.
      </div>

      {/* Seção de Personalização Visual do Menu Lateral */}
      <Cartao className="p-5 space-y-4 border-primary/20 bg-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Palette size={20} className="text-primary" />
              <span>Personalizar Menu Lateral & Galeria de Ícones</span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                <Sparkles size={10} />
                Novo
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Altere os nomes dos itens, altere títulos de categorias, troque ícones navegando na galeria visual ou adicione cores personalizadas a cada ícone do menu.
            </p>
          </div>
          <Botao onClick={() => setModalPersonalizarAberta(true)} className="shrink-0">
            <Palette size={16} />
            Personalizar Menu
          </Botao>
        </div>
      </Cartao>

      {/* Seção de Onboarding & Apresentação */}
      <Cartao className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Sparkles size={20} className="text-amber-500" />
              <span>Apresentação & Guia Inicial (Tour & Onboarding)</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Deseja rever o tour interativo pelas funcionalidades do Klaus ou refazer a configuração inicial do cofre?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Botao
              onClick={() => setModalTourAberta(true)}
              className="gap-2"
            >
              <Sparkles size={16} className="text-amber-300" />
              Fazer Tour Guiado
            </Botao>
            <Link
              to="/boas-vindas"
              className="inline-flex items-center justify-center gap-2 h-11 px-4 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-accent border border-border transition-colors shrink-0"
            >
              Passo a Passo
            </Link>
          </div>
        </div>
      </Cartao>

      <Cartao className="p-5 space-y-4">
        <div>
          <h2 className="font-medium">Sobre você</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Opcional. O nome assina o que você cria e a área ajuda o assistente
            a explicar as coisas do seu jeito.
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
      </Cartao>

      <Cartao className="p-5 space-y-4">
        <h2 className="font-medium">Onde suas anotações ficam guardadas</h2>

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
            placeholder="hugosilva"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div>
          <Rotulo
            obrigatorio
            faltando={!cfg.repoName}
            dica="O repositório privado onde os arquivos .md ficam."
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

        <div>
          <Rotulo
            obrigatorio
            faltando={!cfg.githubToken}
            dica="Chave de acesso. Precisa de permissão de Contents: Read and write."
          >
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
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            Criar um token novo <ExternalLink size={12} />
          </a>
        </div>
      </Cartao>

      <Cartao className="p-5 space-y-4">
        <div>
          <h2 className="font-medium">Inteligência artificial</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Opcional. Usada na aba Conversar e, se você escolher, para
            transcrever áudio — o resto do app funciona sem.
          </p>
        </div>

        <div>
          <Rotulo dica="Chave do Google AI Studio. Tem plano gratuito.">
            Chave do Gemini
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

        <div>
          <Rotulo dica="Flash é rápido e gratuito. Pro pensa melhor em textos longos.">
            Modelo
          </Rotulo>
          <select
            value={cfg.geminiModel}
            onChange={(e) => atualizar("geminiModel", e.target.value)}
            className="flex h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
          </select>
        </div>
      </Cartao>

      <Cartao className="p-5 space-y-4">
        <div>
          <h2 className="font-medium">Caixa de Entrada & Notificações (Telegram e E-mail)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Receba lembretes e alertas de tarefas atrasadas no seu celular Android via Telegram ou na sua caixa de entrada do Google.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
            <input
              type="checkbox"
              checked={cfg.inboxTelegramAtivo}
              onChange={(e) => setCfg((c) => ({ ...c, inboxTelegramAtivo: e.target.checked }))}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            Ativar Notificações no Celular via Telegram Bot API
          </label>

          {cfg.inboxTelegramAtivo && (
            <div className="space-y-3 pl-6 border-l-2 border-primary/20">
              <div>
                <Rotulo dica="Criado no @BotFather do Telegram. Ex: 123456789:ABCdef...">
                  Token do Bot do Telegram
                </Rotulo>
                <Campo
                  type="password"
                  value={cfg.telegramBotToken}
                  onChange={(e) => atualizar("telegramBotToken", e.target.value)}
                  placeholder="123456789:ABCdef..."
                />
              </div>

              <div>
                <Rotulo dica="Seu ID numérico de usuário no Telegram (pode pegar com o bot @userinfobot).">
                  Chat ID do Telegram
                </Rotulo>
                <Campo
                  value={cfg.telegramChatId}
                  onChange={(e) => atualizar("telegramChatId", e.target.value)}
                  placeholder="123456789"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Rotulo dica="Quando enviar mensagens no Telegram.">
                    Regra de Disparo
                  </Rotulo>
                  <select
                    value={cfg.inboxTelegramModo}
                    onChange={(e) => setCfg((c) => ({ ...c, inboxTelegramModo: e.target.value as any }))}
                    className="flex h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="ambos">Imediatamente e por inatividade</option>
                    <option value="imediatamente">Apenas no momento que vencer</option>
                    <option value="inatividade">Apenas se ficar não visto no app</option>
                  </select>
                </div>

                <div>
                  <Rotulo dica="Tempo sem visualização para escalonamento push.">
                    Escala por Inatividade (Horas)
                  </Rotulo>
                  <Campo
                    type="number"
                    value={cfg.inboxEscalaHoras}
                    onChange={(e) => setCfg((c) => ({ ...c, inboxEscalaHoras: Number(e.target.value) || 3 }))}
                    placeholder="3"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-3 border-t border-border/60">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
            <input
              type="checkbox"
              checked={cfg.googleEmailAtivo}
              onChange={(e) => setCfg((c) => ({ ...c, googleEmailAtivo: e.target.checked }))}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            Ativar Envio de E-mail via Google (Apps Script)
          </label>

          {cfg.googleEmailAtivo && (
            <div className="space-y-3 pl-6 border-l-2 border-emerald-500/20">
              <div>
                <Rotulo dica="URL WebApp do script.google.com configurado para disparar e-mail.">
                  URL da Webhook do Google Apps Script
                </Rotulo>
                <Campo
                  value={cfg.googleAppsScriptUrl}
                  onChange={(e) => atualizar("googleAppsScriptUrl", e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
              </div>
            </div>
          )}
        </div>
      </Cartao>

      <CardConsumoGitHub />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Botao onClick={salvarETestar} disabled={testando}>
          {testando ? "Testando…" : "Salvar e testar conexão"}
        </Botao>
        <Botao
          variante="neutro"
          onClick={rodarDiagnostico}
          disabled={diagnosticando}
        >
          {diagnosticando ? "Verificando…" : "Diagnóstico"}
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

      {etapas && (
        <Cartao className="p-5">
          <h2 className="font-medium">Diagnóstico</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada linha testa uma coisa a mais que a anterior. A primeira que
            falhar é a causa.
          </p>
          <ul className="mt-4 space-y-3">
            {etapas.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 shrink-0">
                  {e.ok ? (
                    <CheckCircle2 size={17} className="text-[var(--success)]" />
                  ) : (
                    <XCircle size={17} className="text-destructive" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{e.nome}</p>
                  <p className="text-xs text-muted-foreground break-words">
                    {e.detalhe}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={() =>
              navigator.clipboard.writeText(
                etapas
                  .map((e) => `${e.ok ? "OK " : "FALHOU "} ${e.nome}: ${e.detalhe}`)
                  .join("\n"),
              )
            }
            className="mt-4 text-xs text-primary hover:underline"
          >
            Copiar resultado
          </button>
        </Cartao>
      )}

      {/* Seção de Limpeza de Arquivos de Processos */}
      {arquivosProcessos.length > 0 && (
        <Cartao className="p-5 space-y-4 border-rose-500/40 bg-rose-500/5">
          <div>
            <h2 className="font-medium text-foreground flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 size={18} />
              Arquivos Residuais de Processos / CRM ({arquivosProcessos.length})
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Foram identificados <strong className="text-foreground">{arquivosProcessos.length}</strong> arquivos antigos na pasta <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">processos/</code> no seu repositório do GitHub. Como a ferramenta foi descontinuada, você pode excluí-los em lote em 1 clique.
            </p>
          </div>

          {msgProcessos && (
            <Aviso tom={msgProcessos.tom}>{msgProcessos.texto}</Aviso>
          )}

          {progressoProcessos && (
            <div className="space-y-2 rounded-xl bg-muted/40 p-3 border border-border">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">Excluindo processos do GitHub...</span>
                <span className="text-rose-500">{progressoProcessos.atual} de {progressoProcessos.total}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-200"
                  style={{ width: `${(progressoProcessos.atual / progressoProcessos.total) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground truncate font-mono">
                {progressoProcessos.msg}
              </p>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Exemplos de arquivos a excluir:
            </span>
            <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border border-border bg-background p-2 text-xs font-mono text-muted-foreground">
              {arquivosProcessos.slice(0, 10).map((item) => (
                <div key={item.caminho} className="truncate">
                  • {item.caminho}
                </div>
              ))}
              {arquivosProcessos.length > 10 && (
                <div className="text-[11px] text-muted-foreground/80 italic">
                  + outros {arquivosProcessos.length - 10} arquivo(s)
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Botao
              variante="perigo"
              onClick={executarExclusaoProcessos}
              disabled={excluindoProcessos}
            >
              <Trash2 size={16} />
              {excluindoProcessos
                ? "Excluindo arquivos..."
                : `Excluir todos os ${arquivosProcessos.length} arquivos de processos do GitHub`}
            </Botao>
          </div>
        </Cartao>
      )}

      {/* Seção de Padronização Global do Acervo */}
      <Cartao className="p-5 space-y-4">
        <div>
          <h2 className="font-medium text-foreground flex items-center gap-2">
            <Layers size={18} className="text-amber-500" />
            Padronização Global do Acervo (snake_case)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Varra todo o repositório no GitHub para identificar e converter notas, tarefas, metas e contatos com convenções antigas para o padrão global unificado em 1 clique.
          </p>
        </div>

        {msgMigracao && (
          <Aviso tom={msgMigracao.tom}>{msgMigracao.texto}</Aviso>
        )}

        {progressoMigracao && (
          <div className="space-y-2 rounded-xl bg-muted/40 p-3 border border-border">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground">Padronizando arquivos no GitHub...</span>
              <span className="text-primary">{progressoMigracao.atual} de {progressoMigracao.total}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${(progressoMigracao.atual / progressoMigracao.total) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground truncate font-mono">
              Gravando: {progressoMigracao.caminho}
            </p>
          </div>
        )}

        {relatorioMigracao && !progressoMigracao && (
          <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground font-medium block">Total Analisado</span>
                <span className="text-lg font-bold text-foreground">{relatorioMigracao.totalArquivos}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="text-xs font-medium block">Padronizados</span>
                <span className="text-lg font-bold">{relatorioMigracao.arquivosPadronizados}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <span className="text-xs font-medium block">Pendentes</span>
                <span className="text-lg font-bold">{relatorioMigracao.arquivosPendentes}</span>
              </div>
            </div>

            {relatorioMigracao.arquivosPendentes > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Exemplos de arquivos a atualizar ({relatorioMigracao.arquivosPendentes}):
                </span>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border border-border bg-background p-2 text-xs font-mono text-muted-foreground">
                  {relatorioMigracao.itensPendentes.slice(0, 10).map((item) => (
                    <div key={item.caminho} className="truncate">
                      • {item.caminho} ({item.tipo})
                    </div>
                  ))}
                  {relatorioMigracao.itensPendentes.length > 10 && (
                    <div className="text-[11px] text-muted-foreground/80 italic">
                      + outros {relatorioMigracao.itensPendentes.length - 10} arquivo(s)
                    </div>
                  )}
                </div>
              </div>
            )}

            {relatorioMigracao.integridade && (
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2
                      size={14}
                      className={
                        relatorioMigracao.integridade.totalProblemas === 0
                          ? "text-emerald-500"
                          : "text-amber-500"
                      }
                    />
                    Integridade de Links e Vínculos:
                  </span>
                  <span
                    className={`font-medium ${
                      relatorioMigracao.integridade.totalProblemas === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {relatorioMigracao.integridade.totalProblemas === 0
                      ? "100% íntegro (nenhum link quebrado)"
                      : `${relatorioMigracao.integridade.totalProblemas} aviso(s)`}
                  </span>
                </div>

                {relatorioMigracao.integridade.totalProblemas > 0 && (
                  <div className="mt-2 max-h-28 overflow-y-auto space-y-1 rounded-lg bg-amber-500/5 border border-amber-500/20 p-2 text-[11px] text-muted-foreground">
                    {relatorioMigracao.integridade.problemas.slice(0, 5).map((p, idx) => (
                      <div key={idx} className="truncate">
                        • <strong className="text-foreground">{p.origemTitulo}</strong>: {p.detalhe}
                      </div>
                    ))}
                    {relatorioMigracao.integridade.problemas.length > 5 && (
                      <div className="text-[10px] italic text-muted-foreground">
                        + outros {relatorioMigracao.integridade.problemas.length - 5} aviso(s)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Botao
            variante="neutro"
            onClick={analisarPadronizacao}
            disabled={analisandoAcervo || migrandoAcervo}
          >
            <RefreshCw size={16} className={analisandoAcervo ? "animate-spin" : ""} />
            {analisandoAcervo ? "Analisando acervo..." : "Analisar Conformidade"}
          </Botao>

          {relatorioMigracao && relatorioMigracao.arquivosPendentes > 0 && (
            <Botao
              onClick={executarPadronizacao}
              disabled={migrandoAcervo}
            >
              <Sparkles size={16} className="text-amber-300" />
              {migrandoAcervo
                ? "Padronizando..."
                : `Padronizar ${relatorioMigracao.arquivosPendentes} arquivo(s)`}
            </Botao>
          )}
        </div>
      </Cartao>

      {/* Seção de Backup & Importação de Arquivos */}
      <Cartao className="p-5 space-y-4">
        <div>
          <h2 className="font-medium text-foreground flex items-center gap-2">
            <FileUp size={18} className="text-primary" />
            Backup, Exportação & Importação (Obsidian / Markdown)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Exporte uma cópia completa de segurança do acervo em JSON ou importe arquivos Markdown / cofres do Obsidian diretamente para o seu repositório.
          </p>
        </div>

        {msgBackup && <Aviso tom="sucesso">{msgBackup}</Aviso>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Botao variante="neutro" onClick={exportarBackupJSON} disabled={exportando}>
            <Download size={16} />
            {exportando ? "Exportando..." : "Exportar Backup (JSON)"}
          </Botao>

          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept=".md,.txt"
              onChange={(e) => e.target.files && processarArquivosImportados(e.target.files)}
              className="hidden"
            />
            <div className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-accent transition-colors">
              <Upload size={16} />
              <span>{importando ? "Importando..." : "Importar .md / Obsidian"}</span>
            </div>
          </label>
        </div>
      </Cartao>

      {/* Seção do Modo Desenvolvedor */}
      <Cartao className="p-5 space-y-4">
        <div>
          <h2 className="font-medium text-foreground flex items-center gap-2">
            <Terminal size={18} className="text-primary" />
            Desenvolvedor
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ative o console de logs em tempo real para visualizar requisições da API, erros de rede e falhas de parser.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
            <input
              type="checkbox"
              checked={cfg.modoDesenvolvedor || false}
              onChange={(e) => {
                const novaConfig = { ...cfg, modoDesenvolvedor: e.target.checked };
                setCfg(novaConfig);
                salvarConfig(novaConfig);
                window.dispatchEvent(new CustomEvent("klaus-config-mudou"));
              }}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            Ativar console de logs do Desenvolvedor
          </label>
        </div>
      </Cartao>

      <Aviso>
        <strong>Por que um token?</strong> Ele é a chave que deixa este site
        gravar seus arquivos no seu repositório. Como não existe servidor, é o
        seu navegador que fala direto com o GitHub — por isso a chave fica aqui,
        e só aqui. Se você abrir o site em outro aparelho, precisa colar de novo.
      </Aviso>

      <p className="text-sm text-muted-foreground">
        Perdido na configuração?{" "}
        <Link to="/boas-vindas" className="text-primary hover:underline">
          Refazer o passo a passo inicial
        </Link>
        .
      </p>

      <ModalPersonalizarMenu
        aberta={modalPersonalizarAberta}
        aoFechar={() => setModalPersonalizarAberta(false)}
      />

      <ModalTourGuiado
        aberta={modalTourAberta}
        aoFechar={() => setModalTourAberta(false)}
      />
    </div>
  );
}
