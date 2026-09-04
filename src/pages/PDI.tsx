import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Target,
  Calendar,
  Package,
  AlertTriangle,
  Sparkles,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Plus,
  Folder,
  Tag,
  TrendingUp,
  MessageSquareQuote,
  Users,
  User,
  Award,
  GripVertical,
  LayoutGrid,
  List,
  Table,
  Columns3,
  Trash2,
  Link2,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { BarraAcoesLote, BotaoAcaoLote } from "@/components/BarraAcoesLote";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { AlternadorVisao } from "@/components/AlternadorVisao";
import { lerConfig, configCompleta } from "@/lib/settings";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import { PASTAS, OPCOES_COLABORACAO_PADRAO } from "@/lib/tipos";
import { comoMeta, comoEntrega, comoTarefa, comoContato, metaParaArquivo, entregaParaArquivo, tarefaParaArquivo } from "@/lib/entidades";
import { propagarRenomeacaoId } from "@/lib/links";
import { carregarRepo, invalidarCache } from "@/lib/repo";
import { dispararAtualizacaoAcervo } from "@/lib/eventos";
import { toast } from "@/lib/toast";
import { ModalDossieCarreira } from "@/components/ModalDossieCarreira";
import { TagChip } from "@/components/TagChip";
import type { Tarefa } from "@/lib/tarefas";
import { CheckCircle2, Circle } from "lucide-react";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import {
  escreverMarkdown,
  tituloProvavel,
  nomeLivre,
  nomeDeArquivo,
} from "@/lib/markdown";
import {
  resumir,
  paradas,
  semMeta,
  aConferir,
  textoPrazoMeta,
  idDoCaminho,
  PASTA_METAS,
  PASTA_ENTREGAS,
  ROTULO_META,
  type Meta,
  type Entrega,
  type StatusMeta,
} from "@/lib/pdi";
import {
  Botao,
  Cartao,
  Selo,
  Aviso,
  Vazio,
  Carregando,
  ModalConfirmacao,
  ModalEntradaTexto,
} from "@/components/ui";
import { hojeISO, dataCurta, lerParametroAbrir, lerParametroCriar, correspondeBusca } from "@/lib/utils";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { CabecalhoSecao } from "@/components/CabecalhoSecao";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import {
  BarraFiltrosAvancados,
  filtrarItensPorRegras,
  type DefinicaoPropriedade,
  type RegraFiltro,
} from "@/components/BarraFiltrosAvancados";
import { cn } from "@/lib/utils";

/**
 * Nome livre para metas, que não levam data no nome: o id delas é
 * referenciado pelas entregas, então precisa ser estável e legível.
 */
function nomeLivreSemData(
  pasta: string,
  titulo: string,
  ocupados: string[],
): string {
  const base = nomeDeArquivo(titulo).replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
  const usados = new Set(ocupados);
  let candidato = `${pasta}/${base}.md`;
  let n = 2;
  while (usados.has(candidato)) {
    candidato = `${pasta}/${base}-${n}.md`;
    n++;
  }
  return candidato;
}

