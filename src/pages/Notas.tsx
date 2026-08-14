import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, Search, Tag, FileText } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { gravar, apagar } from "@/lib/github";
import {
  carregarRepo,
  daPasta,
  invalidarCache,
  atualizarCacheLocal,
  arquivosIlegiveis,
  type ItemRepo,
} from "@/lib/repo";
import { montarIndice, mencoesA } from "@/lib/links";
import {
  escreverMarkdown,
  lerMarkdown,
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
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";

const PASTA = "notas";

type NotaAberta = {
  bruto: Frontmatter;
  caminho: string;
  sha: string;
  titulo: string;
  corpo: string;
  original: { titulo: string; corpo: string; bruto?: Frontmatter };
};

import { useItemFlutuante } from "@/components/ItemFlutuanteContext";

export default function Notas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();
  const { abrirFlutuante, focarFlutuante } = useItemFlutuante();

  const [arquivos, setArquivos] = useState<ItemRepo[]>([]);
  const [titulos, setTitulos] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [modoVisao, setModoVisao] = useState<ModoVisaoNotion>("popup");
  const [aberta, setAberta] = useState<NotaAberta | null>(null);
  const [salvando, setSalvando] = useState(false);
  // acervo inteiro: serve para resolver os [[links]] e as menções
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (alvo) {
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

  // Quando o usuário clica no modo flutuante, transfere para o provedor global que flutua pelo app inteiro
  useEffect(() => {
    if (modoVisao === "flutuante" && aberta) {
      abrirFlutuante({
        id: aberta.caminho,
        rotuloTipo: aberta.caminho ? "Nota" : "Nova nota",
        titulo: aberta.titulo,
        corpo: aberta.corpo,
        dadosProps: aberta.bruto,
        camposFixosProps: {
          tipo: { icone: <FileText className="h-4 w-4 opacity-50 text-orange-500" />, tipo: "select", opcoes: ["nota", "referencia", "rascunho"] },
          tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
        },
        caminho: aberta.caminho,
        sha: aberta.sha,
        temMudancas: mudou,
        salvando,
        erro,
        mencoes: mencoesNotaAberta,
        opcoesRelacionamento,
        setTitulo: (t) => setAberta((cur) => cur ? { ...cur, titulo: t } : null),
        setCorpo: (c) => setAberta((cur) => cur ? { ...cur, corpo: c } : null),
        onChangeProps: (nProps) => setAberta((cur) => cur ? { ...cur, bruto: nProps } : null),
        aoSalvar: async (item, fechar) => {
          await salvar({ ...aberta, titulo: item.titulo, corpo: item.corpo, bruto: item.dadosProps }, fechar);
        },
        aoRemover: aberta.caminho ? async () => { await remover(); } : undefined,
      });
      setAberta(null);
      setModoVisao("popup");
    }
  }, [modoVisao, aberta]);

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
    if (focarFlutuante(a.caminho)) return;
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

  // Temporizador de segurança: salva nota em 2.5s de pausa na digitação (em segundo plano, sem fechar)
  useEffect(() => {
    if (!mudou || salvando || !aberta) return;
    const timer = setTimeout(() => {
      salvar(aberta, false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [mudou, salvando, aberta]);

  async function salvar(alvo?: NotaAberta, fecharAoSalvar = true) {
    const n = alvo || aberta;
    if (!n) return;
    const titulo = n.titulo.trim() || "Sem título";

    setSalvando(true);
    setErro("");
    try {
      const texto = escreverMarkdown({
        dados: mesclarFrontmatter(n.bruto, {
          titulo,
          tipo:
            typeof n.bruto.tipo === "string" && n.bruto.tipo
              ? n.bruto.tipo
              : "nota",
          atualizado: hojeISO(),
        }),
        corpo: n.corpo,
      });

      const caminho =
        n.caminho ||
        nomeLivre(PASTA, titulo, arquivos.map((a) => a.caminho));

      // Atualiza o cache de memória local IMEDIATAMENTE (0ms) para que reabrir a nota seja instantâneo
      const docAtualizado = lerMarkdown(texto);
      atualizarCacheLocal(caminho, texto, docAtualizado, n.sha || undefined);

      const novaSha = await gravar(
        cfg,
        caminho,
        texto,
        n.sha || undefined,
      );
      atualizarCacheLocal(caminho, texto, docAtualizado, novaSha);
      invalidarCache();
      const nSalva: NotaAberta = {
        ...n,
        caminho,
        sha: novaSha,
        original: { titulo, corpo: n.corpo, bruto: n.bruto },
      };
      setAberta(nSalva);
      if (fecharAoSalvar) {
        fecharNota();
      }
      await carregarLista();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    if (!aberta?.caminho) return;
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

      {aberta !== null && (
        <PainelNotionBase
          rotuloTipo={aberta.caminho ? "Nota" : "Nova nota"}
          modoVisao={modoVisao}
          setModoVisao={setModoVisao}
          titulo={aberta.titulo}
          setTitulo={(t) => setAberta({ ...aberta, titulo: t })}
          corpo={aberta.corpo}
          setCorpo={(c) => setAberta({ ...aberta, corpo: c })}
          dadosProps={aberta.bruto}
          onChangeProps={(novosDados) => setAberta({ ...aberta, bruto: novosDados })}
          camposFixosProps={{
            tipo: { icone: <FileText className="h-4 w-4 opacity-50 text-orange-500" />, tipo: "select", opcoes: ["nota", "referencia", "rascunho"] },
            tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
          }}
          salvando={salvando}
          temMudancas={mudou}
          aoFechar={fecharNota}
          aoSalvar={async (fechar) => { await salvar(aberta, fechar); }}
          aoRemover={aberta.caminho ? async () => { await remover(); } : undefined}
          erro={erro}
          mencoes={mencoesNotaAberta}
          opcoesRelacionamento={opcoesRelacionamento}
        />
      )}
    </div>
  );
}
