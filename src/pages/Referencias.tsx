import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ImagePlus, ExternalLink } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { listar, ler, gravar, gravarBinario, apagar } from "@/lib/github";
import {
  lerMarkdown,
  escreverMarkdown,
  tituloProvavel,
  nomeDeArquivo,
} from "@/lib/markdown";
import {
  comoReferencia,
  refParaFrontmatter,
  nomeDeImagem,
  arquivoParaBase64,
  todasAsTags,
  LIMITE_IMAGEM,
  PASTA_REFS,
  PASTA_IMAGENS,
  type Referencia,
} from "@/lib/referencias";
import {
  Botao,
  Campo,
  Cartao,
  Selo,
  Aviso,
  Vazio,
  Carregando,
  Modal,
  Rotulo,
  AreaTexto,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export default function Referencias() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const [refs, setRefs] = useState<Referencia[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [editando, setEditando] = useState<Referencia | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  /* ----------------------------------------------------------- carregar */

  const carregar = useCallback(async () => {
    if (!pronto) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const arquivos = await listar(cfg, PASTA_REFS);
      const lidas = await Promise.all(
        arquivos
          .filter((a) => !a.nome.startsWith("."))
          .map(async (a) => {
            const { texto, sha } = await ler(cfg, a.caminho);
            const doc = lerMarkdown(texto);
            return comoReferencia(doc, a.caminho, sha, tituloProvavel(doc, a.nome));
          }),
      );
      setRefs(lidas);

      // As imagens estão num repo privado: buscamos com o token e viramos
      // blob: local, porque uma <img src> comum não carrega arquivo privado.
      const pares = await Promise.all(
        lidas
          .filter((r) => r.imagem)
          .map(async (r) => {
            try {
              const caminho = r.imagem!.startsWith(PASTA_REFS)
                ? r.imagem!
                : `${PASTA_REFS}/${r.imagem!.replace(/^\.?\//, "")}`;
              const resposta = await fetch(
                `https://api.github.com/repos/${cfg.repoOwner}/${cfg.repoName}/contents/${caminho}?ref=${cfg.branch}`,
                {
                  headers: {
                    Authorization: `Bearer ${cfg.githubToken}`,
                    Accept: "application/vnd.github.raw",
                  },
                },
              );
              if (!resposta.ok) return null;
              const blob = await resposta.blob();
              return [r.id, URL.createObjectURL(blob)] as const;
            } catch {
              return null;
            }
          }),
      );
      setUrls(Object.fromEntries(pares.filter(Boolean) as [string, string][]));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Libera os blobs ao sair, senão a memória vaza a cada recarga
  useEffect(() => {
    return () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------------------------------------- ações */

  async function enviarImagem(arquivo: File) {
    if (!editando) return;

    if (arquivo.size > LIMITE_IMAGEM) {
      setErro(
        `A imagem tem ${(arquivo.size / 1024 / 1024).toFixed(1)} MB. O limite do GitHub por arquivo é 5 MB — exporte menor e tente de novo.`,
      );
      return;
    }

    setEnviando(true);
    setErro("");
    try {
      const nome = nomeDeImagem(arquivo.name);
      const base64 = await arquivoParaBase64(arquivo);
      await gravarBinario(cfg, `${PASTA_IMAGENS}/${nome}`, base64);

      const relativo = `imagens/${nome}`;
      setEditando({
        ...editando,
        imagem: relativo,
        // Deixa a imagem visível no corpo também, para o arquivo continuar
        // fazendo sentido aberto em qualquer editor de Markdown.
        corpo: editando.corpo.includes(relativo)
          ? editando.corpo
          : `![](${relativo})\n\n${editando.corpo}`.trim(),
      });

      const url = URL.createObjectURL(arquivo);
      setUrls((u) => ({ ...u, [editando.id || "novo"]: url }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  async function salvar() {
    if (!editando?.titulo.trim()) {
      setErro("A referência precisa de um título.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const texto = escreverMarkdown({
        dados: refParaFrontmatter(editando),
        corpo: editando.corpo,
      });
      const caminho =
        editando.caminho || `${PASTA_REFS}/${nomeDeArquivo(editando.titulo)}`;
      await gravar(cfg, caminho, texto, editando.sha || undefined);
      setEditando(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function remover(r: Referencia) {
    if (!confirm(`Apagar "${r.titulo}"?\n\nA imagem continua no repositório.`))
      return;
    try {
      await apagar(cfg, r.caminho, r.sha);
      setEditando(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  /* --------------------------------------------------------- sem config */

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
  const visiveis = filtro ? refs.filter((r) => r.tags.includes(filtro)) : refs;

  const nova = () =>
    setEditando({
      caminho: "",
      id: "",
      sha: "",
      titulo: "",
      tags: [],
      porque: "",
      corpo: "",
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Referências</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O que te inspirou, e por quê.
          </p>
        </div>
        <Botao onClick={nova}>
          <Plus size={16} />
          Nova
        </Botao>
      </div>

      {tags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFiltro(null)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filtro === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent",
            )}
          >
            Todas
          </button>
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setFiltro(t)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filtro === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent",
              )}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((r) => (
            <Cartao
              key={r.id}
              className="cursor-pointer overflow-hidden transition-colors hover:bg-accent"
              onClick={() => setEditando(r)}
            >
              {urls[r.id] ? (
                <img
                  src={urls[r.id]}
                  alt={r.titulo}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
              ) : r.imagem ? (
                <div className="flex aspect-[4/3] w-full items-center justify-center bg-secondary text-xs text-muted-foreground">
                  imagem indisponível
                </div>
              ) : null}

              <div className="p-3.5">
                <p className="font-medium">{r.titulo}</p>
                {r.porque && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {r.porque}
                  </p>
                )}
                {r.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.tags.map((t) => (
                      <Selo key={t}>#{t}</Selo>
                    ))}
                  </div>
                )}
              </div>
            </Cartao>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------- modal */}
      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
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
            <Botao variante="neutro" onClick={() => setEditando(null)}>
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
            {(urls[editando.id] || urls["novo"]) && (
              <img
                src={urls[editando.id] || urls["novo"]}
                alt=""
                className="max-h-64 w-full rounded-lg object-contain bg-secondary"
              />
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
            <Botao
              variante="neutro"
              onClick={() => inputArquivo.current?.click()}
              disabled={enviando}
              className="w-full"
            >
              <ImagePlus size={16} />
              {enviando
                ? "Enviando…"
                : editando.imagem
                  ? "Trocar imagem"
                  : "Adicionar imagem"}
            </Botao>

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
              <Rotulo dica="Separe por vírgula.">Tags</Rotulo>
              <Campo
                value={editando.tags.join(", ")}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    tags: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
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
    </div>
  );
}
