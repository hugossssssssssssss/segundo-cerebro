import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Masonry } from "react-plock";
import { Plus, Trash2, ImagePlus, ExternalLink, ScanText } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
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
import { cn, lerParametroAbrir } from "@/lib/utils";

export default function Referencias() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();

  // ── Carregamento ──────────────────────────────────────────────────────────
  const { itens: refs, carregando, erro: erroCarregar, recarregar } =
    useItemRepo(cfg, PASTAS.referencias, (item) =>
      comoReferencia(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
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
  const [lendoTexto, setLendoTexto] = useState(false);
  const [progressoOcr, setProgressoOcr] = useState(0);
  const [editando, setEditando] = useState<Referencia | null>(null);
  const [original, setOriginal] = useState<Referencia | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [paletasExtraidas, setPaletasExtraidas] = useState<Record<string, string[]>>({});
  const [corCopiada, setCorCopiada] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

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
      await gravarBinario(cfg, `${PASTA_IMAGENS}/${nome}`, base64);
      invalidarCache();

      const relativo = `imagens/${nome}`;
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

  async function lerTextoDaImagem() {
    if (!editando?.imagem && !previa) {
      setErroLocal("Adicione uma imagem antes de extrair o texto.");
      return;
    }

    setLendoTexto(true);
    setErroLocal("");
    setNota("");

    let temporaria: string | null = null;
    try {
      const fonte =
        previa ?? (temporaria = await baixarImagemPrivada(cfg, editando!.imagem!));

      const { extrairTexto, anexarTextoLido } = await import("@/lib/ocr");
      const texto = await extrairTexto(fonte, setProgressoOcr);

      if (!texto) {
        setNota("Não encontrei texto legível nessa imagem.");
        return;
      }

      setEditando((prev) =>
        prev ? { ...prev, corpo: anexarTextoLido(prev.corpo, texto) } : null,
      );
      setNota(
        `Texto extraído da imagem (${texto.length} caracteres) e colocado nas anotações. Confira antes de salvar.`,
      );
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : String(e));
    } finally {
      if (temporaria) URL.revokeObjectURL(temporaria);
      setLendoTexto(false);
      setProgressoOcr(0);
    }
  }

  async function salvar() {
    if (!editando?.titulo.trim()) {
      setErroLocal("A referência precisa de um título.");
      return;
    }
    setErroLocal("");
    try {
      const { dados, corpo } = referenciaParaArquivo(editando);
      const texto = escreverMarkdown({ dados, corpo });
      const caminho = editando.caminho ||
        nomeLivre(PASTA_REFS, editando.titulo, refs.map((x) => x.caminho));
      await salvarTexto(caminho, texto, editando.sha || undefined);
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
    limparErro();
    setErroLocal("");
    setPrevia((p) => {
      if (p) URL.revokeObjectURL(p);
      return null;
    });
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

  const tags = todasAsTags(refs);
  const visiveis = refs
    .filter((r) => !filtro || r.tags.includes(filtro))
    .filter((r) => (r.titulo || "").toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Referências Visuais"
        descricao="O que te inspirou, ideias de design, paletas e imagens de referência."
        icone={<ImagePlus size={20} />}
        corIcone="bg-pink-500/10 text-pink-600 dark:text-pink-400"
        acoes={
          <Botao onClick={nova}>
            <Plus size={16} />
            Nova Referência
          </Botao>
        }
      />

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
      />

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando texto="Carregando suas referências…" />
      ) : visiveis.length === 0 ? (
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
        <Masonry
          items={visiveis}
          config={{
            columns: [1, 2, 3],
            gap: [16, 16, 16],
            media: [640, 1024, 1280],
          }}
          render={(r: Referencia) => {
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
                  <p className="font-semibold text-sm leading-tight text-foreground line-clamp-2">{r.titulo}</p>
                  {r.porque && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {r.porque}
                    </p>
                  )}
                  {paletaItem.length > 0 && (
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
                  )}
                </div>
              </div>
            );
          }}
        />
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
            ) : null}

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
            <div className="flex flex-col gap-2 sm:flex-row">
              <Botao
                variante="neutro"
                onClick={() => inputArquivo.current?.click()}
                disabled={enviando || lendoTexto}
                className="flex-1"
              >
                <ImagePlus size={16} />
                {encolhendo
                  ? "Encolhendo…"
                  : enviando
                    ? "Enviando…"
                    : editando.imagem
                      ? "Trocar imagem"
                      : "Adicionar imagem"}
              </Botao>

              {(editando.imagem || previa) && (
                <Botao
                  variante="neutro"
                  onClick={lerTextoDaImagem}
                  disabled={enviando || lendoTexto}
                  className="flex-1"
                  title="Lê o texto escrito dentro da imagem e joga nas anotações, para a busca encontrar depois"
                >
                  <ScanText size={16} />
                  {lendoTexto
                    ? progressoOcr > 0
                      ? `Lendo… ${Math.round(progressoOcr * 100)}%`
                      : "Preparando…"
                    : "Ler texto da imagem"}
                </Botao>
              )}
            </div>

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

            <div>
              <Rotulo>Anotações</Rotulo>
              <AreaTexto
                value={editando.corpo}
                onChange={(e) =>
                  setEditando({ ...editando, corpo: e.target.value })
                }
                className="min-h-24"
              />
            </div>
          </div>
        )}
      </Modal>

      <ModalConfirmacao
        aberto={referenciaParaExcluir !== null}
        titulo={`Apagar "${referenciaParaExcluir?.titulo || ""}"?`}
        descricao="Esta referência será removida da lista. A imagem associada continua no repositório."
        textoConfirmar="Apagar Referência"
        varianteConfirmar="perigo"
        aoConfirmar={confirmarRemocao}
        aoCancelar={() => setReferenciaParaExcluir(null)}
      />
    </div>
  );
}
