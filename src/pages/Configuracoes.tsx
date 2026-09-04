import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Palette,
  Sparkles,
  Download,
  Upload,
  FileUp,
  Settings as SettingsIcon,
  Terminal,
  RefreshCw,
  Layers,
  Trash2,
  FlaskConical,
  Eye,
  EyeOff,
  Save,
  User,
  GitBranch,
  Bot,
  Bell,
  Database,
  ShieldCheck,
  Search,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { lerConfig, salvarConfig, type Settings } from "@/lib/settings";
import { testarConexao, diagnosticar, type Etapa } from "@/lib/github";
import { carregarRepo, type ItemRepo } from "@/lib/repo";
import { useSalvar } from "@/lib/useSalvar";
import { Botao, Campo, Cartao, Rotulo, Aviso, ModalConfirmacao } from "@/components/ui";
import { toast } from "@/lib/toast";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { AlternadorVisao, type OpcaoVisao } from "@/components/AlternadorVisao";
import { ModalPersonalizarMenu } from "@/components/ModalPersonalizarMenu";
import { ModalTourGuiado } from "@/components/ModalTourGuiado";
import { nomeLivre } from "@/lib/markdown";
import { PASTAS } from "@/lib/tipos";
import { analisarAcervoParaMigracao, executarMigracaoEmLote, type RelatorioAnaliseAcervo } from "@/lib/migracaoLote";
import { identificarArquivosProcessos, apagarArquivosProcessosEmLote } from "@/lib/limpezaProcessos";
import { popularKlausComDadosDemo, apagarTodosDadosDemo } from "@/lib/dadosDemo";
import { CardConsumoGitHub } from "@/components/CardConsumoGitHub";
import { instalarWorkflowLembretes } from "@/lib/instaladorWorkflow";
import { hojeISO } from "@/lib/utils";
import {
  obterRascunhosLocais,
  limparRascunhosComErro,
  redefinirRascunhosComErroParaPendente,
  sincronizarFilaOffline,
} from "@/lib/offlineQueue";
import JSZip from "jszip";

type AbaConfig = "geral" | "github" | "ia" | "notificacoes" | "dados";

const OPCOES_ABAS: OpcaoVisao<AbaConfig>[] = [
  { id: "geral", rotulo: "Geral & Perfil", icone: <User size={15} /> },
  { id: "github", rotulo: "GitHub & Sincronização", icone: <GitBranch size={15} /> },
  { id: "ia", rotulo: "Inteligência Artificial", icone: <Bot size={15} /> },
  { id: "notificacoes", rotulo: "Notificações & Automações", icone: <Bell size={15} /> },
  { id: "dados", rotulo: "Dados & Manutenção", icone: <Database size={15} /> },
];

