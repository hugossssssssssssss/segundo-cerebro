import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, Trash2, Search, ArrowLeft, Save, Tag } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { gravar, apagar } from "@/lib/github";
import {
  carregarRepo,
  daPasta,
  invalidarCache,
  arquivosIlegiveis,
  type ItemRepo,
} from "@/lib/repo";
import { montarIndice, mencoesA, extrairLinks } from "@/lib/links";
import { MencionadoEm } from "@/components/Links";
import {
  escreverMarkdown,
  tituloProvavel,
  nomeLivre,
  mesclarFrontmatter,
  type Frontmatter,
} from "@/lib/markdown";
import { hojeISO } from "@/lib/utils";
import {
  Botao,
  Campo,
  Cartao,
  Aviso,
  Vazio,
  Carregando,
} from "@/components/ui";

import { HistoricoDiffModal } from "@/components/HistoricoDiffModal";

const PASTA = "notas";

type NotaAberta = {
  /** Frontmatter como veio do arquivo — preserva campos que o app não conhece */
  bruto: Frontmatter;
  caminho: string;
  sha: string;
  titulo: string;
  corpo: string;
  /** Título e corpo como estavam ao abrir — para saber se há mudança pendente */
  original: { titulo: string; corpo: string; bruto?: Frontmatter };
};

const EditorPesado = lazy(() =>
  import("@/components/EditorNotion").then((m) => ({ default: m.EditorNotion })),
);
const PropriedadesPesadas = lazy(() =>
  import("@/components/PropriedadesNotion").then((m) => ({
    default: m.PropriedadesNotion,
  })),
);

function EditorNotion(props: React.ComponentProps<typeof EditorPesado>) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse p-4 text-sm text-muted-foreground">
          Carregando editor…
        </div>
      }
    >
      <EditorPesado {...props} />
    </Suspense>
  );
}

function PropriedadesNotion(
  props: React.ComponentProps<typeof PropriedadesPesadas>,
) {
  return (
    <Suspense fallback={<div className="h-16" />}>
      <PropriedadesPesadas {...props} />
    </Suspense>
  );
}

