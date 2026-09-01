import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FolderTree,
  Plus,
  Upload,
  Download,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  Mail,
  Phone,
  Briefcase,
  Building,
  UserPlus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  User,
  Tag,
  MoreVertical,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { lerConfig, configCompleta } from "@/lib/settings";
import { PASTAS, type Contato } from "@/lib/tipos";
import { comoContato, contatoParaArquivo } from "@/lib/entidades";
import {
  escreverMarkdown,
  tituloProvavel,
  nomeLivre,
  type Frontmatter,
} from "@/lib/markdown";
import { lerParametroAbrir, lerParametroCriar } from "@/lib/utils";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import {
  construirArvoreContatos,
  filtrarContatos,
  parsearCSVContatos,
  exportarCSVContatos,
  slugifyNomeContato,
  type NoContato,
  type ContatoImportadoCSV,
} from "@/lib/contatos";
import { Botao, Cartao, Selo, Modal, Carregando, ModalConfirmacao, Vazio } from "@/components/ui";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { propagarRenomeacaoId } from "@/lib/links";
import { carregarRepo } from "@/lib/repo";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { AlternadorVisao } from "@/components/AlternadorVisao";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type VisaoContatos = "arvore" | "cartoes" | "tabela";

type ContatoAberto = Contato & {
  original: { titulo: string; corpo: string; bruto?: Frontmatter };
};