export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState<AbaConfig>("geral");
  const [cfg, setCfg] = useState<Settings>(lerConfig);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [etapas, setEtapas] = useState<Etapa[] | null>(null);
  const [copiouDiagnostico, setCopiouDiagnostico] = useState(false);
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [modalPersonalizarAberta, setModalPersonalizarAberta] = useState(false);
  const [modalTourAberta, setModalTourAberta] = useState(false);
  const { salvarTexto } = useSalvar(cfg);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [msgBackup, setMsgBackup] = useState("");
  const [testandoGemini, setTestandoGemini] = useState(false);
  const [resultadoGemini, setResultadoGemini] = useState<{ ok: boolean; texto: string } | null>(null);
  const [verChaveGemini, setVerChaveGemini] = useState(false);
  const [rascunhosComErro, setRascunhosComErro] = useState<number>(() => {
    return obterRascunhosLocais().filter((r) => r.status === "erro" || r.status === "conflito").length;
  });

  // Estados dos Dados de Demonstração / Teste
  const [populandoDemo, setPopulandoDemo] = useState(false);
  const [apagandoDemo, setApagandoDemo] = useState(false);
  const [progressoDemo, setProgressoDemo] = useState<{ atual: number; total: number; caminho: string } | null>(null);
  const [msgDemo, setMsgDemo] = useState<{ tom: "sucesso" | "erro"; texto: string } | null>(null);
  const [modalConfirmarLimpezaDemo, setModalConfirmarLimpezaDemo] = useState(false);

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

  // Estados do Agendador Autônomo GitHub Actions
  const [instalandoWorkflow, setInstalandoWorkflow] = useState(false);
  const [msgWorkflow, setMsgWorkflow] = useState<{ tom: "sucesso" | "erro"; texto: string } | null>(null);

  const atualizar = <K extends keyof Settings>(campo: K, valor: Settings[K]) => {
    setCfg((c) => ({ ...c, [campo]: valor }));
    setResultado(null);
  };

  const salvarPerfil = () => {
    const limpa = salvarConfig(cfg);
    setCfg(limpa);
    toast("Preferências salvas com sucesso!");
  };

  const instalarWorkflow = async () => {
    setInstalandoWorkflow(true);
    setMsgWorkflow(null);
    try {
      const res = await instalarWorkflowLembretes(cfg);
      setMsgWorkflow({ tom: "sucesso", texto: res.mensagem });
    } catch (e: any) {
      setMsgWorkflow({ tom: "erro", texto: e.message || String(e) });
    } finally {
      setInstalandoWorkflow(false);
    }
  };

  const handlePopularDemo = async () => {
    setPopulandoDemo(true);
    setMsgDemo(null);
    try {
      const res = await popularKlausComDadosDemo(cfg, (atual, total, caminho) => {
        setProgressoDemo({ atual, total, caminho });
      });

      if (res.falhas.length === 0) {
        setMsgDemo({
          tom: "sucesso",
          texto: `Sucesso! Foram criados ${res.sucessos} itens de demonstração (notas, tarefas, metas, entregas, referências e contatos) com sucesso no GitHub!`,
        });
      } else {
        setMsgDemo({
          tom: "erro",
          texto: `${res.sucessos} itens criados, mas ${res.falhas.length} falharam.`,
        });
      }
    } catch (e: any) {
      setMsgDemo({ tom: "erro", texto: `Erro ao popular Klaus: ${e?.message || e}` });
    } finally {
      setPopulandoDemo(false);
      setProgressoDemo(null);
    }
  };

  const handleApagarDemo = async () => {
    setModalConfirmarLimpezaDemo(false);
    setApagandoDemo(true);
    setMsgDemo(null);
    try {
      const todos = await carregarRepo(cfg);
      const res = await apagarTodosDadosDemo(cfg, todos, (atual, total, caminho) => {
        setProgressoDemo({ atual, total, caminho });
      });

      if (res.apagados === 0 && res.falhas.length === 0) {
        setMsgDemo({
          tom: "sucesso",
          texto: "Nenhum arquivo de demonstração foi encontrado para apagar.",
        });
      } else if (res.falhas.length === 0) {
        setMsgDemo({
          tom: "sucesso",
          texto: `Limpeza concluída! ${res.apagados} item(ns) de demonstração foram excluídos com sucesso do repositório.`,
        });
      } else {
        setMsgDemo({
          tom: "erro",
          texto: `${res.apagados} itens excluídos, mas ${res.falhas.length} falharam ao excluir.`,
        });
      }
    } catch (e: any) {
      setMsgDemo({ tom: "erro", texto: `Erro ao excluir dados de demonstração: ${e?.message || e}` });
    } finally {
      setApagandoDemo(false);
      setProgressoDemo(null);
    }
  };

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
        setMsgMigracao({
          tom: "sucesso",
          texto: `Perfeito! Todos os ${rel.totalArquivos} arquivos do seu repositório já estão padronizados e limpos.`,
        });
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
      anchor.setAttribute("download", `klaus_backup_${hojeISO()}.json`);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setMsgBackup("Backup JSON exportado com sucesso!");
    } catch (e) {
      setMsgBackup("Erro ao exportar backup JSON: " + String(e));
    } finally {
      setExportando(false);
    }
  };

  const exportarBackupZip = async () => {
    setExportando(true);
    setMsgBackup("");
    try {
      const itens = await carregarRepo(cfg);
      const zip = new JSZip();
      for (const item of itens) {
        if (item.texto) {
          zip.file(item.caminho, item.texto);
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.setAttribute("href", url);
      anchor.setAttribute("download", `klaus_backup_${hojeISO()}.zip`);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMsgBackup("Backup completo (.zip) com todas as suas notas exportado com sucesso!");
    } catch (e: any) {
      setMsgBackup("Erro ao exportar backup ZIP: " + (e?.message || String(e)));
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
      setMsgBackup(`${importados} arquivo(s) importado(s) com sucesso para a pasta de notas!`);
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
    setCopiouDiagnostico(false);
    const resEtapas = await diagnosticar(limpa);
    setEtapas(resEtapas);
    setDiagnosticando(false);
  }

  const copiarDiagnostico = () => {
    if (!etapas) return;
    navigator.clipboard.writeText(
      etapas.map((e) => `${e.ok ? "OK " : "FALHOU "} ${e.nome}: ${e.detalhe}`).join("\n"),
    );
    setCopiouDiagnostico(true);
    toast("Resultado do diagnóstico copiado!");
    setTimeout(() => setCopiouDiagnostico(false), 2500);
  };

  const salvarChaveGemini = () => {
    const limpa = salvarConfig(cfg);
    setCfg(limpa);
    toast("Configurações de IA salvas com sucesso!");
    setResultadoGemini({ ok: true, texto: "Chave e modelo do Gemini salvos!" });
  };

  const testarChaveGemini = async () => {
    if (!cfg.geminiKey.trim()) {
      setResultadoGemini({ ok: false, texto: "Preencha a chave do Gemini antes de testar." });
      return;
    }
    setTestandoGemini(true);
    setResultadoGemini(null);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.geminiModel)}:generateContent?key=${encodeURIComponent(cfg.geminiKey.trim())}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Diga apenas: OK" }] }] }),
      });
      if (!res.ok) {
        throw new Error(`Código ${res.status}: verifique se a chave é válida e possui permissão no Google AI Studio.`);
      }
      const limpa = salvarConfig(cfg);
      setCfg(limpa);
      setResultadoGemini({ ok: true, texto: "Chave do Gemini conectada com sucesso!" });
      toast("Chave do Gemini salva e conectada com sucesso!");
    } catch (e: any) {
      setResultadoGemini({ ok: false, texto: e?.message || "Erro ao conectar à API do Gemini." });
    } finally {
      setTestandoGemini(false);
    }
  };

  async function salvarETestarGitHub() {
    const limpa = salvarConfig(cfg);
    setCfg(limpa);
    setTestando(true);
    setResultado(null);

    const r = await testarConexao(limpa);
    if (r.ok) {
      redefinirRascunhosComErroParaPendente();
      sincronizarFilaOffline(limpa).catch(() => {});
      setRascunhosComErro(0);
    }
    setResultado(
      r.ok
        ? { ok: true, texto: `Conectado com sucesso ao repositório ${r.repo}.` }
        : { ok: false, texto: r.erro },
    );
    setTestando(false);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Cabeçalho Padronizado */}
      <CabecalhoPagina
        titulo="Configurações & Ajustes"
        descricao="Gerencie seu perfil, conexão com o GitHub, inteligência artificial, notificações e backups."
        icone={<SettingsIcon size={20} />}
        corIcone="bg-slate-500/10 text-slate-600 dark:text-slate-400"
      />

      {/* Navegação por Abas Temáticas */}
      <div className="w-full">
        <AlternadorVisao
          opcoes={OPCOES_ABAS}
          valorAtivo={abaAtiva}
          aoAlternar={setAbaAtiva}
          className="w-full sm:w-auto"
        />
      </div>

      {/* ========================================================= */}
      {/* ABA 1: GERAL & PERFIL */}
      {/* ========================================================= */}
      {abaAtiva === "geral" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Cartão Perfil do Usuário */}
          <Cartao className="p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <User size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-sm sm:text-base">Perfil do Usuário</h2>
                <p className="text-xs text-muted-foreground">
                  Personalize seu nome e sua área para assinar conteúdos e contextualizar a IA.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Rotulo dica="Aparece no campo 'criado por' dos seus itens e notas.">
                  Seu nome
                </Rotulo>
                <Campo
                  value={cfg.nomeUsuario}
                  onChange={(e) => atualizar("nomeUsuario", e.target.value)}
                  placeholder="Ex: Hugo Silva"
                />
              </div>

              <div>
                <Rotulo dica="Com o que você trabalha. Ajuda o assistente a calibrar o vocabulário sem jargões.">
                  Área de atuação / Especialidade
                </Rotulo>
                <Campo
                  value={cfg.profissaoUsuario}
                  onChange={(e) => atualizar("profissaoUsuario", e.target.value)}
                  placeholder="Ex: Design Gráfico, Arquitetura, Direito..."
                />
              </div>
            </div>

            <div>
              <Rotulo dica="Mecanismo utilizado para pesquisas na web integradas ao cofre.">
                Motor de busca web padrão
              </Rotulo>
              <select
                value={cfg.defaultWebSearchEngine || "google"}
                onChange={(e) => {
                  const novo = e.target.value as any;
                  atualizar("defaultWebSearchEngine", novo);
                  salvarConfig({ ...cfg, defaultWebSearchEngine: novo });
                }}
                className="flex h-11 w-full sm:w-72 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <option value="google">Google</option>
                <option value="bing">Bing</option>
                <option value="duckduckgo">DuckDuckGo</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <Botao variante="primario" onClick={salvarPerfil}>
                <Save size={15} />
                Salvar Preferências
              </Botao>
            </div>
          </Cartao>

          {/* Cartão Personalização & Navegação */}
          <Cartao className="p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Palette size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-sm sm:text-base">Interface & Navegação</h2>
                <p className="text-xs text-muted-foreground">
                  Personalize o menu lateral, reveja o tour guiado ou o guia inicial do Klaus.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col justify-between p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <Palette size={16} className="text-primary" />
                    Personalizar Menu Lateral
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Alterne títulos de categorias, troque ícones navegando na galeria visual e adicione cores temáticas a cada atalho.
                  </p>
                </div>
                <Botao onClick={() => setModalPersonalizarAberta(true)} variante="neutro" className="w-full">
                  <Palette size={15} />
                  Abrir Personalizador de Menu
                </Botao>
              </div>

              <div className="flex flex-col justify-between p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500" />
                    Tour & Guia de Boas-Vindas
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Reveja as orientações interativas do app ou acerte a configuração passo a passo do repositório.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Botao onClick={() => setModalTourAberta(true)} variante="neutro" className="flex-1">
                    <Sparkles size={15} className="text-amber-400" />
                    Tour Guiado
                  </Botao>
                  <Link
                    to="/boas-vindas"
                    className="inline-flex items-center justify-center gap-2 h-11 px-4 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-accent border border-border transition-colors flex-1"
                  >
                    Passo a Passo
                  </Link>
                </div>
              </div>
            </div>
          </Cartao>

          {/* Cartão Modo Desenvolvedor */}
          <Cartao className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
                  <Terminal size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Console de Logs do Desenvolvedor</h3>
                  <p className="text-xs text-muted-foreground">
                    Exibe barra inferior com telemetria em tempo real de requisições e eventos de rede.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs sm:text-sm shrink-0">
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
                <span>{cfg.modoDesenvolvedor ? "Ativado" : "Desativado"}</span>
              </label>
            </div>
          </Cartao>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 2: GITHUB & SINCRONIZAÇÃO */}
      {/* ========================================================= */}
      {abaAtiva === "github" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Cartão Credenciais e Conexão do GitHub */}
          <Cartao className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <GitBranch size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm sm:text-base">Repositório & Token de Acesso</h2>
                  <p className="text-xs text-muted-foreground">
                    Conexão direta do seu navegador com a API do GitHub para salvar seus arquivos Markdown.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Rotulo obrigatorio faltando={!cfg.repoOwner} dica="Seu nome de usuário no GitHub exatamente como no perfil.">
                  Usuário da conta GitHub
                </Rotulo>
                <Campo
                  value={cfg.repoOwner}
                  onChange={(e) => atualizar("repoOwner", e.target.value)}
                  placeholder="Ex: hugosilva"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              <div>
                <Rotulo obrigatorio faltando={!cfg.repoName} dica="Repositório privado onde os arquivos Markdown ficam guardados.">
                  Nome do repositório de dados
                </Rotulo>
                <Campo
                  value={cfg.repoName}
                  onChange={(e) => atualizar("repoName", e.target.value)}
                  placeholder="Ex: segundo-cerebro-dados"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>

            <div>
              <Rotulo
                obrigatorio
                faltando={!cfg.githubToken}
                dica="Token de acesso pessoal com permissão 'Contents: Read and write' no repositório de dados."
              >
                Token de Acesso Pessoal (GitHub Fine-grained PAT)
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
              <div className="mt-2 flex items-center justify-between text-xs">
                <a
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                >
                  Gerar novo token no GitHub <ExternalLink size={12} />
                </a>
                <span className="text-muted-foreground">Branch padrão: <strong>{cfg.branch || "main"}</strong></span>
              </div>
            </div>

            {/* Ações de Teste e Validação da Conexão */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-2.5">
                <Botao onClick={salvarETestarGitHub} disabled={testando}>
                  <RefreshCw size={14} className={testando ? "animate-spin" : ""} />
                  {testando ? "Testando conexão..." : "Salvar e Testar Conexão"}
                </Botao>
                <Botao
                  variante="neutro"
                  onClick={rodarDiagnostico}
                  disabled={diagnosticando}
                >
                  <Search size={14} className={diagnosticando ? "animate-spin" : ""} />
                  {diagnosticando ? "Diagnosticando..." : "Diagnóstico Passo a Passo"}
                </Botao>
              </div>

              {resultado && (
                <div
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${
                    resultado.ok
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {resultado.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span className="truncate max-w-xs">{resultado.texto}</span>
                </div>
              )}
            </div>
          </Cartao>

          {/* Diagnóstico Passo a Passo */}
          {etapas && (
            <Cartao className="p-5 space-y-3 border-primary/20 bg-card">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Relatório de Diagnóstico</h3>
                  <p className="text-xs text-muted-foreground">
                    Validação em camadas de autenticação, permissões e leitura de arquivos.
                  </p>
                </div>
                <Botao tamanho="pequeno" variante="neutro" onClick={copiarDiagnostico}>
                  {copiouDiagnostico ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copiouDiagnostico ? "Copiado" : "Copiar"}</span>
                </Botao>
              </div>

              <ul className="space-y-2.5 pt-1">
                {etapas.map((e, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs">
                    <span className="mt-0.5 shrink-0">
                      {e.ok ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <XCircle size={16} className="text-destructive" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{e.nome}</p>
                      <p className="text-muted-foreground break-words">{e.detalhe}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Cartao>
          )}

          {/* Rascunhos com erro / Fila Offline */}
          {rascunhosComErro > 0 && (
            <Aviso tom="neutro">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                <span>
                  Existem <strong>{rascunhosComErro}</strong> alteração(ões) salvas localmente que não puderam ser enviadas ao GitHub por falha temporária de conexão ou token.
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Botao
                    tamanho="pequeno"
                    onClick={() => {
                      redefinirRascunhosComErroParaPendente();
                      sincronizarFilaOffline(cfg).catch(() => {});
                      setRascunhosComErro(0);
                    }}
                  >
                    Tentar Sincronizar
                  </Botao>
                  <Botao
                    tamanho="pequeno"
                    variante="perigo"
                    onClick={() => {
                      limparRascunhosComErro();
                      setRascunhosComErro(0);
                    }}
                  >
                    Limpar Pendências
                  </Botao>
                </div>
              </div>
            </Aviso>
          )}

          {/* Card de Monitoramento de Cota de API */}
          <CardConsumoGitHub />

          {/* Nota Transparente sobre Privacidade e Segurança */}
          <div className="rounded-xl border border-border bg-card/60 p-4 text-xs text-muted-foreground space-y-2 leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <ShieldCheck size={16} className="text-primary" />
              <span>Privacidade & Arquitetura Sem Servidor</span>
            </div>
            <p>
              O Klaus funciona sem nenhum backend ou banco de dados intermediário. O navegador conversa diretamente com a API do GitHub a cada leitura e gravação. Seus tokens permanecem armazenados unicamente no seu dispositivo.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 3: INTELIGÊNCIA ARTIFICIAL */}
      {/* ========================================================= */}
      {abaAtiva === "ia" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <Cartao className="p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Bot size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-sm sm:text-base">Google Gemini AI</h2>
                <p className="text-xs text-muted-foreground">
                  Alimente o Chat Inteligente, transcrição de áudios e sugestões de metas de carreira.
                </p>
              </div>
            </div>

            <div>
              <Rotulo dica="Chave de API obtida gratuitamente no Google AI Studio.">
                Chave da API do Gemini
              </Rotulo>
              <div className="relative flex items-center">
                <Campo
                  type={verChaveGemini ? "text" : "password"}
                  value={cfg.geminiKey}
                  onChange={(e) => atualizar("geminiKey", e.target.value)}
                  onBlur={() => {
                    if (cfg.geminiKey) salvarConfig(cfg);
                  }}
                  placeholder="AIzaSy..."
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="pr-12 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setVerChaveGemini(!verChaveGemini)}
                  className="absolute right-0 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={verChaveGemini ? "Ocultar chave" : "Exibir chave"}
                >
                  {verChaveGemini ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                Gerar chave gratuita no Google AI Studio <ExternalLink size={12} />
              </a>
            </div>

            <div>
              <Rotulo dica="Flash é ultrarrápido e gratuito. O modelo Pro realiza raciocínios mais aprofundados.">
                Modelo da IA
              </Rotulo>
              <select
                value={cfg.geminiModel}
                onChange={(e) => {
                  const novo = e.target.value;
                  atualizar("geminiModel", novo);
                  salvarConfig({ ...cfg, geminiModel: novo });
                }}
                className="flex h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado — mais rápido)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Mais profundo para textos longos)</option>
              </select>
            </div>

            {/* Ações de Teste e Validação */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-2.5">
                <Botao
                  variante="primario"
                  onClick={testarChaveGemini}
                  disabled={testandoGemini || !cfg.geminiKey}
                >
                  <Sparkles size={14} className={testandoGemini ? "animate-spin" : ""} />
                  {testandoGemini ? "Testando conexão..." : "Testar Conexão com Gemini"}
                </Botao>

                <Botao
                  variante="neutro"
                  onClick={salvarChaveGemini}
                  disabled={!cfg.geminiKey}
                >
                  <Save size={14} />
                  Salvar Chave
                </Botao>
              </div>

              {resultadoGemini && (
                <div
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${
                    resultadoGemini.ok
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {resultadoGemini.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span>{resultadoGemini.texto}</span>
                </div>
              )}
            </div>
          </Cartao>

          {/* Onde a IA é utilizada */}
          <Cartao className="p-5 space-y-3">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              Onde a IA atua no Klaus
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <strong className="text-foreground block font-medium">Chat & Consultas</strong>
                <p className="text-muted-foreground">Converse com seu cérebro, pesquise notas cruzadas e crie itens por linguagem natural.</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <strong className="text-foreground block font-medium">Transcritor de Áudio</strong>
                <p className="text-muted-foreground">Converta notas de voz em texto formatado e com resumo de ações a realizar.</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <strong className="text-foreground block font-medium">Sugestões de Carreira</strong>
                <p className="text-muted-foreground">Auxílio para redigir metas de PDI, desdobrar entregas e sintetizar dossiês.</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/80 italic pt-1">
              Nota: O cofre de notas, tarefas, lousas e referências funciona perfeitamente mesmo se a chave do Gemini não for informada.
            </p>
          </Cartao>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 4: NOTIFICAÇÕES & AUTOMAÇÕES */}
      {/* ========================================================= */}
      {abaAtiva === "notificacoes" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Telegram Bot */}
          <Cartao className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Bell size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm sm:text-base">Notificações no Telegram</h2>
                  <p className="text-xs text-muted-foreground">
                    Receba alertas de tarefas e lembretes diretamente no seu Telegram.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs sm:text-sm shrink-0">
                <input
                  type="checkbox"
                  checked={cfg.inboxTelegramAtivo || false}
                  onChange={(e) => {
                    const ativo = e.target.checked;
                    setCfg((c) => ({ ...c, inboxTelegramAtivo: ativo }));
                    salvarConfig({ ...cfg, inboxTelegramAtivo: ativo });
                  }}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>{cfg.inboxTelegramAtivo ? "Ativo" : "Inativo"}</span>
              </label>
            </div>

            {cfg.inboxTelegramAtivo && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Rotulo dica="Obtido com o bot @BotFather no Telegram. Ex: 123456789:ABCdef...">
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
                    <Rotulo dica="Seu ID numérico de usuário no Telegram (consulte pelo bot @userinfobot).">
                      Chat ID do Telegram
                    </Rotulo>
                    <Campo
                      value={cfg.telegramChatId}
                      onChange={(e) => atualizar("telegramChatId", e.target.value)}
                      placeholder="Ex: 123456789"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Rotulo dica="Quando as notificações devem ser disparadas.">
                      Regra de Disparo
                    </Rotulo>
                    <select
                      value={cfg.inboxTelegramModo || "ambos"}
                      onChange={(e) => setCfg((c) => ({ ...c, inboxTelegramModo: e.target.value as any }))}
                      className="flex h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="ambos">Imediatamente e por inatividade</option>
                      <option value="imediatamente">Apenas no momento do vencimento</option>
                      <option value="inatividade">Apenas se permanecer não visto no app</option>
                    </select>
                  </div>

                  <div>
                    <Rotulo dica="Tempo sem visualização para escalonar alerta.">
                      Escala por Inatividade (Horas)
                    </Rotulo>
                    <Campo
                      type="number"
                      value={cfg.inboxEscalaHoras || 3}
                      onChange={(e) => setCfg((c) => ({ ...c, inboxEscalaHoras: Number(e.target.value) || 3 }))}
                      placeholder="3"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Botao
                    variante="neutro"
                    onClick={() => {
                      salvarConfig(cfg);
                      toast("Configurações do Telegram salvas!");
                    }}
                  >
                    <Save size={14} />
                    Salvar Ajustes do Telegram
                  </Botao>
                </div>
              </div>
            )}
          </Cartao>

          {/* Agendador Autônomo GitHub Actions */}
          <Cartao className="p-5 space-y-3 border-primary/20 bg-primary/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  Agendador Autônomo de Lembretes (GitHub Actions)
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  Instale a rotina gratuita no seu repositório de dados para receber os alertas no Telegram na hora marcada, mesmo com o computador desligado e o navegador fechado.
                </p>
              </div>

              <Botao
                variante="primario"
                tamanho="pequeno"
                onClick={instalarWorkflow}
                disabled={instalandoWorkflow}
                className="shrink-0"
              >
                <Sparkles size={14} className={instalandoWorkflow ? "animate-spin" : ""} />
                {instalandoWorkflow ? "Instalando..." : "Instalar Agendador no Repositório"}
              </Botao>
            </div>

            {msgWorkflow && (
              <Aviso tom={msgWorkflow.tom === "sucesso" ? "sucesso" : "erro"}>
                {msgWorkflow.texto}
              </Aviso>
            )}
          </Cartao>

          {/* Google Apps Script (E-mail) */}
          <Cartao className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ExternalLink size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm sm:text-base">Envio de E-mails via Google</h2>
                  <p className="text-xs text-muted-foreground">
                    Integração com Google Apps Script para disparo de e-mails de resumo diário.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs sm:text-sm shrink-0">
                <input
                  type="checkbox"
                  checked={cfg.googleEmailAtivo || false}
                  onChange={(e) => {
                    const ativo = e.target.checked;
                    atualizar("googleEmailAtivo", ativo);
                    salvarConfig({ ...cfg, googleEmailAtivo: ativo });
                  }}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>{cfg.googleEmailAtivo ? "Ativo" : "Inativo"}</span>
              </label>
            </div>

            {cfg.googleEmailAtivo && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                <div>
                  <Rotulo dica="URL pública gerada na publicação do seu WebApp script.google.com.">
                    URL da Webhook do Google Apps Script
                  </Rotulo>
                  <Campo
                    value={cfg.googleAppsScriptUrl}
                    onChange={(e) => atualizar("googleAppsScriptUrl", e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Botao
                    variante="neutro"
                    onClick={() => {
                      salvarConfig(cfg);
                      toast("Configurações do Google salvas!");
                    }}
                  >
                    <Save size={14} />
                    Salvar Webhook
                  </Botao>
                </div>
              </div>
            )}
          </Cartao>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 5: DADOS, BACKUP & MANUTENÇÃO */}
      {/* ========================================================= */}
      {abaAtiva === "dados" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Backup e Exportação / Importação */}
          <Cartao className="p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileUp size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-sm sm:text-base">Backup, Exportação & Importação</h2>
                <p className="text-xs text-muted-foreground">
                  Baixe cópias de segurança de todas as notas ou importe arquivos Markdown / Obsidian para o repositório.
                </p>
              </div>
            </div>

            {msgBackup && <Aviso tom="sucesso">{msgBackup}</Aviso>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <Botao variante="primario" onClick={exportarBackupZip} disabled={exportando}>
                <Download size={15} />
                {exportando ? "Gerando ZIP..." : "Baixar Tudo (.ZIP)"}
              </Botao>

              <Botao variante="neutro" onClick={exportarBackupJSON} disabled={exportando}>
                <Download size={15} />
                {exportando ? "Exportando..." : "Exportar Cofre (.JSON)"}
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
                  <Upload size={15} />
                  <span>{importando ? "Importando..." : "Importar .md / Obsidian"}</span>
                </div>
              </label>
            </div>
          </Cartao>

          {/* Padronização Global do Acervo */}
          <Cartao className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Layers size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm sm:text-base">Padronização Global do Acervo</h2>
                  <p className="text-xs text-muted-foreground">
                    Valide convenções de frontmatter (snake_case) e integridade de links no repositório.
                  </p>
                </div>
              </div>
            </div>

            {msgMigracao && <Aviso tom={msgMigracao.tom}>{msgMigracao.texto}</Aviso>}

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
                        Integridade de Links:
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
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Botao
                variante="neutro"
                onClick={analisarPadronizacao}
                disabled={analisandoAcervo || migrandoAcervo}
              >
                <RefreshCw size={15} className={analisandoAcervo ? "animate-spin" : ""} />
                {analisandoAcervo ? "Analisando acervo..." : "Analisar Conformidade"}
              </Botao>

              {relatorioMigracao && relatorioMigracao.arquivosPendentes > 0 && (
                <Botao onClick={executarPadronizacao} disabled={migrandoAcervo}>
                  <Sparkles size={15} className="text-amber-300" />
                  {migrandoAcervo
                    ? "Padronizando..."
                    : `Padronizar ${relatorioMigracao.arquivosPendentes} arquivo(s)`}
                </Botao>
              )}
            </div>
          </Cartao>

          {/* Limpeza de Processos Residuais (se houver) */}
          {arquivosProcessos.length > 0 && (
            <Cartao className="p-5 space-y-4 border-rose-500/40 bg-rose-500/5">
              <div>
                <h2 className="font-medium text-foreground flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <Trash2 size={18} />
                  Arquivos Residuais de Processos / CRM ({arquivosProcessos.length})
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Foram identificados <strong className="text-foreground">{arquivosProcessos.length}</strong> arquivos legados na pasta <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">processos/</code> no GitHub. Você pode excluí-los em 1 clique.
                </p>
              </div>

              {msgProcessos && <Aviso tom={msgProcessos.tom}>{msgProcessos.texto}</Aviso>}

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

              <div className="flex items-center gap-3 pt-2">
                <Botao
                  variante="perigo"
                  onClick={executarExclusaoProcessos}
                  disabled={excluindoProcessos}
                >
                  <Trash2 size={15} />
                  {excluindoProcessos
                    ? "Excluindo arquivos..."
                    : `Excluir ${arquivosProcessos.length} arquivos de processos`}
                </Botao>
              </div>
            </Cartao>
          )}

          {/* Dados de Demonstração / Testes */}
          <Cartao className="p-5 space-y-4 border-dashed border-primary/40 bg-primary/5">
            <div>
              <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
                <FlaskConical size={18} className="text-primary" />
                Ambiente de Demonstração & Testes (Demo Pack)
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Popule instantaneamente o Klaus com um conjunto de notas, tarefas, metas de PDI, referências e contatos para testar a experiência completa. Todos os arquivos recebem a tag <code className="font-mono text-primary">#demo</code> e podem ser excluídos a qualquer momento sem afetar seus dados reais.
              </p>
            </div>

            {msgDemo && (
              <Aviso tom={msgDemo.tom === "sucesso" ? "sucesso" : "erro"}>
                {msgDemo.texto}
              </Aviso>
            )}

            {progressoDemo && (
              <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border text-xs">
                <div className="flex justify-between font-semibold text-foreground">
                  <span>{populandoDemo ? "Gravando arquivos de teste..." : "Excluindo arquivos de teste..."}</span>
                  <span>{progressoDemo.atual} / {progressoDemo.total}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-150"
                    style={{ width: `${(progressoDemo.atual / progressoDemo.total) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{progressoDemo.caminho}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Botao
                variante="primario"
                onClick={handlePopularDemo}
                disabled={populandoDemo || apagandoDemo}
              >
                <Sparkles size={15} className={populandoDemo ? "animate-spin" : ""} />
                {populandoDemo ? "Criando dados..." : "Popular Dados de Teste"}
              </Botao>

              <Botao
                variante="perigo"
                onClick={() => setModalConfirmarLimpezaDemo(true)}
                disabled={populandoDemo || apagandoDemo}
              >
                <Trash2 size={15} className={apagandoDemo ? "animate-spin" : ""} />
                {apagandoDemo ? "Excluindo..." : "Remover Dados de Teste"}
              </Botao>
            </div>
          </Cartao>
        </div>
      )}

      {/* Modais de Suporte */}
      <ModalPersonalizarMenu
        aberta={modalPersonalizarAberta}
        aoFechar={() => setModalPersonalizarAberta(false)}
      />

      <ModalTourGuiado
        aberta={modalTourAberta}
        aoFechar={() => setModalTourAberta(false)}
      />

      <ModalConfirmacao
        aberto={modalConfirmarLimpezaDemo}
        titulo="Apagar todos os dados de demonstração?"
        descricao="Esta ação irá localizar e excluir permanentemente do repositório todos os arquivos gerados pelo pacote de testes (com a tag #demo). Suas notas e tarefas pessoais não serão afetadas."
        textoConfirmar="Excluir Dados de Teste"
        varianteConfirmar="perigo"
        aoConfirmar={handleApagarDemo}
        aoCancelar={() => setModalConfirmarLimpezaDemo(false)}
      />
    </div>
  );
}
