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
  FileImage,
  Scissors,
  Mic,
  Headphones,
  Video,
  BookOpen,
  Network,
  Newspaper,
  Calendar,
  MessageSquare,
  Tag,
} from "lucide-react";

import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, daPasta, invalidarCache } from "@/lib/repo";
import { useSalvar } from "@/lib/useSalvar";
import { comoTarefa, type Tarefa } from "@/lib/tarefas";
import { tarefaParaArquivo, notaParaArquivo } from "@/lib/entidades";
import { comoReferencia, type Referencia } from "@/lib/referencias";
import { comoMeta, comoEntrega, resumir, type ResumoMeta } from "@/lib/pdi";
import { tituloProvavel, escreverMarkdown, lerMarkdown, nomeLivre } from "@/lib/markdown";
import { ler as lerArquivoGithub } from "@/lib/github";
import { PASTAS } from "@/lib/tipos";
import { toast } from "@/lib/toast";
import { hojeISO } from "@/lib/utils";
import { useFerramentasFlutuantes } from "@/components/ContextoFerramentasFlutuantes";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";

import { Vazio, Aviso } from "@/components/ui";

// Suíte Modular Bento Home
import {
  type WidgetConfig,
  type ColunasWidget,
  type InfoWidgetCatalogo,
  CONFIG_PADRAO_WIDGETS,
  CATALOGO_WIDGETS,
} from "@/components/home/types";
import { CabecalhoHome } from "@/components/home/CabecalhoHome";
import { WidgetWrapper } from "@/components/home/WidgetWrapper";
import { WidgetFocoHoje } from "@/components/home/WidgetFocoHoje";
import { WidgetNotasRecentes, type NotaItemHome } from "@/components/home/WidgetNotasRecentes";
import { WidgetReferenciasMural } from "@/components/home/WidgetReferenciasMural";
import { WidgetMetasPDI } from "@/components/home/WidgetMetasPDI";
import { WidgetScratchpad } from "@/components/home/WidgetScratchpad";
import { WidgetHubFerramentas } from "@/components/home/WidgetHubFerramentas";
import { WidgetLousasRecentes, type LousaItemHome } from "@/components/home/WidgetLousasRecentes";
import { WidgetBuscaWeb } from "@/components/home/WidgetBuscaWeb";
import { WidgetConversorRapido } from "@/components/home/WidgetConversorRapido";
import { WidgetBaixadorRapido } from "@/components/home/WidgetBaixadorRapido";
import { WidgetPDFRapido } from "@/components/home/WidgetPDFRapido";
import { WidgetITToolsRapido } from "@/components/home/WidgetITToolsRapido";
import { WidgetTranscritorVoz } from "@/components/home/WidgetTranscritorVoz";
import { WidgetSonsFoco } from "@/components/home/WidgetSonsFoco";
import { WidgetChatIA } from "@/components/home/WidgetChatIA";
import { ModalCatalogoWidgets } from "@/components/home/ModalCatalogoWidgets";

const CHAVE_SNAPSHOT_HOME = "klaus_home_cache_snapshot";

interface SnapshotHome {
  tarefas: Tarefa[];
  notas: NotaItemHome[];
  referencias: Referencia[];
  resumosPdi: ResumoMeta[];
  lousas: LousaItemHome[];
}

