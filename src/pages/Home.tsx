import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sun,
  Sunrise,
  Sunset,
  CheckSquare,
  FileText,
  Image as ImageIcon,
  Target,
  ArrowRight,
  Clock,
  AlertTriangle,
  GripVertical,
  RotateCcw,
  Settings2,
  Calendar,
  Tag,
  ListTodo,
  Plus,
  Trash2,
  Mic,
  Layout,
  MessageCircle,
  X,
  Layers,
  FileImage,
  FileType,
  Settings,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, daPasta, invalidarCache, atualizarCacheLocal } from "@/lib/repo";
import { gravar, ler, apagar } from "@/lib/github";
import { comoTarefa, ordenar, textoPrazo, urgencia, paraFrontmatter, type Tarefa } from "@/lib/tarefas";
import { tituloProvavel, escreverMarkdown, nomeLivre, lerMarkdown, mesclarFrontmatter } from "@/lib/markdown";
import { comoReferencia, type Referencia } from "@/lib/referencias";
import { comoMeta, comoEntrega, resumir, metaParaFrontmatter, type Meta, type ResumoMeta } from "@/lib/pdi";
import { ImagemPrivada } from "@/components/ImagemPrivada";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import { useFerramentasFlutuantes } from "@/components/ContextoFerramentasFlutuantes";


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carregando, Vazio } from "@/components/ui";
import { cn } from "@/lib/utils";

type NotaRecente = {
  caminho: string;
  titulo: string;
  nome: string;
};

export interface Gadget {
  id: string;
  colunas: 1 | 2 | 3;
}

export interface InfoGadgetDisponivel {
  id: string;
  titulo: string;
  descricao: string;
  icone: any;
  colunasPadrao: 1 | 2 | 3;
  corIcone?: string;
}

const CATALOGO_GADGETS: InfoGadgetDisponivel[] = [
  // --- MÓDULOS DE CONTEÚDO ---
  {
    id: "kpis",
    titulo: "Resumo dos KPIs",
    descricao: "Indicadores gerais de Tarefas, Notas, Referências e PDI",
    icone: Layout,
    colunasPadrao: 3,
  },
  {
    id: "tarefas",
    titulo: "Próximas Tarefas",
    descricao: "Lista de tarefas pendentes e urgentes com edição rápida",
    icone: CheckSquare,
    colunasPadrao: 2,
  },
  {
    id: "notas",
    titulo: "Notas Recentes",
    descricao: "Últimas notas criadas e rascunhos salvos",
    icone: FileText,
    colunasPadrao: 1,
  },
  {
    id: "referencias",
    titulo: "Referências Visuais",
    descricao: "Mural de inspirações e galeria de fotos",
    icone: ImageIcon,
    colunasPadrao: 2,
  },
  {
    id: "pdi",
    titulo: "Metas de Carreira (PDI)",
    descricao: "Acompanhamento de metas e entregas do PDI",
    icone: Target,
    colunasPadrao: 1,
  },
  {
    id: "lousas",
    titulo: "Lousas Visuais (Excalidraw)",
    descricao: "Quadros de desenho e mapas mentais",
    icone: Layout,
    colunasPadrao: 1,
  },

  // --- FERRAMENTAS INDIVIDUAIS ---
  {
    id: "pdf_para_png",
    titulo: "PDF para PNG",
    descricao: "Converte páginas de PDF em imagens PNG",
    icone: FileImage,
    colunasPadrao: 1,
    corIcone: "text-blue-500 bg-blue-500/10",
  },
  {
    id: "pdf_para_jpg",
    titulo: "PDF para JPG",
    descricao: "Converte páginas de PDF em imagens JPG",
    icone: FileImage,
    colunasPadrao: 1,
    corIcone: "text-blue-500 bg-blue-500/10",
  },
  {
    id: "img_para_pdf",
    titulo: "Imagens para PDF",
    descricao: "Junta imagens em um único PDF",
    icone: FileText,
    colunasPadrao: 1,
    corIcone: "text-indigo-500 bg-indigo-500/10",
  },
  {
    id: "img_para_webp",
    titulo: "Converter para WebP",
    descricao: "Otimize imagens para formato WebP",
    icone: ImageIcon,
    colunasPadrao: 1,
    corIcone: "text-purple-500 bg-purple-500/10",
  },
  {
    id: "img_para_png",
    titulo: "Converter para PNG",
    descricao: "Transforme imagens em formato PNG",
    icone: ImageIcon,
    colunasPadrao: 1,
    corIcone: "text-purple-500 bg-purple-500/10",
  },
  {
    id: "img_para_jpg",
    titulo: "Converter para JPG",
    descricao: "Transforme imagens em formato JPG",
    icone: ImageIcon,
    colunasPadrao: 1,
    corIcone: "text-purple-500 bg-purple-500/10",
  },
  {
    id: "texto_para_md",
    titulo: "Texto para Markdown",
    descricao: "Converte textos colados ou HTML para Markdown",
    icone: FileType,
    colunasPadrao: 1,
    corIcone: "text-amber-500 bg-amber-500/10",
  },
  {
    id: "transcritor",
    titulo: "Transcritor de Voz",
    descricao: "Grave áudio ou transcreva reuniões com IA",
    icone: Mic,
    colunasPadrao: 1,
    corIcone: "text-purple-600 bg-purple-600/10",
  },
  {
    id: "chat_ia",
    titulo: "Assistente IA",
    descricao: "Conversa e tira-dúvidas com o Gemini",
    icone: MessageCircle,
    colunasPadrao: 1,
    corIcone: "text-pink-500 bg-pink-500/10",
  },
  {
    id: "configuracoes",
    titulo: "Ajustes do App",
    descricao: "Tokens do GitHub e chave do Gemini",
    icone: Settings,
    colunasPadrao: 1,
    corIcone: "text-slate-500 bg-slate-500/10",
  },
];

