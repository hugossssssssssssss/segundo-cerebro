import { useEffect, useState, useMemo } from "react";
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
  CheckCircle2,
  Check,
  RotateCcw,
  FileText,
  Bookmark,
  CheckSquare,
  BookOpen,
  Clock,
  Plus,
  Trash2,
  Flame,
  LayoutTemplate,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { conversar } from "@/lib/gemini";
import {
  CATEGORIAS_NOTICIAS,
  buscarNoticiasPorCategoria,
  salvarNoticiaComoReferencia,
  criarNotaDaNoticia,
  criarTarefaDaNoticia,
  formatarHtmlEditorial,
  alternarCurtidaNoticia,
  obterModoExibicao,
  salvarModoExibicao,
  obterCategoriasAtivas,
  salvarCategoriasAtivas,
  obterFeedsCustomizados,
  adicionarFeedCustomizado,
  removerFeedCustomizado,
  obterImagemIlustrativa,
  type CategoriaNoticia,
  type ModoExibicao,
  type ItemNoticia,
  type FeedCustomizado,
} from "@/lib/noticias";
import { Aviso, Carregando, Modal, Botao } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { AlternadorVisao } from "@/components/AlternadorVisao";

export default function Noticias() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  // Estados de Formato e Categorias
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

  // Leitor Focado no App
  const [noticiaParaLer, setNoticiaParaLer] = useState<ItemNoticia | null>(null);

  // Modal de Personalização e Feeds Customizados
  const [modalAssuntosAberta, setModalAssuntosAberta] = useState(false);
  const [feedsCustom, setFeedsCustom] = useState<FeedCustomizado[]>(obterFeedsCustomizados);
  const [novoFeedNome, setNovoFeedNome] = useState("");
  const [novoFeedUrl, setNovoFeedUrl] = useState("");

  // Resumo Gemini IA
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [resumoIa, setResumoIa] = useState("");

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

  // Abrir Leitor Instantâneo (Padrão GitHub Reader: exibe o campo `content` integral)
  const handleAbrirLeitor = (item: ItemNoticia) => {
    setNoticiaParaLer(item);
    setResumoIa("");
  };

  const handleTrocarModo = (novoModo: ModoExibicao) => {
    setModo(novoModo);
    salvarModoExibicao(novoModo);
  };

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

  const handleAdicionarFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFeedUrl.trim()) return;
    const atualizados = adicionarFeedCustomizado(novoFeedNome, novoFeedUrl, "personalizado");
    setFeedsCustom(atualizados);
    setNovoFeedNome("");
    setNovoFeedUrl("");

    if (!categoriasAtivas.includes("personalizado")) {
      const novaLista = [...categoriasAtivas, "personalizado" as CategoriaNoticia];
      setCategoriasAtivas(novaLista);
      salvarCategoriasAtivas(novaLista);
    }
  };

  const handleRemoverFeed = (id: string) => {
    const atualizados = removerFeedCustomizado(id);
    setFeedsCustom(atualizados);
  };

  const handleRestaurarCategorias = () => {
    const padrao: CategoriaNoticia[] = ["futebol", "design", "tech", "brasil", "curiosidades"];
    setCategoriasAtivas(padrao);
    salvarCategoriasAtivas(padrao);
    setCategoria("futebol");
  };

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

  const noticiaHero = useMemo(() => noticiasFiltradas[0] || null, [noticiasFiltradas]);
  const noticiasSecundarias = useMemo(() => noticiasFiltradas.slice(1), [noticiasFiltradas]);

  const handleCurtir = (noticia: ItemNoticia) => {
    const agoraCurtido = alternarCurtidaNoticia(noticia.id);
    setNoticias((prev) =>
      prev.map((n) => (n.id === noticia.id ? { ...n, curtido: agoraCurtido } : n))
    );
    if (noticiaParaLer && noticiaParaLer.id === noticia.id) {
      setNoticiaParaLer((prev) => (prev ? { ...prev, curtido: agoraCurtido } : null));
    }
  };

  const handleCriarNota = async (noticia: ItemNoticia) => {
    if (!pronto) return;
    setAcaoId(noticia.id);
    try {
      const arq = await criarNotaDaNoticia(noticia, cfg);
      setMensagemSucesso(`Nota criada em: ${arq}`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err) {
      console.error("Erro ao criar nota:", err);
    } finally {
      setAcaoId(null);
    }
  };

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

  const handleCriarTarefa = async (noticia: ItemNoticia) => {
    if (!pronto) return;
    setAcaoId(noticia.id);
    try {
      const arq = await criarTarefaDaNoticia(noticia, cfg);
      setMensagemSucesso(`Tarefa gerada: ${arq}`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err) {
      console.error("Erro ao criar tarefa:", err);
    } finally {
      setAcaoId(null);
    }
  };

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
          texto: `Sintetize a matéria a seguir em 3 destaques fundamentais em português:\n\nTítulo: ${noticia.titulo}\nFonte: ${noticia.fonte}\nTexto Completo: ${noticia.conteudoCompleto || noticia.descricao || noticia.titulo}`,
        },
      ]);
      const resTexto = resposta.texto || "Não foi possível gerar a síntese.";
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

  const categoriasExibidas = useMemo(
    () => CATEGORIAS_NOTICIAS.filter((c) => categoriasAtivas.includes(c.id)),
    [categoriasAtivas]
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Revista Digital & Radar"
        descricao="Feed editorial com matérias integrais integradas ao seu Segundo Cérebro."
        icone={<Newspaper size={20} />}
        corIcone="bg-red-500/10 text-red-600 dark:text-red-400"
        acoes={
          <>
            <AlternadorVisao
              valorAtivo={modo}
              aoAlternar={(m) => handleTrocarModo(m as ModoExibicao)}
              opcoes={[
                { id: "revista", rotulo: "Revista", icone: <LayoutTemplate size={14} /> },
                { id: "cards", rotulo: "Cards", icone: <LayoutGrid size={14} /> },
                { id: "feed", rotulo: "Feed", icone: <LayoutList size={14} /> },
              ]}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalAssuntosAberta(true)}
              className="gap-1.5 text-xs rounded-xl h-9"
            >
              <SlidersHorizontal size={14} />
              <span>Assuntos</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => carregar(categoria)}
              disabled={carregando}
              className="rounded-xl h-9 w-9 p-0 text-muted-foreground cursor-pointer"
              title="Atualizar Notícias"
            >
              <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />
            </Button>
          </>
        }
      />

      {!pronto && (
        <Aviso>
          Para integrar notícias com suas Notas, Referências e Tarefas, configure seu token do GitHub nos <Link to="/config" className="underline font-semibold">Ajustes</Link>.
        </Aviso>
      )}

      {/* Toast de Confirmação */}
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
            placeholder="Buscar manchete..."
            className="w-full rounded-full border border-border bg-card pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Conteúdo Principal */}
      {carregando ? (
        <div className="py-20 text-center">
          <Carregando />
          <p className="text-xs text-muted-foreground mt-3">Buscando edições mais recentes de {CATEGORIAS_NOTICIAS.find(c => c.id === categoria)?.rotulo}...</p>
        </div>
      ) : noticiasFiltradas.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl p-8 space-y-2">
          <Newspaper className="mx-auto text-muted-foreground/40" size={40} />
          <h3 className="text-base font-semibold">Nenhuma notícia encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {busca ? "Tente buscar por outras palavras-chave." : "Clique em 'Atualizar' para checar notícias novas."}
          </p>
        </div>
      ) : (
        <>
          {/* MODO REVISTA */}
          {modo === "revista" && (
            <div className="space-y-6">
              {noticiaHero && (
                <div
                  onClick={() => handleAbrirLeitor(noticiaHero)}
                  className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-lg cursor-pointer group transition-all duration-300 hover:shadow-2xl"
                >
                  <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-muted">
                    <img
                      src={noticiaHero.imagemUrl}
                      alt={noticiaHero.titulo}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = obterImagemIlustrativa(noticiaHero.categoria);
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                        <Flame size={12} />
                        Destaque
                      </span>
                      <span className="rounded-full bg-black/60 backdrop-blur-xs px-3 py-1 text-[10px] font-semibold text-white">
                        {noticiaHero.fonte}
                      </span>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 text-white space-y-2">
                      <div className="flex items-center gap-3 text-xs text-white/80">
                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          {noticiaHero.tempoLeituraMinutos} min de leitura
                        </span>
                        <span>•</span>
                        <span>{new Date(noticiaHero.data).toLocaleDateString("pt-BR")}</span>
                      </div>

                      <h2 className="text-xl sm:text-3xl font-extrabold leading-snug tracking-tight line-clamp-2 drop-shadow-md group-hover:text-primary-foreground transition-colors">
                        {noticiaHero.titulo}
                      </h2>

                      {noticiaHero.descricao && (
                        <p className="text-xs sm:text-sm text-white/80 line-clamp-2 leading-relaxed max-w-3xl">
                          {noticiaHero.descricao}
                        </p>
                      )}

                      <div className="pt-2 flex items-center gap-3">
                        <Button size="sm" className="rounded-full gap-1.5 text-xs font-bold shadow-md">
                          <BookOpen size={14} />
                          <span>Ler Matéria Completa</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {noticiasSecundarias.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:border-primary/40 hover:shadow-md transition-all group"
                  >
                    <div
                      onClick={() => handleAbrirLeitor(item)}
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
                      <div className="space-y-1.5 cursor-pointer" onClick={() => handleAbrirLeitor(item)}>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                          <span>{new Date(item.data).toLocaleDateString("pt-BR")}</span>
                          <span>⏱️ {item.tempoLeituraMinutos} min</span>
                        </div>
                        <h2 className="font-bold text-sm leading-snug tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {item.titulo}
                        </h2>
                        {item.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.descricao}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1">
                        <button
                          onClick={() => handleAbrirLeitor(item)}
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
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* MODO CARDS */}
          {modo === "cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {noticiasFiltradas.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div
                    onClick={() => handleAbrirLeitor(item)}
                    className="relative h-48 w-full bg-muted overflow-hidden cursor-pointer"
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
                    <div className="space-y-1.5 cursor-pointer" onClick={() => handleAbrirLeitor(item)}>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                        <span>{new Date(item.data).toLocaleDateString("pt-BR")}</span>
                        <span>⏱️ {item.tempoLeituraMinutos} min</span>
                      </div>
                      <h2 className="font-bold text-sm leading-snug tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
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
                        onClick={() => handleAbrirLeitor(item)}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <BookOpen size={14} />
                        <span>Ler no Klaus</span>
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

          {/* MODO FEED */}
          {modo === "feed" && (
            <div className="space-y-3">
              {noticiasFiltradas.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div
                    onClick={() => handleAbrirLeitor(item)}
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
                    <div className="space-y-1 cursor-pointer" onClick={() => handleAbrirLeitor(item)}>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                        <span>{new Date(item.data).toLocaleDateString("pt-BR")}</span>
                        <span>•</span>
                        <span>⏱️ {item.tempoLeituraMinutos} min de leitura</span>
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
                        onClick={() => handleAbrirLeitor(item)}
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
                          <span className="hidden sm:inline">Nota</span>
                        </button>

                        <button
                          onClick={() => handleSalvarReferencia(item)}
                          disabled={acaoId === item.id}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Salvar Referência"
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
        </>
      )}

      {/* ========================================================================= */}
      {/* LEITOR DE NOTÍCIA INTEGRADO (PADRÃO GITHUB RSS READER - ARTIGO COMPLETO) */}
      {/* ========================================================================= */}
      <Modal
        aberto={Boolean(noticiaParaLer)}
        aoFechar={() => {
          setNoticiaParaLer(null);
          setResumoIa("");
        }}
        titulo="📖 Leitor de Notícias do Klaus"
      >
        {noticiaParaLer && (
          <div className="space-y-5 max-h-[78dvh] overflow-y-auto pr-1">
            <div className="relative h-64 w-full rounded-2xl overflow-hidden bg-muted">
              <img
                src={noticiaParaLer.imagemUrl}
                alt={noticiaParaLer.titulo}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = obterImagemIlustrativa(noticiaParaLer.categoria);
                }}
              />
              <div className="absolute top-3 left-3 rounded-md bg-black/80 backdrop-blur-xs px-3 py-1 text-xs font-semibold text-white">
                {noticiaParaLer.fonte}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="uppercase font-bold tracking-wider text-primary">{noticiaParaLer.categoria}</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-medium text-foreground bg-accent px-2.5 py-0.5 rounded-md">
                    <Clock size={12} />
                    {noticiaParaLer.tempoLeituraMinutos} min de leitura
                  </span>
                  <span>{new Date(noticiaParaLer.data).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                {noticiaParaLer.titulo}
              </h2>
            </div>

            {/* Barra de Ações Rápidas com o Segundo Cérebro */}
            <div className="p-3 rounded-xl bg-card border border-border flex flex-wrap items-center justify-between gap-2 shadow-xs">
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

            {/* Resumo ou Aprofundamento por IA */}
            {resumoIa ? (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1 font-semibold text-primary">
                  <Sparkles size={14} />
                  <span>Análise da IA Gemini:</span>
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
                <span>{gerandoResumo ? "Sintetizando matéria..." : "Sintetizar Destaques com IA Gemini"}</span>
              </button>
            )}

            {/* ARTIGO COMPLETO DA MATÉRIA SEM CORTE (PADRÃO GITHUB RSS READER) */}
            <div className="p-5 rounded-2xl bg-accent/20 border border-border space-y-4">
              <div
                className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-foreground/90 font-sans space-y-3"
                dangerouslySetInnerHTML={{
                  __html: formatarHtmlEditorial(noticiaParaLer.conteudoCompleto || noticiaParaLer.descricao || ""),
                }}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <a
                href={noticiaParaLer.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>Visitar site original ({noticiaParaLer.fonte})</span>
                <ExternalLink size={13} />
              </a>

              <Botao onClick={() => setNoticiaParaLer(null)}>
                Fechar Leitor
              </Botao>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL DE PERSONALIZAÇÃO DOS ASSUNTOS & ADIÇÃO DE FEEDS */}
      <Modal
        aberto={modalAssuntosAberta}
        aoFechar={() => setModalAssuntosAberta(false)}
        titulo="⚙️ Personalizar Assuntos & Feeds"
      >
        <div className="space-y-5 max-h-[75dvh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assuntos Principais</h3>
            <div className="space-y-2">
              {CATEGORIAS_NOTICIAS.filter((c) => c.id !== "personalizado").map((cat) => {
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
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adicionar RSS / Feed Próprio</h3>
            <form onSubmit={handleAdicionarFeed} className="space-y-2">
              <input
                type="text"
                value={novoFeedNome}
                onChange={(e) => setNovoFeedNome(e.target.value)}
                placeholder="Nome do Canal/Blog (ex: UX Collective)"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  value={novoFeedUrl}
                  onChange={(e) => setNovoFeedUrl(e.target.value)}
                  placeholder="URL do Feed RSS (ex: https://blog.com/rss.xml)"
                  className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
                <Button type="submit" size="sm" className="rounded-xl gap-1 text-xs">
                  <Plus size={14} />
                  <span>Adicionar</span>
                </Button>
              </div>
            </form>

            {feedsCustom.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <h4 className="text-[11px] font-semibold text-muted-foreground">Seus Feeds Adicionados:</h4>
                <div className="space-y-1">
                  {feedsCustom.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-card text-xs">
                      <div className="truncate min-w-0 pr-2">
                        <span className="font-semibold block truncate">{f.nome}</span>
                        <span className="text-[10px] text-muted-foreground truncate block">{f.url}</span>
                      </div>
                      <button
                        onClick={() => handleRemoverFeed(f.id)}
                        className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
