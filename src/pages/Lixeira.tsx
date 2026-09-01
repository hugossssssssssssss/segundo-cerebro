import { useState } from "react";
import { Trash2, RotateCcw, FileText, AlertCircle } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { useAcervoRepo } from "@/lib/useItemRepo";
import { listarItensLixeira, restaurarDaLixeira, type ItemLixeira } from "@/lib/lixeira";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Botao, Cartao, Vazio, Carregando, Aviso, ModalConfirmacao } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/lib/toast";
import { apagar } from "@/lib/github";
import { invalidarCache } from "@/lib/repo";
import { dispararAtualizacaoAcervo } from "@/lib/eventos";
import { formatarDataPtBR } from "@/lib/utils";

export default function Lixeira() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const { acervo, carregando, erro, recarregar } = useAcervoRepo(cfg);

  const [processandoCaminho, setProcessandoCaminho] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState("");
  const [itemParaExcluirPermanente, setItemParaExcluirPermanente] = useState<ItemLixeira | null>(null);

  const itensLixeira = listarItensLixeira(acervo);

  async function restaurar(item: ItemLixeira) {
    setProcessandoCaminho(item.caminho);
    setErroAcao("");
    try {
      await restaurarDaLixeira(cfg, item.caminho, item.sha);
      toast(`"${item.titulo}" restaurado com sucesso para ${item.caminhoOrigem}!`);
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
            <span>Restauração em 1 clique preserva texto e links</span>
          </div>

          <div className="grid gap-3">
            {itensLixeira.map((item) => (
              <Cartao
                key={item.caminho}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/80 border-border/80"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-base text-foreground leading-snug truncate">
                      {item.titulo}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="truncate">Origem: {item.caminhoOrigem}</span>
                      {item.apagadoEm && (
                        <span>• Apagado em {formatarDataPtBR(item.apagadoEm)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
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
