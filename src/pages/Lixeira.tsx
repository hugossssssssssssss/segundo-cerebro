import { useState } from "react";
import {
  Trash2,
  RotateCcw,
  FileText,
  AlertCircle,
  ListTodo,
  Users,
  Image as ImageIcon,
  Target,
  Calendar,
  Tag,
  Eye,
  Folder,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { useAcervoRepo } from "@/lib/useItemRepo";
import { listarItensLixeira, restaurarDaLixeira, type ItemLixeira } from "@/lib/lixeira";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Botao, Cartao, Vazio, Carregando, Aviso, Modal, ModalConfirmacao, Selo } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/lib/toast";
import { apagar } from "@/lib/github";
import { invalidarCache } from "@/lib/repo";
import { dispararAtualizacaoAcervo } from "@/lib/eventos";
import { formatarDataPtBR } from "@/lib/utils";

function obterIconeLixeira(tipo: string, caminhoOrigem: string) {
  const p = (tipo || caminhoOrigem).toLowerCase();
  if (p.includes("tarefa") || caminhoOrigem.startsWith("tarefas/")) return <ListTodo size={16} />;
  if (p.includes("contato") || caminhoOrigem.startsWith("contatos/")) return <Users size={16} />;
  if (p.includes("referencia") || caminhoOrigem.startsWith("referencias/")) return <ImageIcon size={16} />;
  if (p.includes("meta") || p.includes("entrega") || caminhoOrigem.startsWith("pdi/")) return <Target size={16} />;
  return <FileText size={16} />;
}

