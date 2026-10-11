import { useState, useEffect } from "react";
import ReactDiffViewer from "@alexbruf/react-diff-viewer";
import { AlertTriangle, Check, GitMerge, Trash2 } from "lucide-react";
import { Modal, Botao, Carregando, Aviso } from "@/components/ui";
import { lerConfig } from "@/lib/settings";
import { ler, gravar } from "@/lib/github";
import { autoMergeDocumentoMarkdown } from "@/lib/autoMergeMarkdown";
import { removerRascunhoLocal, type RascunhoOffline } from "@/lib/offlineQueue";
import { invalidarCache } from "@/lib/repo";
import { toast } from "@/lib/toast";

interface ModalResolverConflitoProps {
  aberto: boolean;
  aoFechar: () => void;
  rascunho: RascunhoOffline | null;
  aoResolvido: () => void;
}

export function ModalResolverConflito({
  aberto,
  aoFechar,
  rascunho,
  aoResolvido,
}: ModalResolverConflitoProps) {
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [textoRemoto, setTextoRemoto] = useState("");
  const [shaRemoto, setShaRemoto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const cfg = lerConfig();
  const ehModoEscuro = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  useEffect(() => {
    if (!aberto || !rascunho) return;

    setCarregando(true);
    setErro(null);

    ler(cfg, rascunho.caminho)
      .then((res) => {
        setTextoRemoto(res.texto);
        setShaRemoto(res.sha);
      })
      .catch((err) => {
        setErro(`Não foi possível carregar a versão remota do GitHub: ${err?.message || err}`);
      })
      .finally(() => {
        setCarregando(false);
      });
  }, [aberto, rascunho?.id]);

  if (!rascunho) return null;

  const textoLocal = rascunho.texto || "";

  // 1. Manter Versão Local (sobrescrever remoto)
  const lidarManterLocal = async () => {
    if (!shaRemoto) return;
    setSalvando(true);
    setErro(null);
    try {
      await gravar(
        cfg,
        rascunho.caminho,
        textoLocal,
        shaRemoto,
        `resolve conflito: mantém versão local de ${rascunho.caminho}`
      );
      removerRascunhoLocal(rascunho.id);
      invalidarCache();
      toast("Conflito resolvido com sucesso! Sua versão foi gravada no GitHub.", { tipo: "sucesso" });
      aoResolvido();
      aoFechar();
    } catch (err: any) {
      setErro(`Erro ao gravar versão local: ${err?.message || err}`);
    } finally {
      setSalvando(false);
    }
  };

  // 2. Descartar Versão Local (manter versão do GitHub)
  const lidarDescartarLocal = () => {
    removerRascunhoLocal(rascunho.id);
    invalidarCache();
    toast("Rascunho local descartado. A versão do GitHub foi preservada.", { tipo: "sucesso" });
    aoResolvido();
    aoFechar();
  };

  // 3. Mesclar Automaticamente Ambos (Auto-Merge)
  const lidarMesclarAmbos = async () => {
    if (!shaRemoto) return;
    setSalvando(true);
    setErro(null);
    try {
      const merge = autoMergeDocumentoMarkdown(textoRemoto, textoLocal, textoRemoto);
      await gravar(
        cfg,
        rascunho.caminho,
        merge.textoMesclado,
        shaRemoto,
        `resolve conflito: mescla automática 3-way de ${rascunho.caminho}`
      );
      removerRascunhoLocal(rascunho.id);
      invalidarCache();
      toast("Mesclagem realizada e gravada no GitHub com sucesso!", { tipo: "sucesso" });
      aoResolvido();
      aoFechar();
    } catch (err: any) {
      setErro(`Erro na mesclagem automática: ${err?.message || err}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Resolver Conflito de Edição: ${rascunho.caminho}`}
    >
      <div className="space-y-4 max-h-[75vh] flex flex-col">
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 leading-relaxed">
          <AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold">O arquivo foi modificado no GitHub enquanto você editava localmente.</p>
            <p className="opacity-90 mt-0.5">
              Compare as alterações abaixo. Você pode optar por manter sua versão, manter a versão atual do GitHub ou mesclar as duas versões automaticamente.
            </p>
          </div>
        </div>

        {erro && <Aviso tom="erro">{erro}</Aviso>}

        {carregando ? (
          <div className="py-12 flex justify-center">
            <Carregando texto="Comparando versões local e remota..." />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto border border-border/80 rounded-xl bg-card">
            <div className="text-[11px] font-mono p-2 bg-muted/60 border-b border-border/60 flex items-center justify-between">
              <span className="text-muted-foreground">Versão no GitHub (Remota)</span>
              <span className="font-semibold text-primary">Sua Versão (Local)</span>
            </div>

            <div className="text-xs overflow-x-auto p-1 font-mono">
              <ReactDiffViewer
                oldValue={textoRemoto}
                newValue={textoLocal}
                splitView={true}
                useDarkTheme={ehModoEscuro}
                leftTitle="Versão do GitHub"
                rightTitle="Sua Versão Local"
              />
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/60">
          <Botao
            type="button"
            variante="perigo"
            data-testid="btn-descartar-conflito"
            disabled={salvando || carregando}
            onClick={lidarDescartarLocal}
            className="w-full sm:w-auto text-xs h-9 px-3 gap-1.5 cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Descartar Local (Manter GitHub)</span>
          </Botao>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Botao
              type="button"
              variante="neutro"
              data-testid="btn-mesclar-conflito"
              disabled={salvando || carregando}
              onClick={lidarMesclarAmbos}
              className="w-full sm:w-auto text-xs h-9 px-3 gap-1.5 cursor-pointer"
            >
              <GitMerge size={13} />
              <span>Mesclar Ambos</span>
            </Botao>

            <Botao
              type="button"
              variante="primario"
              data-testid="btn-manter-conflito"
              disabled={salvando || carregando}
              onClick={lidarManterLocal}
              className="w-full sm:w-auto text-xs h-9 px-3 gap-1.5 cursor-pointer font-semibold"
            >
              <Check size={13} />
              <span>{salvando ? "Salvando..." : "Manter Minha Versão"}</span>
            </Botao>
          </div>
        </div>
      </div>
    </Modal>
  );
}
