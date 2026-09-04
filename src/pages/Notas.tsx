import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Tag,
  FileText,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  Trash2,
  LayoutGrid,
  List,
  Columns,
  CheckSquare,
  Image as ImageIcon,
  Circle,
  CheckCircle2,
  Pin,
  FolderInput,
  Tags,
  Pencil,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { BarraAcoesLote, BotaoAcaoLote } from "@/components/BarraAcoesLote";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Masonry } from "react-plock";
import {
  obterModeloPadrao,
  type TemplateItem,
} from "@/lib/templates";
import { lerConfig, configCompleta } from "@/lib/settings";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import { PASTAS } from "@/lib/tipos";
import { comoNota, comoTarefa, comoReferencia, notaParaArquivo, tarefaParaArquivo, dataDoNome } from "@/lib/entidades";
import { ImagemPrivada } from "@/components/ImagemPrivada";
import { montarIndice, mencoesA, alvosUnicos } from "@/lib/links";
import { invalidarCache } from "@/lib/repo";
import { dispararAtualizacaoAcervo } from "@/lib/eventos";
import { planejarRefatoracao, type PlanoRefatoracao } from "@/lib/refatorarLinks";
import { ModalRefatorarLinks } from "@/components/ModalRefatorarLinks";
import {
  escreverMarkdown,
  tituloProvavel,
  nomeLivre,
  type Frontmatter,
} from "@/lib/markdown";
import { lerParametroAbrir, lerParametroCriar, correspondeBusca, formatarNomeAmigavel, cn } from "@/lib/utils";
import {
  Botao,
  Aviso,
  Vazio,
  Carregando,
  ModalConfirmacao,
} from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { AlternadorVisao } from "@/components/AlternadorVisao";
import { SeloStatus } from "@/components/SeloStatus";
import { BarraFiltrosAvancados, filtrarItensPorRegras, type DefinicaoPropriedade, type RegraFiltro } from "@/components/BarraFiltrosAvancados";
import { DropdownNovoViaModelo } from "@/components/DropdownNovoViaModelo";
import { CartaoNotaVisual } from "@/components/CartaoNotaVisual";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import { MenuContextoNotas, type AcaoMenuContexto } from "@/components/MenuContextoNotas";
import { toast } from "@/lib/toast";

import type { Nota } from "@/lib/tipos";

type NotaAberta = Nota & {
  original: { titulo: string; corpo: string; bruto?: Frontmatter };
};

