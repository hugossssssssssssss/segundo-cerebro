import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Star,
  Zap,
  Wrench,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckSquare,
  Target,
  Image as ImageIcon,
  User,
  Sparkles,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, type ItemRepo } from "@/lib/repo";
import {
  buscar,
  agrupar,
  buscarFerramentas,
  filtrarPorCategoria,
  lerFavoritosBusca,
  alternarFavoritoBusca,
  ehFavoritoBusca,
  type CategoriaFiltroBusca,
  ROTULO_TIPO,
  ROTA_TIPO,
} from "@/lib/busca";
import { LISTA_FERRAMENTAS_APP, type FerramentaApp } from "@/lib/ferramentasApp";
import { Campo, Selo } from "@/components/ui";
import { cn, formatarCaminhoAmigavel, formatarTituloAmigavel } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { alternarTema } from "@/lib/tema";
import { tituloProvavel, lerMarkdown } from "@/lib/markdown";
import { useFerramentasFlutuantes } from "@/components/ContextoFerramentasFlutuantes";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

function obterIconeItem(caminho: string) {
  const p = (caminho || "").toLowerCase();
  if (p.startsWith("tarefas")) return <CheckSquare size={15} className="text-emerald-500 shrink-0" />;
  if (p.startsWith("pdi/metas") || p.startsWith("metas")) return <Target size={15} className="text-blue-500 shrink-0" />;
  if (p.startsWith("pdi/entregas") || p.startsWith("entregas")) return <Sparkles size={15} className="text-purple-500 shrink-0" />;
  if (p.startsWith("referencias")) return <ImageIcon size={15} className="text-pink-500 shrink-0" />;
  if (p.startsWith("contatos")) return <User size={15} className="text-cyan-500 shrink-0" />;
  return <FileText size={15} className="text-amber-500 shrink-0" />;
}

const OPCOES_FILTRO: Array<{ id: CategoriaFiltroBusca; rotulo: string }> = [
  { id: "tudo", rotulo: "Tudo" },
  { id: "acoes", rotulo: "Ações" },
  { id: "ferramentas", rotulo: "Ferramentas" },
  { id: "contatos", rotulo: "Contatos" },
  { id: "notas", rotulo: "Notas" },
  { id: "tarefas", rotulo: "Tarefas" },
  { id: "pdi", rotulo: "PDI" },
  { id: "referencias", rotulo: "Referências" },
  { id: "lousas", rotulo: "Lousas" },
];

/**
 * Busca global avançada do Klaus.
 * Suporta pesquisa em conteúdos, ferramentas/conversões do app,
 * filtros por categoria e favoritos fixados.
 */