const GADGETS_PADRAO: Gadget[] = [
  { id: "kpis", colunas: 3 },
  { id: "tarefas", colunas: 2 },
  { id: "notas", colunas: 1 },
  { id: "referencias", colunas: 2 },
  { id: "pdi", colunas: 1 },
];

function GadgetWrapper({
  gadget,
  aoMudarColunas,
  aoRemover,
  children,
}: {
  gadget: Gadget;
  aoMudarColunas: (id: string, colunas: 1 | 2 | 3) => void;
  aoRemover: (id: string) => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: gadget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const classeGrid =
    gadget.colunas === 3
      ? "col-span-1 md:col-span-3"
      : gadget.colunas === 2
      ? "col-span-1 md:col-span-2"
      : "col-span-1";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative transition-all h-full flex flex-col group/gadget", classeGrid, isDragging && "z-50")}
    >
      {/* Controles do Gadget: Botão discreto no canto superior direito */}
      <div className="absolute top-2.5 right-2.5 z-30 group/canto">
        <div className="p-1.5 rounded-lg text-muted-foreground/20 group-hover/gadget:text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors cursor-pointer flex items-center gap-1">
          <Settings2 size={14} />
        </div>

        <div className="absolute top-0 right-0 hidden group-hover/canto:flex items-center gap-1 bg-card/95 backdrop-blur-md rounded-xl p-1.5 border border-border shadow-lg whitespace-nowrap">
          {([1, 2, 3] as const).map((col) => (
            <button
              key={col}
              onClick={(e) => {
                e.stopPropagation();
                aoMudarColunas(gadget.id, col);
              }}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors",
                gadget.colunas === col
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              )}
              title={`Redimensionar para ${col} coluna(s)`}
            >
              {col}x
            </button>
          ))}

          <div className="h-3 w-px bg-border my-auto mx-0.5" />

          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
            title="Arraste para reordenar este gadget"
            aria-label="Reordenar gadget"
          >
            <GripVertical size={14} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              aoRemover(gadget.id);
            }}
            className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-0.5"
            title="Excluir este gadget do Dashboard"
            aria-label="Excluir gadget"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}

