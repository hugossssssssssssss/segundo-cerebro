import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Newspaper,
  Sparkles,
  Heart,
  ExternalLink,
  Search,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { conversar } from "@/lib/gemini";
import {
  CATEGORIAS_NOTICIAS,
  buscarNoticiasPorCategoria,
  salvarNoticiaComoReferencia,
  alternarCurtidaNoticia,
  type CategoriaNoticia,
  type ItemNoticia,
} from "@/lib/noticias";
import { Aviso, Carregando, Modal, Botao } from "@/components/ui";
import { Button } from "@/components/ui/button";

export default function Noticias() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const [categoria, setCategoria] = useState<CategoriaNoticia>("futebol");
  const [noticias, setNoticias] = useState<ItemNoticia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Estado da Modal de Resumo com IA
  const [noticiaParaResumir, setNoticiaParaResumir] = useState<ItemNoticia | null>(null);
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [resumoIaModal, setResumoIaModal] = useState("");

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

  const handleCurtirESalvar = async (noticia: ItemNoticia) => {
    const agoraCurtido = alternarCurtidaNoticia(noticia.id);
    
    setNoticias((prev) =>
      prev.map((n) => (n.id === noticia.id ? { ...n, curtido: agoraCurtido } : n))
    );

    if (agoraCurtido && pronto) {
      setSalvandoId(noticia.id);
      try {
        const arq = await salvarNoticiaComoReferencia(noticia, cfg);
        setMensagemSucesso(`Salvo no seu cérebro como: ${arq}`);
        setTimeout(() => setMensagemSucesso(null), 4000);
      } catch (err) {
        console.error("Erro ao salvar notícia como referência:", err);
      } finally {
        setSalvandoId(null);
      }
    }
  };

  const handleGerarResumoIa = async (noticia: ItemNoticia) => {
    setNoticiaParaResumir(noticia);
    setResumoIaModal("");
    setGerandoResumo(true);

    try {
      if (!cfg.geminiKey) {
        setResumoIaModal("Falta configurar a chave do Gemini nos Ajustes para gerar resumos.");
        return;
      }
      const resposta = await conversar(cfg, [
        {
          papel: "user",
          texto: `Por favor, faça um resumo em 3 pontos curtos e diretos da seguinte notícia:\n\nTítulo: ${noticia.titulo}\nFonte: ${noticia.fonte}\nDetalhamento: ${noticia.descricao || noticia.titulo}`,
        },
      ]);
      setResumoIaModal(resposta.texto || "Não foi possível gerar o resumo.");
      
      // Atualiza o item na lista com o resumo da IA gerado
      setNoticias((prev) =>
        prev.map((n) => (n.id === noticia.id ? { ...n, resumoIa: resposta.texto } : n))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao conversar com a IA.";
      setResumoIaModal(`Falha ao gerar resumo: ${msg}`);
    } finally {
      setGerandoResumo(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Topo / Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Newspaper className="text-primary" size={28} />
            Notícias & Radar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Seu feed pessoal de novidades, esportes e inspiração. Curta o que gostar para salvar no seu Segundo Cérebro!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregar(categoria)}
            disabled={carregando}
            className="gap-1.5"
          >
            <RefreshCw size={14} className={carregando ? "animate-spin" : ""} />
            Atualizar Feeds
          </Button>
        </div>
      </div>

      {/* Alerta se falta configuração */}
      {!pronto && (
        <Aviso>
          Para salvar notícias no seu repositório do GitHub e gerar resumos com a IA, configure seu token do GitHub e a chave do Gemini na tela de <Link to="/config" className="underline font-semibold">Ajustes</Link>.
        </Aviso>
      )}

      {/* Toast de Confirmação ao Salvar */}
      {mensagemSucesso && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-in fade-in">
          <CheckCircle2 size={18} className="shrink-0" />
          <span className="truncate">{mensagemSucesso}</span>
        </div>
      )}

      {/* Categorias & Busca */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        {/* Abas de Categorias */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {CATEGORIAS_NOTICIAS.map((cat) => {
            const ativa = categoria === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoria(cat.id)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all select-none ${
                  ativa
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <span>{cat.icone}</span>
                <span>{cat.rotulo}</span>
              </button>
            );
          })}
        </div>

        {/* Busca por palavra-chave */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por título..."
            className="w-full rounded-full border border-border bg-card pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Conteúdo Principal / Grid de Notícias */}
      {carregando ? (
        <div className="py-16 text-center">
          <Carregando />
          <p className="text-xs text-muted-foreground mt-3">Buscando últimas manchetes de {CATEGORIAS_NOTICIAS.find(c => c.id === categoria)?.rotulo}...</p>
        </div>
      ) : noticiasFiltradas.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl p-8 space-y-2">
          <Newspaper className="mx-auto text-muted-foreground/40" size={40} />
          <h3 className="text-base font-semibold">Nenhuma notícia encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {busca
              ? "Tente buscar por outros termos ou troque de assunto nas abas acima."
              : "Não conseguimos obter o feed no momento. Tente clicar em 'Atualizar Feeds'."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {noticiasFiltradas.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:border-primary/40 hover:shadow-md transition-all group"
            >
              {/* Imagem da Capa */}
              {item.imagemUrl ? (
                <div className="relative h-44 w-full bg-muted overflow-hidden">
                  <img
                    src={item.imagemUrl}
                    alt={item.titulo}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                    {item.fonte}
                  </div>
                </div>
              ) : (
                <div className="px-4 pt-3 flex items-center justify-between">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {item.fonte}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(item.data).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              )}

              {/* Corpo do Card */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  {item.imagemUrl && (
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {new Date(item.data).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                  <h2 className="font-semibold text-sm leading-snug tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {item.titulo}
                  </h2>
                  {item.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {item.descricao}
                    </p>
                  )}
                </div>

                {/* Resumo da IA se já gerado */}
                {item.resumoIa && (
                  <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-xs text-foreground space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1 font-semibold text-primary text-[11px]">
                      <Sparkles size={12} />
                      <span>Resumo da IA:</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground whitespace-pre-line leading-relaxed">
                      {item.resumoIa}
                    </div>
                  </div>
                )}

                {/* Rodapé de Ações */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {/* Botão de Curtir / Salvar */}
                    <button
                      onClick={() => handleCurtirESalvar(item)}
                      disabled={salvandoId === item.id}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        item.curtido
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
                      }`}
                      title={item.curtido ? "Remover curtida" : "Curtir e salvar no Segundo Cérebro"}
                    >
                      <Heart
                        size={14}
                        className={item.curtido ? "fill-rose-500 text-rose-500" : ""}
                      />
                      <span>{item.curtido ? "Salvo" : "Curtir"}</span>
                    </button>

                    {/* Botão de IA */}
                    <button
                      onClick={() => handleGerarResumoIa(item)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-border"
                      title="Gerar resumo com a IA Gemini"
                    >
                      <Sparkles size={14} className="text-amber-500" />
                      <span className="hidden sm:inline">Resumo</span>
                    </button>
                  </div>

                  {/* Link Externo */}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg p-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    title="Abrir matéria original"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal de Resumo com IA */}
      <Modal
        aberto={Boolean(noticiaParaResumir)}
        aoFechar={() => setNoticiaParaResumir(null)}
        titulo="✨ Resumo por Inteligência Artificial"
      >
        {noticiaParaResumir && (
          <div className="space-y-4">
            <div>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {noticiaParaResumir.fonte}
              </span>
              <h3 className="font-semibold text-base text-foreground mt-1">
                {noticiaParaResumir.titulo}
              </h3>
            </div>

            {gerandoResumo ? (
              <div className="py-8 text-center space-y-2">
                <Carregando />
                <p className="text-xs text-muted-foreground">O Gemini está lendo e sintetizando a matéria...</p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-accent/40 border border-border text-sm text-foreground space-y-2 whitespace-pre-line leading-relaxed">
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
                <span>Ler matéria completa</span>
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
