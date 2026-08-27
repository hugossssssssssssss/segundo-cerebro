import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Masonry } from "react-plock";
import {
  Plus,
  ImagePlus,
  ScanText,
  FolderOpen,
  LayoutGrid,
  List,
  FolderPlus,
  Columns,
  Sparkles,
  Link as LinkIcon,
  Tag,
  ImageIcon,
} from "lucide-react";
import { lerConfig } from "@/lib/settings";
import { correspondeBusca, lerParametroAbrir } from "@/lib/utils";
import { gravarBinario } from "@/lib/github";
import { invalidarCache } from "@/lib/repo";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import { PASTAS } from "@/lib/tipos";
import { comoReferencia, referenciaParaArquivo } from "@/lib/entidades";
import { escreverMarkdown, tituloProvavel, nomeLivre } from "@/lib/markdown";
import {
  nomeDeImagem,
  arquivoParaBase64,
  todasAsTags,
  baixarImagemPrivada,
  PASTA_REFS,
  PASTA_IMAGENS,
  type Referencia,
} from "@/lib/referencias";
import { prepararImagem, erroDeTamanho } from "@/lib/imagem";
import {
  Aviso,
  Vazio,
  Carregando,
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagemPrivada } from "@/components/ImagemPrivada";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { AlternadorVisao } from "@/components/AlternadorVisao";
import { SeletorOcr } from "@/components/SeletorOcr";
import { BarraFiltrosAvancados, filtrarItensPorRegras, type DefinicaoPropriedade, type RegraFiltro } from "@/components/BarraFiltrosAvancados";
import { DropdownNovoViaModelo } from "@/components/DropdownNovoViaModelo";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { cn } from "@/lib/utils";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import { toast } from "@/lib/toast";

type ModoVisaoRef = "masonry" | "grade" | "lista";

