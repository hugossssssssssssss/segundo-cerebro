import { useState, useMemo } from "react";
import { Target, Calendar } from "lucide-react";
import { Modal, Botao, Campo, AreaTexto } from "@/components/ui";
import { cache, invalidarCache } from "@/lib/repo";
import { comoMeta, entregaParaArquivo } from "@/lib/entidades";
import { escreverMarkdown, nomeLivre, tituloProvavel } from "@/lib/markdown";
import { lerConfig } from "@/lib/settings";
import { useSalvar } from "@/lib/useSalvar";
import { PASTA_METAS, PASTA_ENTREGAS, type Meta, type Entrega } from "@/lib/pdi";
import { hojeISO } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { Tarefa } from "@/lib/tarefas";

interface ModalVincularPDIProps {
  tarefa: Tarefa | null;
  aberto: boolean;
  aoFechar: () => void;
  aoSucesso?: () => void;
}

export function ModalVincularPDI({
  tarefa,
  aberto,
  aoFechar,
  aoSucesso,
}: ModalVincularPDIProps) {
  const cfg = useMemo(() => lerConfig(), []);
  const { salvarTexto, salvando } = useSalvar(cfg);

  // Buscar metas existentes no acervo/cache
  const metas = useMemo<Meta[]>(() => {
    if (!cache) return [];
    return cache.itens
      .filter((i) => i.caminho.startsWith(PASTA_METAS) && i.caminho.endsWith(".md"))
      .map((i) => comoMeta(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome)))
      .filter((m) => m.status !== "concluida");
  }, []);

  const [metaSelecionadaId, setMetaSelecionadaId] = useState<string>(() => {
    return metas[0]?.id || "";
  });

  const [tituloEntrega, setTituloEntrega] = useState<string>(() => {
    return tarefa?.titulo || "";
  });

  const [dataEntrega, setDataEntrega] = useState<string>(() => {
    return hojeISO();
  });

  const [corpoEntrega, setCorpoEntrega] = useState<string>(() => {
    if (!tarefa) return "";
    let texto = `Entrega originada da tarefa: @${tarefa.titulo}\n\n`;
    if (tarefa.corpo) {
      texto += `### Detalhes da Tarefa\n${tarefa.corpo}\n`;
    }
    return texto;
  });

  async function lidarSalvar() {
    if (!tarefa || !tituloEntrega.trim() || !metaSelecionadaId) {
      toast("Selecione uma meta e preencha o título da entrega.", { tipo: "erro" });
      return;
    }

    const caminhosExistentes = cache?.itens.map((i) => i.caminho) || [];
    const novoCaminho = nomeLivre(PASTA_ENTREGAS, tituloEntrega.trim(), caminhosExistentes);
    const idNovo = novoCaminho.split("/").pop()?.replace(/\.md$/, "") || "";

    const novaEntrega: Entrega = {
      bruto: {
        metas: [metaSelecionadaId],
        data: dataEntrega,
        tipo: "entrega",
      },
      caminho: novoCaminho,
      sha: "",
      id: idNovo,
      titulo: tituloEntrega.trim(),
      data: dataEntrega,
      metas: [metaSelecionadaId],
      iaSugeriu: false,
      corpo: corpoEntrega,
    };

    const doc = entregaParaArquivo(novaEntrega);
    const texto = escreverMarkdown(doc);

    try {
      await salvarTexto(novoCaminho, texto, undefined, `registrar entrega: ${tituloEntrega.trim()}`);
      invalidarCache();
      toast(`Entrega "${tituloEntrega.trim()}" vinculada com sucesso à sua meta!`);
      aoSucesso?.();
      aoFechar();
    } catch (e: any) {
      toast(`Erro ao vincular entrega: ${e?.message || e}`, { tipo: "erro" });
    }
  }

  if (!aberto || !tarefa) return null;

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Registrar como Entrega de Meta (PDI)"
    >
      <div className="space-y-4 pt-1">
        <p className="text-xs text-muted-foreground -mt-2">
          Conecte esta tarefa ao seu desenvolvimento de carreira. Isso registrará uma entrega oficial associada à sua meta.
        </p>
        {metas.length === 0 ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
            Você ainda não possui metas ativas no PDI. Crie uma meta na tela de PDI antes de vincular entregas.
          </div>
        ) : (
          <>
            {/* Escolha da Meta */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Target size={13} className="text-purple-500" />
                Vincular à Meta do PDI:
              </label>
              <select
                value={metaSelecionadaId}
                onChange={(e) => setMetaSelecionadaId(e.target.value)}
                className="w-full text-xs rounded-lg border border-border bg-background p-2 focus:ring-1 focus:ring-primary focus:outline-hidden"
              >
                {metas.map((m) => {
                  const idMeta = m.id || m.caminho.split("/").pop()?.replace(/\.md$/, "");
                  return (
                    <option key={m.caminho} value={idMeta}>
                      {m.titulo} {m.indicador ? `(${m.indicador})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Título da Entrega */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Título da Entrega:
              </label>
              <Campo
                value={tituloEntrega}
                onChange={(e) => setTituloEntrega(e.target.value)}
                placeholder="Ex: Conclusão da identidade visual da Marca X"
                className="text-xs"
              />
            </div>

            {/* Data */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar size={13} className="text-rose-500" />
                Data da Entrega:
              </label>
              <Campo
                type="date"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Descrição / O que foi feito */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Resumo do que foi entregue / aprendizado:
              </label>
              <AreaTexto
                rows={3}
                value={corpoEntrega}
                onChange={(e) => setCorpoEntrega(e.target.value)}
                placeholder="Detalhes sobre o resultado, impacto ou aprendizados..."
                className="text-xs resize-none"
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Botao
            variante="fantasma"
            onClick={aoFechar}
            disabled={salvando}
            className="text-xs"
          >
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            onClick={lidarSalvar}
            disabled={salvando || metas.length === 0 || !tituloEntrega.trim()}
            className="text-xs"
          >
            {salvando ? "Registrando..." : "Registrar Entrega"}
          </Botao>
        </div>
      </div>
    </Modal>
  );
}
