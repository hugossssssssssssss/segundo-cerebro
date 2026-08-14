import { useState, useRef } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import {
  FileText,
  FilePlus,
  Scissors,
  Image as ImageIcon,
  RotateCw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Type,
  Loader2,
  FileDigit,
  Copy,
  Check,
} from "lucide-react";
import { Botao, Cartao, Aviso, Selo } from "@/components/ui";
import { cn } from "@/lib/utils";

type AbaPDF = "juntar" | "dividir" | "imagens" | "girar" | "marca" | "ocr";

export default function FerramentasPDF() {
  const [abaAtiva, setAbaAtiva] = useState<AbaPDF>("juntar");

  // Estados gerais
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [processando, setProcessando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erro, setErro] = useState("");

  // Configurações específicas
  const [intervaloPaginas, setIntervaloPaginas] = useState("");
  const [textoMarca, setTextoMarca] = useState("CONFIDENCIAL");
  const [textoExtraido, setTextoExtraido] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [rotacoes, setRotacoes] = useState<Record<number, number>>({});
  const [numPaginasTotal, setNumPaginasTotal] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auxiliar para baixar arquivo gerado
  function baixarBlob(bytes: Uint8Array, nomeArquivo: string) {
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 1. JUNTAR PDFs (Merge)
  async function executarJuntar() {
    if (arquivos.length < 2) {
      setErro("Selecione pelo menos 2 arquivos PDF para juntar.");
      return;
    }
    setProcessando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const pdfFinal = await PDFDocument.create();
      for (const f of arquivos) {
        const bytes = await f.arrayBuffer();
        const pdfItem = await PDFDocument.load(bytes);
        const paginas = await pdfFinal.copyPages(pdfItem, pdfItem.getPageIndices());
        paginas.forEach((p) => pdfFinal.addPage(p));
      }
      const pdfBytes = await pdfFinal.save();
      baixarBlob(pdfBytes, "PDF_Mesclado_SegundoCerebro.pdf");
      setMensagemSucesso("PDFs mesclados com sucesso! O download começou.");
    } catch {
      setErro("Erro ao mesclar PDFs. Verifique se os arquivos são PDFs válidos.");
    } finally {
      setProcessando(false);
    }
  }

  // 2. DIVIDIR PDF (Split)
  async function executarDividir() {
    if (arquivos.length === 0) {
      setErro("Selecione um arquivo PDF para dividir.");
      return;
    }
    setProcessando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const bytes = await arquivos[0].arrayBuffer();
      const pdfOriginal = await PDFDocument.load(bytes);
      const total = pdfOriginal.getPageCount();

      if (intervaloPaginas.trim()) {
        // Extrai intervalo específico (ex: "1-3, 5")
        const indices: number[] = [];
        const partes = intervaloPaginas.split(",");
        for (const p of partes) {
          if (p.includes("-")) {
            const [ini, fim] = p.split("-").map((x) => parseInt(x.trim(), 10));
            if (!isNaN(ini) && !isNaN(fim)) {
              for (let i = Math.max(1, ini); i <= Math.min(total, fim); i++) {
                indices.push(i - 1);
              }
            }
          } else {
            const n = parseInt(p.trim(), 10);
            if (!isNaN(n) && n >= 1 && n <= total) indices.push(n - 1);
          }
        }

        if (indices.length === 0) {
          setErro("Nenhuma página válida encontrada no intervalo informado.");
          setProcessando(false);
          return;
        }

        const pdfNovo = await PDFDocument.create();
        const paginas = await pdfNovo.copyPages(pdfOriginal, indices);
        paginas.forEach((pg) => pdfNovo.addPage(pg));
        const pdfBytes = await pdfNovo.save();
        baixarBlob(pdfBytes, `PDF_Extraido_Pags_${intervaloPaginas.replace(/\s+/g, "")}.pdf`);
        setMensagemSucesso("Páginas extraídas com sucesso!");
      } else {
        // Se vazio, extrai cada página em um PDF separado
        for (let i = 0; i < total; i++) {
          const pdfNovo = await PDFDocument.create();
          const [pagina] = await pdfNovo.copyPages(pdfOriginal, [i]);
          pdfNovo.addPage(pagina);
          const pdfBytes = await pdfNovo.save();
          baixarBlob(pdfBytes, `${arquivos[0].name.replace(/\.pdf$/i, "")}_Pagina_${i + 1}.pdf`);
        }
        setMensagemSucesso(`Todas as ${total} páginas foram divididas com sucesso!`);
      }
    } catch {
      setErro("Erro ao dividir o PDF.");
    } finally {
      setProcessando(false);
    }
  }

  // 3. IMAGENS PARA PDF
  async function executarImagensParaPdf() {
    if (arquivos.length === 0) {
      setErro("Selecione pelo menos 1 imagem para converter em PDF.");
      return;
    }
    setProcessando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const pdfDoc = await PDFDocument.create();

      for (const imgFile of arquivos) {
        const bytes = await imgFile.arrayBuffer();
        let imagemEmbed;
        const tipo = imgFile.type.toLowerCase();

        if (tipo.includes("png")) {
          imagemEmbed = await pdfDoc.embedPng(bytes);
        } else if (tipo.includes("jpeg") || tipo.includes("jpg")) {
          imagemEmbed = await pdfDoc.embedJpg(bytes);
        } else {
          // Para outros tipos, tenta converter canvas
          const imgEl = new Image();
          imgEl.src = URL.createObjectURL(imgFile);
          await new Promise((res) => (imgEl.onload = res));
          const canvas = document.createElement("canvas");
          canvas.width = imgEl.width;
          canvas.height = imgEl.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(imgEl, 0, 0);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          const jpgBytes = await (await fetch(dataUrl)).arrayBuffer();
          imagemEmbed = await pdfDoc.embedJpg(jpgBytes);
        }

        const page = pdfDoc.addPage([imagemEmbed.width, imagemEmbed.height]);
        page.drawImage(imagemEmbed, {
          x: 0,
          y: 0,
          width: imagemEmbed.width,
          height: imagemEmbed.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      baixarBlob(pdfBytes, "Imagens_Convertidas_SegundoCerebro.pdf");
      setMensagemSucesso("Imagens convertidas em PDF com sucesso!");
    } catch {
      setErro("Erro ao converter imagens para PDF.");
    } finally {
      setProcessando(false);
    }
  }

  // 4. GIRAR PÁGINAS
  async function carregarInfoGirar(f: File) {
    try {
      const bytes = await f.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      setNumPaginasTotal(pdfDoc.getPageCount());
      const initialRot: Record<number, number> = {};
      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        initialRot[i] = pdfDoc.getPage(i).getRotation().angle;
      }
      setRotacoes(initialRot);
    } catch {
      setErro("Não foi possível ler as páginas do PDF.");
    }
  }

  async function executarGirar() {
    if (arquivos.length === 0) {
      setErro("Selecione um PDF para girar as páginas.");
      return;
    }
    setProcessando(true);
    setErro("");

    try {
      const bytes = await arquivos[0].arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const total = pdfDoc.getPageCount();

      for (let i = 0; i < total; i++) {
        const angulo = rotacoes[i] || 0;
        pdfDoc.getPage(i).setRotation(degrees(angulo));
      }

      const pdfBytes = await pdfDoc.save();
      baixarBlob(pdfBytes, `${arquivos[0].name.replace(/\.pdf$/i, "")}_Girado.pdf`);
      setMensagemSucesso("Páginas giradas e salvas com sucesso!");
    } catch {
      setErro("Erro ao aplicar rotação no PDF.");
    } finally {
      setProcessando(false);
    }
  }

  // 5. MARCA D'ÁGUA
  async function executarMarcaDagua() {
    if (arquivos.length === 0) {
      setErro("Selecione um PDF para aplicar marca d'água.");
      return;
    }
    if (!textoMarca.trim()) {
      setErro("Digite o texto da marca d'água.");
      return;
    }
    setProcessando(true);
    setErro("");

    try {
      const bytes = await arquivos[0].arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const fonte = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const paginas = pdfDoc.getPages();

      for (const page of paginas) {
        const { width, height } = page.getSize();
        const tamFonte = Math.min(width, height) / 10;
        page.drawText(textoMarca, {
          x: width / 6,
          y: height / 2,
          size: tamFonte,
          font: fonte,
          color: rgb(0.6, 0.6, 0.7),
          opacity: 0.35,
          rotate: degrees(45),
        });
      }

      const pdfBytes = await pdfDoc.save();
      baixarBlob(pdfBytes, `${arquivos[0].name.replace(/\.pdf$/i, "")}_MarcaDagua.pdf`);
      setMensagemSucesso("Marca d'água aplicada com sucesso!");
    } catch {
      setErro("Erro ao adicionar marca d'água no PDF.");
    } finally {
      setProcessando(false);
    }
  }

  // 6. EXTRAIR TEXTO / OCR
  async function executarExtrairTexto() {
    if (arquivos.length === 0) {
      setErro("Selecione um PDF para extrair o texto.");
      return;
    }
    setProcessando(true);
    setErro("");
    setTextoExtraido("");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("por");
      
      const fileUrl = URL.createObjectURL(arquivos[0]);
      const ret = await worker.recognize(fileUrl);
      await worker.terminate();
      URL.revokeObjectURL(fileUrl);

      const texto = ret.data.text.trim();
      if (texto) {
        setTextoExtraido(texto);
        setMensagemSucesso("Texto extraído com sucesso!");
      } else {
        setErro("Não foi possível extrair texto legível deste documento.");
      }
    } catch {
      setErro("Erro ao realizar OCR no documento.");
    } finally {
      setProcessando(false);
    }
  }

  // Manipulação de arquivos da lista
  function adicionarArquivos(novos: FileList | null) {
    if (!novos) return;
    const array = Array.from(novos);
    setArquivos((prev) => [...prev, ...array]);
    setMensagemSucesso("");
    setErro("");

    if (abaAtiva === "girar" && array.length > 0) {
      carregarInfoGirar(array[0]);
    }
  }

  function removerArquivo(index: number) {
    setArquivos((prev) => prev.filter((_, i) => i !== index));
  }

  function moverArquivo(index: number, direcao: -1 | 1) {
    setArquivos((prev) => {
      const novo = [...prev];
      const dest = index + direcao;
      if (dest < 0 || dest >= novo.length) return prev;
      const tmp = novo[index];
      novo[index] = novo[dest];
      novo[dest] = tmp;
      return novo;
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              <FileText size={20} />
            </div>
            Ferramentas PDF
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Junte, divida, converta imagens, gire e extraia texto de PDFs 100% no seu navegador. Sem backend, com total privacidade.
          </p>
        </div>

        <Selo tom="sucesso" className="self-start sm:self-center px-3 py-1">
          🔒 100% Local & Privado
        </Selo>
      </div>

      {/* Navegação por Abas das Ferramentas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border/40 scrollbar-none">
        {[
          { id: "juntar", label: "Juntar PDFs", Icone: Layers },
          { id: "dividir", label: "Dividir PDF", Icone: Scissors },
          { id: "imagens", label: "Imagens para PDF", Icone: ImageIcon },
          { id: "girar", label: "Girar Páginas", Icone: RotateCw },
          { id: "marca", label: "Marca d'Água", Icone: Type },
          { id: "ocr", label: "Extrair Texto (OCR)", Icone: FileDigit },
        ].map(({ id, label, Icone }) => (
          <button
            key={id}
            onClick={() => {
              setAbaAtiva(id as AbaPDF);
              setArquivos([]);
              setErro("");
              setMensagemSucesso("");
              setTextoExtraido("");
            }}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200",
              abaAtiva === id
                ? "bg-primary text-primary-foreground shadow-sm scale-105"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icone size={15} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Avisos de Sucesso ou Erro */}
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {mensagemSucesso && <Aviso tom="sucesso">{mensagemSucesso}</Aviso>}

      {/* Área de Seleção de Arquivos (Dropzone) */}
      <Cartao className="p-6 border-dashed border-2 border-border/80 hover:border-primary/50 transition-colors text-center cursor-pointer bg-card/40">
        <input
          ref={fileInputRef}
          type="file"
          multiple={abaAtiva === "juntar" || abaAtiva === "imagens"}
          accept={abaAtiva === "imagens" ? "image/*" : ".pdf,application/pdf"}
          onChange={(e) => adicionarArquivos(e.target.files)}
          className="hidden"
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2.5 py-6"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FilePlus size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {abaAtiva === "imagens"
                ? "Clique ou arraste imagens (PNG, JPG, WEBP)"
                : "Clique ou arraste seus arquivos PDF"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Processamento instantâneo direto no seu dispositivo.
            </p>
          </div>
          <Botao variante="neutro" tamanho="pequeno" className="mt-2">
            Selecionar Arquivos
          </Botao>
        </div>
      </Cartao>

      {/* Lista de Arquivos Selecionados */}
      {arquivos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Arquivos Selecionados ({arquivos.length})
          </h3>
          <div className="space-y-2">
            {arquivos.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-card/80 shadow-sm"
              >
                <div className="flex items-center gap-3 truncate min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="truncate min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {arquivos.length > 1 && (
                    <>
                      <button
                        onClick={() => moverArquivo(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="Mover para cima"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moverArquivo(idx, 1)}
                        disabled={idx === arquivos.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => removerArquivo(idx)}
                    className="p-1 text-red-500 hover:text-red-600 transition-colors ml-1"
                    title="Remover arquivo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controles Específicos por Ferramenta */}

      {/* ABA: JUNTAR */}
      {abaAtiva === "juntar" && (
        <div className="flex justify-end pt-2">
          <Botao
            variante="primario"
            disabled={arquivos.length < 2 || processando}
            onClick={executarJuntar}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            {processando ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
            <span>Juntar {arquivos.length} PDFs</span>
          </Botao>
        </div>
      )}

      {/* ABA: DIVIDIR */}
      {abaAtiva === "dividir" && (
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Intervalo de páginas para extrair (Opcional, ex: 1-3, 5):
            </label>
            <input
              type="text"
              value={intervaloPaginas}
              onChange={(e) => setIntervaloPaginas(e.target.value)}
              placeholder="Deixe em branco para salvar cada página em um PDF separado"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
            />
          </div>
          <div className="flex justify-end">
            <Botao
              variante="primario"
              disabled={arquivos.length === 0 || processando}
              onClick={executarDividir}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              {processando ? <Loader2 size={16} className="animate-spin" /> : <Scissors size={16} />}
              <span>Dividir PDF</span>
            </Botao>
          </div>
        </div>
      )}

      {/* ABA: IMAGENS PARA PDF */}
      {abaAtiva === "imagens" && (
        <div className="flex justify-end pt-2">
          <Botao
            variante="primario"
            disabled={arquivos.length === 0 || processando}
            onClick={executarImagensParaPdf}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            {processando ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
            <span>Converter {arquivos.length} Imagens em PDF</span>
          </Botao>
        </div>
      )}

      {/* ABA: GIRAR PÁGINAS */}
      {abaAtiva === "girar" && arquivos.length > 0 && numPaginasTotal > 0 && (
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Girar Páginas do Documento ({numPaginasTotal} páginas)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: numPaginasTotal }).map((_, pIdx) => {
              const angulo = rotacoes[pIdx] || 0;
              return (
                <div key={pIdx} className="p-3 border border-border rounded-xl bg-card flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Página {pIdx + 1}</span>
                  <div className="text-xs font-bold text-foreground">{angulo}°</div>
                  <button
                    type="button"
                    onClick={() =>
                      setRotacoes((prev) => ({
                        ...prev,
                        [pIdx]: ((prev[pIdx] || 0) + 90) % 360,
                      }))
                    }
                    className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs flex items-center gap-1"
                  >
                    <RotateCw size={13} />
                    <span>Girar 90°</span>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-2">
            <Botao
              variante="primario"
              disabled={processando}
              onClick={executarGirar}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              {processando ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
              <span>Salvar PDF com Rotações</span>
            </Botao>
          </div>
        </div>
      )}

      {/* ABA: MARCA D'ÁGUA */}
      {abaAtiva === "marca" && (
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Texto da Marca d'Água:
            </label>
            <input
              type="text"
              value={textoMarca}
              onChange={(e) => setTextoMarca(e.target.value)}
              placeholder="Ex: CONFIDENCIAL, RASCUNHO, HUGO SILVA"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
            />
          </div>
          <div className="flex justify-end">
            <Botao
              variante="primario"
              disabled={arquivos.length === 0 || processando}
              onClick={executarMarcaDagua}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              {processando ? <Loader2 size={16} className="animate-spin" /> : <Type size={16} />}
              <span>Aplicar Marca d'Água</span>
            </Botao>
          </div>
        </div>
      )}

      {/* ABA: EXTRAIR TEXTO (OCR) */}
      {abaAtiva === "ocr" && (
        <div className="space-y-4 pt-2">
          <div className="flex justify-end">
            <Botao
              variante="primario"
              disabled={arquivos.length === 0 || processando}
              onClick={executarExtrairTexto}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              {processando ? <Loader2 size={16} className="animate-spin" /> : <FileDigit size={16} />}
              <span>Extrair Texto do PDF</span>
            </Botao>
          </div>

          {textoExtraido && (
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Texto Extraído
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(textoExtraido);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                >
                  {copiado ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiado ? "Copiado!" : "Copiar Texto"}</span>
                </button>
              </div>
              <textarea
                readOnly
                value={textoExtraido}
                rows={10}
                className="w-full rounded-xl border border-border bg-background p-3.5 text-xs text-foreground outline-none resize-y font-mono"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
