import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Target,
  Calendar,
  Package,
  AlertTriangle,
  Sparkles,
  CheckSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import { PASTAS } from "@/lib/tipos";
import { comoMeta, comoEntrega, metaParaArquivo, entregaParaArquivo } from "@/lib/entidades";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import {
  escreverMarkdown,
  tituloProvavel,
  nomeLivre,
  nomeDeArquivo,
} from "@/lib/markdown";
import {
  resumir,
  paradas,
  semMeta,
  aConferir,
  textoPrazoMeta,
  PASTA_METAS,
  PASTA_ENTREGAS,
  ROTULO_META,
  type Meta,
  type Entrega,
  type StatusMeta,
} from "@/lib/pdi";
import {
  Botao,
  Cartao,
  Selo,
  Aviso,
  Vazio,
  Carregando,
  ModalConfirmacao,
} from "@/components/ui";
import { hojeISO, dataCurta, lerParametroAbrir, lerParametroCriar } from "@/lib/utils";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { CabecalhoSecao } from "@/components/CabecalhoSecao";
import { cn } from "@/lib/utils";

/**
 * Nome livre para metas, que não levam data no nome: o id delas é
 * referenciado pelas entregas, então precisa ser estável e legível.
 */
function nomeLivreSemData(
  pasta: string,
  titulo: string,
  ocupados: string[],
): string {
  const base = nomeDeArquivo(titulo).replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
  const usados = new Set(ocupados);
  let candidato = `${pasta}/${base}.md`;
  let n = 2;
  while (usados.has(candidato)) {
    candidato = `${pasta}/${base}-${n}.md`;
    n++;
  }
  return candidato;
}