export default function Home() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const { abrirFerramentaFlutuante } = useFerramentasFlutuantes();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tarefasPendentes, setTarefasPendentes] = useState<Tarefa[]>([]);
  const [tarefasUrgentesCount, setTarefasUrgentesCount] = useState(0);
  const [notasRecentes, setNotasRecentes] = useState<NotaRecente[]>([]);
  const [referenciasRecentes, setReferenciasRecentes] = useState<Referencia[]>([]);
  const [resumoPdi, setResumoPdi] = useState<ResumoMeta[]>([]);
  const [saudacao, setSaudacao] = useState("");
  const [IconeTempo, setIconeTempo] = useState<any>(Sun);
  const [totalTarefas, setTotalTarefas] = useState(0);
  const [totalNotas, setTotalNotas] = useState(0);
  const [totalRefs, setTotalRefs] = useState(0);

  const [salvandoItem, setSalvandoItem] = useState(false);
  const [editandoTarefa, setEditandoTarefa] = useState<Tarefa | null>(null);
  const [origTarefa, setOrigTarefa] = useState<Tarefa | null>(null);
  const [modoVisao, setModoVisao] = useState<ModoVisaoNotion>("popup");
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false);

  const [editandoNota, setEditandoNota] = useState<{
    caminho: string;
    sha: string;
    titulo: string;
    corpo: string;
    bruto: Record<string, any>;
  } | null>(null);
  const [origNota, setOrigNota] = useState<any>(null);

  const [editandoMeta, setEditandoMeta] = useState<Meta | null>(null);
  const [origMeta, setOrigMeta] = useState<Meta | null>(null);

  const { focarFlutuante } = useItemFlutuante();

  async function salvarTarefaHome(t: Tarefa, fechar = true) {
    setSalvandoItem(true);
    try {
      const texto = escreverMarkdown({
        dados: paraFrontmatter(t),
        corpo: t.corpo,
      });
      const caminho = t.caminho || nomeLivre("tarefas", t.titulo, tarefasPendentes.map((x) => x.caminho));
      const docAtualizado = lerMarkdown(texto);
      const novaSha = await gravar(cfg, caminho, texto, t.sha || undefined);
      atualizarCacheLocal(caminho, texto, docAtualizado, novaSha);
      invalidarCache();
      const tSalva = { ...t, caminho, sha: novaSha };
      setEditandoTarefa(fechar ? null : tSalva);
      setOrigTarefa(fechar ? null : tSalva);
      await carregar(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setSalvandoItem(false);
    }
  }

  async function abrirNotaHome(caminho: string) {
    if (focarFlutuante(caminho)) return;
    try {
      const res = await ler(cfg, caminho);
      const doc = lerMarkdown(res.texto);
      const docTitulo = typeof doc.dados.titulo === "string" ? doc.dados.titulo : "";
      const tituloFinal = docTitulo || tituloProvavel(doc, caminho);
      setEditandoNota({
        caminho,
        sha: res.sha,
        titulo: tituloFinal,
        corpo: doc.corpo,
        bruto: doc.dados,
      });
      setOrigNota({ titulo: tituloFinal, corpo: doc.corpo, bruto: doc.dados });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  async function salvarNotaHome(fechar = true) {
    if (!editandoNota) return;
    setSalvandoItem(true);
    try {
      const texto = escreverMarkdown({
        dados: mesclarFrontmatter(editandoNota.bruto, {
          titulo: editandoNota.titulo || "Sem título",
          tipo: "nota",
        }),
        corpo: editandoNota.corpo,
      });
      const docAtualizado = lerMarkdown(texto);
      const novaSha = await gravar(cfg, editandoNota.caminho, texto, editandoNota.sha);
      atualizarCacheLocal(editandoNota.caminho, texto, docAtualizado, novaSha);
      invalidarCache();
      const nSalva = { ...editandoNota, sha: novaSha };
      setEditandoNota(fechar ? null : nSalva);
      setOrigNota(fechar ? null : { titulo: nSalva.titulo, corpo: nSalva.corpo, bruto: nSalva.bruto });
      await carregar(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setSalvandoItem(false);
    }
  }

  async function salvarMetaHome(m: Meta, fechar = true) {
    setSalvandoItem(true);
    try {
      const texto = escreverMarkdown({
        dados: metaParaFrontmatter(m),
        corpo: m.corpo,
      });
      const novaSha = await gravar(cfg, m.caminho, texto, m.sha);
      invalidarCache();
      const mSalva = { ...m, sha: novaSha };
      setEditandoMeta(fechar ? null : mSalva);
      setOrigMeta(fechar ? null : mSalva);
      await carregar(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setSalvandoItem(false);
    }
  }

  // Auto-save em 2.5s para itens abertos na Home
  useEffect(() => {
    const mudouTarefa = editandoTarefa !== null && origTarefa !== null && JSON.stringify(editandoTarefa) !== JSON.stringify(origTarefa);
    if (!mudouTarefa || salvandoItem || !editandoTarefa) return;
    const timer = setTimeout(() => {
      salvarTarefaHome(editandoTarefa, false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [editandoTarefa, origTarefa, salvandoItem]);

  useEffect(() => {
    const mudouNota = editandoNota !== null && origNota !== null && JSON.stringify(editandoNota) !== JSON.stringify(origNota);
    if (!mudouNota || salvandoItem || !editandoNota) return;
    const timer = setTimeout(() => {
      salvarNotaHome(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [editandoNota, origNota, salvandoItem]);

  useEffect(() => {
    const mudouMeta = editandoMeta !== null && origMeta !== null && JSON.stringify(editandoMeta) !== JSON.stringify(origMeta);
    if (!mudouMeta || salvandoItem || !editandoMeta) return;
    const timer = setTimeout(() => {
      salvarMetaHome(editandoMeta, false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [editandoMeta, origMeta, salvandoItem]);

  const [gadgets, setGadgets] = useState<Gadget[]>(() => {
    const salvo = localStorage.getItem("home-gadgets");
    if (salvo) {
      try {
        return JSON.parse(salvo);
      } catch {
        return GADGETS_PADRAO;
      }
    }
    return GADGETS_PADRAO;
  });

  const salvarGadgets = (novos: Gadget[]) => {
    setGadgets(novos);
    localStorage.setItem("home-gadgets", JSON.stringify(novos));
  };

  const restaurarLayout = () => {
    setGadgets(GADGETS_PADRAO);
    localStorage.removeItem("home-gadgets");
  };

  const alternarColunas = (id: string, colunas: 1 | 2 | 3) => {
    salvarGadgets(
      gadgets.map((g) => (g.id === id ? { ...g, colunas } : g))
    );
  };

  const removerGadget = (id: string) => {
    salvarGadgets(gadgets.filter((g) => g.id !== id));
  };

  const adicionarGadget = (info: InfoGadgetDisponivel) => {
    if (gadgets.some((g) => g.id === info.id)) return;
    salvarGadgets([...gadgets, { id: info.id, colunas: info.colunasPadrao }]);
    setModalAdicionarAberto(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const aoArrastarFim = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const antigoIndex = gadgets.findIndex((g) => g.id === active.id);
      const novoIndex = gadgets.findIndex((g) => g.id === over.id);
      salvarGadgets(arrayMove(gadgets, antigoIndex, novoIndex));
    }
  };

  const carregar = useCallback(
    async (silencioso = false) => {
      if (!pronto) return;
      if (!silencioso) setCarregando(true);
      setErro("");

      try {
        const todos = await carregarRepo(cfg);

        // 1. Tarefas
        const arqTarefas = daPasta(todos, "tarefas");
        const listaTarefas = ordenar(
          arqTarefas.map((i) =>
            comoTarefa(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome))
          )
        );
        setTotalTarefas(listaTarefas.length);
        const pendentes = listaTarefas.filter((t) => t.status !== "feito");
        setTarefasPendentes(pendentes.slice(0, 5));
        setTarefasUrgentesCount(
          pendentes.filter((t) => urgencia(t) === "atrasada" || urgencia(t) === "hoje").length
        );

        // 2. Notas
        const arqNotas = daPasta(todos, "notas");
        setTotalNotas(arqNotas.length);
        setNotasRecentes(
          arqNotas.slice(0, 5).map((i) => ({
            caminho: i.caminho,
            titulo: tituloProvavel(i.doc, i.nome),
            nome: i.nome,
          }))
        );

        // 3. Referências
        const arqRefs = daPasta(todos, "referencias").filter(
          (i) => !i.caminho.startsWith("referencias/imagens/")
        );
        setTotalRefs(arqRefs.length);
        setReferenciasRecentes(
          arqRefs.slice(0, 6).map((i) =>
            comoReferencia(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome))
          )
        );

        // 4. PDI
        const arqMetas = daPasta(todos, "pdi/metas");
        const arqEntregas = daPasta(todos, "pdi/entregas");
        const metas = arqMetas.map((i) =>
          comoMeta(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome))
        );
        const entregas = arqEntregas.map((i) =>
          comoEntrega(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome))
        );
        setResumoPdi(resumir(metas, entregas));
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      } finally {
        setCarregando(false);
      }
    },
    [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]
  );

  useEffect(() => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) {
      setSaudacao("Bom dia");
      setIconeTempo(Sunrise);
    } else if (hora >= 12 && hora < 18) {
      setSaudacao("Boa tarde");
      setIconeTempo(Sun);
    } else {
      setSaudacao("Boa noite");
      setIconeTempo(Sunset);
    }

    carregar();
  }, [carregar]);

  if (!pronto) {
    return (
      <Vazio
        titulo="Bem-vindo ao Klaus"
        descricao="Conecte sua conta do GitHub para começar a organizar suas tarefas e notas num lugar só."
        acao={
          <Link to="/config">
            <Button>Ir para Ajustes</Button>
          </Link>
        }
      />
    );
  }

  if (carregando) {
    return <Carregando texto="Sincronizando seu centro de comando..." />;
  }

  // Renderização responsiva de qualquer gadget individual do acervo
  const renderizarGadget = (gadget: Gadget) => {
    // 1. Ferramenta ou Conversão Individual: Cartão clicável elegante e sem botões pretos
    const infoCat = CATALOGO_GADGETS.find((c) => c.id === gadget.id);

    if (infoCat && infoCat.corIcone) {
      const IconeComp = infoCat.icone;
      return (
        <GadgetWrapper key={gadget.id} gadget={gadget} aoMudarColunas={alternarColunas} aoRemover={removerGadget}>
          <div
            onClick={() => abrirFerramentaFlutuante(gadget.id)}
            className="group relative flex flex-col justify-between h-full p-5 rounded-2xl border border-border/80 bg-card hover:bg-accent/60 hover:border-primary/40 cursor-pointer transition-all shadow-xs overflow-hidden pr-10"
          >
            <div className="space-y-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105", infoCat.corIcone)}>
                <IconeComp size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                  {infoCat.titulo}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {infoCat.descricao}
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <span>Usar ferramenta</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </GadgetWrapper>
      );
    }

    // 2. Módulos de Conteúdo (KPIs, Tarefas, Notas, Referências, PDI, Lousas)
    switch (gadget.id) {
      case "kpis": {
        const gridKpisClass =
          gadget.colunas === 3
            ? "grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4"
            : gadget.colunas === 2
            ? "grid gap-4 sm:gap-5 grid-cols-2"
            : "grid gap-4 grid-cols-1 sm:grid-cols-2";

        return (
          <GadgetWrapper key={gadget.id} gadget={gadget} aoMudarColunas={alternarColunas} aoRemover={removerGadget}>
            <div className={gridKpisClass}>
              <Link to="/tarefas" className="block group">
                <Card className="hover:border-primary/50 transition-all hover:shadow-md cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 sm:p-6 pb-2 sm:pb-3">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarefas Pendentes</CardTitle>
                    <CheckSquare className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight">{totalTarefas}</div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      {tarefasUrgentesCount > 0 ? (
                        <span className="text-amber-600 font-semibold">{tarefasUrgentesCount} urgentes</span>
                      ) : (
                        "Tudo sob controle"
                      )}
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/notas" className="block group">
                <Card className="hover:border-primary/50 transition-all hover:shadow-md cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 sm:p-6 pb-2 sm:pb-3">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notas Criadas</CardTitle>
                    <FileText className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight">{totalNotas}</div>
                    <p className="text-xs text-muted-foreground mt-2">Conhecimento salvo</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/referencias" className="block group">
                <Card className="hover:border-primary/50 transition-all hover:shadow-md cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 sm:p-6 pb-2 sm:pb-3">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Referências</CardTitle>
                    <ImageIcon className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight">{totalRefs}</div>
                    <p className="text-xs text-muted-foreground mt-2">Galeria de inspirações</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/pdi" className="block group">
                <Card className="hover:border-primary/50 transition-all hover:shadow-md cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 sm:p-6 pb-2 sm:pb-3">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Carreira (PDI)</CardTitle>
                    <Target className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight">{resumoPdi.length}</div>
                    <p className="text-xs text-muted-foreground mt-2">Metas em progresso</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </GadgetWrapper>
        );
      }

      case "tarefas":
        return (
          <GadgetWrapper key={gadget.id} gadget={gadget} aoMudarColunas={alternarColunas} aoRemover={removerGadget}>
            <Card className="shadow-sm h-full flex flex-col border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <CheckSquare size={18} className="text-primary" />
                    Próximas Tarefas
                  </CardTitle>
                  <CardDescription className="text-xs">O que precisa da sua atenção agora.</CardDescription>
                </div>
                <Link to="/tarefas">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary hover:bg-primary/10">
                    <span>Ver todas</span>
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-0 flex-1">
                {tarefasPendentes.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 text-center p-4">
                    <CheckSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhuma tarefa pendente! Excelente 🎉</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5 sm:gap-4">
                    {tarefasPendentes.map((t) => {
                      const prazoTexto = textoPrazo(t);
                      const urgente = urgencia(t) === "atrasada" || urgencia(t) === "hoje" || urgencia(t) === "proxima";
                      return (
                        <button
                          key={t.caminho}
                          onClick={() => {
                            if (focarFlutuante(t.caminho)) return;
                            setEditandoTarefa(t);
                            setOrigTarefa(t);
                          }}
                          className="block group w-full text-left"
                        >
                          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-4 transition-all hover:bg-accent/70 hover:border-primary/40 shadow-xs">
                            <div className="space-y-1.5 min-w-0 pr-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                                  {t.titulo}
                                </span>
                                {urgente && (
                                  <Badge variant="destructive" className="text-[10px] py-0 px-2 h-4.5 font-medium">
                                    Urgente
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {prazoTexto && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                                    <Clock size={12} />
                                    {prazoTexto}
                                  </span>
                                )}
                                {t.tags.map((tag) => (
                                  <Badge variant="secondary" key={tag} className="text-[10px] py-0 px-2">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <ArrowRight size={16} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </GadgetWrapper>
        );

      case "notas":
        return (
          <GadgetWrapper key={gadget.id} gadget={gadget} aoMudarColunas={alternarColunas} aoRemover={removerGadget}>
            <Card className="shadow-sm h-full flex flex-col border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText size={18} className="text-blue-500" />
                    Notas Recentes
                  </CardTitle>
                  <CardDescription className="text-xs">Seus últimos rascunhos e conhecimentos.</CardDescription>
                </div>
                <Link to="/notas">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-blue-500 hover:bg-blue-500/10">
                    <span>Ver acervo</span>
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-0 flex-1">
                {notasRecentes.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 text-center p-3">
                    <p className="text-xs text-muted-foreground">Nenhuma nota criada ainda.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {notasRecentes.map((n) => (
                      <button
                        key={n.caminho}
                        onClick={() => abrirNotaHome(n.caminho)}
                        className="block group w-full text-left"
                      >
                        <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card hover:bg-accent/70 hover:border-blue-500/40 transition-all shadow-xs">
                          <span className="text-xs font-semibold group-hover:text-blue-500 transition-colors truncate pr-2">
                            {n.titulo}
                          </span>
                          <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-blue-500 transition-colors shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </GadgetWrapper>
        );

      case "referencias":
        return (
          <GadgetWrapper key={gadget.id} gadget={gadget} aoMudarColunas={alternarColunas} aoRemover={removerGadget}>
            <Card className="shadow-sm h-full flex flex-col border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ImageIcon size={18} className="text-purple-500" />
                    Inspirações & Referências
                  </CardTitle>
                  <CardDescription className="text-xs">Galeria visual do seu acervo.</CardDescription>
                </div>
                <Link to="/referencias">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-purple-500 hover:bg-purple-500/10">
                    <span>Galeria</span>
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-0 flex-1">
                {referenciasRecentes.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 text-center p-3">
                    <p className="text-xs text-muted-foreground">Nenhuma referência adicionada.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {referenciasRecentes.map((r) => (
                      <Link
                        key={r.caminho}
                        to={`/referencias?abrir=${encodeURIComponent(r.caminho)}`}
                        className="group relative overflow-hidden rounded-xl border border-border/80 bg-card hover:border-purple-500/50 transition-all aspect-video shadow-xs"
                      >
                        {r.imagem ? (
                          <ImagemPrivada
                            caminho={r.imagem}
                            alt={r.titulo}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-secondary/50 p-2 text-center text-[11px] font-semibold text-muted-foreground">
                            {r.titulo}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <span className="text-[11px] font-semibold text-white truncate">
                            {r.titulo}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </GadgetWrapper>
        );

      case "pdi":
        return (
          <GadgetWrapper key={gadget.id} gadget={gadget} aoMudarColunas={alternarColunas} aoRemover={removerGadget}>
            <Card className="shadow-sm h-full flex flex-col border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Target size={18} className="text-emerald-500" />
                    Carreira & PDI
                  </CardTitle>
                  <CardDescription className="text-xs">Acompanhamento das suas metas.</CardDescription>
                </div>
                <Link to="/pdi">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                    <span>Ver PDI</span>
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-0 flex-1">
                {resumoPdi.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 text-center p-3">
                    <p className="text-xs text-muted-foreground">Nenhuma meta cadastrada ainda.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5 sm:gap-4">
                    {resumoPdi.map((r) => (
                      <button
                        key={r.meta.caminho}
                        onClick={() => {
                          if (focarFlutuante(r.meta.caminho)) return;
                          setEditandoMeta(r.meta);
                          setOrigMeta(r.meta);
                        }}
                        className="block group w-full text-left"
                      >
                        <div className="p-4 rounded-xl border border-border/80 bg-card hover:bg-accent/70 hover:border-emerald-500/40 transition-all shadow-xs space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold group-hover:text-emerald-500 transition-colors truncate">
                              {r.meta.titulo}
                            </span>
                            <Badge
                              variant={r.meta.status === "concluida" ? "default" : "secondary"}
                              className="text-[9px] py-0.5 px-2 shrink-0 font-medium"
                            >
                              {r.meta.status === "em-andamento" ? "Em andamento" : r.meta.status === "concluida" ? "Concluída" : "A começar"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {r.entregas.length} entrega{r.entregas.length !== 1 ? "s" : ""} registrada{r.entregas.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </GadgetWrapper>
        );

      case "lousas":
        return (
          <GadgetWrapper key={gadget.id} gadget={gadget} aoMudarColunas={alternarColunas} aoRemover={removerGadget}>
            <Link to="/lousas" className="block h-full group">
              <Card className="shadow-sm h-full flex flex-col border border-border/80 hover:border-indigo-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 pb-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2 group-hover:text-indigo-500 transition-colors">
                      <Layout size={18} className="text-indigo-500" />
                      Lousas & Esboços
                    </CardTitle>
                    <CardDescription className="text-xs">Desenhe e esquematize suas ideias no Excalidraw.</CardDescription>
                  </div>
                  <ArrowRight size={16} className="text-muted-foreground/40 group-hover:text-indigo-500 transition-colors shrink-0" />
                </CardHeader>
              </Card>
            </Link>
          </GadgetWrapper>
        );

      default:
        return null;
    }
  };

  const gadgetsFaltantes = CATALOGO_GADGETS.filter(
    (c) => !gadgets.some((g) => g.id === c.id)
  );

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-300 w-full pb-10">
      {/* Topo Hero & Saudação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-accent/30 p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <IconeTempo className="h-7 w-7 text-amber-500" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {saudacao}, Hugo!
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Seu centro de comando do Klaus. Adicione e organize os gadgets como preferir.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="default"
            size="sm"
            onClick={() => setModalAdicionarAberto(true)}
            className="gap-2 text-xs font-semibold shadow-xs"
          >
            <Plus size={15} />
            <span>Adicionar Gadget</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={restaurarLayout}
            className="gap-2 text-xs text-muted-foreground hover:text-foreground bg-background shadow-xs"
            title="Restaurar o layout padrão dos gadgets"
          >
            <RotateCcw size={14} />
            <span>Restaurar Layout</span>
          </Button>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{erro}</span>
        </div>
      )}

      {/* DndContext & Sortable Grid de Gadgets */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoArrastarFim}>
        <SortableContext items={gadgets.map((g) => g.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {gadgets.map((gadget) => renderizarGadget(gadget))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Modal de Adicionar Gadget Limpo e Intuitivo */}
      {modalAdicionarAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setModalAdicionarAberto(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-primary" />
                <h2 className="font-bold text-base text-foreground">Adicionar Gadget ao Dashboard</h2>
              </div>
              <button
                onClick={() => setModalAdicionarAberto(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 min-h-0 flex-1">
              {gadgetsFaltantes.length === 0 ? (
                <div className="p-8 text-center space-y-1">
                  <p className="text-sm font-semibold text-foreground">Todos os gadgets já foram adicionados!</p>
                  <p className="text-xs text-muted-foreground">Você pode reordenar ou redimensionar os blocos na tela inicial.</p>
                </div>
              ) : (
                gadgetsFaltantes.map((info) => {
                  const IconeComp = info.icone;
                  return (
                    <div
                      key={info.id}
                      onClick={() => adicionarGadget(info)}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card hover:bg-accent/70 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-primary shrink-0", info.corIcone || "bg-primary/10")}>
                          <IconeComp size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">{info.titulo}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{info.descricao}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs text-primary group-hover:bg-primary group-hover:text-primary-foreground shrink-0 transition-colors"
                      >
                        <Plus size={14} />
                        <span>Adicionar</span>
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Painel Notion para edição direta na Home sem pulos de tela */}
      {editandoTarefa !== null && (
        <PainelNotionBase
          rotuloTipo={editandoTarefa.caminho ? "Tarefa" : "Nova tarefa"}
          modoVisao={modoVisao}
          setModoVisao={setModoVisao}
          titulo={editandoTarefa.titulo}
          setTitulo={(t) => setEditandoTarefa({ ...editandoTarefa, titulo: t })}
          corpo={editandoTarefa.corpo}
          setCorpo={(c) => setEditandoTarefa({ ...editandoTarefa, corpo: c })}
          caminhoItem={editandoTarefa.caminho}
          dadosProps={{
            ...editandoTarefa.bruto,
            status: editandoTarefa.status,
            prazo: editandoTarefa.prazo,
            tags: editandoTarefa.tags,
          }}
          onChangeProps={(nProps) => {
            setEditandoTarefa({
              ...editandoTarefa,
              bruto: nProps,
              status: (nProps.status as Tarefa["status"]) || editandoTarefa.status,
              prazo: nProps.prazo as string | undefined,
              tags: Array.isArray(nProps.tags)
                ? (nProps.tags as string[])
                : editandoTarefa.tags,
            });
          }}
          camposFixosProps={{
            status: { icone: <ListTodo className="h-4 w-4 opacity-50" />, tipo: "status" },
            prazo: { icone: <Calendar className="h-4 w-4 opacity-50" />, tipo: "data" },
            tags: { icone: <Tag className="h-4 w-4 opacity-50" />, tipo: "multiselect" },
          }}
          salvando={salvandoItem}
          temMudancas={
            origTarefa !== null &&
            JSON.stringify(editandoTarefa) !== JSON.stringify(origTarefa)
          }
          aoFechar={() => {
            setEditandoTarefa(null);
            setOrigTarefa(null);
          }}
          aoSalvar={async () => {
            await salvarTarefaHome(editandoTarefa);
          }}
          aoRemover={
            editandoTarefa.caminho
              ? async () => {
                  await apagar(cfg, editandoTarefa.caminho, editandoTarefa.sha);
                  invalidarCache();
                  setEditandoTarefa(null);
                  setOrigTarefa(null);
                  await carregar();
                }
              : undefined
          }
          erro={erro}
          mencoes={[]}
          opcoesRelacionamento={[]}
        />
      )}

      {/* Painel para Nota na Home */}
      {editandoNota !== null && (
        <PainelNotionBase
          rotuloTipo="Nota"
          modoVisao={modoVisao}
          setModoVisao={setModoVisao}
          titulo={editandoNota.titulo}
          setTitulo={(t) => setEditandoNota({ ...editandoNota, titulo: t })}
          corpo={editandoNota.corpo}
          setCorpo={(c) => setEditandoNota({ ...editandoNota, corpo: c })}
          dadosProps={editandoNota.bruto}
          onChangeProps={(novosDados) => setEditandoNota({ ...editandoNota, bruto: novosDados })}
          camposFixosProps={{
            tipo: { icone: <FileText className="h-4 w-4 opacity-50 text-orange-500" />, tipo: "select", opcoes: ["nota", "referencia", "rascunho"] },
            tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
          }}
          salvando={salvandoItem}
          temMudancas={origNota !== null && JSON.stringify(editandoNota) !== JSON.stringify(origNota)}
          aoFechar={() => salvarNotaHome(true)}
          aoSalvar={async () => { await salvarNotaHome(false); }}
          aoRemover={async () => {
            await apagar(cfg, editandoNota.caminho, editandoNota.sha);
            invalidarCache();
            setEditandoNota(null);
            setOrigNota(null);
            await carregar();
          }}
          erro={erro}
        />
      )}

      {/* Painel para Meta na Home */}
      {editandoMeta !== null && (
        <PainelNotionBase
          rotuloTipo="Meta da Carreira"
          modoVisao={modoVisao}
          setModoVisao={setModoVisao}
          titulo={editandoMeta.titulo}
          setTitulo={(t) => setEditandoMeta({ ...editandoMeta, titulo: t })}
          corpo={editandoMeta.corpo}
          setCorpo={(c) => setEditandoMeta({ ...editandoMeta, corpo: c })}
          dadosProps={{
            status: editandoMeta.status,
            prazo: editandoMeta.prazo,
            indicador: editandoMeta.indicador,
          }}
          onChangeProps={(novosDados) =>
            setEditandoMeta({
              ...editandoMeta,
              status: (novosDados.status as any) || editandoMeta.status,
              prazo: novosDados.prazo,
              indicador: novosDados.indicador || editandoMeta.indicador,
            })
          }
          camposFixosProps={{
            status: { icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "status" },
            prazo: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
            indicador: { icone: <CheckSquare className="h-4 w-4 opacity-50 text-purple-500" />, tipo: "texto" },
          }}
          salvando={salvandoItem}
          temMudancas={origMeta !== null && JSON.stringify(editandoMeta) !== JSON.stringify(origMeta)}
          aoFechar={() => salvarMetaHome(editandoMeta, true)}
          aoSalvar={async () => { await salvarMetaHome(editandoMeta, false); }}
          aoRemover={async () => {
            await apagar(cfg, editandoMeta.caminho, editandoMeta.sha);
            invalidarCache();
            setEditandoMeta(null);
            setOrigMeta(null);
            await carregar();
          }}
          erro={erro}
        />
      )}
    </div>
  );
}
