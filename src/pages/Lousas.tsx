import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Plus, Layout, ArrowLeft, Save, Trash2 } from "lucide-react";
import "@excalidraw/excalidraw/index.css";
import { lerConfig, configCompleta } from "@/lib/settings";
import { gravar, apagar, lerOuVazio } from "@/lib/github";
import { carregarRepo, daPasta, invalidarCache, atualizarCacheLocal, type ItemRepo } from "@/lib/repo";
import { tituloProvavel, nomeLivre } from "@/lib/markdown";
import { Botao, Campo, Cartao, Aviso, Vazio, Carregando } from "@/components/ui";

const PASTA = "lousas";

const ExcalidrawComp = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
);

type DadosLousa = {
  elements?: any[];
  appState?: any;
  files?: any;
};

type LousaAberta = {
  caminho: string;
  sha: string;
  titulo: string;
  dados: DadosLousa;
};

export default function Lousas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const [lousas, setLousas] = useState<ItemRepo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aberta, setAberta] = useState<LousaAberta | null>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);

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

  async function abrir(item: ItemRepo) {
    setCarregando(true);
    setErro("");
    try {
      const conteudo = await lerOuVazio(cfg, item.caminho, item.sha);
      let dados: DadosLousa = { elements: [] };
      try {
        const parsed = JSON.parse(conteudo);
        if (Array.isArray(parsed)) {
          dados = { elements: parsed };
        } else if (parsed && typeof parsed === "object") {
          dados = parsed;
        }
      } catch {
        dados = { elements: [] };
      }

      setAberta({
        caminho: item.caminho,
        sha: item.sha,
        titulo: tituloProvavel(item.doc, item.nome),
        dados,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  function novaLousa() {
    setAberta({
      caminho: "",
      sha: "",
      titulo: "Nova Lousa",
      dados: { elements: [] },
    });
  }

  async function salvar() {
    if (!aberta || !excalidrawAPI) return;
    setSalvando(true);
    setErro("");
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      const dadosParaSalvar = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
        },
        files,
      };

      const json = JSON.stringify(dadosParaSalvar, null, 2);
      const caminho =
        aberta.caminho ||
        nomeLivre(
          PASTA,
          `${aberta.titulo}.json`,
          lousas.map((x) => x.caminho),
        );

      const novaSha = await gravar(cfg, caminho, json, aberta.sha || undefined, `lousa: ${aberta.titulo}`);
      atualizarCacheLocal(caminho, json, { dados: {}, corpo: json }, novaSha);
      invalidarCache();
      setAberta(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    if (!aberta || !aberta.caminho) return;
    if (!confirm(`Apagar a lousa "${aberta.titulo}"?`)) return;
    try {
      await apagar(cfg, aberta.caminho, aberta.sha);
      invalidarCache();
      setAberta(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
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
      <div className="flex flex-col gap-4 h-[calc(100vh-120px)] w-full">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Botao variante="fantasma" tamanho="icone" onClick={() => setAberta(null)}>
              <ArrowLeft size={18} />
            </Botao>
            <Campo
              value={aberta.titulo}
              onChange={(e) => setAberta({ ...aberta, titulo: e.target.value })}
              placeholder="Título da lousa"
              className="text-lg font-semibold"
            />
          </div>
          <div className="flex items-center gap-2">
            {aberta.caminho && (
              <Botao variante="fantasma" onClick={remover}>
                <Trash2 size={16} />
              </Botao>
            )}
            <Botao onClick={salvar} disabled={salvando}>
              <Save size={16} />
              {salvando ? "Salvando…" : "Salvar Lousa"}
            </Botao>
          </div>
        </div>

        <div className="flex-1 w-full min-h-[500px] rounded-2xl overflow-hidden border border-border shadow-md bg-background relative">
          <Suspense fallback={<Carregando texto="Carregando editor visual Excalidraw…" />}>
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
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lousas & Moodboards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Espaço infinito para desenhar, arrastar ideias e conectar referências visuais.
          </p>
        </div>
        <Botao onClick={novaLousa}>
          <Plus size={16} />
          Nova Lousa
        </Botao>
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando texto="Carregando suas lousas…" />
      ) : lousas.length === 0 ? (
        <Vazio
          titulo="Nenhuma lousa criada ainda"
          descricao="Crie seu primeiro moodboard visual ou mapa mental."
          acao={<Botao onClick={novaLousa}>Criar primeira lousa</Botao>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {lousas.map((item) => (
            <Cartao
              key={item.caminho}
              onClick={() => abrir(item)}
              className="group cursor-pointer p-4 hover:border-primary/50 transition-colors flex items-center gap-3"
            >
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Layout size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">
                  {tituloProvavel(item.doc, item.nome)}
                </p>
                <p className="text-xs text-muted-foreground">Lousa visual Excalidraw</p>
              </div>
            </Cartao>
          ))}
        </div>
      )}
    </div>
  );
}
