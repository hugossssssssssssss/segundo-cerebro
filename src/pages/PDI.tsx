import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Target, Package, Trash2, AlertTriangle, Sparkles } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { listar, ler, gravar, apagar } from "@/lib/github";
import {
  lerMarkdown,
  escreverMarkdown,
  tituloProvavel,
  nomeLivre,
} from "@/lib/markdown";
import {
  comoMeta,
  comoEntrega,
  metaParaFrontmatter,
  entregaParaFrontmatter,
  resumir,
  paradas,
  semMeta,
  aConferir,
  textoPrazoMeta,
  PASTA_METAS,
  PASTA_ENTREGAS,
  STATUS_META,
  ROTULO_META,
  type Meta,
  type Entrega,
  type StatusMeta,
} from "@/lib/pdi";
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
import { hojeISO, dataCurta } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function PDI() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const [metas, setMetas] = useState<Meta[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editandoMeta, setEditandoMeta] = useState<Meta | null>(null);
  const [editandoEntrega, setEditandoEntrega] = useState<Entrega | null>(null);
  // cópias de como estavam ao abrir, para detectar mudança não salva
  const [origMeta, setOrigMeta] = useState<Meta | null>(null);
  const [origEntrega, setOrigEntrega] = useState<Entrega | null>(null);

  /* ----------------------------------------------------------- carregar */

  const carregar = useCallback(async () => {
    if (!pronto) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const [arqMetas, arqEntregas] = await Promise.all([
        listar(cfg, PASTA_METAS),
        listar(cfg, PASTA_ENTREGAS),
      ]);

      const [lidasMetas, lidasEntregas] = await Promise.all([
        Promise.all(
          arqMetas
            .filter((a) => !a.nome.startsWith("."))
            .map(async (a) => {
              const { texto, sha } = await ler(cfg, a.caminho);
              const doc = lerMarkdown(texto);
              return comoMeta(doc, a.caminho, sha, tituloProvavel(doc, a.nome));
            }),
        ),
        Promise.all(
          arqEntregas
            .filter((a) => !a.nome.startsWith("."))
            .map(async (a) => {
              const { texto, sha } = await ler(cfg, a.caminho);
              const doc = lerMarkdown(texto);
              return comoEntrega(doc, a.caminho, sha, tituloProvavel(doc, a.nome));
            }),
        ),
      ]);

      setMetas(lidasMetas);
      setEntregas(lidasEntregas);
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

  /* -------------------------------------------------------------- ações */

  async function salvarMeta() {
    if (!editandoMeta?.titulo.trim()) {
      setErro("A meta precisa de um título.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const texto = escreverMarkdown({
        dados: metaParaFrontmatter(editandoMeta),
        corpo: editandoMeta.corpo,
      });
      // metas não levam data no nome: o id delas é referenciado pelas entregas
      const caminho =
        editandoMeta.caminho ||
        nomeLivre(
          PASTA_METAS,
          editandoMeta.titulo,
          metas.map((m) => m.caminho),
        ).replace(/\/\d{4}-\d{2}-\d{2}-/, "/");
      await gravar(cfg, caminho, texto, editandoMeta.sha || undefined);
      setEditandoMeta(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEntrega() {
    if (!editandoEntrega?.titulo.trim()) {
      setErro("A entrega precisa de um título.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      // Editar à mão confirma a ligação: a marca da IA sai.
      const limpa = { ...editandoEntrega, iaSugeriu: false };
      const texto = escreverMarkdown({
        dados: entregaParaFrontmatter(limpa),
        corpo: limpa.corpo,
      });
      const caminho =
        limpa.caminho ||
        nomeLivre(PASTA_ENTREGAS, limpa.titulo, entregas.map((x) => x.caminho));
      await gravar(cfg, caminho, texto, limpa.sha || undefined);
      setEditandoEntrega(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function removerMeta(m: Meta) {
    const ligadas = entregas.filter((e) => e.metas.includes(m.id)).length;
    const aviso = ligadas
      ? `\n\n${ligadas} entrega(s) apontam para ela e vão ficar sem meta.`
      : "";
    if (!confirm(`Apagar a meta "${m.titulo}"?${aviso}\n\nDá para recuperar pelo histórico do GitHub.`))
      return;
    try {
      await apagar(cfg, m.caminho, m.sha);
      setEditandoMeta(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  async function removerEntrega(e: Entrega) {
    if (!confirm(`Apagar "${e.titulo}"?`)) return;
    try {
      await apagar(cfg, e.caminho, e.sha);
      setEditandoEntrega(null);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
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

  const resumos = resumir(metas, entregas);
  const semAtencao = paradas(resumos);
  const soltas = semMeta(entregas);
  const conferir = aConferir(entregas);

  const novaMeta = () =>
    setEditandoMeta({
      bruto: {},
      caminho: "",
      id: "",
      sha: "",
      titulo: "",
      status: "a-fazer",
      indicador: "",
      corpo: "",
    });

  const novaEntrega = () =>
    setEditandoEntrega({
      bruto: {},
      caminho: "",
      id: "",
      sha: "",
      titulo: "",
      data: hojeISO(),
      metas: [],
      iaSugeriu: false,
      corpo: "",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Meu desenvolvimento
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Onde você quer chegar, e o que já fez nessa direção.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Botao onClick={novaMeta} variante="neutro" tamanho="pequeno">
          <Target size={15} />
          Nova meta
        </Botao>
        <Botao onClick={novaEntrega} tamanho="pequeno">
          <Package size={15} />
          Registrar entrega
        </Botao>
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando texto="Carregando seu plano…" />
      ) : metas.length === 0 && entregas.length === 0 ? (
        <Vazio
          titulo="Seu plano ainda está em branco"
          descricao="É esperado: você entra na empresa em breve. Comece com 3 a 5 metas, uma frase cada. Não precisa estar bonito — precisa existir antes da conversa com seu gestor."
          acao={<Botao onClick={novaMeta}>Criar primeira meta</Botao>}
        />
      ) : (
        <>
          {/* ------------------------------------------ o que pede atenção */}
          {(semAtencao.length > 0 || soltas.length > 0 || conferir.length > 0) && (
            <div className="grid gap-2">
              {semAtencao.map((r) => (
                <Cartao
                  key={r.meta.id}
                  className="flex items-start gap-3 border-[var(--warning)]/40 bg-[var(--warning)]/5 p-3.5"
                >
                  <AlertTriangle
                    size={17}
                    className="mt-0.5 shrink-0 text-[var(--warning)]"
                  />
                  <p className="text-sm">
                    <strong>{r.meta.titulo}</strong> está há{" "}
                    {r.diasSemMovimento} dias sem nenhuma entrega. Retomar,
                    pausar ou cancelar — deixar como está é o único caminho ruim.
                  </p>
                </Cartao>
              ))}

              {soltas.length > 0 && (
                <Cartao className="flex items-start gap-3 p-3.5">
                  <Package size={17} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <p className="text-sm">
                    <strong>{soltas.length}</strong> entrega
                    {soltas.length > 1 ? "s" : ""} sem meta atribuída. Abra e
                    escolha a meta, ou peça para a IA sugerir no Chat.
                  </p>
                </Cartao>
              )}

              {conferir.length > 0 && (
                <Cartao className="flex items-start gap-3 border-primary/40 bg-primary/5 p-3.5">
                  <Sparkles size={17} className="mt-0.5 shrink-0 text-primary" />
                  <p className="text-sm">
                    <strong>{conferir.length}</strong>{" "}
                    {conferir.length > 1
                      ? "ligações sugeridas"
                      : "ligação sugerida"}{" "}
                    pela IA esperando sua conferência.
                  </p>
                </Cartao>
              )}
            </div>
          )}

          {/* ----------------------------------------------------- metas */}
          {resumos.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Metas
              </h2>
              <div className="grid gap-3">
                {resumos.map(({ meta: m, entregas: ligadas }) => (
                  <Cartao key={m.id} className="p-4">
                    <button
                      onClick={() => { setEditandoMeta(m); setOrigMeta(m); }}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={cn(
                            "font-medium",
                            m.status === "concluida" && "text-muted-foreground",
                          )}
                        >
                          {m.titulo}
                        </p>
                        <Selo
                          tom={
                            m.status === "concluida"
                              ? "sucesso"
                              : m.status === "em-andamento"
                                ? "primario"
                                : "neutro"
                          }
                        >
                          {ROTULO_META[m.status]}
                        </Selo>
                      </div>

                      {m.indicador && (
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          {m.indicador}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Selo tom={ligadas.length ? "sucesso" : "neutro"}>
                          {ligadas.length} entrega
                          {ligadas.length === 1 ? "" : "s"}
                        </Selo>
                        {textoPrazoMeta(m) && <Selo>{textoPrazoMeta(m)}</Selo>}
                      </div>
                    </button>

                    {ligadas.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-border pt-3">
                        {ligadas.slice(0, 4).map((e) => (
                          <li key={e.id}>
                            <button
                              onClick={() => { setEditandoEntrega(e); setOrigEntrega(e); }}
                              className="flex w-full items-center gap-2 text-left text-sm text-muted-foreground hover:text-foreground"
                            >
                              <span className="text-xs tabular-nums">
                                {dataCurta(e.data)}
                              </span>
                              <span className="truncate">{e.titulo}</span>
                              {e.iaSugeriu && (
                                <Sparkles size={12} className="shrink-0 text-primary" />
                              )}
                            </button>
                          </li>
                        ))}
                        {ligadas.length > 4 && (
                          <li className="text-xs text-muted-foreground">
                            e mais {ligadas.length - 4}…
                          </li>
                        )}
                      </ul>
                    )}
                  </Cartao>
                ))}
              </div>
            </section>
          )}

          {/* -------------------------------------------------- entregas */}
          {entregas.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Tudo que você entregou
              </h2>
              <div className="grid gap-2">
                {[...entregas]
                  .sort((a, b) => b.data.localeCompare(a.data))
                  .map((e) => (
                    <Cartao
                      key={e.id}
                      className="cursor-pointer p-3.5 transition-colors hover:bg-accent"
                      onClick={() => { setEditandoEntrega(e); setOrigEntrega(e); }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium">{e.titulo}</p>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {dataCurta(e.data)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {e.metas.length === 0 ? (
                          <Selo tom="aviso">sem meta</Selo>
                        ) : (
                          e.metas.map((id) => (
                            <Selo key={id} tom="primario">
                              {metas.find((m) => m.id === id)?.titulo ?? id}
                            </Selo>
                          ))
                        )}
                        {e.iaSugeriu && <Selo tom="primario">🤖 conferir</Selo>}
                      </div>
                    </Cartao>
                  ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ------------------------------------------------- modal da meta */}
      <Modal
        aberto={editandoMeta !== null}
        aoFechar={() => setEditandoMeta(null)}
        temMudancas={JSON.stringify(editandoMeta) !== JSON.stringify(origMeta)}
        titulo={editandoMeta?.caminho ? "Editar meta" : "Nova meta"}
        rodape={
          <>
            {editandoMeta?.caminho && (
              <Botao
                variante="fantasma"
                onClick={() => editandoMeta && removerMeta(editandoMeta)}
              >
                <Trash2 size={16} />
                Apagar
              </Botao>
            )}
            <Botao variante="neutro" onClick={() => setEditandoMeta(null)}>
              Cancelar
            </Botao>
            <Botao onClick={salvarMeta} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Botao>
          </>
        }
      >
        {editandoMeta && (
          <div className="space-y-4">
            <div>
              <Rotulo>Meta</Rotulo>
              <Campo
                value={editandoMeta.titulo}
                onChange={(ev) =>
                  setEditandoMeta({ ...editandoMeta, titulo: ev.target.value })
                }
                placeholder="Conduzir projetos de identidade sozinho"
                autoFocus
              />
            </div>

            <div>
              <Rotulo dica="Precisa ser algo que outra pessoa consiga verificar. 'Melhorar em branding' não serve; 'conduzir um projeto do briefing à entrega' serve.">
                Como vou saber que cheguei lá
              </Rotulo>
              <AreaTexto
                value={editandoMeta.indicador}
                onChange={(ev) =>
                  setEditandoMeta({
                    ...editandoMeta,
                    indicador: ev.target.value,
                  })
                }
                placeholder="Entregar 3 projetos de identidade completos, apresentando direto para o cliente"
                className="min-h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Rotulo>Situação</Rotulo>
                <select
                  value={editandoMeta.status}
                  onChange={(ev) =>
                    setEditandoMeta({
                      ...editandoMeta,
                      status: ev.target.value as StatusMeta,
                    })
                  }
                  className="flex h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {STATUS_META.map((s) => (
                    <option key={s} value={s}>
                      {ROTULO_META[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Rotulo>Prazo</Rotulo>
                <Campo
                  type="date"
                  value={editandoMeta.prazo ?? ""}
                  onChange={(ev) =>
                    setEditandoMeta({
                      ...editandoMeta,
                      prazo: ev.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Rotulo dica="Por que isso importa para você — não para a empresa.">
                Anotações
              </Rotulo>
              <AreaTexto
                value={editandoMeta.corpo}
                onChange={(ev) =>
                  setEditandoMeta({ ...editandoMeta, corpo: ev.target.value })
                }
                className="min-h-28"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ---------------------------------------------- modal da entrega */}
      <Modal
        aberto={editandoEntrega !== null}
        aoFechar={() => setEditandoEntrega(null)}
        temMudancas={JSON.stringify(editandoEntrega) !== JSON.stringify(origEntrega)}
        titulo={editandoEntrega?.caminho ? "Editar entrega" : "Registrar entrega"}
        rodape={
          <>
            {editandoEntrega?.caminho && (
              <Botao
                variante="fantasma"
                onClick={() => editandoEntrega && removerEntrega(editandoEntrega)}
              >
                <Trash2 size={16} />
                Apagar
              </Botao>
            )}
            <Botao variante="neutro" onClick={() => setEditandoEntrega(null)}>
              Cancelar
            </Botao>
            <Botao onClick={salvarEntrega} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Botao>
          </>
        }
      >
        {editandoEntrega && (
          <div className="space-y-4">
            <div>
              <Rotulo>O que você entregou</Rotulo>
              <Campo
                value={editandoEntrega.titulo}
                onChange={(ev) =>
                  setEditandoEntrega({
                    ...editandoEntrega,
                    titulo: ev.target.value,
                  })
                }
                placeholder="Identidade visual do cliente X"
                autoFocus
              />
            </div>

            <div>
              <Rotulo>Quando</Rotulo>
              <Campo
                type="date"
                value={editandoEntrega.data}
                onChange={(ev) =>
                  setEditandoEntrega({
                    ...editandoEntrega,
                    data: ev.target.value,
                  })
                }
              />
            </div>

            <div>
              <Rotulo dica="Pode deixar em branco agora e resolver depois, sozinho ou com a IA.">
                Alimenta quais metas
              </Rotulo>
              {metas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Você ainda não tem metas. Crie uma primeiro para poder ligar.
                </p>
              ) : (
                <div className="space-y-2">
                  {metas.map((m) => (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-2.5 hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={editandoEntrega.metas.includes(m.id)}
                        onChange={(ev) =>
                          setEditandoEntrega({
                            ...editandoEntrega,
                            metas: ev.target.checked
                              ? [...editandoEntrega.metas, m.id]
                              : editandoEntrega.metas.filter((x) => x !== m.id),
                          })
                        }
                        className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                      />
                      <span className="text-sm">{m.titulo}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Rotulo dica="O que foi pedido, como você resolveu, que retorno teve. É isto que vira argumento numa conversa de promoção.">
                Detalhes
              </Rotulo>
              <AreaTexto
                value={editandoEntrega.corpo}
                onChange={(ev) =>
                  setEditandoEntrega({
                    ...editandoEntrega,
                    corpo: ev.target.value,
                  })
                }
                className="min-h-32"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