export default function Lixeira() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const { acervo, carregando, erro, recarregar } = useAcervoRepo(cfg);

  const [processandoCaminho, setProcessandoCaminho] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState("");
  const [itemParaExcluirPermanente, setItemParaExcluirPermanente] = useState<ItemLixeira | null>(null);
  const [itemVisualizando, setItemVisualizando] = useState<ItemLixeira | null>(null);

  const itensLixeira = listarItensLixeira(acervo);

  async function restaurar(item: ItemLixeira) {
    setProcessandoCaminho(item.caminho);
    setErroAcao("");
    try {
      await restaurarDaLixeira(cfg, item.caminho, item.sha);
      toast(`"${item.titulo}" restaurado com sucesso para ${item.caminhoOrigem}!`);
      if (itemVisualizando?.caminho === item.caminho) {
        setItemVisualizando(null);
      }
      recarregar();
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessandoCaminho(null);
    }
  }

  async function confirmarExcluirPermanente() {
    if (!itemParaExcluirPermanente) return;
    const item = itemParaExcluirPermanente;
    setItemParaExcluirPermanente(null);

    setProcessandoCaminho(item.caminho);
    setErroAcao("");
    try {
      await apagar(cfg, item.caminho, item.sha);
      invalidarCache();
      dispararAtualizacaoAcervo();
      toast(`"${item.titulo}" excluído definitivamente.`);
      if (itemVisualizando?.caminho === item.caminho) {
        setItemVisualizando(null);
      }
      recarregar();
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessandoCaminho(null);
    }
  }

  if (!pronto) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Vazio
          icone={<AlertCircle size={32} className="text-muted-foreground" />}
          titulo="Configuração necessária"
          descricao="Configure seu token do GitHub nos Ajustes para acessar a lixeira."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <CabecalhoPagina
        titulo="Lixeira Soberana"
        descricao="Itens excluídos recentemente ficam salvos aqui em segurança na pasta .lixeira/ antes de serem descartados definitivamente."
        icone={<Trash2 size={20} />}
        corIcone="bg-rose-500/10 text-rose-600 dark:text-rose-400"
      />

      {erroAcao && <Aviso tom="erro">{erroAcao}</Aviso>}
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando && itensLixeira.length === 0 ? (
        <Carregando texto="Verificando itens da lixeira..." />
      ) : itensLixeira.length === 0 ? (
        <Vazio
          icone={<Trash2 size={36} className="text-muted-foreground/60" />}
          titulo="A lixeira está vazia"
          descricao="Nenhum arquivo foi descartado recentemente. Suas notas e tarefas estão todas ativas."
        />
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground font-medium px-1 flex items-center justify-between">
            <span>{itensLixeira.length} item(ns) na lixeira</span>
            <span>Clique no item para visualizar antes de decidir</span>
          </div>

          <div className="grid gap-3">
            {itensLixeira.map((item) => (
              <Cartao
                key={item.caminho}
                onClick={() => setItemVisualizando(item)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/80 border-border/80 hover:bg-accent/40 hover:border-border transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Tooltip conteudo="Clique para visualizar este documento">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                      {obterIconeLixeira(item.tipo, item.caminhoOrigem)}
                    </div>
                  </Tooltip>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-base text-foreground leading-snug truncate group-hover:text-primary transition-colors">
                      {item.titulo}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="truncate flex items-center gap-1">
                        <Folder size={11} className="opacity-70" /> {item.caminhoOrigem}
                      </span>
                      {item.apagadoEm && (
                        <span>• Apagado em {formatarDataPtBR(item.apagadoEm)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center gap-1.5 self-end sm:self-center shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tooltip conteudo="Visualizar conteúdo" posicao="top">
                    <Botao
                      variante="fantasma"
                      tamanho="icone"
                      onClick={() => setItemVisualizando(item)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label="Visualizar conteúdo"
                    >
                      <Eye size={14} />
                    </Botao>
                  </Tooltip>

                  <Tooltip conteudo="Restaurar para o local original" posicao="top">
                    <Botao
                      variante="neutro"
                      tamanho="icone"
                      onClick={() => restaurar(item)}
                      disabled={processandoCaminho === item.caminho}
                      className="h-8 w-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                      aria-label="Restaurar arquivo"
                    >
                      <RotateCcw size={14} />
                    </Botao>
                  </Tooltip>

                  <Tooltip conteudo="Excluir permanentemente do repositório" posicao="top">
                    <Botao
                      variante="fantasma"
                      tamanho="icone"
                      onClick={() => setItemParaExcluirPermanente(item)}
                      disabled={processandoCaminho === item.caminho}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      aria-label="Excluir permanentemente"
                    >
                      <Trash2 size={14} />
                    </Botao>
                  </Tooltip>
                </div>
              </Cartao>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Visualização Prévia do Item da Lixeira */}
      {itemVisualizando && (
        <Modal
          aberto={true}
          aoFechar={() => setItemVisualizando(null)}
          titulo={itemVisualizando.titulo || "Item da Lixeira"}
          tamanho="largo"
          rodape={
            <div className="flex items-center justify-between gap-2 w-full">
              <Botao
                variante="perigo"
                tamanho="pequeno"
                onClick={() => {
                  const alvo = itemVisualizando;
                  setItemParaExcluirPermanente(alvo);
                }}
              >
                <Trash2 size={14} /> Excluir permanentemente
              </Botao>

              <div className="flex items-center gap-2">
                <Botao
                  variante="neutro"
                  tamanho="pequeno"
                  onClick={() => setItemVisualizando(null)}
                >
                  Fechar
                </Botao>
                <Botao
                  variante="primario"
                  tamanho="pequeno"
                  onClick={() => restaurar(itemVisualizando)}
                  disabled={processandoCaminho === itemVisualizando.caminho}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <RotateCcw size={14} /> Restaurar item
                </Botao>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Metadados e Localização */}
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Folder size={13} className="text-primary" /> Origem:{" "}
                  <strong className="text-foreground">{itemVisualizando.caminhoOrigem}</strong>
                </span>
                {itemVisualizando.apagadoEm && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} /> Apagado em:{" "}
                    <strong className="text-foreground">{formatarDataPtBR(itemVisualizando.apagadoEm)}</strong>
                  </span>
                )}
              </div>

              {/* Badges de dados do Frontmatter se houver */}
              {itemVisualizando.dados && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/40">
                  {Boolean(itemVisualizando.dados.status) && (
                    <Selo tom="primario">Status: {String(itemVisualizando.dados.status)}</Selo>
                  )}
                  {Boolean(itemVisualizando.dados.prioridade) && (
                    <Selo tom="aviso">Prioridade: {String(itemVisualizando.dados.prioridade)}</Selo>
                  )}
                  {Boolean(itemVisualizando.dados.prazo) && (
                    <Selo>Prazo: {formatarDataPtBR(String(itemVisualizando.dados.prazo))}</Selo>
                  )}
                  {Array.isArray(itemVisualizando.dados.tags) && itemVisualizando.dados.tags.map((t: string) => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <Tag size={10} /> {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Conteúdo / Corpo do Documento */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Conteúdo do Documento
              </span>
              <div className="p-4 rounded-xl bg-background border border-border/70 max-h-80 overflow-y-auto font-mono text-xs whitespace-pre-wrap leading-relaxed text-foreground/90 select-text">
                {itemVisualizando.corpo?.trim() ? (
                  itemVisualizando.corpo
                ) : (
                  <span className="italic text-muted-foreground">Documento sem corpo de texto adicional.</span>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Nativo de Confirmação para Exclusão Definitiva */}
      {itemParaExcluirPermanente && (
        <ModalConfirmacao
          aberto={true}
          titulo="Excluir permanentemente"
          descricao={`Excluir permanentemente "${itemParaExcluirPermanente.titulo}"? Esta ação removerá o arquivo em definitivo do GitHub e não pode ser desfeita.`}
          textoConfirmar="Sim, excluir permanentemente"
          varianteConfirmar="perigo"
          aoConfirmar={confirmarExcluirPermanente}
          aoCancelar={() => setItemParaExcluirPermanente(null)}
        />
      )}
    </div>
  );
}
