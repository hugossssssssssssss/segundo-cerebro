import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Layout,
  ArrowLeft,
  Save,
  Trash2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Link as LinkIcon,
} from "lucide-react";
import "@excalidraw/excalidraw/index.css";
import { lerConfig, configCompleta } from "@/lib/settings";
import { gravar, apagar, lerOuVazio } from "@/lib/github";
import {
  carregarRepo,
  daPasta,
  invalidarCache,
  atualizarCacheLocal,
  type ItemRepo,
} from "@/lib/repo";
import { tituloProvavel, nomeLivre } from "@/lib/markdown";
import { Botao, Campo, Cartao, Aviso, Vazio, Carregando } from "@/components/ui";

const PASTA = "lousas";

const ExcalidrawComp = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
);

type DadosLousa = {
  title?: string;
  elements?: any[];
  appState?: any;
  files?: any;
};

type LousaAberta = {
  caminho: string;
  sha: string;
  titulo: string;
  tituloOriginal: string;
  dados: DadosLousa;
};

export default function Lousas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const [lousas, setLousas] = useState<ItemRepo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [aberta, setAberta] = useState<LousaAberta | null>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!pronto) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const todos = await carregarRepo(cfg, { memoria: 3000 });
      const itens = daPasta(todos, PASTA);
      setLousas(itens);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Abertura automática via parâmetro de URL (?abrir=lousas/nome.json)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("abrir=") && lousas.length > 0) {
      const params = new URLSearchParams(hash.split("?")[1] || "");
      const caminhoAbrir = params.get("abrir");
      if (caminhoAbrir) {
        const itemEncontrado = lousas.find((i) => i.caminho === caminhoAbrir);
        if (itemEncontrado && (!aberta || aberta.caminho !== caminhoAbrir)) {
          abrir(itemEncontrado);
        }
      }
    }
  }, [lousas]);

  async function abrir(item: ItemRepo) {
    setCarregando(true);
    setErro("");
    setMensagemSucesso("");
    try {
      const conteudo = await lerOuVazio(cfg, item.caminho, item.sha);
      let dados: DadosLousa = { elements: [] };
      let titulo = tituloProvavel(item.doc, item.nome);

      try {
        const parsed = JSON.parse(conteudo);
        if (Array.isArray(parsed)) {
          dados = { elements: parsed };
        } else if (parsed && typeof parsed === "object") {
          dados = parsed;
          if (parsed.title) titulo = parsed.title;
        }
      } catch {
        dados = { elements: [] };
      }

      setAberta({
        caminho: item.caminho,
        sha: item.sha,
        titulo: titulo || "Lousa Sem Título",
        tituloOriginal: titulo || "Lousa Sem Título",
        dados,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  function novaLousa() {
    setErro("");
    setMensagemSucesso("");
    setAberta({
      caminho: "",
      sha: "",
      titulo: "Novo Mapa Mental",
      tituloOriginal: "",
      dados: { elements: [] },
    });
  }

  async function salvar() {
    if (!aberta) return;
    setSalvando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      let elements = aberta.dados.elements || [];
      let appState = aberta.dados.appState || {};
      let files = aberta.dados.files || {};

      if (excalidrawAPI) {
        elements = excalidrawAPI.getSceneElements() || [];
        appState = excalidrawAPI.getAppState() || {};
        files = excalidrawAPI.getFiles() || {};
      }

      const dadosParaSalvar = {
        title: aberta.titulo,
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor || "#ffffff",
          gridSize: appState.gridSize || null,
        },
        files,
      };

      const json = JSON.stringify(dadosParaSalvar, null, 2);

      // Se o título mudou ou é uma nova lousa, recalcula o caminho do arquivo
      const tituloLimpo = aberta.titulo.trim() || "Lousa Sem Título";
      let novoCaminho = aberta.caminho;

      if (!aberta.caminho || aberta.titulo !== aberta.tituloOriginal) {
        novoCaminho = nomeLivre(
          PASTA,
          `${tituloLimpo}.json`,
          lousas.map((x) => x.caminho)
        );
      }

      // Se o caminho mudou e existia arquivo antigo, remove o arquivo antigo do GitHub
      if (aberta.caminho && aberta.caminho !== novoCaminho) {
        try {
          await apagar(cfg, aberta.caminho, aberta.sha);
        } catch {
          // ignora falha na remoção do antigo
        }
      }

      const novaSha = await gravar(
        cfg,
        novoCaminho,
        json,
        aberta.caminho === novoCaminho ? aberta.sha || undefined : undefined,
        `lousa: ${tituloLimpo}`
      );

      atualizarCacheLocal(novoCaminho, json, { dados: { titulo: tituloLimpo }, corpo: json }, novaSha);
      invalidarCache();

      setAberta({
        caminho: novoCaminho,
        sha: novaSha,
        titulo: tituloLimpo,
        tituloOriginal: tituloLimpo,
        dados: dadosParaSalvar,
      });

      setMensagemSucesso(`Lousa "${tituloLimpo}" salva com sucesso!`);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    if (!aberta || !aberta.caminho) return;
    if (!confirm(`Tem certeza que deseja apagar a lousa "${aberta.titulo}"?`)) return;
    try {
      await apagar(cfg, aberta.caminho, aberta.sha);
      invalidarCache();
      setAberta(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  function copiarWikilink(caminho: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const link = `[[${caminho}]]`;
    navigator.clipboard.writeText(link);
    setCopiadoId(caminho);
    setTimeout(() => setCopiadoId(null), 2000);
  }

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

  const ehModoEscuro = document.documentElement.classList.contains("dark");

  if (aberta) {
    return (
      <div
        className={
          telaCheia
            ? "fixed inset-0 z-50 bg-background flex flex-col p-4 space-y-3"
            : "flex flex-col gap-4 h-[calc(100vh-120px)] w-full"
        }
      >
        {/* Barra Superior da Lousa Aberta */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Botao variante="fantasma" tamanho="pequeno" onClick={() => setAberta(null)}>
              <ArrowLeft size={16} />
              <span>Voltar</span>
            </Botao>
            <Campo
              value={aberta.titulo}
              onChange={(e) => setAberta({ ...aberta, titulo: e.target.value })}
              placeholder="Nome do Mapa Mental / Lousa"
              className="text-base font-semibold"
            />
          </div>

          <div className="flex items-center gap-2">
            {aberta.caminho && (
              <Botao
                variante="neutro"
                tamanho="pequeno"
                onClick={(e) => copiarWikilink(aberta.caminho, e)}
                className="flex items-center gap-1.5"
              >
                {copiadoId === aberta.caminho ? <Check size={14} /> : <LinkIcon size={14} />}
                <span>{copiadoId === aberta.caminho ? "Link Copiado!" : "Copiar Link [[...]]"}</span>
              </Botao>
            )}

            <Botao
              variante="neutro"
              tamanho="pequeno"
              onClick={() => setTelaCheia(!telaCheia)}
              className="flex items-center gap-1.5"
            >
              {telaCheia ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{telaCheia ? "Sair da Tela Cheia" : "Tela Cheia"}</span>
            </Botao>

            {aberta.caminho && (
              <Botao variante="fantasma" tamanho="icone" onClick={remover} title="Apagar lousa">
                <Trash2 size={16} className="text-red-500" />
              </Botao>
            )}

            <Botao variante="primario" tamanho="pequeno" onClick={salvar} disabled={salvando}>
              <Save size={15} />
              <span>{salvando ? "Salvando..." : "Salvar Lousa"}</span>
            </Botao>
          </div>
        </div>

        {erro && <Aviso tom="erro">{erro}</Aviso>}
        {mensagemSucesso && <Aviso tom="sucesso">{mensagemSucesso}</Aviso>}

        {/* Canvas do Excalidraw */}
        <div className="flex-1 w-full min-h-[500px] rounded-2xl overflow-hidden border border-border shadow-md bg-background relative">
          <Suspense fallback={<Carregando texto="Carregando editor visual Excalidraw..." />}>
            <ExcalidrawComp
              excalidrawAPI={(api) => setExcalidrawAPI(api)}
              theme={ehModoEscuro ? "dark" : "light"}
              initialData={{
                elements: aberta.dados.elements || [],
                appState: aberta.dados.appState || {},
                files: aberta.dados.files || {},
              }}
              UIOptions={{
                canvasActions: {
                  changeViewBackgroundColor: true,
                  clearCanvas: true,
                  loadScene: true,
                  saveToActiveFile: true,
                  toggleTheme: true,
                },
              }}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layout size={20} />
            </div>
            Excalidraw (Mapas Mentais & Lousas)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Desenhe diagramas, mapas mentais e conecte aos seus projetos, notas e metas.
          </p>
        </div>
        <Botao variante="primario" onClick={novaLousa}>
          <Plus size={16} />
          <span>Nova Lousa</span>
        </Botao>
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando texto="Carregando suas lousas e mapas mentais..." />
      ) : lousas.length === 0 ? (
        <Vazio
          titulo="Nenhuma lousa criada ainda"
          descricao="Crie seu primeiro mapa mental ou diagram visual."
          acao={<Botao onClick={novaLousa}>Criar Primeira Lousa</Botao>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {lousas.map((item) => {
            const titulo = tituloProvavel(item.doc, item.nome);
            return (
              <Cartao
                key={item.caminho}
                onClick={() => abrir(item)}
                className="group cursor-pointer p-4 hover:border-primary/50 transition-colors flex items-center justify-between gap-3 bg-card"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
                    <Layout size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground truncate">{titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Excalidraw • `{item.caminho}`
                    </p>
                  </div>
                </div>

                <Botao
                  variante="neutro"
                  tamanho="icone"
                  onClick={(e) => copiarWikilink(item.caminho, e)}
                  title="Copiar link [[lousas/...]] para notas e metas"
                  className="shrink-0"
                >
                  {copiadoId === item.caminho ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </Botao>
              </Cartao>
            );
          })}
        </div>
      )}
    </div>
  );
}
