import { useCallback, useEffect, useState } from "react";
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
import { carregarRepo, daPasta } from "@/lib/repo";
import { comoTarefa, ordenar, textoPrazo, urgencia, type Tarefa } from "@/lib/tarefas";
import { tituloProvavel } from "@/lib/markdown";
import { comoReferencia, type Referencia } from "@/lib/referencias";
import { comoMeta, comoEntrega, resumir, type ResumoMeta } from "@/lib/pdi";
import { ImagemPrivada } from "@/components/ImagemPrivada";

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
      className={cn("relative group transition-all h-full flex flex-col", classeGrid, isDragging && "z-50")}
    >
      {/* Controles do Gadget: Redimensionar e Drag Handle */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur rounded-xl p-1.5 border border-border shadow-sm">
        <button
          onClick={() => aoMudarColunas(gadget.id, proximaColuna)}
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

  const carregar = useCallback(async () => {
    if (!pronto) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
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
      setCarregando(false);
    }
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!pronto) {
    return (
      <Vazio
        titulo="Bem-vindo ao Segundo Cérebro"
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
                        <Link key={t.caminho} to={`/tarefas?abrir=${encodeURIComponent(t.caminho)}`} className="block group">
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
                        </Link>
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
                      <Link key={n.caminho} to={`/notas?abrir=${encodeURIComponent(n.caminho)}`} className="block group">
                        <div className="p-4 rounded-xl border border-border/80 bg-card hover:bg-accent/70 hover:border-blue-500/40 transition-all shadow-xs space-y-1">
                          <p className="text-xs font-semibold group-hover:text-blue-500 transition-colors truncate">
                            {n.titulo}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {n.nome}
                          </p>
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
                      <Link key={r.meta.caminho} to={`/pdi`} className="block group">
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
                      </Link>
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
            Seu centro de comando do Segundo Cérebro. Arraste e dimensione os blocos como desejar.
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
    </div>
  );
}
