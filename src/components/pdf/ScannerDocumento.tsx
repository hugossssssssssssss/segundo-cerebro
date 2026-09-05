import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  Plus,
  Trash2,
  Crop,
  Check,
  RotateCcw,
  FileDown,
  Sparkles,
  Loader2,
  FileText,
  SlidersHorizontal,
  Move,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import {
  type CantosDocumento,
  type TipoFiltroScanner,
  type Ponto,
  cantosPadrao,
  desentortarPerspectiva,
  aplicarFiltroDocumento,
  canvasParaJpegBytes,
} from "../../lib/scannerUtils";

export interface PaginaDigitalizada {
  id: string;
  imagemOriginalUrl: string;
  imagemOriginalEl: HTMLImageElement;
  cantos: CantosDocumento;
  filtro: TipoFiltroScanner;
  dataUrlProcessada: string;
}

interface ScannerDocumentoProps {
  onGerarPdf?: (pdfBytes: Uint8Array, nomeArquivo: string) => void;
}

export default function ScannerDocumento({ onGerarPdf }: ScannerDocumentoProps) {
  const [paginas, setPaginas] = useState<PaginaDigitalizada[]>([]);
  const [paginaEditando, setPaginaEditando] = useState<PaginaDigitalizada | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erro, setErro] = useState("");

  const inputCameraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);

  // Estados do Editor de 4 Cantos
  const [cantosAtuais, setCantosAtuais] = useState<CantosDocumento | null>(null);
  const [pontoArrastando, setPontoArrastando] = useState<keyof CantosDocumento | null>(null);
  const [filtroTemp, setFiltroTemp] = useState<TipoFiltroScanner>("realce");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerCanvasRef = useRef<HTMLDivElement>(null);

  // Carrega nova imagem e inicializa página
  const processarArquivoImagem = useCallback(async (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const cantosIniciais = cantosPadrao(img.width, img.height);
      const canvasRetificado = desentortarPerspectiva(img, cantosIniciais);
      const canvasFiltrado = aplicarFiltroDocumento(canvasRetificado, "realce");
      const dataUrl = canvasFiltrado.toDataURL("image/jpeg", 0.9);

      const novaPagina: PaginaDigitalizada = {
        id: Math.random().toString(36).substring(2, 9),
        imagemOriginalUrl: url,
        imagemOriginalEl: img,
        cantos: cantosIniciais,
        filtro: "realce",
        dataUrlProcessada: dataUrl,
      };

      setPaginas((prev) => [...prev, novaPagina]);
      setMensagemSucesso(`Página ${paginas.length + 1} adicionada!`);
      setTimeout(() => setMensagemSucesso(""), 3000);
    } catch {
      setErro("Falha ao carregar a imagem para digitalização.");
    }
  }, [paginas.length]);

  const handleInputFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErro("");
    Array.from(files).forEach((f) => processarArquivoImagem(f));
    e.target.value = "";
  };

  // Abrir Modal de Edição de Cantos e Filtro
  const iniciarEdicao = (pag: PaginaDigitalizada) => {
    setPaginaEditando(pag);
    setCantosAtuais({ ...pag.cantos });
    setFiltroTemp(pag.filtro);
  };

  // Renderizar o Canvas de Ajuste de Cantos
  const renderizarCanvasEdicao = useCallback(() => {
    if (!paginaEditando || !cantosAtuais || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = paginaEditando.imagemOriginalEl;
    canvas.width = img.width;
    canvas.height = img.height;

    // 1. Desenha a foto original
    ctx.drawImage(img, 0, 0);

    // 2. Máscara escurecida externa ao polígono
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Recorta a área do documento selecionada
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cantosAtuais.tl.x, cantosAtuais.tl.y);
    ctx.lineTo(cantosAtuais.tr.x, cantosAtuais.tr.y);
    ctx.lineTo(cantosAtuais.br.x, cantosAtuais.br.y);
    ctx.lineTo(cantosAtuais.bl.x, cantosAtuais.bl.y);
    ctx.closePath();
    ctx.clip();

    // Redesenha a imagem nítida dentro da seleção
    ctx.drawImage(img, 0, 0);

    // Linha de grade e contorno
    ctx.strokeStyle = "#3b82f6"; // Azul Tailwind
    ctx.lineWidth = Math.max(2, Math.round(canvas.width / 350));
    ctx.stroke();
    ctx.restore();

    // 4. Desenha as 4 alças nos cantos
    const raio = Math.max(14, Math.round(canvas.width / 45));
    const pontos: Array<{ p: Ponto; chave: keyof CantosDocumento }> = [
      { p: cantosAtuais.tl, chave: "tl" },
      { p: cantosAtuais.tr, chave: "tr" },
      { p: cantosAtuais.br, chave: "br" },
      { p: cantosAtuais.bl, chave: "bl" },
    ];

    pontos.forEach(({ p, chave }) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, raio, 0, 2 * Math.PI);
      ctx.fillStyle = pontoArrastando === chave ? "#2563eb" : "#ffffff";
      ctx.fill();
      ctx.lineWidth = Math.max(2, Math.round(raio / 4));
      ctx.strokeStyle = "#3b82f6";
      ctx.stroke();

      // Ponto central
      ctx.beginPath();
      ctx.arc(p.x, p.y, raio / 3, 0, 2 * Math.PI);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
    });
  }, [paginaEditando, cantosAtuais, pontoArrastando]);

  useEffect(() => {
    if (paginaEditando && cantosAtuais) {
      renderizarCanvasEdicao();
    }
  }, [paginaEditando, cantosAtuais, renderizarCanvasEdicao]);

  // Converter coordenadas de Touch/Mouse para escala real da imagem
  const extrairCoordenadasImagem = (clientX: number, clientY: number): Ponto | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = Math.max(0, Math.min(canvasRef.current.width, (clientX - rect.left) * scaleX));
    const y = Math.max(0, Math.min(canvasRef.current.height, (clientY - rect.top) * scaleY));
    return { x, y };
  };

  // Identificar qual canto foi clicado/tocado
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cantosAtuais || !canvasRef.current) return;
    const coords = extrairCoordenadasImagem(e.clientX, e.clientY);
    if (!coords) return;

    const raioDetecao = Math.max(40, Math.round(canvasRef.current.width / 15));
    const chaves: Array<keyof CantosDocumento> = ["tl", "tr", "br", "bl"];

    let menorDist = Infinity;
    let alvo: keyof CantosDocumento | null = null;

    for (const chave of chaves) {
      const d = Math.hypot(cantosAtuais[chave].x - coords.x, cantosAtuais[chave].y - coords.y);
      if (d < raioDetecao && d < menorDist) {
        menorDist = d;
        alvo = chave;
      }
    }

    if (alvo) {
      setPontoArrastando(alvo);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pontoArrastando || !cantosAtuais) return;
    const coords = extrairCoordenadasImagem(e.clientX, e.clientY);
    if (!coords) return;

    setCantosAtuais({
      ...cantosAtuais,
      [pontoArrastando]: coords,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pontoArrastando) {
      setPontoArrastando(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignora
      }
    }
  };

  // Salvar ajustes da página atual
  const salvarEdicaoPagina = () => {
    if (!paginaEditando || !cantosAtuais) return;

    const canvasRetificado = desentortarPerspectiva(paginaEditando.imagemOriginalEl, cantosAtuais);
    const canvasFiltrado = aplicarFiltroDocumento(canvasRetificado, filtroTemp);
    const novaDataUrl = canvasFiltrado.toDataURL("image/jpeg", 0.9);

    setPaginas((prev) =>
      prev.map((p) =>
        p.id === paginaEditando.id
          ? {
              ...p,
              cantos: cantosAtuais,
              filtro: filtroTemp,
              dataUrlProcessada: novaDataUrl,
            }
          : p
      )
    );

    setPaginaEditando(null);
    setMensagemSucesso("Página ajustada com sucesso!");
    setTimeout(() => setMensagemSucesso(""), 3000);
  };

  // Trocar filtro de uma página diretamente na lista
  const alterarFiltroPagina = (pag: PaginaDigitalizada, novoFiltro: TipoFiltroScanner) => {
    const canvasRetificado = desentortarPerspectiva(pag.imagemOriginalEl, pag.cantos);
    const canvasFiltrado = aplicarFiltroDocumento(canvasRetificado, novoFiltro);
    const novaDataUrl = canvasFiltrado.toDataURL("image/jpeg", 0.9);

    setPaginas((prev) =>
      prev.map((p) =>
        p.id === pag.id
          ? {
              ...p,
              filtro: novoFiltro,
              dataUrlProcessada: novaDataUrl,
            }
          : p
      )
    );
  };

  // Excluir Página
  const removerPagina = (id: string) => {
    setPaginas((prev) => prev.filter((p) => p.id !== id));
  };

  // Gerar PDF Final
  const gerarPdfCompleto = async () => {
    if (paginas.length === 0) {
      setErro("Digitalize pelo menos uma página para gerar o PDF.");
      return;
    }

    setGerandoPdf(true);
    setErro("");
    try {
      const pdfDoc = await PDFDocument.create();

      for (const pag of paginas) {
        // Gera o canvas final na melhor qualidade
        const canvasRetificado = desentortarPerspectiva(pag.imagemOriginalEl, pag.cantos);
        const canvasFinal = aplicarFiltroDocumento(canvasRetificado, pag.filtro);
        const jpegBytes = await canvasParaJpegBytes(canvasFinal, 0.92);

        const imgEmbed = await pdfDoc.embedJpg(jpegBytes);
        const page = pdfDoc.addPage([canvasFinal.width, canvasFinal.height]);
        page.drawImage(imgEmbed, {
          x: 0,
          y: 0,
          width: canvasFinal.width,
          height: canvasFinal.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const nomeArquivo = `Documento_Digitalizado_${new Date().toISOString().slice(0, 10)}.pdf`;

      if (onGerarPdf) {
        onGerarPdf(pdfBytes, nomeArquivo);
      } else {
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setMensagemSucesso("PDF digitalizado gerado e baixado com sucesso!");
    } catch {
      setErro("Ocorreu um erro ao montar o PDF digitalizado.");
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Botões de Ação Principal (Captura / Galeria) */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Digitalizar Documento com Câmera
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tire fotos com seu celular ou envie imagens. Nós corrigimos os 4 cantos e realçamos o texto para PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Input Câmera Mobile Nativa */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={inputCameraRef}
              onChange={handleInputFiles}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputCameraRef.current?.click()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition shadow-sm text-sm"
            >
              <Camera className="w-4 h-4" />
              Tirar Foto
            </button>

            {/* Input Galeria / Upload */}
            <input
              type="file"
              accept="image/*"
              multiple
              ref={inputGaleriaRef}
              onChange={handleInputFiles}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputGaleriaRef.current?.click()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition text-sm border"
            >
              <Upload className="w-4 h-4" />
              Galeria / Arquivos
            </button>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {mensagemSucesso && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            {mensagemSucesso}
          </div>
        )}
        {erro && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs">
            {erro}
          </div>
        )}
      </div>

      {/* Lista de Páginas Digitalizadas */}
      {paginas.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Páginas Escaneadas ({paginas.length})
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => inputCameraRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Página
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginas.map((pag, idx) => (
              <div
                key={pag.id}
                className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col group relative"
              >
                <div className="relative aspect-[3/4] bg-muted/40 flex items-center justify-center overflow-hidden">
                  <img
                    src={pag.dataUrlProcessada}
                    alt={`Página ${idx + 1}`}
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm border px-2 py-0.5 rounded text-[11px] font-semibold">
                    Pág. {idx + 1}
                  </div>

                  {/* Ações Rápidas no Card */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => iniciarEdicao(pag)}
                      title="Ajustar Cantos e Enquadramento"
                      className="p-1.5 bg-background/90 text-foreground hover:text-primary rounded-lg border shadow-sm transition"
                    >
                      <Crop className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removerPagina(pag.id)}
                      title="Excluir Página"
                      className="p-1.5 bg-background/90 text-destructive hover:bg-destructive/10 rounded-lg border shadow-sm transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Filtros da Página */}
                <div className="p-3 border-t bg-muted/20 flex flex-col gap-2">
                  <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" />
                    Filtro:
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: "original", label: "Original" },
                        { id: "realce", label: "Mágico" },
                        { id: "pb", label: "P&B" },
                        { id: "cinza", label: "Cinza" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => alterarFiltroPagina(pag, f.id)}
                        className={`text-[10px] py-1 rounded font-medium border transition ${
                          pag.filtro === f.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Botão Final: Gerar PDF */}
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              disabled={gerandoPdf}
              onClick={gerarPdfCompleto}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition shadow-md disabled:opacity-50 text-sm"
            >
              {gerandoPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando PDF ({paginas.length} páginas)...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Gerar e Baixar PDF ({paginas.length} {paginas.length === 1 ? "página" : "páginas"})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal / Overlay de Ajuste de Cantos (4 Pontos) */}
      {paginaEditando && cantosAtuais && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col p-4 sm:p-6 overflow-hidden">
          {/* Topo do Modal */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Crop className="w-5 h-5 text-primary" />
                Ajustar Cantos do Documento
              </h3>
              <p className="text-xs text-muted-foreground">
                Arraste os 4 círculos nos cantos da folha para desentortar a imagem perfeitamente.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCantosAtuais(
                    cantosPadrao(paginaEditando.imagemOriginalEl.width, paginaEditando.imagemOriginalEl.height)
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-lg border hover:bg-secondary/80"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Redefinir
              </button>
              <button
                type="button"
                onClick={() => setPaginaEditando(null)}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarEdicaoPagina}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                Aplicar Ajuste
              </button>
            </div>
          </div>

          {/* Área Central Interativa do Canvas */}
          <div
            ref={containerCanvasRef}
            className="flex-1 relative flex items-center justify-center p-2 min-h-0 select-none overflow-hidden touch-none"
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg cursor-crosshair border"
            />

            {/* Dica Flutuante de Toque */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/85 backdrop-blur-md border px-3 py-1.5 rounded-full text-[11px] font-medium text-foreground flex items-center gap-1.5 shadow pointer-events-none">
              <Move className="w-3 h-3 text-primary" />
              Toque e arraste os 4 círculos azuis nos cantos
            </div>
          </div>

          {/* Rodapé com Seletor de Filtro do Editor */}
          <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Filtro de Documento:
              </span>
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "realce", label: "Realce Mágico" },
                    { id: "pb", label: "Preto & Branco (Doc)" },
                    { id: "cinza", label: "Escala de Cinza" },
                    { id: "original", label: "Original" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroTemp(f.id)}
                    className={`text-xs px-3 py-1 rounded-lg border font-medium transition ${
                      filtroTemp === f.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
