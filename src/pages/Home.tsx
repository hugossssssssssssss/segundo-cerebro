import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Moon,
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
  Maximize2,
  RotateCcw,
  Settings2,
  Calendar,
  Tag,
  ListTodo,
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
  children,
}: {
  gadget: Gadget;
  aoMudarColunas: (id: string, colunas: 1 | 2 | 3) => void;
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

  const proximaColuna = (gadget.colunas % 3 + 1) as 1 | 2 | 3;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative transition-all h-full flex flex-col", classeGrid, isDragging && "z-50")}
    >
      {/* Controles do Gadget: aparece EXCLUSIVAMENTE ao passar o mouse sobre o ícone do canto superior direito */}
      <div className="absolute top-2.5 right-2.5 z-30 group/canto">
        <div className="p-1 rounded-lg text-muted-foreground/30 hover:text-foreground hover:bg-accent/80 transition-colors cursor-pointer flex items-center gap-1">
          <Settings2 size={15} />
        </div>

        <div className="absolute top-0 right-0 hidden group-hover/canto:flex items-center gap-1 bg-background/95 backdrop-blur-md rounded-xl p-1.5 border border-border/80 shadow-md whitespace-nowrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              aoMudarColunas(gadget.id, proximaColuna);
            }}
            className="px-2 py-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground text-[11px] font-bold flex items-center gap-1 transition-colors"
            title={`Largura atual: ${gadget.colunas}x. Clique para alterar para ${proximaColuna}x.`}
          >
            <Maximize2 size={12} />
            <span>{gadget.colunas}x</span>
          </button>

          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
            title="Arraste para reordenar este gadget"
            aria-label="Reordenar gadget"
          >
            <GripVertical size={14} />
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
      // Só DEPOIS de gravar, com o sha devolvido pelo GitHub — ver a explicação
      // em `atualizarCacheLocal` (repo.ts).
      const novaSha = await gravar(cfg, caminho, texto, t.sha || undefined);
      atualizarCacheLocal(caminho, texto, docAtualizado, novaSha);
      invalidarCache();
      const tSalva = { ...t, caminho, sha: novaSha };
      setEditandoTarefa(fechar ? null : tSalva);
      setOrigTarefa(fechar ? null : tSalva);
      await carregar(true);
    } catch (e) {
      // Repassa o erro depois de mostrá-lo: quem fecha o painel precisa
      // saber que a gravação falhou, para não fechar em cima do texto.
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
      // Só DEPOIS de gravar, com o sha devolvido pelo GitHub — ver a explicação
      // em `atualizarCacheLocal` (repo.ts).
      const novaSha = await gravar(cfg, editandoNota.caminho, texto, editandoNota.sha);
      atualizarCacheLocal(editandoNota.caminho, texto, docAtualizado, novaSha);
      invalidarCache();
      const nSalva = { ...editandoNota, sha: novaSha };
      setEditandoNota(fechar ? null : nSalva);
      setOrigNota(fechar ? null : { titulo: nSalva.titulo, corpo: nSalva.corpo, bruto: nSalva.bruto });
      await carregar(true);
    } catch (e) {
      // Repassa o erro depois de mostrá-lo: quem fecha o painel precisa
      // saber que a gravação falhou, para não fechar em cima do texto.
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
      // Repassa o erro depois de mostrá-lo: quem fecha o painel precisa
      // saber que a gravação falhou, para não fechar em cima do texto.
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const aoArrastarFim = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const idxAntigo = gadgets.findIndex((g) => g.id === active.id);
      const idxNovo = gadgets.findIndex((g) => g.id === over.id);
      salvarGadgets(arrayMove(gadgets, idxAntigo, idxNovo));
    }
  };

  useEffect(() => {
    const hora = new Date().getHours();
    if (hora < 6) {
      setSaudacao("Boa madrugada");
      setIconeTempo(() => Moon);
    } else if (hora < 12) {
      setSaudacao("Bom dia");
      setIconeTempo(() => Sunrise);
    } else if (hora < 18) {
      setSaudacao("Boa tarde");
      setIconeTempo(() => Sun);
    } else {
      setSaudacao("Boa noite");
      setIconeTempo(() => Sunset);
    }
  }, []);

  /**
   * Já houve um carregamento nesta tela? Guardado num ref porque o tamanho da
   * lista estava nas dependências do carregador — que é justamente quem altera
   * a lista, disparando um carregamento extra a cada item criado.
   */
  const jaCarregouRef = useRef(false);

  const carregar = useCallback(async (silencioso = false) => {
    if (!pronto) {
      setCarregando(false);
      return;
    }
    if (!silencioso && !jaCarregouRef.current) {
      setCarregando(true);
    }
    setErro("");
    try {
      const todos = await carregarRepo(cfg, { memoria: 3000 });

      // Tarefas
      const itensTarefas = daPasta(todos, "tarefas");
      const tarefas = ordenar(
        itensTarefas.map((i) => comoTarefa(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome)))
      );
      const pendentes = tarefas.filter((t) => t.status !== "feito");
      const urgentes = pendentes.filter((t) => urgencia(t) !== "nenhuma" && urgencia(t) !== "tranquila");
      setTotalTarefas(pendentes.length);
      setTarefasUrgentesCount(urgentes.length);
      setTarefasPendentes(pendentes.slice(0, 5));

      // Notas
      const itensNotas = daPasta(todos, "notas");
      setTotalNotas(itensNotas.length);
      setNotasRecentes(
        itensNotas.slice(0, 4).map((i) => ({
          caminho: i.caminho,
          titulo: tituloProvavel(i.doc, i.nome),
          nome: i.nome,
        }))
      );

      // Referências Visuais
      const itensRefs = daPasta(todos, "referencias");
      setTotalRefs(itensRefs.length);
      setReferenciasRecentes(
        itensRefs.slice(0, 6).map((i) => comoReferencia(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome)))
      );

      // PDI / Metas
      const itensMetas = daPasta(todos, "pdi/metas").map((i) => comoMeta(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome)));
      const itensEntregas = daPasta(todos, "pdi/entregas").map((i) => comoEntrega(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome)));
      const resumos = resumir(itensMetas, itensEntregas);
      setResumoPdi(resumos.slice(0, 3));

    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      jaCarregouRef.current = true;
      setCarregando(false);
    }
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  useEffect(() => {
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

  // Renderização responsiva dos gadgets com base no tamanho individual
  const renderizarGadget = (gadget: Gadget) => {
    switch (gadget.id) {
      case "kpis": {
        const gridKpisClass =
          gadget.colunas === 3
            ? "grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4"
            : gadget.colunas === 2
            ? "grid gap-4 sm:gap-5 grid-cols-2"
            : "grid gap-4 grid-cols-1 sm:grid-cols-2";

        return (
          <GadgetWrapper key={gadget.id} gadget={gadget} aoMudarColunas={alternarColunas}>
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
          <GadgetWrapper key={gadget.id} gadget={gadget} aoMudarColunas={alternarColunas}>
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

                            <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
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

      case "referencias": {
        const gridRefsClass =
          gadget.colunas === 3
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-5"
            : gadget.colunas === 2
            ? "grid grid-cols-2 sm:grid-cols-4 gap-4"
            : "grid grid-cols-2 gap-4";

        return (
          <GadgetWrapper key={gadget.id} gadget={gadget} aoMudarColunas={alternarColunas}>
            <Card className="shadow-sm h-full flex flex-col border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ImageIcon size={18} className="text-purple-500" />
                    Inspirações Visuais Recentes
                  </CardTitle>
                  <CardDescription className="text-xs">Sua galeria de referências salvas.</CardDescription>
                </div>
                <Link to="/referencias">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-500/10">
                    <span>Abrir Galeria</span>
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-0 flex-1">
                {referenciasRecentes.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 text-center p-4">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhuma referência visual salva ainda.</p>
                  </div>
                ) : (
                  <div className={gridRefsClass}>
                    {referenciasRecentes.slice(0, gadget.colunas === 3 ? 6 : 4).map((ref) => (
                      <Link
                        key={ref.caminho}
                        to={`/referencias?abrir=${encodeURIComponent(ref.caminho)}`}
                        className="group flex flex-col rounded-xl border border-border overflow-hidden bg-card hover:border-purple-500/50 transition-all shadow-xs hover:shadow"
                      >
                        <div className="h-28 w-full bg-accent/40 relative overflow-hidden flex items-center justify-center">
                          {ref.imagem ? (
                            <ImagemPrivada
                              caminho={ref.imagem}
                              alt={ref.titulo}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <ImageIcon size={24} className="text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="p-3 space-y-1">
                          <p className="text-xs font-semibold truncate group-hover:text-purple-500 transition-colors">
                            {ref.titulo}
                          </p>
                          {ref.tags.length > 0 && (
                            <span className="text-[10px] text-muted-foreground truncate block font-medium">
                              #{ref.tags[0]}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </GadgetWrapper>
        );
      }

      case "notas":
        return (
          <GadgetWrapper key={gadget.id} gadget={gadget} aoMudarColunas={alternarColunas}>
            <Card className="shadow-sm h-full flex flex-col border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText size={18} className="text-blue-500" />
                    Notas Recentes
                  </CardTitle>
                  <CardDescription className="text-xs">Seus últimos conhecimentos anotados.</CardDescription>
                </div>
                <Link to="/notas">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10">
                    <span>Todas</span>
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-0 flex-1">
                {notasRecentes.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 text-center p-3">
                    <p className="text-xs text-muted-foreground">Nenhuma nota recente.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5 sm:gap-4">
                    {notasRecentes.map((n) => (
                      <button
                        key={n.caminho}
                        onClick={() => abrirNotaHome(n.caminho)}
                        className="block group w-full text-left"
                      >
                        <div className="p-4 rounded-xl border border-border/80 bg-card hover:bg-accent/70 hover:border-blue-500/40 transition-all shadow-xs space-y-1">
                          <p className="text-xs font-semibold group-hover:text-blue-500 transition-colors truncate">
                            {n.titulo}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {n.nome}
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

      case "pdi":
        return (
          <GadgetWrapper key={gadget.id} gadget={gadget} aoMudarColunas={alternarColunas}>
            <Card className="shadow-sm h-full flex flex-col border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Target size={18} className="text-emerald-500" />
                    Metas da Carreira
                  </CardTitle>
                  <CardDescription className="text-xs">Plano de Desenvolvimento Individual.</CardDescription>
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
                              {r.meta.status === "em-andamento" ? "Em andamento" : r.meta.status === "concluida" ? "Concluída" : "A fazer"}
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

      default:
        return null;
    }
  };

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
            Seu centro de comando do Klaus. Arraste e dimensione os blocos como desejar.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={restaurarLayout}
          className="gap-2 self-start sm:self-auto text-xs text-muted-foreground hover:text-foreground bg-background shadow-xs"
          title="Restaurar o layout padrão dos gadgets"
        >
          <RotateCcw size={14} />
          <span>Restaurar Layout</span>
        </Button>
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