export default function Home() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const navegar = useNavigate();
  const { salvarTexto, salvando } = useSalvar(cfg);
  const { abrirFerramentaFlutuante } = useFerramentasFlutuantes();

  // ── Carregamento Instantâneo com Cache Snapshot (0ms) ─────────────────────
  const snapshotInicial = useMemo<SnapshotHome>(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_SNAPSHOT_HOME);
      if (salvo) return JSON.parse(salvo);
    } catch {}
    return {
      tarefas: [],
      notas: [],
      referencias: [],
      resumosPdi: [],
      lousas: [],
    };
  }, []);

  const [tarefas, setTarefas] = useState<Tarefa[]>(snapshotInicial.tarefas);
  const [notas, setNotas] = useState<NotaItemHome[]>(snapshotInicial.notas);
  const [referencias, setReferencias] = useState<Referencia[]>(snapshotInicial.referencias);
  const [resumosPdi, setResumosPdi] = useState<ResumoMeta[]>(snapshotInicial.resumosPdi);
  const [lousas, setLousas] = useState<LousaItemHome[]>(snapshotInicial.lousas);

  // ── Abertura Fluida de Documento na Home (Sem Redirecionar) ───────────────
  interface NotaAbertaHome {
    caminho: string;
    sha?: string;
    titulo: string;
    corpo: string;
    dadosProps: Record<string, any>;
    original: {
      titulo: string;
      corpo: string;
      dadosProps: Record<string, any>;
    };
  }

  const [notaAbertaHome, setNotaAbertaHome] = useState<NotaAbertaHome | null>(null);
  const [erroCarregarHome, setErroCarregarHome] = useState<string | null>(null);
  const [modoVisaoNotaHome, setModoVisaoNotaHome] = useState<ModoVisaoNotion>(() => {
    const salvo = localStorage.getItem("klaus_modo_visao_notas");
    return (salvo as ModoVisaoNotion) || "lado";
  });

  const abrirNotaHome = useCallback(
    async (caminho: string) => {
      // 1. Procura na lista local de notas para abrir em 0ms!
      const local = notas.find((n) => n.caminho === caminho);
      const titulo =
        local?.titulo || caminho.split("/").pop()?.replace(/\.md$/, "") || "Nota";
      const corpo = local?.corpo || "";
      const dadosIniciais = { tags: local?.tags || [] };

      setNotaAbertaHome({
        caminho,
        sha: local?.sha,
        titulo,
        corpo,
        dadosProps: dadosIniciais,
        original: {
          titulo,
          corpo,
          dadosProps: dadosIniciais,
        },
      });

      // 2. Em segundo plano, busca conteúdo completo mais recente se necessário
      if (pronto) {
        try {
          const itemRemoto = await lerArquivoGithub(cfg, caminho);
          if (itemRemoto && itemRemoto.texto) {
            const lido = lerMarkdown(itemRemoto.texto);
            const tituloRemoto = String(lido.dados.titulo || titulo);
            setNotaAbertaHome((antigo) => {
              if (!antigo || antigo.caminho !== caminho) return antigo;
              if (
                antigo.titulo === antigo.original.titulo &&
                antigo.corpo === antigo.original.corpo
              ) {
                return {
                  caminho,
                  sha: itemRemoto.sha,
                  titulo: tituloRemoto,
                  corpo: lido.corpo,
                  dadosProps: lido.dados,
                  original: {
                    titulo: tituloRemoto,
                    corpo: lido.corpo,
                    dadosProps: lido.dados,
                  },
                };
              }
              return { ...antigo, sha: itemRemoto.sha };
            });
          }
        } catch {
          // Mantém versão carregada
        }
      }
    },
    [notas, pronto, cfg.githubToken, cfg.repoOwner, cfg.repoName, cfg.branch],
  );

  const salvarNotaHome = useCallback(async () => {
    if (!notaAbertaHome) return;
    const { dados, corpo } = notaParaArquivo({
      caminho: notaAbertaHome.caminho,
      sha: notaAbertaHome.sha || "",
      titulo: notaAbertaHome.titulo.trim() || "Sem título",
      tipo: "nota",
      tags: Array.isArray(notaAbertaHome.dadosProps.tags)
        ? notaAbertaHome.dadosProps.tags
        : [],
      corpo: notaAbertaHome.corpo,
      bruto: notaAbertaHome.dadosProps,
    });

    const texto = escreverMarkdown({ dados, corpo });
    const novoSha = await salvarTexto(
      notaAbertaHome.caminho,
      texto,
      notaAbertaHome.sha,
      `atualizar nota: ${notaAbertaHome.titulo}`,
    );

    if (novoSha) {
      setNotaAbertaHome((antigo) =>
        antigo
          ? {
              ...antigo,
              sha: novoSha,
              original: {
                titulo: antigo.titulo,
                corpo: antigo.corpo,
                dadosProps: antigo.dadosProps,
              },
            }
          : null,
      );

      // Atualiza lista de notas na Home para refletir imediatamente
      setNotas((antigas) =>
        antigas.map((n) =>
          n.caminho === notaAbertaHome.caminho
            ? {
                ...n,
                titulo: notaAbertaHome.titulo,
                corpo: notaAbertaHome.corpo,
                tags: Array.isArray(notaAbertaHome.dadosProps.tags)
                  ? notaAbertaHome.dadosProps.tags
                  : n.tags,
                sha: novoSha,
              }
            : n,
        ),
      );
      toast("Documento salvo!");
    }
  }, [notaAbertaHome, salvarTexto]);

  const temMudancasNotaHome = useMemo(() => {
    if (!notaAbertaHome) return false;
    return (
      notaAbertaHome.titulo !== notaAbertaHome.original.titulo ||
      notaAbertaHome.corpo !== notaAbertaHome.original.corpo ||
      JSON.stringify(notaAbertaHome.dadosProps) !==
        JSON.stringify(notaAbertaHome.original.dadosProps)
    );
  }, [notaAbertaHome]);

  // ── Configuração dos Widgets (Grade de 12 Colunas com Tamanho Livre) ──────
  const [configWidgets, setConfigWidgets] = useState<WidgetConfig[]>(() => {
    const salvo = localStorage.getItem("klaus_home_bento_config_v3");
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return CONFIG_PADRAO_WIDGETS;
  });

  const [modoEdicao, setModoEdicao] = useState(() => {
    return localStorage.getItem("klaus_home_modo_edicao") === "true";
  });

  const [catalogoAberto, setCatalogoAberto] = useState(false);

  // Salva configurações de widgets no localStorage
  const salvarConfigWidgets = (novaConfig: WidgetConfig[]) => {
    setConfigWidgets(novaConfig);
    localStorage.setItem("klaus_home_bento_config_v3", JSON.stringify(novaConfig));
  };

  const alternarModoEdicao = () => {
    const novoValor = !modoEdicao;
    setModoEdicao(novoValor);
    localStorage.setItem("klaus_home_modo_edicao", String(novoValor));
  };

  const restaurarPadrao = () => {
    salvarConfigWidgets(CONFIG_PADRAO_WIDGETS);
    toast("Layout da tela inicial restaurado para o padrão!");
  };

  // ── Atualização em Segundo Plano do Repositório ───────────────────────────
  const carregarDados = useCallback(async () => {
    if (!pronto) return;

    try {
      const todos = await carregarRepo(cfg, { memoria: 20_000 });

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
      const listaResumos = resumir(metas, entregas);
      setResumosPdi(listaResumos);

      // 5. Lousas
      const docsLousas = daPasta(todos, "lousas");
      const listaLousas = docsLousas.map((i) => ({
        caminho: i.caminho,
        titulo: tituloProvavel(i.doc, i.nome),
      }));
      setLousas(listaLousas);

      // Salva snapshot compacto no localStorage para abertura instantânea (0ms)
      try {
        localStorage.setItem(
          CHAVE_SNAPSHOT_HOME,
          JSON.stringify({
            tarefas: listaTarefas,
            notas: listaNotas.map((n) => ({ ...n, corpo: (n.corpo || "").slice(0, 300) })),
            referencias: listaRefs,
            resumosPdi: listaResumos,
            lousas: listaLousas,
          })
        );
      } catch {
        // ignora se localStorage estiver lotado
      }
      setErroCarregarHome(null);
    } catch (e: any) {
      setErroCarregarHome(e?.message || "Não foi possível carregar os dados mais recentes do GitHub.");
    }
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  useEffect(() => {
    carregarDados();
    const aoAtualizar = () => carregarDados();
    window.addEventListener("acervo-atualizado", aoAtualizar);
    return () => window.removeEventListener("acervo-atualizado", aoAtualizar);
  }, [carregarDados]);

  // ── Ações Rápidas nos Widgets ─────────────────────────────────────────────

  // Alternar conclusão de tarefa diretamente no widget da Home
  const aoAlternarConclusaoTarefa = async (tarefa: Tarefa) => {
    const novoStatus: Tarefa["status"] = tarefa.status === "feito" ? "a-fazer" : "feito";
    const atualizada: Tarefa = { ...tarefa, status: novoStatus };

    // Atualização otimista imediata
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
    const hoje = hojeISO();
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
        criado: hojeISO(),
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

  // Alternar widget pelo catálogo visual
  const aoAlternarWidgetCatalogo = (info: InfoWidgetCatalogo) => {
    const existe = configWidgets.find((c) => c.id === info.id);
    if (existe) {
      salvarConfigWidgets(
        configWidgets.map((c) => (c.id === info.id ? { ...c, ativo: !c.ativo } : c))
      );
    } else {
      salvarConfigWidgets([
        ...configWidgets,
        { id: info.id, ativo: true, colunas: info.colunasPadrao, alturaPx: info.alturaPadraoPx, ordem: configWidgets.length },
      ]);
    }
  };

  const aoMudarDimensoesWidget = (id: string, colunas: ColunasWidget, alturaPx: number) => {
    salvarConfigWidgets(
      configWidgets.map((c) => (c.id === id ? { ...c, colunas, alturaPx } : c))
    );
  };

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

  // Nome do usuário inserido no Onboarding
  const nomeExibicao = cfg.nomeUsuario?.trim() || "Hugo";

  return (
    <div className="space-y-4 animate-in fade-in duration-150 w-full max-w-none">
      {/* 1. Cockpit de Saudação Minimalista */}
      <CabecalhoHome
        nomeUsuario={nomeExibicao}
        aoAbrirCatalogo={() => setCatalogoAberto(true)}
        modoEdicao={modoEdicao}
        aoAlternarModoEdicao={alternarModoEdicao}
        aoRestaurarPadrao={restaurarPadrao}
      />

      {erroCarregarHome && (
        <Aviso tom="erro">
          {erroCarregarHome}. Os itens exibidos abaixo usam a cópia local em cache.
        </Aviso>
      )}

      {/* 2. Malha de 12 Colunas com Total Liberdade de Largura e Altura */}
      <div className="grid grid-cols-12 gap-3.5 items-start w-full">
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
              FileImage,
              Scissors,
              Mic,
              Headphones,
              Video,
              BookOpen,
              Network,
              Newspaper,
              Calendar,
              MessageSquare,
            }[info.icone as string] || Layers;

            const abrirPopup = info.ferramentaPopupId
              ? () => abrirFerramentaFlutuante(info.ferramentaPopupId!)
              : undefined;

            return (
              <WidgetWrapper
                key={widget.id}
                id={widget.id}
                titulo={info.titulo}
                icone={Icone}
                colunas={widget.colunas}
                alturaPx={widget.alturaPx}
                aoAbrirPopup={abrirPopup}
                linkVerMais={
                  widget.id === "foco_hoje"
                    ? "/tarefas"
                    : widget.id === "notas_recentes"
                    ? "/notas"
                    : widget.id === "referencias_mural"
                    ? "/referencias"
                    : widget.id === "metas_pdi"
                    ? "/pdi"
                    : widget.id === "lousas_recentes"
                    ? "/lousas"
                    : widget.id === "baixador_midia"
                    ? "/baixador"
                    : widget.id === "conversor_arquivos"
                    ? "/conversor"
                    : widget.id === "ferramentas_pdf"
                    ? "/pdf"
                    : widget.id === "transcritor_voz"
                    ? "/transcritor"
                    : widget.id === "sons_foco"
                    ? "/sons"
                    : widget.id === "hardware_test"
                    ? "/hardware"
                    : widget.id === "pesquisa_livros"
                    ? "/livros"
                    : widget.id === "grafo_neural"
                    ? "/grafo"
                    : widget.id === "noticias_feed"
                    ? "/noticias"
                    : widget.id === "calendario_home"
                    ? "/calendario"
                    : widget.id === "chat_ia"
                    ? "/chat"
                    : undefined
                }
                modoEdicao={modoEdicao}
                aoMudarDimensoes={(novasColunas, novaAlturaPx) =>
                  aoMudarDimensoesWidget(widget.id, novasColunas, novaAlturaPx)
                }
                aoRemover={() => {
                  salvarConfigWidgets(
                    configWidgets.map((c) =>
                      c.id === widget.id ? { ...c, ativo: false } : c
                    )
                  );
                }}
              >
                {/* ── Conteúdo dos Widgets ── */}
                {widget.id === "busca_web" && <WidgetBuscaWeb />}

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
                    aoAbrirNota={abrirNotaHome}
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

                {widget.id === "lousas_recentes" && (
                  <WidgetLousasRecentes
                    lousas={lousas}
                    aoAbrirLousa={() => navegar("/lousas")}
                  />
                )}

                {/* ── Ferramentas Dedicadas com Popup ── */}
                {widget.id === "baixador_midia" && (
                  <WidgetBaixadorRapido aoAbrirPopup={(ferramentaId) => abrirFerramentaFlutuante(ferramentaId || "baixador_midia")} />
                )}

                {widget.id === "conversor_arquivos" && (
                  <WidgetConversorRapido aoAbrirPopup={(ferramentaId) => abrirFerramentaFlutuante(ferramentaId || "conversor")} />
                )}

                {widget.id === "ferramentas_pdf" && (
                  <WidgetPDFRapido aoAbrirPopup={(ferramentaId) => abrirFerramentaFlutuante(ferramentaId || "ferramentas_pdf")} />
                )}

                {widget.id === "it_tools" && (
                  <WidgetITToolsRapido aoAbrirPopup={(ferramentaId) => abrirFerramentaFlutuante(ferramentaId || "it_tools")} />
                )}

                {widget.id === "transcritor_voz" && (
                  <WidgetTranscritorVoz aoAbrirPopup={() => abrirFerramentaFlutuante("transcritor")} />
                )}

                {widget.id === "sons_foco" && (
                  <WidgetSonsFoco aoAbrirPopup={() => abrirFerramentaFlutuante("sons")} />
                )}

                {widget.id === "chat_ia" && (
                  <WidgetChatIA aoAbrirPopup={(mensagem) => abrirFerramentaFlutuante("chat_ia", mensagem ? { mensagemInicial: mensagem } : undefined)} />
                )}
              </WidgetWrapper>
            );
          })}
      </div>

      {/* Modal Didático de Catálogo de Widgets */}
      <ModalCatalogoWidgets
        aberto={catalogoAberto}
        aoFechar={() => setCatalogoAberto(false)}
        configWidgets={configWidgets}
        aoAlternarWidget={aoAlternarWidgetCatalogo}
      />

      {/* Painel Fluido do Notion na Home (sem navegação e com resposta imediata) */}
      {notaAbertaHome && (
        <PainelNotionBase
          rotuloTipo="Nota"
          modoVisao={modoVisaoNotaHome}
          setModoVisao={(m) => {
            setModoVisaoNotaHome(m);
            localStorage.setItem("klaus_modo_visao_notas", m);
          }}
          titulo={notaAbertaHome.titulo}
          setTitulo={(t) =>
            setNotaAbertaHome((antigo) => (antigo ? { ...antigo, titulo: t } : null))
          }
          corpo={notaAbertaHome.corpo}
          setCorpo={(c) =>
            setNotaAbertaHome((antigo) => (antigo ? { ...antigo, corpo: c } : null))
          }
          caminhoItem={notaAbertaHome.caminho}
          dadosProps={notaAbertaHome.dadosProps}
          onChangeProps={(novosDados) =>
            setNotaAbertaHome((antigo) =>
              antigo ? { ...antigo, dadosProps: novosDados } : null,
            )
          }
          camposFixosProps={{
            tipo: {
              icone: <FileText className="h-4 w-4 opacity-50 text-orange-500" />,
              tipo: "select",
              opcoes: ["nota", "referencia", "rascunho"],
            },
            tags: {
              icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />,
              tipo: "multiselect",
            },
          }}
          salvando={salvando}
          temMudancas={temMudancasNotaHome}
          aoFechar={() => setNotaAbertaHome(null)}
          aoSalvar={salvarNotaHome}
        />
      )}
    </div>
  );
}