export default function Notas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();

  const [arquivos, setArquivos] = useState<ItemRepo[]>([]);
  const [titulos, setTitulos] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<NotaAberta | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [acervo, setAcervo] = useState<ItemRepo[]>([]);
  const [ilegiveis, setIlegiveis] = useState<string[]>([]);

  /* ------------------------------------------------------------ listagem */

  const carregarLista = useCallback(async () => {
    if (!pronto) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const todos = await carregarRepo(cfg, { memoria: 3000 });
      setIlegiveis(arquivosIlegiveis());
      setAcervo(todos);
      const lista = daPasta(todos, PASTA);
      setArquivos(lista);
      setTitulos(
        Object.fromEntries(
          lista.map((i) => [i.caminho, tituloProvavel(i.doc, i.nome)]),
        ),
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  // Índice para relacionamentos e menções
  const indice = useMemo(() => montarIndice(acervo), [acervo]);
  
  const opcoesRelacionamento = useMemo(() => {
    return Array.from(indice.values()).map(a => ({
      titulo: a.titulo,
      caminho: a.caminho
    })).sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [indice]);

  // Abre item vindo por parâmetro de busca na URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const abrirCaminho = params.get("abrir");
    if (abrirCaminho && acervo.length > 0 && (!aberta || aberta.caminho !== abrirCaminho)) {
      const alvo = acervo.find((a) => a.caminho === abrirCaminho);
      if (alvo && (!mudou || confirm("Você tem alterações não salvas. Descartar?"))) {
        const titulo = tituloProvavel(alvo.doc, alvo.nome);
        setAberta({
          bruto: alvo.doc.dados,
          caminho: alvo.caminho,
          sha: alvo.sha,
          titulo,
          corpo: alvo.doc.corpo,
          original: { titulo, corpo: alvo.doc.corpo, bruto: alvo.doc.dados },
        });
      }
    }
  }, [location.search, acervo]);

  const mencoesNotaAberta = useMemo(() => {
    if (!aberta?.caminho) return [];
    return mencoesA(aberta.caminho, acervo, indice);
  }, [aberta?.caminho, acervo, indice]);

  const mudou = aberta
    ? aberta.titulo !== aberta.original.titulo ||
      aberta.corpo !== aberta.original.corpo ||
      JSON.stringify(aberta.bruto) !== JSON.stringify(aberta.original.bruto) 
    : false;

  function fecharNota() {
    setAberta(null);
    navegar(location.pathname, { replace: true });
  }

  useEffect(() => {
    if (!aberta) return;
    history.pushState({ editor: true }, "");
    const aoVoltar = () => {
      if (mudou && !confirm("Você tem alterações não salvas. Descartar?")) {
        history.pushState({ editor: true }, "");
        return;
      }
      fecharNota();
    };
    addEventListener("popstate", aoVoltar);
    return () => removeEventListener("popstate", aoVoltar);
  }, [aberta !== null]);

  useEffect(() => {
    if (!mudou) return;
    const aoSair = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", aoSair);
    return () => removeEventListener("beforeunload", aoSair);
  }, [mudou]);

  /* ------------------------------------------------------------- ações */

  function abrir(a: ItemRepo) {
    setErro("");
    const titulo = tituloProvavel(a.doc, a.nome);
    setAberta({
      bruto: a.doc.dados,
      caminho: a.caminho,
      sha: a.sha,
      titulo,
      corpo: a.doc.corpo,
      original: { titulo, corpo: a.doc.corpo, bruto: a.doc.dados },
    });
    navegar(`?abrir=${encodeURIComponent(a.caminho)}`, { replace: true });
  }

  function nova() {
    setAberta({
      bruto: {},
      caminho: "",
      sha: "",
      titulo: "",
      corpo: "",
      original: { titulo: "", corpo: "", bruto: {} },
    });
  }

  async function salvar() {
    if (!aberta) return;
    const titulo = aberta.titulo.trim() || "Sem título";

    setSalvando(true);
    setErro("");
    try {
      const texto = escreverMarkdown({
        dados: mesclarFrontmatter(aberta.bruto, {
          titulo,
          tipo:
            typeof aberta.bruto.tipo === "string" && aberta.bruto.tipo
              ? aberta.bruto.tipo
              : "nota",
          atualizado: hojeISO(),
        }),
        corpo: aberta.corpo,
      });

      const caminho =
        aberta.caminho ||
        nomeLivre(PASTA, titulo, arquivos.map((a) => a.caminho));
      const novoSha = await gravar(
        cfg,
        caminho,
        texto,
        aberta.sha || undefined,
      );
      invalidarCache();

      setAberta({
        ...aberta,
        caminho,
        sha: novoSha,
        titulo,
        original: { titulo, corpo: aberta.corpo, bruto: aberta.bruto },
      });
      navegar(`?abrir=${encodeURIComponent(caminho)}`, { replace: true });
      await carregarLista();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    if (!aberta?.caminho) return;
    if (!confirm(`Apagar "${aberta.titulo}"?\n\nDá para recuperar pelo histórico do GitHub.`))
      return;

    try {
      await apagar(cfg, aberta.caminho, aberta.sha);
      invalidarCache();
      fecharNota();
      await carregarLista();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  if (!pronto) {
    return (
      <Vazio
        titulo="Falta conectar sua conta"
        descricao="Para guardar suas anotações, preencha sua conta do GitHub e o token na aba de Ajustes."
        acao={
          <Link to="/config">
            <Botao>Ir para Ajustes</Botao>
          </Link>
        }
      />
    );
  }

  /* ------------------------------------------------------------- editor */

  if (aberta) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Botao
            variante="fantasma"
            tamanho="icone"
            onClick={() => {
              if (mudou && !confirm("Você tem alterações não salvas. Sair mesmo assim?"))
                return;
              fecharNota();
            }}
          >
            <ArrowLeft size={18} />
          </Botao>

          <div className="flex items-center gap-2">
            {aberta.caminho && (
              <Botao
                variante="neutro"
                tamanho="pequeno"
                onClick={() => setHistoricoAberto(true)}
              >
                Histórico
              </Botao>
            )}
            <Botao
              variante="neutro"
              tamanho="pequeno"
              onClick={() => {
                const elem = document.getElementById("conteudo-nota-pdf");
                if (elem) {
                  import("@/lib/pdf").then(({ exportarElementoParaPdf }) => {
                    exportarElementoParaPdf(elem, aberta.titulo || "nota");
                  });
                }
              }}
            >
              Exportar PDF
            </Botao>
          </div>
        </div>

        <div id="conteudo-nota-pdf" className="flex-1 w-full max-w-4xl mx-auto py-8">
          <div className="mb-8">
            <input
              type="text"
              value={aberta.titulo}
              onChange={(e) => setAberta({ ...aberta, titulo: e.target.value })}
              placeholder="Sem título"
              className="w-full text-4xl font-bold border-none outline-none bg-transparent placeholder:text-muted-foreground/30 focus:ring-0 px-0"
            />
            <div className="mt-6 flex flex-col gap-2">
              <PropriedadesNotion
                dados={aberta.bruto}
                onChange={(novosDados) => setAberta({ ...aberta, bruto: novosDados })}
                camposFixos={{
                  tags: { icone: <Tag className="h-4 w-4 opacity-50" />, tipo: "multiselect" }
                }}
                opcoesRelacionamento={opcoesRelacionamento}
              />
            </div>
            <hr className="my-6 border-border" />
          </div>

          <EditorNotion
            markdown={aberta.corpo}
            onChange={(v) => setAberta({ ...aberta, corpo: v ?? "" })}
          />

          <div className="mt-12 pt-8 border-t border-border">
            <MencionadoEm
              mencoes={mencoesNotaAberta}
              aoAbrir={(caminho) => {
                const alvo = acervo.find((a) => a.caminho === caminho);
                if (alvo) {
                  abrir(alvo);
                }
              }}
            />
          </div>
        </div>

        {(() => {
          const links = extrairLinks(aberta.corpo, indice);
          if (links.length === 0) return null;
          return (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Esta nota liga a:</span>
              {links.map((l) => (
                <span
                  key={l.bruto}
                  className={
                    l.alvo
                      ? "rounded-md bg-primary/15 px-2 py-0.5 text-primary font-medium"
                      : "rounded-md bg-secondary px-2 py-0.5 text-muted-foreground"
                  }
                  title={l.alvo ? l.alvo.caminho : "Ainda não existe"}
                >
                  @{l.exibir}
                  {!l.alvo && " (não existe)"}
                </span>
              ))}
            </div>
          );
        })()}

        <p className="text-xs text-muted-foreground">
          Digite <code className="rounded bg-secondary px-1">@nome</code> ou{" "}
          <code className="rounded bg-secondary px-1">[[nome]]</code> para ligar esta nota a uma tarefa, referência ou meta.
        </p>

        <div className="flex items-center justify-between gap-3">
          <Botao onClick={salvar} disabled={salvando || !mudou}>
            <Save size={16} />
            {salvando ? "Salvando…" : mudou ? "Salvar" : "Salvo"}
          </Botao>
          {aberta.caminho && (
            <Botao variante="fantasma" onClick={remover}>
              <Trash2 size={16} />
              Apagar
            </Botao>
          )}
        </div>

        <HistoricoDiffModal
          aberto={historicoAberto}
          aoFechar={() => setHistoricoAberto(false)}
          caminho={aberta.caminho}
          conteudoAtual={aberta.corpo}
        />
      </div>
    );
  }

  /* -------------------------------------------------------------- lista */

  const visiveis = arquivos.filter((a) =>
    (titulos[a.caminho] ?? a.nome).toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Notas</h1>
        <Botao onClick={nova}>
          <Plus size={16} />
          Nova
        </Botao>
      </div>

      {arquivos.length > 0 && (
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Campo
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título"
            className="pl-9"
          />
        </div>
      )}

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {ilegiveis.length > 0 && (
        <Aviso tom="erro">
          {ilegiveis.length === 1 ? "1 arquivo não pôde" : `${ilegiveis.length} arquivos não puderam`}{" "}
          ser lido e está oculto: {ilegiveis.join(", ")}. Ele continua no
          repositório — abra pelo GitHub para conferir.
        </Aviso>
      )}

      {carregando ? (
        <Carregando texto="Buscando suas notas…" />
      ) : arquivos.length === 0 ? (
        <Vazio
          titulo="Nenhuma nota ainda"
          descricao="Crie a primeira. Ela vira um arquivo .md no seu repositório — que você pode abrir em qualquer lugar, hoje ou daqui a dez anos."
          acao={<Botao onClick={nova}>Criar primeira nota</Botao>}
        />
      ) : visiveis.length === 0 ? (
        <Vazio titulo="Nada encontrado" descricao={`Nenhuma nota com "${busca}".`} />
      ) : (
        <div className="grid gap-3">
          {visiveis.map((a) => {
            const tituloNota = titulos[a.caminho] ?? a.nome;
            return (
              <Cartao
                key={a.caminho}
                className="cursor-pointer p-4 transition-colors hover:bg-accent flex items-center justify-between group"
                onClick={() => abrir(a)}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-medium">{tituloNota}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{a.nome}</p>
                </div>
              </Cartao>
            );
          })}
        </div>
      )}
    </div>
  );
}
