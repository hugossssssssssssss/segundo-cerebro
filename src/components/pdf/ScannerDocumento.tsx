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
  Wand2,
  Sun,
  Contrast,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import {
  type CantosDocumento,
  type TipoFiltroScanner,
  type Ponto,
  type AjustesTonalidade,
  AJUSTES_TONALIDADE_PADRAO,
  cantosPadrao,
  detectarCantosAutomaticos,
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
  ajustes: AjustesTonalidade;
  dataUrlProcessada: string;
}

interface ScannerDocumentoProps {
  onGerarPdf?: (pdfBytes: Uint8Array, nomeArquivo: string) => void;
}

export default function ScannerDocumento({ onGerarPdf }: ScannerDocumentoProps) {
  const [paginas, setPaginas] = useState<PaginaDigitalizada[]>([]);
  const [paginaEditando, setPaginaEditando] = useState<PaginaDigitalizada | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [processandoCaptura, setProcessandoCaptura] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erro, setErro] = useState("");

  const inputCameraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);

  // Estados do Editor de 4 Cantos e Tonalidade
  const [cantosAtuais, setCantosAtuais] = useState<CantosDocumento | null>(null);
  const [pontoArrastando, setPontoArrastando] = useState<keyof CantosDocumento | null>(null);
  const [filtroTemp, setFiltroTemp] = useState<TipoFiltroScanner>("realce");
  const [ajustesTemp, setAjustesTemp] = useState<AjustesTonalidade>({ ...AJUSTES_TONALIDADE_PADRAO });
  const [mostrarSlidersAjuste, setMostrarSlidersAjuste] = useState(false);

  // Ponto ativo sendo arrastado para a lupa de zoom
  const [posicaoPontoAtivo, setPosicaoPontoAtivo] = useState<Ponto | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasLupaRef = useRef<HTMLCanvasElement>(null);
  const containerCanvasRef = useRef<HTMLDivElement>(null);

  // Carrega nova imagem e aplica enquadramento automático inicial
  const processarArquivoImagem = useCallback(async (file: File) => {
    setProcessandoCaptura(true);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      // 1. Enquadramento AUTOMÁTICO inteligente dos 4 cantos
      const cantosAuto = detectarCantosAutomaticos(img);

      // 2. Desentorta e aplica o filtro Realce Mágico padrão
      const canvasRetificado = desentortarPerspectiva(img, cantosAuto);
      const canvasFiltrado = aplicarFiltroDocumento(canvasRetificado, "realce", AJUSTES_TONALIDADE_PADRAO);
      const dataUrl = canvasFiltrado.toDataURL("image/jpeg", 0.9);

      const novaPagina: PaginaDigitalizada = {
        id: Math.random().toString(36).substring(2, 9),
        imagemOriginalUrl: url,
        imagemOriginalEl: img,
        cantos: cantosAuto,
        filtro: "realce",
        ajustes: { ...AJUSTES_TONALIDADE_PADRAO },
        dataUrlProcessada: dataUrl,
      };

      setPaginas((prev) => [...prev, novaPagina]);
      setMensagemSucesso(`Página ${paginas.length + 1} digitalizada com auto-enquadramento!`);
      setTimeout(() => setMensagemSucesso(""), 3500);
    } catch {
      setErro("Falha ao carregar a imagem para digitalização.");
    } finally {
      setProcessandoCaptura(false);
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
    setAjustesTemp({ ...pag.ajustes });
    setMostrarSlidersAjuste(false);
  };

  // Renderizar a Lupa de Zoom Ampliada (2.5x)
  const renderizarLupa = useCallback(() => {
    if (!canvasLupaRef.current || !paginaEditando || !posicaoPontoAtivo) return;
    const canvasLupa = canvasLupaRef.current;
    const ctx = canvasLupa.getContext("2d");
    if (!ctx) return;

    const img = paginaEditando.imagemOriginalEl;
    const tamanhoLupa = 120;
    canvasLupa.width = tamanhoLupa;
    canvasLupa.height = tamanhoLupa;

    const zoom = 2.5;
    const raioCorte = tamanhoLupa / (2 * zoom);

    ctx.clearRect(0, 0, tamanhoLupa, tamanhoLupa);

    // Salva estado e recorta em círculo
    ctx.save();
    ctx.beginPath();
    ctx.arc(tamanhoLupa / 2, tamanhoLupa / 2, tamanhoLupa / 2 - 2, 0, 2 * Math.PI);
    ctx.clip();

    // Desenha área ampliada da foto
    ctx.drawImage(
      img,
      posicaoPontoAtivo.x - raioCorte,
      posicaoPontoAtivo.y - raioCorte,
      raioCorte * 2,
      raioCorte * 2,
      0,
      0,
      tamanhoLupa,
      tamanhoLupa
    );

    // Mira em Cruz (+) central
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tamanhoLupa / 2 - 14, tamanhoLupa / 2);
    ctx.lineTo(tamanhoLupa / 2 + 14, tamanhoLupa / 2);
    ctx.moveTo(tamanhoLupa / 2, tamanhoLupa / 2 - 14);
    ctx.lineTo(tamanhoLupa / 2, tamanhoLupa / 2 + 14);
    ctx.stroke();

    ctx.restore();

    // Borda da Lupa
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tamanhoLupa / 2, tamanhoLupa / 2, tamanhoLupa / 2 - 2, 0, 2 * Math.PI);
    ctx.stroke();
  }, [paginaEditando, posicaoPontoAtivo]);

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
    ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
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

    // Linha de contorno do documento
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = Math.max(3, Math.round(canvas.width / 300));
    ctx.stroke();

    // Grade interna suave de 3x3 para referência de enquadramento
    ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
    ctx.lineWidth = 1.5;
    // Diagonais / guias
    ctx.beginPath();
    ctx.moveTo(cantosAtuais.tl.x, cantosAtuais.tl.y);
    ctx.lineTo(cantosAtuais.br.x, cantosAtuais.br.y);
    ctx.moveTo(cantosAtuais.tr.x, cantosAtuais.tr.y);
    ctx.lineTo(cantosAtuais.bl.x, cantosAtuais.bl.y);
    ctx.stroke();

    ctx.restore();

    // 4. Desenha as 4 alças nos cantos com design mobile-friendly
    const raio = Math.max(16, Math.round(canvas.width / 40));
    const pontos: Array<{ p: Ponto; chave: keyof CantosDocumento; label: string }> = [
      { p: cantosAtuais.tl, chave: "tl", label: "1" },
      { p: cantosAtuais.tr, chave: "tr", label: "2" },
      { p: cantosAtuais.br, chave: "br", label: "3" },
      { p: cantosAtuais.bl, chave: "bl", label: "4" },
    ];

    pontos.forEach(({ p, chave }) => {
      const estaArrastando = pontoArrastando === chave;

      // Halo externo de destaque
      ctx.beginPath();
      ctx.arc(p.x, p.y, raio * 1.35, 0, 2 * Math.PI);
      ctx.fillStyle = estaArrastando ? "rgba(37, 99, 235, 0.45)" : "rgba(255, 255, 255, 0.35)";
      ctx.fill();

      // Círculo principal
      ctx.beginPath();
      ctx.arc(p.x, p.y, raio, 0, 2 * Math.PI);
      ctx.fillStyle = estaArrastando ? "#2563eb" : "#ffffff";
      ctx.fill();
      ctx.lineWidth = Math.max(2.5, Math.round(raio / 4.5));
      ctx.strokeStyle = "#3b82f6";
      ctx.stroke();

      // Ponto central
      ctx.beginPath();
      ctx.arc(p.x, p.y, raio / 2.8, 0, 2 * Math.PI);
      ctx.fillStyle = estaArrastando ? "#ffffff" : "#2563eb";
      ctx.fill();
    });
  }, [paginaEditando, cantosAtuais, pontoArrastando]);

  useEffect(() => {
    if (paginaEditando && cantosAtuais) {
      renderizarCanvasEdicao();
    }
  }, [paginaEditando, cantosAtuais, renderizarCanvasEdicao]);

  useEffect(() => {
    if (posicaoPontoAtivo) {
      renderizarLupa();
    }
  }, [posicaoPontoAtivo, renderizarLupa]);

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

  // Identificar qual canto foi clicado/tocado (com raio de detecção confortável para dedos no mobile)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cantosAtuais || !canvasRef.current) return;
    const coords = extrairCoordenadasImagem(e.clientX, e.clientY);
    if (!coords) return;

    const raioDetecao = Math.max(55, Math.round(canvasRef.current.width / 12));
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
      setPosicaoPontoAtivo(cantosAtuais[alvo]);
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
    setPosicaoPontoAtivo(coords);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pontoArrastando) {
      setPontoArrastando(null);
      setPosicaoPontoAtivo(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignora
      }
    }
  };

  // Auto-detectar cantos sob demanda
  const executarAutoDetecao = () => {
    if (!paginaEditando) return;
    const cantos = detectarCantosAutomaticos(paginaEditando.imagemOriginalEl);
    setCantosAtuais(cantos);
    setMensagemSucesso("Cantos detectados automaticamente!");
    setTimeout(() => setMensagemSucesso(""), 2500);
  };

  // Salvar ajustes da página atual
  const salvarEdicaoPagina = () => {
    if (!paginaEditando || !cantosAtuais) return;

    const canvasRetificado = desentortarPerspectiva(paginaEditando.imagemOriginalEl, cantosAtuais);
    const canvasFiltrado = aplicarFiltroDocumento(canvasRetificado, filtroTemp, ajustesTemp);
    const novaDataUrl = canvasFiltrado.toDataURL("image/jpeg", 0.9);

    setPaginas((prev) =>
      prev.map((p) =>
        p.id === paginaEditando.id
          ? {
              ...p,
              cantos: cantosAtuais,
              filtro: filtroTemp,
              ajustes: { ...ajustesTemp },
              dataUrlProcessada: novaDataUrl,
            }
          : p
      )
    );

    setPaginaEditando(null);
    setPosicaoPontoAtivo(null);
    setMensagemSucesso("Página e ajustes salvos com sucesso!");
    setTimeout(() => setMensagemSucesso(""), 3000);
  };

  // Trocar filtro de uma página diretamente na lista
  const alterarFiltroPagina = (pag: PaginaDigitalizada, novoFiltro: TipoFiltroScanner) => {
    const canvasRetificado = desentortarPerspectiva(pag.imagemOriginalEl, pag.cantos);
    const canvasFiltrado = aplicarFiltroDocumento(canvasRetificado, novoFiltro, pag.ajustes);
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

  // Alterar ajustes de tonalidade de uma página
  const alterarAjustesPagina = (
    pag: PaginaDigitalizada,
    chave: keyof AjustesTonalidade,
    valor: number
  ) => {
    const novosAjustes = { ...pag.ajustes, [chave]: valor };
    const canvasRetificado = desentortarPerspectiva(pag.imagemOriginalEl, pag.cantos);
    const canvasFiltrado = aplicarFiltroDocumento(canvasRetificado, pag.filtro, novosAjustes);
    const novaDataUrl = canvasFiltrado.toDataURL("image/jpeg", 0.9);

    setPaginas((prev) =>
      prev.map((p) =>
        p.id === pag.id
          ? {
              ...p,
              ajustes: novosAjustes,
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
        const canvasRetificado = desentortarPerspectiva(pag.imagemOriginalEl, pag.cantos);
        const canvasFinal = aplicarFiltroDocumento(canvasRetificado, pag.filtro, pag.ajustes);
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
      {/* Bloco de Captura Mobile / Desktop */}
      <div className="bg-card border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary shrink-0" />
              Digitalizar Documento com Câmera
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enquadramento automático com inteligência visual, correção de perspectiva e filtros de alta legibilidade para PDF.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
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
              disabled={processandoCaptura}
              onClick={() => inputCameraRef.current?.click()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition shadow-md text-sm disabled:opacity-50"
            >
              {processandoCaptura ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              <span>Tirar Foto</span>
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
              disabled={processandoCaptura}
              onClick={() => inputGaleriaRef.current?.click()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 active:scale-[0.98] transition text-sm border"
            >
              <Upload className="w-4 h-4" />
              <span>Galeria</span>
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

      {/* Lista de Páginas Digitalizadas (Visual Mobile Otimizado) */}
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
                Mais Página
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginas.map((pag, idx) => (
              <div
                key={pag.id}
                className="bg-card border rounded-2xl overflow-hidden shadow-sm flex flex-col group relative"
              >
                {/* Visualizador da Imagem */}
                <div className="relative aspect-[3/4] bg-muted/30 flex items-center justify-center overflow-hidden">
                  <img
                    src={pag.dataUrlProcessada}
                    alt={`Página ${idx + 1}`}
                    className="w-full h-full object-contain p-2 transition-transform duration-200"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-background/90 backdrop-blur-md border px-2.5 py-1 rounded-lg text-xs font-bold text-foreground shadow-xs">
                    Página {idx + 1}
                  </div>

                  {/* Ações Rápidas no Card */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => iniciarEdicao(pag)}
                      title="Ajustar Cantos e Tonalidade"
                      className="p-2 bg-background/90 backdrop-blur-md text-foreground hover:text-primary rounded-xl border shadow-sm transition active:scale-95"
                    >
                      <Crop className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removerPagina(pag.id)}
                      title="Excluir Página"
                      className="p-2 bg-background/90 backdrop-blur-md text-destructive hover:bg-destructive/10 rounded-xl border shadow-sm transition active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Filtros e Ajuste de Tonalidade */}
                <div className="p-3.5 border-t bg-muted/10 space-y-3">
                  {/* Seletor de Filtros */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: "realce", label: "Mágico" },
                        { id: "pb", label: "P&B Doc" },
                        { id: "cinza", label: "Cinza" },
                        { id: "original", label: "Original" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => alterarFiltroPagina(pag, f.id)}
                        className={`text-xs py-1.5 rounded-lg font-semibold border transition ${
                          pag.filtro === f.id
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Sliders de Tonalidade Rápidos */}
                  <div className="pt-1 space-y-2 border-t border-border/50 text-xs">
                    {/* Intensidade / Limiar */}
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[11px] text-muted-foreground w-16">
                        {pag.filtro === "pb" ? "Corte P&B" : "Realce"}:
                      </span>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={pag.ajustes.intensidade}
                        onChange={(e) =>
                          alterarAjustesPagina(pag, "intensidade", Number(e.target.value))
                        }
                        className="flex-1 h-1.5 bg-muted rounded-lg accent-primary cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">
                        {pag.ajustes.intensidade}
                      </span>
                    </div>

                    {/* Brilho */}
                    <div className="flex items-center gap-2">
                      <Sun className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[11px] text-muted-foreground w-16">Brilho:</span>
                      <input
                        type="range"
                        min="-40"
                        max="40"
                        value={pag.ajustes.brilho}
                        onChange={(e) =>
                          alterarAjustesPagina(pag, "brilho", Number(e.target.value))
                        }
                        className="flex-1 h-1.5 bg-muted rounded-lg accent-primary cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">
                        {pag.ajustes.brilho > 0 ? `+${pag.ajustes.brilho}` : pag.ajustes.brilho}
                      </span>
                    </div>
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-2xl hover:bg-primary/90 active:scale-[0.98] transition shadow-lg disabled:opacity-50 text-sm cursor-pointer"
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

      {/* Modal / Overlay Fullscreen de Ajuste de Cantos & Tonalidade */}
      {paginaEditando && cantosAtuais && (
        <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Topo do Modal Mobile/Desktop */}
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b bg-card/60">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <Crop className="w-4 h-4 text-primary" />
                Ajustar Enquadramento
              </h3>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Auto-enquadramento aplicado. Ajuste os cantos manualmente se desejar.
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={executarAutoDetecao}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 transition cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto-Detectar</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setCantosAtuais(
                    cantosPadrao(paginaEditando.imagemOriginalEl.width, paginaEditando.imagemOriginalEl.height)
                  )
                }
                className="p-1.5 sm:px-3 sm:py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-xl border hover:bg-secondary/80 transition cursor-pointer"
                title="Redefinir Margem"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline ml-1.5">Redefinir</span>
              </button>
              <button
                type="button"
                onClick={() => setPaginaEditando(null)}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarEdicaoPagina}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar</span>
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
              className="max-w-full max-h-full object-contain rounded-xl shadow-xl cursor-crosshair border border-border/80"
            />

            {/* Lupa de Zoom Ampliada Suspensa (HUD no Topo para não tampar com o dedo) */}
            {posicaoPontoAtivo && (
              <div className="absolute top-4 left-4 z-20 flex flex-col items-center gap-1 bg-black/80 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl animate-in zoom-in-90 duration-150 pointer-events-none">
                <canvas
                  ref={canvasLupaRef}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-blue-400"
                />
                <span className="text-[10px] text-white/80 font-semibold tracking-wider uppercase">
                  Zoom 2.5x
                </span>
              </div>
            )}

            {/* Dica Flutuante de Toque */}
            {!posicaoPontoAtivo && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-md border px-3.5 py-1.5 rounded-full text-[11px] font-medium text-foreground flex items-center gap-1.5 shadow-md pointer-events-none">
                <Move className="w-3.5 h-3.5 text-primary" />
                Arraste os 4 círculos nos cantos da folha
              </div>
            )}
          </div>

          {/* Rodapé: Seletor de Filtros e Tonalidade */}
          <div className="p-3 sm:p-4 border-t bg-card/80 backdrop-blur-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filtros */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Filtro:
                </span>
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
                    className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition shrink-0 cursor-pointer ${
                      filtroTemp === f.id
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setMostrarSlidersAjuste((prev) => !prev)}
                  className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition shrink-0 ml-1 flex items-center gap-1 cursor-pointer ${
                    mostrarSlidersAjuste
                      ? "bg-secondary text-secondary-foreground border-border"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Tonalidade</span>
                  {mostrarSlidersAjuste ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Painel Expansível de Tonalidade */}
            {mostrarSlidersAjuste && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60 animate-in slide-in-from-bottom-2 duration-150">
                {/* Intensidade */}
                <div className="flex items-center gap-2 bg-background/60 p-2.5 rounded-xl border">
                  <Sliders className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1">
                      <span>{filtroTemp === "pb" ? "Corte P&B" : "Intensidade"}</span>
                      <span className="font-mono">{ajustesTemp.intensidade}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={ajustesTemp.intensidade}
                      onChange={(e) =>
                        setAjustesTemp((prev) => ({ ...prev, intensidade: Number(e.target.value) }))
                      }
                      className="w-full h-1.5 bg-muted rounded-lg accent-primary cursor-pointer"
                    />
                  </div>
                </div>

                {/* Brilho */}
                <div className="flex items-center gap-2 bg-background/60 p-2.5 rounded-xl border">
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1">
                      <span>Brilho</span>
                      <span className="font-mono">
                        {ajustesTemp.brilho > 0 ? `+${ajustesTemp.brilho}` : ajustesTemp.brilho}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      value={ajustesTemp.brilho}
                      onChange={(e) =>
                        setAjustesTemp((prev) => ({ ...prev, brilho: Number(e.target.value) }))
                      }
                      className="w-full h-1.5 bg-muted rounded-lg accent-primary cursor-pointer"
                    />
                  </div>
                </div>

                {/* Contraste */}
                <div className="flex items-center gap-2 bg-background/60 p-2.5 rounded-xl border">
                  <Contrast className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1">
                      <span>Contraste</span>
                      <span className="font-mono">
                        {ajustesTemp.contraste > 0 ? `+${ajustesTemp.contraste}` : ajustesTemp.contraste}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      value={ajustesTemp.contraste}
                      onChange={(e) =>
                        setAjustesTemp((prev) => ({ ...prev, contraste: Number(e.target.value) }))
                      }
                      className="w-full h-1.5 bg-muted rounded-lg accent-primary cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
