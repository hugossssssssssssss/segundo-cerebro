import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Masonry } from "react-plock";
import {
  Plus,
  Trash2,
  ImagePlus,
  ExternalLink,
  ScanText,
  FolderOpen,
  ChevronRight,
  LayoutGrid,
  List,
  FolderPlus,
  Columns,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { correspondeBusca, lerParametroAbrir, lerParametroCriar } from "@/lib/utils";
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
import { prepararImagem, resumoCompressao, erroDeTamanho } from "@/lib/imagem";
import {
  Botao,
  Campo,
  Aviso,
  Vazio,
  Carregando,
  Modal,
  ModalConfirmacao,
  Rotulo,
  TagInput,
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagemPrivada } from "@/components/ImagemPrivada";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { AlternadorVisao } from "@/components/AlternadorVisao";
import { CartaoItem } from "@/components/CartaoItem";
import { SeletorOcr } from "@/components/SeletorOcr";
import { BarraFiltrosAvancados, filtrarPorDataPreset, type FiltroDataPreset } from "@/components/BarraFiltrosAvancados";
import { DropdownNovoViaModelo } from "@/components/DropdownNovoViaModelo";
import { cn } from "@/lib/utils";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import { toast } from "@/lib/toast";

type ModoVisaoRef = "masonry" | "grade" | "lista";

export default function Referencias() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
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
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar, limparErro } = useSalvar(cfg);

  // ── Estado da UI e Filtros Locais (Resetam ao mudar de rota) ───────────────
  const [busca, setBusca] = useState("");
  const [erroLocal, setErroLocal] = useState("");
  const erro = erroLocal || erroCarregar || erroSalvar;

  const [tagsFiltro, setTagsFiltro] = useState<string[]>([]);
  const [filtroDataCriacao, setFiltroDataCriacao] = useState<FiltroDataPreset>("qualquer");
  const [filtroDataAtualizacao, setFiltroDataAtualizacao] = useState<FiltroDataPreset>("qualquer");

  // Reset de filtros locais ao mudar de rota
  useEffect(() => {
    setTagsFiltro([]);
    setFiltroDataCriacao("qualquer");
    setFiltroDataAtualizacao("qualquer");
  }, [location.pathname]);

  const [enviando, setEnviando] = useState(false);
  const [encolhendo, setEncolhendo] = useState(false);
  const [nota, setNota] = useState("");
  const [editando, setEditando] = useState<Referencia | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [paletasExtraidas, setPaletasExtraidas] = useState<Record<string, string[]>>({});
  const [corCopiada, setCorCopiada] = useState<string | null>(null);
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

  // ── Drag & drop na zona de imagem ─────────────────────────────────────────
  const [arrastando, setArrastando] = useState(false);

  // ── Abre item pela URL ─────────────────────────────────────────────────────
  useEffect(() => {
    const abrirCaminho = lerParametroAbrir(location);
    if (abrirCaminho && refs.length > 0 && (!editando || editando.caminho !== abrirCaminho)) {
      const alvo = refs.find((r) => r.caminho === abrirCaminho);
      if (alvo) {
        setEditando(alvo);
        navegar(location.pathname, { replace: true });
      }
    }
  }, [location.pathname, location.search, location.hash, refs]);

  // ── Ações de Mídia ────────────────────────────────────────────────────────

  async function enviarImagem(escolhido: File) {
    if (!editando) return;
    setEnviando(true);
    setErroLocal("");
    setNota("");

    try {
      setEncolhendo(true);
      let preparada;
      try {
        preparada = await prepararImagem(escolhido);
      } finally {
        setEncolhendo(false);
      }

      const excedeu = erroDeTamanho(preparada);
      if (excedeu) {
        setErroLocal(excedeu);
        return;
      }

      const arquivo = preparada.arquivo;
      const nome = nomeDeImagem(escolhido.name);
      const base64 = await arquivoParaBase64(arquivo);
      const pastaImg = pastaAtual ? `${PASTA_IMAGENS}/${pastaAtual}` : PASTA_IMAGENS;
      await gravarBinario(cfg, `${pastaImg}/${nome}`, base64);
      invalidarCache();

      const relativo = pastaAtual ? `imagens/${pastaAtual}/${nome}` : `imagens/${nome}`;
      setEditando({
        ...editando,
        imagem: relativo,
        corpo: editando.corpo.includes(relativo)
          ? editando.corpo
          : `![](${relativo})\n\n${editando.corpo}`.trim(),
      });

      setPrevia((antiga) => {
        if (antiga) URL.revokeObjectURL(antiga);
        const novaUrl = URL.createObjectURL(arquivo);

        const img = new Image();
        img.src = novaUrl;
        import("@/lib/paleta")
          .then(({ extrairPaletaDaImagem }) => extrairPaletaDaImagem(img))
          .then((paleta) => {
            if (paleta.length > 0) {
              setEditando((prev) =>
                prev ? { ...prev, bruto: { ...prev.bruto, paleta } } : null,
              );
            }
          })
          .catch(() => {});

        return novaUrl;
      });

      setNota(resumoCompressao(preparada));
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  async function abrirOcr() {
    if (!editando?.imagem && !previa) {
      setErroLocal("Adicione uma imagem antes de extrair o texto.");
      return;
    }

    setErroLocal("");
    try {
      const url = previa ?? await baixarImagemPrivada(cfg, editando!.imagem!);
      setFonteOcrUrl(url);
      setModoOcr(true);
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : String(e));
    }
  }

  function aoExtrairTextoOcr(texto: string) {
    import("@/lib/ocr").then(({ anexarTextoLido }) => {
      setEditando((prev) =>
        prev ? { ...prev, corpo: anexarTextoLido(prev.corpo, texto) } : null,
      );
    });
    setModoOcr(false);
    setNota(`Texto extraído (${texto.length} caracteres) adicionado ao documento.`);
    if (fonteOcrUrl && fonteOcrUrl !== previa) {
      URL.revokeObjectURL(fonteOcrUrl);
    }
    setFonteOcrUrl(null);
  }

  async function salvar() {
    const titulo = editando?.titulo?.trim() || "Sem Título";
    const ref = editando ? { ...editando, titulo } : editando;
    if (!ref) return;
    setErroLocal("");
    try {
      const { dados, corpo } = referenciaParaArquivo(ref);
      const texto = escreverMarkdown({ dados, corpo });
      const pastaRef = pastaAtual ? `${PASTA_REFS}/${pastaAtual}` : PASTA_REFS;
      const caminho = ref.caminho ||
        nomeLivre(pastaRef, titulo, refs.map((x) => x.caminho));
      await salvarTexto(caminho, texto, ref.sha || undefined);
      fecharModal();
      recarregar();
    } catch {
      // erro gerenciado por useSalvar
    }
  }

  const [referenciaParaExcluir, setReferenciaParaExcluir] = useState<Referencia | null>(null);

  async function remover(r: Referencia) {
    setReferenciaParaExcluir(r);
  }

  async function confirmarRemocao() {
    if (!referenciaParaExcluir) return;
    await apagarItem(referenciaParaExcluir.caminho, referenciaParaExcluir.sha);
    setReferenciaParaExcluir(null);
    fecharModal();
    recarregar();
  }

  function fecharModal() {
    setEditando(null);
    setNota("");
    setModoOcr(false);
    limparErro();
    setErroLocal("");
    setPrevia((p) => {
      if (p) URL.revokeObjectURL(p);
      return null;
    });
    if (fonteOcrUrl && fonteOcrUrl !== previa) {
      URL.revokeObjectURL(fonteOcrUrl);
    }
    setFonteOcrUrl(null);
  }

  const nova = () => {
    const vazia: Referencia = {
      bruto: { tipo: "referencia" },
      caminho: "",
      id: "",
      sha: "",
      titulo: "",
      tags: [],
      porque: "",
      corpo: "",
    };
    setEditando(vazia);
  };

  const processouUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const urlAtual = `${location.pathname}${location.search}${location.hash}`;
    if (processouUrlRef.current === urlAtual) return;

    if (lerParametroCriar(location, ["upload", "nova", "novo"])) {
      processouUrlRef.current = urlAtual;
      nova();
      return;
    }

    const abrirCaminho = lerParametroAbrir(location);
    if (!abrirCaminho) return;

    if (refs.length > 0) {
      if (focarFlutuante(abrirCaminho)) return;
      const refAlvo = refs.find((r) => r.caminho === abrirCaminho);
      if (refAlvo) {
        processouUrlRef.current = urlAtual;
        setEditando(refAlvo);
      }
    }
  }, [location.pathname, location.search, location.hash, refs.length > 0]);

  // ── Drag & drop listeners para a área de imagem ─────────────────────────
  function aoArrastarSobre(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setArrastando(true);
  }

  function aoSairArrasto(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setArrastando(false);
  }

  function aoSoltar(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setArrastando(false);
    const arquivos = e.dataTransfer.files;
    if (arquivos.length > 0 && (arquivos[0].type.startsWith("image/") || arquivos[0].type.startsWith("video/"))) {
      enviarImagem(arquivos[0]);
    }
  }

  // Colar imagem do clipboard
  useEffect(() => {
    if (!editando) return;
    const aoColar = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const arquivo = item.getAsFile();
          if (arquivo) enviarImagem(arquivo);
          return;
        }
      }
    };
    window.addEventListener("paste", aoColar);
    return () => window.removeEventListener("paste", aoColar);
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
    toast(`Pasta "${slug}" criada`, { tipo: "sucesso" });
  }

  // ── Sem configuração ────────────────────────────────────────────────────────
  if (!pronto) {
    return (
      <Vazio
        titulo="Falta conectar sua conta"
        descricao="Preencha sua conta do GitHub e o token na aba de Ajustes."
        acao={
          <Link to="/config">
            <Botao>Ir para Ajustes</Botao>
          </Link>
        }
      />
    );
  }

  // ── Pastas e filtragem ────────────────────────────────────────────────────
  const todasRefs = refs;
  const naPasta = todasRefs.filter((a) => {
    const partes = a.caminho.split("/");
    if (a.caminho.includes("/imagens/")) return false;
    const pastaDoItem = partes.slice(1, -1).join("/");
    return pastaDoItem === pastaAtual;
  });

  const subpastas = useMemo(() => {
    const set = new Set<string>();
    for (const a of todasRefs) {
      if (a.caminho.includes("/imagens/")) continue;
      const partes = a.caminho.split("/");
      if (partes.length > 2) {
        const pastaDoItem = partes.slice(1, -1).join("/");
        if (pastaDoItem.startsWith(pastaAtual ? `${pastaAtual}/` : "")) {
          const resto = pastaDoItem.slice(pastaAtual ? pastaAtual.length + 1 : 0);
          const primeira = resto.split("/")[0];
          if (primeira && primeira !== "imagens") set.add(primeira);
        }
      }
    }
    for (const p of pastasCriadas) {
      if (pastaAtual) {
        if (p.startsWith(`${pastaAtual}/`)) {
          const resto = p.slice(pastaAtual.length + 1);
          const primeira = resto.split("/")[0];
          if (primeira) set.add(primeira);
        }
      } else {
        const primeira = p.split("/")[0];
        if (primeira) set.add(primeira);
      }
    }
    return [...set].sort();
  }, [todasRefs, pastaAtual, pastasCriadas]);

  const tags = todasAsTags(naPasta);

  const visiveis = naPasta
    .filter((r) => tagsFiltro.length === 0 || tagsFiltro.every((tf) => r.tags.includes(tf)))
    .filter((r) => {
      const dataCriado = (r.bruto.criado_em || r.bruto.criado || r.bruto.data) as string | undefined;
      return filtrarPorDataPreset(dataCriado, filtroDataCriacao);
    })
    .filter((r) => {
      const dataAtualizado = (r.bruto.atualizado || r.bruto.ultima_edicao) as string | undefined;
      return filtrarPorDataPreset(dataAtualizado, filtroDataAtualizacao);
    })
    .filter((r) =>
      correspondeBusca(r.titulo, busca) ||
      correspondeBusca(r.corpo, busca) ||
      r.tags.some((t) => correspondeBusca(t, busca))
    );

  const partesPasta = pastaAtual ? pastaAtual.split("/") : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Referências Visuais"
        descricao="Inspirações, referências visuais, paletas e ideias para seus projetos."
        icone={<ImagePlus size={20} />}
        corIcone="bg-pink-500/10 text-pink-600 dark:text-pink-400"
        acoes={
          <div className="flex items-center gap-2">
            <Botao variante="neutro" onClick={criarPasta}>
              <FolderPlus size={16} />
              Nova Pasta
            </Botao>
            <DropdownNovoViaModelo
              rotuloPrincipal="Nova Referência"
              iconePrincipal={<Plus size={16} />}
              aoCriarNovo={nova}
              categoria="design"
              aoCriarComTemplate={(t) => {
                const vazia: Referencia = {
                  bruto: { ...t.frontmatter, tipo: "referencia" },
                  caminho: "",
                  id: "",
                  sha: "",
                  titulo: t.titulo || "Nova Referência",
                  tags: t.frontmatter.tags || [],
                  porque: "",
                  corpo: t.corpoPadrao || "",
                };
                setEditando(vazia);
              }}
            />
          </div>
        }
      />

      {/* Trilha de Navegação de Pastas (Breadcrumbs) */}
      {pastaAtual && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs bg-muted/40 px-3 py-2 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setPastaAtual("")}
            className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <FolderOpen size={14} />
            Referências
          </button>
          {partesPasta.map((parte, i) => {
            const caminhoAteAqui = partesPasta.slice(0, i + 1).join("/");
            const ehUltima = i === partesPasta.length - 1;
            return (
              <span key={caminhoAteAqui} className="flex items-center gap-1.5">
                <ChevronRight size={13} className="text-muted-foreground opacity-50" />
                {ehUltima ? (
                  <span className="font-semibold text-foreground">{parte}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPastaAtual(caminhoAteAqui)}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    {parte}
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Barra de Ferramentas com Busca, Alternador de Visão e BarraFiltrosAvancados */}
      <BarraFerramentas
        busca={busca}
        aoMudarBusca={setBusca}
        placeholderBusca="Buscar referências por título, texto ou tags..."
        acoes={
          <AlternadorVisao
            valorAtivo={modoVisao}
            aoAlternar={(v) => setModoVisao(v as ModoVisaoRef)}
            opcoes={[
              { id: "masonry", rotulo: "Painel", icone: <Columns size={15} /> },
              { id: "grade", rotulo: "Grade", icone: <LayoutGrid size={15} /> },
              { id: "lista", rotulo: "Lista", icone: <List size={15} /> },
            ]}
          />
        }
        filtros={
          <BarraFiltrosAvancados
            todasTags={tags}
            tagsFiltro={tagsFiltro}
            aoMudarTags={setTagsFiltro}
            filtroData={filtroDataCriacao}
            aoMudarFiltroData={setFiltroDataCriacao}
            filtroAtualizacao={filtroDataAtualizacao}
            aoMudarFiltroAtualizacao={setFiltroDataAtualizacao}
          />
        }
      />

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando texto="Buscando referências visuais…" />
      ) : todasRefs.length === 0 && subpastas.length === 0 ? (
        <Vazio
          icone={<ImagePlus size={28} />}
          titulo="Nenhuma referência ainda"
          descricao="Salve imagens, links de inspiração e paletas visuais para os seus projetos."
          acao={<Botao onClick={nova}>Adicionar primeira referência</Botao>}
        />
      ) : naPasta.length === 0 && subpastas.length === 0 ? (
        <Vazio
          icone={<FolderOpen size={28} />}
          titulo="Pasta vazia"
          descricao="Esta pasta ainda não possui referências. Adicione a primeira aqui."
          acao={<Botao onClick={nova}>Adicionar referência</Botao>}
        />
      ) : (
        <div className="space-y-6">
          {/* Grade de Subpastas */}
          {subpastas.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {subpastas.map((pasta) => {
                const caminhoPasta = pastaAtual ? `${pastaAtual}/${pasta}` : pasta;
                return (
                  <CartaoItem
                    key={caminhoPasta}
                    icone={<FolderOpen size={18} className="text-pink-500" />}
                    titulo={pasta}
                    subtitulo="Pasta de Referências"
                    onClick={() => setPastaAtual(caminhoPasta)}
                  />
                );
              })}
            </div>
          )}

          {/* Lista / Grade de Itens */}
          {visiveis.length === 0 && subpastas.length > 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Nenhuma referência solta nesta pasta raiz.
            </div>
          ) : modoVisao === "masonry" ? (
            <Masonry
              items={visiveis}
              config={{
                columns: [1, 2, 3, 4],
                gap: [16, 16, 20, 20],
                media: [640, 768, 1024, 1280],
              }}
              render={(r) => renderCartaoMasonry(r)}
            />
          ) : modoVisao === "grade" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {visiveis.map((r) => renderCartaoGrade(r))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visiveis.map((r) => renderItemLista(r))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Edição / Visualização da Referência com foco na mídia */}
      <Modal
        aberto={editando !== null}
        aoFechar={fecharModal}
        titulo={editando?.caminho ? "Editar Referência" : "Nova Referência"}
        rodape={
          <>
            {editando?.caminho && (
              <Botao
                variante="fantasma"
                onClick={() => editando && remover(editando)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={16} />
                Apagar
              </Botao>
            )}
            <Botao variante="neutro" onClick={fecharModal}>
              Cancelar
            </Botao>
            <Botao onClick={salvar} disabled={salvando || enviando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Botao>
          </>
        }
      >
        {editando && (
          <div className="space-y-4">
            {/* Zona de Mídia Central com Drag & Drop e Paste */}
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
                onDragOver={aoArrastarSobre}
                onDragLeave={aoSairArrasto}
                onDrop={aoSoltar}
                className={cn(
                  "relative rounded-2xl overflow-hidden transition-all border-2 border-dashed cursor-pointer",
                  arrastando
                    ? "border-primary bg-primary/10 scale-[1.01]"
                    : previa || editando.imagem
                      ? "border-border/60 hover:border-primary/50 bg-secondary/20"
                      : "border-border hover:border-primary/50 bg-secondary/30"
                )}
                onClick={() => {
                  if (!previa && !editando.imagem) inputArquivo.current?.click();
                }}
              >
                {previa ? (
                  <img
                    src={previa}
                    alt=""
                    className="max-h-72 w-full rounded-xl object-contain bg-black/5 dark:bg-black/20"
                  />
                ) : editando.imagem ? (
                  <ImagemPrivada
                    caminho={editando.imagem}
                    alt=""
                    className="max-h-72 w-full rounded-xl object-contain bg-black/5 dark:bg-black/20"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2.5">
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <ImagePlus size={24} />
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      Arraste ou cole (Ctrl+V) uma imagem ou vídeo aqui
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">
                      Ou clique para selecionar um arquivo do computador
                    </p>
                  </div>
                )}

                {arrastando && (
                  <div className="absolute inset-0 bg-primary/20 backdrop-blur-xs flex items-center justify-center z-10">
                    <p className="text-sm font-bold text-primary">Solte para carregar a mídia</p>
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
                if (f) enviarImagem(f);
                e.target.value = "";
              }}
            />

            {/* Ações da Mídia: OCR por seleção e Paleta */}
            {!modoOcr && (previa || editando.imagem) && (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Botao
                  variante="neutro"
                  tamanho="pequeno"
                  onClick={abrirOcr}
                  disabled={enviando}
                  title="Selecione um trecho da imagem para ler o texto via OCR"
                >
                  <ScanText size={15} />
                  Ler texto da imagem (OCR)
                </Botao>

                <Botao
                  variante="fantasma"
                  tamanho="pequeno"
                  onClick={() => inputArquivo.current?.click()}
                  disabled={enviando}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <ImagePlus size={14} />
                  {encolhendo ? "Processando…" : enviando ? "Enviando…" : "Substituir arquivo"}
                </Botao>
              </div>
            )}

            {nota && <Aviso tom="sucesso">{nota}</Aviso>}

            {/* Propriedades do Documento: Título, Fonte, Tags */}
            <div className="space-y-3 pt-2">
              <div>
                <Rotulo>Título</Rotulo>
                <Campo
                  value={editando.titulo}
                  onChange={(e) =>
                    setEditando({ ...editando, titulo: e.target.value })
                  }
                  placeholder="Sem Título"
                  autoFocus
                />
              </div>

              <div>
                <Rotulo>Link da Fonte (URL)</Rotulo>
                <Campo
                  value={editando.fonte ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, fonte: e.target.value || undefined })
                  }
                  placeholder="https://..."
                  inputMode="url"
                />
                {editando.fonte && (
                  <a
                    href={editando.fonte}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    Abrir fonte no navegador <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <div>
                <Rotulo dica="Pressione Enter ou vírgula para adicionar">Tags</Rotulo>
                <TagInput
                  tags={editando.tags}
                  onChange={(tags) => setEditando({ ...editando, tags })}
                  placeholder="editorial, tipografia, branding"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ModalConfirmacao
        aberto={referenciaParaExcluir !== null}
        titulo={`Apagar "${referenciaParaExcluir?.titulo || "esta referência"}"?`}
        descricao="Esta referência será excluída do repositório. O arquivo de mídia original permanece seguro no histórico do Git."
        textoConfirmar="Apagar"
        textoCancelar="Cancelar"
        varianteConfirmar="perigo"
        aoConfirmar={confirmarRemocao}
        aoCancelar={() => setReferenciaParaExcluir(null)}
      />
    </div>
  );

  // ── Renderizadores de Cartão ──────────────────────────────────────────────

  function renderCartaoMasonry(r: Referencia) {
    const paletaItem: string[] = Array.isArray(r.bruto.paleta)
      ? r.bruto.paleta
      : Array.isArray(paletasExtraidas[r.id])
        ? paletasExtraidas[r.id]
        : [];

    return (
      <div
        key={r.id}
        className="group relative cursor-pointer flex flex-col gap-2 rounded-2xl p-1 transition-all hover:scale-[1.01]"
        onClick={() => {
          setEditando(r);
        }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-muted border border-border/60">
          {r.imagem ? (
            <ImagemPrivada
              caminho={r.imagem}
              alt={r.titulo}
              className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              aoCarregarBlob={(img) => {
                if (!r.bruto.paleta && !paletasExtraidas[r.id]) {
                  import("@/lib/paleta").then(({ extrairPaletaDaImagem }) => {
                    extrairPaletaDaImagem(img).then((cores) => {
                      if (cores.length > 0) {
                        setPaletasExtraidas((p) => ({ ...p, [r.id]: cores }));
                      }
                    });
                  });
                }
              }}
            />
          ) : (
            <div className="aspect-video flex items-center justify-center bg-secondary/40">
              <ImagePlus size={32} className="text-muted-foreground/40" />
            </div>
          )}

          <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex flex-col justify-between p-3">
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" className="rounded-full h-7 text-xs font-semibold shadow-md">
                Abrir
              </Button>
            </div>
            {r.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {r.tags.slice(0, 3).map((t) => (
                  <Badge variant="secondary" className="bg-background/90 text-foreground text-[10px] rounded-full border-none" key={t}>
                    #{t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-1">
          <p className="font-semibold text-sm leading-tight text-foreground line-clamp-2">
            {r.titulo || "Sem Título"}
          </p>
          {renderPaleta(paletaItem)}
        </div>
      </div>
    );
  }

  function renderCartaoGrade(r: Referencia) {
    return (
      <div
        key={r.id}
        className="group relative cursor-pointer flex flex-col gap-1.5 rounded-2xl overflow-hidden border border-border/60 bg-card hover:shadow-md transition-all"
        onClick={() => {
          setEditando(r);
        }}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {r.imagem ? (
            <ImagemPrivada
              caminho={r.imagem}
              alt={r.titulo}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImagePlus size={32} className="text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div className="px-2.5 pb-2.5">
          <p className="font-semibold text-xs leading-tight text-foreground line-clamp-2">
            {r.titulo || "Sem Título"}
          </p>
          {r.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {r.tags.slice(0, 2).map((t) => (
                <Badge variant="secondary" className="text-[9px] rounded-full" key={t}>
                  #{t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderItemLista(r: Referencia) {
    return (
      <div
        key={r.id}
        className="group flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-card hover:bg-accent/40 cursor-pointer transition-colors"
        onClick={() => {
          setEditando(r);
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
            {r.imagem ? (
              <ImagemPrivada caminho={r.imagem} alt={r.titulo} className="h-full w-full object-cover" />
            ) : (
              <ImagePlus size={16} className="text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xs text-foreground truncate">{r.titulo || "Sem Título"}</p>
            {r.fonte && <p className="text-[10px] text-muted-foreground truncate">{r.fonte}</p>}
          </div>
        </div>
        {r.tags.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            {r.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                #{t}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderPaleta(paletaItem: string[]) {
    if (paletaItem.length === 0) return null;
    return (
      <div className="mt-1.5 flex items-center gap-1 flex-wrap relative">
        {paletaItem.map((hex: string) => (
          <button
            key={hex}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(hex);
              setCorCopiada(hex);
              setTimeout(() => setCorCopiada(null), 1500);
            }}
            className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-xs transition-transform active:scale-90 hover:scale-125 cursor-pointer"
            style={{ backgroundColor: hex }}
            title={`Copiar ${hex}`}
          />
        ))}
        {corCopiada && (
          <span className="ml-1 text-[10px] font-semibold text-primary animate-fade-in">
            Copiada!
          </span>
        )}
      </div>
    );
  }
}
