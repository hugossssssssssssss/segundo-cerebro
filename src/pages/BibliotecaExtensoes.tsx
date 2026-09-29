import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  Plus,
  Edit3,
  RefreshCw,
  Upload,
  DownloadCloud,
  Check,
  Trash2,
  ExternalLink,
  Search,
  X,
  Package,
} from "lucide-react";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Botao, Vazio, Selo } from "@/components/ui";
import {
  carregarProjetosExtensoes,
  salvarProjetoCustomizado,
  removerProjetoCustomizado,
  sincronizarProjetosComGithub,
  type ProjetoExtensao,
  EVENTO_PROJETOS_ALTERADOS,
} from "@/lib/projetosExtensoes";
import {
  obterCatalogoBiblioteca,
  instalarExtensaoNoRepositorio,
  desinstalarExtensaoDoRepositorio,
  type ItemCatalogoExtensao,
} from "@/lib/klausExtensionCatalog";
import { ModalCriarProjetoExtensao } from "@/components/ModalCriarProjetoExtensao";
import { obterIconePorNome } from "@/lib/icones";
import { lerConfig, configCompleta } from "@/lib/settings";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { unpackKlausExtension } from "@/lib/klausPackage";

export default function BibliotecaExtensoes() {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<ProjetoExtensao[]>(carregarProjetosExtensoes);
  const [busca, setBusca] = useState("");
  const [modalCriarAberta, setModalCriarAberta] = useState(false);
  const [projetoParaEditar, setProjetoParaEditar] = useState<ProjetoExtensao | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [instalandoId, setInstalandoId] = useState<string | null>(null);

  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  const recarregar = useCallback(() => {
    setProjetos(carregarProjetosExtensoes());
  }, []);

  useEffect(() => {
    window.addEventListener(EVENTO_PROJETOS_ALTERADOS, recarregar);
    return () => window.removeEventListener(EVENTO_PROJETOS_ALTERADOS, recarregar);
  }, [recarregar]);

  // Sincroniza com o repositório privado ao carregar
  useEffect(() => {
    if (pronto) {
      sincronizarProjetosComGithub(cfg).then((res) => {
        if (res.sincronizado) {
          setProjetos(res.projetos);
        }
      });
    }
  }, [pronto]);

  const lidarSincronizacaoManual = async () => {
    if (!pronto) {
      toast("Configure seu token do GitHub nos Ajustes para sincronizar.", { tipo: "aviso" });
      return;
    }
    setSincronizando(true);
    try {
      const res = await sincronizarProjetosComGithub(cfg);
      if (res.sincronizado) {
        setProjetos(res.projetos);
        toast("Biblioteca sincronizada com o repositório!", { tipo: "sucesso" });
      } else {
        toast("Biblioteca atualizada com os dados locais.", { tipo: "info" });
      }
    } finally {
      setSincronizando(false);
    }
  };

  const lidarInstalarExtensao = async (item: ItemCatalogoExtensao) => {
    setInstalandoId(item.id);
    try {
      const res = await instalarExtensaoNoRepositorio(item.id, cfg);
      setProjetos(carregarProjetosExtensoes());
      toast(res.mensagem, { tipo: res.sucesso ? "sucesso" : "aviso" });
    } catch (err: any) {
      toast(`Erro ao instalar extensão: ${err.message}`, { tipo: "erro" });
    } finally {
      setInstalandoId(null);
    }
  };

  const lidarDesinstalarExtensao = async (id: string, nome: string) => {
    const confirmou = window.confirm(`Deseja desinstalar "${nome}" do seu repositório de dados?`);
    if (!confirmou) return;

    try {
      const res = await desinstalarExtensaoDoRepositorio(id, cfg);
      setProjetos(carregarProjetosExtensoes());
      toast(res.mensagem, { tipo: "info" });
    } catch (err: any) {
      toast(`Erro ao desinstalar: ${err.message}`, { tipo: "erro" });
    }
  };

  const lidarRemoverProjetoCustomizado = (id: string, nome: string) => {
    const confirmou = window.confirm(`Deseja remover o projeto "${nome}"?`);
    if (!confirmou) return;

    removerProjetoCustomizado(id, cfg);
    setProjetos(carregarProjetosExtensoes());
    toast(`Projeto "${nome}" removido.`, { tipo: "info" });
  };

  const lidarImportarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const leitor = new FileReader();
    leitor.onload = (evento) => {
      try {
        const conteudo = evento.target?.result as string;
        const extraido = unpackKlausExtension(conteudo);
        const { manifest, files } = extraido;

        const entry = manifest.entry || "index.html";
        const codigoHtml = files[entry] || "";

        const novo: ProjetoExtensao = {
          id: manifest.id,
          nome: manifest.name,
          descricao: manifest.description || "",
          icone: manifest.icon || "FolderGit2",
          categoria: "utilitarios",
          tipo: "codigo_customizado",
          ativo: true,
          origem: "usuario",
          codigoHtml,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
        };

        salvarProjetoCustomizado(novo, cfg);
        setProjetos(carregarProjetosExtensoes());
        toast(`Extensão "${manifest.name}" importada com sucesso!`, { tipo: "sucesso" });
      } catch (err: any) {
        toast(`Erro ao importar pacote: ${err.message}`, { tipo: "erro" });
      }
    };
    leitor.readAsText(file);
    e.target.value = "";
  };

  // Separação limpa: projetos ativos/instalados pelo usuário vs catálogo disponível
  const catalogo = useMemo(() => obterCatalogoBiblioteca(), []);

  const instalados = useMemo(() => {
    return projetos.filter((p) => p.ativo);
  }, [projetos]);

  const termoBusca = busca.toLowerCase().trim();

  const instaladosFiltrados = useMemo(() => {
    if (!termoBusca) return instalados;
    return instalados.filter(
      (p) =>
        p.nome.toLowerCase().includes(termoBusca) ||
        p.descricao.toLowerCase().includes(termoBusca)
    );
  }, [instalados, termoBusca]);

  const catalogoFiltrado = useMemo(() => {
    if (!termoBusca) return catalogo;
    return catalogo.filter(
      (c) =>
        c.nome.toLowerCase().includes(termoBusca) ||
        c.descricao.toLowerCase().includes(termoBusca)
    );
  }, [catalogo, termoBusca]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200 w-full pb-16 max-w-6xl mx-auto">
      {/* 1. Cabeçalho Principal Clean */}
      <CabecalhoPagina
        titulo="Biblioteca de Projetos"
        descricao="Extensões modulares e mini-aplicativos salvos no seu repositório de dados."
        icone={<Boxes size={20} />}
        corIcone="bg-primary/10 text-primary"
        badge={
          <Selo tom="neutro" className="text-xs font-medium">
            {instalados.length} no repositório
          </Selo>
        }
        acoes={
          <div className="flex items-center gap-2">
            <input
              ref={inputArquivoRef}
              type="file"
              accept=".json,.klaus-ext.json"
              className="hidden"
              onChange={lidarImportarArquivo}
            />
            <Botao
              variante="neutro"
              onClick={() => inputArquivoRef.current?.click()}
              title="Importar pacote (.klaus-ext.json)"
              className="h-9 px-3 text-xs"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Importar</span>
            </Botao>
            <Botao
              variante="neutro"
              onClick={lidarSincronizacaoManual}
              disabled={sincronizando}
              title="Sincronizar com o repositório GitHub"
              className="h-9 px-3 text-xs"
            >
              <RefreshCw size={14} className={cn(sincronizando && "animate-spin")} />
              <span className="hidden sm:inline">Sincronizar</span>
            </Botao>
            <Botao
              onClick={() => {
                setProjetoParaEditar(null);
                setModalCriarAberta(true);
              }}
              className="h-9 px-3.5 text-xs font-medium"
            >
              <Plus size={15} />
              <span>Novo Projeto</span>
            </Botao>
          </div>
        }
      />

      {/* 2. Barra de Busca Refinada (Sem pílulas de categorias) */}
      <div className="relative w-full">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3.5 text-muted-foreground/60 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar extensões e projetos na biblioteca..."
            className="w-full h-11 pl-10 pr-9 rounded-xl bg-card border border-border/70 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-2xs"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-3 text-muted-foreground/60 hover:text-foreground p-1 transition-colors cursor-pointer"
              title="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Seção: Instalados no Repositório de Dados */}
      {instaladosFiltrados.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Instalados no seu Repositório
              </h2>
              <p className="text-xs text-muted-foreground">
                Mini-aplicativos ativos no seu menu e sincronizados no seu cérebro-dados.
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {instaladosFiltrados.length} {instaladosFiltrados.length === 1 ? "item" : "itens"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {instaladosFiltrados.map((item) => {
              const Icone = obterIconePorNome(item.icone || "FolderGit2");
              const rotaDestino = item.rota || `/projeto/${item.id}`;

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between p-4 rounded-xl border border-border/80 bg-card hover:border-border transition-all duration-150 shadow-2xs group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted/60 text-foreground border border-border/50">
                          <Icone size={18} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {item.nome}
                          </h3>
                          <span className="text-[11px] text-muted-foreground">
                            {item.origem === "usuario" ? "Projeto Pessoal" : "Extensão Ativa"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[34px]">
                      {item.descricao || "Projeto integrado pronto para uso no Klaus."}
                    </p>
                  </div>

                  <div className="pt-3.5 mt-2 border-t border-border/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <Check size={12} />
                        No repositório
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.origem === "usuario" && item.tipo !== "codigo_customizado" && (
                        <button
                          type="button"
                          onClick={() => {
                            setProjetoParaEditar(item);
                            setModalCriarAberta(true);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                          title="Editar projeto"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (item.origem === "usuario" && !catalogo.some((c) => c.id === item.id)) {
                            lidarRemoverProjetoCustomizado(item.id, item.nome);
                          } else {
                            lidarDesinstalarExtensao(item.id, item.nome);
                          }
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Desinstalar do repositório"
                      >
                        <Trash2 size={14} />
                      </button>

                      <Botao
                        onClick={() => navigate(rotaDestino)}
                        className="text-xs h-7 px-2.5 font-medium"
                      >
                        <span>Abrir</span>
                        <ExternalLink size={12} className="ml-1" />
                      </Botao>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Seção: Catálogo de Extensões Disponíveis */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-border/40">
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Catálogo de Extensões
            </h2>
            <p className="text-xs text-muted-foreground">
              Escolha uma ferramenta para instalar no repositório de dados do seu projeto pessoal.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {catalogoFiltrado.length} {catalogoFiltrado.length === 1 ? "disponível" : "disponíveis"}
          </span>
        </div>

        {catalogoFiltrado.length === 0 ? (
          <Vazio
            icone={<Package size={22} />}
            titulo="Nenhuma extensão encontrada"
            descricao="Nenhum item corresponde à sua pesquisa."
            acao={
              <Botao onClick={() => setBusca("")} variante="neutro" className="text-xs">
                Limpar Busca
              </Botao>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {catalogoFiltrado.map((item) => {
              const Icone = obterIconePorNome(item.icone || "Boxes");
              const estaInstalado = instalados.some((p) => p.id === item.id);
              const estaCarregando = instalandoId === item.id;

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between p-4 rounded-xl border border-border/70 bg-card hover:border-border transition-all duration-150 shadow-2xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted/50 text-foreground border border-border/50">
                        <Icone size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">
                          {item.nome}
                        </h3>
                        <span className="text-[11px] text-muted-foreground">
                          v{item.versao} • Standalone
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[34px]">
                      {item.descricao}
                    </p>
                  </div>

                  <div className="pt-3.5 mt-2 border-t border-border/40 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {estaInstalado ? "Instalada" : "Disponível"}
                    </span>

                    {estaInstalado ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => lidarDesinstalarExtensao(item.id, item.nome)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer text-xs"
                          title="Desinstalar do repositório"
                        >
                          <Trash2 size={13} />
                        </button>
                        <Botao
                          variante="neutro"
                          onClick={() => navigate(`/projeto/${item.id}`)}
                          className="text-xs h-7 px-2.5 font-medium"
                        >
                          <span>Abrir</span>
                          <ExternalLink size={12} className="ml-1" />
                        </Botao>
                      </div>
                    ) : (
                      <Botao
                        onClick={() => lidarInstalarExtensao(item)}
                        disabled={estaCarregando}
                        className="text-xs h-7 px-3 font-medium"
                      >
                        {estaCarregando ? (
                          <>
                            <RefreshCw size={12} className="animate-spin mr-1" />
                            <span>Instalando...</span>
                          </>
                        ) : (
                          <>
                            <DownloadCloud size={13} className="mr-1" />
                            <span>Instalar no Repositório</span>
                          </>
                        )}
                      </Botao>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Modal para Criar/Editar Projeto */}
      <ModalCriarProjetoExtensao
        aberto={modalCriarAberta}
        aoFechar={() => {
          setModalCriarAberta(false);
          setProjetoParaEditar(null);
        }}
        projetoEdicao={projetoParaEditar}
        aoSalvar={() => {
          setProjetos(carregarProjetosExtensoes());
        }}
      />
    </div>
  );
}