export default function Referencias() {
  const cfg = lerConfig();
  const location = useLocation();
  const navegar = useNavigate();
  const { focarFlutuante } = useItemFlutuante();

  // ── Carregamento (recursivo para suportar subpastas) ─────────────────────
  const { itens: refs, carregando, erro: erroCarregar, recarregar } =
    useItemRepo(cfg, PASTAS.referencias, (item) =>
      comoReferencia(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
      { recursivo: true }
    );

  // ── Salvamento ────────────────────────────────────────────────────────────
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar } = useSalvar(cfg);

  // ── Estado da UI e Filtros Locais (Resetam ao mudar de rota) ───────────────
  const [busca, setBusca] = useState("");
  const [erroLocal, setErroLocal] = useState("");
  const erro = erroLocal || erroCarregar || erroSalvar;

  const [regrasFiltro, setRegrasFiltro] = useState<RegraFiltro[]>([]);

  useEffect(() => {
    setRegrasFiltro([]);
  }, [location.pathname]);

  const [editando, setEditando] = useState<Referencia | null>(null);
  const [origRef, setOrigRef] = useState<Referencia | null>(null);
  const [modoVisaoNotion, setModoVisaoNotion] = useState<ModoVisaoNotion>("popup");
  const [previa, setPrevia] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  // ── OCR com seleção de área ───────────────────────────────────────────────
  const [modoOcr, setModoOcr] = useState(false);
  const [fonteOcrUrl, setFonteOcrUrl] = useState<string | null>(null);

  // ── Pastas ────────────────────────────────────────────────────────────────
  const [pastaAtual, setPastaAtual] = useState("");
  const [pastasCriadas, setPastasCriadas] = useState<string[]>([]);

  // ── Modo de visualização ──────────────────────────────────────────────────
  const [modoVisao, setModoVisao] = useState<ModoVisaoRef>(() => {
    const salvo = localStorage.getItem("klaus_modo_visao_refs");
    return (salvo as ModoVisaoRef) || "masonry";
  });
  useEffect(() => {
    localStorage.setItem("klaus_modo_visao_refs", modoVisao);
  }, [modoVisao]);

  // ── Drag & drop na tela inteira ───────────────────────────────────────────
  const [arrastandoGlobal, setArrastandoGlobal] = useState(false);
  const [arrastandoZona, setArrastandoZona] = useState(false);

  // ── Abre item pela URL ─────────────────────────────────────────────────────
  useEffect(() => {
    const abrirCaminho = lerParametroAbrir(location);
    if (abrirCaminho && refs.length > 0 && (!editando || editando.caminho !== abrirCaminho)) {
      const alvo = refs.find((r) => r.caminho === abrirCaminho);
      if (alvo) {
        setEditando(alvo);
        setOrigRef(alvo);
        navegar(location.pathname, { replace: true });
      }
    }
  }, [location.pathname, location.search, location.hash, refs]);

  // ── Ações de Mídia ────────────────────────────────────────────────────────

  async function enviarImagem(escolhido: File, refExistente?: Referencia | null) {
    const refAlvo = refExistente !== undefined ? refExistente : editando;
    setErroLocal("");

    try {
      const preparada = await prepararImagem(escolhido);
      const excedeu = erroDeTamanho(preparada);
      if (excedeu) {
        setErroLocal(excedeu);
        return;
      }

      const arquivo = preparada.arquivo;
      const nome = nomeDeImagem(escolhido.name);
      const caminhoImagem = `${PASTA_IMAGENS}/${nome}`;
      const base64 = await arquivoParaBase64(arquivo);

      await gravarBinario(cfg, caminhoImagem, base64, `adicionar imagem: ${nome}`);
      invalidarCache();

      const blobUrl = URL.createObjectURL(arquivo);
      setPrevia(blobUrl);

      const agora = new Date();
      const formatador = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const tituloPadrao = `Referência ${formatador.format(agora)}`;

      if (refAlvo) {
        const atualizado = {
          ...refAlvo,
          titulo: refAlvo.titulo.trim() || tituloPadrao,
          imagem: caminhoImagem,
        };
        setEditando(atualizado);
        setOrigRef(atualizado);
        toast("Mídia carregada com sucesso!");
      } else {
        // Criando nova referência direta via Drag & Drop ou Paste
        const novaRef: Referencia = {
          bruto: {},
          caminho: "",
          sha: "",
          id: "",
          titulo: tituloPadrao,
          imagem: caminhoImagem,
          fonte: "",
          tags: [],
          porque: "",
          corpo: "",
        };
        setEditando(novaRef);
        setOrigRef(novaRef);
        toast("Nova referência criada a partir da imagem!");
      }
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : String(e));
    }
  }

  // OCR por seleção de área na imagem
  async function abrirOcr() {
    if (!editando?.imagem && !previa) return;
    try {
      if (previa) {
        setFonteOcrUrl(previa);
        setModoOcr(true);
        return;
      }
      if (editando?.imagem) {
        const blobUrl = await baixarImagemPrivada(cfg, editando.imagem);
        setFonteOcrUrl(blobUrl);
        setModoOcr(true);
      }
    } catch (e) {
      setErroLocal(`Não foi possível carregar a imagem para leitura OCR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function aoExtrairTextoOcr(textoExtraido: string) {
    if (!editando) return;
    const corpoAtual = editando.corpo ? editando.corpo.trim() : "";
    const novoCorpo = corpoAtual ? `${corpoAtual}\n\n> 🔍 **Texto extraído (OCR):**\n> ${textoExtraido.replace(/\n/g, "\n> ")}` : `> 🔍 **Texto extraído (OCR):**\n> ${textoExtraido.replace(/\n/g, "\n> ")}`;
    
    setEditando({
      ...editando,
      corpo: novoCorpo,
    });
    setModoOcr(false);
    toast("Texto extraído e inserido nas anotações da referência!");
  }

  // ── Drag & Drop e Paste Global ────────────────────────────────────────────
  useEffect(() => {
    const aoArrastarSobreGlobal = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes("Files")) {
        setArrastandoGlobal(true);
      }
    };

    const aoSairArrastoGlobal = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX === 0 && e.clientY === 0) {
        setArrastandoGlobal(false);
      }
    };

    const aoSoltarGlobal = (e: DragEvent) => {
      e.preventDefault();
      setArrastandoGlobal(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
          enviarImagem(file, editando);
        }
      }
    };

    const aoColarGlobal = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
          const file = item.getAsFile();
          if (file) {
            enviarImagem(file, editando);
            break;
          }
        }
      }
    };

    window.addEventListener("dragover", aoArrastarSobreGlobal);
    window.addEventListener("dragleave", aoSairArrastoGlobal);
    window.addEventListener("drop", aoSoltarGlobal);
    window.addEventListener("paste", aoColarGlobal);

    return () => {
      window.removeEventListener("dragover", aoArrastarSobreGlobal);
      window.removeEventListener("dragleave", aoSairArrastoGlobal);
      window.removeEventListener("drop", aoSoltarGlobal);
      window.removeEventListener("paste", aoColarGlobal);
    };
  }, [editando]);

  // ── Criar pasta ────────────────────────────────────────────────────────────
  function criarPasta() {
    const nome = prompt("Nome da nova pasta:")?.trim();
    if (!nome) return;
    const slug = nome.replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
    if (!slug) return;
    const novaPasta = pastaAtual ? `${pastaAtual}/${slug}` : slug;
    setPastasCriadas((atual) => [...new Set([...atual, novaPasta])]);
    setPastaAtual(novaPasta);
  }

  // ── Salvar e fechar ────────────────────────────────────────────────────────
  async function salvar(fechar = true) {
    if (!editando) return;
    setErroLocal("");

    const agora = new Date();
    const formatador = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const tituloFinal = editando.titulo.trim() || `Referência ${formatador.format(agora)}`;

    const refFinal: Referencia = {
      ...editando,
      titulo: tituloFinal,
    };

    const { dados, corpo } = referenciaParaArquivo(refFinal);
    const texto = escreverMarkdown({ dados, corpo });

    const pastaAlvo = pastaAtual ? `${PASTA_REFS}/${pastaAtual}` : PASTA_REFS;
    const caminho = editando.caminho || nomeLivre(pastaAlvo, tituloFinal, refs.map((r) => r.caminho));

    try {
      const novaSha = await salvarTexto(caminho, texto, editando.sha || undefined);
      const salva = { ...refFinal, caminho, sha: novaSha };
      setOrigRef(fechar ? null : salva);
      setEditando(fechar ? null : salva);
      if (fechar) {
        setPrevia(null);
        setModoOcr(false);
      }
      recarregar();
      toast(`Referência "${tituloFinal}" salva!`);
    } catch {
      // Erro tratado no hook useSalvar
    }
  }

  function fecharPainel() {
    salvar(true);
  }

  async function remover(ref: Referencia) {
    if (!ref.caminho) {
      setEditando(null);
      setOrigRef(null);
      return;
    }
    await apagarItem(ref.caminho, ref.sha);
    setEditando(null);
    setOrigRef(null);
    setPrevia(null);
    recarregar();
    toast(`Referência "${ref.titulo}" removida.`);
  }

  function novaReferencia() {
    setEditando({
      bruto: {},
      caminho: "",
      sha: "",
      id: "",
      titulo: "",
      fonte: "",
      tags: [],
      porque: "",
      corpo: "",
    });
    setOrigRef({
      bruto: {},
      caminho: "",
      sha: "",
      id: "",
      titulo: "",
      fonte: "",
      tags: [],
      porque: "",
      corpo: "",
    });
    setPrevia(null);
    setModoOcr(false);
  }

  // ── Filtragem ──────────────────────────────────────────────────────────────
  const todasTags = useMemo(() => todasAsTags(refs), [refs]);

  const pastasDisponiveis = useMemo(() => {
    const setPastas = new Set<string>(pastasCriadas);
    for (const r of refs) {
      if (r.caminho.startsWith(`${PASTA_REFS}/`)) {
        const relativo = r.caminho.slice(`${PASTA_REFS}/`.length);
        const partes = relativo.split("/");
        if (partes.length > 1) {
          partes.pop();
          setPastas.add(partes.join("/"));
        }
      }
    }
    return Array.from(setPastas).sort();
  }, [refs, pastasCriadas]);

  const propriedadesDisponiveis = useMemo<DefinicaoPropriedade[]>(() => {
    return [
      { id: "titulo", rotulo: "Título / Nome", tipo: "texto" },
      { id: "tags", rotulo: "Tags", tipo: "tags", opcoes: todasTags },
      { id: "fonte", rotulo: "Fonte / Link", tipo: "texto" },
      { id: "criado_em", rotulo: "Criado em", tipo: "data" },
      { id: "atualizado_em", rotulo: "Última edição em", tipo: "data" },
      { id: "caminho", rotulo: "Pasta / Caminho", tipo: "texto" },
    ];
  }, [todasTags]);

  const visiveis = useMemo(() => {
    let lista = refs.filter((r) => {
      if (pastaAtual) {
        const prefixo = `${PASTA_REFS}/${pastaAtual}/`;
        if (!r.caminho.startsWith(prefixo)) return false;
      }
      if (busca && !correspondeBusca(r.titulo, busca) && !correspondeBusca(r.porque, busca) && !correspondeBusca(r.corpo, busca)) {
        return false;
      }
      return true;
    });

    lista = filtrarItensPorRegras(lista, regrasFiltro, (item, propId) => {
      if (propId === "titulo" || propId === "nome") return item.titulo;
      if (propId === "tags") return item.tags || [];
      if (propId === "fonte") return item.fonte;
      if (propId === "criado_em") return item.bruto?.criado || item.bruto?.criado_em;
      if (propId === "atualizado_em") return item.bruto?.atualizado || item.bruto?.atualizado_em;
      if (propId === "caminho") return item.caminho;
      return (item as any)[propId] || item.bruto?.[propId];
    });

    return lista;
  }, [refs, pastaAtual, busca, regrasFiltro]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full pb-10">
      {/* Overlay de Drag & Drop Global */}
      {arrastandoGlobal && (
        <div className="fixed inset-0 z-50 bg-primary/20 backdrop-blur-sm border-4 border-dashed border-primary flex flex-col items-center justify-center p-6 animate-in fade-in duration-150 pointer-events-none">
          <div className="bg-card/95 p-6 rounded-3xl shadow-2xl border border-border flex flex-col items-center gap-3 text-center max-w-sm">
            <div className="h-16 w-16 rounded-full bg-primary/15 text-primary flex items-center justify-center animate-bounce">
              <ImagePlus size={32} />
            </div>
            <h3 className="font-bold text-base text-foreground">Solte a mídia aqui</h3>
            <p className="text-xs text-muted-foreground">
              A imagem ou vídeo será salvo instantaneamente como uma nova referência visual no Klaus.
            </p>
          </div>
        </div>
      )}

      <CabecalhoPagina
        titulo="Referências Visuais"
        descricao="Seu mural de inspirações, fotos, vídeos, cores e referências de design."
        icone={<ImageIcon size={20} />}
        corIcone="bg-purple-500/10 text-purple-600 dark:text-purple-400"
        acoes={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={criarPasta}
              className="gap-2 text-xs text-muted-foreground hover:text-foreground bg-background shadow-2xs"
            >
              <FolderPlus size={14} />
              <span>Nova Pasta</span>
            </Button>

            <DropdownNovoViaModelo
              rotuloPrincipal="Nova Referência"
              iconePrincipal={<Plus size={14} />}
              aoCriarNovo={novaReferencia}
              aoCriarComTemplate={(t) => {
                setEditando({
                  bruto: t.frontmatter || {},
                  caminho: "",
                  sha: "",
                  id: "",
                  titulo: t.titulo,
                  fonte: "",
                  tags: Array.isArray(t.frontmatter?.tags) ? t.frontmatter.tags : [],
                  porque: "",
                  corpo: t.corpoPadrao || "",
                });
                setOrigRef(null);
              }}
            />
          </>
        }
      />

      {/* Navegação de Pastas */}
      {pastasDisponiveis.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap bg-card/60 border border-border/70 p-2 rounded-2xl text-xs">
          <button
            onClick={() => setPastaAtual("")}
            className={cn(
              "px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              pastaAtual === ""
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <FolderOpen size={13} />
            <span>Todas as Referências ({refs.length})</span>
          </button>

          {pastasDisponiveis.map((p) => {
            const count = refs.filter((r) => r.caminho.startsWith(`${PASTA_REFS}/${p}/`)).length;
            const nomeExibicao = p.split("/").pop() || p;
            return (
              <button
                key={p}
                onClick={() => setPastaAtual(p === pastaAtual ? "" : p)}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5",
                  pastaAtual === p
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <span>{nomeExibicao}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Barra de Ferramentas e Filtros */}
      <div className="space-y-3">
        <BarraFerramentas
          busca={busca}
          aoMudarBusca={setBusca}
          placeholderBusca="Buscar inspirações, cores, notas..."
          filtros={
            <BarraFiltrosAvancados
              propriedadesDisponiveis={propriedadesDisponiveis}
              regras={regrasFiltro}
              aoMudarRegras={setRegrasFiltro}
            />
          }
          acoes={
            <AlternadorVisao
              valorAtivo={modoVisao}
              aoAlternar={(v) => setModoVisao(v as ModoVisaoRef)}
              opcoes={[
                { id: "masonry", rotulo: "Mural", icone: <Columns size={14} /> },
                { id: "grade", rotulo: "Grade", icone: <LayoutGrid size={14} /> },
                { id: "lista", rotulo: "Lista", icone: <List size={14} /> },
              ]}
            />
          }
        />
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando texto="Carregando referências e inspirações..." />
      ) : visiveis.length === 0 ? (
        <Vazio
          titulo="Nenhuma referência encontrada"
          descricao="Cole fotos ou vídeos (Ctrl+V) ou arraste para a tela para salvar no Klaus."
          acao={
            <Button onClick={novaReferencia} className="gap-2">
              <Plus size={15} />
              <span>Criar Primeira Referência</span>
            </Button>
          }
        />
      ) : (
        <div>
          {modoVisao === "masonry" ? (
            <Masonry
              items={visiveis}
              config={{
                columns: [1, 2, 3, 4],
                gap: [16, 16, 20, 20],
                media: [640, 768, 1024, 1280],
              }}
              render={(r) => (
                <div
                  key={r.caminho}
                  onClick={() => {
                    if (focarFlutuante(r.caminho)) return;
                    setEditando(r);
                    setOrigRef(r);
                  }}
                  className="group relative rounded-3xl overflow-hidden border border-border/80 bg-card hover:border-purple-500/50 hover:shadow-xl transition-all duration-300 cursor-pointer mb-4"
                >
                  {r.imagem ? (
                    <div className="relative aspect-auto overflow-hidden bg-black/5 dark:bg-black/20">
                      <ImagemPrivada
                        caminho={r.imagem}
                        alt={r.titulo}
                        className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="p-6 bg-secondary/30 flex items-center justify-center text-muted-foreground/50">
                      <ImageIcon size={32} />
                    </div>
                  )}

                  <div className="p-4 space-y-2">
                    <h4 className="font-bold text-sm text-foreground group-hover:text-purple-500 transition-colors">
                      {r.titulo}
                    </h4>

                    {r.porque && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {r.porque}
                      </p>
                    )}

                    {r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {r.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] py-0 px-2">
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            />
          ) : modoVisao === "grade" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {visiveis.map((r) => (
                <div
                  key={r.caminho}
                  onClick={() => {
                    if (focarFlutuante(r.caminho)) return;
                    setEditando(r);
                    setOrigRef(r);
                  }}
                  className="group rounded-3xl overflow-hidden border border-border/80 bg-card hover:border-purple-500/50 hover:shadow-lg transition-all cursor-pointer flex flex-col"
                >
                  <div className="aspect-square bg-black/5 overflow-hidden">
                    {r.imagem ? (
                      <ImagemPrivada caminho={r.imagem} alt={r.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-xs truncate group-hover:text-purple-500">{r.titulo}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visiveis.map((r) => (
                <div
                  key={r.caminho}
                  onClick={() => {
                    if (focarFlutuante(r.caminho)) return;
                    setEditando(r);
                    setOrigRef(r);
                  }}
                  className="p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-accent/60 hover:border-purple-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-secondary/50 shrink-0">
                      {r.imagem ? (
                        <ImagemPrivada caminho={r.imagem} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">{r.titulo}</p>
                      {r.porque && <p className="text-[11px] text-muted-foreground truncate">{r.porque}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">#{t}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editor Notion de Referência Visual Unificado */}
      {editando !== null && (
        <PainelNotionBase
          rotuloTipo="Referência Visual"
          modoVisao={modoVisaoNotion}
          setModoVisao={setModoVisaoNotion}
          titulo={editando.titulo}
          setTitulo={(t) => setEditando({ ...editando, titulo: t })}
          corpo={editando.corpo}
          setCorpo={(c) => setEditando({ ...editando, corpo: c })}
          caminhoItem={editando.caminho}
          dadosProps={{
            porque: editando.porque,
            fonte: editando.fonte,
            tags: editando.tags,
          }}
          onChangeProps={(novosDados) => {
            setEditando({
              ...editando,
              porque: (novosDados.porque as string) || editando.porque,
              fonte: (novosDados.fonte as string) || editando.fonte,
              tags: (novosDados.tags as string[]) || editando.tags,
            });
          }}
          camposFixosProps={{
            porque: { icone: <Sparkles className="h-4 w-4 opacity-50 text-purple-500" />, tipo: "texto" },
            fonte: { icone: <LinkIcon className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "link" },
            tags: { icone: <Tag className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "multiselect" },
          }}
          elementoAcimaCorpo={
            <div className="space-y-3">
              {/* Zona de Mídia Central com Drag & Drop e OCR */}
              {modoOcr && fonteOcrUrl ? (
                <SeletorOcr
                  imagemSrc={fonteOcrUrl}
                  aoExtrairTexto={aoExtrairTextoOcr}
                  aoFechar={() => {
                    setModoOcr(false);
                    if (fonteOcrUrl && fonteOcrUrl !== previa) {
                      URL.revokeObjectURL(fonteOcrUrl);
                    }
                    setFonteOcrUrl(null);
                  }}
                />
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setArrastandoZona(true);
                  }}
                  onDragLeave={() => setArrastandoZona(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setArrastandoZona(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) enviarImagem(file, editando);
                  }}
                  className={cn(
                    "relative rounded-3xl overflow-hidden transition-all border-2 border-dashed flex flex-col items-center justify-center min-h-[220px]",
                    arrastandoZona
                      ? "border-primary bg-primary/10 scale-[1.01]"
                      : previa || editando.imagem
                        ? "border-border/60 bg-secondary/15"
                        : "border-border hover:border-purple-500/50 bg-secondary/20 cursor-pointer"
                  )}
                  onClick={() => {
                    if (!previa && !editando.imagem) inputArquivo.current?.click();
                  }}
                >
                  {previa ? (
                    <img
                      src={previa}
                      alt=""
                      className="max-h-96 w-full rounded-2xl object-contain bg-black/5 dark:bg-black/20"
                    />
                  ) : editando.imagem ? (
                    <ImagemPrivada
                      caminho={editando.imagem}
                      alt=""
                      className="max-h-96 w-full rounded-2xl object-contain bg-black/5 dark:bg-black/20"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2.5">
                      <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <ImagePlus size={24} />
                      </div>
                      <p className="text-xs font-bold text-foreground">
                        Arraste ou cole (Ctrl+V) uma imagem ou vídeo aqui
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        Clique para selecionar arquivo do computador
                      </p>
                    </div>
                  )}

                  {/* Botão flutuante para ler texto via OCR */}
                  {(previa || editando.imagem) && !modoOcr && (
                    <div className="absolute top-3 right-3 z-10">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirOcr();
                        }}
                        className="gap-1.5 text-xs font-semibold shadow-md bg-card/90 backdrop-blur-md hover:bg-card border border-border"
                      >
                        <ScanText size={14} className="text-purple-500" />
                        <span>Extrair Texto (OCR)</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={inputArquivo}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) enviarImagem(f, editando);
                  e.target.value = "";
                }}
              />
            </div>
          }
          salvando={salvando}
          temMudancas={origRef !== null && JSON.stringify(editando) !== JSON.stringify(origRef)}
          aoFechar={fecharPainel}
          aoSalvar={async () => { await salvar(false); }}
          aoRemover={editando.caminho ? async () => { await remover(editando); } : undefined}
          erro={erro}
        />
      )}
    </div>
  );
}
