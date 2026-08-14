import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EditorNotion } from "@/components/EditorNotion";
import { Plus, Trash2, Search, ArrowLeft, Save, Tag } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { gravar, apagar } from "@/lib/github";
import { carregarRepo, daPasta, invalidarCache, type ItemRepo } from "@/lib/repo";
import { montarIndice, mencoesA, extrairLinks } from "@/lib/links";
import { MencionadoEm } from "@/components/Links";
import { PropriedadesNotion } from "@/components/PropriedadesNotion";
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

const PASTA = "notas";

type NotaAberta = {
  /** Frontmatter como veio do arquivo — preserva campos que o app não conhece */
  bruto: Frontmatter;
  caminho: string;
  sha: string;
  titulo: string;
  corpo: string;
  /** Título e corpo como estavam ao abrir — para saber se há mudança pendente */
  original: { titulo: string; corpo: string };
};

export default function Notas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const [arquivos, setArquivos] = useState<ItemRepo[]>([]);
  const [titulos, setTitulos] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<NotaAberta | null>(null);
  const [salvando, setSalvando] = useState(false);
  // acervo inteiro: resolve os [[links]] e as menções
  const [acervo, setAcervo] = useState<ItemRepo[]>([]);

  /* ------------------------------------------------------------ listagem */

  const carregarLista = useCallback(async () => {
    if (!pronto) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      // o conteúdo já vem junto, então o título sai daqui mesmo — antes eram
      // N requisições extras só para descobrir o título de cada nota
      const todos = await carregarRepo(cfg);
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
    // cfg vem do localStorage a cada render; comparar por valor evita loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  const indice = useMemo(() => montarIndice(acervo), [acervo]);

  const mudou =
    aberta !== null &&
    (aberta.titulo !== aberta.original.titulo ||
      aberta.corpo !== aberta.original.corpo);

  /**
   * Protege o texto do botão "voltar" do Android.
   *
   * O editor não é uma rota — é um estado dentro de /notas. O voltar do
   * sistema desmonta a tela e o que estava escrito evaporava, sem aviso.
   * Empurrar um estado no histórico dá ao voltar algo para consumir, e aqui
   * ele é interceptado.
   */
  useEffect(() => {
    if (!aberta) return;

    history.pushState({ editor: true }, "");

    const aoVoltar = () => {
      if (mudou && !confirm("Você tem alterações não salvas. Descartar?")) {
        history.pushState({ editor: true }, ""); // devolve o estado consumido
        return;
      }
      setAberta(null);
    };

    addEventListener("popstate", aoVoltar);
    return () => removeEventListener("popstate", aoVoltar);
    // `mudou` fora das deps de propósito: reempurrar o estado a cada tecla
    // digitada encheria o histórico do navegador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberta !== null]);

  /** Avisa antes de fechar a aba ou recarregar com texto não salvo. */
  useEffect(() => {
    if (!mudou) return;
    const aoSair = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", aoSair);
    return () => removeEventListener("beforeunload", aoSair);
  }, [mudou]);

  /* ------------------------------------------------------------- ações */

  /** Abre sem ir à rede: o conteúdo já veio no carregamento da lista. */
  function abrir(a: ItemRepo) {
    setErro("");
    const titulo = tituloProvavel(a.doc, a.nome);
    setAberta({
      bruto: a.doc.dados,
      caminho: a.caminho,
      sha: a.sha,
      titulo,
      corpo: a.doc.corpo,
      original: { titulo, corpo: a.doc.corpo },
    });
  }

  function nova() {
    setAberta({
      bruto: {},
      caminho: "",
      sha: "",
      titulo: "",
      corpo: "",
      original: { titulo: "", corpo: "" },
    });
  }

  async function salvar() {
    if (!aberta) return;
    const titulo = aberta.titulo.trim() || "Sem título";

    setSalvando(true);
    setErro("");
    try {
      const texto = escreverMarkdown({
        // mescla: campos que outra IA ou o github.com acrescentaram sobrevivem
        dados: mesclarFrontmatter(aberta.bruto, {
          titulo,
          tipo: "nota",
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
        original: { titulo, corpo: aberta.corpo },
      });
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
      setAberta(null);
      await carregarLista();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  /* --------------------------------------------------------- sem config */

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
        <div className="flex items-center gap-2">
          <Botao
            variante="fantasma"
            tamanho="icone"
            onClick={() => {
              if (mudou && !confirm("Você tem alterações não salvas. Sair mesmo assim?"))
                return;
              setAberta(null);
            }}
          >
            <ArrowLeft size={18} />
          </Botao>
        </div>

        <div className="flex-1 w-full max-w-4xl mx-auto py-8">
          <div className="mb-8">
            <input
              type="text"
              value={aberta.titulo}
              onChange={(e) => setAberta({ ...aberta, titulo: e.target.value })}
              placeholder="Sem título"
              className="w-full text-4xl font-bold border-none outline-none bg-transparent placeholder:text-muted-foreground/30 focus:ring-0 px-0"
            />
            {/* Notion-style Properties */}
            <div className="mt-6 flex flex-col gap-2">
              <PropriedadesNotion
                dados={aberta.bruto}
                onChange={(novosDados) => setAberta({ ...aberta, bruto: novosDados })}
                camposFixos={{
                  tags: { icone: <Tag className="h-4 w-4 opacity-50" />, tipo: "tags" }
                }}
              />
            </div>
            {/* Divider */}
            <hr className="my-6 border-border" />
          </div>

          <EditorNotion
            markdown={aberta.corpo}
            onChange={(v) => setAberta({ ...aberta, corpo: v ?? "" })}
          />
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
                      ? "rounded-md bg-primary/15 px-2 py-0.5 text-primary"
                      : "rounded-md bg-secondary px-2 py-0.5 text-muted-foreground"
                  }
                  title={l.alvo ? l.alvo.caminho : "Ainda não existe"}
                >
                  {l.exibir}
                  {!l.alvo && " (não existe)"}
                </span>
              ))}
            </div>
          );
        })()}

        {aberta.caminho && (
          <MencionadoEm mencoes={mencoesA(aberta.caminho, acervo, indice)} />
        )}

        <p className="text-xs text-muted-foreground">
          Escreva <code className="rounded bg-secondary px-1">[[nome]]</code>{" "}
          para ligar esta nota a uma tarefa, referência ou meta sua.
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
          {visiveis.map((a) => (
            <Cartao
              key={a.caminho}
              className="cursor-pointer p-4 transition-colors hover:bg-accent"
              onClick={() => abrir(a)}
            >
              <p className="font-medium">{titulos[a.caminho] ?? a.nome}</p>
              <p className="mt-1 text-xs text-muted-foreground">{a.nome}</p>
            </Cartao>
          ))}
        </div>
      )}
    </div>
  );
}