export default function Contatos() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();
  const { abrirFlutuante, focarFlutuante } = useItemFlutuante();

  // ── Carregamento do repositório ─────────────────────────────────────────────
  const { itens: contatosRepo, acervo, carregando, erro: erroCarregar, recarregar } = useItemRepo(
    cfg,
    PASTAS.contatos,
    (item) => comoContato(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
  );

  // ── Salvamento no repositório ───────────────────────────────────────────────
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar, limparErro } = useSalvar(cfg);
  const erro = erroCarregar || erroSalvar;

  // Estado local para atualização otimista instantânea
  const [contatosLocais, setContatosLocais] = useState<Contato[]>([]);

  useEffect(() => {
    setContatosLocais(contatosRepo);
  }, [contatosRepo]);

  // ── Estado da UI ──────────────────────────────────────────────────────────
  const [visao, setVisao] = useState<VisaoContatos>("arvore");
  const [modoVisaoPanel, setModoVisaoPanel] = useState<ModoVisaoNotion>("popup");
  const [termoBusca, setTermoBusca] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("todas");
  const [tagFiltro, setTagFiltro] = useState("todas");

  // Item aberto para edição no Painel Notion
  const [aberto, setAberta] = useState<ContatoAberto | null>(null);

  // Controle de nós expandidos/recolhidos na árvore
  const [recolhidos, setRecolhidos] = useState<Record<string, boolean>>({});

  // Modal CSV
  const [modalCSVAberta, setModalCSVAberta] = useState(false);
  const [textoCSV, setTextoCSV] = useState("");
  const [previewCSV, setPreviewCSV] = useState<ContatoImportadoCSV[]>([]);
  const [selecionadosCSV, setSelecionadosCSV] = useState<Record<number, boolean>>({});
  const [importandoCSV, setImportandoCSV] = useState(false);

  // Relacionamentos para a propriedade "pai_id" no Notion (Combobox de contatos)
  const opcoesRelacionamentoContatos = useMemo(() => {
    return contatosLocais
      .filter((c) => c.id !== aberto?.id)
      .map((c) => ({
        titulo: `${c.titulo}${c.cargo ? ` (${c.cargo})` : ""}${c.empresa ? ` - ${c.empresa}` : ""}`,
        caminho: c.id,
      }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [contatosLocais, aberto?.id]);

  // Listas derivadas para os filtros
  const empresasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const c of contatosLocais) {
      if (c.empresa?.trim()) set.add(c.empresa.trim());
    }
    return Array.from(set).sort();
  }, [contatosLocais]);

  const tagsDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const c of contatosLocais) {
      for (const t of c.tags) {
        if (t.trim()) set.add(t.trim());
      }
    }
    return Array.from(set).sort();
  }, [contatosLocais]);

  // Contatos filtrados
  const contatosFiltrados = useMemo(() => {
    return filtrarContatos(contatosLocais, termoBusca, empresaFiltro, tagFiltro);
  }, [contatosLocais, termoBusca, empresaFiltro, tagFiltro]);

  // Estrutura em Árvore Hierárquica
  const arvoreContatos = useMemo(() => {
    return construirArvoreContatos(contatosFiltrados);
  }, [contatosFiltrados]);

  // ── Abre contato pela URL ──────────────────────────────────────────────────
  const processouUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const urlAtual = `${location.pathname}${location.search}${location.hash}`;
    if (processouUrlRef.current === urlAtual) return;

    if (lerParametroCriar(location, ["novo", "nova"])) {
      processouUrlRef.current = urlAtual;
      const caminhoNovo = nomeLivre(PASTAS.contatos, "Novo Contato", contatosLocais.map((c) => c.caminho));
      const c = comoContato({ dados: { titulo: "Novo Contato", tipo: "contato" }, corpo: "" }, caminhoNovo, "", "Novo Contato");
      setAberta({ ...c, original: { titulo: c.titulo, corpo: c.corpo, bruto: c.bruto } });
      return;
    }

    const abrirCaminho = lerParametroAbrir(location);
    if (!abrirCaminho) return;
    if (acervo.length > 0) {
      if (focarFlutuante(abrirCaminho)) return;
      const alvo = acervo.find((a) => a.caminho === abrirCaminho);
      if (alvo) {
        processouUrlRef.current = urlAtual;
        const contato = comoContato(alvo.doc, alvo.caminho, alvo.sha, tituloProvavel(alvo.doc, alvo.nome));
        setAberta({ ...contato, original: { titulo: contato.titulo, corpo: contato.corpo, bruto: contato.bruto } });
      }
    }
  }, [location.pathname, location.search, location.hash, acervo.length > 0]);

  // Rastreamento de alterações não salvas
  const mudou = aberto
    ? aberto.titulo !== aberto.original.titulo ||
      aberto.corpo !== aberto.original.corpo ||
      JSON.stringify(aberto.bruto) !== JSON.stringify(aberto.original.bruto)
    : false;

  const mudouRef = useRef(mudou);
  mudouRef.current = mudou;

  const [mostrarConfirmacaoDescarte, setMostrarConfirmacaoDescarte] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    history.pushState({ editor: true }, "");
    const aoVoltar = () => {
      if (mudouRef.current) {
        setMostrarConfirmacaoDescarte(true);
        history.pushState({ editor: true }, "");
        return;
      }
      fecharContato();
    };
    addEventListener("popstate", aoVoltar);
    return () => removeEventListener("popstate", aoVoltar);
  }, [aberto !== null]);

  // Modo flutuante
  useEffect(() => {
    if (modoVisaoPanel === "flutuante" && aberto) {
      const contatoOriginal = { ...aberto };
      abrirFlutuante({
        id: contatoOriginal.caminho,
        rotuloTipo: "Contato",
        titulo: contatoOriginal.titulo,
        corpo: contatoOriginal.corpo,
        dadosProps: contatoOriginal.bruto,
        camposFixosProps: {
          cargo: { icone: <Briefcase className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "texto" },
          empresa: { icone: <Building className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "texto" },
          email: { icone: <Mail className="h-4 w-4 opacity-50 text-indigo-500" />, tipo: "texto" },
          telefone: { icone: <Phone className="h-4 w-4 opacity-50 text-purple-500" />, tipo: "texto" },
          pai_id: { icone: <User className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "relation" },
          tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
        },
        caminho: contatoOriginal.caminho,
        sha: contatoOriginal.sha,
        temMudancas: mudou,
        salvando,
        erro,
        opcoesRelacionamento: opcoesRelacionamentoContatos,
        aoSalvar: async (itemFlutuanteAtual) => {
          const titulo = itemFlutuanteAtual.titulo.trim() || "Novo Contato";
          const bruto = itemFlutuanteAtual.dadosProps || {};

          const objetoContato: Contato = comoContato(
            { dados: { ...bruto, titulo, tipo: "contato" }, corpo: itemFlutuanteAtual.corpo },
            itemFlutuanteAtual.caminho || `${PASTAS.contatos}/${slugifyNomeContato(titulo)}.md`,
            itemFlutuanteAtual.sha || "",
            titulo,
          );

          const { dados, corpo } = contatoParaArquivo(objetoContato);
          const texto = escreverMarkdown({ dados, corpo });
          const caminho = itemFlutuanteAtual.caminho || nomeLivre(PASTAS.contatos, titulo, contatosLocais.map((c) => c.caminho));
          await salvarTexto(caminho, texto, itemFlutuanteAtual.sha || undefined);
          recarregar();
        },
        aoRemover: contatoOriginal.caminho
          ? async () => {
              await apagarItem(contatoOriginal.caminho, contatoOriginal.sha);
              recarregar();
            }
          : undefined,
      });
      setAberta(null);
      setModoVisaoPanel("popup");
    }
  }, [modoVisaoPanel, aberto]);

  // ── Ações de Contato ──────────────────────────────────────────────────────
  const fecharContato = useCallback(() => {
    setAberta(null);
    limparErro();
    navegar(location.pathname, { replace: true });
  }, [limparErro, navegar, location.pathname]);

  const { fecharFlutuante, estaAbertoFlutuante } = useItemFlutuante();

  const abrirContato = (c: Contato) => {
    if (estaAbertoFlutuante(c.caminho)) {
      fecharFlutuante();
    }
    if (aberto && aberto.caminho !== c.caminho && mudou) {
      salvarContato(aberto).catch((err) => {
        toast(`Erro ao salvar alterações do contato anterior: ${err?.message || "Falha na gravação"}`, { tipo: "erro" });
      });
    }
    setAberta({ ...c, original: { titulo: c.titulo, corpo: c.corpo, bruto: c.bruto } });
    navegar(`?abrir=${encodeURIComponent(c.caminho)}`, { replace: true });
  };

  const novoContato = (paiIdInicial?: string) => {
    const brutoInicial: Frontmatter = {
      tipo: "contato",
      cargo: "",
      empresa: "",
      email: "",
      telefone: "",
      pai_id: paiIdInicial || "",
      tags: [],
    };

    const contatoVazio: ContatoAberto = {
      bruto: brutoInicial,
      caminho: "",
      sha: "",
      id: "",
      titulo: "",
      cargo: "",
      empresa: "",
      email: "",
      telefone: "",
      paiId: paiIdInicial || "",
      tags: [],
      propriedades: {},
      corpo: "",
      original: { titulo: "", corpo: "", bruto: brutoInicial },
    };

    setAberta(contatoVazio);
  };

  const salvarContato = async (alvo?: ContatoAberto) => {
    const c = alvo || aberto;
    if (!c) return;

    const titulo = c.titulo.trim() || "Novo Contato";

    // Atualiza objeto de dados com os campos principais
    const brutoComCampos: Frontmatter = {
      ...c.bruto,
      titulo,
      tipo: "contato",
    };

    const objetoContato: Contato = comoContato(
      { dados: brutoComCampos, corpo: c.corpo },
      c.caminho || `${PASTAS.contatos}/${slugifyNomeContato(titulo)}.md`,
      c.sha || "",
      titulo,
    );

    const { dados, corpo } = contatoParaArquivo(objetoContato);
    const texto = escreverMarkdown({ dados, corpo });
    const caminho = c.caminho || nomeLivre(PASTAS.contatos, titulo, contatosLocais.map((item) => item.caminho));

    const contatosAnteriores = contatosLocais;

    // 1. ATUALIZAÇÃO OTIMISTA NA TELA
    setContatosLocais((prev) => {
      const idx = prev.findIndex((item) => item.caminho === caminho);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...objetoContato, caminho };
        return copy;
      }
      return [{ ...objetoContato, caminho }, ...prev];
    });

    // 2. GRAVAÇÃO NO GITHUB
    try {
      const novaSha = await salvarTexto(caminho, texto, c.sha || undefined);

      // Se o ID do contato mudou, propaga para subordinados que tenham este contato como pai_id
      const idOriginal = typeof c.original?.bruto?.id === "string" ? c.original.bruto.id : typeof c.original?.titulo === "string" ? c.original.titulo : "";
      if (idOriginal && c.id && idOriginal !== c.id) {
        const todos = await carregarRepo(cfg);
        await propagarRenomeacaoId(cfg, todos, idOriginal, c.id);
      }

      setAberta((atual) => {
        if (!atual || (atual.caminho !== caminho && atual.caminho !== "")) return atual;
        return {
          ...atual,
          caminho,
          sha: novaSha,
          titulo,
          bruto: dados,
          original: { titulo, corpo, bruto: dados },
        };
      });

      recarregar();
    } catch (err: any) {
      setContatosLocais(contatosAnteriores);
      toast(`Erro ao salvar contato no GitHub: ${err?.message || "Falha na gravação"}`, { tipo: "erro" });
    }
  };

  const removerContato = async () => {
    if (!aberto?.caminho) return;

    const contatosAnteriores = contatosLocais;
    const caminhoAlvo = aberto.caminho;

    try {
      await apagarItem(aberto.caminho, aberto.sha);
      setContatosLocais((prev) => prev.filter((c) => c.caminho !== caminhoAlvo));
      fecharContato();
      recarregar();
    } catch (err: any) {
      setContatosLocais(contatosAnteriores);
      toast(`Erro ao excluir contato no GitHub: ${err?.message || "Falha na exclusão"}`, { tipo: "erro" });
    }
  };

  // Alternar nó da árvore
  const alternarRecolhido = useCallback((id: string) => {
    setRecolhidos((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // CSV
  const handleAnalisarCSV = () => {
    const parsed = parsearCSVContatos(textoCSV);
    setPreviewCSV(parsed);
    const sel: Record<number, boolean> = {};
    parsed.forEach((_, idx) => {
      sel[idx] = true;
    });
    setSelecionadosCSV(sel);
  };

  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const txt = evt.target?.result as string;
      if (txt) {
        setTextoCSV(txt);
        const parsed = parsearCSVContatos(txt);
        setPreviewCSV(parsed);
        const sel: Record<number, boolean> = {};
        parsed.forEach((_, idx) => {
          sel[idx] = true;
        });
        setSelecionadosCSV(sel);
      }
    };
    reader.readAsText(file);
  };

  const handleImportarCSV = async () => {
    setImportandoCSV(true);
    let sucessos = 0;
    let falhas = 0;
    const novosAdicionados: Contato[] = [];

    try {
      for (let i = 0; i < previewCSV.length; i++) {
        if (!selecionadosCSV[i]) continue;
        const item = previewCSV[i];
        const idSlug = slugifyNomeContato(item.titulo);
        const caminho = `${PASTAS.contatos}/${idSlug}.md`;

        const novo: Contato = {
          caminho,
          sha: "",
          id: idSlug,
          bruto: {},
          titulo: item.titulo,
          cargo: item.cargo,
          empresa: item.empresa,
          email: item.email,
          telefone: item.telefone,
          paiId: item.paiId,
          tags: item.tags,
          propriedades: item.propriedades,
          corpo: item.corpo,
        };

        const doc = contatoParaArquivo(novo);
        const texto = escreverMarkdown(doc);
        try {
          const sha = await salvarTexto(caminho, texto);
          novosAdicionados.push({ ...novo, sha });
          sucessos++;
        } catch {
          falhas++;
        }
      }

      if (novosAdicionados.length > 0) {
        setContatosLocais((prev) => [...novosAdicionados, ...prev]);
      }

      if (falhas === 0 && sucessos > 0) {
        toast(`Importados ${sucessos} contatos com sucesso!`, { tipo: "sucesso" });
      } else if (sucessos > 0 && falhas > 0) {
        toast(`Importados ${sucessos} contatos com sucesso. ${falhas} falharam.`, { tipo: "aviso" });
      } else if (falhas > 0 && sucessos === 0) {
        toast(`Falha ao importar contatos. Os ${falhas} contatos falharam ao gravar no GitHub.`, { tipo: "erro" });
      }

      setModalCSVAberta(false);
      setTextoCSV("");
      setPreviewCSV([]);
      recarregar();
    } catch (err: any) {
      toast(`Erro ao processar importação de CSV: ${err?.message || "Falha na importação"}`, { tipo: "erro" });
    } finally {
      setImportandoCSV(false);
    }
  };

  const handleExportarCSV = () => {
    const csvContent = exportarCSVContatos(contatosLocais);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `klaus-contatos-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!pronto) {
    return (
      <Vazio
        titulo="Falta conectar sua conta"
        descricao="Para acessar a Árvore de Contatos, preencha sua conta do GitHub e o token na aba de Ajustes."
        acao={
          <Link to="/config">
            <Botao>Ir para Ajustes</Botao>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Topo / Cabeçalho no layout padrão Klaus */}
      <CabecalhoPagina
        titulo="Árvore de Contatos"
        descricao="Gerencie pessoas, redes de relacionamento, equipes e hierarquias com facilidade."
        icone={<FolderTree size={20} />}
        corIcone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        acoes={
          <div className="flex items-center gap-1.5">
            <Botao onClick={() => novoContato()} className="gap-1.5 text-xs font-semibold">
              <Plus size={15} />
              <span>Novo Contato</span>
            </Botao>

            <Popover>
              <Tooltip conteudo="Opções de contatos e importação" posicao="bottom">
                <PopoverTrigger asChild>
                  <Botao
                    variante="neutro"
                    tamanho="icone"
                    className="h-10 w-10 text-muted-foreground hover:text-foreground"
                    aria-label="Mais opções"
                  >
                    <MoreVertical size={16} />
                  </Botao>
                </PopoverTrigger>
              </Tooltip>
              <PopoverContent align="end" className="w-52 p-1.5 space-y-1">
                <button
                  onClick={() => setModalCSVAberta(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-accent transition-colors"
                >
                  <Upload size={14} className="opacity-70 shrink-0" />
                  <span>Importar CSV</span>
                </button>

                {contatosLocais.length > 0 && (
                  <button
                    onClick={handleExportarCSV}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-accent transition-colors"
                  >
                    <Download size={14} className="opacity-70 shrink-0" />
                    <span>Exportar para CSV</span>
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        }
      />

      {/* Filtros e Alternador de Visão */}
      <BarraFerramentas
        busca={termoBusca}
        aoMudarBusca={setTermoBusca}
        placeholderBusca="Buscar por nome, cargo, e-mail..."
        filtros={
          <>
            {empresasDisponiveis.length > 0 && (
              <select
                value={empresaFiltro}
                onChange={(e) => setEmpresaFiltro(e.target.value)}
                className="w-full sm:w-auto rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
              >
                <option value="todas">Todas Empresas ({empresasDisponiveis.length})</option>
                {empresasDisponiveis.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            )}

            {tagsDisponiveis.length > 0 && (
              <select
                value={tagFiltro}
                onChange={(e) => setTagFiltro(e.target.value)}
                className="w-full sm:w-auto rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
              >
                <option value="todas">Todas Tags ({tagsDisponiveis.length})</option>
                {tagsDisponiveis.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            )}
          </>
        }
        acoes={
          <AlternadorVisao
            valorAtivo={visao}
            aoAlternar={(v) => setVisao(v as VisaoContatos)}
            opcoes={[
              { id: "arvore", rotulo: "Árvore", icone: <FolderTree size={14} /> },
              { id: "cartoes", rotulo: "Cartões", icone: <LayoutGrid size={14} /> },
              { id: "tabela", rotulo: "Tabela", icone: <List size={14} /> },
            ]}
          />
        }
      />

      {/* Feedback de Carga / Erro */}
      {carregando && contatosLocais.length === 0 && (
        <div className="py-12 flex justify-center">
          <Carregando texto="Carregando contatos..." />
        </div>
      )}

      {erro && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {erro}
        </div>
      )}

      {contatosFiltrados.length === 0 && !carregando && (
        <Vazio
          titulo="Nenhum contato encontrado"
          descricao={
            termoBusca || empresaFiltro !== "todas" || tagFiltro !== "todas"
              ? "Tente ajustar os filtros ou o termo de busca."
              : "Adicione seu primeiro contato ou importe uma lista via CSV."
          }
          acao={
            <Botao onClick={() => novoContato()} className="gap-1.5 text-xs">
              <Plus size={14} />
              Criar Contato
            </Botao>
          }
        />
      )}

      {/* CONTEÚDO DA TELA POR VISÃO */}
      {contatosFiltrados.length > 0 && (
        <>
          {/* 1. VISÃO EM ÁRVORE HIERÁRQUICA */}
          {visao === "arvore" && (
            <div className="space-y-4">
              {arvoreContatos.map((no) => (
                <ItemNoArvore
                  key={no.contato.id}
                  no={no}
                  recolhidos={recolhidos}
                  aoAlternarRecolhido={alternarRecolhido}
                  aoNovoFilho={(paiId) => novoContato(paiId)}
                  aoEditar={(c) => abrirContato(c)}
                  aoExcluir={(c) => {
                    setAberta({ ...c, original: { titulo: c.titulo, corpo: c.corpo, bruto: c.bruto } });
                    removerContato();
                  }}
                />
              ))}
            </div>
          )}

          {/* 2. VISÃO EM CARTÕES (GRID) */}
          {visao === "cartoes" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {contatosFiltrados.map((c) => (
                <CartaoContato
                  key={c.id}
                  contato={c}
                  todosContatos={contatosLocais}
                  aoNovoFilho={(paiId) => novoContato(paiId)}
                  aoEditar={(c) => abrirContato(c)}
                  aoExcluir={(c) => {
                    setAberta({ ...c, original: { titulo: c.titulo, corpo: c.corpo, bruto: c.bruto } });
                    removerContato();
                  }}
                />
              ))}
            </div>
          )}

          {/* 3. VISÃO EM TABELA */}
          {visao === "tabela" && (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Contato Directo</th>
                    <th className="px-4 py-3">Vínculo (Pai)</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contatosFiltrados.map((c) => {
                    const paiObj = contatosLocais.find((p) => p.id === c.paiId);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => abrirContato(c)}
                        className="hover:bg-accent/40 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {c.titulo.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate">{c.titulo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{c.cargo || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.empresa || "—"}</td>
                        <td className="px-4 py-3 space-y-0.5" onClick={(e) => e.stopPropagation()}>
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Mail size={12} /> {c.email}
                            </a>
                          )}
                          {c.telefone && (
                            <a
                              href={`tel:${c.telefone}`}
                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Phone size={12} /> {c.telefone}
                            </a>
                          )}
                          {!c.email && !c.telefone && <span className="text-muted-foreground/60">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {paiObj ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium">
                              <User size={11} /> {paiObj.titulo}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip conteudo="Adicionar Subordinado / Filho">
                              <button
                                onClick={() => novoContato(c.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-primary transition-colors cursor-pointer"
                                aria-label="Adicionar Subordinado"
                              >
                                <UserPlus size={14} />
                              </button>
                            </Tooltip>
                            <Tooltip conteudo="Editar Contato">
                              <button
                                onClick={() => abrirContato(c)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                                aria-label="Editar Contato"
                              >
                                <Edit2 size={14} />
                              </button>
                            </Tooltip>
                            <Tooltip conteudo="Excluir Contato">
                              <button
                                onClick={() => {
                                  setAberta({ ...c, original: { titulo: c.titulo, corpo: c.corpo, bruto: c.bruto } });
                                  removerContato();
                                }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                                aria-label="Excluir Contato"
                              >
                                <Trash2 size={14} />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* PAINEL NOTION PADRÃO (EXATAMENTE COMO NOTAS E TAREFAS) */}
      {aberto && (
        <PainelNotionBase
          rotuloTipo="Contato"
          modoVisao={modoVisaoPanel}
          setModoVisao={setModoVisaoPanel}
          titulo={aberto.titulo}
          setTitulo={(t) => setAberta({ ...aberto, titulo: t })}
          corpo={aberto.corpo}
          setCorpo={(c) => setAberta({ ...aberto, corpo: c })}
          dadosProps={aberto.bruto}
          onChangeProps={(novosDados) => setAberta({ ...aberto, bruto: novosDados })}
          camposFixosProps={{
            cargo: { icone: <Briefcase className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "texto" },
            empresa: { icone: <Building className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "texto" },
            email: { icone: <Mail className="h-4 w-4 opacity-50 text-indigo-500" />, tipo: "texto" },
            telefone: { icone: <Phone className="h-4 w-4 opacity-50 text-purple-500" />, tipo: "texto" },
            pai_id: { icone: <User className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "relation" },
            tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
          }}
          salvando={salvando}
          temMudancas={mudou}
          aoFechar={fecharContato}
          aoSalvar={async () => {
            if (aberto) await salvarContato(aberto);
          }}
          aoRemover={aberto.caminho ? async () => { await removerContato(); } : undefined}
          erro={erro}
          opcoesRelacionamento={opcoesRelacionamentoContatos}
        />
      )}

      {/* MODAL DE CONFIRMAÇÃO DE DESCARTE */}
      <ModalConfirmacao
        aberto={mostrarConfirmacaoDescarte}
        titulo="Descartar alterações não salvas?"
        descricao="Você possui edições neste contato que ainda não foram salvas. Deseja descartar as alterações?"
        textoConfirmar="Descartar Alterações"
        varianteConfirmar="perigo"
        aoConfirmar={() => {
          setMostrarConfirmacaoDescarte(false);
          fecharContato();
        }}
        aoCancelar={() => setMostrarConfirmacaoDescarte(false)}
      />

      {/* MODAL DE IMPORTAÇÃO CSV */}
      <Modal
        aberto={modalCSVAberta}
        aoFechar={() => setModalCSVAberta(false)}
        titulo="Importar Contatos via CSV"
      >
        <div className="space-y-4 text-xs">
          <p className="text-muted-foreground">
            Envie ou cole os dados CSV com colunas como <code>Nome, Cargo, Empresa, Email, Telefone, Pai, Tags</code>.
          </p>

          <div className="space-y-2">
            <label className="block font-medium text-foreground">Upload de Arquivo .csv</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleUploadCSV}
              className="block w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-foreground">Ou cole o texto CSV</label>
            <textarea
              rows={4}
              placeholder="Nome;Cargo;Empresa;Email;Telefone&#10;Roberto;Diretor;Acme;roberto@acme.com;119999"
              value={textoCSV}
              onChange={(e) => setTextoCSV(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-mono focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-between items-center">
            <Botao variante="neutro" onClick={handleAnalisarCSV} disabled={!textoCSV.trim()}>
              <FileSpreadsheet size={14} className="mr-1" />
              Analisar CSV
            </Botao>

            <span className="text-muted-foreground text-[11px]">
              {previewCSV.length > 0 && `${previewCSV.length} contatos encontrados`}
            </span>
          </div>

          {previewCSV.length > 0 && (
            <div className="max-h-52 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-muted sticky top-0 border-b border-border">
                  <tr>
                    <th className="p-2">Importar</th>
                    <th className="p-2">Nome</th>
                    <th className="p-2">Cargo</th>
                    <th className="p-2">Empresa</th>
                    <th className="p-2">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewCSV.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(selecionadosCSV[idx])}
                          onChange={(e) =>
                            setSelecionadosCSV((prev) => ({ ...prev, [idx]: e.target.checked }))
                          }
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="p-2 font-medium">{item.titulo}</td>
                      <td className="p-2 text-muted-foreground">{item.cargo || "—"}</td>
                      <td className="p-2 text-muted-foreground">{item.empresa || "—"}</td>
                      <td className="p-2 text-muted-foreground">{item.email || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Botao variante="neutro" onClick={() => setModalCSVAberta(false)}>
              Cancelar
            </Botao>
            <Botao
              onClick={handleImportarCSV}
              disabled={importandoCSV || previewCSV.length === 0}
            >
              {importandoCSV ? "Importando..." : "Confirmar Importação"}
            </Botao>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// COMPONENTE: ITEM DA ÁRVORE HIERÁRQUICA (RECURSIVO)
function ItemNoArvore({
  no,
  recolhidos,
  aoAlternarRecolhido,
  aoNovoFilho,
  aoEditar,
  aoExcluir,
}: {
  no: NoContato;
  recolhidos: Record<string, boolean>;
  aoAlternarRecolhido: (id: string) => void;
  aoNovoFilho: (paiId: string) => void;
  aoEditar: (c: Contato) => void;
  aoExcluir: (c: Contato) => void;
}) {
  const c = no.contato;
  const estaRecolhido = Boolean(recolhidos[c.id]);
  const temFilhos = no.filhos.length > 0;

  return (
    <div className="space-y-2 select-none">
      {/* Nó do Contato */}
      <div
        onClick={() => aoEditar(c)}
        className={cn(
          "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card hover:bg-accent/40 transition-colors cursor-pointer",
          no.nivel > 0 && "ml-4 sm:ml-8 border-l-4 border-l-primary/30",
        )}
      >
        {/* Lado Esquerdo: Expansor + Avatar + Informações principais */}
        <div className="flex items-start gap-3 min-w-0">
          {temFilhos ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                aoAlternarRecolhido(c.id);
              }}
              className="mt-0.5 p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
              aria-label={estaRecolhido ? "Expandir" : "Recolher"}
            >
              {estaRecolhido ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          ) : (
            <div className="w-6 shrink-0" />
          )}

          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0">
            {c.titulo ? c.titulo.charAt(0).toUpperCase() : "?"}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-sm text-foreground truncate">{c.titulo || "Sem nome"}</h3>
              {c.cargo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[11px] text-muted-foreground font-medium">
                  <Briefcase size={10} /> {c.cargo}
                </span>
              )}
              {c.empresa && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                  <Building size={10} /> {c.empresa}
                </span>
              )}
            </div>

            {/* Informações de Contato / Tags */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Mail size={12} /> {c.email}
                </a>
              )}
              {c.telefone && (
                <a
                  href={`tel:${c.telefone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Phone size={12} /> {c.telefone}
                </a>
              )}
              {c.tags.map((t) => (
                <span key={t} className="text-[10px] text-muted-foreground/80 font-mono">
                  #{t}
                </span>
              ))}
            </div>

            {/* Propriedades Personalizadas */}
            {Object.keys(c.propriedades).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(c.propriedades).map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/60 text-[10px] text-accent-foreground font-medium"
                  >
                    <span className="font-semibold">{k}:</span> {v}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Ações Rápida */}
        <div
          className="flex items-center gap-1 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip conteudo="Adicionar contato subordinado / vinculado a este">
            <button
              onClick={() => aoNovoFilho(c.id)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              aria-label="Adicionar subordinado"
            >
              <UserPlus size={14} />
              <span className="hidden sm:inline">Add Subordinado</span>
            </button>
          </Tooltip>

          <Tooltip conteudo="Editar contato">
            <button
              onClick={() => aoEditar(c)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              aria-label="Editar contato"
            >
              <Edit2 size={14} />
            </button>
          </Tooltip>

          <Tooltip conteudo="Excluir contato">
            <button
              onClick={() => aoExcluir(c)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
              aria-label="Excluir contato"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Renderização Recursiva de Filhos */}
      {temFilhos && !estaRecolhido && (
        <div className="space-y-2 relative pl-2 sm:pl-4 border-l border-border/50 ml-4 sm:ml-6">
          {no.filhos.map((filhoNo) => (
            <ItemNoArvore
              key={filhoNo.contato.id}
              no={filhoNo}
              recolhidos={recolhidos}
              aoAlternarRecolhido={aoAlternarRecolhido}
              aoNovoFilho={aoNovoFilho}
              aoEditar={aoEditar}
              aoExcluir={aoExcluir}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// COMPONENTE: CARTÃO DE CONTATO (GRID VIEW)
function CartaoContato({
  contato: c,
  todosContatos,
  aoNovoFilho,
  aoEditar,
  aoExcluir,
}: {
  contato: Contato;
  todosContatos: Contato[];
  aoNovoFilho: (paiId: string) => void;
  aoEditar: (c: Contato) => void;
  aoExcluir: (c: Contato) => void;
}) {
  const paiObj = todosContatos.find((p) => p.id === c.paiId);

  return (
    <Cartao
      onClick={() => aoEditar(c)}
      className="flex flex-col justify-between p-4 space-y-3 relative group hover:bg-accent/30 transition-colors cursor-pointer"
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0">
              {c.titulo ? c.titulo.charAt(0).toUpperCase() : "?"}
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground line-clamp-1">{c.titulo || "Sem nome"}</h3>
              {c.cargo && <p className="text-xs text-muted-foreground line-clamp-1">{c.cargo}</p>}
            </div>
          </div>

          <div
            className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip conteudo="Editar">
              <button
                onClick={() => aoEditar(c)}
                className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                aria-label="Editar"
              >
                <Edit2 size={13} />
              </button>
            </Tooltip>
            <Tooltip conteudo="Excluir">
              <button
                onClick={() => aoExcluir(c)}
                className="p-1 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                aria-label="Excluir"
              >
                <Trash2 size={13} />
              </button>
            </Tooltip>
          </div>
        </div>

        {c.empresa && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] text-muted-foreground font-medium">
            <Building size={11} /> {c.empresa}
          </div>
        )}

        {paiObj && (
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <User size={11} className="text-primary" />
            <span>Responde a: </span>
            <span className="font-medium text-foreground">{paiObj.titulo}</span>
          </div>
        )}

        <div className="space-y-1 text-xs pt-1 border-t border-border/50">
          {c.email && (
            <a
              href={`mailto:${c.email}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors truncate"
            >
              <Mail size={13} className="shrink-0" />
              <span className="truncate">{c.email}</span>
            </a>
          )}
          {c.telefone && (
            <a
              href={`tel:${c.telefone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone size={13} className="shrink-0" />
              <span>{c.telefone}</span>
            </a>
          )}
        </div>

        {Object.keys(c.propriedades).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Object.entries(c.propriedades).map(([k, v]) => (
              <span
                key={k}
                className="px-1.5 py-0.5 rounded bg-accent/70 text-[10px] text-foreground font-medium"
              >
                {k}: {v}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <div className="flex flex-wrap gap-1">
          {c.tags.map((t) => (
            <Selo key={t} tom="neutro" className="text-[9px] px-1.5 py-0">
              #{t}
            </Selo>
          ))}
        </div>

        <Tooltip conteudo="Adicionar Subordinado / Contato vinculado">
          <button
            onClick={(e) => {
              e.stopPropagation();
              aoNovoFilho(c.id);
            }}
            className="text-primary hover:underline text-[11px] font-medium flex items-center gap-1 shrink-0 ml-auto cursor-pointer"
            aria-label="Adicionar Subordinado"
          >
            <UserPlus size={12} />
            + Subordinado
          </button>
        </Tooltip>
      </div>
    </Cartao>
  );
}
