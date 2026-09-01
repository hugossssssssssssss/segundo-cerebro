import { useState, useRef } from "react";
import { BookOpen, Search, Download, Loader2, X, Book, ExternalLink, AlertTriangle } from "lucide-react";
import { Botao, Cartao, Aviso, Vazio, Carregando, Selo, Campo } from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { buscarLivrosUnificado } from "@/services/bookSearch/aggregator";
import type { LivroBuscado } from "@/services/bookSearch/types";
import { toast } from "@/lib/toast";
import { logger } from "@/lib/logger";

export default function PesquisaLivros() {
  const [busca, setBusca] = useState("");
  const [idioma, setIdioma] = useState<"pt" | "todos" | "en">("pt");
  const [carregando, setCarregando] = useState(false);
  const [livros, setLivros] = useState<LivroBuscado[]>([]);
  const [erro, setErro] = useState("");
  const [estadoInicial, setEstadoInicial] = useState(true);
  const [baixandoIds, setBaixandoIds] = useState<Record<string, boolean>>({});
  const buscaEmVooRef = useRef<number>(0);

  async function aoBuscar(e: React.FormEvent) {
    e.preventDefault();
    if (!busca.trim()) return;

    const idBuscaAtual = ++buscaEmVooRef.current;
    setCarregando(true);
    setErro("");
    setEstadoInicial(false);

    try {
      const resultados = await buscarLivrosUnificado(busca, idioma);
      if (idBuscaAtual === buscaEmVooRef.current) {
        setLivros(resultados);
      }
    } catch (err) {
      if (idBuscaAtual === buscaEmVooRef.current) {
        logger.error("Falha ao pesquisar livros", err);
        setErro("Houve uma falha inesperada ao contatar as fontes de pesquisa de livros.");
      }
    } finally {
      if (idBuscaAtual === buscaEmVooRef.current) {
        setCarregando(false);
      }
    }
  }

  function limparBusca() {
    setBusca("");
    setLivros([]);
    setErro("");
    setEstadoInicial(true);
  }

  async function aoBaixarLivro(livro: LivroBuscado, formato: string) {
    const url = livro.linksDownload[formato];
    if (!url) return;

    const rotuloCurto = formato.split(" ")[0];

    // Se for link do tipo "WEB" (detalhes/ler online), abre direto numa nova aba
    if (rotuloCurto === "WEB") {
      window.open(url, "_blank", "noopener,noreferrer");
      toast("Abrindo página do livro no navegador.", { tipo: "info" });
      return;
    }

    setBaixandoIds((prev) => ({ ...prev, [livro.id]: true }));
    toast(`Iniciando download de "${livro.titulo}" (${formato})...`, { tipo: "info" });

    try {
      // 1. Tenta baixar o arquivo via fetch (suporta CORS no Internet Archive e alguns espelhos)
      const resposta = await fetch(url);
      if (!resposta.ok) {
        throw new Error(`Erro HTTP: ${resposta.status}`);
      }

      const blob = await resposta.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Nome do arquivo estruturado de forma amigável
      const nomeAutor = livro.autores.length > 0 ? ` - ${livro.autores[0]}` : "";
      const nomeArquivo = `${livro.titulo}${nomeAutor}`
        .replace(/[\\/:*?"<>|]/g, "_")
        .trim();

      const extensao = formato.toLowerCase();
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${nomeArquivo}.${extensao}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      toast("Download concluído com sucesso!", { tipo: "sucesso" });
    } catch (erroDownload) {
      console.warn(
        `[Buscador de Livros] Download direto bloqueado por CORS ou rede para ${url}. Utilizando redirecionamento nativo.`,
        erroDownload
      );
      
      // 2. Fallback: Abre o link direto no navegador (o navegador faz o download nativamente sem CORS bypass no JS)
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast("Download iniciado pelo navegador (em aba secundária).", { tipo: "info" });
    } finally {
      setBaixandoIds((prev) => ({ ...prev, [livro.id]: false }));
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 max-w-7xl mx-auto w-full min-h-0 overflow-auto">
      <CabecalhoPagina
        titulo="Pesquisar Livros"
        descricao="Busque e baixe livros digitais e clássicos de domínio público diretamente para a sua máquina (sem salvar no repositório)."
      />

      {/* Barra de Pesquisa */}
      <form onSubmit={aoBuscar} className="flex gap-2 bg-card p-3 rounded-xl border border-border/80 shadow-2xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Campo
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite o título do livro, autor ou assunto..."
            className="pl-9 pr-8"
            disabled={carregando}
          />
          {busca && (
            <button
              type="button"
              onClick={limparBusca}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-accent"
              title="Limpar busca"
              disabled={carregando}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={idioma}
          onChange={(e) => setIdioma(e.target.value as any)}
          disabled={carregando}
          className="flex h-11 rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 text-foreground cursor-pointer outline-none shrink-0"
        >
          <option value="pt">Português</option>
          <option value="todos">Todos os idiomas</option>
          <option value="en">Inglês</option>
        </select>
        <Botao type="submit" disabled={carregando || !busca.trim()} className="shrink-0">
          {carregando ? <Loader2 size={16} className="animate-spin" /> : "Pesquisar"}
        </Botao>
      </form>

      {/* Exibição de Erro */}
      {erro && (
        <Aviso tom="erro">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{erro}</span>
          </div>
        </Aviso>
      )}

      {/* Interface de Estados */}
      {carregando ? (
        <Carregando texto="Buscando em múltiplas fontes (Project Gutenberg e Open Library)..." />
      ) : estadoInicial ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            <BookOpen size={24} />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Pesquisa Agregada de Livros</h3>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground leading-relaxed">
            Busque simultaneamente em milhões de volumes catalogados. Os arquivos serão salvos diretamente na sua pasta local de Downloads.
          </p>
        </div>
      ) : livros.length === 0 ? (
        <Vazio
          titulo="Nenhum livro encontrado"
          descricao={`Não encontramos resultados para "${busca}". Verifique a ortografia ou tente termos mais amplos.`}
          icone={<BookOpen size={24} />}
        />
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground font-medium px-1 flex justify-between items-center">
            <span>Encontrados {livros.length} resultados agregados</span>
            <span>Busca Efêmera</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {livros.map((livro) => (
              <Cartao key={livro.id} className="flex p-4 gap-4 items-stretch group hover:bg-accent/20 transition-colors">
                {/* Capa */}
                <div className="aspect-[2/3] w-24 sm:w-28 shrink-0 relative overflow-hidden rounded-lg border border-border bg-muted flex items-center justify-center shadow-3xs">
                  {livro.capaUrl ? (
                    <img
                      src={livro.capaUrl}
                      alt={`Capa do livro ${livro.titulo}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-secondary/60 to-accent">
                      <Book className="w-8 h-8 text-muted-foreground/60 mb-1.5" />
                      <span className="text-[10px] text-muted-foreground font-medium line-clamp-3">
                        {livro.titulo}
                      </span>
                    </div>
                  )}
                </div>

                {/* Metadados e Ações */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm sm:text-base text-foreground leading-tight line-clamp-2" title={livro.titulo}>
                      {livro.titulo}
                    </h4>
                    {livro.autores.length > 0 && (
                      <p className="text-xs text-muted-foreground font-medium truncate">
                        por {livro.autores.join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Tags / Badges */}
                  <div className="flex flex-wrap gap-1 mt-2 mb-3">
                    <Selo tom="primario" className="text-[10px]">
                      {livro.idioma}
                    </Selo>
                    {livro.anoPublicacao && (
                      <Selo tom="neutro" className="text-[10px]">
                        Ano: {livro.anoPublicacao}
                      </Selo>
                    )}
                    <Selo tom="neutro" className="text-[10px] opacity-80 bg-accent text-accent-foreground font-semibold">
                      {livro.fonte}
                    </Selo>
                  </div>

                  {/* Links de Download */}
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-border/60">
                    {Object.keys(livro.linksDownload).map((formato) => {
                      const rotuloCurto = formato.split(" ")[0];
                      const isWeb = rotuloCurto === "WEB";
                      const baixando = baixandoIds[livro.id];

                      return (
                        <Botao
                          key={formato}
                          variante={isWeb ? "fantasma" : "neutro"}
                          tamanho="pequeno"
                          disabled={baixando}
                          onClick={() => aoBaixarLivro(livro, formato)}
                          className="text-[11px] h-7 px-2 gap-1 font-semibold"
                          title={formato}
                        >
                          {baixando ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : isWeb ? (
                            <ExternalLink size={10} />
                          ) : (
                            <Download size={10} />
                          )}
                          {rotuloCurto}
                        </Botao>
                      );
                    })}
                  </div>
                </div>
              </Cartao>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
