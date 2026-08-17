import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Network } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, type ItemRepo } from "@/lib/repo";
import { useSalvar } from "@/lib/useSalvar";
import { escreverMarkdown, tituloProvavel, mesclarFrontmatter } from "@/lib/markdown";
import { montarIndice, alvosUnicos, mencoesA } from "@/lib/links";
import { Botao, Vazio, Carregando, Aviso } from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { NavegadorGrafo3D } from "@/components/NavegadorGrafo3D";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";

type ItemAberto = {
  caminho: string;
  sha: string;
  titulo: string;
  corpo: string;
  bruto: Record<string, any>;
  tipoRotulo: string;
  original: { titulo: string; corpo: string; bruto: Record<string, any> };
};

export default function GrafoNeural() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar } = useSalvar(cfg);

  const [acervo, setAcervo] = useState<ItemRepo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<ItemAberto | null>(null);
  const [modoVisao, setModoVisao] = useState<ModoVisaoNotion>("lado");

  const carregar = useCallback(async () => {
    if (!pronto) return;
    setCarregando(true);
    setErro("");
    try {
      const todos = await carregarRepo(cfg);
      setAcervo(todos);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, [pronto, cfg.githubToken, cfg.repoOwner, cfg.repoName, cfg.branch]);

  useEffect(() => {
    carregar();
    const aoAtualizar = () => carregar();
    window.addEventListener("acervo-atualizado", aoAtualizar);
    return () => window.removeEventListener("acervo-atualizado", aoAtualizar);
  }, [carregar]);

  const indice = useMemo(() => montarIndice(acervo), [acervo]);
  const opcoesRelacionamento = useMemo(
    () => alvosUnicos(indice).map((a) => ({ titulo: a.titulo, caminho: a.caminho })),
    [indice]
  );

  const abrirItemDoGrafo = (caminho: string) => {
    const item = acervo.find((i) => i.caminho === caminho);
    if (!item) return;

    const titulo = String(item.doc.dados.titulo || tituloProvavel(item.doc, item.nome));
    const pasta = caminho.split("/")[0];
    const tipoRotulo =
      pasta === "tarefas"
        ? "Tarefa"
        : pasta === "referencias"
        ? "Referência"
        : pasta === "pdi"
        ? "PDI Meta"
        : pasta === "lousas"
        ? "Lousa Visual"
        : "Nota";

    setAberto({
      caminho: item.caminho,
      sha: item.sha,
      titulo,
      corpo: item.doc.corpo,
      bruto: item.doc.dados,
      tipoRotulo,
      original: { titulo, corpo: item.doc.corpo, bruto: item.doc.dados },
    });
  };

  const salvarItemAberto = async () => {
    if (!aberto) return;
    const novosDados = mesclarFrontmatter(aberto.bruto, {
      titulo: aberto.titulo.trim() || undefined,
    });
    const md = escreverMarkdown({ dados: novosDados, corpo: aberto.corpo });
    const novaSha = await salvarTexto(aberto.caminho, md, aberto.sha);

    setAberto((prev) =>
      prev
        ? {
            ...prev,
            sha: novaSha,
            original: { titulo: prev.titulo, corpo: prev.corpo, bruto: novosDados },
          }
        : null
    );
  };

  const removerItemAberto = async () => {
    if (!aberto) return;
    await apagarItem(aberto.caminho, aberto.sha);
    setAberto(null);
  };

  if (!pronto) {
    return (
      <Vazio
        titulo="Grafo Neural 3D"
        descricao="Conecte sua conta do GitHub em Ajustes para visualizar seu mapa neural de conexões."
        acao={
          <Link to="/config">
            <Botao variante="primario">Ir para Ajustes</Botao>
          </Link>
        }
      />
    );
  }

  if (carregando) {
    return <Carregando texto="Mapeando conexões neurais do seu segundo cérebro em 3D..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Grafo de Relacionamentos"
        descricao="Visualização interativa das conexões entre notas, tarefas, metas e ideias do seu Segundo Cérebro."
        icone={<Network size={20} />}
        corIcone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
      />

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {/* Visualizador 3D do Grafo Neural */}
      <NavegadorGrafo3D
        acervo={acervo}
        aoSelecionarItem={abrirItemDoGrafo}
      />

      {/* Painel Notion Base para Visualização e Edição do Item Clicado */}
      {aberto && (
        <PainelNotionBase
          rotuloTipo={aberto.tipoRotulo}
          modoVisao={modoVisao}
          setModoVisao={setModoVisao}
          titulo={aberto.titulo}
          setTitulo={(t) => setAberto((prev) => (prev ? { ...prev, titulo: t } : null))}
          corpo={aberto.corpo}
          setCorpo={(c) => setAberto((prev) => (prev ? { ...prev, corpo: c } : null))}
          dadosProps={aberto.bruto}
          onChangeProps={(novosDados) =>
            setAberto((prev) => (prev ? { ...prev, bruto: novosDados } : null))
          }
          caminhoItem={aberto.caminho}
          salvando={salvando}
          temMudancas={
            aberto.titulo !== aberto.original.titulo ||
            aberto.corpo !== aberto.original.corpo ||
            JSON.stringify(aberto.bruto) !== JSON.stringify(aberto.original.bruto)
          }
          aoFechar={() => setAberto(null)}
          aoSalvar={salvarItemAberto}
          aoRemover={removerItemAberto}
          erro={erroSalvar}
          mencoes={mencoesA(aberto.caminho, acervo, indice)}
          opcoesRelacionamento={opcoesRelacionamento}
        />
      )}
    </div>
  );
}
