import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Newspaper,
  Sparkles,
  Heart,
  ExternalLink,
  Search,
  RefreshCw,
  SlidersHorizontal,
  LayoutList,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Check,
  RotateCcw,
  FileText,
  Bookmark,
  CheckSquare,
  BookOpen,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { conversar } from "@/lib/gemini";
import {
  CATEGORIAS_NOTICIAS,
  buscarNoticiasPorCategoria,
  salvarNoticiaComoReferencia,
  criarNotaDaNoticia,
  criarTarefaDaNoticia,
  alternarCurtidaNoticia,
  obterModoExibicao,
  salvarModoExibicao,
  obterCategoriasAtivas,
  salvarCategoriasAtivas,
  obterImagemIlustrativa,
  type CategoriaNoticia,
  type ModoExibicao,
  type ItemNoticia,
} from "@/lib/noticias";
import { Aviso, Carregando, Modal, Botao } from "@/components/ui";
import { Button } from "@/components/ui/button";

export default function Noticias() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  // Estados de Formato e Assuntos
  const [modo, setModo] = useState<ModoExibicao>(obterModoExibicao);
  const [categoriasAtivas, setCategoriasAtivas] = useState<CategoriaNoticia[]>(obterCategoriasAtivas);
  const [categoria, setCategoria] = useState<CategoriaNoticia>(() => {
    const ativas = obterCategoriasAtivas();
    return ativas[0] || "futebol";
  });

  const [noticias, setNoticias] = useState<ItemNoticia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [acaoId, setAcaoId] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Leitor Integrado (Modal de Leitura da Notícia)
  const [noticiaParaLer, setNoticiaParaLer] = useState<ItemNoticia | null>(null);

  // Modais de Ajuste e IA
  const [modalAssuntosAberta, setModalAssuntosAberta] = useState(false);
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [resumoIa, setResumoIa] = useState("");

  const carrosselRef = useRef<HTMLDivElement>(null);

  // Carregar matérias da categoria selecionada
  const carregar = async (cat: CategoriaNoticia) => {
    setCarregando(true);
    try {
      const lista = await buscarNoticiasPorCategoria(cat);
      setNoticias(lista);
    } catch (err) {
      console.error("Erro ao carregar notícias:", err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar(categoria);
  }, [categoria]);

  // Alterar modo de exibição (feed, carrossel, posts)
  const handleTrocarModo = (novoModo: ModoExibicao) => {
    setModo(novoModo);
    salvarModoExibicao(novoModo);
  };

  // Alternar categorias ativas no modal de preferências
  const handleToggleCategoriaAtiva = (catId: CategoriaNoticia) => {
    let novaLista: CategoriaNoticia[];
    if (categoriasAtivas.includes(catId)) {
      if (categoriasAtivas.length === 1) return;
      novaLista = categoriasAtivas.filter((c) => c !== catId);
    } else {
      novaLista = [...categoriasAtivas, catId];
    }
    setCategoriasAtivas(novaLista);
    salvarCategoriasAtivas(novaLista);

    if (!novaLista.includes(categoria)) {
      setCategoria(novaLista[0]);
    }
  };

  const handleRestaurarCategorias = () => {
    const padrao = CATEGORIAS_NOTICIAS.map((c) => c.id);
    setCategoriasAtivas(padrao);
    salvarCategoriasAtivas(padrao);
    setCategoria("futebol");
  };

  // Busca em tempo real
  const noticiasFiltradas = useMemo(() => {
    if (!busca.trim()) return noticias;
    const termo = busca.toLowerCase();
    return noticias.filter(
      (n) =>
        n.titulo.toLowerCase().includes(termo) ||
        (n.descricao && n.descricao.toLowerCase().includes(termo)) ||
        n.fonte.toLowerCase().includes(termo)
    );
  }, [noticias, busca]);

  // Curtir Notícia
  const handleCurtir = (noticia: ItemNoticia) => {
    const agoraCurtido = alternarCurtidaNoticia(noticia.id);
    setNoticias((prev) =>
      prev.map((n) => (n.id === noticia.id ? { ...n, curtido: agoraCurtido } : n))
    );
    if (noticiaParaLer && noticiaParaLer.id === noticia.id) {
      setNoticiaParaLer((prev) => (prev ? { ...prev, curtido: agoraCurtido } : null));
    }
  };

  // Ação 1: Criar Nota em notas/
  const handleCriarNota = async (noticia: ItemNoticia) => {
    if (!pronto) return;
    setAcaoId(noticia.id);
    try {
      const arq = await criarNotaDaNoticia(noticia, cfg);
      setMensagemSucesso(`Nova Nota gerada em: ${arq}`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err) {
      console.error("Erro ao criar nota:", err);
    } finally {
      setAcaoId(null);
    }
  };

  // Ação 2: Salvar Referência em referencias/
  const handleSalvarReferencia = async (noticia: ItemNoticia) => {
    if (!pronto) return;
    setAcaoId(noticia.id);
    try {
      const arq = await salvarNoticiaComoReferencia(noticia, cfg);
      setMensagemSucesso(`Salvo em Referências: ${arq}`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err) {
      console.error("Erro ao salvar referência:", err);
    } finally {
      setAcaoId(null);
    }
  };

  // Ação 3: Criar Tarefa em tarefas/
  const handleCriarTarefa = async (noticia: ItemNoticia) => {
    if (!pronto) return;
    setAcaoId(noticia.id);
    try {
      const arq = await criarTarefaDaNoticia(noticia, cfg);
      setMensagemSucesso(`Nova Tarefa criada: ${arq}`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err) {
      console.error("Erro ao criar tarefa:", err);
    } finally {
      setAcaoId(null);
    }
  };

  // Gerar resumo com Gemini IA
  const handleGerarResumoIa = async (noticia: ItemNoticia) => {
    setResumoIa("");
    setGerandoResumo(true);
    try {
      if (!cfg.geminiKey) {
        setResumoIa("Configure a chave do Gemini em Ajustes para gerar resumos.");
        return;
      }
      const resposta = await conversar(cfg, [
        {
          papel: "user",
          texto: `Resuma a seguinte notícia em 3 pontos curtos e objetivos:\n\nTítulo: ${noticia.titulo}\nFonte: ${noticia.fonte}\nTexto: ${noticia.conteudoCompleto || noticia.descricao || noticia.titulo}`,
        },
      ]);
      const resTexto = resposta.texto || "Não foi possível resumir a matéria.";
      setResumoIa(resTexto);
      setNoticias((prev) =>
        prev.map((n) => (n.id === noticia.id ? { ...n, resumoIa: resTexto } : n))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao conversar com a IA.";
      setResumoIa(`Falha ao gerar resumo: ${msg}`);
    } finally {
      setGerandoResumo(false);
    }
  };

  const scrollCarrossel = (dir: "esq" | "dir") => {
    if (!carrosselRef.current) return;
    const desc = carrosselRef.current.clientWidth * 0.85;
    carrosselRef.current.scrollBy({ left: dir === "dir" ? desc : -desc, behavior: "smooth" });
  };

  const categoriasExibidas = useMemo(
    () => CATEGORIAS_NOTICIAS.filter((c) => categoriasAtivas.includes(c.id)),
    [categoriasAtivas]
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Topo / Cabeçalho Principal */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Newspaper className="text-primary" size={28} />
            Notícias & Radar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Leia notícias dentro do app e conecte matérias com suas Notas, Referências e Tarefas.
          </p>
        </div>

        {/* Barra de Controles de Exibição e Personalização */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Modo */}
          <div className="flex items-center rounded-xl border border-border bg-card p-1 shadow-xs">
            <button
              onClick={() => handleTrocarModo("feed")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                modo === "feed" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Modo Feed"
            >
              <LayoutList size={14} />
              <span className="hidden sm:inline">Feed</span>
            </button>

            <button
              onClick={() => handleTrocarModo("carrossel")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                modo === "carrossel" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Modo Carrossel"
            >
              <ChevronRight size={14} />
              <span className="hidden sm:inline">Carrossel</span>
            </button>

            <button
              onClick={() => handleTrocarModo("posts")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                modo === "posts" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Modo Posts Grid"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Posts</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalAssuntosAberta(true)}
            className="gap-1.5 text-xs rounded-xl"
          >
            <SlidersHorizontal size={14} />
            <span>Assuntos</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => carregar(categoria)}
            disabled={carregando}
            className="rounded-xl p-2 text-muted-foreground"
            title="Atualizar Notícias"
          >
            <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {!pronto && (
        <Aviso>
          Para integrar notícias com suas Notas, Referências e Tarefas, configure seu token do GitHub nos <Link to="/config" className="underline font-semibold">Ajustes</Link>.
        </Aviso>
      )}

      {/* Banner de Confirmação Toast */}
      {mensagemSucesso && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-in fade-in">
          <CheckCircle2 size={18} className="shrink-0" />
          <span className="truncate">{mensagemSucesso}</span>
        </div>
      )}

      {/* Abas dos Assuntos & Busca */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {categoriasExibidas.map((cat) => {
            const ativa = categoria === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoria(cat.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  ativa
                    ? "bg-primary text-primary-foreground shadow-xs scale-105"
                    : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <span>{cat.icone}</span>
                <span>{cat.rotulo}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64 shrink-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nas notícias..."
            className="w-full rounded-full border border-border bg-card pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Grid / Carrossel / Feed de Notícias */}
      {carregando ? (
        <div className="py-20 text-center">
          <Carregando />
          <p className="text-xs text-muted-foreground mt-3">Carregando matérias de {CATEGORIAS_NOTICIAS.find(c => c.id === categoria)?.rotulo}...</p>
        </div>
      ) : noticiasFiltradas.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl p-8 space-y-2">
          <Newspaper className="mx-auto text-muted-foreground/40" size={40} />
          <h3 className="text-base font-semibold">Nenhuma notícia encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {busca ? "Tente alterar o termo da busca." : "Clique em 'Atualizar' para verificar matérias novas."}
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* MODO CARROSSEL (🎠)                                                       */}
          {/* ========================================================================= */}
          {modo === "carrossel" && (
            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Destaques: {CATEGORIAS_NOTICIAS.find((c) => c.id === categoria)?.rotulo}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => scrollCarrossel("esq")}
                    className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-accent"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => scrollCarrossel("dir")}
                    className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-accent"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div
                ref={carrosselRef}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 pt-1 no-scrollbar scroll-smooth"
              >
                {noticiasFiltradas.map((item) => (
                  <div
                    key={item.id}
                    className="snap-start shrink-0 w-[88%] sm:w-[380px] rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group"
                  >
                    <div
                      onClick={() => setNoticiaParaLer(item)}
                      className="relative h-52 w-full bg-muted overflow-hidden cursor-pointer"
                    >
                      <img
                        src={item.imagemUrl}
                        alt={item.titulo}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = obterImagemIlustrativa(item.categoria);
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      <div className="absolute top-2 left-2 rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                        {item.fonte}
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white space-y-1">
                        <span className="text-[10px] font-medium text-white/80">
                          {new Date(item.data).toLocaleDateString("pt-BR")}
                        </span>
                        <h2 className="font-bold text-sm leading-snug line-clamp-2 drop-shadow-xs">
                          {item.titulo}
                        </h2>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-3">
                      {item.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.descricao}
                        </p>
                      )}

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1">
                        <button
                          onClick={() => setNoticiaParaLer(item)}
                          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <BookOpen size={14} />
                          <span>Ler no App</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCurtir(item)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              item.curtido ? "bg-rose-500/15 border-rose-500/30 text-rose-500" : "border-border text-muted-foreground hover:bg-accent"
                            }`}
                            title="Curtir"
                          >
                            <Heart size={14} className={item.curtido ? "fill-rose-500" : ""} />
                          </button>

                          <button
                            onClick={() => handleCriarNota(item)}
                            disabled={acaoId === item.id}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            title="Criar Nota"
                          >
                            <FileText size={14} />
                          </button>

                          <button
                            onClick={() => handleCriarTarefa(item)}
                            disabled={acaoId === item.id}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            title="Criar Tarefa"
                          >
                            <CheckSquare size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODO FEED (📰)                                                            */}
          {/* ========================================================================= */}
          {modo === "feed" && (
            <div className="space-y-3">
              {noticiasFiltradas.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div
                    onClick={() => setNoticiaParaLer(item)}
                    className="relative h-40 sm:h-32 sm:w-44 shrink-0 rounded-xl bg-muted overflow-hidden cursor-pointer"
                  >
                    <img
                      src={item.imagemUrl}
                      alt={item.titulo}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = obterImagemIlustrativa(item.categoria);
                      }}
                    />
                    <div className="absolute top-2 left-2 rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                      {item.fonte}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-2 min-w-0">
                    <div className="space-y-1 cursor-pointer" onClick={() => setNoticiaParaLer(item)}>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {new Date(item.data).toLocaleDateString("pt-BR")}
                      </div>
                      <h2 className="font-bold text-base leading-snug text-foreground group-hover:text-primary transition-colors">
                        {item.titulo}
                      </h2>
                      {item.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.descricao}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40">
                      <button
                        onClick={() => setNoticiaParaLer(item)}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <BookOpen size={14} />
                        <span>Ler matéria no Klaus</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCurtir(item)}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                            item.curtido ? "bg-rose-500/15 text-rose-600 border border-rose-500/30" : "border border-border text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          <Heart size={14} className={item.curtido ? "fill-rose-500 text-rose-500" : ""} />
                          <span>{item.curtido ? "Salvo" : "Curtir"}</span>
                        </button>

                        <button
                          onClick={() => handleCriarNota(item)}
                          disabled={acaoId === item.id}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Criar Nota"
                        >
                          <FileText size={14} />
                          <span className="hidden sm:inline">Criar Nota</span>
                        </button>

                        <button
                          onClick={() => handleSalvarReferencia(item)}
                          disabled={acaoId === item.id}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Salvar em Referências"
                        >
                          <Bookmark size={14} />
                          <span className="hidden sm:inline">Referência</span>
                        </button>

                        <button
                          onClick={() => handleCriarTarefa(item)}
                          disabled={acaoId === item.id}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Criar Tarefa"
                        >
                          <CheckSquare size={14} />
                          <span className="hidden sm:inline">Tarefa</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODO POSTS / GRID VISUAL (🎴)                                             */}
          {/* ========================================================================= */}
          {modo === "posts" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {noticiasFiltradas.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div
                    onClick={() => setNoticiaParaLer(item)}
                    className="relative h-44 w-full bg-muted overflow-hidden cursor-pointer"
                  >
                    <img
                      src={item.imagemUrl}
                      alt={item.titulo}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = obterImagemIlustrativa(item.categoria);
                      }}
                    />
                    <div className="absolute top-2 left-2 rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                      {item.fonte}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5 cursor-pointer" onClick={() => setNoticiaParaLer(item)}>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {new Date(item.data).toLocaleDateString("pt-BR")}
                      </div>
                      <h2 className="font-semibold text-sm leading-snug tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {item.titulo}
                      </h2>
                      {item.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {item.descricao}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1">
                      <button
                        onClick={() => setNoticiaParaLer(item)}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <BookOpen size={14} />
                        <span>Ler</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCurtir(item)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            item.curtido ? "bg-rose-500/15 border-rose-500/30 text-rose-500" : "border-border text-muted-foreground hover:bg-accent"
                          }`}
                          title="Curtir"
                        >
                          <Heart size={14} className={item.curtido ? "fill-rose-500" : ""} />
                        </button>

                        <button
                          onClick={() => handleCriarNota(item)}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Criar Nota"
                        >
                          <FileText size={14} />
                        </button>

                        <button
                          onClick={() => handleCriarTarefa(item)}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Criar Tarefa"
                        >
                          <CheckSquare size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* LEITOR DE NOTÍCIA INTEGRADO (IN-APP READER MODAL)                        */}
      {/* ========================================================================= */}
      <Modal
        aberto={Boolean(noticiaParaLer)}
        aoFechar={() => {
          setNoticiaParaLer(null);
          setResumoIa("");
        }}
        titulo="📖 Leitura no Klaus"
      >
        {noticiaParaLer && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="relative h-56 w-full rounded-xl overflow-hidden bg-muted">
              <img
                src={noticiaParaLer.imagemUrl}
                alt={noticiaParaLer.titulo}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = obterImagemIlustrativa(noticiaParaLer.categoria);
                }}
              />
              <div className="absolute top-3 left-3 rounded-md bg-black/75 backdrop-blur-xs px-2.5 py-1 text-xs font-semibold text-white">
                {noticiaParaLer.fonte}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="uppercase font-bold tracking-wider text-primary">{noticiaParaLer.categoria}</span>
                <span>{new Date(noticiaParaLer.data).toLocaleDateString("pt-BR")}</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground leading-snug">
                {noticiaParaLer.titulo}
              </h2>
            </div>

            {/* Ações Diretas com o Segundo Cérebro */}
            <div className="p-3 rounded-xl bg-card border border-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleCriarNota(noticiaParaLer)}
                  disabled={Boolean(acaoId)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <FileText size={14} />
                  <span>Criar Nota</span>
                </button>

                <button
                  onClick={() => handleSalvarReferencia(noticiaParaLer)}
                  disabled={Boolean(acaoId)}
                  className="flex items-center gap-1.5 rounded-lg bg-accent border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/80 transition-colors"
                >
                  <Bookmark size={14} />
                  <span>Salvar Referência</span>
                </button>

                <button
                  onClick={() => handleCriarTarefa(noticiaParaLer)}
                  disabled={Boolean(acaoId)}
                  className="flex items-center gap-1.5 rounded-lg bg-accent border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/80 transition-colors"
                >
                  <CheckSquare size={14} />
                  <span>Criar Tarefa</span>
                </button>
              </div>

              <button
                onClick={() => handleCurtir(noticiaParaLer)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  noticiaParaLer.curtido ? "bg-rose-500/15 text-rose-600 border border-rose-500/30" : "border border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <Heart size={14} className={noticiaParaLer.curtido ? "fill-rose-500 text-rose-500" : ""} />
                <span>{noticiaParaLer.curtido ? "Curtido" : "Curtir"}</span>
              </button>
            </div>

            {/* Resumo da IA no Leitor */}
            {resumoIa ? (
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1 font-semibold text-primary">
                  <Sparkles size={14} />
                  <span>Resumo da IA Gemini:</span>
                </div>
                <div className="whitespace-pre-line leading-relaxed text-muted-foreground">
                  {resumoIa}
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleGerarResumoIa(noticiaParaLer)}
                disabled={gerandoResumo}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
              >
                <Sparkles size={15} />
                <span>{gerandoResumo ? "Sintetizando com IA..." : "Gerar Resumo Inteligente com Gemini"}</span>
              </button>
            )}

            {/* Texto Completo / Conteúdo */}
            <div className="p-4 rounded-xl bg-accent/30 border border-border text-sm text-foreground leading-relaxed whitespace-pre-line space-y-3">
              <p>{noticiaParaLer.conteudoCompleto || noticiaParaLer.descricao}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <a
                href={noticiaParaLer.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>Abrir portal original ({noticiaParaLer.fonte})</span>
                <ExternalLink size={13} />
              </a>

              <Botao onClick={() => setNoticiaParaLer(null)}>
                Fechar Leitor
              </Botao>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL DE PERSONALIZAÇÃO DOS ASSUNTOS */}
      <Modal
        aberto={modalAssuntosAberta}
        aoFechar={() => setModalAssuntosAberta(false)}
        titulo="⚙️ Personalizar Assuntos do Feed"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Marque os tópicos que deseja visualizar no seu feed pessoal.
          </p>

          <div className="space-y-2">
            {CATEGORIAS_NOTICIAS.map((cat) => {
              const ativa = categoriasAtivas.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => handleToggleCategoriaAtiva(cat.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    ativa ? "bg-primary/5 border-primary/40 text-foreground" : "bg-card border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{cat.icone}</span>
                    <div>
                      <h4 className="font-semibold text-xs text-foreground">{cat.rotulo}</h4>
                      <p className="text-[11px] text-muted-foreground">{cat.descricao}</p>
                    </div>
                  </div>

                  <div
                    className={`h-5 w-5 rounded-md flex items-center justify-center border transition-colors ${
                      ativa ? "bg-primary border-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {ativa && <Check size={13} />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              onClick={handleRestaurarCategorias}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw size={13} />
              <span>Restaurar padrão</span>
            </button>

            <Botao onClick={() => setModalAssuntosAberta(false)}>
              Salvar Ajustes
            </Botao>
          </div>
        </div>
      </Modal>
    </div>
  );
}
