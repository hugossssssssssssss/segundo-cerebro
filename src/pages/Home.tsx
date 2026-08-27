import { useCallback, useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckSquare,
  FileText,
  Image as ImageIcon,
  Target,
  Layers,
  GitMerge,
  Layout,
  Globe,
  Edit3,
} from "lucide-react";

import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, daPasta, invalidarCache } from "@/lib/repo";
import { useSalvar } from "@/lib/useSalvar";
import { comoTarefa, type Tarefa } from "@/lib/tarefas";
import { tarefaParaArquivo } from "@/lib/entidades";
import { comoReferencia, type Referencia } from "@/lib/referencias";
import { comoMeta, comoEntrega, resumir, type ResumoMeta } from "@/lib/pdi";
import { tituloProvavel, escreverMarkdown, nomeLivre } from "@/lib/markdown";
import { PASTAS } from "@/lib/tipos";
import { toast } from "@/lib/toast";

import { Vazio, Carregando } from "@/components/ui";
import { CapturaRapida } from "@/components/CapturaRapida";
import { Busca } from "@/components/Busca";

// Suíte Modular Bento Home
import {
  type WidgetConfig,
  CONFIG_PADRAO_WIDGETS,
  CATALOGO_WIDGETS,
} from "@/components/home/types";
import { CabecalhoHome } from "@/components/home/CabecalhoHome";
import { PulseKPIs } from "@/components/home/PulseKPIs";
import { WidgetWrapper } from "@/components/home/WidgetWrapper";
import { WidgetFocoHoje } from "@/components/home/WidgetFocoHoje";
import { WidgetNotasRecentes, type NotaItemHome } from "@/components/home/WidgetNotasRecentes";
import { WidgetReferenciasMural } from "@/components/home/WidgetReferenciasMural";
import { WidgetMetasPDI } from "@/components/home/WidgetMetasPDI";
import { WidgetScratchpad } from "@/components/home/WidgetScratchpad";
import { WidgetHubFerramentas } from "@/components/home/WidgetHubFerramentas";
import { WidgetProcessosCRM, type ProcessoItemHome } from "@/components/home/WidgetProcessosCRM";
import { WidgetLousasRecentes, type LousaItemHome } from "@/components/home/WidgetLousasRecentes";
import { WidgetBuscaWeb } from "@/components/home/WidgetBuscaWeb";
import { PainelPersonalizarHome } from "@/components/home/PainelPersonalizarHome";

