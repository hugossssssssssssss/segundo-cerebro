import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Masonry } from "react-plock";
import { Plus, Trash2, ImagePlus, ExternalLink, ScanText, FolderOpen, ChevronRight, LayoutGrid, List, FolderPlus } from "lucide-react";
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
  AreaTexto,
  TagInput,
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagemPrivada } from "@/components/ImagemPrivada";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { AlternadorVisao } from "@/components/AlternadorVisao";
import { CabecalhoSecao } from "@/components/CabecalhoSecao";
import { CartaoItem } from "@/components/CartaoItem";
import { SeletorOcr } from "@/components/SeletorOcr";
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

  // ── Estado da UI ──────────────────────────────────────────────────────────
  const [busca, setBusca] = useState("");
  const [erroLocal, setErroLocal] = useState("");
  const erro = erroLocal || erroCarregar || erroSalvar;

  const [enviando, setEnviando] = useState(false);
  const [encolhendo, setEncolhendo] = useState(false);
  const [nota, setNota] = useState("");
  const [editando, setEditando] = useState<Referencia | null>(null);
  const [original, setOriginal] = useState<Referencia | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
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
        setOriginal(alvo);
        navegar(location.pathname, { replace: true });
      }
    }
  }, [location.pathname, location.search, location.hash, refs]);

  // ── Ações ──────────────────────────────────────────────────────────────────

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
    setNota(`Texto extraído (${texto.length} caracteres) e colocado no corpo do documento.`);
    // Limpar URL temporária se não for a prévia
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
      // erro já está em erroSalvar
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
    setOriginal(null);
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
      bruto: {},
      caminho: "",
      id: "",
      sha: "",
      titulo: "",
      tags: [],
      porque: "",
      corpo: "",
    };
    setEditando(vazia);
    setOriginal(vazia);
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
        setOriginal(refAlvo);
      }
    }
  }, [location.pathname, location.search, location.hash, refs.length > 0]);

  // ── Drag & drop handlers para imagem ──────────────────────────────────────
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
    if (arquivos.length > 0 && arquivos[0].type.startsWith("image/")) {
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
    // Ignora arquivos de imagem
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
    .filter((r) => !filtro || r.tags.includes(filtro))
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
        descricao="O que te inspirou, ideias de design, paletas e imagens de referência."
        icone={<ImagePlus size={20} />}
        corIcone="bg-pink-500/10 text-pink-600 dark:text-pink-400"
        acoes={
          <>
            <Botao variante="neutro" onClick={criarPasta}>
              <FolderPlus size={16} />
              Nova Pasta
            </Botao>
            <Botao onClick={nova}>
              <Plus size={16} />
              Nova Referência
            </Botao>
          </>
        }
      />

      {pastaAtual && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setPastaAtual("")}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <FolderOpen size={13} />
            Referências
          </button>
          {partesPasta.map((parte, i) => {
            const caminhoParcial = partesPasta.slice(0, i + 1).join("/");
            return (
              <span key={caminhoParcial} className="flex items-center gap-1.5">
                <ChevronRight size={12} className="text-muted-foreground/50" />
                <button
                  type="button"
                  onClick={() => setPastaAtual(caminhoParcial)}
                  className="rounded-lg px-2 py-1 text-foreground hover:bg-accent transition-colors"
                >
                  {parte}
                </button>
              </span>
            );
          })}
        </div>
      )}

      <BarraFerramentas
        busca={busca}
        aoMudarBusca={setBusca}
        placeholderBusca="Buscar referência por título..."
        filtros={
          tags.length > 0 ? (
            <div className="flex gap-1.5 overflow-x-auto py-0.5 max-w-full">
              <button
                type="button"
                onClick={() => setFiltro(null)}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                  filtro === null
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                Todas
              </button>
              {tags.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setFiltro(t)}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                    filtro === t
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  #{t}
                </button>
              ))}
            </div>
          ) : undefined
        }
        acoes={
          <AlternadorVisao
            valorAtivo={modoVisao}
            aoAlternar={(v) => setModoVisao(v as ModoVisaoRef)}
            opcoes={[
              { id: "masonry", rotulo: "Painel", icone: <LayoutGrid size={14} /> },
              { id: "grade", rotulo: "Grade", icone: <LayoutGrid size={14} /> },
              { id: "lista", rotulo: "Lista", icone: <List size={14} /> },
            ]}
          />
        }
      />

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando texto="Carregando suas referências…" />
      ) : visiveis.length === 0 && subpastas.length === 0 ? (
        <Vazio
          titulo={refs.length === 0 ? "Nenhuma referência ainda" : "Nada com essa tag"}
          descricao={
            refs.length === 0
              ? "Salve uma imagem, um link, uma ideia. O campo que faz diferença é o 'por que salvei' — sem ele, daqui a seis meses vira só um print perdido."
              : undefined
          }
          acao={refs.length === 0 ? <Botao onClick={nova}>Salvar a primeira</Botao> : undefined}
        />
      ) : (
        <div className="space-y-4">
          {/* Subpastas */}
          {subpastas.length > 0 && (
            <section className="space-y-2">
              <CabecalhoSecao titulo="Pastas" contador={subpastas.length} />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {subpastas.map((pasta) => {
                  const caminhoPasta = pastaAtual ? `${pastaAtual}/${pasta}` : pasta;
                  return (
                    <CartaoItem
                      key={`pasta-${caminhoPasta}`}
                      icone={<FolderOpen size={18} className="text-pink-500" />}
                      titulo={pasta}
                      subtitulo="Pasta"
                      onClick={() => setPastaAtual(caminhoPasta)}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Lista / Grade / Masonry */}
          {visiveis.length > 0 && (
            modoVisao === "masonry" ? (
              <Masonry
                items={visiveis}
                config={{
                  columns: [1, 2, 3],
                  gap: [16, 16, 16],
                  media: [640, 1024, 1280],
                }}
                render={(r: Referencia) => renderCartaoMasonry(r)}
              />
            ) : modoVisao === "grade" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {visiveis.map((r) => renderCartaoGrade(r))}
              </div>
            ) : (
              <div className="space-y-2">
                {visiveis.map((r) => (
                  <CartaoItem
                    key={r.id}
                    icone={<ImagePlus size={18} className="text-pink-500" />}
                    titulo={r.titulo || "Sem Título"}
                    subtitulo={r.porque || r.fonte || undefined}
                    tags={r.tags}
                    onClick={() => { setEditando(r); setOriginal(r); }}
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ------------------------------------------------------- modal */}
      <Modal
        aberto={editando !== null}
        aoFechar={fecharModal}
        temMudancas={JSON.stringify(editando) !== JSON.stringify(original)}
        titulo={editando?.caminho ? "Editar referência" : "Nova referência"}
        rodape={
          <>
            {editando?.caminho && (
              <Botao
                variante="fantasma"
                onClick={() => editando && remover(editando)}
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
            {/* Zona de imagem com Drag & Drop */}
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
                  "relative rounded-xl overflow-hidden transition-all border-2 border-dashed cursor-pointer",
                  arrastando
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : previa || editando.imagem
                      ? "border-transparent"
                      : "border-border hover:border-primary/40 bg-secondary/30",
                )}
                onClick={() => {
                  if (!previa && !editando.imagem) inputArquivo.current?.click();
                }}
              >
                {previa ? (
                  <img
                    src={previa}
                    alt=""
                    className="max-h-64 w-full rounded-lg object-contain bg-secondary"
                  />
                ) : editando.imagem ? (
                  <ImagemPrivada
                    caminho={editando.imagem}
                    alt=""
                    className="max-h-64 w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <ImagePlus size={32} className="opacity-40" />
                    <p className="text-xs font-medium">Arraste uma imagem aqui ou clique para escolher</p>
                    <p className="text-[10px] opacity-60">Também aceita colar (Ctrl+V)</p>
                  </div>
                )}

                {arrastando && (
                  <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center">
                    <p className="text-sm font-semibold text-primary">Solte para substituir a imagem</p>
                  </div>
                )}
              </div>
            )}

            <input
              ref={inputArquivo}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) enviarImagem(f);
                e.target.value = "";
              }}
            />

            {/* Botões de ação na imagem */}
            {!modoOcr && (previa || editando.imagem) && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Botao
                  variante="neutro"
                  onClick={() => inputArquivo.current?.click()}
                  disabled={enviando}
                  className="flex-1"
                >
                  <ImagePlus size={16} />
                  {encolhendo
                    ? "Encolhendo…"
                    : enviando
                      ? "Enviando…"
                      : "Adicionar imagem"}
                </Botao>

                <Botao
                  variante="neutro"
                  onClick={abrirOcr}
                  disabled={enviando}
                  className="flex-1"
                  title="Selecione uma área da imagem para extrair o texto"
                >
                  <ScanText size={16} />
                  Ler texto da imagem
                </Botao>
              </div>
            )}

            {nota && <Aviso tom="sucesso">{nota}</Aviso>}

            <div>
              <Rotulo>Título</Rotulo>
              <Campo
                value={editando.titulo}
                onChange={(e) =>
                  setEditando({ ...editando, titulo: e.target.value })
                }
                placeholder="Grade editorial da revista X"
                autoFocus
              />
            </div>

            <div>
              <Rotulo dica="A parte que todo mundo pula e que faz toda a diferença depois. O que exatamente te chamou atenção?">
                Por que salvei
              </Rotulo>
              <AreaTexto
                value={editando.porque}
                onChange={(e) =>
                  setEditando({ ...editando, porque: e.target.value })
                }
                placeholder="A forma como a grade quebra na terceira coluna sem perder o ritmo de leitura"
                className="min-h-20"
              />
            </div>

            <div>
              <Rotulo>Link da fonte</Rotulo>
              <Campo
                value={editando.fonte ?? ""}
                onChange={(e) =>
                  setEditando({ ...editando, fonte: e.target.value || undefined })
                }
                placeholder="https://…"
                inputMode="url"
              />
              {editando.fonte && (
                <a
                  href={editando.fonte}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  Abrir <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div>
              <Rotulo dica="Aperte Enter ou Vírgula para adicionar.">Tags</Rotulo>
              <TagInput
                tags={editando.tags}
                onChange={(tags) => setEditando({ ...editando, tags })}
                placeholder="tipografia, editorial"
              />
            </div>
          </div>
        )}
      </Modal>

      <ModalConfirmacao
        aberto={referenciaParaExcluir !== null}
        titulo={`Apagar "${referenciaParaExcluir?.titulo || ""}"`}
        descricao="Esta referência será removida da lista. A imagem associada continua no repositório."
        textoConfirmar="Apagar Referência"
        varianteConfirmar="perigo"
        aoConfirmar={confirmarRemocao}
        aoCancelar={() => setReferenciaParaExcluir(null)}
      />
    </div>
  );

  // ── Funções de renderização ───────────────────────────────────────────────

  function renderCartaoMasonry(r: Referencia) {
    const paletaItem: string[] = Array.isArray(r.bruto.paleta)
      ? r.bruto.paleta
      : Array.isArray(paletasExtraidas[r.id])
        ? paletasExtraidas[r.id]
        : [];
    return (
      <div
        key={r.id}
        className="group relative cursor-pointer flex flex-col gap-2"
        onClick={() => { setEditando(r); setOriginal(r); }}
      >
        <div className="relative overflow-hidden rounded-3xl bg-muted">
          {r.imagem && (
            <ImagemPrivada
              caminho={r.imagem}
              alt={r.titulo}
              className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
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
          )}
          <div className="absolute inset-0 bg-black/30 opacity-60 sm:opacity-0 transition-opacity duration-300 sm:group-hover:opacity-100 flex flex-col justify-between p-3 sm:p-4">
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" className="rounded-full h-8 font-semibold opacity-100 sm:opacity-0 sm:translate-y-[-10px] transition-all duration-300 sm:group-hover:opacity-100 sm:group-hover:translate-y-0">
                Abrir
              </Button>
            </div>
            {r.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 opacity-100 sm:opacity-0 sm:translate-y-[10px] transition-all duration-300 sm:group-hover:opacity-100 sm:group-hover:translate-y-0">
                {r.tags.slice(0, 3).map((t) => (
                  <Badge variant="secondary" className="bg-background/90 text-foreground text-[10px] rounded-full border-none" key={t}>{t}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-1.5">
          <p className="font-semibold text-sm leading-tight text-foreground line-clamp-2">{r.titulo || "Sem Título"}</p>
          {r.porque && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {r.porque}
            </p>
          )}
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
        onClick={() => { setEditando(r); setOriginal(r); }}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {r.imagem ? (
            <ImagemPrivada
              caminho={r.imagem}
              alt={r.titulo}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImagePlus size={32} className="text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div className="px-2.5 pb-2.5">
          <p className="font-semibold text-xs leading-tight text-foreground line-clamp-2">{r.titulo || "Sem Título"}</p>
          {r.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {r.tags.slice(0, 2).map((t) => (
                <Badge variant="secondary" className="text-[9px] rounded-full" key={t}>{t}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderPaleta(paletaItem: string[]) {
    if (paletaItem.length === 0) return null;
    return (
      <div className="mt-2 flex items-center gap-1 flex-wrap relative">
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
            className="h-4 w-4 rounded-full border border-black/10 shadow-sm transition-transform active:scale-90 hover:scale-125 relative"
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
