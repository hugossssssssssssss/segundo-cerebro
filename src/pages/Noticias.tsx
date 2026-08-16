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
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { conversar } from "@/lib/gemini";
import {
  CATEGORIAS_NOTICIAS,
  buscarNoticiasPorCategoria,
  salvarNoticiaComoReferencia,
  alternarCurtidaNoticia,
  obterModoExibicao,
  salvarModoExibicao,
  obterCategoriasAtivas,
  salvarCategoriasAtivas,
  type CategoriaNoticia,
  type ModoExibicao,
  type ItemNoticia,
} from "@/lib/noticias";
import { Aviso, Carregando, Modal, Botao } from "@/components/ui";
import { Button } from "@/components/ui/button";

export default function Noticias() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  // Estados de Configuração e UI
  const [modo, setModo] = useState<ModoExibicao>(obterModoExibicao);
  const [categoriasAtivas, setCategoriasAtivas] = useState<CategoriaNoticia[]>(obterCategoriasAtivas);
  const [categoria, setCategoria] = useState<CategoriaNoticia>(() => {
    const ativas = obterCategoriasAtivas();
    return ativas[0] || "futebol";
  });

  const [noticias, setNoticias] = useState<ItemNoticia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Modais
  const [modalAssuntosAberta, setModalAssuntosAberta] = useState(false);
  const [noticiaParaResumir, setNoticiaParaResumir] = useState<ItemNoticia | null>(null);
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [resumoIaModal, setResumoIaModal] = useState("");

  const carrosselRef = useRef<HTMLDivElement>(null);

  // Carregar notícias da categoria selecionada
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

  // Alternar categoria ativa no modal de preferências
  const handleToggleCategoriaAtiva = (catId: CategoriaNoticia) => {
    let novaLista: CategoriaNoticia[];
    if (categoriasAtivas.includes(catId)) {
      if (categoriasAtivas.length === 1) return; // Mantém pelo menos uma ativa
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

  // Filtragem ao vivo por palavra-chave
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

  // Curtir e Salvar notícia em Markdown no repositório
  const handleCurtirESalvar = async (noticia: ItemNoticia) => {
    const agoraCurtido = alternarCurtidaNoticia(noticia.id);
    setNoticias((prev) =>
      prev.map((n) => (n.id === noticia.id ? { ...n, curtido: agoraCurtido } : n))
    );

    if (agoraCurtido && pronto) {
      setSalvandoId(noticia.id);
      try {
        const arq = await salvarNoticiaComoReferencia(noticia, cfg);
        setMensagemSucesso(`Notícia salva em Markdown: ${arq}`);
        setTimeout(() => setMensagemSucesso(null), 4000);
      } catch (err) {
        console.error("Erro ao salvar notícia:", err);
      } finally {
        setSalvandoId(null);
      }
    }
  };

  // Resumo inteligente com a IA Gemini
  const handleGerarResumoIa = async (noticia: ItemNoticia) => {
    setNoticiaParaResumir(noticia);
    setResumoIaModal("");
    setGerandoResumo(true);

    try {
      if (!cfg.geminiKey) {
        setResumoIaModal("Falta configurar a chave do Gemini na tela de Ajustes.");
        return;
      }
      const resposta = await conversar(cfg, [
        {
          papel: "user",
          texto: `Resuma a seguinte matéria em 3 pontos curtos e objetivos em português:\n\nTítulo: ${noticia.titulo}\nFonte: ${noticia.fonte}\nTexto: ${noticia.descricao || noticia.titulo}`,
        },
      ]);
      const resTexto = resposta.texto || "Não foi possível sintetizar a matéria.";
      setResumoIaModal(resTexto);

      setNoticias((prev) =>
        prev.map((n) => (n.id === noticia.id ? { ...n, resumoIa: resTexto } : n))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao conversar com a IA.";
      setResumoIaModal(`Falha ao gerar resumo: ${msg}`);
    } finally {
      setGerandoResumo(false);
    }
  };

  // Scroll do Carrossel
  const scrollCarrossel = (direcao: "esq" | "dir") => {
    if (!carrosselRef.current) return;
    const deslocamento = carrosselRef.current.clientWidth * 0.8;
    carrosselRef.current.scrollBy({
      left: direcao === "dir" ? deslocamento : -deslocamento,
      behavior: "smooth",
    });
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
            Notícias & Radar Pessoal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Personalize seus assuntos, veja em feed, carrossel ou cards e salve no seu cérebro.
          </p>
        </div>

        {/* Controles de Formato de Exibição e Personalização */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Formato */}
          <div className="flex items-center rounded-xl border border-border bg-card p-1 shadow-xs">
            <button
              onClick={() => handleTrocarModo("feed")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                modo === "feed"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Modo Feed / Lista"
            >
              <LayoutList size={14} />
              <span className="hidden sm:inline">Feed</span>
            </button>

            <button
              onClick={() => handleTrocarModo("carrossel")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                modo === "carrossel"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Modo Carrossel Destaques"
            >
              <ChevronRight size={14} />
              <span className="hidden sm:inline">Carrossel</span>
            </button>

            <button
              onClick={() => handleTrocarModo("posts")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                modo === "posts"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Modo Posts / Grid Visual"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Posts</span>
            </button>
          </div>

          {/* Botão Personalizar Assuntos */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalAssuntosAberta(true)}
            className="gap-1.5 text-xs rounded-xl"
          >
            <SlidersHorizontal size={14} />
            <span>Assuntos</span>
          </Button>

          {/* Atualizar Feeds */}
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

      {/* Alerta de Configuração pendente */}
      {!pronto && (
        <Aviso>
          Para salvar notícias no seu repositório em Markdown e gerar resumos com a IA, configure seu token do GitHub e a chave do Gemini na tela de <Link to="/config" className="underline font-semibold">Ajustes</Link>.
        </Aviso>
      )}

      {/* Banner Toast de Notícia Salva */}
      {mensagemSucesso && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-in fade-in">
          <CheckCircle2 size={18} className="shrink-0" />
          <span className="truncate">{mensagemSucesso}</span>
        </div>
      )}

      {/* Barra de Abas dos Assuntos Ativos & Busca */}
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

        {/* Busca por Palavras-Chave */}
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

      {/* Conteúdo da Tela: Renderiza conforme o Modo Selecionado (Feed, Carrossel ou Posts) */}
      {carregando ? (
        <div className="py-20 text-center">
          <Carregando />
          <p className="text-xs text-muted-foreground mt-3">Buscando matérias atualizadas...</p>
        </div>
      ) : noticiasFiltradas.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl p-8 space-y-2">
          <Newspaper className="mx-auto text-muted-foreground/40" size={40} />
          <h3 className="text-base font-semibold">Nenhuma notícia encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {busca
              ? "Tente alterar o termo da busca ou trocar de assunto nas abas acima."
              : "Clique em 'Atualizar' ou verifique seus assuntos configurados."}
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* MODO CARROSSEL (🎠)                                                       */}
          {/* ========================================================================= */}
          {modo === "carrossel" && (
            <div className="space-y-3 relative group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Destaques de {CATEGORIAS_NOTICIAS.find((c) => c.id === categoria)?.rotulo}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => scrollCarrossel("esq")}
                    className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    title="Anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => scrollCarrossel("dir")}
                    className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    title="Próximo"
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
                    className="snap-start shrink-0 w-[85%] sm:w-[360px] rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div className="relative h-48 w-full bg-muted overflow-hidden">
                      <img
                        src={item.imagemUrl}
                        alt={item.titulo}
                        className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute top-2 left-2 rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                        {item.fonte}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="text-[10px] text-muted-foreground font-medium">
                          {new Date(item.data).toLocaleDateString("pt-BR")}
                        </div>
                        <h2 className="font-bold text-sm leading-snug tracking-tight text-foreground line-clamp-2">
                          {item.titulo}
                        </h2>
                        {item.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {item.descricao}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCurtirESalvar(item)}
                            disabled={salvandoId === item.id}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                              item.curtido
                                ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                                : "border border-border text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            <Heart size={14} className={item.curtido ? "fill-rose-500 text-rose-500" : ""} />
                            <span>{item.curtido ? "Salvo" : "Curtir"}</span>
                          </button>

                          <button
                            onClick={() => handleGerarResumoIa(item)}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Sparkles size={14} className="text-amber-500" />
                            <span>IA</span>
                          </button>
                        </div>

                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Abrir matéria"
                        >
                          <ExternalLink size={15} />
                        </a>
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
                  <div className="relative h-40 sm:h-32 sm:w-44 shrink-0 rounded-xl bg-muted overflow-hidden">
                    <img
                      src={item.imagemUrl}
                      alt={item.titulo}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute top-2 left-2 rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                      {item.fonte}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-2 min-w-0">
                    <div className="space-y-1">
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

                    {item.resumoIa && (
                      <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-xs text-foreground space-y-1 animate-in fade-in">
                        <div className="flex items-center gap-1 font-semibold text-primary text-[11px]">
                          <Sparkles size={12} />
                          <span>Resumo da IA:</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {item.resumoIa}
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCurtirESalvar(item)}
                          disabled={salvandoId === item.id}
                          className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                            item.curtido
                              ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                              : "border border-border text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          <Heart size={14} className={item.curtido ? "fill-rose-500 text-rose-500" : ""} />
                          <span>{item.curtido ? "Salvo" : "Curtir"}</span>
                        </button>

                        <button
                          onClick={() => handleGerarResumoIa(item)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Sparkles size={14} className="text-amber-500" />
                          <span>Resumir com IA</span>
                        </button>
                      </div>

                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <span>Abrir</span>
                        <ExternalLink size={14} />
                      </a>
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
                  <div className="relative h-44 w-full bg-muted overflow-hidden">
                    <img
                      src={item.imagemUrl}
                      alt={item.titulo}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute top-2 left-2 rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                      {item.fonte}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
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

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCurtirESalvar(item)}
                          disabled={salvandoId === item.id}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                            item.curtido
                              ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                              : "border border-border text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          <Heart size={14} className={item.curtido ? "fill-rose-500 text-rose-500" : ""} />
                          <span>{item.curtido ? "Salvo" : "Curtir"}</span>
                        </button>

                        <button
                          onClick={() => handleGerarResumoIa(item)}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Sparkles size={14} className="text-amber-500" />
                          <span>IA</span>
                        </button>
                      </div>

                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE PERSONALIZAÇÃO DOS ASSUNTOS                                      */}
      {/* ========================================================================= */}
      <Modal
        aberto={modalAssuntosAberta}
        aoFechar={() => setModalAssuntosAberta(false)}
        titulo="⚙️ Personalizar Assuntos do Feed"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Escolha quais tópicos de notícias você quer visualizar nas suas abas principais.
          </p>

          <div className="space-y-2">
            {CATEGORIAS_NOTICIAS.map((cat) => {
              const ativa = categoriasAtivas.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => handleToggleCategoriaAtiva(cat.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    ativa
                      ? "bg-primary/5 border-primary/40 text-foreground"
                      : "bg-card border-border text-muted-foreground hover:bg-accent"
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

      {/* ========================================================================= */}
      {/* MODAL DE RESUMO DA IA                                                     */}
      {/* ========================================================================= */}
      <Modal
        aberto={Boolean(noticiaParaResumir)}
        aoFechar={() => setNoticiaParaResumir(null)}
        titulo="✨ Resumo em 3 Pontos pela IA"
      >
        {noticiaParaResumir && (
          <div className="space-y-4">
            <div>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {noticiaParaResumir.fonte}
              </span>
              <h3 className="font-semibold text-sm text-foreground mt-1">
                {noticiaParaResumir.titulo}
              </h3>
            </div>

            {gerandoResumo ? (
              <div className="py-8 text-center space-y-2">
                <Carregando />
                <p className="text-xs text-muted-foreground">Sintetizando a matéria com a IA...</p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-accent/40 border border-border text-xs text-foreground whitespace-pre-line leading-relaxed">
                {resumoIaModal}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <a
                href={noticiaParaResumir.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Ver matéria original</span>
                <ExternalLink size={12} />
              </a>

              <Botao onClick={() => setNoticiaParaResumir(null)}>
                Fechar
              </Botao>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