export default function Home() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const navegar = useNavigate();
  const { salvarTexto } = useSalvar(cfg);

  // ── Estados de Dados ──────────────────────────────────────────────────────
  const [carregando, setCarregando] = useState(true);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [notas, setNotas] = useState<NotaItemHome[]>([]);
  const [referencias, setReferencias] = useState<Referencia[]>([]);
  const [resumosPdi, setResumosPdi] = useState<ResumoMeta[]>([]);
  const [processos, setProcessos] = useState<ProcessoItemHome[]>([]);
  const [lousas, setLousas] = useState<LousaItemHome[]>([]);

  // ── Configuração dos Widgets (Bento Grid) ──────────────────────────────────
  const [configWidgets, setConfigWidgets] = useState<WidgetConfig[]>(() => {
    const salvo = localStorage.getItem("klaus_home_bento_config");
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return CONFIG_PADRAO_WIDGETS;
  });

  const [modoEdicaoRapida, setModoEdicaoRapida] = useState(() => {
    return localStorage.getItem("klaus_home_modo_edicao") === "true";
  });

  const [painelPersonalizarAberto, setPainelPersonalizarAberto] = useState(false);
  const [capturaAberta, setCapturaAberta] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);

  // Salva configurações de widgets no localStorage
  const salvarConfigWidgets = (novaConfig: WidgetConfig[]) => {
    setConfigWidgets(novaConfig);
    localStorage.setItem("klaus_home_bento_config", JSON.stringify(novaConfig));
  };

  const alternarModoEdicao = () => {
    const novoValor = !modoEdicaoRapida;
    setModoEdicaoRapida(novoValor);
    localStorage.setItem("klaus_home_modo_edicao", String(novoValor));
  };

  const restaurarPadrao = () => {
    salvarConfigWidgets(CONFIG_PADRAO_WIDGETS);
    toast("Layout da tela inicial restaurado para o padrão!");
  };

  // ── Carregamento do Repositório ───────────────────────────────────────────
  const carregarDados = useCallback(async () => {
    if (!pronto) {
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      const todos = await carregarRepo(cfg);

      // 1. Tarefas
      const docsTarefas = daPasta(todos, PASTAS.tarefas);
      const listaTarefas = docsTarefas.map((i) =>
        comoTarefa(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome))
      );
      setTarefas(listaTarefas);

      // 2. Notas
      const docsNotas = daPasta(todos, PASTAS.notas);
      const listaNotas: NotaItemHome[] = docsNotas.map((i) => ({
        caminho: i.caminho,
        sha: i.sha,
        titulo: tituloProvavel(i.doc, i.nome),
        corpo: i.doc.corpo,
        tags: Array.isArray(i.doc.dados.tags) ? i.doc.dados.tags : [],
        atualizadoEm: (i.doc.dados.atualizado as string) || (i.doc.dados.criado as string),
      }));
      setNotas(listaNotas);

      // 3. Referências
      const docsRefs = daPasta(todos, PASTAS.referencias);
      const listaRefs = docsRefs.map((i) =>
        comoReferencia(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome))
      );
      setReferencias(listaRefs);

      // 4. PDI (Metas e Entregas)
      const docsMetas = daPasta(todos, PASTAS.metas);
      const docsEntregas = daPasta(todos, PASTAS.entregas);
      const metas = docsMetas.map((i) =>
        comoMeta(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome))
      );
      const entregas = docsEntregas.map((i) =>
        comoEntrega(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome))
      );
      setResumosPdi(resumir(metas, entregas));

      // 5. Processos
      const docsProcessos = daPasta(todos, "processos");
      setProcessos(
        docsProcessos.map((i) => ({
          caminho: i.caminho,
          titulo: tituloProvavel(i.doc, i.nome),
        }))
      );

      // 6. Lousas
      const docsLousas = daPasta(todos, "lousas");
      setLousas(
        docsLousas.map((i) => ({
          caminho: i.caminho,
          titulo: tituloProvavel(i.doc, i.nome),
        }))
      );
    } catch {
      // Erro silencioso ou gerenciado
    } finally {
      setCarregando(false);
    }
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // ── Atalho Global ⌘K para Busca ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscaAberta((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Ações Rápidas nos Widgets ─────────────────────────────────────────────

  // Alternar conclusão de tarefa diretamente no widget da Home
  const aoAlternarConclusaoTarefa = async (tarefa: Tarefa) => {
    const novoStatus: Tarefa["status"] = tarefa.status === "feito" ? "a-fazer" : "feito";
    const atualizada: Tarefa = { ...tarefa, status: novoStatus };

    // Atualização otimista
    setTarefas((prev) =>
      prev.map((t) => (t.caminho === tarefa.caminho ? atualizada : t))
    );

    const { dados, corpo } = tarefaParaArquivo(atualizada);
    const texto = escreverMarkdown({ dados, corpo });

    try {
      await salvarTexto(
        tarefa.caminho,
        texto,
        tarefa.sha,
        `atualizar status: ${tarefa.titulo} (${novoStatus})`
      );
      invalidarCache();
      toast(
        novoStatus === "feito"
          ? `Tarefa "${tarefa.titulo}" concluída!`
          : `Tarefa reaberta.`
      );
    } catch (err: any) {
      toast(`Erro ao salvar tarefa: ${err?.message || err}`, { tipo: "erro" });
      carregarDados();
    }
  };

  // Criar tarefa rápida
  const aoCriarTarefaRapida = async (titulo: string) => {
    const hoje = new Date().toISOString().split("T")[0];
    const nova: Tarefa = {
      bruto: {},
      caminho: "",
      sha: "",
      titulo,
      status: "a-fazer",
      prazo: hoje,
      tags: [],
      corpo: "",
    };

    const caminhosExistentes = tarefas.map((t) => t.caminho);
    const caminho = nomeLivre(PASTAS.tarefas, titulo, caminhosExistentes);
    const { dados, corpo } = tarefaParaArquivo(nova);
    const texto = escreverMarkdown({ dados, corpo });

    try {
      const sha = await salvarTexto(caminho, texto, undefined, `criar tarefa: ${titulo}`);
      invalidarCache();
      setTarefas((prev) => [{ ...nova, caminho, sha }, ...prev]);
      toast(`Tarefa "${titulo}" criada!`);
    } catch (err: any) {
      toast(`Erro ao criar tarefa: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  // Converter scratchpad em nota completa
  const aoConverterScratchpadEmNota = async (conteudo: string) => {
    const linhas = conteudo.trim().split("\n");
    const primeiraLinha = linhas[0].replace(/^[#>\s-]+/, "").trim();
    const titulo = primeiraLinha.slice(0, 50) || `Nota Rápida ${new Date().toLocaleDateString("pt-BR")}`;
    const corpo = linhas.length > 1 ? linhas.slice(1).join("\n").trim() : conteudo;

    const caminhosExistentes = notas.map((n) => n.caminho);
    const caminho = nomeLivre(PASTAS.notas, titulo, caminhosExistentes);
    const texto = escreverMarkdown({
      dados: {
        titulo,
        criado: new Date().toISOString().split("T")[0],
        tags: ["rascunho"],
      },
      corpo,
    });

    try {
      const sha = await salvarTexto(caminho, texto, undefined, `criar nota do scratchpad: ${titulo}`);
      invalidarCache();
      setNotas((prev) => [
        { caminho, sha, titulo, corpo, tags: ["rascunho"] },
        ...prev,
      ]);
      toast(`Nota "${titulo}" criada com sucesso!`);
    } catch (err: any) {
      toast(`Erro ao converter nota: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  // ── Métricas de Topo (KPIs) ───────────────────────────────────────────────
  const hojeStr = new Date().toISOString().split("T")[0];

  const tarefasHojeCount = useMemo(() => {
    return tarefas.filter((t) => t.status !== "feito" && (!t.prazo || t.prazo <= hojeStr)).length;
  }, [tarefas, hojeStr]);

  const tarefasUrgentesCount = useMemo(() => {
    return tarefas.filter((t) => t.status !== "feito" && t.prazo && t.prazo < hojeStr).length;
  }, [tarefas, hojeStr]);

  const progressoPdiGeral = useMemo(() => {
    if (resumosPdi.length === 0) return 0;
    const concluidas = resumosPdi.filter((r) => r.meta.status === "concluida").length;
    return Math.round((concluidas / resumosPdi.length) * 100);
  }, [resumosPdi]);

  const metasAtivasCount = useMemo(() => {
    return resumosPdi.filter((r) => r.meta.status !== "concluida").length;
  }, [resumosPdi]);

  // ── Sem Configuração ──────────────────────────────────────────────────────
  if (!pronto) {
    return (
      <Vazio
        titulo="Falta conectar seu repositório"
        descricao="Configure o GitHub Token e o Repositório de dados em Ajustes para carregar sua tela inicial."
        acao={
          <Link
            to="/config"
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-md hover:bg-primary/95 transition-all"
          >
            Configurar Conexão
          </Link>
        }
      />
    );
  }

  const nomeExibicao = cfg.repoOwner || "Hugo";

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full pb-12">
      {/* 1. Cockpit de Saudação e Comandos Rápidos */}
      <CabecalhoHome
        nomeUsuario={nomeExibicao}
        aoAbrirCapturaRapida={() => setCapturaAberta(true)}
        aoCriarNota={() => navegar("/notas?criar=true")}
        aoCriarTarefa={() => navegar("/tarefas?criar=true")}
        aoAbrirPersonalizar={() => setPainelPersonalizarAberto(true)}
        aoAbrirBusca={() => setBuscaAberta(true)}
      />

      {/* 2. Pulso de Indicadores Essenciais (KPIs de Topo) */}
      <PulseKPIs
        tarefasHoje={tarefasHojeCount}
        tarefasUrgentes={tarefasUrgentesCount}
        totalNotas={notas.length}
        totalReferencias={referencias.length}
        progressoPdi={progressoPdiGeral}
        metasAtivas={metasAtivasCount}
      />

      {/* 3. Grid Principal Bento da Tela Inicial */}
      {carregando ? (
        <Carregando texto="Carregando seu segundo cérebro..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {configWidgets
            .filter((w) => w.ativo)
            .sort((a, b) => a.ordem - b.ordem)
            .map((widget) => {
              const info = CATALOGO_WIDGETS.find((c) => c.id === widget.id);
              if (!info) return null;

              const Icone = {
                CheckSquare,
                FileText,
                ImageIcon,
                Target,
                Layers,
                GitMerge,
                Layout,
                Globe,
                Edit3,
              }[info.icone as string] || SparklesIcon;

              return (
                <WidgetWrapper
                  key={widget.id}
                  id={widget.id}
                  titulo={info.titulo}
                  icone={Icone}
                  corIcone={info.corIcone}
                  tamanho={widget.tamanho}
                  linkVerMais={
                    widget.id === "foco_hoje"
                      ? "/tarefas"
                      : widget.id === "notas_recentes"
                      ? "/notas"
                      : widget.id === "referencias_mural"
                      ? "/referencias"
                      : widget.id === "metas_pdi"
                      ? "/pdi"
                      : widget.id === "processos_crm"
                      ? "/processos"
                      : widget.id === "lousas_recentes"
                      ? "/lousas"
                      : undefined
                  }
                  modoEdicao={modoEdicaoRapida}
                  aoMudarTamanho={(novoTam) => {
                    salvarConfigWidgets(
                      configWidgets.map((c) =>
                        c.id === widget.id ? { ...c, tamanho: novoTam } : c
                      )
                    );
                  }}
                  aoRemover={() => {
                    salvarConfigWidgets(
                      configWidgets.map((c) =>
                        c.id === widget.id ? { ...c, ativo: false } : c
                      )
                    );
                  }}
                >
                  {/* Renderização Dinâmica do Conteúdo dos Widgets */}
                  {widget.id === "foco_hoje" && (
                    <WidgetFocoHoje
                      tarefas={tarefas}
                      aoAlternarConclusao={aoAlternarConclusaoTarefa}
                      aoAbrirTarefa={(t) => navegar(`/tarefas?abrir=${encodeURIComponent(t.caminho)}`)}
                      aoCriarRapida={aoCriarTarefaRapida}
                    />
                  )}

                  {widget.id === "scratchpad" && (
                    <WidgetScratchpad aoConverterEmNota={aoConverterScratchpadEmNota} />
                  )}

                  {widget.id === "notas_recentes" && (
                    <WidgetNotasRecentes
                      notas={notas}
                      aoAbrirNota={(caminho) => navegar(`/notas?abrir=${encodeURIComponent(caminho)}`)}
                    />
                  )}

                  {widget.id === "referencias_mural" && (
                    <WidgetReferenciasMural
                      referencias={referencias}
                      aoAbrirReferencia={(ref) => navegar(`/referencias?abrir=${encodeURIComponent(ref.caminho)}`)}
                    />
                  )}

                  {widget.id === "metas_pdi" && (
                    <WidgetMetasPDI
                      resumos={resumosPdi}
                      aoAbrirMeta={(caminho) => navegar(`/pdi?abrir=${encodeURIComponent(caminho)}`)}
                    />
                  )}

                  {widget.id === "hub_ferramentas" && <WidgetHubFerramentas />}

                  {widget.id === "processos_crm" && (
                    <WidgetProcessosCRM
                      processos={processos}
                      aoAbrirProcesso={() => navegar("/processos")}
                    />
                  )}

                  {widget.id === "lousas_recentes" && (
                    <WidgetLousasRecentes
                      lousas={lousas}
                      aoAbrirLousa={() => navegar("/lousas")}
                    />
                  )}

                  {widget.id === "busca_web" && <WidgetBuscaWeb />}
                </WidgetWrapper>
              );
            })}
        </div>
      )}

      {/* Painel Lateral de Personalização */}
      <PainelPersonalizarHome
        aberto={painelPersonalizarAberto}
        aoFechar={() => setPainelPersonalizarAberto(false)}
        configWidgets={configWidgets}
        aoMudarConfig={salvarConfigWidgets}
        aoRestaurarPadrao={restaurarPadrao}
        modoEdicaoRapida={modoEdicaoRapida}
        aoAlternarModoEdicao={alternarModoEdicao}
      />

      {/* Modal de Captura Rápida */}
      <CapturaRapida aberta={capturaAberta} aoFechar={() => setCapturaAberta(false)} />

      {/* Modal de Busca Global Avançada */}
      <Busca aberta={buscaAberta} aoFechar={() => setBuscaAberta(false)} />
    </div>
  );
}

function SparklesIcon(props: any) {
  return <Layers {...props} />;
}