export function Busca({
  aberta,
  aoFechar,
}: {
  aberta: boolean;
  aoFechar: () => void;
}) {
  const navegar = useNavigate();
  const { abrirFerramentaFlutuante } = useFerramentasFlutuantes();
  const [termo, setTermo] = useState("");
  const [categoria, setCategoria] = useState<CategoriaFiltroBusca>("tudo");
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [acervo, setAcervo] = useState<ItemRepo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [itemFocadoIndex, setItemFocadoIndex] = useState(0);
  const [mostrarTodosRecentes, setMostrarTodosRecentes] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  let workspace: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    workspace = useWorkspace();
  } catch {}

  const aoSelecionarFerramenta = (f: FerramentaApp) => {
    aoFechar();
    if (f.rota === "acao:alternar_tema") {
      alternarTema();
      return;
    }

    if (f.rota === "acao:iniciar_pomodoro") {
      navegar("/tarefas?pomodoro=true");
      toast("Redirecionando para o painel de Pomodoro em Tarefas.", { tipo: "info" });
      return;
    }

    if (f.categoria === "conversor" || f.categoria === "ferramenta") {
      abrirFerramentaFlutuante(f.id);
    } else {
      navegar(f.rota);
    }
  };

  const aoSelecionarItemRepo = (caminho: string, tipo?: string, titulo?: string) => {
    if (workspace?.workspaceAberto) {
      const itemRepo = acervo.find((i) => i.caminho === caminho);
      if (itemRepo) {
        const { dados, corpo } = lerMarkdown(itemRepo.texto || "");
        const tit = titulo || tituloProvavel(itemRepo.doc, itemRepo.nome);
        const rotulo = (tipo && ROTULO_TIPO[tipo as keyof typeof ROTULO_TIPO]) || "Nota";
        workspace.abrirNoWorkspace({
          id: caminho,
          caminho,
          sha: itemRepo.sha,
          rotuloTipo: rotulo,
          titulo: tit,
          corpo,
          dadosProps: dados,
        });
        aoFechar();
        return;
      }
    }

    const pasta = caminho.split("/")[0];
    let rota = `/notas?abrir=${encodeURIComponent(caminho)}`;
    if (pasta === "tarefas") rota = `/tarefas?abrir=${encodeURIComponent(caminho)}`;
    else if (pasta === "contatos") rota = `/contatos?abrir=${encodeURIComponent(caminho)}`;
    else if (pasta === "referencias") rota = `/referencias?abrir=${encodeURIComponent(caminho)}`;
    else if (pasta === "lousas") rota = `/lousas?abrir=${encodeURIComponent(caminho)}`;
    else if (pasta === "pdi" || pasta === "metas" || pasta === "entregas") rota = `/pdi?abrir=${encodeURIComponent(caminho)}`;
    else if (tipo && ROTA_TIPO[tipo as keyof typeof ROTA_TIPO]) rota = `${ROTA_TIPO[tipo as keyof typeof ROTA_TIPO]}?abrir=${encodeURIComponent(caminho)}`;

    navegar(rota);
    aoFechar();
  };

  useEffect(() => {
    if (!aberta) return;

    setTermo("");
    setErro("");
    setCategoria("tudo");
    setItemFocadoIndex(0);
    setMostrarTodosRecentes(false);
    setFavoritos(lerFavoritosBusca());
    entrada.current?.focus();

    const cfg = lerConfig();
    if (!configCompleta(cfg)) {
      setErro("Configure sua conta do GitHub em Ajustes para poder buscar nas notas.");
    }

    let cancelado = false;
    setCarregando(true);
    carregarRepo(cfg, { memoria: 3000 })
      .then((itens) => !cancelado && setAcervo(itens))
      .catch((e) => !cancelado && setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelado && setCarregando(false));

    return () => {
      cancelado = true;
    };
  }, [aberta]);

  // Itens e ferramentas favoritados para exibição inicial
  const itensFavoritados = useMemo(() => {
    if (favoritos.length === 0) return { ferramentas: [], repoItens: [] };

    const favSet = new Set(favoritos);
    const favFerramentas = LISTA_FERRAMENTAS_APP.filter((f) => favSet.has(f.id));
    const favRepoItens = acervo.filter((item) => favSet.has(item.caminho));

    return { ferramentas: favFerramentas, repoItens: favRepoItens };
  }, [favoritos, acervo]);

  // Lista de Documentos Recentes
  const documentosRecentes = useMemo(() => {
    if (!acervo || acervo.length === 0) return [];

    const lista = acervo.filter((i) => {
      if (categoria === "tudo") return true;
      if (categoria === "ferramentas" || categoria === "acoes") return false;
      const pasta = i.caminho.split("/")[0]?.toLowerCase() || "";
      if (categoria === "notas") return pasta === "notas";
      if (categoria === "tarefas") return pasta === "tarefas";
      if (categoria === "pdi") return pasta === "pdi" || pasta === "metas" || pasta === "entregas";
      if (categoria === "referencias") return pasta === "referencias";
      if (categoria === "lousas") return pasta === "lousas";
      if (categoria === "contatos") return pasta === "contatos";
      return true;
    });

    return [...lista].sort((a, b) => {
      const dataA = a.doc?.dados?.atualizado || a.doc?.dados?.data || a.nome.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
      const dataB = b.doc?.dados?.atualizado || b.doc?.dados?.data || b.nome.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
      if (dataA && dataB) return String(dataB).localeCompare(String(dataA));
      if (dataA) return -1;
      if (dataB) return 1;
      return a.caminho.localeCompare(b.caminho);
    });
  }, [acervo, categoria]);

  const recentesExibidos = useMemo(() => {
    if (mostrarTodosRecentes) return documentosRecentes;
    return documentosRecentes.slice(0, 8);
  }, [documentosRecentes, mostrarTodosRecentes]);

  // Ferramentas e Ações encontradas pela busca
  const ferramentasResultado = useMemo(
    () => buscarFerramentas(termo, categoria),
    [termo, categoria]
  );

  // Itens do repositório encontrados pela busca
  const resultadosBrutos = useMemo(
    () => (categoria === "ferramentas" ? [] : buscar(acervo, termo)),
    [acervo, termo, categoria]
  );

  const resultadosFiltrados = useMemo(
    () => filtrarPorCategoria(resultadosBrutos, categoria),
    [resultadosBrutos, categoria]
  );

  const grupos = useMemo(
    () => agrupar(resultadosFiltrados),
    [resultadosFiltrados]
  );

  const totalResultados = ferramentasResultado.length + resultadosFiltrados.length;

  const flatItens = useMemo(() => {
    if (termo.trim().length >= 2) {
      const items: Array<{ id: string; tipo: "ferramenta" | "item"; f?: FerramentaApp; r?: any }> = [];
      ferramentasResultado.forEach((f) => items.push({ id: f.id, tipo: "ferramenta", f }));
      grupos.forEach(([, lista]) => {
        lista.forEach((r) => items.push({ id: r.caminho, tipo: "item", r }));
      });
      return items;
    }
    const items: Array<{ id: string; tipo: "ferramenta" | "item"; f?: FerramentaApp; r?: any }> = [];
    itensFavoritados.ferramentas.forEach((f) => items.push({ id: f.id, tipo: "ferramenta", f }));
    itensFavoritados.repoItens.forEach((item) =>
      items.push({
        id: item.caminho,
        tipo: "item",
        r: { caminho: item.caminho, tipo: item.caminho.split("/")[0], titulo: tituloProvavel(item.doc, item.nome) },
      })
    );
    recentesExibidos.forEach((item) => {
      if (!items.some((i) => i.id === item.caminho)) {
        items.push({
          id: item.caminho,
          tipo: "item",
          r: { caminho: item.caminho, tipo: item.caminho.split("/")[0], titulo: tituloProvavel(item.doc, item.nome) },
        });
      }
    });
    LISTA_FERRAMENTAS_APP.slice(0, 6).forEach((f) => {
      if (!items.some((i) => i.id === f.id)) items.push({ id: f.id, tipo: "ferramenta", f });
    });
    return items;
  }, [termo, ferramentasResultado, grupos, itensFavoritados, recentesExibidos]);

  const toggleFavorito = (idOuCaminho: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const novos = alternarFavoritoBusca(idOuCaminho);
    setFavoritos(novos);
  };

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        aoFechar();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setItemFocadoIndex((prev) => (flatItens.length === 0 ? 0 : (prev + 1) % flatItens.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setItemFocadoIndex((prev) => (flatItens.length === 0 ? 0 : (prev - 1 + flatItens.length) % flatItens.length));
      } else if (e.key === "Enter") {
        if (flatItens.length > 0 && itemFocadoIndex >= 0 && itemFocadoIndex < flatItens.length) {
          e.preventDefault();
          const selecionado = flatItens[itemFocadoIndex];
          if (selecionado.tipo === "ferramenta" && selecionado.f) {
            aoSelecionarFerramenta(selecionado.f);
          } else if (selecionado.r) {
            const pasta = selecionado.r.caminho.split("/")[0];
            let rota = `/notas?abrir=${encodeURIComponent(selecionado.r.caminho)}`;
            if (pasta === "tarefas") rota = `/tarefas?abrir=${encodeURIComponent(selecionado.r.caminho)}`;
            if (pasta === "referencias") rota = `/referencias?abrir=${encodeURIComponent(selecionado.r.caminho)}`;
            if (pasta === "lousas") rota = `/lousas?abrir=${encodeURIComponent(selecionado.r.caminho)}`;
            if (selecionado.r.caminho.startsWith("pdi")) rota = `/pdi?abrir=${encodeURIComponent(selecionado.r.caminho)}`;
            navegar(rota);
            aoFechar();
          }
        }
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta, aoFechar, flatItens, itemFocadoIndex, navegar]);



  if (!aberta) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center bg-black/60 p-0 pt-0 sm:p-4 sm:pt-20 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={aoFechar}
    >
      <div
        className="flex max-h-[100dvh] w-full flex-col border-border bg-card shadow-2xl sm:max-h-[80dvh] sm:max-w-2xl sm:rounded-2xl sm:border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Campo de Entrada */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border p-3">
          <Search size={18} className="shrink-0 text-muted-foreground ml-1" />
          <Campo
            ref={entrada}
            value={termo}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermo(e.target.value)}
            placeholder="Buscar notas, tarefas, ferramentas (ex: 'PDF para PNG', 'transcrição')..."
            className="border-0 bg-transparent focus-visible:ring-0 text-base"
            autoFocus
          />
          {termo && (
            <button
              onClick={() => setTermo("")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={aoFechar}
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Fechar busca"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filtros por Categoria */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60 bg-card/50 overflow-x-auto no-scrollbar shrink-0">
          {OPCOES_FILTRO.map((f) => (
            <button
              key={f.id}
              onClick={() => setCategoria(f.id)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 select-none",
                categoria === f.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-secondary/60 text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {f.rotulo}
            </button>
          ))}
        </div>

        {/* Lista de Resultados / Estado Inicial */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {erro ? (
            <p className="p-6 text-sm text-destructive">{erro}</p>
          ) : carregando && acervo.length === 0 && termo.trim().length >= 2 ? (
            <p className="p-6 text-sm text-muted-foreground flex items-center gap-2">
              <span className="animate-pulse">Carregando acervo...</span>
            </p>
          ) : termo.trim().length < 2 ? (
            /* ESTADO INICIAL (Sem pesquisa ativa) */
            <div className="p-4 space-y-6">
              {/* Seção de Favoritos */}
              {(itensFavoritados.ferramentas.length > 0 || itensFavoritados.repoItens.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 uppercase tracking-wider px-1">
                    <Star size={14} className="fill-amber-500" />
                    <span>Favoritos Fixados</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Ferramentas Favoritadas */}
                    {itensFavoritados.ferramentas.map((f) => {
                      const IconeComp = f.icone;
                      return (
                        <div
                          key={f.id}
                          onClick={() => aoSelecionarFerramenta(f)}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                              <IconeComp size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-foreground truncate">{f.titulo}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{f.descricao}</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => toggleFavorito(f.id, e)}
                            className="p-1 rounded-md text-amber-500 hover:bg-amber-500/20"
                            title="Remover dos Favoritos"
                          >
                            <Star size={15} className="fill-amber-500" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Itens do Repo Favoritados */}
                    {itensFavoritados.repoItens.map((item) => {
                      const titulo = formatarTituloAmigavel(tituloProvavel(item.doc, item.nome), item.nome);
                      const caminhoFormatado = formatarCaminhoAmigavel(item.caminho);
                      return (
                        <div
                          key={item.caminho}
                          onClick={() => aoSelecionarItemRepo(item.caminho, undefined, titulo)}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                              {obterIconeItem(item.caminho)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-foreground truncate">{titulo}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{caminhoFormatado}</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => toggleFavorito(item.caminho, e)}
                            className="p-1 rounded-md text-amber-500 hover:bg-amber-500/20 shrink-0 ml-1"
                            title="Remover dos Favoritos"
                          >
                            <Star size={15} className="fill-amber-500" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seção de Documentos Recentes */}
              {documentosRecentes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <Clock size={14} className="text-primary" />
                      <span>Documentos Recentes ({documentosRecentes.length})</span>
                    </div>
                    {documentosRecentes.length > 8 && (
                      <button
                        onClick={() => setMostrarTodosRecentes((prev) => !prev)}
                        className="text-xs text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
                      >
                        {mostrarTodosRecentes ? (
                          <>
                            <span>Mostrar menos</span>
                            <ChevronUp size={13} />
                          </>
                        ) : (
                          <>
                            <span>Mostrar todos ({documentosRecentes.length})</span>
                            <ChevronDown size={13} />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recentesExibidos.map((item) => {
                      const titulo = formatarTituloAmigavel(tituloProvavel(item.doc, item.nome), item.nome);
                      const pasta = item.caminho.split("/")[0] || "";
                      const caminhoFormatado = formatarCaminhoAmigavel(item.caminho);
                      const ehFav = ehFavoritoBusca(item.caminho, favoritos);
                      return (
                        <div
                          key={item.caminho}
                          onClick={() => aoSelecionarItemRepo(item.caminho, pasta, titulo)}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-card hover:bg-accent/60 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/60 shrink-0">
                              {obterIconeItem(item.caminho)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-foreground truncate">{titulo}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{caminhoFormatado}</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => toggleFavorito(item.caminho, e)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-accent opacity-60 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                            title={ehFav ? "Remover dos Favoritos" : "Favoritar"}
                          >
                            <Star size={14} className={cn(ehFav && "fill-amber-500 text-amber-500")} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {!mostrarTodosRecentes && documentosRecentes.length > 8 && (
                    <div className="pt-1 flex justify-center">
                      <button
                        onClick={() => setMostrarTodosRecentes(true)}
                        className="w-full py-2 px-3 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-border/60 cursor-pointer"
                      >
                        <span>Mostrar mais ({documentosRecentes.length - 8} documentos)</span>
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Seção de Atalhos Rápidos */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                  <Zap size={14} className="text-primary" />
                  <span>Ferramentas & Conversões Rápidas</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LISTA_FERRAMENTAS_APP.slice(0, 6).map((f) => {
                    const IconeComp = f.icone;
                    const ehFav = ehFavoritoBusca(f.id, favoritos);
                    return (
                      <div
                        key={f.id}
                        onClick={() => aoSelecionarFerramenta(f)}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-card hover:bg-accent/60 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                            <IconeComp size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate">{f.titulo}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{f.descricao}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => toggleFavorito(f.id, e)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-accent opacity-60 group-hover:opacity-100 transition-opacity"
                          title={ehFav ? "Remover dos Favoritos" : "Favoritar Ferramenta"}
                        >
                          <Star size={15} className={cn(ehFav && "fill-amber-500 text-amber-500")} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : totalResultados === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nada encontrado para “{termo}”.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {/* FERRAMENTAS ENCONTRADAS */}
              {ferramentasResultado.length > 0 && (
                <div>
                  <p className="sticky top-0 bg-secondary/90 px-4 py-1.5 text-xs font-bold text-primary backdrop-blur flex items-center gap-1.5 uppercase tracking-wider">
                    <Wrench size={13} />
                    <span>Ferramentas & Conversões · {ferramentasResultado.length}</span>
                  </p>
                  {ferramentasResultado.map((f) => {
                    const IconeComp = f.icone;
                    const ehFav = ehFavoritoBusca(f.id, favoritos);
                    return (
                      <div
                        key={f.id}
                        onClick={() => aoSelecionarFerramenta(f)}
                        className="flex items-center justify-between border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent cursor-pointer group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                            <IconeComp size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-foreground">{f.titulo}</p>
                              <Selo>Ferramenta</Selo>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {f.descricao}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => toggleFavorito(f.id, e)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-accent shrink-0 ml-2"
                          title={ehFav ? "Remover dos Favoritos" : "Favoritar"}
                        >
                          <Star size={16} className={cn(ehFav && "fill-amber-500 text-amber-500")} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CONTEÚDOS DE NOTAS ENCONTRADOS */}
              {grupos.map(([tipo, lista]) => (
                <div key={tipo}>
                  <p className="sticky top-0 bg-secondary/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
                    {ROTULO_TIPO[tipo]} · {lista.length}
                  </p>
                  {lista.map((r) => {
                    const ehFav = ehFavoritoBusca(r.caminho, favoritos);
                    const titulo = formatarTituloAmigavel(r.titulo, r.caminho);
                    const caminhoFormatado = formatarCaminhoAmigavel(r.caminho);
                    return (
                      <div
                        key={r.caminho}
                        onClick={() => aoSelecionarItemRepo(r.caminho, r.tipo, titulo)}
                        className="flex items-start justify-between border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent cursor-pointer group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-foreground truncate">{titulo}</p>
                            <Selo>{caminhoFormatado}</Selo>
                          </div>
                          {r.trecho && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                              {r.trecho}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => toggleFavorito(r.caminho, e)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-accent shrink-0"
                          title={ehFav ? "Remover dos Favoritos" : "Favoritar"}
                        >
                          <Star size={16} className={cn(ehFav && "fill-amber-500 text-amber-500")} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