export default function PDI() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();
  const { abrirFlutuante, fecharFlutuante, estaAbertoFlutuante, focarFlutuante } = useItemFlutuante();

  // ── Carregamento — dois hooks, um repositório (cache por sha) ─────────────
  // Os dois hooks chamam carregarRepo() que tem cache interno — a segunda
  // chamada não faz nova requisição se o sha não mudou.
  const { itens: metas, recarregar: recarregarMetas, carregando: carregandoMetas, erro: erroMetas } =
    useItemRepo(cfg, PASTAS.metas as typeof PASTA_METAS, (item) =>
      comoMeta(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
    );

  const { itens: entregas, recarregar: recarregarEntregas, carregando: carregandoEntregas, erro: erroEntregas } =
    useItemRepo(cfg, PASTAS.entregas as typeof PASTA_ENTREGAS, (item) =>
      comoEntrega(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
    );

  const carregando = carregandoMetas || carregandoEntregas;

  function recarregar() {
    recarregarMetas();
    recarregarEntregas();
  }

  // ── Salvamento ────────────────────────────────────────────────────────────
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar, limparErro } = useSalvar(cfg);
  const [erroLocal, setErroLocal] = useState("");
  const erro = erroLocal || erroMetas || erroEntregas || erroSalvar;

  // ── Estado da UI ──────────────────────────────────────────────────────────
  const [editandoMeta, setEditandoMeta] = useState<Meta | null>(null);
  const [editandoEntrega, setEditandoEntrega] = useState<Entrega | null>(null);
  const [modoVisaoMeta, setModoVisaoMeta] = useState<ModoVisaoNotion>("popup");
  const [modoVisaoEntrega, setModoVisaoEntrega] = useState<ModoVisaoNotion>("popup");
  const [origMeta, setOrigMeta] = useState<Meta | null>(null);
  const [origEntrega, setOrigEntrega] = useState<Entrega | null>(null);
  const [esconderEntregas, setEsconderEntregas] = useState(() => localStorage.getItem("klaus-pdi-esconder-entregas") === "true");

  const alternarEsconderEntregas = () => {
    const novo = !esconderEntregas;
    setEsconderEntregas(novo);
    localStorage.setItem("klaus-pdi-esconder-entregas", String(novo));
  };

  // ── Abre item pela URL ─────────────────────────────────────────────────────
  const processouUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const urlAtual = `${location.pathname}${location.search}${location.hash}`;
    if (processouUrlRef.current === urlAtual) return;

    if (lerParametroCriar(location, ["nova_meta", "nova", "novo"])) {
      processouUrlRef.current = urlAtual;
      const vazia: Meta = {
        bruto: {},
        caminho: "",
        id: "",
        sha: "",
        titulo: "",
        status: "a-fazer",
        indicador: "",
        corpo: "",
      };
      setEditandoMeta(vazia);
      setOrigMeta(vazia);
      return;
    }

    const abrirCaminho = lerParametroAbrir(location);
    if (!abrirCaminho) return;

    if (metas.length > 0 || entregas.length > 0) {
      if (focarFlutuante(abrirCaminho)) return;
      const metaAlvo = metas.find((m) => m.caminho === abrirCaminho);
      if (metaAlvo) {
        processouUrlRef.current = urlAtual;
        setEditandoMeta(metaAlvo);
        setOrigMeta(metaAlvo);
        return;
      }
      const entregaAlvo = entregas.find((e) => e.caminho === abrirCaminho);
      if (entregaAlvo) {
        processouUrlRef.current = urlAtual;
        setEditandoEntrega(entregaAlvo);
        setOrigEntrega(entregaAlvo);
      }
    }
  }, [location.pathname, location.search, location.hash, metas.length > 0, entregas.length > 0]);

  // ── Modo flutuante de metas ────────────────────────────────────────────────
  useEffect(() => {
    if (modoVisaoMeta === "flutuante" && editandoMeta) {
      const metaOriginal = { ...editandoMeta };
      abrirFlutuante({
        id: metaOriginal.caminho,
        rotuloTipo: metaOriginal.caminho ? "Meta da Carreira" : "Nova meta",
        titulo: metaOriginal.titulo,
        corpo: metaOriginal.corpo,
        dadosProps: {
          status: metaOriginal.status,
          prazo: metaOriginal.prazo,
          indicador: metaOriginal.indicador,
        },
        camposFixosProps: {
          status: { icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "status" },
          prazo: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
          indicador: { icone: <CheckSquare className="h-4 w-4 opacity-50 text-purple-500" />, tipo: "texto" },
        },
        caminho: metaOriginal.caminho,
        sha: metaOriginal.sha,
        temMudancas: origMeta !== null && JSON.stringify(editandoMeta) !== JSON.stringify(origMeta),
        salvando,
        erro,
        aoSalvar: async (itemFlutuanteAtual) => {
          const titulo = itemFlutuanteAtual.titulo.trim() || "Sem título";
          const metaAtualizada: Meta = {
            caminho: itemFlutuanteAtual.caminho,
            sha: itemFlutuanteAtual.sha,
            bruto: itemFlutuanteAtual.dadosProps || {},
            titulo,
            corpo: itemFlutuanteAtual.corpo,
            id: itemFlutuanteAtual.caminho.split("/").pop()?.replace(/\.md$/, "") || "",
            status: (itemFlutuanteAtual.dadosProps.status as StatusMeta) || "a-fazer",
            prazo: itemFlutuanteAtual.dadosProps.prazo,
            indicador: itemFlutuanteAtual.dadosProps.indicador || "",
          };
          const { dados, corpo } = metaParaArquivo(metaAtualizada);
          const texto = escreverMarkdown({ dados, corpo });
          const caminho = itemFlutuanteAtual.caminho || nomeLivre(PASTAS.metas, titulo, metas.map((m) => m.caminho));
          await salvarTexto(caminho, texto, itemFlutuanteAtual.sha || undefined);
          recarregarMetas();
        },
        aoRemover: metaOriginal.caminho ? async () => {
          await apagarItem(metaOriginal.caminho, metaOriginal.sha);
          recarregarMetas();
        } : undefined,
      });
      setEditandoMeta(null);
      setOrigMeta(null);
      setModoVisaoMeta("popup");
    }
  }, [modoVisaoMeta, editandoMeta]);

  // ── Modo flutuante de entregas ─────────────────────────────────────────────
  useEffect(() => {
    if (modoVisaoEntrega === "flutuante" && editandoEntrega) {
      const entregaOriginal = { ...editandoEntrega };
      abrirFlutuante({
        id: entregaOriginal.caminho,
        rotuloTipo: entregaOriginal.caminho ? "Entrega de PDI" : "Nova entrega",
        titulo: entregaOriginal.titulo,
        corpo: entregaOriginal.corpo,
        dadosProps: {
          data: entregaOriginal.data,
          metas: entregaOriginal.metas.map(id => metas.find(m => m.id === id)?.titulo || "").filter(Boolean),
        },
        camposFixosProps: {
          data: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
          metas: {
            icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />,
            tipo: "multiselect",
            opcoes: metas.map((m) => m.titulo),
          }
        },
        caminho: entregaOriginal.caminho,
        sha: entregaOriginal.sha,
        temMudancas: origEntrega !== null && JSON.stringify(editandoEntrega) !== JSON.stringify(origEntrega),
        salvando,
        erro,
        aoSalvar: async (itemFlutuanteAtual) => {
          const titulo = itemFlutuanteAtual.titulo.trim() || "Sem título";
          const eSalvar: Entrega = {
            caminho: itemFlutuanteAtual.caminho,
            sha: itemFlutuanteAtual.sha,
            bruto: itemFlutuanteAtual.dadosProps || {},
            id: entregaOriginal.id || itemFlutuanteAtual.caminho.split("/").pop()?.replace(/\.md$/, "") || "",
            titulo,
            data: itemFlutuanteAtual.dadosProps.data as string || hojeISO(),
            metas: Array.isArray(itemFlutuanteAtual.dadosProps.metas)
              ? itemFlutuanteAtual.dadosProps.metas.map(titulo => metas.find(m => m.titulo === titulo)?.id || "").filter(Boolean)
              : [],
            iaSugeriu: false,
            corpo: itemFlutuanteAtual.corpo,
          };
          const { dados, corpo } = entregaParaArquivo(eSalvar);
          const texto = escreverMarkdown({ dados, corpo });
          const caminho = itemFlutuanteAtual.caminho || nomeLivre(PASTAS.entregas, titulo, entregas.map((x) => x.caminho));
          await salvarTexto(caminho, texto, itemFlutuanteAtual.sha || undefined);
          recarregarEntregas();
        },
        aoRemover: entregaOriginal.caminho ? async () => {
          await removerEntrega(entregaOriginal);
        } : undefined,
      });
      setEditandoEntrega(null);
      setOrigEntrega(null);
      setModoVisaoEntrega("popup");
    }
  }, [modoVisaoEntrega, editandoEntrega, metas]);

  // ── Alerta ao sair com mudanças ────────────────────────────────────────────
  useEffect(() => {
    const temMudancas = editandoMeta !== null && origMeta !== null &&
      JSON.stringify(editandoMeta) !== JSON.stringify(origMeta);
    if (!temMudancas) return;
    const aoSair = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [editandoMeta, origMeta]);

  // ── Ações ──────────────────────────────────────────────────────────────────

  function fecharMeta() {
    setEditandoMeta(null);
    setOrigMeta(null);
    limparErro();
    setErroLocal("");
    navegar(location.pathname, { replace: true });
  }

  function fecharEntrega() {
    setEditandoEntrega(null);
    setOrigEntrega(null);
    limparErro();
    setErroLocal("");
    navegar(location.pathname, { replace: true });
  }

  async function salvarMeta(alvo?: Meta) {
    const m = alvo || editandoMeta;
    if (!m) return;
    const tituloValido = m.titulo.trim() || "Sem título";
    const metaParaSalvar = { ...m, titulo: tituloValido };
    setErroLocal("");
    try {
      const { dados, corpo } = metaParaArquivo(metaParaSalvar);
      const texto = escreverMarkdown({ dados, corpo });
      const caminho = metaParaSalvar.caminho ||
        nomeLivreSemData(PASTA_METAS, metaParaSalvar.titulo, metas.map((x) => x.caminho));
      const novaSha = await salvarTexto(caminho, texto, metaParaSalvar.sha || undefined);
      const salvaMeta: Meta = { ...metaParaSalvar, caminho, sha: novaSha };
      setEditandoMeta((atual) => {
        if (atual && (atual.caminho === salvaMeta.caminho || !atual.caminho)) return salvaMeta;
        return atual;
      });
      setOrigMeta((orig) => {
        if (orig && (orig.caminho === salvaMeta.caminho || !orig.caminho)) return salvaMeta;
        return orig;
      });
      recarregar();
    } catch (err) {
      throw err;
    }
  }

  async function salvarEntrega() {
    if (!editandoEntrega?.titulo.trim()) {
      setErroLocal("A entrega precisa de um título.");
      return;
    }
    setErroLocal("");
    try {
      const limpa = { ...editandoEntrega, iaSugeriu: false };
      const { dados, corpo } = entregaParaArquivo(limpa);
      const texto = escreverMarkdown({ dados, corpo });
      const caminho = limpa.caminho ||
        nomeLivre(PASTA_ENTREGAS, limpa.titulo, entregas.map((x) => x.caminho));
      await salvarTexto(caminho, texto, limpa.sha || undefined);
      fecharEntrega();
      recarregar();
    } catch (err) {
      throw err;
    }
  }

  const [metaParaExcluir, setMetaParaExcluir] = useState<Meta | null>(null);
  const [entregaParaExcluir, setEntregaParaExcluir] = useState<Entrega | null>(null);

  async function removerMeta(m: Meta) {
    setMetaParaExcluir(m);
  }

  async function confirmarRemocaoMeta() {
    if (!metaParaExcluir) return;
    await apagarItem(metaParaExcluir.caminho, metaParaExcluir.sha);
    setMetaParaExcluir(null);
    fecharMeta();
    recarregar();
  }

  async function removerEntrega(e: Entrega) {
    setEntregaParaExcluir(e);
  }

  async function confirmarRemocaoEntrega() {
    if (!entregaParaExcluir) return;
    await apagarItem(entregaParaExcluir.caminho, entregaParaExcluir.sha);
    setEntregaParaExcluir(null);
    fecharEntrega();
    recarregar();
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

  const resumos = resumir(metas, entregas);
  const semAtencao = paradas(resumos);
  const soltas = semMeta(entregas);
  const conferir = aConferir(entregas);

  const novaMeta = () => {
    const vazia: Meta = {
      bruto: {},
      caminho: "",
      id: "",
      sha: "",
      titulo: "",
      status: "a-fazer",
      indicador: "",
      corpo: "",
    };
    setEditandoMeta(vazia);
    setOrigMeta(vazia);
  };

  const novaEntrega = () => {
    const vazia: Entrega = {
      bruto: {},
      caminho: "",
      id: "",
      sha: "",
      titulo: "",
      data: hojeISO(),
      metas: [],
      iaSugeriu: false,
      corpo: "",
    };
    setEditandoEntrega(vazia);
    setOrigEntrega(vazia);
  };

  return (
    <div id="conteudo-pdi-pdf" className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Plano de Desenvolvimento (PDI)"
        descricao="Onde você quer chegar na sua carreira e as conquistas realizadas."
        icone={<Target size={20} />}
        corIcone="bg-teal-500/10 text-teal-600 dark:text-teal-400"
        acoes={
          <>
            <Botao onClick={novaMeta} variante="neutro">
              <Target size={15} />
              Nova Meta
            </Botao>
            <Botao onClick={novaEntrega}>
              <Package size={15} />
              Nova Entrega
            </Botao>
            <Botao
              variante="neutro"
              onClick={() => {
                const elem = document.getElementById("conteudo-pdi-pdf");
                if (elem) {
                  import("@/lib/pdf").then(({ exportarElementoParaPdf }) => {
                    exportarElementoParaPdf(elem, "meu-pdi-carreira");
                  });
                }
              }}
            >
              Exportar PDF
            </Botao>
          </>
        }
      />

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando texto="Carregando seu plano…" />
      ) : metas.length === 0 && entregas.length === 0 ? (
        <Vazio
          icone={<Target size={24} />}
          titulo="Seu Plano de Desenvolvimento ainda está em branco"
          descricao="Comece cadastrando 3 a 5 metas profissionais. Elas servirão de guia para o seu crescimento e conversas de alinhamento."
          acao={<Botao onClick={novaMeta}>Criar primeira meta</Botao>}
        />
      ) : (
        <>
          {/* ------------------------------------------ o que pede atenção */}
          {(semAtencao.length > 0 || soltas.length > 0 || conferir.length > 0) && (
            <div className="grid gap-2.5">
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
            <section className="space-y-4">
              <CabecalhoSecao titulo="Metas Profissionais" contador={resumos.length} />
              <div className="grid gap-3">
                {resumos.map(({ meta: m, entregas: ligadas }) => (
                  <Cartao key={m.id} className="p-4">
                    <button
                      onClick={() => {
                        if (estaAbertoFlutuante(m.caminho)) {
                          fecharFlutuante();
                        }
                        setEditandoMeta(m);
                        setOrigMeta(m);
                        navegar(`?abrir=${encodeURIComponent(m.caminho)}`, { replace: true });
                      }}
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
                              onClick={() => {
                                setEditandoEntrega(e);
                                setOrigEntrega(e);
                                navegar(`?abrir=${encodeURIComponent(e.caminho)}`, { replace: true });
                              }}
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
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Tudo que você entregou
                </h2>
                <button
                  type="button"
                  onClick={alternarEsconderEntregas}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {esconderEntregas ? (
                    <>
                      <ChevronDown size={14} /> Mostrar ({entregas.length})
                    </>
                  ) : (
                    <>
                      <ChevronUp size={14} /> Ocultar
                    </>
                  )}
                </button>
              </div>
              
              {!esconderEntregas && (
                <div className="grid gap-2">
                  {[...entregas]
                    .sort((a, b) => b.data.localeCompare(a.data))
                    .map((e) => (
                      <Cartao
                        key={e.id}
                        className="cursor-pointer p-3.5 transition-colors hover:bg-accent"
                        onClick={() => {
                          setEditandoEntrega(e);
                          setOrigEntrega(e);
                          navegar(`?abrir=${encodeURIComponent(e.caminho)}`, { replace: true });
                        }}
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
              )}
            </section>
          )}
        </>
      )}

      {/* ------------------------------------------------- modal da meta */}
      {editandoMeta !== null && (
        <PainelNotionBase
          rotuloTipo={editandoMeta.caminho ? "Meta da Carreira" : "Nova meta"}
          modoVisao={modoVisaoMeta}
          setModoVisao={setModoVisaoMeta}
          titulo={editandoMeta.titulo}
          setTitulo={(t) => setEditandoMeta({ ...editandoMeta, titulo: t })}
          corpo={editandoMeta.corpo}
          setCorpo={(c) => setEditandoMeta({ ...editandoMeta, corpo: c })}
          caminhoItem={editandoMeta.caminho}
          dadosProps={{
            status: editandoMeta.status,
            prazo: editandoMeta.prazo,
            indicador: editandoMeta.indicador,
          }}
          onChangeProps={(novosDados) => {
            setEditandoMeta({
              ...editandoMeta,
              status: (novosDados.status as StatusMeta) || editandoMeta.status,
              prazo: novosDados.prazo as string | undefined,
              indicador: (novosDados.indicador as string) || editandoMeta.indicador,
            });
          }}
          camposFixosProps={{
            status: { icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "status" },
            prazo: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
            indicador: { icone: <CheckSquare className="h-4 w-4 opacity-50 text-purple-500" />, tipo: "texto" },
          }}
          salvando={salvando}
          temMudancas={origMeta !== null && JSON.stringify(editandoMeta) !== JSON.stringify(origMeta)}
          aoFechar={fecharMeta}
          aoSalvar={async () => { if (editandoMeta) await salvarMeta(editandoMeta); }}
          aoRemover={editandoMeta.caminho ? async () => { await removerMeta(editandoMeta); } : undefined}
          erro={erro}
        />
      )}

      {/* ---------------------------------------------- modal da entrega */}
      {editandoEntrega !== null && (
        <PainelNotionBase
          rotuloTipo={editandoEntrega.caminho ? "Entrega de PDI" : "Nova entrega"}
          modoVisao={modoVisaoEntrega}
          setModoVisao={setModoVisaoEntrega}
          titulo={editandoEntrega.titulo}
          setTitulo={(t) => setEditandoEntrega({ ...editandoEntrega, titulo: t })}
          corpo={editandoEntrega.corpo}
          setCorpo={(c) => setEditandoEntrega({ ...editandoEntrega, corpo: c })}
          caminhoItem={editandoEntrega.caminho}
          dadosProps={{
            data: editandoEntrega.data,
            metas: editandoEntrega.metas.map(id => metas.find(m => m.id === id)?.titulo || "").filter(Boolean),
          }}
          onChangeProps={(novosDados) => {
            setEditandoEntrega({
              ...editandoEntrega,
              data: (novosDados.data as string) || editandoEntrega.data,
              metas: Array.isArray(novosDados.metas)
                ? novosDados.metas.map(titulo => metas.find(m => m.titulo === titulo)?.id || "").filter(Boolean)
                : [],
            });
          }}
          camposFixosProps={{
            data: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
            metas: {
              icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />,
              tipo: "multiselect",
              opcoes: metas.map((m) => m.titulo),
            }
          }}
          salvando={salvando}
          temMudancas={origEntrega !== null && JSON.stringify(editandoEntrega) !== JSON.stringify(origEntrega)}
          aoFechar={fecharEntrega}
          aoSalvar={async () => { if (editandoEntrega) await salvarEntrega(); }}
          aoRemover={editandoEntrega.caminho ? async () => { await removerEntrega(editandoEntrega); } : undefined}
          erro={erro}
        />
      )}

      <ModalConfirmacao
        aberto={metaParaExcluir !== null}
        titulo={`Apagar meta "${metaParaExcluir?.titulo || ""}"?`}
        descricao={
          metaParaExcluir
            ? `Esta meta será removida. ${
                entregas.filter((e) => e.metas.includes(metaParaExcluir.id)).length
              } entrega(s) estão associadas a ela.`
            : ""
        }
        textoConfirmar="Apagar Meta"
        varianteConfirmar="perigo"
        aoConfirmar={confirmarRemocaoMeta}
        aoCancelar={() => setMetaParaExcluir(null)}
      />

      <ModalConfirmacao
        aberto={entregaParaExcluir !== null}
        titulo={`Apagar entrega "${entregaParaExcluir?.titulo || ""}"?`}
        descricao="Esta entrega será removida do seu registro de PDI."
        textoConfirmar="Apagar Entrega"
        varianteConfirmar="perigo"
        aoConfirmar={confirmarRemocaoEntrega}
        aoCancelar={() => setEntregaParaExcluir(null)}
      />
    </div>
  );
}
