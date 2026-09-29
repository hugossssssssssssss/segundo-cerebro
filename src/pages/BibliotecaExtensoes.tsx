import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  Plus,
  Power,
  Edit3,
  Puzzle,
  RefreshCw,
} from "lucide-react";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { SeloStatus } from "@/components/SeloStatus";
import { Botao, Vazio, Selo } from "@/components/ui";
import {
  carregarProjetosExtensoes,
  alternarStatusProjetoExtensao,
  sincronizarProjetosComGithub,
  type ProjetoExtensao,
  type CategoriaExtensao,
  EVENTO_PROJETOS_ALTERADOS,
} from "@/lib/projetosExtensoes";
import { ModalCriarProjetoExtensao } from "@/components/ModalCriarProjetoExtensao";
import { obterIconePorNome } from "@/lib/icones";
import { lerConfig, configCompleta } from "@/lib/settings";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type FiltroCategoria = "todas" | "ativas" | "meus_projetos" | CategoriaExtensao;

export default function BibliotecaExtensoes() {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<ProjetoExtensao[]>(carregarProjetosExtensoes);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>("todas");
  const [modalCriarAberta, setModalCriarAberta] = useState(false);
  const [projetoParaEditar, setProjetoParaEditar] = useState<ProjetoExtensao | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const recarregar = useCallback(() => {
    setProjetos(carregarProjetosExtensoes());
  }, []);

  useEffect(() => {
    window.addEventListener(EVENTO_PROJETOS_ALTERADOS, recarregar);
    return () => window.removeEventListener(EVENTO_PROJETOS_ALTERADOS, recarregar);
  }, [recarregar]);

  // Sincroniza com o GitHub ao carregar
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

  const lidarAlternarStatus = (id: string, nome: string) => {
    const res = alternarStatusProjetoExtensao(id, cfg);
    if (res.sucesso) {
      setProjetos(carregarProjetosExtensoes());
      toast(
        res.ativo
          ? `"${nome}" foi ativada e adicionada ao menu lateral!`
          : `"${nome}" foi desativada e removida do menu lateral.`,
        { tipo: res.ativo ? "sucesso" : "info" }
      );
    }
  };

  // Contadores para métricas
  const totalAtivas = useMemo(() => projetos.filter((p) => p.ativo).length, [projetos]);
  const totalCustomizadas = useMemo(
    () => projetos.filter((p) => p.origem === "usuario").length,
    [projetos]
  );

  // Filtragem
  const projetosFiltrados = useMemo(() => {
    let lista = [...projetos];

    if (busca.trim()) {
      const q = busca.toLowerCase().trim();
      lista = lista.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.descricao.toLowerCase().includes(q) ||
          p.categoria.toLowerCase().includes(q)
      );
    }

    if (filtroCategoria === "ativas") {
      lista = lista.filter((p) => p.ativo);
    } else if (filtroCategoria === "meus_projetos") {
      lista = lista.filter((p) => p.origem === "usuario");
    } else if (filtroCategoria !== "todas") {
      lista = lista.filter((p) => p.categoria === filtroCategoria);
    }

    return lista;
  }, [projetos, busca, filtroCategoria]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full pb-12">
      {/* 1. Cabeçalho Principal Oficial */}
      <CabecalhoPagina
        titulo="Biblioteca de Projetos & Extensões"
        descricao="Gerencie extensões modulares e crie projetos personalizados salvos no seu repositório privado."
        icone={<Boxes size={22} />}
        corIcone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        badge={
          <SeloStatus
            rotulo={`${totalAtivas} ativas`}
            tom={totalAtivas > 0 ? "sucesso" : "neutro"}
          />
        }
        acoes={
          <div className="flex items-center gap-2">
            <Botao
              variante="neutro"
              onClick={lidarSincronizacaoManual}
              disabled={sincronizando}
              title="Sincronizar com o repositório GitHub"
            >
              <RefreshCw size={15} className={cn(sincronizando && "animate-spin")} />
              <span className="hidden sm:inline">Sincronizar</span>
            </Botao>
            <Botao onClick={() => { setProjetoParaEditar(null); setModalCriarAberta(true); }}>
              <Plus size={16} />
              <span>Novo Projeto</span>
            </Botao>
          </div>
        }
      />

      {/* 2. Destaques / Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-border bg-card/60 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Disponível
          </p>
          <p className="text-xl font-bold text-foreground">{projetos.length}</p>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card/60 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Extensões Ativas
          </p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalAtivas}</p>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card/60 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Projetos Criados
          </p>
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{totalCustomizadas}</p>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card/60 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Repositório
          </p>
          <p className="text-xs font-mono font-medium text-foreground truncate mt-1">
            {cfg.repoName || "Local / Demo"}
          </p>
        </div>
      </div>

      {/* 3. Barra de Busca e Filtros de Categoria */}
      <div className="space-y-3">
        <BarraFerramentas
          busca={busca}
          aoMudarBusca={setBusca}
          placeholderBusca="Buscar extensões por nome, recurso ou categoria..."
          filtros={
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: "todas", rotulo: "Todas" },
                { id: "ativas", rotulo: "Ativas" },
                { id: "meus_projetos", rotulo: "Meus Projetos" },
                { id: "design", rotulo: "Design" },
                { id: "produtividade", rotulo: "Produtividade" },
                { id: "utilitarios", rotulo: "Utilitários" },
                { id: "ia", rotulo: "IA" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFiltroCategoria(cat.id as FiltroCategoria)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border",
                    filtroCategoria === cat.id
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  {cat.rotulo}
                </button>
              ))}
            </div>
          }
        />
      </div>

      {/* 4. Grade de Extensões & Projetos */}
      {projetosFiltrados.length === 0 ? (
        <Vazio
          icone={<Puzzle size={24} />}
          titulo="Nenhuma extensão encontrada"
          descricao="Tente pesquisar com outro termo ou criar um novo projeto personalizado."
          acao={
            <Botao onClick={() => { setBusca(""); setFiltroCategoria("todas"); }}>
              Limpar Filtros
            </Botao>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projetosFiltrados.map((item) => {
            const Icone = obterIconePorNome(item.icone || "HelpCircle");
            const corTema = item.cor || "#6366f1";
            const rotaDestino = item.rota || `/projeto/${item.id}`;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 bg-card hover:shadow-md relative overflow-hidden group",
                  item.ativo
                    ? "border-primary/40 ring-1 ring-primary/20 shadow-2xs"
                    : "border-border/80 hover:border-border"
                )}
              >
                {/* Faixa decorativa sutil de cor no topo */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 opacity-80"
                  style={{ backgroundColor: corTema }}
                />

                <div className="space-y-3">
                  {/* Topo do Card: Ícone + Título + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs"
                        style={{ backgroundColor: `${corTema}15`, color: corTema }}
                      >
                        <Icone size={22} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {item.nome}
                        </h3>
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {item.origem === "usuario" ? "Projeto Pessoal" : `Extensão • ${item.categoria}`}
                        </p>
                      </div>
                    </div>

                    {/* Badge de Ativação */}
                    <button
                      type="button"
                      onClick={() => lidarAlternarStatus(item.id, item.nome)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border shrink-0",
                        item.ativo
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-xs"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                      )}
                      title={item.ativo ? "Clique para desativar do menu" : "Clique para ativar no menu"}
                    >
                      <Power size={11} className={item.ativo ? "text-emerald-500" : ""} />
                      <span>{item.ativo ? "Ativa" : "Desativada"}</span>
                    </button>
                  </div>

                  {/* Descrição */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[36px]">
                    {item.descricao || "Extensão integrada do Klaus pronta para uso."}
                  </p>
                </div>

                {/* Rodapé do Card com Ações */}
                <div className="pt-4 mt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {item.origem === "usuario" ? (
                      <Selo tom="primario" className="text-[10px]">Repositório Privado</Selo>
                    ) : (
                      <Selo tom="neutro" className="text-[10px]">Catálogo Klaus</Selo>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.origem === "usuario" && (
                      <button
                        type="button"
                        onClick={() => {
                          setProjetoParaEditar(item);
                          setModalCriarAberta(true);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                        title="Editar configurações do projeto"
                      >
                        <Edit3 size={15} />
                      </button>
                    )}

                    <Botao
                      variante={item.ativo ? "primario" : "neutro"}
                      onClick={() => {
                        if (!item.ativo) {
                          lidarAlternarStatus(item.id, item.nome);
                        }
                        navigate(rotaDestino);
                      }}
                      className="text-xs h-8 px-3"
                    >
                      {item.ativo ? "Abrir" : "Ativar e Abrir"}
                    </Botao>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Criar/Editar Projeto */}
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
