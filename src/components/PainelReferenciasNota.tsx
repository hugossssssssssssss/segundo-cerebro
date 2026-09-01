import { useState, useMemo, useRef } from "react";
import {
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  UploadCloud,
} from "lucide-react";
import { cache, invalidarCache } from "@/lib/repo";
import { comoReferencia, referenciaParaArquivo } from "@/lib/entidades";
import { escreverMarkdown, nomeLivre, tituloProvavel } from "@/lib/markdown";
import { lerConfig } from "@/lib/settings";
import { useSalvar } from "@/lib/useSalvar";
import { gravarBinario } from "@/lib/github";
import { prepararImagem, erroDeTamanho } from "@/lib/imagem";
import { nomeDeImagem, arquivoParaBase64, PASTA_IMAGENS, PASTA_REFS, type Referencia } from "@/lib/referencias";
import { dispararAtualizacaoAcervo } from "@/lib/eventos";
import { abrirItemSpa } from "@/components/PropriedadesNotion";
import { ImagemPrivada } from "@/components/ImagemPrivada";
import { toast } from "@/lib/toast";

interface PainelReferenciasNotaProps {
  tituloNota: string;
  caminhoNota?: string;
  relacionamentos?: string[];
  aoAtualizar?: () => void;
}

export function PainelReferenciasNota({
  tituloNota,
  caminhoNota,
  relacionamentos = [],
  aoAtualizar,
}: PainelReferenciasNotaProps) {
  const [expandido, setExpandido] = useState(true);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  const cfg = useMemo(() => lerConfig(), []);
  const { salvarTexto } = useSalvar(cfg);

  // Busca no cache todas as referências visuais ligadas a esta nota
  const referenciasVinculadas = useMemo<Referencia[]>(() => {
    if (!tituloNota && !caminhoNota) return [];
    if (!cache?.itens) return [];

    const normTitulo = tituloNota.toLowerCase().trim();
    const normCaminho = caminhoNota?.toLowerCase().trim() || "";
    const baseCaminho = caminhoNota
      ? caminhoNota.split("/").pop()?.replace(/\.md$/, "").toLowerCase().trim() || ""
      : "";

    const resultados: Referencia[] = [];

    for (const item of cache.itens) {
      if (!item.caminho.startsWith("referencias/")) continue;
      if (!item.caminho.endsWith(".md")) continue;

      const r = comoReferencia(
        item.doc,
        item.caminho,
        item.sha,
        tituloProvavel(item.doc, item.nome)
      );

      const relsRef = (r.relacionamentos || []).map((rel) =>
        rel.replace(/^[@[]+/, "").replace(/\]\]$/, "").toLowerCase().trim()
      );

      const relacionadoPeloCampo = relsRef.some(
        (rel) =>
          (normTitulo && (rel === normTitulo || rel.includes(normTitulo) || normTitulo.includes(rel))) ||
          (normCaminho && rel === normCaminho) ||
          (baseCaminho && rel === baseCaminho)
      );

      const normTituloRef = r.titulo.toLowerCase().trim();
      const normCaminhoRef = r.caminho.toLowerCase().trim();
      const baseCaminhoRef = r.caminho.split("/").pop()?.replace(/\.md$/, "").toLowerCase().trim() || "";

      const relacionadoPelaNota = relacionamentos.some((rel) => {
        const limpo = rel.replace(/^[@[]+/, "").replace(/\]\]$/, "").toLowerCase().trim();
        return (
          limpo === normTituloRef ||
          limpo === normCaminhoRef ||
          limpo === baseCaminhoRef
        );
      });

      const corpoNorm = (r.corpo || "").toLowerCase();
      const citadoNoCorpo =
        normTitulo &&
        (corpoNorm.includes(`@${normTitulo}`) || corpoNorm.includes(`[[${normTitulo}]]`));

      if (relacionadoPeloCampo || relacionadoPelaNota || citadoNoCorpo) {
        resultados.push(r);
      }
    }

    return resultados;
  }, [tituloNota, caminhoNota, relacionamentos]);

  // Upload rápido de imagem anexada à nota
  const processarEnvioImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setEnviandoImagem(true);
    try {
      const preparada = await prepararImagem(arquivo);
      const excedeu = erroDeTamanho(preparada);
      if (excedeu) {
        toast(excedeu, { tipo: "erro" });
        return;
      }

      const nomeImg = nomeDeImagem(arquivo.name);
      const caminhoImg = `${PASTA_IMAGENS}/${nomeImg}`;
      const base64 = await arquivoParaBase64(preparada.arquivo);

      // Grava imagem binária no git
      await gravarBinario(cfg, caminhoImg, base64, `imagem de ref para: ${tituloNota || "nota"}`);

      // Cria a referência em markdown vinculada à nota
      const todosItens = cache?.itens || [];
      const caminhosExistentes = todosItens.map((i) => i.caminho);
      const tituloRef = `Ref visual: ${arquivo.name.replace(/\.[^/.]+$/, "")}`;
      const caminhoRef = nomeLivre(PASTA_REFS, tituloRef, caminhosExistentes);

      const novaRef: Referencia = {
        id: caminhoRef,
        caminho: caminhoRef,
        sha: "",
        bruto: {},
        titulo: tituloRef,
        imagem: caminhoImg,
        tags: ["referencia", "moodboard"],
        porque: `Referência visual anexada à nota ${tituloNota || "Nota"}`,
        corpo: `![${tituloRef}](/${caminhoImg})\n\nReferência visual anexada ao projeto @${tituloNota || "Nota"}.`,
        relacionamentos: tituloNota ? [`@${tituloNota}`] : [],
      };

      const { dados, corpo } = referenciaParaArquivo(novaRef);
      const markdown = escreverMarkdown({ dados, corpo });

      await salvarTexto(caminhoRef, markdown, undefined, `criar ref para: ${tituloNota || "nota"}`);
      invalidarCache();
      dispararAtualizacaoAcervo();
      toast(`Referência visual anexada a "${tituloNota || "esta nota"}"!`);
      if (aoAtualizar) aoAtualizar();
    } catch (err: any) {
      toast(`Erro ao anexar imagem: ${err?.message || err}`, { tipo: "erro" });
    } finally {
      setEnviandoImagem(false);
      if (inputArquivoRef.current) inputArquivoRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 overflow-hidden transition-all shadow-xs">
      {/* Cabeçalho da Seção */}
      <div
        onClick={() => setExpandido(!expandido)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-muted/30 hover:bg-muted/50 cursor-pointer select-none transition-colors border-b border-border/40"
      >
        <div className="flex items-center gap-2">
          {expandido ? (
            <ChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={14} className="text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <ImageIcon size={14} className="text-rose-500" />
            Mural de Referências Visuais
          </span>
          {referenciasVinculadas.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">
              {referenciasVinculadas.length}
            </span>
          )}
        </div>

        <span className="text-[11px] text-muted-foreground">
          {expandido ? "Ocultar" : "Expandir"}
        </span>
      </div>

      {/* Conteúdo Expansível */}
      {expandido && (
        <div className="p-3 space-y-3">
          {referenciasVinculadas.length === 0 ? (
            <div className="text-center py-3 px-2 border border-dashed border-border/60 rounded-lg bg-muted/10">
              <p className="text-xs text-muted-foreground italic">
                Nenhuma imagem ou moodboard vinculado a esta nota.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {referenciasVinculadas.map((r) => (
                <div
                  key={r.caminho}
                  onClick={() => abrirItemSpa(r.caminho)}
                  className="group relative rounded-lg border border-border/60 overflow-hidden bg-muted/20 hover:border-primary/50 cursor-pointer transition-all aspect-video flex flex-col justify-end p-1.5"
                >
                  {r.imagem ? (
                    <ImagemPrivada
                      caminho={r.imagem}
                      alt={r.titulo}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                      <ImageIcon size={24} />
                    </div>
                  )}

                  <div className="relative z-10 bg-black/60 backdrop-blur-xs rounded px-1.5 py-0.5 truncate text-[11px] text-white font-medium flex items-center justify-between gap-1">
                    <span className="truncate">{r.titulo}</span>
                    <ExternalLink size={10} className="shrink-0 opacity-70" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botão de Upload Rápido de Imagem */}
          <div className="flex items-center justify-between pt-1 border-t border-border/30">
            <input
              type="file"
              ref={inputArquivoRef}
              onChange={processarEnvioImagem}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              disabled={enviandoImagem}
              onClick={() => inputArquivoRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent px-2.5 py-1.5 rounded-lg border border-border/60 transition-colors cursor-pointer disabled:opacity-50 font-medium"
            >
              <UploadCloud size={14} className="text-primary" />
              <span>{enviandoImagem ? "Enviando imagem…" : "+ Anexar referência visual"}</span>
            </button>
            <span className="text-[11px] text-muted-foreground/60">
              Formatos: PNG, JPG, WebP
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