export default function Notas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();
  const { abrirFlutuante, focarFlutuante } = useItemFlutuante();

  const { itens: arquivos, acervo, titulos, carregando, erro: erroCarregar, ilegiveis, recarregar } =
    useItemRepo(cfg, PASTAS.notas, (item) =>
      comoNota(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
    );

  const { itens: todasTarefas, recarregar: recarregarTarefas } = useItemRepo(
    cfg,
    PASTAS.tarefas,
    (item) => comoTarefa(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
    { recursivo: true }
  );

  const { itens: todasReferencias } = useItemRepo(
    cfg,
    PASTAS.referencias,
    (item) => comoReferencia(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
    { recursivo: true }
  );

  const [pastaAtual, setPastaAtual] = useState("");
  const [pastasCriadas, setPastasCriadas] = useState<string[]>([]);
  const [pastaEmEdicao, setPastaEmEdicao] = useState<{ caminhoCompleto: string; nomeAtual: string } | null>(null);
  const [textoNovoNomePasta, setTextoNovoNomePasta] = useState("");
  const [abaPasta, setAbaPasta] = useState<"documentos" | "tarefas" | "moodboard">("documentos");

  const contagemTarefasPorNota = useMemo(() => {
    const mapa = new Map<string, { concluidas: number; total: number }>();
    for (const t of todasTarefas) {
      const mencoes = t.relacionamentos || [];
      for (const m of mencoes) {
        const nomeLimpo = m.replace(/^@/, "").trim().toLowerCase();
        const atual = mapa.get(nomeLimpo) || { concluidas: 0, total: 0 };
        atual.total++;
        if (t.status === "feito") atual.concluidas++;
        mapa.set(nomeLimpo, atual);
      }
    }
    return mapa;
  }, [todasTarefas]);

  const contagemMoodboardPorNota = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of todasReferencias) {
      const mencoes = r.relacionamentos || [];
      for (const m of mencoes) {
        const nomeLimpo = m.replace(/^@/, "").trim().toLowerCase();
        mapa.set(nomeLimpo, (mapa.get(nomeLimpo) || 0) + 1);
      }
    }
    return mapa;
  }, [todasReferencias]);

  const tarefasDaPasta = useMemo(() => {
    if (!pastaAtual) return [];
    const prefixo = `${PASTAS.tarefas}/${pastaAtual}/`;
    return todasTarefas.filter(
      (t) =>
        t.caminho.startsWith(prefixo) ||
        t.relacionamentos?.some((r) => r.toLowerCase().includes(pastaAtual.toLowerCase()))
    );
  }, [todasTarefas, pastaAtual]);

  const refsDaPasta = useMemo(() => {
    if (!pastaAtual) return [];
    const prefixo = `${PASTAS.referencias}/${pastaAtual}/`;
    return todasReferencias.filter(
      (r) =>
        r.caminho.startsWith(prefixo) ||
        r.relacionamentos?.some((m) => m.toLowerCase().includes(pastaAtual.toLowerCase()))
    );
  }, [todasReferencias, pastaAtual]);

  const [novoTituloTarefa, setNovoTituloTarefa] = useState("");

  useEffect(() => {
    if (abaPasta === "tarefas" && tarefasDaPasta.length === 0) {
      setAbaPasta("documentos");
    } else if (abaPasta === "moodboard" && refsDaPasta.length === 0) {
      setAbaPasta("documentos");
    }
  }, [abaPasta, tarefasDaPasta.length, refsDaPasta.length]);

  async function criarTarefaRapidaProjeto(e: React.FormEvent) {
    e.preventDefault();
    const titulo = novoTituloTarefa.trim();
    if (!titulo || !pastaAtual) return;
    setNovoTituloTarefa("");
    const slug = titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const caminho = `${PASTAS.tarefas}/${pastaAtual}/${slug}.md`;
    const nova: any = {
      bruto: { pasta: pastaAtual },
      caminho,
      sha: "",
      titulo,
      status: "a-fazer",
      tags: [pastaAtual.split("/").pop() || pastaAtual],
      corpo: `Projeto: @${pastaAtual}`,
    };
    try {
      const { dados, corpo } = tarefaParaArquivo(nova);
      const md = escreverMarkdown({ dados, corpo });
      await salvarTexto(nova.caminho, md, "", `cria ${titulo}`);
      invalidarCache();
      recarregarTarefas();
      toast(`Tarefa "${titulo}" adicionada ao projeto!`);
    } catch (err: any) {
      toast(`Erro ao criar tarefa: ${err?.message || err}`, { tipo: "erro" });
    }
  }

  async function alternarStatusTarefaProjeto(t: any) {
    const novoStatus = t.status === "feito" ? "a-fazer" : "feito";
    const atualizada = { ...t, status: novoStatus };
    try {
      const { dados, corpo } = tarefaParaArquivo(atualizada);
      const md = escreverMarkdown({ dados, corpo });
      await salvarTexto(t.caminho, md, t.sha, `status: ${novoStatus}`);
      invalidarCache();
      recarregarTarefas();
    } catch (err: any) {
      toast(`Erro ao mudar status: ${err?.message || err}`, { tipo: "erro" });
    }
  }

  const { salvarTexto, apagarItem, apagarDefinitivoItem, salvando, erro: erroSalvar, limparErro } = useSalvar(cfg);
  const erro = erroCarregar || erroSalvar;

  const [busca, setBusca] = useState("");
  const [modoVisao, setModoVisao] = useState<ModoVisaoNotion>(() => {
    const salvo = localStorage.getItem('klaus_modo_visao_notas');
    return (salvo as ModoVisaoNotion) || 'popup';
  });
  useEffect(() => {
    localStorage.setItem('klaus_modo_visao_notas', modoVisao);
  }, [modoVisao]);

  type ModoLayoutNotas = "grade" | "lista" | "mural";
  const [modoLayout, setModoLayout] = useState<ModoLayoutNotas>(() => {
    const salvo = localStorage.getItem("klaus_modo_layout_notas");
    return (salvo as ModoLayoutNotas) || "grade";
  });
  useEffect(() => {
    localStorage.setItem("klaus_modo_layout_notas", modoLayout);
  }, [modoLayout]);

  const [aberta, setAberta] = useState<NotaAberta | null>(null);
  const [refatoracaoPendente, setRefatoracaoPendente] = useState<{
    plano: PlanoRefatoracao;
    tituloAntigo: string;
    tituloNovo: string;
  } | null>(null);

  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const inicioArrastoRef = useRef<{ x: number; y: number } | null>(null);
  const cartoesRef = useRef<Map<string, DOMRect>>(new Map());

  const [menuContexto, setMenuContexto] = useState<{
    x: number;
    y: number;
    emCartao: boolean;
    notaAlvo?: Nota | null;
  } | null>(null);
  const [notaParaExcluir, setNotaParaExcluir] = useState<Nota | null>(null);
  const [filtroRapido, setFiltroRapido] = useState<string>("todas");

  // Drag and drop: nota arrastada sobre pasta
  const [notaArrastada, setNotaArrastada] = useState<string | null>(null);
  const [pastaAlvo, setPastaAlvo] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<{
    acao: "copiar" | "recortar";
    caminhos: string[];
  } | null>(null);

  // Reset de filtros locais ao mudar de rota
  useEffect(() => {
    setRegrasFiltro([]);
    setPastaAtual("");
    setSelecionadas(new Set());
  }, [location.pathname]);

  const indice = useMemo(() => montarIndice(acervo), [acervo]);
  const opcoesRelacionamento = useMemo(() =>
    alvosUnicos(indice)
      .map(a => ({ titulo: a.titulo, caminho: a.caminho }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo)),
    [indice],
  );
  const mencoesNotaAberta = useMemo(() => {
    if (!aberta?.caminho) return [];
    return mencoesA(aberta.caminho, acervo, indice);
  }, [aberta?.caminho, acervo, indice]);

  // Todas as notas de notas/ incluindo subpastas
  const todasNotas = useMemo(() => {
    const prefixo = `${PASTAS.notas}/`;
    return acervo
      .filter((i) => i.caminho.startsWith(prefixo))
      .map((item) =>
        comoNota(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
      );
  }, [acervo]);

  const processouUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const urlAtual = `${location.pathname}${location.search}${location.hash}`;
    if (processouUrlRef.current === urlAtual) return;

    if (lerParametroCriar(location, ["nova", "novo"])) {
      processouUrlRef.current = urlAtual;
      const caminhoNovo = nomeLivre(pastaAtual ? `${PASTAS.notas}/${pastaAtual}` : PASTAS.notas, "Nova Nota", todasNotas.map((a) => a.caminho));
      const n = comoNota({ dados: { titulo: "Nova Nota", tipo: "nota" }, corpo: "" }, caminhoNovo, "", "Nova Nota");
      setAberta({ ...n, original: { titulo: n.titulo, corpo: n.corpo, bruto: n.bruto } });
      return;
    }

    const abrirCaminho = lerParametroAbrir(location);
    if (!abrirCaminho) return;
    if (acervo.length > 0) {
      if (focarFlutuante(abrirCaminho)) return;
      const alvo = acervo.find((a) => a.caminho === abrirCaminho);
      if (alvo) {
        processouUrlRef.current = urlAtual;
        const nota = comoNota(alvo.doc, alvo.caminho, alvo.sha, tituloProvavel(alvo.doc, alvo.nome));
        setAberta({ ...nota, original: { titulo: nota.titulo, corpo: nota.corpo, bruto: nota.bruto } });
      }
    }
  }, [location.pathname, location.search, location.hash, acervo, pastaAtual, todasNotas]);

  const mudou = aberta
    ? aberta.titulo !== aberta.original.titulo ||
    aberta.corpo !== aberta.original.corpo ||
    JSON.stringify(aberta.bruto) !== JSON.stringify(aberta.original.bruto)
    : false;

  const mudouRef = useRef(mudou);
  mudouRef.current = mudou;

  const [mostrarConfirmacaoDescarte, setMostrarConfirmacaoDescarte] = useState(false);

  useEffect(() => {
    if (!aberta) return;
    history.pushState({ editor: true }, "");
    const aoVoltar = () => {
      if (mudouRef.current) {
        setMostrarConfirmacaoDescarte(true);
        history.pushState({ editor: true }, "");
        return;
      }
      fecharNota();
    };
    addEventListener("popstate", aoVoltar);
    return () => removeEventListener("popstate", aoVoltar);
  }, [aberta !== null, fecharNota]);

  useEffect(() => {
    const aoAbrirItem = (e: Event) => {
      const detalhe = (e as CustomEvent)?.detail;
      const caminho = detalhe?.caminho;
      if (!caminho || !caminho.startsWith(`${PASTAS.notas}/`)) return;
      const alvo = acervo.find((a) => a.caminho === caminho);
      if (alvo) {
        const nota = comoNota(alvo.doc, alvo.caminho, alvo.sha, tituloProvavel(alvo.doc, alvo.nome));
        setAberta({ ...nota, original: { titulo: nota.titulo, corpo: nota.corpo, bruto: nota.bruto } });
      }
    };
    window.addEventListener("klaus-abrir-item", aoAbrirItem);
    return () => window.removeEventListener("klaus-abrir-item", aoAbrirItem);
  }, [acervo]);

  useEffect(() => {
    if (!mudou) return;
    const aoSair = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", aoSair);
    return () => removeEventListener("beforeunload", aoSair);
  }, [mudou]);

  useEffect(() => {
    if (modoVisao === "flutuante" && aberta) {
      const notaOriginal = { ...aberta };
      abrirFlutuante({
        id: notaOriginal.caminho,
        rotuloTipo: notaOriginal.caminho ? "Nota" : "Nova nota",
        titulo: notaOriginal.titulo,
        corpo: notaOriginal.corpo,
        dadosProps: notaOriginal.bruto,
        camposFixosProps: {
          tipo: { icone: <FileText className="h-4 w-4 opacity-50 text-orange-500" />, tipo: "select", opcoes: ["nota", "referencia", "rascunho"] },
          tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
        },
        caminho: notaOriginal.caminho,
        sha: notaOriginal.sha,
        temMudancas: mudou,
        salvando,
        erro,
        mencoes: mencoesNotaAberta,
        opcoesRelacionamento,
        aoSalvar: async (itemFlutuanteAtual) => {
          const titulo = itemFlutuanteAtual.titulo.trim() || "Sem título";
          const notaAtualizada: Nota = {
            caminho: itemFlutuanteAtual.caminho,
            sha: itemFlutuanteAtual.sha,
            bruto: itemFlutuanteAtual.dadosProps || {},
            titulo,
            tipo: (itemFlutuanteAtual.dadosProps.tipo as any) || "nota",
            tags: itemFlutuanteAtual.dadosProps.tags || [],
            corpo: itemFlutuanteAtual.corpo,
          };
          const { dados, corpo } = notaParaArquivo(notaAtualizada);
          const texto = escreverMarkdown({ dados, corpo });
          const caminho = itemFlutuanteAtual.caminho || nomeLivre(pastaAtual ? `${PASTAS.notas}/${pastaAtual}` : PASTAS.notas, titulo, todasNotas.map((a) => a.caminho));
          await salvarTexto(caminho, texto, itemFlutuanteAtual.sha || undefined);
          recarregar();
        },
        aoRemover: notaOriginal.caminho ? async () => {
          await apagarItem(notaOriginal.caminho, notaOriginal.sha);
          recarregar();
        } : undefined,
      });
      setAberta(null);
      setModoVisao("popup");
    }
  }, [modoVisao, aberta]);

  function fecharNota() {
    setAberta(null);
    limparErro();
    navegar(location.pathname, { replace: true });
  }

  const { fecharFlutuante, estaAbertoFlutuante } = useItemFlutuante();

  function abrir(nota: Nota) {
    if (estaAbertoFlutuante(nota.caminho)) {
      fecharFlutuante();
    }
    if (aberta && aberta.caminho !== nota.caminho && mudou) {
      salvar(aberta).catch((err) => {
        toast(`Erro ao salvar alterações da nota anterior: ${err?.message || "Falha na gravação"}`, { tipo: "erro" });
      });
    }
    setAberta({ ...nota, original: { titulo: nota.titulo, corpo: nota.corpo, bruto: nota.bruto } });
    window.history.replaceState(null, "", `?abrir=${encodeURIComponent(nota.caminho)}`);
  }

  function nova(template?: TemplateItem, pastaDestino?: string) {
    const tmpl = template || obterModeloPadrao();
    const titulo = tmpl?.titulo || "Nova Nota";
    
    let caminho = "";
    const pastaReal = pastaDestino ?? pastaAtual;
    if (pastaReal) {
      caminho = nomeLivre(
        `${PASTAS.notas}/${pastaReal}`,
        titulo,
        todasNotas.map((a) => a.caminho),
      );
    }

    const notaVazia: NotaAberta = {
      bruto: tmpl ? { ...tmpl.frontmatter } : {},
      caminho,
      sha: "",
      titulo,
      tipo: (tmpl?.frontmatter?.tipo as any) || "nota",
      tags: tmpl?.frontmatter?.tags || [],
      corpo: tmpl?.corpoPadrao || "",
      original: { titulo: "", corpo: "", bruto: {} },
    };
    setAberta(notaVazia);
  }

  async function salvar(alvo?: NotaAberta) {
    const n = alvo || aberta;
    if (!n) return;
    const titulo = n.titulo.trim() || "Sem título";
    const notaAtualizada: Nota = { ...n, titulo };
    const { dados, corpo } = notaParaArquivo(notaAtualizada);
    const texto = escreverMarkdown({ dados, corpo });
    const caminho = n.caminho || nomeLivre(pastaAtual ? `${PASTAS.notas}/${pastaAtual}` : PASTAS.notas, titulo, todasNotas.map((a) => a.caminho));

    const tituloOriginal = n.original?.titulo?.trim();
    const novaSha = await salvarTexto(caminho, texto, n.sha || undefined);

    setAberta((atual) => {
      if (!atual || (atual.caminho !== caminho && atual.caminho !== "")) return atual;
      return { ...atual, caminho, sha: novaSha, titulo, original: { titulo, corpo, bruto: dados } };
    });

    recarregar();

    // Se houve renomeação de um arquivo pré-existente, verifica se outros arquivos o mencionam
    if (tituloOriginal && tituloOriginal !== titulo && n.caminho) {
      const plano = planejarRefatoracao(acervo, tituloOriginal, titulo, n.caminho, caminho);
      if (plano.totalArquivos > 0) {
        setRefatoracaoPendente({
          plano,
          tituloAntigo: tituloOriginal,
          tituloNovo: titulo,
        });
      }
    }
  }

  async function remover() {
    if (!aberta?.caminho) return;
    await apagarItem(aberta.caminho, aberta.sha);
    fecharNota();
    recarregar();
  }

  function alternarSelecao(caminho: string) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(caminho)) novo.delete(caminho);
      else novo.add(caminho);
      return novo;
    });
  }

  function limparSelecao() {
    setSelecionadas(new Set());
  }

  function iniciarArrasto(e: React.MouseEvent) {
    if (e.button !== 0) return;
    if (e.target instanceof HTMLElement && e.target.closest("button, a, input, select, textarea")) return;
    if (e.target instanceof HTMLElement && e.target.closest("[data-cartao]")) return;

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    inicioArrastoRef.current = { x: e.clientX, y: e.clientY };
    setArrastando(true);
    setMarquee({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: 0, h: 0 });
  }

  useEffect(() => {
    if (!arrastando) return;

    const aoMover = (e: MouseEvent) => {
      const inicio = inicioArrastoRef.current;
      const rect = gridRef.current?.getBoundingClientRect();
      if (!inicio || !rect) return;

      const x = Math.min(inicio.x, e.clientX) - rect.left;
      const y = Math.min(inicio.y, e.clientY) - rect.top;
      const w = Math.abs(e.clientX - inicio.x);
      const h = Math.abs(e.clientY - inicio.y);
      setMarquee({ x, y, w, h });

      const novoSelecionadas = new Set<string>();
      for (const [caminho, r] of cartoesRef.current) {
        const intersecta =
          r.left < Math.max(inicio.x, e.clientX) &&
          r.right > Math.min(inicio.x, e.clientX) &&
          r.top < Math.max(inicio.y, e.clientY) &&
          r.bottom > Math.min(inicio.y, e.clientY);
        if (intersecta) novoSelecionadas.add(caminho);
      }
      setSelecionadas(novoSelecionadas);
    };

    const aoSoltar = () => {
      setArrastando(false);
      setMarquee(null);
      inicioArrastoRef.current = null;
    };

    document.addEventListener("mousemove", aoMover);
    document.addEventListener("mouseup", aoSoltar);
    return () => {
      document.removeEventListener("mousemove", aoMover);
      document.removeEventListener("mouseup", aoSoltar);
    };
  }, [arrastando]);

  function abrirMenuContexto(e: React.MouseEvent, emCartao: boolean, notaAlvo?: Nota) {
    e.preventDefault();
    setMenuContexto({ x: e.clientX, y: e.clientY, emCartao, notaAlvo });
  }

  async function toggleFixarNota(nota: Nota) {
    const novoFixado = !nota.fixado;
    const notaAtualizada: Nota = { ...nota, fixado: novoFixado };
    const { dados, corpo } = notaParaArquivo(notaAtualizada);
    const texto = escreverMarkdown({ dados, corpo });
    try {
      await salvarTexto(nota.caminho, texto, nota.sha, `${novoFixado ? "fixar" : "desafixar"}: ${nota.titulo}`);
      invalidarCache();
      dispararAtualizacaoAcervo(PASTAS.notas);
      toast(novoFixado ? `Nota "${nota.titulo}" fixada no topo!` : `Nota "${nota.titulo}" desafixada!`);
      recarregar();
    } catch (e: any) {
      toast(`Erro ao atualizar nota: ${e?.message || e}`, { tipo: "erro" });
    }
  }

  async function duplicarNota(nota: Nota) {
    const caminhosExistentes = todasNotas.map((n) => n.caminho);
    const pasta = nota.caminho.split("/").slice(0, -1).join("/") || PASTAS.notas;
    const novoTitulo = `Cópia de ${nota.titulo}`;
    const caminhoNovo = nomeLivre(pasta, novoTitulo, caminhosExistentes);

    const notaDuplicada: Nota = {
      ...nota,
      caminho: caminhoNovo,
      sha: "",
      titulo: novoTitulo,
      fixado: false,
    };
    const { dados, corpo } = notaParaArquivo(notaDuplicada);
    const texto = escreverMarkdown({ dados, corpo });
    try {
      await salvarTexto(caminhoNovo, texto, undefined, `duplicar ${nota.caminho}`);
      invalidarCache();
      dispararAtualizacaoAcervo(PASTAS.notas);
      toast(`Nota duplicada com sucesso!`);
      recarregar();
    } catch (e: any) {
      toast(`Erro ao duplicar nota: ${e?.message || e}`, { tipo: "erro" });
    }
  }

  // Resolve notas e pastas selecionadas para uma lista de operações individuais em notas
  function obterOperacoesParaItens(ids: string[], pastaDestino: string): { caminhoOrigem: string; caminhoDestino: string; nota: Nota }[] {
    const operacoes: { caminhoOrigem: string; caminhoDestino: string; nota: Nota }[] = [];
    const prefixoDestino = pastaDestino ? `${PASTAS.notas}/${pastaDestino}` : PASTAS.notas;
    
    for (const id of ids) {
      if (id.startsWith("folder:")) {
        const caminhoPasta = id.slice(7); // e.g. "my-folder"
        const prefixoPastaOrigem = `${PASTAS.notas}/${caminhoPasta}/`;
        
        // Nome da pasta que está sendo movida
        const nomePasta = caminhoPasta.split("/").pop() || "";
        
        // A pasta de destino terá esta pasta adicionada a ela
        const pastaDestinoFinal = pastaDestino ? `${pastaDestino}/${nomePasta}` : nomePasta;
        const prefixoPastaDestino = `${PASTAS.notas}/${pastaDestinoFinal}`;
        
        // Encontra todas as notas contidas nesta pasta recursivamente
        const notasFilhas = todasNotas.filter(n => n.caminho.startsWith(prefixoPastaOrigem));
        
        for (const nota of notasFilhas) {
          const caminhoRelativo = nota.caminho.slice(prefixoPastaOrigem.length);
          const caminhoDestino = `${prefixoPastaDestino}/${caminhoRelativo}`;
          operacoes.push({ caminhoOrigem: nota.caminho, caminhoDestino, nota });
        }
      } else {
        const nota = todasNotas.find(n => n.caminho === id);
        if (nota) {
          const nomeArquivo = id.split("/").pop() || "";
          const caminhoDestino = `${prefixoDestino}/${nomeArquivo}`;
          operacoes.push({ caminhoOrigem: id, caminhoDestino, nota });
        }
      }
    }
    return operacoes;
  }

  async function executarColar() {
    if (!clipboard || clipboard.caminhos.length === 0) return;
    
    const { acao, caminhos } = clipboard;
    const operacoes = obterOperacoesParaItens(caminhos, pastaAtual);
    
    if (operacoes.length === 0) {
      toast("Nenhum arquivo encontrado para colar", { tipo: "aviso" });
      return;
    }
    
    let sucesso = 0;
    let falhas = 0;
    
    toast(acao === "recortar" ? "Movendo arquivos..." : "Copiando arquivos...", { tipo: "info" });
    
    try {
      await Promise.all(
        operacoes.map(async (op) => {
          let caminhoDestino = op.caminhoDestino;
          
          if (acao === "copiar" && caminhoDestino === op.caminhoOrigem) {
            const extensao = op.caminhoOrigem.split(".").pop();
            const nomeSemExt = op.caminhoOrigem.slice(0, op.caminhoOrigem.lastIndexOf("."));
            caminhoDestino = `${nomeSemExt}-copia.${extensao}`;
          }
          
          if (caminhoDestino === op.caminhoOrigem) {
            return;
          }
          
          try {
            const { dados, corpo } = notaParaArquivo(op.nota);
            const texto = escreverMarkdown({ dados, corpo });
            await salvarTexto(caminhoDestino, texto, undefined, `${acao}: ${op.caminhoOrigem.split("/").pop()} para ${pastaAtual || "raiz"}`, true);
            
            if (acao === "recortar") {
              await apagarItem(op.caminhoOrigem, op.nota.sha, true);
            }
            sucesso++;
          } catch (err) {
            console.error(err);
            falhas++;
          }
        })
      );
      
      // Espera o GitHub processar os commits antes de forçar o recarregamento unificado
      await new Promise((r) => setTimeout(r, 800));
      invalidarCache();
      dispararAtualizacaoAcervo(PASTAS.notas);

      if (falhas > 0) {
        toast(`${sucesso} item(ns) colado(s), ${falhas} falha(s)`, { tipo: "aviso" });
      } else if (sucesso > 0) {
        toast(`${sucesso} item(ns) colado(s) com sucesso`, { tipo: "sucesso" });
        if (acao === "recortar") {
          setClipboard(null);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast(`Ocorreu um erro ao colar os arquivos: ${msg}`, { tipo: "erro" });
    } finally {
      limparSelecao();
      recarregar();
    }
  }

  async function executarExcluir() {
    if (selecionadas.size === 0) return;
    
    let sucesso = 0;
    let falhas = 0;
    
    const resolved = obterOperacoesParaItens(Array.from(selecionadas), pastaAtual);
    if (resolved.length === 0) return;
    
    toast("Excluindo arquivos...", { tipo: "info" });
    
    try {
      await Promise.all(
        resolved.map(async (op) => {
          try {
            await apagarItem(op.caminhoOrigem, op.nota.sha, true);
            sucesso++;
          } catch {
            falhas++;
          }
        })
      );
      
      // Espera o GitHub processar a deleção antes de forçar o recarregamento unificado
      await new Promise((r) => setTimeout(r, 800));
      invalidarCache();
      dispararAtualizacaoAcervo(PASTAS.notas);

      if (falhas > 0) {
        toast(`${sucesso} excluída(s), ${falhas} falha(s)`, { tipo: "aviso" });
      } else if (sucesso > 0) {
        toast(`${sucesso} nota(s) excluída(s)`, { tipo: "sucesso" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast(`Erro ao excluir notas: ${msg}`, { tipo: "erro" });
    } finally {
      limparSelecao();
      recarregar();
    }
  }

  useEffect(() => {
    const aoTecla = async (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA" ||
          document.activeElement.getAttribute("contenteditable") === "true" ||
          document.activeElement.closest(".bn-editor") ||
          document.activeElement.closest("input, textarea"))
      ) {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selecionadas.size > 0) {
          e.preventDefault();
          setClipboard({ acao: "copiar", caminhos: Array.from(selecionadas) });
          toast(`${selecionadas.size} item(ns) copiado(s)`, { tipo: "sucesso" });
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x") {
        if (selecionadas.size > 0) {
          e.preventDefault();
          setClipboard({ acao: "recortar", caminhos: Array.from(selecionadas) });
          toast(`${selecionadas.size} item(ns) recortado(s)`, { tipo: "sucesso" });
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (clipboard && clipboard.caminhos.length > 0) {
          e.preventDefault();
          await executarColar();
        }
      }
      
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selecionadas.size > 0) {
          e.preventDefault();
          await executarExcluir();
        }
      }
    };

    window.addEventListener("keydown", aoTecla);
    return () => {
      window.removeEventListener("keydown", aoTecla);
    };
  }, [selecionadas, clipboard, pastaAtual, todasNotas]);

  // Mover nota por drag and drop ou menu
  async function moverNotaParaPasta(caminhoNota: string, pastaDestino: string, silenciarToast = false): Promise<boolean> {
    const nota = todasNotas.find((a) => a.caminho === caminhoNota);
    if (!nota) return false;
    const nomeArquivo = caminhoNota.split("/").pop()!;
    const prefixoDestino = pastaDestino ? `${PASTAS.notas}/${pastaDestino}` : PASTAS.notas;
    const novoCaminho = `${prefixoDestino}/${nomeArquivo}`;
    if (novoCaminho === caminhoNota) return false;
    
    try {
      const { dados, corpo } = notaParaArquivo(nota);
      const texto = escreverMarkdown({ dados, corpo });
      await salvarTexto(novoCaminho, texto, undefined, `mover: ${nomeArquivo} para ${pastaDestino || "raiz"}`, true);
      await apagarItem(caminhoNota, nota.sha, true);
      
      // Espera o GitHub processar a movimentação antes de forçar o recarregamento unificado
      await new Promise((r) => setTimeout(r, 800));
      invalidarCache();
      dispararAtualizacaoAcervo(PASTAS.notas);

      if (!silenciarToast) toast(`Nota movida para "${pastaDestino || "Notas"}"`, { tipo: "sucesso" });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!silenciarToast) toast(`Erro ao mover a nota: ${msg}`, { tipo: "erro" });
      return false;
    }
  }

  async function executarRenomearPasta(caminhoAntigo: string, novoNome: string) {
    const nomeLimpo = novoNome
      .replace(/[^a-zA-Z0-9\s-_]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();

    setPastaEmEdicao(null);

    if (!nomeLimpo) {
      toast("O nome da pasta não pode ser vazio.", { tipo: "aviso" });
      return;
    }

    const partes = caminhoAntigo.split("/");
    const nomeAntigo = partes[partes.length - 1];

    if (nomeLimpo === nomeAntigo) {
      return;
    }

    partes[partes.length - 1] = nomeLimpo;
    const caminhoNovo = partes.join("/");

    // Impede renomear para pasta que já existe no mesmo nível
    const pastasNoMesmoNivel = subpastas.map((s) => (pastaAtual ? `${pastaAtual}/${s}` : s));
    if (pastasNoMesmoNivel.includes(caminhoNovo)) {
      toast(`Já existe uma pasta chamada "${nomeLimpo}" neste local.`, { tipo: "erro" });
      return;
    }

    const prefixoAntigo = `${PASTAS.notas}/${caminhoAntigo}/`;
    const prefixoNovo = `${PASTAS.notas}/${caminhoNovo}/`;
    const notasDaPasta = todasNotas.filter((n) => n.caminho.startsWith(prefixoAntigo));

    toast(`Renomeando pasta para "${nomeLimpo}"...`, { tipo: "info" });

    try {
      if (notasDaPasta.length > 0) {
        for (const nota of notasDaPasta) {
          const caminhoRelativo = nota.caminho.slice(prefixoAntigo.length);
          const novoCaminho = `${prefixoNovo}${caminhoRelativo}`;
          const { dados, corpo } = notaParaArquivo(nota);
          const texto = escreverMarkdown({ dados, corpo });
          await salvarTexto(novoCaminho, texto, undefined, `renomear pasta para ${caminhoNovo}`, true);
          await apagarDefinitivoItem(nota.caminho, nota.sha, true);
        }
      }

      // Também renomeia tarefas na pasta correspondente, se houver
      const prefixoAntigoTarefas = `${PASTAS.tarefas}/${caminhoAntigo}/`;
      const prefixoNovoTarefas = `${PASTAS.tarefas}/${caminhoNovo}/`;
      const tarefasDaPastaParaMover = todasTarefas.filter((t) => t.caminho.startsWith(prefixoAntigoTarefas));
      if (tarefasDaPastaParaMover.length > 0) {
        for (const tarefa of tarefasDaPastaParaMover) {
          const caminhoRelativo = tarefa.caminho.slice(prefixoAntigoTarefas.length);
          const novoCaminho = `${prefixoNovoTarefas}${caminhoRelativo}`;
          const { dados, corpo } = tarefaParaArquivo(tarefa);
          const texto = escreverMarkdown({ dados, corpo });
          await salvarTexto(novoCaminho, texto, undefined, `renomear pasta de tarefas para ${caminhoNovo}`, true);
          await apagarDefinitivoItem(tarefa.caminho, tarefa.sha, true);
        }
      }

      // Atualiza pastasCriadas
      setPastasCriadas((atuais) => {
        const semAntiga = atuais.filter((p) => p !== caminhoAntigo && !p.startsWith(`${caminhoAntigo}/`));
        const novas = atuais
          .filter((p) => p.startsWith(`${caminhoAntigo}/`))
          .map((p) => `${caminhoNovo}${p.slice(caminhoAntigo.length)}`);
        return [...new Set([...semAntiga, caminhoNovo, ...novas])];
      });

      // Se a pasta atual aberta era esta ou descendente, atualiza a navegação
      if (pastaAtual === caminhoAntigo) {
        setPastaAtual(caminhoNovo);
      } else if (pastaAtual.startsWith(`${caminhoAntigo}/`)) {
        setPastaAtual(`${caminhoNovo}${pastaAtual.slice(caminhoAntigo.length)}`);
      }

      invalidarCache();
      dispararAtualizacaoAcervo(PASTAS.notas);
      recarregar();
      toast(`Pasta renomeada para "${nomeLimpo}" com sucesso!`, { tipo: "sucesso" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(`Erro ao renomear pasta: ${msg}`, { tipo: "erro" });
    }
  }

  async function processarAcaoMenu(acao: AcaoMenuContexto) {
    switch (acao.tipo) {
      case "criar_pasta": {
        const nome = acao.nome.replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
        if (!nome) return;
        const novaPasta = pastaAtual ? `${pastaAtual}/${nome}` : nome;
        setPastasCriadas((atual) => [...new Set([...atual, novaPasta])]);
        setPastaAtual(novaPasta);
        toast(`Pasta "${nome}" criada`, { tipo: "sucesso" });
        break;
      }
      case "criar_nota": {
        nova();
        break;
      }
      case "mover_para": {
        if (selecionadas.size === 0) return;
        const destino = acao.pasta;
        const operacoes = obterOperacoesParaItens(Array.from(selecionadas), destino);
        if (operacoes.length === 0) return;
        
        let sucesso = 0;
        let falhas = 0;
        toast("Movendo arquivos...", { tipo: "info" });
        
        try {
          await Promise.all(
            operacoes.map(async (op) => {
              if (op.caminhoDestino === op.caminhoOrigem) return;
              try {
                const { dados, corpo } = notaParaArquivo(op.nota);
                const texto = escreverMarkdown({ dados, corpo });
                await salvarTexto(op.caminhoDestino, texto, undefined, `mover: ${op.caminhoOrigem.split("/").pop()} para ${destino || "raiz"}`, true);
                await apagarItem(op.caminhoOrigem, op.nota.sha, true);
                sucesso++;
              } catch {
                falhas++;
              }
            })
          );
          
          // Espera o GitHub processar a movimentação em lote antes de forçar o recarregamento unificado
          await new Promise((r) => setTimeout(r, 800));
          invalidarCache();
          dispararAtualizacaoAcervo(PASTAS.notas);

          if (falhas > 0) {
            toast(`${sucesso} movida(s), ${falhas} falha(s)`, { tipo: "aviso" });
          } else if (sucesso > 0) {
            toast(`${sucesso} nota(s) movida(s) para "${destino || "Notas"}"`, { tipo: "sucesso" });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          toast(`Erro ao mover notas: ${msg}`, { tipo: "erro" });
        } finally {
          limparSelecao();
          recarregar();
        }
        break;
      }
      case "excluir": {
        if (menuContexto?.notaAlvo && selecionadas.size === 0) {
          setNotaParaExcluir(menuContexto.notaAlvo);
        } else {
          await executarExcluir();
        }
        break;
      }
      case "copiar": {
        if (selecionadas.size > 0) {
          setClipboard({ acao: "copiar", caminhos: Array.from(selecionadas) });
          toast(`${selecionadas.size} item(ns) copiado(s)`, { tipo: "sucesso" });
        }
        break;
      }
      case "recortar": {
        if (selecionadas.size > 0) {
          setClipboard({ acao: "recortar", caminhos: Array.from(selecionadas) });
          toast(`${selecionadas.size} item(ns) recortado(s)`, { tipo: "sucesso" });
        }
        break;
      }
      case "colar": {
        await executarColar();
        break;
      }
      case "adicionar_tags": {
        if (selecionadas.size === 0) return;
        let sucesso = 0;
        let falhas = 0;
        for (const caminho of selecionadas) {
          const nota = todasNotas.find((a) => a.caminho === caminho);
          if (!nota) continue;
          const tagsNovas = [...new Set([...nota.tags, ...acao.tags])];
          const notaAtualizada = { ...nota, tags: tagsNovas };
          const { dados, corpo } = notaParaArquivo(notaAtualizada);
          const texto = escreverMarkdown({ dados, corpo });
          try {
            await salvarTexto(caminho, texto, nota.sha);
            sucesso++;
          } catch {
            falhas++;
          }
        }
        if (falhas > 0) {
          toast(`${sucesso} atualizada(s), ${falhas} falha(s)`, { tipo: "aviso" });
        } else if (sucesso > 0) {
          toast(`Tags adicionadas a ${sucesso} nota(s)`, { tipo: "sucesso" });
        }
        limparSelecao();
        recarregar();
        break;
      }
      case "fixar":
      case "desafixar": {
        if (menuContexto?.notaAlvo) {
          await toggleFixarNota(menuContexto.notaAlvo);
        }
        break;
      }
      case "duplicar": {
        if (menuContexto?.notaAlvo) {
          await duplicarNota(menuContexto.notaAlvo);
        }
        break;
      }
    }
  }



  const naPasta = todasNotas.filter((a) => {
    const partes = a.caminho.split("/");
    const pastaDoItem = partes.slice(1, -1).join("/");
    return pastaDoItem === pastaAtual;
  });

  const subpastas = useMemo(() => {
    const set = new Set<string>();
    for (const a of todasNotas) {
      const partes = a.caminho.split("/");
      if (partes.length > 2) {
        const pastaDoItem = partes.slice(1, -1).join("/");
        if (pastaDoItem.startsWith(pastaAtual ? `${pastaAtual}/` : "")) {
          const resto = pastaDoItem.slice(pastaAtual ? pastaAtual.length + 1 : 0);
          const primeira = resto.split("/")[0];
          if (primeira) set.add(primeira);
        }
      }
    }
    for (const p of pastasCriadas) {
      if (pastaAtual) {
        if (p.startsWith(`${pastaAtual}/`)) {
          const resto = p.slice(pastaAtual.length + 1);
          const primeira = resto.split("/")[0];
          if (primeira) set.add(primeira);
        }
      } else {
        const primeira = p.split("/")[0];
        if (primeira) set.add(primeira);
      }
    }
    return [...set].sort();
  }, [todasNotas, pastaAtual, pastasCriadas]);

  const [regrasFiltro, setRegrasFiltro] = useState<RegraFiltro[]>([]);

  const todasTags = useMemo(() => {
    const set = new Set<string>();
    for (const a of todasNotas) {
      for (const t of a.tags) set.add(t);
    }
    return [...set].sort();
  }, [todasNotas]);

  const propriedadesDisponiveis = useMemo<DefinicaoPropriedade[]>(() => {
    return [
      { id: "titulo", rotulo: "Título / Nome", tipo: "texto" },
      { id: "tags", rotulo: "Tags", tipo: "tags", opcoes: todasTags },
      { id: "criado_em", rotulo: "Criado em", tipo: "data" },
      { id: "atualizado_em", rotulo: "Última edição em", tipo: "data" },
      { id: "criado_por", rotulo: "Criado por", tipo: "texto" },
      { id: "caminho", rotulo: "Pasta / Caminho", tipo: "texto" },
    ];
  }, [todasTags]);

  const visiveis = useMemo(() => {
    let lista = naPasta.filter((a) => {
      const titulo = titulos[a.caminho] ?? a.titulo ?? a.caminho;
      return correspondeBusca(titulo, busca) || correspondeBusca(a.corpo, busca);
    });

    if (filtroRapido === "fixadas") {
      lista = lista.filter((a) => a.fixado);
    } else if (filtroRapido.startsWith("tag:")) {
      const tagAlvo = filtroRapido.slice(4);
      lista = lista.filter((a) => a.tags && a.tags.includes(tagAlvo));
    }

    lista = filtrarItensPorRegras(lista, regrasFiltro, (item, propId) => {
      if (propId === "titulo" || propId === "nome") return titulos[item.caminho] ?? item.titulo ?? item.caminho;
      if (propId === "tags") return item.tags || [];
      if (propId === "criado_em") return item.bruto?.criado || item.bruto?.criado_em || dataDoNome(item.caminho);
      if (propId === "atualizado_em") return item.atualizado || item.bruto?.atualizado;
      if (propId === "criado_por") return item.bruto?.autor || item.bruto?.criado_por;
      if (propId === "caminho") return item.caminho;
      return (item as any)[propId] || item.bruto?.[propId];
    });

    // Notas fixadas sempre no topo, seguidas das mais recentes
    lista.sort((a, b) => {
      if (a.fixado && !b.fixado) return -1;
      if (!a.fixado && b.fixado) return 1;
      const dataA = a.atualizadoEm || a.criadoEm || a.bruto?.criado || a.caminho;
      const dataB = b.atualizadoEm || b.criadoEm || b.bruto?.criado || b.caminho;
      return String(dataB).localeCompare(String(dataA));
    });

    return lista;
  }, [naPasta, titulos, busca, regrasFiltro, filtroRapido]);

  // `subpastas` serve só para desenhar a pasta atual. Para mover, porém,
  // precisamos oferecer também as pastas mais profundas e as que acabaram de
  // ser criadas nesta sessão.
  const pastasExistentes = useMemo(() => {
    const pastas = new Set(pastasCriadas);
    for (const nota of todasNotas) {
      const partes = nota.caminho.split("/").slice(1, -1);
      for (let i = 1; i <= partes.length; i++) {
        pastas.add(partes.slice(0, i).join("/"));
      }
    }
    return [...pastas].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [todasNotas, pastasCriadas]);

  const partesPasta = pastaAtual ? pastaAtual.split("/") : [];
  const filtroAtivo = busca.trim() !== "" || regrasFiltro.length > 0;

  const contagemPorSubpasta = useMemo(() => {
    const contagens: Record<string, number> = {};
    for (const pasta of subpastas) {
      const prefixo = pastaAtual ? `${pastaAtual}/${pasta}` : pasta;
      const qtd = todasNotas.filter((n) => {
        const partes = n.caminho.split("/").slice(1, -1).join("/");
        return partes === prefixo || partes.startsWith(`${prefixo}/`);
      }).length;
      contagens[pasta] = qtd;
    }
    return contagens;
  }, [subpastas, pastaAtual, todasNotas]);

  // Atalhos de teclado específicos da tela de Notas (⌘N, /, ⌘A, Del)
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (aberta !== null || menuContexto !== null) return;

      const el = e.target as HTMLElement | null;
      const ehInput =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.tagName === "SELECT" ||
        Boolean(el?.isContentEditable);

      // ⌘N para criar nova nota
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n" && !e.shiftKey) {
        e.preventDefault();
        nova();
        return;
      }

      // / para focar no campo de busca de notas
      if (e.key === "/" && !ehInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const inputBusca = document.querySelector("input[placeholder*='Buscar nota']") as HTMLInputElement;
        if (inputBusca) {
          inputBusca.focus();
          inputBusca.select();
        }
        return;
      }

      // ⌘A para selecionar todas as notas visíveis
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && !ehInput) {
        e.preventDefault();
        setSelecionadas(new Set(visiveis.map((n) => n.caminho)));
        return;
      }

      // Delete / Backspace para excluir selecionadas
      if ((e.key === "Delete" || e.key === "Backspace") && !ehInput && selecionadas.size > 0) {
        e.preventDefault();
        executarExcluir();
        return;
      }
    };

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberta, menuContexto, visiveis, selecionadas]);

  if (!pronto) {
    return (
      <Vazio
        titulo="Falta conectar sua conta"
        descricao="Para guardar suas anotações, preencha sua conta do GitHub e o token na aba de Ajustes."
        acao={
          <Link to="/config">
            <Botao>Ir para Ajustes</Botao>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Notas"
        descricao="Anotações e rascunhos em Markdown armazenados no seu repositório."
        icone={<FileText size={20} />}
        corIcone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        badge={
          <SeloStatus
            rotulo={`${visiveis.length} ${visiveis.length === 1 ? "nota" : "notas"}`}
            tom="primario"
          />
        }
        acoes={
          <>
            <Tooltip conteudo="Criar nova pasta de notas" posicao="bottom">
              <Botao
                variante="neutro"
                tamanho="icone"
                onClick={() => setMenuContexto({ x: window.innerWidth / 2 - 120, y: 96, emCartao: false })}
                aria-label="Nova Pasta"
              >
                <FolderPlus size={16} />
              </Botao>
            </Tooltip>

            <DropdownNovoViaModelo
              rotuloPrincipal="Nova Nota"
              iconePrincipal={<Plus size={16} />}
              aoCriarNovo={() => nova()}
              aoCriarComTemplate={(t) => nova(t)}
              aoEditarTemplate={(tmpl) => {
                setAberta({
                  caminho: tmpl.caminho || `.klaus/templates/${tmpl.id}.md`,
                  sha: tmpl.sha || "",
                  tipo: "nota",
                  titulo: tmpl.titulo,
                  corpo: tmpl.corpoPadrao,
                  tags: tmpl.frontmatter?.tags || [],
                  atualizado: "",
                  bruto: tmpl.frontmatter || {},
                  original: {
                    titulo: tmpl.titulo,
                    corpo: tmpl.corpoPadrao,
                    bruto: tmpl.frontmatter || {},
                  },
                });
              }}
            />
          </>
        }
      />

      {pastaAtual && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs bg-card/60 p-2 px-3 rounded-2xl border border-border/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setPastaAtual("")}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-medium cursor-pointer"
          >
            <FolderOpen size={14} className="text-amber-500" />
            Notas
          </button>
          {partesPasta.map((parte, i) => {
            const caminhoParcial = partesPasta.slice(0, i + 1).join("/");
            const ehUltimo = i === partesPasta.length - 1;
            const estaEmEdicao = pastaEmEdicao?.caminhoCompleto === caminhoParcial;

            return (
              <span key={caminhoParcial} className="flex items-center gap-1.5">
                <ChevronRight size={12} className="text-muted-foreground/50" />
                {estaEmEdicao ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      executarRenomearPasta(caminhoParcial, textoNovoNomePasta);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center"
                  >
                    <input
                      type="text"
                      value={textoNovoNomePasta}
                      onChange={(e) => setTextoNovoNomePasta(e.target.value)}
                      onBlur={() => executarRenomearPasta(caminhoParcial, textoNovoNomePasta)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setPastaEmEdicao(null);
                        }
                      }}
                      autoFocus
                      className="text-xs font-bold px-2 py-0.5 rounded-lg border-2 border-primary bg-background text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary/40 min-w-[120px]"
                    />
                  </form>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPastaAtual(caminhoParcial)}
                      className={cn(
                        "rounded-xl px-2.5 py-1 transition-colors font-medium cursor-pointer",
                        ehUltimo
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20 hover:bg-amber-500/15"
                          : "text-foreground hover:bg-accent"
                      )}
                    >
                      {parte}
                    </button>
                    {ehUltimo && (
                      <button
                        type="button"
                        title="Renomear pasta atual"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPastaEmEdicao({ caminhoCompleto: caminhoParcial, nomeAtual: parte });
                          setTextoNovoNomePasta(parte);
                        }}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                        aria-label="Renomear pasta atual"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Hub do Projeto Integrado: Abas de Projeto quando pasta ativa (somente se houver tarefas ou referências) */}
      {pastaAtual && (tarefasDaPasta.length > 0 || refsDaPasta.length > 0) && (
        <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-2xl border border-border/60 w-fit">
          <button
            type="button"
            onClick={() => setAbaPasta("documentos")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              abaPasta === "documentos"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText size={13} />
            <span>Notas ({naPasta.length})</span>
          </button>
          {tarefasDaPasta.length > 0 && (
            <button
              type="button"
              onClick={() => setAbaPasta("tarefas")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                abaPasta === "tarefas"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckSquare size={13} />
              <span>Tarefas ({tarefasDaPasta.length})</span>
            </button>
          )}
          {refsDaPasta.length > 0 && (
            <button
              type="button"
              onClick={() => setAbaPasta("moodboard")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                abaPasta === "moodboard"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ImageIcon size={13} />
              <span>Moodboard ({refsDaPasta.length})</span>
            </button>
          )}
        </div>
      )}

      {arquivos.length > 0 && (
        <BarraFerramentas
          busca={busca}
          aoMudarBusca={setBusca}
          placeholderBusca="Buscar nota por título ou conteúdo..."
          filtros={
            <BarraFiltrosAvancados
              propriedadesDisponiveis={propriedadesDisponiveis}
              regras={regrasFiltro}
              aoMudarRegras={setRegrasFiltro}
            />
          }
          acoes={
            <AlternadorVisao<ModoLayoutNotas>
              valorAtivo={modoLayout}
              aoAlternar={setModoLayout}
              opcoes={[
                { id: "grade", rotulo: "Grade", icone: <LayoutGrid size={14} /> },
                { id: "lista", rotulo: "Lista", icone: <List size={14} /> },
                { id: "mural", rotulo: "Mural", icone: <Columns size={14} /> },
              ]}
            />
          }
        />
      )}

      {/* Barra de Filtros Rápidos (Pills de 1 Clique) */}
      {arquivos.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setFiltroRapido("todas")}
            className={cn(
              "px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer border",
              filtroRapido === "todas"
                ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-accent hover:text-foreground"
            )}
          >
            Todas ({naPasta.length})
          </button>

          {todasNotas.some((n) => n.fixado) && (
            <button
              type="button"
              onClick={() => setFiltroRapido(filtroRapido === "fixadas" ? "todas" : "fixadas")}
              className={cn(
                "px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer border flex items-center gap-1.5",
                filtroRapido === "fixadas"
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs font-semibold"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
              )}
            >
              <Pin size={12} className="shrink-0 text-amber-500" />
              <span>Fixadas</span>
              <span className="text-[10px] opacity-80">
                ({naPasta.filter((n) => n.fixado).length})
              </span>
            </button>
          )}

          {todasTags.slice(0, 8).map((tag) => {
            const ativa = filtroRapido === `tag:${tag}`;
            const contagem = naPasta.filter((n) => n.tags?.includes(tag)).length;
            if (contagem === 0) return null;

            return (
              <button
                key={tag}
                type="button"
                onClick={() => setFiltroRapido(ativa ? "todas" : `tag:${tag}`)}
                className={cn(
                  "px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer border flex items-center gap-1",
                  ativa
                    ? "bg-foreground text-background border-foreground shadow-xs font-semibold"
                    : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-accent hover:text-foreground"
                )}
              >
                <span>#{tag}</span>
                <span className="text-[10px] opacity-60">({contagem})</span>
              </button>
            );
          })}
        </div>
      )}

      <BarraAcoesLote
        totalSelecionados={selecionadas.size}
        rotuloItem="nota"
        aoLimparSelecao={limparSelecao}
      >
        {/* Mover para pasta com Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <div>
              <BotaoAcaoLote
                tooltip="Mover notas selecionadas para pasta..."
                variante="neutro"
                icone={<FolderInput size={14} />}
                aria-label="Mover para pasta"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 text-xs shadow-xl border-border bg-card/95 backdrop-blur-md" align="center">
            <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1.5 px-1">
              Mover selecionadas para:
            </p>
            <div className="max-h-48 overflow-y-auto space-y-0.5 no-scrollbar">
              {pastasExistentes.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => processarAcaoMenu({ tipo: "mover_para", pasta: p })}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent hover:text-foreground text-xs truncate transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Adicionar tags com Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <div>
              <BotaoAcaoLote
                tooltip="Adicionar tags às notas selecionadas"
                variante="neutro"
                icone={<Tags size={14} />}
                aria-label="Adicionar tags"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2.5 text-xs shadow-xl border-border bg-card/95 backdrop-blur-md" align="center">
            <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1.5">
              Adicionar tags (separadas por vírgula):
            </p>
            <input
              type="text"
              placeholder="design, projeto, ideias..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const tags = (e.target as HTMLInputElement).value
                    .split(",")
                    .map((t) => t.trim().replace(/^#/, ""))
                    .filter(Boolean);
                  if (tags.length > 0) {
                    processarAcaoMenu({ tipo: "adicionar_tags", tags });
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </PopoverContent>
        </Popover>

        <BotaoAcaoLote
          tooltip="Excluir notas selecionadas"
          variante="perigo"
          icone={<Trash2 size={14} />}
          onClick={() => {
            processarAcaoMenu({ tipo: "excluir" });
          }}
          aria-label="Excluir notas selecionadas"
        />
      </BarraAcoesLote>

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {ilegiveis.length > 0 && (
        <Aviso tom="erro">
          {ilegiveis.length === 1 ? "1 arquivo não pôde" : `${ilegiveis.length} arquivos não puderam`}{" "}
          ser lido e está oculto: {ilegiveis.join(", ")}. Ele continua no
          repositório — abra pelo GitHub para conferir.
        </Aviso>
      )}

      {/* Seção Visual de Subpastas */}
      {subpastas.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen size={13} className="text-amber-500" />
              Pastas ({subpastas.length})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {subpastas.map((pasta) => {
              const caminhoPasta = pastaAtual ? `${pastaAtual}/${pasta}` : pasta;
              const pastaId = `folder:${caminhoPasta}`;
              const estaPastaSelecionada = selecionadas.has(pastaId);
              const qtdNotas = contagemPorSubpasta[pasta] ?? 0;
              const ehAlvo = pastaAlvo === caminhoPasta;

              return (
                <div
                  key={`pasta-${caminhoPasta}`}
                  data-cartao
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setPastaAlvo(caminhoPasta);
                  }}
                  onDragLeave={() => {
                    if (notaArrastada) setPastaAlvo(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const caminhoNota = e.dataTransfer.getData("text/plain") || notaArrastada;
                    if (caminhoNota) {
                      if (selecionadas.has(caminhoNota)) {
                        processarAcaoMenu({ tipo: "mover_para", pasta: caminhoPasta });
                      } else {
                        moverNotaParaPasta(caminhoNota, caminhoPasta);
                      }
                      setNotaArrastada(null);
                      setPastaAlvo(null);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    abrirMenuContexto(e, true);
                  }}
                  ref={(el) => {
                    if (el) {
                      cartoesRef.current.set(pastaId, el.getBoundingClientRect());
                    } else {
                      cartoesRef.current.delete(pastaId);
                    }
                  }}
                  onClick={() => {
                    if (selecionadas.size > 0) {
                      alternarSelecao(pastaId);
                    } else {
                      setPastaAtual(caminhoPasta);
                    }
                  }}
                  className={cn(
                    "group relative flex items-center gap-3 p-3 rounded-2xl border transition-colors duration-150 cursor-pointer select-none",
                    "bg-card hover:bg-accent/40 border-border/80 hover:border-border",
                    estaPastaSelecionada && "border-primary bg-primary/10 ring-2 ring-primary/30",
                    ehAlvo && "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40"
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors">
                    <FolderOpen size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {pastaEmEdicao?.caminhoCompleto === caminhoPasta ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          executarRenomearPasta(caminhoPasta, textoNovoNomePasta);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="py-0.5"
                      >
                        <input
                          type="text"
                          value={textoNovoNomePasta}
                          onChange={(e) => setTextoNovoNomePasta(e.target.value)}
                          onBlur={() => executarRenomearPasta(caminhoPasta, textoNovoNomePasta)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              e.stopPropagation();
                              setPastaEmEdicao(null);
                            }
                          }}
                          autoFocus
                          className="w-full text-xs font-bold px-2 py-1 rounded-lg border-2 border-primary bg-background text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-1 group/nome">
                        <h4
                          title="Clique para renomear"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPastaEmEdicao({ caminhoCompleto: caminhoPasta, nomeAtual: pasta });
                            setTextoNovoNomePasta(pasta);
                          }}
                          className="font-bold text-xs text-foreground truncate hover:text-primary hover:underline cursor-text transition-colors"
                        >
                          {pasta}
                        </h4>
                        <button
                          type="button"
                          title="Renomear pasta"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPastaEmEdicao({ caminhoCompleto: caminhoPasta, nomeAtual: pasta });
                            setTextoNovoNomePasta(pasta);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-opacity cursor-pointer shrink-0"
                          aria-label={`Renomear pasta ${pasta}`}
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {qtdNotas} {qtdNotas === 1 ? "nota" : "notas"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pastaAtual && abaPasta === "tarefas" ? (
        <div className="space-y-4 max-w-2xl py-2">
          <form onSubmit={criarTarefaRapidaProjeto} className="flex gap-2">
            <input
              type="text"
              value={novoTituloTarefa}
              onChange={(e) => setNovoTituloTarefa(e.target.value)}
              placeholder={`Nova tarefa para ${pastaAtual}...`}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Botao tamanho="pequeno" type="submit">
              <Plus size={14} /> Adicionar
            </Botao>
          </form>

          {tarefasDaPasta.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl text-muted-foreground text-xs">
              Nenhuma tarefa vinculada a esta pasta de projeto ainda. Use o campo acima para adicionar!
            </div>
          ) : (
            <div className="space-y-2">
              {tarefasDaPasta.map((t) => {
                const ehFeito = t.status === "feito";
                return (
                  <div
                    key={t.caminho}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors",
                      ehFeito ? "border-border/40 opacity-70" : "border-border/80"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => alternarStatusTarefaProjeto(t)}
                        className="text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                      >
                        {ehFeito ? (
                          <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-500/20" />
                        ) : (
                          <Circle size={16} />
                        )}
                      </button>
                      <span className={cn("text-xs font-semibold truncate", ehFeito && "line-through text-muted-foreground")}>
                        {t.titulo}
                      </span>
                    </div>
                    {t.prazo && (
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {t.prazo}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : pastaAtual && abaPasta === "moodboard" ? (
        <div className="space-y-4 py-2">
          {refsDaPasta.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl text-muted-foreground text-xs">
              Nenhuma referência visual vinculada a esta pasta de projeto ainda.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {refsDaPasta.map((r) => (
                <div key={r.caminho} className="rounded-2xl border border-border/80 overflow-hidden bg-card space-y-1.5 p-2">
                  {r.imagem && (
                    <div className="aspect-square rounded-xl overflow-hidden bg-black/5">
                      <ImagemPrivada caminho={r.imagem} alt={r.titulo} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <p className="text-xs font-bold truncate px-1">{r.titulo}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : carregando ? (
        <Carregando texto="Buscando suas notas…" />
      ) : todasNotas.length === 0 && pastasCriadas.length === 0 ? (
        <Vazio
          icone={<FileText size={24} />}
          titulo="Nenhuma nota criada ainda"
          descricao="Crie a primeira nota. Ela vira um arquivo .md no seu repositório — que você pode abrir em qualquer lugar."
          acao={<Botao onClick={() => nova()}>Criar primeira nota</Botao>}
        />
      ) : naPasta.length === 0 && pastaAtual ? (
        <Vazio
          icone={<FolderOpen size={24} />}
          titulo={`Pasta "${pastaAtual}" vazia`}
          descricao="Esta pasta ainda não tem notas. Crie a primeira nota dentro dela."
          acao={
            <div className="flex items-center gap-2">
              <Botao onClick={() => nova(undefined, pastaAtual)}>
                <Plus size={16} /> Criar nota aqui
              </Botao>
              <Botao variante="neutro" onClick={() => setPastaAtual("")}>
                Voltar para Notas
              </Botao>
            </div>
          }
        />
      ) : visiveis.length === 0 && subpastas.length === 0 ? (
        <Vazio
          icone={<FileText size={24} />}
          titulo="Nenhuma nota encontrada"
          descricao={
            filtroAtivo
              ? "Nenhum resultado corresponde aos filtros atuais."
              : `Nenhum resultado corresponde à busca por "${busca}".`
          }
        />
      ) : (
        <div
          ref={gridRef}
          onMouseDown={iniciarArrasto}
          onContextMenu={(e) => abrirMenuContexto(e, false)}
          className="relative select-none min-h-[50vh] pb-24"
        >
          {modoLayout === "grade" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5">
              {visiveis.map((nota) => {
                const tituloNota = titulos[nota.caminho] ?? nota.titulo ?? nota.caminho;
                const nomeArquivo = nota.caminho.split("/").pop() || "";
                const estaSelecionada = selecionadas.has(nota.caminho);
                const emSubpasta = nota.caminho.split("/").length > 2;

                const mostrarCaminho = filtroAtivo || emSubpasta;
                const subtitulo = mostrarCaminho
                  ? emSubpasta
                    ? nota.caminho.split("/").slice(1, -1).join(" / ")
                    : formatarNomeAmigavel(nomeArquivo)
                  : undefined;

                return (
                  <CartaoNotaVisual
                    key={nota.caminho}
                    nota={nota}
                    tituloNota={tituloNota}
                    subtitulo={subtitulo}
                    selecionado={estaSelecionada}
                    visao="grade"
                    totalTarefas={contagemTarefasPorNota.get(tituloNota.toLowerCase())}
                    totalMoodboard={contagemMoodboardPorNota.get(tituloNota.toLowerCase())}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", nota.caminho);
                      setNotaArrastada(nota.caminho);
                    }}
                    onDragEnd={() => {
                      setNotaArrastada(null);
                      setPastaAlvo(null);
                    }}
                    ref={(el) => {
                      if (el) {
                        cartoesRef.current.set(nota.caminho, el.getBoundingClientRect());
                      } else {
                        cartoesRef.current.delete(nota.caminho);
                      }
                    }}
                    onToggleFixar={() => toggleFixarNota(nota)}
                    onContextMenu={(e) => {
                      e.stopPropagation();
                      abrirMenuContexto(e, true, nota);
                    }}
                    onClick={() => {
                      if (selecionadas.size > 0) {
                        alternarSelecao(nota.caminho);
                      } else {
                        abrir(nota);
                      }
                    }}
                  />
                );
              })}
            </div>
          ) : modoLayout === "lista" ? (
            <div className="flex flex-col gap-2">
              {visiveis.map((nota) => {
                const tituloNota = titulos[nota.caminho] ?? nota.titulo ?? nota.caminho;
                const nomeArquivo = nota.caminho.split("/").pop() || "";
                const estaSelecionada = selecionadas.has(nota.caminho);
                const emSubpasta = nota.caminho.split("/").length > 2;

                const mostrarCaminho = filtroAtivo || emSubpasta;
                const subtitulo = mostrarCaminho
                  ? emSubpasta
                    ? nota.caminho.split("/").slice(1, -1).join(" / ")
                    : formatarNomeAmigavel(nomeArquivo)
                  : undefined;

                return (
                  <CartaoNotaVisual
                    key={nota.caminho}
                    nota={nota}
                    tituloNota={tituloNota}
                    subtitulo={subtitulo}
                    selecionado={estaSelecionada}
                    visao="lista"
                    totalTarefas={contagemTarefasPorNota.get(tituloNota.toLowerCase())}
                    totalMoodboard={contagemMoodboardPorNota.get(tituloNota.toLowerCase())}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", nota.caminho);
                      setNotaArrastada(nota.caminho);
                    }}
                    onDragEnd={() => {
                      setNotaArrastada(null);
                      setPastaAlvo(null);
                    }}
                    ref={(el) => {
                      if (el) {
                        cartoesRef.current.set(nota.caminho, el.getBoundingClientRect());
                      } else {
                        cartoesRef.current.delete(nota.caminho);
                      }
                    }}
                    onToggleFixar={() => toggleFixarNota(nota)}
                    onContextMenu={(e) => {
                      e.stopPropagation();
                      abrirMenuContexto(e, true, nota);
                    }}
                    onClick={() => {
                      if (selecionadas.size > 0) {
                        alternarSelecao(nota.caminho);
                      } else {
                        abrir(nota);
                      }
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <Masonry
              items={visiveis}
              config={{
                columns: [1, 2, 3, 4, 5],
                gap: [14, 14, 14, 14, 14],
                media: [640, 768, 1024, 1440, 1920],
              }}
              render={(nota) => {
                const tituloNota = titulos[nota.caminho] ?? nota.titulo ?? nota.caminho;
                const nomeArquivo = nota.caminho.split("/").pop() || "";
                const estaSelecionada = selecionadas.has(nota.caminho);
                const emSubpasta = nota.caminho.split("/").length > 2;

                const mostrarCaminho = filtroAtivo || emSubpasta;
                const subtitulo = mostrarCaminho
                  ? emSubpasta
                    ? nota.caminho.split("/").slice(1, -1).join(" / ")
                    : formatarNomeAmigavel(nomeArquivo)
                  : undefined;

                return (
                  <CartaoNotaVisual
                    key={nota.caminho}
                    nota={nota}
                    tituloNota={tituloNota}
                    subtitulo={subtitulo}
                    selecionado={estaSelecionada}
                    visao="mural"
                    totalTarefas={contagemTarefasPorNota.get(tituloNota.toLowerCase())}
                    totalMoodboard={contagemMoodboardPorNota.get(tituloNota.toLowerCase())}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", nota.caminho);
                      setNotaArrastada(nota.caminho);
                    }}
                    onDragEnd={() => {
                      setNotaArrastada(null);
                      setPastaAlvo(null);
                    }}
                    ref={(el) => {
                      if (el) {
                        cartoesRef.current.set(nota.caminho, el.getBoundingClientRect());
                      } else {
                        cartoesRef.current.delete(nota.caminho);
                      }
                    }}
                    onToggleFixar={() => toggleFixarNota(nota)}
                    onContextMenu={(e) => {
                      e.stopPropagation();
                      abrirMenuContexto(e, true, nota);
                    }}
                    onClick={() => {
                      if (selecionadas.size > 0) {
                        alternarSelecao(nota.caminho);
                      } else {
                        abrir(nota);
                      }
                    }}
                  />
                );
              }}
            />
          )}

          {marquee && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg border-2 border-primary/60 bg-primary/10"
              style={{
                left: marquee.x,
                top: marquee.y,
                width: marquee.w,
                height: marquee.h,
              }}
            />
          )}
        </div>
      )}

      <MenuContextoNotas
        x={menuContexto?.x ?? 0}
        y={menuContexto?.y ?? 0}
        aberto={menuContexto !== null}
        aoFechar={() => setMenuContexto(null)}
        aoAcao={processarAcaoMenu}
        pastasExistentes={pastasExistentes}
        temSelecao={selecionadas.size > 0}
        emCartao={menuContexto?.emCartao ?? false}
        temClipboard={clipboard !== null && clipboard.caminhos.length > 0}
        notaAlvo={menuContexto?.notaAlvo}
      />



      {aberta !== null && (
        <PainelNotionBase
          rotuloTipo={aberta.caminho ? "Nota" : "Nova nota"}
          modoVisao={modoVisao}
          setModoVisao={setModoVisao}
          titulo={aberta.titulo}
          setTitulo={(t) => setAberta({ ...aberta, titulo: t })}
          corpo={aberta.corpo}
          setCorpo={(c) => setAberta({ ...aberta, corpo: c })}
          caminhoItem={aberta.caminho}
          dadosProps={aberta.bruto}
          onChangeProps={(novosDados) => setAberta({ ...aberta, bruto: novosDados })}
          camposFixosProps={{
            tipo: { icone: <FileText className="h-4 w-4 opacity-50 text-orange-500" />, tipo: "select", opcoes: ["nota", "referencia", "rascunho"] },
            tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
          }}
          salvando={salvando}
          temMudancas={mudou}
          aoFechar={fecharNota}
          aoSalvar={async () => { if (aberta) await salvar(aberta); }}
          aoRemover={aberta.caminho ? async () => { await remover(); } : undefined}
          erro={erroSalvar}
          mencoes={mencoesNotaAberta}
          opcoesRelacionamento={opcoesRelacionamento}
        />
      )}

      <ModalConfirmacao
        aberto={mostrarConfirmacaoDescarte}
        titulo="Descartar alterações não salvas?"
        descricao="Você possui edições nesta nota que ainda não foram salvas. Deseja descartar as alterações?"
        textoConfirmar="Descartar Alterações"
        varianteConfirmar="perigo"
        aoConfirmar={() => {
          setMostrarConfirmacaoDescarte(false);
          fecharNota();
        }}
        aoCancelar={() => setMostrarConfirmacaoDescarte(false)}
      />

      {notaParaExcluir && (
        <ModalConfirmacao
          aberto={true}
          titulo={`Excluir nota "${notaParaExcluir.titulo}"?`}
          descricao="A nota será enviada para a Lixeira Soberana (.lixeira/) e você poderá recuperá-la a qualquer momento."
          textoConfirmar="Sim, excluir"
          varianteConfirmar="perigo"
          aoConfirmar={async () => {
            const n = notaParaExcluir;
            setNotaParaExcluir(null);
            await apagarItem(n.caminho, n.sha);
            recarregar();
          }}
          aoCancelar={() => setNotaParaExcluir(null)}
        />
      )}

      {refatoracaoPendente && (
        <ModalRefatorarLinks
          aberto={Boolean(refatoracaoPendente)}
          onFechar={() => setRefatoracaoPendente(null)}
          tituloAntigo={refatoracaoPendente.tituloAntigo}
          tituloNovo={refatoracaoPendente.tituloNovo}
          plano={refatoracaoPendente.plano}
          aoConcluir={() => {
            setRefatoracaoPendente(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}
