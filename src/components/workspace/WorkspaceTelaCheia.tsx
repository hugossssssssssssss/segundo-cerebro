import { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { Aviso, ModalConfirmacao } from "@/components/ui";
import { PropriedadesNotion } from "@/components/PropriedadesNotion";
import { EditorNotion } from "@/components/EditorNotion";
import { Subtarefas } from "@/components/Subtarefas";
import { MencionadoEm } from "@/components/Links";
import { MapaMentalEmbed } from "@/components/MapaMentalEmbed";
import { sincronizarRelacionamentos } from "@/lib/links";
import { lerMarkdown, escreverMarkdown } from "@/lib/markdown";
import { gerenciadorCamadas, NIVEIS_CAMADAS } from "@/lib/camadas";
import { useWorkspace } from "./WorkspaceContext";
import { WorkspaceBreadcrumbs } from "./WorkspaceBreadcrumbs";
import { WorkspaceRodape } from "./WorkspaceRodape";
import { WorkspaceVazio } from "./WorkspaceVazio";
import { useSalvar } from "@/lib/useSalvar";
import { lerConfig } from "@/lib/settings";
import { cache, invalidarCache } from "@/lib/repo";
import { toast } from "@/lib/toast";

const HistoricoDiffModal = lazy(() =>
  import("@/components/HistoricoDiffModal").then((m) => ({
    default: m.HistoricoDiffModal,
  }))
);

export function WorkspaceTelaCheia() {
  const {
    abas,
    abaAtiva,
    workspaceAberto,
    fecharWorkspace,
    atualizarAbaAtiva,
    fecharAba,
  } = useWorkspace();

  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [vendoHistorico, setVendoHistorico] = useState(false);

  // Registro de camadas para ESC fechar o workspace
  useEffect(() => {
    if (!workspaceAberto) return;
    const limpar = gerenciadorCamadas.registrar({
      id: "workspace-tela-cheia",
      nivel: NIVEIS_CAMADAS.PAINEL_NOTION_BASE,
      temBackdrop: true,
      aoFechar: fecharWorkspace,
    });
    return () => limpar();
  }, [workspaceAberto, fecharWorkspace]);

  // Alerta de segurança ao tentar sair da janela se houver mudanças não salvas
  const temMudancasGlobal = useMemo(() => {
    return abas.some((a) => a.temMudancas);
  }, [abas]);

  const cfg = useMemo(() => lerConfig(), []);
  const { salvarTexto, apagarItem } = useSalvar(cfg);

  const moverParaPasta = useCallback(async (novaSubpasta: string) => {
    if (!abaAtiva?.caminho) return;
    const caminhoItem = abaAtiva.caminho;
    const partes = caminhoItem.split("/");
    const pastaRaiz = partes[0] === "pdi" ? `pdi/${partes[1]}` : partes[0];
    const nomeArquivo = partes[partes.length - 1];
    const prefixoDestino = novaSubpasta ? `${pastaRaiz}/${novaSubpasta}` : pastaRaiz;
    const novoCaminho = `${prefixoDestino}/${nomeArquivo}`;

    if (novoCaminho === caminhoItem) return;

    try {
      const texto = escreverMarkdown({ dados: abaAtiva.dadosProps || {}, corpo: abaAtiva.corpo || "" });
      await salvarTexto(novoCaminho, texto, undefined, `mover: ${nomeArquivo} para ${novaSubpasta || "raiz"}`);
      const itemOrigem = cache?.itens?.find((i) => i.caminho === caminhoItem);
      if (itemOrigem?.sha) {
        await apagarItem(caminhoItem, itemOrigem.sha);
      }
      invalidarCache();
      window.dispatchEvent(new CustomEvent("acervo-atualizado"));
      toast(`Documento movido para "${novaSubpasta || pastaRaiz}" com sucesso!`, { tipo: "sucesso" });
      atualizarAbaAtiva({ caminho: novoCaminho, id: novoCaminho });
    } catch (err: any) {
      toast(`Erro ao mover o item: ${err?.message || err}`, { tipo: "erro" });
    }
  }, [abaAtiva, salvarTexto, apagarItem, atualizarAbaAtiva]);

  useEffect(() => {
    if (!temMudancasGlobal) return;
    const aoSairDaJanela = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", aoSairDaJanela);
    return () => window.removeEventListener("beforeunload", aoSairDaJanela);
  }, [temMudancasGlobal]);

  // Relacionamentos e menções
  const opcoesRelacionamento = abaAtiva?.opcoesRelacionamento || [];
  const alvosOverride = useMemo(() => {
    if (!opcoesRelacionamento || opcoesRelacionamento.length === 0) return undefined;
    return opcoesRelacionamento.map((o) => {
      const pasta = o.caminho.split("/")[0]?.toLowerCase() || "";
      let tipo: any = "nota";
      if (pasta === "tarefas") tipo = "tarefa";
      else if (pasta === "referencias") tipo = "referencia";
      else if (pasta === "pdi" || pasta === "metas") tipo = "meta";
      else if (pasta === "lousas") tipo = "lousa";
      return {
        caminho: o.caminho,
        titulo: o.titulo,
        tipo,
      };
    });
  }, [opcoesRelacionamento]);

  const titulosConhecidos = useMemo(
    () =>
      opcoesRelacionamento.length
        ? opcoesRelacionamento.map((o) => o.titulo)
        : undefined,
    [opcoesRelacionamento]
  );

  const sincronizarRef = useRef({
    dadosProps: abaAtiva?.dadosProps,
    titulosConhecidos,
  });
  sincronizarRef.current = {
    dadosProps: abaAtiva?.dadosProps,
    titulosConhecidos,
  };

  const sincronizarCorpo = useCallback(
    (textoDoCorpo: string) => {
      if (!abaAtiva) return;
      const { dadosProps: dados, titulosConhecidos: titulos } = sincronizarRef.current;
      if (!dados) return;
      const sinc = sincronizarRelacionamentos(dados, textoDoCorpo, titulos);
      if (JSON.stringify(sinc) !== JSON.stringify(dados)) {
        atualizarAbaAtiva({ dadosProps: sinc });
      }
    },
    [abaAtiva, atualizarAbaAtiva]
  );

  useEffect(() => {
    if (!abaAtiva?.corpo) return;
    sincronizarCorpo(abaAtiva.corpo);
  }, [abaAtiva?.corpo, titulosConhecidos, sincronizarCorpo]);

  // Lousas mencionadas no documento ativo
  const lousasMencionadas = useMemo(() => {
    if (!abaAtiva) return [];
    const rels = (abaAtiva.dadosProps?.relacionamentos as string[]) || [];
    const textoCombinado = `${abaAtiva.corpo || ""} ${rels.join(" ")}`.toLowerCase();

    return (opcoesRelacionamento || []).filter((o) => {
      const ehLousa = o.caminho.startsWith("lousas/") || o.caminho.includes("lousa");
      if (!ehLousa) return false;
      const norm = o.titulo.toLowerCase().trim();
      const arq = o.caminho.split("/").pop()?.replace(/\.md$/, "").toLowerCase().trim() || "";
      return (
        norm &&
        (textoCombinado.includes(`@${norm}`) ||
          textoCombinado.includes(`[[${norm}]]`) ||
          (arq && textoCombinado.includes(arq)))
      );
    });
  }, [opcoesRelacionamento, abaAtiva]);

  if (!workspaceAberto) return null;

  const ehTarefa = abaAtiva?.rotuloTipo?.toLowerCase().includes("tarefa") || abaAtiva?.caminho?.startsWith("tarefas/");

  const lidarApagarAbaAtiva = async () => {
    if (!abaAtiva) return;
    setConfirmandoApagar(false);
    if (abaAtiva.aoRemover) {
      await abaAtiva.aoRemover();
    }
    await fecharAba(abaAtiva.id);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card overflow-hidden animate-in fade-in zoom-in-[0.99] duration-200 ease-out">
      {/* Corpo do Workspace */}
      {abas.length === 0 || !abaAtiva ? (
        <WorkspaceVazio />
      ) : (
        <div key={abaAtiva.id} className="flex-1 min-h-0 flex flex-col overflow-hidden animate-in fade-in duration-150 ease-out">
          {/* Cabeçalho Interativo com Breadcrumbs */}
          <div className="flex items-center justify-between border-b border-border/80 px-4 sm:px-6 py-2 bg-card/60 shrink-0">
            <WorkspaceBreadcrumbs caminho={abaAtiva.caminho} titulo={abaAtiva.titulo} />
          </div>

          {/* Conteúdo do Documento Ativo */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 sm:px-12 py-6">
            <div className="space-y-5 max-w-4xl mx-auto w-full">
              {abaAtiva.erro && <Aviso tom="erro">{abaAtiva.erro}</Aviso>}

                {/* Título do Documento */}
                <input
                  type="text"
                  value={abaAtiva.titulo || ""}
                  onChange={(e) => atualizarAbaAtiva({ titulo: e.target.value })}
                  placeholder="Sem título"
                  className="w-full text-2xl sm:text-3xl font-bold border-none outline-none bg-transparent placeholder:text-muted-foreground/30 focus:ring-0 px-0 pt-1"
                />

                {/* Propriedades Notion */}
                <div className="flex flex-col gap-2">
                  <PropriedadesNotion
                    dados={abaAtiva.dadosProps || {}}
                    corpoTexto={abaAtiva.corpo || ""}
                    onChange={(novosDados) => atualizarAbaAtiva({ dadosProps: novosDados })}
                    camposFixos={abaAtiva.camposFixosProps}
                    opcoesRelacionamento={abaAtiva.opcoesRelacionamento}
                    caminhoItem={abaAtiva.caminho}
                    rotuloTipo={abaAtiva.rotuloTipo}
                    aoMoverPasta={moverParaPasta}
                  />
                </div>

                <hr className="border-border" />

                {/* Subtarefas se for tarefa */}
                {ehTarefa && (
                  <>
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Passos / Subtarefas
                      </label>
                      <Subtarefas
                        corpo={abaAtiva.corpo || ""}
                        onChange={(novoCorpo) => atualizarAbaAtiva({ corpo: novoCorpo })}
                      />
                    </div>
                    <hr className="border-border" />
                  </>
                )}

                {/* Editor Markdown */}
                <div className="min-h-[260px] space-y-4">
                  <EditorNotion
                    key={abaAtiva.id || abaAtiva.caminho || "workspace-editor"}
                    markdown={abaAtiva.corpo || ""}
                    alvosOverride={alvosOverride}
                    onChange={(v) => {
                      atualizarAbaAtiva({ corpo: v ?? "" });
                    }}
                  />

                  {lousasMencionadas.map((l) => (
                    <MapaMentalEmbed
                      key={l.caminho}
                      item={{
                        caminho: l.caminho,
                        nome: l.caminho.split("/").pop() || "",
                        sha: "",
                        texto: "",
                        tamanho: 0,
                        doc: { dados: { titulo: l.titulo, tipo: "lousa" }, corpo: "" },
                      }}
                    />
                  ))}
                </div>

                {abaAtiva.mencoes && abaAtiva.mencoes.length > 0 && (
                  <div className="mt-6 border-t border-border pt-5">
                    <MencionadoEm mencoes={abaAtiva.mencoes} />
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé Sequencial */}
            <WorkspaceRodape
              aoRemover={abaAtiva.aoRemover || abaAtiva.caminho ? () => setConfirmandoApagar(true) : undefined}
              aoVerHistorico={abaAtiva.caminho ? () => setVendoHistorico(true) : undefined}
              temHistorico={!!abaAtiva.caminho}
            />
          </div>
        )}

      {/* Modal de Confirmação para Apagar Item */}
      <ModalConfirmacao
        aberto={confirmandoApagar}
        titulo={`Apagar "${abaAtiva?.titulo || "este item"}"?`}
        descricao="Tem certeza de que deseja apagar? Ele será excluído do repositório no GitHub — mas continua recuperável pelo histórico do Git."
        textoConfirmar="Sim, apagar"
        textoCancelar="Cancelar"
        varianteConfirmar="perigo"
        aoConfirmar={lidarApagarAbaAtiva}
        aoCancelar={() => setConfirmandoApagar(false)}
      />

      {/* Modal de Histórico de Versões do Git */}
      {vendoHistorico && abaAtiva?.caminho && (
        <Suspense fallback={null}>
          <HistoricoDiffModal
            aberto
            aoFechar={() => setVendoHistorico(false)}
            caminho={abaAtiva.caminho}
            conteudoAtual={escreverMarkdown({
              dados: abaAtiva.dadosProps || {},
              corpo: abaAtiva.corpo || "",
            })}
            aoRestaurar={(textoHistorico) => {
              const { dados, corpo: corpoTexto } = lerMarkdown(textoHistorico);
              atualizarAbaAtiva({
                titulo: typeof dados.titulo === "string" ? dados.titulo : abaAtiva.titulo,
                corpo: corpoTexto,
                dadosProps: dados,
              });
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
