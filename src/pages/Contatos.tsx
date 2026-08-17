import { useState, useMemo, useCallback, useEffect } from "react";
import {
  FolderTree,
  Plus,
  Search,
  Upload,
  Download,
  Users,
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
  X,
  FileSpreadsheet,
  Sparkles,
  User,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { PASTAS, type Contato } from "@/lib/tipos";
import { comoContato, contatoParaArquivo } from "@/lib/entidades";
import { escreverMarkdown } from "@/lib/markdown";
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
import { Botao, Cartao, Selo, Modal, Carregando } from "@/components/ui";
import { cn } from "@/lib/utils";

type VisaoContatos = "arvore" | "cartoes" | "tabela";

interface PropriedadeItem {
  id: string;
  chave: string;
  valor: string;
  nativa?: boolean; // Se true, é um campo nativo (ex: Cargo, Empresa, Email, Telefone)
}

export default function Contatos() {
  const [cfg] = useState(lerConfig);
  const pronto = configCompleta(cfg);

  // Hook padrão de carregamento do repo
  const { itens: contatosRepo, carregando, erro: erroCarregar, recarregar } = useItemRepo(
    cfg,
    PASTAS.contatos,
    (item) => comoContato(item.doc, item.caminho, item.sha, item.nome.replace(/\.md$/, "")),
  );

  // Hook padrão de salvamento
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar } = useSalvar(cfg);

  // Estado local para atualização otimista (instantânea no salvamento/exclusão)
  const [contatosLocais, setContatosLocais] = useState<Contato[]>([]);

  // Sincroniza estado local quando o repositório é recarregado
  useEffect(() => {
    setContatosLocais(contatosRepo);
  }, [contatosRepo]);

  // Estado da UI
  const [visao, setVisao] = useState<VisaoContatos>("arvore");
  const [termoBusca, setTermoBusca] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("todas");
  const [tagFiltro, setTagFiltro] = useState("todas");

  // Controle de nós expandidos/recolhidos na árvore
  const [recolhidos, setRecolhidos] = useState<Record<string, boolean>>({});

  // Modais
  const [modalEdicaoAberta, setModalEdicaoAberta] = useState(false);
  const [contatoEdicao, setContatoEdicao] = useState<Partial<Contato> | null>(null);

  const [modalCSVAberta, setModalCSVAberta] = useState(false);
  const [textoCSV, setTextoCSV] = useState("");
  const [previewCSV, setPreviewCSV] = useState<ContatoImportadoCSV[]>([]);
  const [selecionadosCSV, setSelecionadosCSV] = useState<Record<number, boolean>>({});
  const [importandoCSV, setImportandoCSV] = useState(false);

  const [modalExcluirAberta, setModalExcluirAberta] = useState(false);
  const [contatoExcluir, setContatoExcluir] = useState<Contato | null>(null);

  // Lista unificada de propriedades (nativas + personalizadas) em edição
  const [listaPropriedades, setListaPropriedades] = useState<PropriedadeItem[]>([]);

  // Listas derivadas de empresas e tags para os seletores de filtro
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

  // Alternar recolher/expandir nó
  const alternarRecolhido = useCallback((id: string) => {
    setRecolhidos((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Abrir modal de novo contato
  const novoContato = (paiIdInicial?: string) => {
    setContatoEdicao({
      titulo: "",
      cargo: "",
      empresa: "",
      email: "",
      telefone: "",
      paiId: paiIdInicial || "",
      tags: [],
      propriedades: {},
      corpo: "",
    });

    setListaPropriedades([
      { id: "cargo", chave: "Cargo", valor: "", nativa: true },
      { id: "empresa", chave: "Empresa", valor: "", nativa: true },
      { id: "email", chave: "E-mail", valor: "", nativa: true },
      { id: "telefone", chave: "Telefone", valor: "", nativa: true },
    ]);

    setModalEdicaoAberta(true);
  };

  // Abrir modal de edição
  const editarContato = (c: Contato) => {
    setContatoEdicao(c);

    // Converte campos nativos e personalizados para a lista unificada de propriedades
    const propsList: PropriedadeItem[] = [
      { id: "cargo", chave: "Cargo", valor: c.cargo || "", nativa: true },
      { id: "empresa", chave: "Empresa", valor: c.empresa || "", nativa: true },
      { id: "email", chave: "E-mail", valor: c.email || "", nativa: true },
      { id: "telefone", chave: "Telefone", valor: c.telefone || "", nativa: true },
    ];

    // Adiciona propriedades personalizadas
    Object.entries(c.propriedades || {}).forEach(([chave, valor]) => {
      propsList.push({
        id: `custom-${chave}`,
        chave,
        valor: String(valor),
        nativa: false,
      });
    });

    setListaPropriedades(propsList);
    setModalEdicaoAberta(true);
  };

  // Salvar contato (Criar / Atualizar) com Atualização Otimista Instantânea
  const handleSalvarContato = async () => {
    if (!contatoEdicao || !contatoEdicao.titulo?.trim()) return;

    // Extrai valores das propriedades nativas e personalizadas da lista unificada
    let cargoVal: string | undefined = undefined;
    let empresaVal: string | undefined = undefined;
    let emailVal: string | undefined = undefined;
    let telefoneVal: string | undefined = undefined;
    const propriedadesCustom: Record<string, string> = {};

    for (const prop of listaPropriedades) {
      const kNorm = prop.chave.trim().toLowerCase();
      const v = prop.valor.trim();

      if (!v) continue; // Propriedade sem valor é omitida/excluída

      if (kNorm === "cargo") {
        cargoVal = v;
      } else if (kNorm === "empresa" || kNorm === "organização" || kNorm === "organizacao") {
        empresaVal = v;
      } else if (kNorm === "e-mail" || kNorm === "email") {
        emailVal = v;
      } else if (kNorm === "telefone" || kNorm === "celular" || kNorm === "whatsapp") {
        telefoneVal = v;
      } else {
        propriedadesCustom[prop.chave.trim()] = v;
      }
    }

    const idExistente = contatoEdicao.id;
    const idSlug = idExistente || slugifyNomeContato(contatoEdicao.titulo);
    const caminho = contatoEdicao.caminho || `${PASTAS.contatos}/${idSlug}.md`;

    const objetoContato: Contato = {
      caminho,
      sha: contatoEdicao.sha || "",
      id: idSlug,
      bruto: contatoEdicao.bruto || {},
      titulo: contatoEdicao.titulo.trim(),
      cargo: cargoVal,
      empresa: empresaVal,
      email: emailVal,
      telefone: telefoneVal,
      paiId: contatoEdicao.paiId?.trim() || undefined,
      tags: contatoEdicao.tags || [],
      propriedades: propriedadesCustom,
      corpo: contatoEdicao.corpo || "",
    };

    // 1. ATUALIZAÇÃO OTIMISTA INSTANTÂNEA NA TELA
    setContatosLocais((prev) => {
      const idx = prev.findIndex((c) => c.id === idSlug);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = objetoContato;
        return copy;
      }
      return [objetoContato, ...prev];
    });

    setModalEdicaoAberta(false);
    setContatoEdicao(null);

    // 2. GRAVAÇÃO NO GITHUB EM SEGUNDO PLANO
    try {
      const doc = contatoParaArquivo(objetoContato);
      const texto = escreverMarkdown(doc);
      await salvarTexto(caminho, texto, contatoEdicao.sha);
      recarregar();
    } catch (e) {
      // Em caso de erro, re-sincroniza o estado do repositório
      recarregar();
    }
  };

  // Excluir Contato com Atualização Otimista Instantânea
  const handleExcluirContato = async () => {
    if (!contatoExcluir) return;
    const itemTarget = contatoExcluir;

    // 1. ATUALIZAÇÃO OTIMISTA NA TELA
    setContatosLocais((prev) => prev.filter((c) => c.id !== itemTarget.id));
    setModalExcluirAberta(false);
    setContatoExcluir(null);

    // 2. GRAVAÇÃO DA REMOÇÃO NO GITHUB
    try {
      await apagarItem(itemTarget.caminho, itemTarget.sha);
      recarregar();
    } catch (e) {
      recarregar();
    }
  };

  // Parsear CSV ao digitar ou carregar
  const handleAnalisarCSV = () => {
    const parsed = parsearCSVContatos(textoCSV);
    setPreviewCSV(parsed);
    const sel: Record<number, boolean> = {};
    parsed.forEach((_, idx) => {
      sel[idx] = true;
    });
    setSelecionadosCSV(sel);
  };

  // Processar arquivo CSV enviado por upload
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

  // Importar contatos selecionados do CSV
  const handleImportarCSV = async () => {
    setImportandoCSV(true);
    try {
      const novosAdicionados: Contato[] = [];

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

        novosAdicionados.push(novo);

        const doc = contatoParaArquivo(novo);
        const texto = escreverMarkdown(doc);
        await salvarTexto(caminho, texto);
      }

      setContatosLocais((prev) => [...novosAdicionados, ...prev]);
      setModalCSVAberta(false);
      setTextoCSV("");
      setPreviewCSV([]);
      recarregar();
    } finally {
      setImportandoCSV(false);
    }
  };

  // Exportar para CSV
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
      <div className="p-8 text-center space-y-4">
        <FolderTree className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
        <h2 className="text-xl font-bold">Ajustes necessários</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Configure seu token do GitHub nos Ajustes para acessar a Árvore de Contatos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Topo / Cabeçalho alinhado ao padrão Klaus */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg p-2 bg-primary/10 text-primary">
              <FolderTree size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Árvore de Contatos</h1>
              <p className="text-xs text-muted-foreground">
                Gerencie pessoas, redes de relacionamento, equipes e hierarquias com propriedades dinâmicas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Botao onClick={() => novoContato()} className="gap-1.5 text-xs font-semibold">
            <Plus size={16} />
            Novo Contato
          </Botao>

          <Botao
            variante="neutro"
            onClick={() => setModalCSVAberta(true)}
            className="gap-1.5 text-xs"
          >
            <Upload size={15} />
            Importar CSV
          </Botao>

          {contatosLocais.length > 0 && (
            <Botao
              variante="neutro"
              onClick={handleExportarCSV}
              className="gap-1.5 text-xs"
              title="Exportar contatos para CSV"
            >
              <Download size={15} />
              Exportar
            </Botao>
          )}
        </div>
      </div>

      {/* Filtros e Alternador de Visão */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80 shadow-xs">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-2.5 min-w-0">
          {/* Busca por texto */}
          <div className="relative w-full sm:w-64 min-w-0">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Buscar por nome, cargo, e-mail..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Filtro Empresa */}
          {empresasDisponiveis.length > 0 && (
            <select
              value={empresaFiltro}
              onChange={(e) => setEmpresaFiltro(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="todas">Todas Empresas ({empresasDisponiveis.length})</option>
              {empresasDisponiveis.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          )}

          {/* Filtro Tag */}
          {tagsDisponiveis.length > 0 && (
            <select
              value={tagFiltro}
              onChange={(e) => setTagFiltro(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="todas">Todas Tags ({tagsDisponiveis.length})</option>
              {tagsDisponiveis.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Botões de alternar visão */}
        <div className="flex items-center gap-1 self-end md:self-auto bg-muted/60 p-1 rounded-lg border border-border/50 shrink-0">
          <button
            onClick={() => setVisao("arvore")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              visao === "arvore"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Visão Hierárquica em Árvore"
          >
            <FolderTree size={14} />
            Árvore
          </button>

          <button
            onClick={() => setVisao("cartoes")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              visao === "cartoes"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Visão em Cartões"
          >
            <LayoutGrid size={14} />
            Cartões
          </button>

          <button
            onClick={() => setVisao("tabela")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              visao === "tabela"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Visão em Tabela"
          >
            <List size={14} />
            Tabela
          </button>
        </div>
      </div>

      {/* Feedback de Carga / Erro */}
      {carregando && contatosLocais.length === 0 && (
        <div className="py-12 flex justify-center">
          <Carregando texto="Carregando contatos..." />
        </div>
      )}

      {(erroCarregar || erroSalvar) && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {erroCarregar || erroSalvar}
        </div>
      )}

      {contatosFiltrados.length === 0 && (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl p-8 bg-card/40">
          <Users size={40} className="mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-semibold">Nenhum contato encontrado</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {termoBusca || empresaFiltro !== "todas" || tagFiltro !== "todas"
              ? "Tente ajustar os filtros ou o termo de busca."
              : "Adicione seu primeiro contato ou importe uma lista via CSV."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Botao onClick={() => novoContato()} className="gap-1.5 text-xs">
              <Plus size={14} />
              Criar Contato
            </Botao>
          </div>
        </div>
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
                  aoEditar={(c) => editarContato(c)}
                  aoExcluir={(c) => {
                    setContatoExcluir(c);
                    setModalExcluirAberta(true);
                  }}
                />
              ))}
            </div>
          )}

          {/* 2. VISÃO EM CARTÕES (GRID) */}
          {visao === "cartoes" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contatosFiltrados.map((c) => (
                <CartaoContato
                  key={c.id}
                  contato={c}
                  todosContatos={contatosLocais}
                  aoNovoFilho={(paiId) => novoContato(paiId)}
                  aoEditar={(c) => editarContato(c)}
                  aoExcluir={(c) => {
                    setContatoExcluir(c);
                    setModalExcluirAberta(true);
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
                      <tr key={c.id} className="hover:bg-accent/40 transition-colors">
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
                        <td className="px-4 py-3 space-y-0.5">
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
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => novoContato(c.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                              title="Adicionar Subordinado / Filho"
                            >
                              <UserPlus size={14} />
                            </button>
                            <button
                              onClick={() => editarContato(c)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              title="Editar Contato"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setContatoExcluir(c);
                                setModalExcluirAberta(true);
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              title="Excluir Contato"
                            >
                              <Trash2 size={14} />
                            </button>
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

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE CONTATO COM PROPRIEDADES UNIFICADAS E COMBOBOX BUSCÁVEL */}
      <Modal
        aberto={modalEdicaoAberta}
        aoFechar={() => setModalEdicaoAberta(false)}
        titulo={contatoEdicao?.id ? "Editar Contato" : "Novo Contato"}
      >
        <div className="space-y-4 text-xs max-h-[75dvh] overflow-y-auto pr-1">
          {/* Nome Completo */}
          <div>
            <label className="block font-medium mb-1 text-foreground">
              Nome Completo <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Roberto Mendes"
              value={contatoEdicao?.titulo || ""}
              onChange={(e) =>
                setContatoEdicao((prev) => ({ ...prev, titulo: e.target.value }))
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-semibold text-sm"
            />
          </div>

          {/* Vínculo Hierárquico Buscável (Combobox para escalabilidade com +100 contatos) */}
          <div>
            <label className="block font-medium mb-1 text-foreground">
              Vínculo Hierárquico (Responde a / Chefe / Contato Pai)
            </label>
            <SeletorContatoPaiBuscavel
              contatos={contatosLocais}
              contatoAtualId={contatoEdicao?.id}
              paiIdSelecionado={contatoEdicao?.paiId}
              aoSelecionar={(novoPaiId) =>
                setContatoEdicao((prev) => ({ ...prev, paiId: novoPaiId }))
              }
            />
          </div>

          {/* TABELA UNIFICADA DE PROPRIEDADES (Cargo, Empresa, Email, Telefone + Customizadas) */}
          <div className="border-t border-border pt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" />
                Propriedades do Contato
              </label>
              <button
                type="button"
                onClick={() =>
                  setListaPropriedades((prev) => [
                    ...prev,
                    { id: `custom-${Date.now()}`, chave: "", valor: "", nativa: false },
                  ])
                }
                className="text-primary hover:underline text-[11px] font-medium flex items-center gap-1"
              >
                <Plus size={13} /> Add Nova Propriedade
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Todas as informações (E-mail, Telefone, Cargo, etc.) são propriedades editáveis e podem ser removidas clicando no ícone da lixeira.
            </p>

            <div className="space-y-2 bg-muted/30 p-2.5 rounded-xl border border-border/60">
              {listaPropriedades.map((prop, idx) => (
                <div key={prop.id || idx} className="flex items-center gap-2">
                  {/* Nome da Propriedade */}
                  <input
                    type="text"
                    placeholder="Propriedade (ex: LinkedIn)"
                    value={prop.chave}
                    readOnly={prop.nativa}
                    onChange={(e) => {
                      if (prop.nativa) return;
                      const copy = [...listaPropriedades];
                      copy[idx].chave = e.target.value;
                      setListaPropriedades(copy);
                    }}
                    className={cn(
                      "w-32 sm:w-36 shrink-0 rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:ring-primary",
                      prop.nativa
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-background text-foreground",
                    )}
                  />

                  {/* Valor da Propriedade */}
                  <input
                    type="text"
                    placeholder={`Valor ${prop.chave ? `de ${prop.chave}` : ""}`}
                    value={prop.valor}
                    onChange={(e) => {
                      const copy = [...listaPropriedades];
                      copy[idx].valor = e.target.value;
                      setListaPropriedades(copy);
                    }}
                    className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />

                  {/* Botão de Excluir Propriedade */}
                  <button
                    type="button"
                    onClick={() =>
                      setListaPropriedades((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
                    title={`Remover propriedade "${prop.chave}"`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block font-medium mb-1 text-foreground">
              Tags (separadas por vírgula)
            </label>
            <input
              type="text"
              placeholder="Ex: Trabalho, VIP, Cliente"
              value={(contatoEdicao?.tags || []).join(", ")}
              onChange={(e) => {
                const arr = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                setContatoEdicao((prev) => ({ ...prev, tags: arr }));
              }}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Notas / Corpo Markdown */}
          <div>
            <label className="block font-medium mb-1 text-foreground">Notas e Observações</label>
            <textarea
              rows={3}
              placeholder="Anotações adicionais em Markdown..."
              value={contatoEdicao?.corpo || ""}
              onChange={(e) =>
                setContatoEdicao((prev) => ({ ...prev, corpo: e.target.value }))
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {erroSalvar && <div className="text-destructive text-xs">{erroSalvar}</div>}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Botao variante="neutro" onClick={() => setModalEdicaoAberta(false)}>
              Cancelar
            </Botao>
            <Botao
              onClick={handleSalvarContato}
              disabled={salvando || !contatoEdicao?.titulo?.trim()}
            >
              {salvando ? "Salvando..." : "Salvar Contato"}
            </Botao>
          </div>
        </div>
      </Modal>

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

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal
        aberto={modalExcluirAberta}
        aoFechar={() => setModalExcluirAberta(false)}
        titulo="Excluir Contato"
      >
        <div className="space-y-4 text-xs">
          <p className="text-foreground">
            Tem certeza de que deseja excluir o contato <strong>{contatoExcluir?.titulo}</strong>?
            Esta ação removerá o arquivo no GitHub e não poderá ser desfeita.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Botao variante="neutro" onClick={() => setModalExcluirAberta(false)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" onClick={handleExcluirContato} disabled={salvando}>
              {salvando ? "Excluindo..." : "Sim, Excluir"}
            </Botao>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * Componente Seletor de Contato Pai Buscável (Combobox).
 * Permite filtrar facilmente centenas de contatos digitando partes do nome, cargo ou empresa.
 */
function SeletorContatoPaiBuscavel({
  contatos,
  contatoAtualId,
  paiIdSelecionado,
  aoSelecionar,
}: {
  contatos: Contato[];
  contatoAtualId?: string;
  paiIdSelecionado?: string;
  aoSelecionar: (id?: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");

  const contatoPaiAtual = useMemo(() => {
    return contatos.find((c) => c.id === paiIdSelecionado);
  }, [contatos, paiIdSelecionado]);

  const contatosFiltrados = useMemo(() => {
    return contatos.filter((c) => {
      if (contatoAtualId && c.id === contatoAtualId) return false;
      if (!termoBusca.trim()) return true;
      const b = termoBusca.toLowerCase();
      return (
        c.titulo.toLowerCase().includes(b) ||
        (c.cargo || "").toLowerCase().includes(b) ||
        (c.empresa || "").toLowerCase().includes(b)
      );
    });
  }, [contatos, contatoAtualId, termoBusca]);

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex-1 flex items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-xs text-left text-foreground hover:bg-accent/40 focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          {contatoPaiAtual ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                {contatoPaiAtual.titulo.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium truncate">{contatoPaiAtual.titulo}</span>
              {contatoPaiAtual.cargo && (
                <span className="text-muted-foreground truncate text-[11px]">
                  ({contatoPaiAtual.cargo})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">Nenhum (Contato Raiz)</span>
          )}
          <ChevronsUpDown size={14} className="text-muted-foreground shrink-0" />
        </button>

        {paiIdSelecionado && (
          <button
            type="button"
            onClick={() => aoSelecionar(undefined)}
            className="p-2 rounded-lg border border-input text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Remover vínculo hierárquico"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {aberto && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-xl p-2 space-y-2 max-h-60 flex flex-col">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Digitar para buscar contato..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              autoFocus
              className="w-full rounded-md border border-input bg-background pl-8 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-border/50">
            <button
              type="button"
              onClick={() => {
                aoSelecionar(undefined);
                setAberto(false);
              }}
              className="w-full text-left p-2 text-xs font-medium hover:bg-accent rounded-md flex items-center justify-between text-muted-foreground"
            >
              <span>Nenhum (Contato Raiz)</span>
              {!paiIdSelecionado && <Check size={14} className="text-primary" />}
            </button>

            {contatosFiltrados.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Nenhum contato encontrado.
              </div>
            ) : (
              contatosFiltrados.map((c) => {
                const selecionado = c.id === paiIdSelecionado;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      aoSelecionar(c.id);
                      setAberto(false);
                    }}
                    className={cn(
                      "w-full text-left p-2 text-xs hover:bg-accent rounded-md flex items-center justify-between gap-2 transition-colors",
                      selecionado && "bg-primary/10 text-primary font-semibold",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {c.titulo.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{c.titulo}</p>
                        {(c.cargo || c.empresa) && (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {c.cargo} {c.empresa ? `• ${c.empresa}` : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    {selecionado && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
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
        className={cn(
          "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card hover:border-primary/40 transition-all shadow-2xs",
          no.nivel > 0 && "ml-4 sm:ml-8 border-l-4 border-l-primary/30",
        )}
      >
        {/* Lado Esquerdo: Expansor + Avatar + Informações principais */}
        <div className="flex items-start gap-3 min-w-0">
          {temFilhos ? (
            <button
              onClick={() => aoAlternarRecolhido(c.id)}
              className="mt-0.5 p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
              aria-label={estaRecolhido ? "Expandir" : "Recolher"}
            >
              {estaRecolhido ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          ) : (
            <div className="w-6 shrink-0" />
          )}

          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0">
            {c.titulo.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-sm text-foreground truncate">{c.titulo}</h3>
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
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Mail size={12} /> {c.email}
                </a>
              )}
              {c.telefone && (
                <a
                  href={`tel:${c.telefone}`}
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
        <div className="flex items-center gap-1 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
          <button
            onClick={() => aoNovoFilho(c.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            title="Adicionar contato subordinado / vinculado a este"
          >
            <UserPlus size={14} />
            <span className="hidden sm:inline">Add Subordinado</span>
          </button>

          <button
            onClick={() => aoEditar(c)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Editar contato"
          >
            <Edit2 size={14} />
          </button>

          <button
            onClick={() => aoExcluir(c)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Excluir contato"
          >
            <Trash2 size={14} />
          </button>
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
    <Cartao className="flex flex-col justify-between p-4 space-y-3 relative group hover:border-primary/50 transition-all">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0">
              {c.titulo.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground line-clamp-1">{c.titulo}</h3>
              {c.cargo && <p className="text-xs text-muted-foreground line-clamp-1">{c.cargo}</p>}
            </div>
          </div>

          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => aoEditar(c)}
              className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Editar"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => aoExcluir(c)}
              className="p-1 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
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
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors truncate"
            >
              <Mail size={13} className="shrink-0" />
              <span className="truncate">{c.email}</span>
            </a>
          )}
          {c.telefone && (
            <a
              href={`tel:${c.telefone}`}
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

        <button
          onClick={() => aoNovoFilho(c.id)}
          className="text-primary hover:underline text-[11px] font-medium flex items-center gap-1 shrink-0 ml-auto"
          title="Adicionar Subordinado / Contato vinculado"
        >
          <UserPlus size={12} />
          + Subordinado
        </button>
      </div>
    </Cartao>
  );
}
