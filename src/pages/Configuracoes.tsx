import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, ExternalLink, Palette, Sparkles, Download, Upload, FileUp } from "lucide-react";
import { lerConfig, salvarConfig, type Settings } from "@/lib/settings";
import { testarConexao, diagnosticar, type Etapa } from "@/lib/github";
import { carregarRepo } from "@/lib/repo";
import { useSalvar } from "@/lib/useSalvar";
import { Botao, Campo, Cartao, Rotulo, Aviso } from "@/components/ui";
import { ModalPersonalizarMenu } from "@/components/ModalPersonalizarMenu";

export default function Configuracoes() {
  const [cfg, setCfg] = useState<Settings>(lerConfig);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<
    { ok: boolean; texto: string } | null
  >(null);
  const [etapas, setEtapas] = useState<Etapa[] | null>(null);
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [modalPersonalizarAberta, setModalPersonalizarAberta] = useState(false);
  const { salvarTexto } = useSalvar(cfg);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [msgBackup, setMsgBackup] = useState("");

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
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
          const conteudo = await file.text();
          const nomeNormalizado = file.name.endsWith(".md") ? file.name : `${file.name}.md`;
          const caminhoFinal = `notas/${nomeNormalizado}`;
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estes dados ficam guardados só no navegador deste aparelho. Nunca vão
          para o código nem para a internet.
        </p>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          <strong className="text-foreground">Sendo honesto sobre a proteção:</strong>{" "}
          suas chaves ficam embaralhadas no navegador, o que evita que apareçam
          em texto legível — mas isso <em>não</em> é criptografia. Quem tiver
          acesso a este aparelho consegue lê-las. Por isso o token do GitHub
          deve valer só para o repositório dos seus dados: se algum dia vazar,
          você revoga em um clique e nada mais é afetado.
        </p>
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
    </div>
  );
}