export default function PDI() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();
  const { abrirFlutuante, fecharFlutuante, estaAbertoFlutuante, focarFlutuante } = useItemFlutuante();

  // ── Carregamento — dois hooks, um repositório (cache por sha) ─────────────
  const { itens: metas, recarregar: recarregarMetas, carregando: carregandoMetas, erro: erroMetas } =
    useItemRepo(cfg, PASTAS.metas as typeof PASTA_METAS, (item) =>
      comoMeta(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
      { recursivo: true }
    );

  const { itens: entregas, recarregar: recarregarEntregas, carregando: carregandoEntregas, erro: erroEntregas } =
    useItemRepo(cfg, PASTAS.entregas as typeof PASTA_ENTREGAS, (item) =>
      comoEntrega(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
      { recursivo: true }
    );

  const { itens: todasTarefas, recarregar: recarregarTarefas } =
    useItemRepo(cfg, PASTAS.tarefas, (item) =>
      comoTarefa(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
      { recursivo: true }
    );

  const { itens: contatos, recarregar: recarregarContatos } =
    useItemRepo(cfg, PASTAS.contatos, (item) =>
      comoContato(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
      { recursivo: true }
    );

  const carregando = carregandoMetas || carregandoEntregas;

  function recarregar() {
    recarregarMetas();
    recarregarEntregas();
    recarregarTarefas();
    recarregarContatos();
  }

  // ── Salvamento ────────────────────────────────────────────────────────────
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar, limparErro } = useSalvar(cfg);
  const [erroLocal, setErroLocal] = useState("");
  const erro = erroLocal || erroMetas || erroEntregas || erroSalvar;

  // ── Estado da UI ──────────────────────────────────────────────────────────
  const [modalDossieAberto, setModalDossieAberto] = useState(false);
  const [metaHoverId, setMetaHoverId] = useState<string | null>(null);
  const [esconderTarefasGerais, setEsconderTarefasGerais] = useState(() => localStorage.getItem("klaus-pdi-esconder-tarefas") !== "false");
  const [visaoEntregas, setVisaoEntregas] = useState<"grade" | "lista" | "tabela">(() => {
    return (localStorage.getItem("klaus_pdi_visao_entregas") as any) || "grade";
  });
  const [visaoTarefas, setVisaoTarefas] = useState<"lista" | "grade" | "quadro">(() => {
    return (localStorage.getItem("klaus_pdi_visao_tarefas") as any) || "lista";
  });
  const [campoFocoEntrega, setCampoFocoEntrega] = useState<string | undefined>(undefined);

  const mudarVisaoEntregas = (v: "grade" | "lista" | "tabela") => {
    setVisaoEntregas(v);
    localStorage.setItem("klaus_pdi_visao_entregas", v);
  };

  const mudarVisaoTarefas = (v: "lista" | "grade" | "quadro") => {
    setVisaoTarefas(v);
    localStorage.setItem("klaus_pdi_visao_tarefas", v);
  };

  const [editandoMeta, setEditandoMeta] = useState<Meta | null>(null);
  const [editandoEntrega, setEditandoEntrega] = useState<Entrega | null>(null);
  const [editandoTarefa, setEditandoTarefa] = useState<Tarefa | null>(null);
  const [origMeta, setOrigMeta] = useState<Meta | null>(null);
  const [origEntrega, setOrigEntrega] = useState<Entrega | null>(null);
  const [origTarefa, setOrigTarefa] = useState<Tarefa | null>(null);
  const [modoVisaoMeta, setModoVisaoMeta] = useState<ModoVisaoNotion>("popup");
  const [modoVisaoEntrega, setModoVisaoEntrega] = useState<ModoVisaoNotion>("popup");
  const [modoVisaoTarefa, setModoVisaoTarefa] = useState<ModoVisaoNotion>(() => {
    return (localStorage.getItem("klaus_modo_visao_tarefa") as ModoVisaoNotion) || "popup";
  });
  const [esconderEntregas, setEsconderEntregas] = useState(() => localStorage.getItem("klaus-pdi-esconder-entregas") === "true");
  const [dropHoverId, setDropHoverId] = useState<string | null>(null);
  const [metasExpandidas, setMetasExpandidas] = useState<Record<string, boolean>>({});

  const alternarExpansaoMeta = (id: string) => {
    setMetasExpandidas((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const [pastaMetaSelecionada, setPastaMetaSelecionada] = useState<string | null>(null);
  const [novaTarefaMetaId, setNovaTarefaMetaId] = useState<string | null>(null);
  const [novoTextoTarefa, setNovoTextoTarefa] = useState("");
  const [salvandoTarefaMeta, setSalvandoTarefaMeta] = useState(false);

  // ── Seleção e Ações em Lote para Entregas / Brag Document ─────────────────
  const [entregasSelecionadas, setEntregasSelecionadas] = useState<Set<string>>(new Set());
  const [modalTagLoteAberto, setModalTagLoteAberto] = useState(false);
  const [confirmarExclusaoEntregasLote, setConfirmarExclusaoEntregasLote] = useState(false);

  const alternarSelecaoEntrega = (caminho: string) => {
    setEntregasSelecionadas((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(caminho)) proximo.delete(caminho);
      else proximo.add(caminho);
      return proximo;
    });
  };

  const limparSelecaoEntregas = () => setEntregasSelecionadas(new Set());

  // Vincular todas as entregas selecionadas a uma meta
  const vincularEntregasSelecionadas = async (metaId: string) => {
    const alvos = entregas.filter((e) => entregasSelecionadas.has(e.caminho));
    if (alvos.length === 0) return;
    limparSelecaoEntregas();
    try {
      for (const e of alvos) {
        if (!e.metas.includes(metaId)) {
          const atualizada: Entrega = {
            ...e,
            metas: [...e.metas, metaId],
          };
          const { dados, corpo } = entregaParaArquivo(atualizada);
          const md = escreverMarkdown({ dados, corpo });
          await salvarTexto(e.caminho, md, e.sha, `vincular meta lote ${metaId}`);
        }
      }
      invalidarCache();
      dispararAtualizacaoAcervo();
      recarregarEntregas();
      toast(`${alvos.length} entrega(s) vinculada(s) à meta com sucesso!`);
    } catch (err: any) {
      toast(`Erro ao vincular entregas: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  // Adicionar tag em lote às entregas selecionadas
  const adicionarTagEntregasSelecionadas = async (tag: string) => {
    const tagLimpa = tag.trim().replace(/^#/, "");
    if (!tagLimpa) return;
    const alvos = entregas.filter((e) => entregasSelecionadas.has(e.caminho));
    if (alvos.length === 0) return;
    limparSelecaoEntregas();
    try {
      for (const e of alvos) {
        const tagsAtuais = e.tags || [];
        if (!tagsAtuais.includes(tagLimpa)) {
          const atualizada: Entrega = {
            ...e,
            tags: [...tagsAtuais, tagLimpa],
          };
          const { dados, corpo } = entregaParaArquivo(atualizada);
          const md = escreverMarkdown({ dados, corpo });
          await salvarTexto(e.caminho, md, e.sha, `tag lote ${tagLimpa}`);
        }
      }
      invalidarCache();
      dispararAtualizacaoAcervo();
      recarregarEntregas();
      toast(`Tag #${tagLimpa} adicionada a ${alvos.length} entrega(s)!`);
    } catch (err: any) {
      toast(`Erro ao adicionar tag: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  // Excluir entregas selecionadas em lote
  const pedirExcluirEntregasSelecionadas = () => {
    if (entregasSelecionadas.size === 0) return;
    setConfirmarExclusaoEntregasLote(true);
  };

  const confirmarExcluirEntregasSelecionadas = async () => {
    const alvos = entregas.filter((e) => entregasSelecionadas.has(e.caminho));
    setConfirmarExclusaoEntregasLote(false);
    if (alvos.length === 0) return;
    limparSelecaoEntregas();
    try {
      for (const e of alvos) {
        await apagarItem(e.caminho, e.sha);
      }
      invalidarCache();
      dispararAtualizacaoAcervo();
      recarregarEntregas();
      toast(`${alvos.length} entrega(s) movida(s) para a lixeira!`);
    } catch (err: any) {
      toast(`Erro ao excluir entregas: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  // Busca tarefas vinculadas a uma meta específica
  const tarefasDaMeta = useCallback(
    (meta: Meta) => {
      const normTitulo = meta.titulo.toLowerCase().trim();
      const idMeta = meta.id.toLowerCase().trim();
      const caminhoNorm = meta.caminho.toLowerCase().trim();

      return todasTarefas.filter((t) => {
        const rels = (t.relacionamentos || []).map((r) =>
          r.replace(/^[@[]+/, "").replace(/\]\]$/, "").toLowerCase().trim()
        );
        const relMatch = rels.some(
          (r) => r === normTitulo || r === idMeta || r === caminhoNorm || (normTitulo && (r.includes(normTitulo) || normTitulo.includes(r)))
        );

        const metasTarefa = ((t.bruto?.metas as string[]) || []).map((m) => m.toLowerCase().trim());
        const metaMatch = metasTarefa.includes(idMeta) || metasTarefa.includes(normTitulo);

        const corpoNorm = (t.corpo || "").toLowerCase();
        const corpoMatch = normTitulo && (corpoNorm.includes(`@${normTitulo}`) || corpoNorm.includes(`[[${normTitulo}]]`));

        return relMatch || metaMatch || corpoMatch;
      });
    },
    [todasTarefas]
  );

  // Concluir ou reabrir tarefa com 1 clique diretamente no PDI
  const toggleStatusTarefa = async (tarefa: Tarefa) => {
    const novoStatus = tarefa.status === "feito" ? "a-fazer" : "feito";
    try {
      const atualizada: Tarefa = { ...tarefa, status: novoStatus };
      const { dados, corpo } = tarefaParaArquivo(atualizada);
      const md = escreverMarkdown({ dados, corpo });
      await salvarTexto(tarefa.caminho, md, tarefa.sha, `status: ${novoStatus} (${tarefa.titulo})`);
      invalidarCache();
      dispararAtualizacaoAcervo();
      recarregarTarefas();
      toast(`Tarefa "${tarefa.titulo}" marcada como ${novoStatus === "feito" ? "concluída" : "a fazer"}!`);
    } catch (err: any) {
      toast(`Erro ao atualizar status da tarefa: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  // Criar tarefa inline rápida vinculada à meta
  const criarTarefaRapidaParaMeta = async (meta: Meta) => {
    const texto = novoTextoTarefa.trim();
    if (!texto || salvandoTarefaMeta) return;

    setSalvandoTarefaMeta(true);
    try {
      const todosItens = carregarRepo ? (await carregarRepo(cfg)).map((i) => i.caminho) : [];
      const caminhoNovo = nomeLivre(PASTAS.tarefas, texto, todosItens);
      const nova: Tarefa = {
        caminho: caminhoNovo,
        sha: "",
        bruto: {},
        titulo: texto,
        status: "a-fazer",
        tags: ["pdi"],
        corpo: `Tarefa vinculada à meta do PDI: @${meta.titulo}`,
        relacionamentos: [`@${meta.titulo}`],
      };
      const { dados, corpo } = tarefaParaArquivo(nova);
      const md = escreverMarkdown({ dados, corpo });
      await salvarTexto(caminhoNovo, md, undefined, `criar tarefa para meta: ${meta.titulo}`);
      invalidarCache();
      dispararAtualizacaoAcervo();
      recarregarTarefas();
      setNovoTextoTarefa("");
      setNovaTarefaMetaId(null);
      toast(`Tarefa "${texto}" criada para a meta "${meta.titulo}"!`);
    } catch (err: any) {
      toast(`Erro ao criar tarefa: ${err?.message || err}`, { tipo: "erro" });
    } finally {
      setSalvandoTarefaMeta(false);
    }
  };

  // Pastas de metas existentes
  const pastasMetasExistentes = useMemo(() => {
    const conjunto = new Set<string>();
    for (const m of metas) {
      const partes = m.caminho.split("/").slice(2, -1);
      if (partes.length > 0) {
        for (let i = 1; i <= partes.length; i++) {
          conjunto.add(partes.slice(0, i).join("/"));
        }
      }
    }
    return Array.from(conjunto).sort((a, b) => a.localeCompare(b));
  }, [metas]);

  const alternarEsconderEntregas = () => {
    const novo = !esconderEntregas;
    setEsconderEntregas(novo);
    localStorage.setItem("klaus-pdi-esconder-entregas", String(novo));
  };

  const alternarEsconderTarefasGerais = () => {
    const novo = !esconderTarefasGerais;
    setEsconderTarefasGerais(novo);
    localStorage.setItem("klaus-pdi-esconder-tarefas", String(novo));
  };

  // ── Abre item pela URL ─────────────────────────────────────────────────────
  const processouUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const urlAtual = `${location.pathname}${location.search}${location.hash}`;
    if (processouUrlRef.current === urlAtual) return;

    if (lerParametroCriar(location, ["nova_meta", "nova", "novo"])) {
      processouUrlRef.current = urlAtual;
      const vazia: Meta = {
        bruto: {},
        caminho: "",
        id: "",
        sha: "",
        titulo: "",
        status: "a-fazer",
        indicador: "",
        corpo: "",
      };
      setEditandoMeta(vazia);
      setOrigMeta(vazia);
      return;
    }

    const abrirCaminho = lerParametroAbrir(location);
    if (!abrirCaminho) return;

    if (metas.length > 0 || entregas.length > 0) {
      if (focarFlutuante(abrirCaminho)) return;
      const metaAlvo = metas.find((m) => m.caminho === abrirCaminho);
      if (metaAlvo) {
        processouUrlRef.current = urlAtual;
        setEditandoMeta(metaAlvo);
        setOrigMeta(metaAlvo);
        return;
      }
      const entregaAlvo = entregas.find((e) => e.caminho === abrirCaminho);
      if (entregaAlvo) {
        processouUrlRef.current = urlAtual;
        setEditandoEntrega(entregaAlvo);
        setOrigEntrega(entregaAlvo);
      }
    }
  }, [location.pathname, location.search, location.hash, metas.length > 0, entregas.length > 0]);

  // ── Modo flutuante de metas ────────────────────────────────────────────────
  useEffect(() => {
    if (modoVisaoMeta === "flutuante" && editandoMeta) {
      const metaOriginal = { ...editandoMeta };
      abrirFlutuante({
        id: metaOriginal.caminho,
        rotuloTipo: metaOriginal.caminho ? "Meta da Carreira" : "Nova meta",
        titulo: metaOriginal.titulo,
        corpo: metaOriginal.corpo,
        dadosProps: {
          status: metaOriginal.status,
          prazo: metaOriginal.prazo,
          indicador: metaOriginal.indicador,
        },
        camposFixosProps: {
          status: { icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "status" },
          prazo: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
          indicador: { icone: <CheckSquare className="h-4 w-4 opacity-50 text-purple-500" />, tipo: "texto" },
        },
        caminho: metaOriginal.caminho,
        sha: metaOriginal.sha,
        temMudancas: origMeta !== null && JSON.stringify(editandoMeta) !== JSON.stringify(origMeta),
        salvando,
        erro,
        aoSalvar: async (itemFlutuanteAtual) => {
          const titulo = itemFlutuanteAtual.titulo.trim() || "Sem título";
          const metaAtualizada: Meta = {
            caminho: itemFlutuanteAtual.caminho,
            sha: itemFlutuanteAtual.sha,
            bruto: itemFlutuanteAtual.dadosProps || {},
            titulo,
            corpo: itemFlutuanteAtual.corpo,
            id: itemFlutuanteAtual.caminho.split("/").pop()?.replace(/\.md$/, "") || "",
            status: (itemFlutuanteAtual.dadosProps.status as StatusMeta) || "a-fazer",
            prazo: itemFlutuanteAtual.dadosProps.prazo,
            indicador: itemFlutuanteAtual.dadosProps.indicador || "",
          };
          const { dados, corpo } = metaParaArquivo(metaAtualizada);
          const texto = escreverMarkdown({ dados, corpo });
          const caminho = itemFlutuanteAtual.caminho || nomeLivre(PASTAS.metas, titulo, metas.map((m) => m.caminho));
          await salvarTexto(caminho, texto, itemFlutuanteAtual.sha || undefined);
          recarregarMetas();
        },
        aoRemover: metaOriginal.caminho ? async () => {
          await apagarItem(metaOriginal.caminho, metaOriginal.sha);
          recarregarMetas();
        } : undefined,
      });
      setEditandoMeta(null);
      setOrigMeta(null);
      setModoVisaoMeta("popup");
    }
  }, [modoVisaoMeta, editandoMeta]);

  // ── Modo flutuante de entregas ─────────────────────────────────────────────
  useEffect(() => {
    if (modoVisaoEntrega === "flutuante" && editandoEntrega) {
      const entregaOriginal = { ...editandoEntrega };
      abrirFlutuante({
        id: entregaOriginal.caminho,
        rotuloTipo: entregaOriginal.caminho ? "Entrega de PDI" : "Nova entrega",
        titulo: entregaOriginal.titulo,
        corpo: entregaOriginal.corpo,
        dadosProps: {
          data: entregaOriginal.data,
          metas: entregaOriginal.metas.map(id => metas.find(m => m.id === id)?.titulo || "").filter(Boolean),
          conquista: entregaOriginal.conquista || "",
          impacto: entregaOriginal.impacto || "",
          elogio: entregaOriginal.elogio || "",
          autor_elogio: entregaOriginal.autorElogio || "",
          colaboracao: entregaOriginal.colaboracao || [],
          tags: entregaOriginal.tags || [],
        },
        camposFixosProps: {
          data: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
          metas: {
            icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />,
            tipo: "multiselect",
            opcoes: metas.map((m) => m.titulo),
          },
          conquista: {
            icone: <Package className="h-4 w-4 opacity-50 text-amber-500" />,
            tipo: "texto",
          },
          impacto: {
            icone: <TrendingUp className="h-4 w-4 opacity-50 text-emerald-500" />,
            tipo: "texto",
          },
          elogio: {
            icone: <MessageSquareQuote className="h-4 w-4 opacity-50 text-purple-500" />,
            tipo: "texto",
          },
          autor_elogio: {
            icone: <User className="h-4 w-4 opacity-50 text-blue-500" />,
            tipo: "select",
            opcoes: contatos.map((c) => c.titulo),
          },
          colaboracao: {
            icone: <Users className="h-4 w-4 opacity-50 text-indigo-500" />,
            tipo: "multiselect",
            opcoes: [...OPCOES_COLABORACAO_PADRAO],
          },
          tags: {
            icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />,
            tipo: "multiselect",
          },
        },
        caminho: entregaOriginal.caminho,
        sha: entregaOriginal.sha,
        temMudancas: origEntrega !== null && JSON.stringify(editandoEntrega) !== JSON.stringify(origEntrega),
        salvando,
        erro,
        aoSalvar: async (itemFlutuanteAtual) => {
          const titulo = itemFlutuanteAtual.titulo.trim() || "Sem título";
          const eSalvar: Entrega = {
            caminho: itemFlutuanteAtual.caminho,
            sha: itemFlutuanteAtual.sha,
            bruto: itemFlutuanteAtual.dadosProps || {},
            id: entregaOriginal.id || itemFlutuanteAtual.caminho.split("/").pop()?.replace(/\.md$/, "") || "",
            titulo,
            data: itemFlutuanteAtual.dadosProps.data as string || hojeISO(),
            metas: Array.isArray(itemFlutuanteAtual.dadosProps.metas)
              ? itemFlutuanteAtual.dadosProps.metas.map(titulo => metas.find(m => m.titulo === titulo)?.id || "").filter(Boolean)
              : [],
            iaSugeriu: false,
            conquista: (itemFlutuanteAtual.dadosProps.conquista as string) || undefined,
            impacto: (itemFlutuanteAtual.dadosProps.impacto as string) || undefined,
            elogio: (itemFlutuanteAtual.dadosProps.elogio as string) || undefined,
            autorElogio: (itemFlutuanteAtual.dadosProps.autor_elogio as string) || undefined,
            colaboracao: Array.isArray(itemFlutuanteAtual.dadosProps.colaboracao) ? (itemFlutuanteAtual.dadosProps.colaboracao as string[]) : [],
            tags: Array.isArray(itemFlutuanteAtual.dadosProps.tags) ? (itemFlutuanteAtual.dadosProps.tags as string[]) : [],
            corpo: itemFlutuanteAtual.corpo,
          };
          const { dados, corpo } = entregaParaArquivo(eSalvar);
          const texto = escreverMarkdown({ dados, corpo });
          const caminho = itemFlutuanteAtual.caminho || nomeLivre(PASTAS.entregas, titulo, entregas.map((x) => x.caminho));
          await salvarTexto(caminho, texto, itemFlutuanteAtual.sha || undefined);
          recarregarEntregas();
        },
        aoRemover: entregaOriginal.caminho ? async () => {
          await removerEntrega(entregaOriginal);
        } : undefined,
      });
      setEditandoEntrega(null);
      setOrigEntrega(null);
      setModoVisaoEntrega("popup");
    }
  }, [modoVisaoEntrega, editandoEntrega, metas, contatos]);

  // ── Modo flutuante de tarefas ──────────────────────────────────────────────
  useEffect(() => {
    if (modoVisaoTarefa === "flutuante" && editandoTarefa) {
      const tarefaOriginal = { ...editandoTarefa };
      abrirFlutuante({
        id: tarefaOriginal.caminho,
        rotuloTipo: tarefaOriginal.caminho ? "Tarefa" : "Nova tarefa",
        titulo: tarefaOriginal.titulo,
        corpo: tarefaOriginal.corpo,
        dadosProps: {
          status: tarefaOriginal.status,
          prazo: tarefaOriginal.prazo,
          tags: tarefaOriginal.tags || [],
          relacionamentos: tarefaOriginal.relacionamentos || [],
          ...(tarefaOriginal.bruto || {}),
        },
        camposFixosProps: {
          status: { icone: <CheckCircle2 className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "status" },
          prazo: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
          tags: { icone: <Tag className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "multiselect" },
        },
        caminho: tarefaOriginal.caminho,
        sha: tarefaOriginal.sha,
        temMudancas: origTarefa !== null && JSON.stringify(editandoTarefa) !== JSON.stringify(origTarefa),
        salvando,
        erro,
        aoSalvar: async (itemFlutuanteAtual) => {
          const titulo = itemFlutuanteAtual.titulo.trim() || "Sem título";
          const tSalvar: Tarefa = {
            caminho: itemFlutuanteAtual.caminho,
            sha: itemFlutuanteAtual.sha,
            bruto: itemFlutuanteAtual.dadosProps || {},
            titulo,
            status: (itemFlutuanteAtual.dadosProps.status as any) || "a-fazer",
            prazo: itemFlutuanteAtual.dadosProps.prazo as string | undefined,
            tags: Array.isArray(itemFlutuanteAtual.dadosProps.tags) ? (itemFlutuanteAtual.dadosProps.tags as string[]) : [],
            relacionamentos: Array.isArray(itemFlutuanteAtual.dadosProps.relacionamentos) ? (itemFlutuanteAtual.dadosProps.relacionamentos as string[]) : [],
            corpo: itemFlutuanteAtual.corpo,
          };
          const { dados, corpo } = tarefaParaArquivo(tSalvar);
          const texto = escreverMarkdown({ dados, corpo });
          const caminho = itemFlutuanteAtual.caminho || nomeLivre(PASTAS.tarefas, titulo, todasTarefas.map((x) => x.caminho));
          await salvarTexto(caminho, texto, itemFlutuanteAtual.sha || undefined);
          invalidarCache();
          dispararAtualizacaoAcervo();
          recarregarTarefas();
        },
        aoRemover: tarefaOriginal.caminho ? async () => {
          await apagarItem(tarefaOriginal.caminho, tarefaOriginal.sha);
          invalidarCache();
          dispararAtualizacaoAcervo();
          recarregarTarefas();
        } : undefined,
      });
      setEditandoTarefa(null);
      setOrigTarefa(null);
      setModoVisaoTarefa("popup");
    }
  }, [modoVisaoTarefa, editandoTarefa]);

  // ── Alerta ao sair com mudanças ────────────────────────────────────────────
  useEffect(() => {
    const temMudancas = editandoMeta !== null && origMeta !== null &&
      JSON.stringify(editandoMeta) !== JSON.stringify(origMeta);
    if (!temMudancas) return;
    const aoSair = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [editandoMeta, origMeta]);

  // ── Ações ──────────────────────────────────────────────────────────────────

  function fecharMeta() {
    setEditandoMeta(null);
    setOrigMeta(null);
    limparErro();
    setErroLocal("");
    navegar(location.pathname, { replace: true });
  }

  function fecharEntrega() {
    setEditandoEntrega(null);
    setOrigEntrega(null);
    limparErro();
    setErroLocal("");
    navegar(location.pathname, { replace: true });
  }

  async function salvarMeta(alvo?: Meta) {
    const m = alvo || editandoMeta;
    if (!m) return;
    const tituloValido = m.titulo.trim() || "Sem título";
    const metaParaSalvar = { ...m, titulo: tituloValido };
    setErroLocal("");
    try {
      const { dados, corpo } = metaParaArquivo(metaParaSalvar);
      const texto = escreverMarkdown({ dados, corpo });
      const caminho = metaParaSalvar.caminho ||
        nomeLivreSemData(PASTA_METAS, metaParaSalvar.titulo, metas.map((x) => x.caminho));
      const novaSha = await salvarTexto(caminho, texto, metaParaSalvar.sha || undefined);
      const salvaMeta: Meta = { ...metaParaSalvar, caminho, sha: novaSha };

      // Se o ID da meta mudou, propaga para todas as entregas vinculadas
      if (origMeta?.id && salvaMeta.id && origMeta.id !== salvaMeta.id) {
        const todos = await carregarRepo(cfg);
        await propagarRenomeacaoId(cfg, todos, origMeta.id, salvaMeta.id);
      }

      setEditandoMeta((atual) => {
        if (atual && (atual.caminho === salvaMeta.caminho || !atual.caminho)) return salvaMeta;
        return atual;
      });
      setOrigMeta((orig) => {
        if (orig && (orig.caminho === salvaMeta.caminho || !orig.caminho)) return salvaMeta;
        return orig;
      });
      recarregar();
    } catch (err) {
      throw err;
    }
  }

  async function salvarEntrega(alvo?: Entrega) {
    const e = alvo || editandoEntrega;
    if (!e) return;
    const tituloValido = e.titulo.trim() || "Sem título";
    const entregaParaSalvar = { ...e, titulo: tituloValido, iaSugeriu: false };
    setErroLocal("");
    try {
      const { dados, corpo } = entregaParaArquivo(entregaParaSalvar);
      const texto = escreverMarkdown({ dados, corpo });
      const caminho = entregaParaSalvar.caminho ||
        nomeLivre(PASTA_ENTREGAS, entregaParaSalvar.titulo, entregas.map((x) => x.caminho));
      const novaSha = await salvarTexto(caminho, texto, entregaParaSalvar.sha || undefined);
      const salvaEntrega: Entrega = { ...entregaParaSalvar, caminho, sha: novaSha };

      setEditandoEntrega((atual) => {
        if (atual && (atual.caminho === salvaEntrega.caminho || !atual.caminho)) return salvaEntrega;
        return atual;
      });
      setOrigEntrega((orig) => {
        if (orig && (orig.caminho === salvaEntrega.caminho || !orig.caminho)) return salvaEntrega;
        return orig;
      });
      recarregar();
    } catch (err) {
      throw err;
    }
  }

  const [metaParaExcluir, setMetaParaExcluir] = useState<Meta | null>(null);
  const [entregaParaExcluir, setEntregaParaExcluir] = useState<Entrega | null>(null);

  async function removerMeta(m: Meta) {
    setMetaParaExcluir(m);
  }

  async function confirmarRemocaoMeta() {
    if (!metaParaExcluir) return;
    const alvo = metaParaExcluir;
    setMetaParaExcluir(null);
    fecharMeta();
    try {
      await apagarItem(alvo.caminho, alvo.sha);
    } catch (err: any) {
      toast(`Erro ao remover meta: ${err?.message || err}`, { tipo: "erro" });
    }
    recarregar();
  }

  async function removerEntrega(e: Entrega) {
    setEntregaParaExcluir(e);
  }

  async function confirmarRemocaoEntrega() {
    if (!entregaParaExcluir) return;
    const alvo = entregaParaExcluir;
    setEntregaParaExcluir(null);
    fecharEntrega();
    try {
      await apagarItem(alvo.caminho, alvo.sha);
    } catch (err: any) {
      toast(`Erro ao remover entrega: ${err?.message || err}`, { tipo: "erro" });
    }
    recarregar();
  }

  async function salvarTarefa(alvo?: Tarefa) {
    const t = alvo || editandoTarefa;
    if (!t) return;
    const tituloValido = t.titulo.trim() || "Sem título";
    const tarefaParaSalvar: Tarefa = { ...t, titulo: tituloValido };
    setErroLocal("");
    try {
      const { dados, corpo } = tarefaParaArquivo(tarefaParaSalvar);
      const texto = escreverMarkdown({ dados, corpo });
      const caminho =
        tarefaParaSalvar.caminho ||
        nomeLivre(PASTAS.tarefas, tarefaParaSalvar.titulo, todasTarefas.map((x) => x.caminho));
      const novaSha = await salvarTexto(caminho, texto, tarefaParaSalvar.sha || undefined);
      const salvaTarefa: Tarefa = { ...tarefaParaSalvar, caminho, sha: novaSha };

      setEditandoTarefa((atual) => {
        if (atual && (atual.caminho === salvaTarefa.caminho || !atual.caminho)) return salvaTarefa;
        return atual;
      });
      setOrigTarefa((orig) => {
        if (orig && (orig.caminho === salvaTarefa.caminho || !orig.caminho)) return salvaTarefa;
        return orig;
      });
      invalidarCache();
      dispararAtualizacaoAcervo();
      recarregarTarefas();
    } catch (err) {
      throw err;
    }
  }

  function fecharTarefa() {
    setEditandoTarefa(null);
    setOrigTarefa(null);
    limparErro();
    setErroLocal("");
  }

  const metasExibidas = useMemo(() => {
    if (!pastaMetaSelecionada) return metas;
    const prefixo = `${PASTA_METAS}/${pastaMetaSelecionada}/`;
    return metas.filter((m) => m.caminho.startsWith(prefixo));
  }, [metas, pastaMetaSelecionada]);

  const resumos = resumir(metasExibidas, entregas);
  const semAtencao = paradas(resumos);
  const soltas = semMeta(entregas);
  const conferir = aConferir(entregas);

  const [busca, setBusca] = useState("");
  const [regrasFiltro, setRegrasFiltro] = useState<RegraFiltro[]>([]);

  const todasTagsMetas = useMemo(() => {
    const set = new Set<string>();
    for (const m of metas) {
      if (m.tags) for (const t of m.tags) set.add(t);
    }
    return [...set].sort();
  }, [metas]);

  const propriedadesDisponiveis = useMemo<DefinicaoPropriedade[]>(() => {
    return [
      { id: "titulo", rotulo: "Título / Nome", tipo: "texto" },
      { id: "status", rotulo: "Status", tipo: "status", opcoes: ["a-fazer", "em-andamento", "concluida"] },
      { id: "prazo", rotulo: "Prazo", tipo: "data" },
      { id: "indicador", rotulo: "Indicador", tipo: "texto" },
      { id: "tags", rotulo: "Tags", tipo: "tags", opcoes: todasTagsMetas },
      { id: "criado_em", rotulo: "Criado em", tipo: "data" },
    ];
  }, [todasTagsMetas]);

  const resumosFiltrados = useMemo(() => {
    let lista = resumos;
    if (busca.trim()) {
      lista = lista.filter((r) =>
        correspondeBusca(r.meta.titulo, busca) ||
        correspondeBusca(r.meta.indicador, busca) ||
        correspondeBusca(r.meta.corpo, busca) ||
        (r.meta.tags && r.meta.tags.some((t) => correspondeBusca(t, busca)))
      );
    }

    lista = filtrarItensPorRegras(lista, regrasFiltro, (item, propId) => {
      if (propId === "titulo" || propId === "nome") return item.meta.titulo;
      if (propId === "status") return item.meta.status;
      if (propId === "prazo") return item.meta.prazo;
      if (propId === "indicador") return item.meta.indicador;
      if (propId === "tags") return item.meta.tags || [];
      if (propId === "criado_em") return item.meta.bruto?.criado || item.meta.bruto?.criado_em;
      return (item.meta as any)[propId] || item.meta.bruto?.[propId];
    });

    return lista;
  }, [resumos, busca, regrasFiltro]);

  const novaMeta = () => {
    const prefixo = pastaMetaSelecionada ? `${PASTA_METAS}/${pastaMetaSelecionada}` : PASTA_METAS;
    const caminhoNovo = nomeLivreSemData(prefixo, "Nova Meta", metas.map((m) => m.caminho));
    const vazia: Meta = {
      bruto: {},
      caminho: caminhoNovo,
      id: idDoCaminho(caminhoNovo),
      sha: "",
      titulo: "",
      status: "a-fazer",
      indicador: "",
      corpo: "",
    };
    setEditandoMeta(vazia);
    setOrigMeta(vazia);
  };

  const novaEntrega = () => {
    const vazia: Entrega = {
      bruto: {},
      caminho: "",
      id: "",
      sha: "",
      titulo: "",
      data: hojeISO(),
      metas: [],
      iaSugeriu: false,
      corpo: "",
    };
    setCampoFocoEntrega(undefined);
    setEditandoEntrega(vazia);
    setOrigEntrega(vazia);
  };

  const novaEntregaParaMeta = (meta: Meta) => {
    const vazia: Entrega = {
      bruto: {},
      caminho: "",
      id: "",
      sha: "",
      titulo: "",
      data: hojeISO(),
      metas: [meta.id],
      iaSugeriu: false,
      corpo: "",
    };
    setCampoFocoEntrega(undefined);
    setEditandoEntrega(vazia);
    setOrigEntrega(vazia);
  };

  const novaEntregaComConquista = (meta: Meta) => {
    const vazia: Entrega = {
      bruto: {},
      caminho: "",
      id: "",
      sha: "",
      titulo: "",
      data: hojeISO(),
      metas: [meta.id],
      iaSugeriu: false,
      conquista: "",
      corpo: "",
    };
    setCampoFocoEntrega("conquista");
    setEditandoEntrega(vazia);
    setOrigEntrega(vazia);
  };

  const novaEntregaComImpacto = (meta: Meta) => {
    const vazia: Entrega = {
      bruto: {},
      caminho: "",
      id: "",
      sha: "",
      titulo: "",
      data: hojeISO(),
      metas: [meta.id],
      iaSugeriu: false,
      impacto: "",
      corpo: "",
    };
    setCampoFocoEntrega("impacto");
    setEditandoEntrega(vazia);
    setOrigEntrega(vazia);
  };

  const novaEntregaComElogio = (meta: Meta) => {
    const vazia: Entrega = {
      bruto: {},
      caminho: "",
      id: "",
      sha: "",
      titulo: "",
      data: hojeISO(),
      metas: [meta.id],
      iaSugeriu: false,
      elogio: "",
      corpo: "",
    };
    setCampoFocoEntrega("elogio");
    setEditandoEntrega(vazia);
    setOrigEntrega(vazia);
  };

  if (!pronto) {
    return (
      <Vazio
        titulo="Falta conectar sua conta"
        descricao="Preencha sua conta do GitHub e o token na aba de Ajustes."
        acao={
          <Link to="/config">
            <Botao>Ir para Ajustes</Botao>
          </Link>
        }
      />
    );
  }

  return (
    <div id="conteudo-pdi-pdf" className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Plano de Desenvolvimento (PDI)"
        descricao="Onde você quer chegar na sua carreira e as conquistas realizadas."
        icone={<Target size={20} />}
        corIcone="bg-teal-500/10 text-teal-600 dark:text-teal-400"
        acoes={
          <>
            <Botao onClick={() => setModalDossieAberto(true)} variante="primario" className="gap-2">
              <Award size={15} />
              Dossiê de Carreira
            </Botao>
            <Botao onClick={novaMeta} variante="neutro">
              <Target size={15} />
              Nova Meta
            </Botao>
            <Botao onClick={novaEntrega} variante="neutro">
              <Plus size={15} />
              Nova Conquista
            </Botao>
          </>
        }
      />

      {/* Filtro por Pastas / Ciclos de Metas */}
      {pastasMetasExistentes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap py-1">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Folder size={12} /> Pastas:
          </span>
          <button
            onClick={() => setPastaMetaSelecionada(null)}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1",
              pastaMetaSelecionada === null
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-secondary/60 text-muted-foreground hover:bg-accent",
            )}
          >
            Todas ({metas.length})
          </button>
          {pastasMetasExistentes.map((p) => {
            const total = metas.filter((m) => m.caminho.startsWith(`${PASTA_METAS}/${p}/`)).length;
            const nomeAmigavel = p.split("/").pop() || p;
            return (
              <button
                key={p}
                onClick={() => setPastaMetaSelecionada(p === pastaMetaSelecionada ? null : p)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5",
                  pastaMetaSelecionada === p
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-secondary/60 text-muted-foreground hover:bg-accent",
                )}
              >
                <Folder size={12} className="shrink-0 opacity-80" />
                <span>{nomeAmigavel}</span>
                <span className="opacity-70 text-[11px]">({total})</span>
              </button>
            );
          })}
        </div>
      )}

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando texto="Carregando seu plano…" />
      ) : metas.length === 0 && entregas.length === 0 ? (
        <Vazio
          icone={<Target size={24} />}
          titulo="Seu Plano de Desenvolvimento ainda está em branco"
          descricao="Comece cadastrando 3 a 5 metas profissionais. Elas servirão de guia para o seu crescimento e conversas de alinhamento."
          acao={<Botao onClick={novaMeta}>Criar primeira meta</Botao>}
        />
      ) : (
        <>
          {/* ------------------------------------------ o que pede atenção */}
          {(semAtencao.length > 0 || soltas.length > 0 || conferir.length > 0) && (
            <div className="grid gap-2.5">
              {semAtencao.map((r) => (
                <Cartao
                  key={r.meta.id}
                  className="flex items-start gap-3 border-[var(--warning)]/40 bg-[var(--warning)]/5 p-3.5"
                >
                  <AlertTriangle
                    size={17}
                    className="mt-0.5 shrink-0 text-[var(--warning)]"
                  />
                  <p className="text-sm">
                    <strong>{r.meta.titulo}</strong> está há{" "}
                    {r.diasSemMovimento} dias sem nenhuma entrega. Retomar,
                    pausar ou cancelar — deixar como está é o único caminho ruim.
                  </p>
                </Cartao>
              ))}

              {soltas.length > 0 && (
                <Cartao className="flex items-start gap-3 p-3.5">
                  <Package size={17} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <p className="text-sm">
                    <strong>{soltas.length}</strong> entrega
                    {soltas.length > 1 ? "s" : ""} sem meta atribuída. Arraste e solte sobre uma meta acima para vincular.
                  </p>
                </Cartao>
              )}

              {conferir.length > 0 && (
                <Cartao className="flex items-start gap-3 border-primary/40 bg-primary/5 p-3.5">
                  <Sparkles size={17} className="mt-0.5 shrink-0 text-primary" />
                  <p className="text-sm">
                    <strong>{conferir.length}</strong>{" "}
                    {conferir.length > 1
                      ? "ligações sugeridas"
                      : "ligação sugerida"}{" "}
                    pela IA esperando sua conferência.
                  </p>
                </Cartao>
              )}
            </div>
          )}

          {/* Barra de Ferramentas e Filtros de Metas */}
          <BarraFerramentas
            busca={busca}
            aoMudarBusca={setBusca}
            placeholderBusca="Buscar metas, indicadores, tags..."
            filtros={
              <BarraFiltrosAvancados
                propriedadesDisponiveis={propriedadesDisponiveis}
                regras={regrasFiltro}
                aoMudarRegras={setRegrasFiltro}
              />
            }
          />

          {/* ----------------------------------------------------- metas */}
          {resumosFiltrados.length > 0 ? (
            <section className="space-y-4">
              <CabecalhoSecao
                titulo="Metas Profissionais"
                contador={resumosFiltrados.length}
              />
              <div className="grid gap-3">
                {resumosFiltrados.map(({ meta: m, entregas: ligadas }) => (
                  <Cartao
                    key={m.id}
                    className={cn(
                      "p-4 transition-all flex flex-col justify-between border",
                      metaHoverId === m.id
                        ? "bg-teal-500/10 border-teal-500 ring-2 ring-teal-500/30 scale-[1.008] shadow-md"
                        : "hover:border-muted-foreground/30 border-border/70"
                    )}
                    onDragOver={(ev) => {
                      ev.preventDefault();
                      ev.dataTransfer.dropEffect = "copy";
                    }}
                    onDragEnter={() => setMetaHoverId(m.id)}
                    onDragLeave={() => setMetaHoverId(null)}
                    onDrop={async (ev) => {
                      ev.preventDefault();
                      setMetaHoverId(null);
                      const rawData = ev.dataTransfer.getData("text/plain");
                      if (!rawData) return;

                      // 1. Soltou uma entrega na meta
                      if (rawData.startsWith("entrega:")) {
                        const entregaId = rawData.replace("entrega:", "");
                        const entregaAlvo = entregas.find((e) => e.id === entregaId || e.caminho.includes(entregaId));
                        if (entregaAlvo && !entregaAlvo.metas.includes(m.id)) {
                          const atualizada = { ...entregaAlvo, metas: [...entregaAlvo.metas, m.id] };
                          const { dados, corpo } = entregaParaArquivo(atualizada);
                          const md = escreverMarkdown({ dados, corpo });
                          await salvarTexto(entregaAlvo.caminho, md, entregaAlvo.sha);
                          invalidarCache();
                          recarregarEntregas();
                          toast(`Entrega "${entregaAlvo.titulo}" vinculada à meta "${m.titulo}"!`);
                        }
                        return;
                      }

                      // 2. Soltou uma tarefa na meta
                      if (rawData.startsWith("tarefa:")) {
                        const caminhoTarefa = rawData.replace("tarefa:", "");
                        const tarefaAlvo = todasTarefas.find((t) => t.caminho === caminhoTarefa || t.id === caminhoTarefa);
                        if (tarefaAlvo) {
                          const relsAtuais = tarefaAlvo.relacionamentos || [];
                          const novaMetaRel = `@${m.titulo}`;
                          const novoBruto: Record<string, any> = { ...(tarefaAlvo.bruto || {}) };
                          if (Array.isArray(novoBruto.metas)) {
                            const filtradas = (novoBruto.metas as string[]).filter((x: string) => x !== "nova-meta" && x !== m.id);
                            if (filtradas.length === 0) {
                              delete novoBruto.metas;
                            } else {
                              novoBruto.metas = filtradas;
                            }
                          }

                          const atualizada: Tarefa = {
                            ...tarefaAlvo,
                            bruto: novoBruto,
                            relacionamentos: Array.from(new Set([...relsAtuais, novaMetaRel])),
                          };
                          const { dados, corpo } = tarefaParaArquivo(atualizada);
                          const md = escreverMarkdown({ dados, corpo });
                          await salvarTexto(tarefaAlvo.caminho, md, tarefaAlvo.sha);
                          invalidarCache();
                          recarregarTarefas();
                          toast(`Tarefa "${tarefaAlvo.titulo}" vinculada à meta "${m.titulo}"!`);
                        }
                        return;
                      }
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (estaAbertoFlutuante(m.caminho)) {
                          fecharFlutuante();
                        }
                        setEditandoMeta(m);
                        setOrigMeta(m);
                        navegar(`?abrir=${encodeURIComponent(m.caminho)}`, { replace: true });
                      }}
                      className="w-full text-left group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={cn(
                            "font-medium group-hover:text-primary transition-colors",
                            m.status === "concluida" && "text-muted-foreground line-through decoration-muted-foreground/50",
                          )}
                        >
                          {m.titulo}
                        </p>
                        <Selo
                          tom={
                            m.status === "concluida"
                              ? "sucesso"
                              : m.status === "em-andamento"
                                ? "primario"
                                : "neutro"
                          }
                        >
                          {ROTULO_META[m.status]}
                        </Selo>
                      </div>

                      {m.indicador && (
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          {m.indicador}
                        </p>
                      )}

                      {textoPrazoMeta(m) && (
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <Selo>{textoPrazoMeta(m)}</Selo>
                        </div>
                      )}

                      {/* Barra de Progresso da Meta */}
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                          <span>Progresso</span>
                          <span>
                            {m.status === "concluida"
                              ? "100%"
                              : `${Math.min(100, Math.round(ligadas.length * 25))}%`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary/80 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              m.status === "concluida" || ligadas.length > 0
                                ? "bg-emerald-500"
                                : "bg-muted-foreground/30"
                            )}
                            style={{
                              width:
                                m.status === "concluida"
                                  ? "100%"
                                  : `${Math.min(100, Math.max(5, ligadas.length * 25))}%`,
                            }}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Barra de Ações Rápidas & Divulgação Progressiva */}
                    {(() => {
                      const tarefasMeta = tarefasDaMeta(m);
                      const tarefasAtivas = tarefasMeta.filter((t: any) => t.status !== "feito");
                      const estaExpandido = Boolean(metasExpandidas[m.id]);

                      return (
                        <div className="mt-3 pt-2.5 border-t border-border/50 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            {/* Botões Rápidos estritamente na ESQUERDA */}
                            <div className="flex items-center gap-1 shrink-0 -ml-1">
                              <Tooltip conteudo="Criar tarefa rápida para esta meta" posicao="top">
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setMetasExpandidas((prev) => ({ ...prev, [m.id]: true }));
                                    setNovaTarefaMetaId(novaTarefaMetaId === m.id ? null : m.id);
                                    setNovoTextoTarefa("");
                                  }}
                                  className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Plus size={12} />
                                  <span className="text-[11px] font-medium">Tarefa</span>
                                </button>
                              </Tooltip>

                              <Tooltip conteudo="Registrar conquista nesta meta" posicao="top">
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    novaEntregaComConquista(m);
                                  }}
                                  className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Package size={12} />
                                  <span className="text-[11px] font-medium">Conquista</span>
                                </button>
                              </Tooltip>

                              <Tooltip conteudo="Registrar resultado/impacto nesta meta" posicao="top">
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    novaEntregaComImpacto(m);
                                  }}
                                  className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <TrendingUp size={12} />
                                  <span className="text-[11px] font-medium">Impacto</span>
                                </button>
                              </Tooltip>

                              <Tooltip conteudo="Registrar elogio/feedback recebido para esta meta" posicao="top">
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    novaEntregaComElogio(m);
                                  }}
                                  className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <MessageSquareQuote size={12} />
                                  <span className="text-[11px] font-medium">Elogio</span>
                                </button>
                              </Tooltip>
                            </div>

                            {/* Detalhamento de tarefas e entregas estritamente na DIREITA */}
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                alternarExpansaoMeta(m.id);
                              }}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer transition-colors py-1 px-1.5 -mr-1 rounded-md hover:bg-accent/60 shrink-0 ml-auto"
                            >
                              {estaExpandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              <span>
                                {estaExpandido
                                  ? "Recolher detalhes"
                                  : `${tarefasAtivas.length} tarefa(s) • ${ligadas.length} entrega(s)`}
                              </span>
                            </button>
                          </div>

                          {/* Seção expandida de Tarefas e Entregas */}
                          {estaExpandido && (
                            <div className="space-y-3 pt-1 border-t border-border/40 animate-in fade-in duration-150">
                              {/* Tarefas */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Tarefas Vinculadas ({tarefasMeta.length})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNovaTarefaMetaId(novaTarefaMetaId === m.id ? null : m.id);
                                      setNovoTextoTarefa("");
                                    }}
                                    className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                                  >
                                    + Nova tarefa
                                  </button>
                                </div>

                                {novaTarefaMetaId === m.id && (
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <input
                                      type="text"
                                      placeholder="Título da tarefa..."
                                      value={novoTextoTarefa}
                                      onChange={(e) => setNovoTextoTarefa(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") criarTarefaRapidaParaMeta(m);
                                        if (e.key === "Escape") setNovaTarefaMetaId(null);
                                      }}
                                      autoFocus
                                      className="flex-1 bg-accent/40 border border-border text-xs px-2.5 py-1 rounded-md outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <Botao
                                      onClick={() => criarTarefaRapidaParaMeta(m)}
                                      disabled={!novoTextoTarefa.trim() || salvandoTarefaMeta}
                                      variante="primario"
                                      className="h-7 text-xs px-2.5"
                                    >
                                      {salvandoTarefaMeta ? "..." : "Criar"}
                                    </Botao>
                                    <Botao
                                      onClick={() => {
                                        setNovaTarefaMetaId(null);
                                        setNovoTextoTarefa("");
                                      }}
                                      variante="neutro"
                                      className="h-7 text-xs px-2"
                                    >
                                      Cancelar
                                    </Botao>
                                  </div>
                                )}

                                {tarefasMeta.length === 0 && novaTarefaMetaId !== m.id ? (
                                  <p className="text-xs text-muted-foreground/80 italic py-0.5">
                                    Nenhuma tarefa vinculada a esta meta.
                                  </p>
                                ) : (
                                  <div className="space-y-1">
                                    {tarefasMeta.map((t) => {
                                      const feita = t.status === "feito";
                                      return (
                                        <div
                                          key={t.caminho}
                                          className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-accent/40 text-xs transition-colors group"
                                        >
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <GripVertical size={12} className="text-muted-foreground/40 shrink-0" />
                                            <button
                                              type="button"
                                              onClick={(ev) => {
                                                ev.stopPropagation();
                                                toggleStatusTarefa(t);
                                              }}
                                              className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                            >
                                              {feita ? (
                                                <CheckCircle2 size={13} className="text-emerald-500" />
                                              ) : (
                                                <Circle size={13} />
                                              )}
                                            </button>
                                            <span
                                              onClick={(ev) => {
                                                ev.stopPropagation();
                                                setEditandoTarefa(t);
                                                setOrigTarefa(t);
                                              }}
                                              className={cn(
                                                "truncate hover:text-primary cursor-pointer",
                                                feita && "line-through text-muted-foreground"
                                              )}
                                            >
                                              {t.titulo}
                                            </span>
                                          </div>
                                          {t.prazo && (
                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                              {dataCurta(t.prazo)}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Entregas vinculadas */}
                              <div className="space-y-1.5 pt-1 border-t border-border/30">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Entregas & Marcos ({ligadas.length})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => novaEntregaParaMeta(m)}
                                    className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                                  >
                                    + Nova entrega
                                  </button>
                                </div>

                                {ligadas.length === 0 ? (
                                  <p className="text-xs text-muted-foreground/80 italic py-0.5">
                                    Nenhuma entrega registrada nesta meta.
                                  </p>
                                ) : (
                                  <div className="space-y-1">
                                    {ligadas.map((e) => (
                                      <div
                                        key={e.id}
                                        onClick={(ev) => {
                                          ev.stopPropagation();
                                          setEditandoEntrega(e);
                                          setOrigEntrega(e);
                                          navegar(`?abrir=${encodeURIComponent(e.caminho)}`, { replace: true });
                                        }}
                                        className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-accent/40 text-xs transition-colors cursor-pointer group"
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                          <GripVertical size={12} className="text-muted-foreground/40 shrink-0" />
                                          <Package size={12} className="text-purple-500 shrink-0" />
                                          <span className="truncate font-medium group-hover:text-primary">
                                            {e.titulo}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                                          {dataCurta(e.data)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </Cartao>
                ))}
              </div>
            </section>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed border-border/80 rounded-2xl">
              Nenhuma meta corresponde aos filtros selecionados.
            </div>
          )}

          {/* -------------------------------------------------- entregas */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CabecalhoSecao
                titulo="Tudo que você entregou"
                contador={entregas.length}
                acoes={
                  entregas.length > 0 ? (
                    <button
                      type="button"
                      onClick={alternarEsconderEntregas}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent/60 transition-colors cursor-pointer"
                    >
                      {esconderEntregas ? (
                        <>
                          <ChevronDown size={14} /> Mostrar ({entregas.length})
                        </>
                      ) : (
                        <>
                          <ChevronUp size={14} /> Ocultar
                        </>
                      )}
                    </button>
                  ) : undefined
                }
              />

              {!esconderEntregas && entregas.length > 0 && (
                <AlternadorVisao
                  valorAtivo={visaoEntregas}
                  aoAlternar={mudarVisaoEntregas}
                                  opcoes={[
                    { id: "grade", rotulo: "Grade", icone: <LayoutGrid size={13} /> },
                    { id: "lista", rotulo: "Lista", icone: <List size={13} /> },
                    { id: "tabela", rotulo: "Tabela", icone: <Table size={13} /> },
                  ]}
                  />
                )}
              </div>

            {entregas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-6 text-center bg-card/30 flex flex-col items-center justify-center gap-2">
                <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                  <Package size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nenhuma entrega registrada ainda</p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                    Registre projetos finalizados, conquistas ou marcos da sua carreira para acompanhar seu progresso no PDI.
                  </p>
                </div>
                <Botao onClick={novaEntrega} variante="neutro" className="mt-1 text-xs h-8 px-3">
                  <Plus size={13} /> Registrar primeira entrega
                </Botao>
              </div>
            ) : (
              !esconderEntregas && (
                <>
                  {/* 1. VISÃO EM GRADE */}
                  {visaoEntregas === "grade" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[...entregas]
                        .sort((a, b) => b.data.localeCompare(a.data))
                        .map((e) => {
                          const selecionado = entregasSelecionadas.has(e.caminho);
                          return (
                            <Cartao
                              key={e.id}
                              className={cn(
                                "cursor-pointer p-3.5 transition-all border group relative flex flex-col justify-between gap-2.5",
                                dropHoverId === e.id
                                  ? "bg-indigo-500/10 border-indigo-500/40 scale-[1.01] shadow-xs"
                                  : selecionado
                                  ? "bg-primary/5 border-primary ring-1 ring-primary/40"
                                  : "hover:bg-accent hover:border-primary/30 border-border/70"
                              )}
                              draggable
                              onDragStart={(ev) => {
                                ev.dataTransfer.setData("text/plain", `entrega:${e.id}`);
                              }}
                              onClick={() => {
                                setEditandoEntrega(e);
                                setOrigEntrega(e);
                                navegar(`?abrir=${encodeURIComponent(e.caminho)}`, { replace: true });
                              }}
                              onDragOver={(ev) => ev.preventDefault()}
                              onDragEnter={() => setDropHoverId(e.id)}
                              onDragLeave={() => setDropHoverId(null)}
                              onDrop={async (ev) => {
                                ev.preventDefault();
                                setDropHoverId(null);
                                const metaId = ev.dataTransfer.getData("text/plain");
                                if (metaId && !e.metas.includes(metaId)) {
                                  const entregaAtualizada = {
                                    ...e,
                                    metas: [...e.metas, metaId],
                                  };
                                  const { dados, corpo } = entregaParaArquivo(entregaAtualizada);
                                  const texto = escreverMarkdown({ dados, corpo });
                                  await salvarTexto(e.caminho, texto, e.sha);
                                  recarregarEntregas();
                                }
                              }}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={selecionado}
                                      onChange={(ev) => {
                                        ev.stopPropagation();
                                        alternarSelecaoEntrega(e.caminho);
                                      }}
                                      onClick={(ev) => ev.stopPropagation()}
                                      className={cn(
                                        "h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/40 cursor-pointer shrink-0 transition-opacity",
                                        entregasSelecionadas.size > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                      )}
                                      aria-label={`Selecionar ${e.titulo}`}
                                    />
                                    <Tooltip conteudo="Arrastar entrega para vincular à meta">
                                      <GripVertical size={14} className="text-muted-foreground/60 group-hover:text-foreground cursor-grab active:cursor-grabbing shrink-0" />
                                    </Tooltip>
                                    <p className="font-medium text-xs sm:text-sm truncate group-hover:text-primary transition-colors">
                                      {e.titulo || "Sem título"}
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                                    {dataCurta(e.data)}
                                  </span>
                                </div>

                                {/* Impacto da Entrega */}
                                {e.impacto && (
                                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                    <TrendingUp size={12} className="shrink-0" />
                                    <span className="truncate">{e.impacto}</span>
                                  </div>
                                )}

                                {/* Elogio / Feedback recebido */}
                                {e.elogio && (
                                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md italic">
                                    <MessageSquareQuote size={12} className="shrink-0" />
                                    <span className="truncate">
                                      "{e.elogio}" {e.autorElogio ? `— ${contatos.find((c) => c.id === e.autorElogio || c.titulo === e.autorElogio)?.titulo || e.autorElogio}` : ""}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-1 pt-2 border-t border-border/40 flex flex-wrap items-center gap-1.5">
                                {e.metas.length === 0 ? (
                                  <Selo tom="aviso">sem meta</Selo>
                                ) : (
                                  e.metas.map((id) => (
                                    <Selo key={id} tom="sucesso" className="text-[10px]">
                                      <Target size={10} className="mr-0.5" />
                                      {metas.find((m) => m.id === id)?.titulo ?? id}
                                    </Selo>
                                  ))
                                )}
                                {e.colaboracao && e.colaboracao.length > 0 && (
                                  <Selo tom="neutro" className="inline-flex items-center gap-1 text-[10px]">
                                    <Users size={9} />
                                    {e.colaboracao.join(", ")}
                                  </Selo>
                                )}
                                {e.tags && e.tags.map((t) => (
                                  <TagChip key={t} tag={t} className="py-0 px-1.5 text-[9px] sm:text-[10px] rounded-md h-auto font-medium" />
                                ))}
                                {e.iaSugeriu && (
                                  <Selo tom="primario" className="inline-flex items-center gap-1 text-[10px]">
                                    <Sparkles size={9} /> conferir
                                  </Selo>
                                )}
                              </div>
                            </Cartao>
                          );
                        })}
                    </div>
                  )}

                  {/* 2. VISÃO EM LISTA */}
                  {visaoEntregas === "lista" && (
                    <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                      {[...entregas]
                        .sort((a, b) => b.data.localeCompare(a.data))
                        .map((e) => {
                          const selecionado = entregasSelecionadas.has(e.caminho);
                          return (
                            <div
                              key={e.id}
                              draggable
                              onDragStart={(ev) => {
                                ev.dataTransfer.setData("text/plain", `entrega:${e.id}`);
                              }}
                              onClick={() => {
                                setEditandoEntrega(e);
                                setOrigEntrega(e);
                                navegar(`?abrir=${encodeURIComponent(e.caminho)}`, { replace: true });
                              }}
                              className={cn(
                                "flex items-center justify-between gap-3 p-3 transition-colors cursor-pointer group",
                                selecionado ? "bg-primary/5 ring-1 ring-inset ring-primary/40" : "hover:bg-accent/50"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={selecionado}
                                  onChange={(ev) => {
                                    ev.stopPropagation();
                                    alternarSelecaoEntrega(e.caminho);
                                  }}
                                  onClick={(ev) => ev.stopPropagation()}
                                  className={cn(
                                    "h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/40 cursor-pointer shrink-0 transition-opacity",
                                    entregasSelecionadas.size > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                  )}
                                  aria-label={`Selecionar ${e.titulo}`}
                                />
                                <Tooltip conteudo="Arrastar entrega para vincular à meta">
                                  <GripVertical size={14} className="text-muted-foreground/60 group-hover:text-foreground cursor-grab active:cursor-grabbing shrink-0" />
                                </Tooltip>
                                <Package size={15} className="text-purple-500 shrink-0" />
                                <span className="font-medium text-xs sm:text-sm text-foreground truncate group-hover:text-primary">
                                  {e.titulo || "Sem título"}
                                </span>
                                {e.impacto && (
                                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md truncate max-w-xs">
                                    <TrendingUp size={11} className="shrink-0" /> {e.impacto}
                                  </span>
                                )}
                                {e.elogio && (
                                  <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md italic truncate max-w-xs">
                                    <MessageSquareQuote size={11} className="shrink-0" /> "{e.elogio}"
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {e.metas.length > 0 ? (
                                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                    {metas.find((m) => m.id === e.metas[0])?.titulo || e.metas[0]}
                                    {e.metas.length > 1 && ` +${e.metas.length - 1}`}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">Sem meta</span>
                                )}
                                <span className="text-xs text-muted-foreground tabular-nums">{dataCurta(e.data)}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* 3. VISÃO EM TABELA */}
                  {visaoEntregas === "tabela" && (
                    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
                          <tr>
                            <th className="px-3.5 py-2.5 w-10">
                              <input
                                type="checkbox"
                                checked={entregas.length > 0 && entregasSelecionadas.size === entregas.length}
                                onChange={() => {
                                  if (entregasSelecionadas.size === entregas.length) {
                                    limparSelecaoEntregas();
                                  } else {
                                    setEntregasSelecionadas(new Set(entregas.map((e) => e.caminho)));
                                  }
                                }}
                                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                                aria-label="Selecionar todas as entregas"
                              />
                            </th>
                            <th className="px-3.5 py-2.5">Conquista / Entrega</th>
                            <th className="px-3.5 py-2.5">Data</th>
                            <th className="px-3.5 py-2.5">Meta Vinculada</th>
                            <th className="px-3.5 py-2.5">Impacto / Resultado</th>
                            <th className="px-3.5 py-2.5">Elogio & Autor</th>
                            <th className="px-3.5 py-2.5">Equipe</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[...entregas]
                            .sort((a, b) => b.data.localeCompare(a.data))
                            .map((e) => {
                              const selecionado = entregasSelecionadas.has(e.caminho);
                              return (
                                <tr
                                  key={e.id}
                                  draggable
                                  onDragStart={(ev) => {
                                    ev.dataTransfer.setData("text/plain", `entrega:${e.id}`);
                                  }}
                                  onClick={() => {
                                    setEditandoEntrega(e);
                                    setOrigEntrega(e);
                                    navegar(`?abrir=${encodeURIComponent(e.caminho)}`, { replace: true });
                                  }}
                                  className={cn(
                                    "transition-colors cursor-pointer group",
                                    selecionado ? "bg-primary/5" : "hover:bg-accent/40"
                                  )}
                                >
                                  <td className="px-3.5 py-2.5" onClick={(ev) => ev.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={selecionado}
                                      onChange={(ev) => {
                                        ev.stopPropagation();
                                        alternarSelecaoEntrega(e.caminho);
                                      }}
                                      className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                                      aria-label={`Selecionar ${e.titulo}`}
                                    />
                                  </td>
                                  <td className="px-3.5 py-2.5 font-medium text-foreground">
                                    <div className="flex items-center gap-2">
                                      <GripVertical size={14} className="text-muted-foreground/50 group-hover:text-foreground cursor-grab shrink-0" />
                                      <Package size={14} className="text-purple-500 shrink-0" />
                                      <span className="truncate group-hover:text-primary">{e.titulo || "Sem título"}</span>
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-2.5 text-muted-foreground tabular-nums whitespace-nowrap">
                                    {dataCurta(e.data)}
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    {e.metas.length > 0 ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                        <Target size={10} />
                                        {metas.find((m) => m.id === e.metas[0])?.titulo || e.metas[0]}
                                        {e.metas.length > 1 && ` +${e.metas.length - 1}`}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/60">—</span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-muted-foreground max-w-xs truncate">
                                    {e.impacto ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                        {e.impacto}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/60">—</span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-muted-foreground max-w-xs truncate">
                                    {e.elogio ? (
                                      <span className="italic text-purple-600 dark:text-purple-400">
                                        "{e.elogio}" {e.autorElogio ? `— ${e.autorElogio}` : ""}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/60">—</span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-muted-foreground">
                                    {e.colaboracao && e.colaboracao.length > 0 ? (
                                      <span className="inline-flex items-center gap-1 text-[11px]">
                                        <Users size={10} />
                                        {e.colaboracao.join(", ")}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/60">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )
            )}
          </section>

          {/* -------------------------------------------------- banco / histórico de tarefas */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CabecalhoSecao
                titulo="Histórico & Banco de Tarefas"
                contador={todasTarefas.length}
                acoes={
                  todasTarefas.length > 0 ? (
                    <button
                      type="button"
                      onClick={alternarEsconderTarefasGerais}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent/60 transition-colors cursor-pointer"
                    >
                      {esconderTarefasGerais ? (
                        <>
                          <ChevronDown size={14} /> Mostrar ({todasTarefas.length})
                        </>
                      ) : (
                        <>
                          <ChevronUp size={14} /> Ocultar
                        </>
                      )}
                    </button>
                  ) : undefined
                }
              />

              {!esconderTarefasGerais && todasTarefas.length > 0 && (
                <AlternadorVisao
                  valorAtivo={visaoTarefas}
                  aoAlternar={mudarVisaoTarefas}
                  opcoes={[
                    { id: "lista", rotulo: "Lista", icone: <List size={13} /> },
                    { id: "grade", rotulo: "Grade", icone: <LayoutGrid size={13} /> },
                    { id: "quadro", rotulo: "Quadro", icone: <Columns3 size={13} /> },
                  ]}
                />
              )}
            </div>

            {!esconderTarefasGerais && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  💡 Dica: Você pode <strong>arrastar qualquer tarefa</strong> (usando o ícone <GripVertical size={12} className="inline mx-0.5" />) desta lista e soltar em cima de uma <strong>Meta</strong> acima para vinculá-la instantaneamente.
                </p>

                {/* 1. VISÃO EM LISTA */}
                {visaoTarefas === "lista" && (
                  <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                    {todasTarefas.slice(0, 30).map((t) => {
                      const feita = t.status === "feito";
                      return (
                        <div
                          key={t.caminho}
                          draggable
                          onDragStart={(ev) => {
                            ev.dataTransfer.setData("text/plain", `tarefa:${t.caminho}`);
                          }}
                          onClick={() => {
                            setEditandoTarefa(t);
                            setOrigTarefa(t);
                          }}
                          className="flex items-center justify-between gap-3 p-2.5 hover:bg-accent/50 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Tooltip conteudo="Arrastar tarefa para vincular à meta">
                              <GripVertical size={14} className="text-muted-foreground/60 group-hover:text-foreground cursor-grab active:cursor-grabbing shrink-0" />
                            </Tooltip>
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                toggleStatusTarefa(t);
                              }}
                              className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                            >
                              {feita ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} />}
                            </button>
                            <span className={cn("text-xs font-medium truncate flex-1 group-hover:text-primary", feita && "line-through text-muted-foreground")}>
                              {t.titulo}
                            </span>
                            {t.relacionamentos && t.relacionamentos.length > 0 && (
                              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                <Target size={9} /> {t.relacionamentos[0]}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground">
                            {t.prazo && <span>{dataCurta(t.prazo)}</span>}
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", feita ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-secondary-foreground")}>
                              {feita ? "Feito" : "A fazer"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. VISÃO EM GRADE */}
                {visaoTarefas === "grade" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {todasTarefas.slice(0, 24).map((t) => {
                      const feita = t.status === "feito";
                      return (
                        <Cartao
                          key={t.caminho}
                          draggable
                          onDragStart={(ev) => {
                            ev.dataTransfer.setData("text/plain", `tarefa:${t.caminho}`);
                          }}
                          className="p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all border border-border/70 flex flex-col justify-between gap-2 group"
                          onClick={() => {
                            setEditandoTarefa(t);
                            setOrigTarefa(t);
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <Tooltip conteudo="Arrastar tarefa">
                              <GripVertical size={13} className="text-muted-foreground/50 group-hover:text-foreground shrink-0 mt-0.5" />
                            </Tooltip>
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                toggleStatusTarefa(t);
                              }}
                              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {feita ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} />}
                            </button>
                            <p className={cn("text-xs font-medium truncate flex-1 group-hover:text-primary", feita && "line-through text-muted-foreground")}>
                              {t.titulo}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                            <span>{t.prazo ? dataCurta(t.prazo) : "Sem prazo"}</span>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", feita ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-secondary-foreground")}>
                              {feita ? "Feito" : "A fazer"}
                            </span>
                          </div>
                        </Cartao>
                      );
                    })}
                  </div>
                )}

                {/* 3. VISÃO EM QUADRO (KANBAN) */}
                {visaoTarefas === "quadro" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { status: "a-fazer", titulo: "A Fazer", itens: todasTarefas.filter((t) => t.status === "a-fazer" || !t.status) },
                      { status: "fazendo", titulo: "Em Andamento", itens: todasTarefas.filter((t) => t.status === "fazendo" || (t as any).status === "em-andamento") },
                      { status: "feito", titulo: "Concluído", itens: todasTarefas.filter((t) => t.status === "feito") },
                    ].map((coluna) => (
                      <div key={coluna.status} className="bg-muted/30 border border-border/60 rounded-xl p-2.5 flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            {coluna.titulo}
                          </span>
                          <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            {coluna.itens.length}
                          </span>
                        </div>
                        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-0.5">
                          {coluna.itens.slice(0, 15).map((t) => (
                            <div
                              key={t.caminho}
                              draggable
                              onDragStart={(ev) => {
                                ev.dataTransfer.setData("text/plain", `tarefa:${t.caminho}`);
                              }}
                              onClick={() => {
                                setEditandoTarefa(t);
                                setOrigTarefa(t);
                              }}
                              className="p-2 bg-card border border-border/70 rounded-lg hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing text-xs shadow-2xs group flex items-start gap-1.5"
                            >
                              <GripVertical size={13} className="text-muted-foreground/50 group-hover:text-foreground shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate group-hover:text-primary">
                                  {t.titulo}
                                </p>
                                {t.prazo && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {dataCurta(t.prazo)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          {coluna.itens.length === 0 && (
                            <div className="py-4 text-center text-xs text-muted-foreground/60 italic">
                              Nenhuma tarefa
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* ------------------------------------------------- modal da meta */}
      {editandoMeta !== null && (
        <PainelNotionBase
          rotuloTipo={editandoMeta.caminho ? "Meta da Carreira" : "Nova meta"}
          modoVisao={modoVisaoMeta}
          setModoVisao={setModoVisaoMeta}
          titulo={editandoMeta.titulo}
          setTitulo={(t) => setEditandoMeta({ ...editandoMeta, titulo: t })}
          corpo={editandoMeta.corpo}
          setCorpo={(c) => setEditandoMeta({ ...editandoMeta, corpo: c })}
          caminhoItem={editandoMeta.caminho}
          dadosProps={{
            status: editandoMeta.status,
            prazo: editandoMeta.prazo,
            indicador: editandoMeta.indicador,
            tags: editandoMeta.tags || [],
          }}
          onChangeProps={(novosDados) => {
            setEditandoMeta({
              ...editandoMeta,
              status: (novosDados.status as StatusMeta) || editandoMeta.status,
              prazo: novosDados.prazo as string | undefined,
              indicador: (novosDados.indicador as string) || editandoMeta.indicador,
              tags: (novosDados.tags as string[]) || editandoMeta.tags || [],
            });
          }}
          camposFixosProps={{
            status: { icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "status" },
            prazo: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
            indicador: { icone: <CheckSquare className="h-4 w-4 opacity-50 text-purple-500" />, tipo: "texto" },
            tags: { icone: <Tag className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "multiselect" },
          }}
          salvando={salvando}
          temMudancas={origMeta !== null && JSON.stringify(editandoMeta) !== JSON.stringify(origMeta)}
          aoFechar={fecharMeta}
          aoSalvar={async () => { if (editandoMeta) await salvarMeta(editandoMeta); }}
          aoRemover={editandoMeta.caminho ? async () => { await removerMeta(editandoMeta); } : undefined}
          erro={erroSalvar}
        />
      )}

      {/* ---------------------------------------------- modal da entrega */}
      {editandoEntrega !== null && (
        <PainelNotionBase
          rotuloTipo={editandoEntrega.caminho ? "Entrega de PDI" : "Nova entrega"}
          modoVisao={modoVisaoEntrega}
          setModoVisao={setModoVisaoEntrega}
          titulo={editandoEntrega.titulo}
          setTitulo={(t) => setEditandoEntrega({ ...editandoEntrega, titulo: t })}
          corpo={editandoEntrega.corpo}
          setCorpo={(c) => setEditandoEntrega({ ...editandoEntrega, corpo: c })}
          caminhoItem={editandoEntrega.caminho}
          campoFocoInicial={campoFocoEntrega}
          dadosProps={{
            data: editandoEntrega.data,
            metas: editandoEntrega.metas.map(id => metas.find(m => m.id === id)?.titulo || "").filter(Boolean),
            conquista: editandoEntrega.conquista || "",
            impacto: editandoEntrega.impacto || "",
            elogio: editandoEntrega.elogio || "",
            autor_elogio: editandoEntrega.autorElogio || "",
            colaboracao: editandoEntrega.colaboracao || [],
            tags: editandoEntrega.tags || [],
          }}
          onChangeProps={(novosDados) => {
            setEditandoEntrega({
              ...editandoEntrega,
              data: (novosDados.data as string) || editandoEntrega.data,
              metas: Array.isArray(novosDados.metas)
                ? novosDados.metas.map(titulo => metas.find(m => m.titulo === titulo)?.id || "").filter(Boolean)
                : [],
              conquista: (novosDados.conquista as string) || undefined,
              impacto: (novosDados.impacto as string) || undefined,
              elogio: (novosDados.elogio as string) || undefined,
              autorElogio: (novosDados.autor_elogio as string) || undefined,
              colaboracao: Array.isArray(novosDados.colaboracao) ? (novosDados.colaboracao as string[]) : [],
              tags: Array.isArray(novosDados.tags) ? (novosDados.tags as string[]) : [],
            });
          }}
          camposFixosProps={{
            data: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
            metas: {
              icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />,
              tipo: "multiselect",
              opcoes: metas.map((m) => m.titulo),
            },
            conquista: {
              icone: <Package className="h-4 w-4 opacity-50 text-amber-500" />,
              tipo: "texto",
            },
            impacto: {
              icone: <TrendingUp className="h-4 w-4 opacity-50 text-emerald-500" />,
              tipo: "texto",
            },
            elogio: {
              icone: <MessageSquareQuote className="h-4 w-4 opacity-50 text-purple-500" />,
              tipo: "texto",
            },
            autor_elogio: {
              icone: <User className="h-4 w-4 opacity-50 text-blue-500" />,
              tipo: "select",
              opcoes: contatos.map((c) => c.titulo),
            },
            colaboracao: {
              icone: <Users className="h-4 w-4 opacity-50 text-indigo-500" />,
              tipo: "multiselect",
            },
            tags: {
              icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />,
              tipo: "multiselect",
            },
          }}
          salvando={salvando}
          temMudancas={origEntrega !== null && JSON.stringify(editandoEntrega) !== JSON.stringify(origEntrega)}
          aoFechar={fecharEntrega}
          aoSalvar={async () => { if (editandoEntrega) await salvarEntrega(); }}
          aoRemover={editandoEntrega.caminho ? async () => { await removerEntrega(editandoEntrega); } : undefined}
          erro={erroSalvar}
        />
      )}

      {/* ---------------------------------------------- modal da tarefa */}
      {editandoTarefa !== null && (
        <PainelNotionBase
          rotuloTipo={editandoTarefa.caminho ? "Tarefa" : "Nova tarefa"}
          modoVisao={modoVisaoTarefa}
          setModoVisao={setModoVisaoTarefa}
          titulo={editandoTarefa.titulo}
          setTitulo={(t) => setEditandoTarefa({ ...editandoTarefa, titulo: t })}
          corpo={editandoTarefa.corpo}
          setCorpo={(c) => setEditandoTarefa({ ...editandoTarefa, corpo: c })}
          caminhoItem={editandoTarefa.caminho}
          dadosProps={{
            status: editandoTarefa.status,
            prazo: editandoTarefa.prazo,
            tags: editandoTarefa.tags || [],
            relacionamentos: editandoTarefa.relacionamentos || [],
            ...(editandoTarefa.bruto || {}),
          }}
          onChangeProps={(novosDados) => {
            setEditandoTarefa({
              ...editandoTarefa,
              status: (novosDados.status as any) || editandoTarefa.status,
              prazo: novosDados.prazo as string | undefined,
              tags: Array.isArray(novosDados.tags) ? (novosDados.tags as string[]) : [],
              relacionamentos: Array.isArray(novosDados.relacionamentos) ? (novosDados.relacionamentos as string[]) : [],
              bruto: {
                ...(editandoTarefa.bruto || {}),
                ...novosDados,
              },
            });
          }}
          camposFixosProps={{
            status: { icone: <CheckCircle2 className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "status" },
            prazo: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
            tags: { icone: <Tag className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "multiselect" },
            relacionamentos: { icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "multiselect" },
          }}
          salvando={salvando}
          temMudancas={origTarefa !== null && JSON.stringify(editandoTarefa) !== JSON.stringify(origTarefa)}
          aoFechar={fecharTarefa}
          aoSalvar={async () => { if (editandoTarefa) await salvarTarefa(); }}
          aoRemover={editandoTarefa.caminho ? async () => {
            await apagarItem(editandoTarefa.caminho, editandoTarefa.sha);
            fecharTarefa();
            invalidarCache();
            dispararAtualizacaoAcervo();
            recarregarTarefas();
          } : undefined}
          erro={erroSalvar}
        />
      )}

      {/* Barra Flutuante de Ações em Lote para Entregas do PDI */}
      <BarraAcoesLote
        totalSelecionados={entregasSelecionadas.size}
        rotuloItem="entrega"
        aoLimparSelecao={limparSelecaoEntregas}
      >
        {/* Vincular a uma Meta com Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <div>
              <BotaoAcaoLote
                tooltip="Vincular entregas selecionadas a uma meta"
                rotulo="Vincular Meta"
                variante="neutro"
                icone={<Link2 size={13} className="text-emerald-500" />}
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 text-xs shadow-xl border-border bg-card/95 backdrop-blur-md" align="center">
            <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1.5 px-1">
              Vincular à meta:
            </p>
            {metas.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-1 py-1">Nenhuma meta criada ainda.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-0.5 no-scrollbar">
                {metas.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => vincularEntregasSelecionadas(m.id)}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-medium truncate transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Target size={12} className="text-emerald-500 shrink-0" />
                    <span className="truncate">{m.titulo}</span>
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Adicionar Tag em Lote */}
        <BotaoAcaoLote
          tooltip="Adicionar tag às entregas selecionadas"
          rotulo="Adicionar Tag"
          variante="neutro"
          icone={<Tag size={13} className="text-amber-500" />}
          onClick={() => setModalTagLoteAberto(true)}
        />

        {/* Excluir Entregas Selecionadas */}
        <BotaoAcaoLote
          tooltip="Mover entregas selecionadas para a lixeira"
          rotulo="Excluir"
          variante="perigo"
          icone={<Trash2 size={13} />}
          onClick={pedirExcluirEntregasSelecionadas}
        />
      </BarraAcoesLote>

      {/* Modal para adicionar Tag em Lote */}
      {modalTagLoteAberto && (
        <ModalEntradaTexto
          aberto={true}
          titulo="Adicionar tag às entregas"
          descricao={`Digite o nome da tag a ser adicionada em ${entregasSelecionadas.size} entrega(s) selecionada(s).`}
          placeholder="Ex: design-system, lideranca, mentoria"
          textoConfirmar="Adicionar Tag"
          aoConfirmar={(tag) => {
            setModalTagLoteAberto(false);
            adicionarTagEntregasSelecionadas(tag);
          }}
          aoCancelar={() => setModalTagLoteAberto(false)}
        />
      )}

      {/* Modal para exclusão em lote de entregas */}
      {confirmarExclusaoEntregasLote && (
        <ModalConfirmacao
          aberto={true}
          titulo="Excluir entregas selecionadas"
          descricao={`Tem certeza que deseja mover as ${entregasSelecionadas.size} entregas selecionadas para a lixeira?`}
          textoConfirmar="Sim, mover para lixeira"
          varianteConfirmar="perigo"
          aoConfirmar={confirmarExcluirEntregasSelecionadas}
          aoCancelar={() => setConfirmarExclusaoEntregasLote(false)}
        />
      )}

      {/* Modal do Dossiê de Carreira / Brag Document */}
      <ModalDossieCarreira
        aberto={modalDossieAberto}
        aoFechar={() => setModalDossieAberto(false)}
        metas={metas}
        entregas={entregas}
        contatos={contatos}
      />

      <ModalConfirmacao
        aberto={metaParaExcluir !== null}
        titulo={`Apagar meta "${metaParaExcluir?.titulo || ""}"?`}
        descricao={
          metaParaExcluir
            ? `Esta meta será removida. ${
                entregas.filter((e) => e.metas.includes(metaParaExcluir.id)).length
              } entrega(s) estão associadas a ela.`
            : ""
        }
        textoConfirmar="Apagar Meta"
        varianteConfirmar="perigo"
        aoConfirmar={confirmarRemocaoMeta}
        aoCancelar={() => setMetaParaExcluir(null)}
      />

      <ModalConfirmacao
        aberto={entregaParaExcluir !== null}
        titulo={`Apagar entrega "${entregaParaExcluir?.titulo || ""}"?`}
        descricao="Esta entrega será removida do seu registro de PDI."
        textoConfirmar="Apagar Entrega"
        varianteConfirmar="perigo"
        aoConfirmar={confirmarRemocaoEntrega}
        aoCancelar={() => setEntregaParaExcluir(null)}
      />
    </div>
  );
}
