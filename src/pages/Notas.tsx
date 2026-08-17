import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, Tag, FileText } from "lucide-react";
import { MODELOS_PADRAO, type TemplateItem } from "@/lib/templates";
import { lerConfig, configCompleta } from "@/lib/settings";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import { PASTAS } from "@/lib/tipos";
import { comoNota, notaParaArquivo } from "@/lib/entidades";
import { montarIndice, mencoesA, alvosUnicos } from "@/lib/links";
import {
  escreverMarkdown,
  tituloProvavel,
  nomeLivre,
  type Frontmatter,
} from "@/lib/markdown";
import { lerParametroAbrir, correspondeBusca } from "@/lib/utils";
import {
  Botao,
  Aviso,
  Vazio,
  Carregando,
  ModalConfirmacao,
} from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { CartaoItem } from "@/components/CartaoItem";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import { toast } from "@/lib/toast";
import type { Nota } from "@/lib/tipos";

// Nota com rastreamento de mudanças para o painel de edição
type NotaAberta = Nota & {
  original: { titulo: string; corpo: string; bruto?: Frontmatter };
};

export default function Notas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();
  const { abrirFlutuante, focarFlutuante } = useItemFlutuante();

  // ── Carregamento ──────────────────────────────────────────────────────────
  const { itens: arquivos, acervo, titulos, carregando, erro: erroCarregar, ilegiveis, recarregar } =
    useItemRepo(cfg, PASTAS.notas, (item) =>
      comoNota(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
    );

  // ── Salvamento ────────────────────────────────────────────────────────────
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar, limparErro } = useSalvar(cfg);
  const erro = erroCarregar || erroSalvar;

  // ── Estado da UI ──────────────────────────────────────────────────────────
  const [busca, setBusca] = useState("");
  const [modoVisao, setModoVisao] = useState<ModoVisaoNotion>("popup");
  const [aberta, setAberta] = useState<NotaAberta | null>(null);

  // ── Relacionamentos ────────────────────────────────────────────────────────
  const indice = useMemo(() => montarIndice(acervo), [acervo]);
  const opcoesRelacionamento = useMemo(() =>
    alvosUnicos(indice)
      .map(a => ({ titulo: a.titulo, caminho: a.caminho }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo)),
    [indice],
  );
  const mencoesNotaAberta = useMemo(() => {
    if (!aberta?.caminho) return [];
    return mencoesA(aberta.caminho, acervo, indice);
  }, [aberta?.caminho, acervo, indice]);

  // ── Abre item pela URL ─────────────────────────────────────────────────────
  const processouUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const urlAtual = `${location.pathname}${location.search}${location.hash}`;
    const abrirCaminho = lerParametroAbrir(location);
    if (!abrirCaminho) return;
    if (processouUrlRef.current === urlAtual) return;
    if (acervo.length > 0) {
      if (focarFlutuante(abrirCaminho)) return;
      const alvo = acervo.find((a) => a.caminho === abrirCaminho);
      if (alvo) {
        processouUrlRef.current = urlAtual;
        const nota = comoNota(alvo.doc, alvo.caminho, alvo.sha, tituloProvavel(alvo.doc, alvo.nome));
        setAberta({ ...nota, original: { titulo: nota.titulo, corpo: nota.corpo, bruto: nota.bruto } });
      }
    }
  }, [location.pathname, location.search, location.hash, acervo.length > 0]);

  // ── Proteção contra fechar com mudança não salva ───────────────────────────
  const mudou = aberta
    ? aberta.titulo !== aberta.original.titulo ||
      aberta.corpo !== aberta.original.corpo ||
      JSON.stringify(aberta.bruto) !== JSON.stringify(aberta.original.bruto)
    : false;

  const [mostrarConfirmacaoDescarte, setMostrarConfirmacaoDescarte] = useState(false);

  useEffect(() => {
    if (!aberta) return;
    history.pushState({ editor: true }, "");
    const aoVoltar = () => {
      if (mudou) {
        setMostrarConfirmacaoDescarte(true);
        history.pushState({ editor: true }, "");
        return;
      }
      fecharNota();
    };
    addEventListener("popstate", aoVoltar);
    return () => removeEventListener("popstate", aoVoltar);
  }, [aberta !== null, mudou]);

  useEffect(() => {
    if (!mudou) return;
    const aoSair = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", aoSair);
    return () => removeEventListener("beforeunload", aoSair);
  }, [mudou]);

  // ── Modo flutuante ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (modoVisao === "flutuante" && aberta) {
      const notaOriginal = { ...aberta };
      abrirFlutuante({
        id: notaOriginal.caminho,
        rotuloTipo: notaOriginal.caminho ? "Nota" : "Nova nota",
        titulo: notaOriginal.titulo,
        corpo: notaOriginal.corpo,
        dadosProps: notaOriginal.bruto,
        camposFixosProps: {
          tipo: { icone: <FileText className="h-4 w-4 opacity-50 text-orange-500" />, tipo: "select", opcoes: ["nota", "referencia", "rascunho"] },
          tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
        },
        caminho: notaOriginal.caminho,
        sha: notaOriginal.sha,
        temMudancas: mudou,
        salvando,
        erro,
        mencoes: mencoesNotaAberta,
        opcoesRelacionamento,
        aoSalvar: async (itemFlutuanteAtual) => {
          const titulo = itemFlutuanteAtual.titulo.trim() || "Sem título";
          const notaAtualizada: Nota = {
            caminho: itemFlutuanteAtual.caminho,
            sha: itemFlutuanteAtual.sha,
            bruto: itemFlutuanteAtual.dadosProps || {},
            titulo,
            tipo: (itemFlutuanteAtual.dadosProps.tipo as any) || "nota",
            tags: itemFlutuanteAtual.dadosProps.tags || [],
            corpo: itemFlutuanteAtual.corpo,
          };
          const { dados, corpo } = notaParaArquivo(notaAtualizada);
          const texto = escreverMarkdown({ dados, corpo });
          const caminho = itemFlutuanteAtual.caminho || nomeLivre(PASTAS.notas, titulo, arquivos.map((a) => a.caminho));
          await salvarTexto(caminho, texto, itemFlutuanteAtual.sha || undefined);
          recarregar();
        },
        aoRemover: notaOriginal.caminho ? async () => {
          await apagarItem(notaOriginal.caminho, notaOriginal.sha);
          recarregar();
        } : undefined,
      });
      setAberta(null);
      setModoVisao("popup");
    }
  }, [modoVisao, aberta]);

  // ── Ações ──────────────────────────────────────────────────────────────────

  function fecharNota() {
    setAberta(null);
    limparErro();
    navegar(location.pathname, { replace: true });
  }

  const { fecharFlutuante, estaAbertoFlutuante } = useItemFlutuante();

  function abrir(nota: Nota) {
    if (estaAbertoFlutuante(nota.caminho)) {
      fecharFlutuante();
    }
    if (aberta && aberta.caminho !== nota.caminho && mudou) {
      salvar(aberta).catch((err) => {
        toast(`Erro ao salvar alterações da nota anterior: ${err?.message || "Falha na gravação"}`, { tipo: "erro" });
      });
    }
    setAberta({ ...nota, original: { titulo: nota.titulo, corpo: nota.corpo, bruto: nota.bruto } });
    window.history.replaceState(null, "", `?abrir=${encodeURIComponent(nota.caminho)}`);
  }

  function nova(template?: TemplateItem) {
    const notaVazia: NotaAberta = {
      bruto: template ? { ...template.frontmatter } : {},
      caminho: "",
      sha: "",
      titulo: template ? template.titulo : "",
      tipo: (template?.frontmatter?.tipo as any) || "nota",
      tags: template?.frontmatter?.tags || [],
      corpo: template ? template.corpoPadrao : "",
      original: { titulo: "", corpo: "", bruto: {} },
    };
    setAberta(notaVazia);
  }

  async function salvar(alvo?: NotaAberta) {
    const n = alvo || aberta;
    if (!n) return;
    const titulo = n.titulo.trim() || "Sem título";
    const notaAtualizada: Nota = { ...n, titulo };
    const { dados, corpo } = notaParaArquivo(notaAtualizada);
    const texto = escreverMarkdown({ dados, corpo });
    const caminho = n.caminho || nomeLivre(PASTAS.notas, titulo, arquivos.map((a) => a.caminho));

    const novaSha = await salvarTexto(caminho, texto, n.sha || undefined);

    setAberta((atual) => {
      if (!atual || (atual.caminho !== caminho && atual.caminho !== "")) return atual;
      return { ...atual, caminho, sha: novaSha, titulo, original: { titulo, corpo, bruto: dados } };
    });

    recarregar();
  }

  async function remover() {
    if (!aberta?.caminho) return;
    await apagarItem(aberta.caminho, aberta.sha);
    fecharNota();
    recarregar();
  }

  // ── Sem configuração ────────────────────────────────────────────────────────
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

  const visiveis = arquivos.filter((a) =>
    correspondeBusca(titulos[a.caminho] ?? a.titulo ?? a.caminho, busca) ||
    correspondeBusca(a.corpo, busca),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Notas"
        descricao="Anotações e rascunhos em Markdown armazenados no seu repositório."
        icone={<FileText size={20} />}
        corIcone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        acoes={
          <>
            <select
              onChange={(e) => {
                const tmpl = MODELOS_PADRAO.find((m) => m.id === e.target.value);
                if (tmpl) nova(tmpl);
                e.target.value = "";
              }}
              defaultValue=""
              className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer shadow-2xs"
            >
              <option value="" disabled>Usar Modelo...</option>
              {MODELOS_PADRAO.map((m) => (
                <option key={m.id} value={m.id}>{m.titulo}</option>
              ))}
            </select>
            <Botao onClick={() => nova()}>
              <Plus size={16} />
              Nova Nota
            </Botao>
          </>
        }
      />

      {arquivos.length > 0 && (
        <BarraFerramentas
          busca={busca}
          aoMudarBusca={setBusca}
          placeholderBusca="Buscar nota por título..."
        />
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
          icone={<FileText size={24} />}
          titulo="Nenhuma nota criada ainda"
          descricao="Crie a primeira nota. Ela vira um arquivo .md no seu repositório — que você pode abrir em qualquer lugar."
          acao={<Botao onClick={() => nova()}>Criar primeira nota</Botao>}
        />
      ) : visiveis.length === 0 ? (
        <Vazio
          icone={<FileText size={24} />}
          titulo="Nenhuma nota encontrada"
          descricao={`Nenhum resultado corresponde à busca por "${busca}".`}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {visiveis.map((nota) => {
            const tituloNota = titulos[nota.caminho] ?? nota.titulo ?? nota.caminho;
            const nomeArquivo = nota.caminho.split("/").pop();
            return (
              <CartaoItem
                key={nota.caminho}
                icone={<FileText size={18} />}
                titulo={tituloNota}
                subtitulo={nomeArquivo}
                tags={nota.tags}
                onClick={() => abrir(nota)}
              />
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
          caminhoItem={aberta.caminho}
          dadosProps={aberta.bruto}
          onChangeProps={(novosDados) => setAberta({ ...aberta, bruto: novosDados })}
          camposFixosProps={{
            tipo: { icone: <FileText className="h-4 w-4 opacity-50 text-orange-500" />, tipo: "select", opcoes: ["nota", "referencia", "rascunho"] },
            tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
          }}
          salvando={salvando}
          temMudancas={mudou}
          aoFechar={fecharNota}
          aoSalvar={async () => { if (aberta) await salvar(aberta); }}
          aoRemover={aberta.caminho ? async () => { await remover(); } : undefined}
          erro={erro}
          mencoes={mencoesNotaAberta}
          opcoesRelacionamento={opcoesRelacionamento}
        />
      )}

      <ModalConfirmacao
        aberto={mostrarConfirmacaoDescarte}
        titulo="Descartar alterações não salvas?"
        descricao="Você possui edições nesta nota que ainda não foram salvas. Deseja descartar as alterações?"
        textoConfirmar="Descartar Alterações"
        varianteConfirmar="perigo"
        aoConfirmar={() => {
          setMostrarConfirmacaoDescarte(false);
          fecharNota();
        }}
        aoCancelar={() => setMostrarConfirmacaoDescarte(false)}
      />
    </div>
  );
}
