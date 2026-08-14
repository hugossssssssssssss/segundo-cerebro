import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Plus, Layout, ArrowLeft, Save, Trash2 } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { gravar, apagar, lerOuVazio } from "@/lib/github";
import { carregarRepo, daPasta, invalidarCache, type ItemRepo } from "@/lib/repo";
import { tituloProvavel, nomeLivre } from "@/lib/markdown";
import { Botao, Campo, Cartao, Aviso, Vazio, Carregando } from "@/components/ui";

const PASTA = "lousas";

const ExcalidrawComp = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
);

type LousaAberta = {
  caminho: string;
  sha: string;
  titulo: string;
  elementos: any[];
  originalJson: string;
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
      let parsed = [];
      try {
        parsed = JSON.parse(conteudo);
      } catch {
        parsed = [];
      }

      setAberta({
        caminho: item.caminho,
        sha: item.sha,
        titulo: tituloProvavel(item.doc, item.nome),
        elementos: parsed,
        originalJson: conteudo,
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
      elementos: [],
      originalJson: "[]",
    });
  }

  async function salvar() {
    if (!aberta || !excalidrawAPI) return;
    setSalvando(true);
    setErro("");
    try {
      const elementosAtuais = excalidrawAPI.getSceneElements();
      const json = JSON.stringify(elementosAtuais, null, 2);
      const caminho =
        aberta.caminho ||
        nomeLivre(
          PASTA,
          `${aberta.titulo}.json`,
          lousas.map((x) => x.caminho),
        );

      await gravar(cfg, caminho, json, aberta.sha || undefined, `lousa: ${aberta.titulo}`);
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

  if (aberta) {
    return (
      <div className="flex flex-col gap-4 h-[calc(100vh-140px)]">
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

        <div className="flex-1 w-full rounded-2xl overflow-hidden border border-border shadow-inner bg-background">
          <Suspense fallback={<Carregando texto="Carregando editor visual Excalidraw…" />}>
            <ExcalidrawComp
              excalidrawAPI={(api) => setExcalidrawAPI(api)}
              initialData={{ elements: aberta.elementos }}
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
                <p className="text-xs text-muted-foreground">Lousa visual .json</p>
              </div>
            </Cartao>
          ))}
        </div>
      )}
    </div>
  );
}
