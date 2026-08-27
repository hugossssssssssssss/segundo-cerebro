/**
 * SeletorOcr — Componente de seleção de área para OCR.
 *
 * Exibe a imagem e permite ao usuário clicar e arrastar um retângulo
 * sobre ela. Ao confirmar, recorta apenas aquela área e extrai o texto
 * via Tesseract (local, sem backend).
 *
 * Usa react-image-crop para a seleção visual.
 */

import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Botao, Aviso } from "@/components/ui";
import { ScanText, X, Check } from "lucide-react";

export function SeletorOcr({
  imagemSrc,
  aoExtrairTexto,
  aoFechar,
}: {
  /** URL da imagem (blob:, data:, ou https) */
  imagemSrc: string;
  /** Chamado quando o texto é extraído com sucesso */
  aoExtrairTexto: (texto: string) => void;
  /** Fechar o seletor */
  aoFechar: () => void;
}) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [lendo, setLendo] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState("");
  const imgRef = useRef<HTMLImageElement | null>(null);

  const aoCarregarImagem = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
  }, []);

  async function extrair() {
    if (!completedCrop || !imgRef.current) return;

    setLendo(true);
    setErro("");
    setProgresso(0);

    try {
      // Calcula as coordenadas reais da imagem (o crop é relativo ao tamanho exibido)
      const img = imgRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      const cropReal = {
        x: Math.round(completedCrop.x * scaleX),
        y: Math.round(completedCrop.y * scaleY),
        width: Math.round(completedCrop.width * scaleX),
        height: Math.round(completedCrop.height * scaleY),
      };

      const { extrairTextoDaArea } = await import("@/lib/ocr");
      const texto = await extrairTextoDaArea(img, cropReal, setProgresso);

      if (!texto) {
        setErro("Não encontrei texto legível nessa área.");
        return;
      }

      aoExtrairTexto(texto);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLendo(false);
      setProgresso(0);
    }
  }

  async function extrairTudo() {
    if (!imgRef.current) return;

    setLendo(true);
    setErro("");
    setProgresso(0);

    try {
      const { extrairTexto } = await import("@/lib/ocr");
      const texto = await extrairTexto(imagemSrc, setProgresso);

      if (!texto) {
        setErro("Não encontrei texto legível nessa imagem.");
        return;
      }

      aoExtrairTexto(texto);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLendo(false);
      setProgresso(0);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <ScanText size={14} className="text-primary" />
          Selecione a área para ler o texto
        </div>
        <button
          type="button"
          onClick={aoFechar}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground/70">
        Clique e arraste sobre a imagem para selecionar a área com texto. Ou clique em "Ler tudo" para processar a imagem inteira.
      </p>

      <div className="rounded-xl overflow-hidden border border-border bg-secondary/30">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
        >
          <img
            src={imagemSrc}
            alt="Imagem para OCR"
            onLoad={aoCarregarImagem}
            className="max-h-[50vh] w-full object-contain"
            crossOrigin="anonymous"
          />
        </ReactCrop>
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {lendo && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="animate-pulse font-medium text-primary">
              {progresso > 0 ? `Lendo… ${Math.round(progresso * 100)}%` : "Preparando OCR…"}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.max(5, progresso * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Botao
          variante="neutro"
          tamanho="pequeno"
          onClick={extrairTudo}
          disabled={lendo}
          className="flex-1"
        >
          <ScanText size={14} />
          Ler tudo
        </Botao>
        <Botao
          tamanho="pequeno"
          onClick={extrair}
          disabled={lendo || !completedCrop || completedCrop.width < 5 || completedCrop.height < 5}
          className="flex-1"
        >
          <Check size={14} />
          {completedCrop && completedCrop.width >= 5
            ? "Ler área selecionada"
            : "Selecione uma área"
          }
        </Botao>
      </div>
    </div>
  );
}
