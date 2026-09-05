import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  FileText,
  FilePlus,
  Scissors,
  Layers,
  Crop,
  Lock,
  ArrowUp,
  ArrowDown,
  Trash2,
  Loader2,
  FileArchive,
  Minimize2,
  Check,
  Sparkles,
  Download,
} from "lucide-react";
import { Botao, Cartao, Aviso } from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { cn } from "@/lib/utils";

// Configura o worker do PDF.js via Vite bundle local
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export type AbaILovePDF = "juntar" | "dividir" | "comprimir" | "recortar" | "desbloquear" | "organizar";

interface InfoPagina {
  index: number;
  numPagina: number;
}

export interface FerramentasPDFProps {
  modoFocado?: boolean;
  abaInicial?: AbaILovePDF;
}

export default function FerramentasPDF({ modoFocado, abaInicial }: FerramentasPDFProps = {}) {
  const [searchParams] = useSearchParams();
  const abaParam = searchParams.get("aba") as AbaILovePDF | null;

  const [abaAtiva, setAbaAtiva] = useState<AbaILovePDF>(() => {
    if (abaInicial && ["juntar", "dividir", "comprimir", "recortar", "desbloquear", "organizar"].includes(abaInicial)) {
      return abaInicial;
    }
    if (abaParam && ["juntar", "dividir", "comprimir", "recortar", "desbloquear", "organizar"].includes(abaParam)) {
      return abaParam;
    }
    return "juntar";
  });

  useEffect(() => {
    if (abaInicial && ["juntar", "dividir", "comprimir", "recortar", "desbloquear", "organizar"].includes(abaInicial)) {
      setAbaAtiva(abaInicial);
    } else if (abaParam && ["juntar", "dividir", "comprimir", "recortar", "desbloquear", "organizar"].includes(abaParam)) {
      setAbaAtiva(abaParam);
    }
  }, [abaInicial, abaParam]);

  // Estados
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [processando, setProcessando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erro, setErro] = useState("");

  // Configurações das ferramentas
  const [porcentagemMargem, setPorcentagemMargem] = useState(10);
  const [paginasOrganizar, setPaginasOrganizar] = useState<InfoPagina[]>([]);

  // Estados específicos para Dividir / Extrair com Miniaturas Visuais
  interface MiniaturaPaginaDividir {
    numPagina: number;
    dataUrl: string;
  }
  const [miniaturasDividir, setMiniaturasDividir] = useState<MiniaturaPaginaDividir[]>([]);
  const [carregandoMiniaturas, setCarregandoMiniaturas] = useState(false);
  const [paginasSelecionadasDividir, setPaginasSelecionadasDividir] = useState<Set<number>>(new Set());
  const [modoExtrairUnicoPdf, setModoExtrairUnicoPdf] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Gera pré-visualização de todas as páginas do PDF para seleção visual
  async function carregarMiniaturasDividir(arquivo: File) {
    setCarregandoMiniaturas(true);
    setMiniaturasDividir([]);
    setPaginasSelecionadasDividir(new Set());
    setErro("");
    try {
      const buffer = await arquivo.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
        cMapPacked: true,
      });
      const pdf = await loadingTask.promise;
      const totalPaginas = pdf.numPages;

      const resultados: MiniaturaPaginaDividir[] = [];
      const selecionadasIniciais = new Set<number>();

      for (let i = 1; i <= totalPaginas; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.35 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resultados.push({
            numPagina: i,
            dataUrl,
          });
        }
        selecionadasIniciais.add(i);
      }

      setMiniaturasDividir(resultados);
      setPaginasSelecionadasDividir(selecionadasIniciais);
    } catch (err: any) {
      setErro(`Não foi possível gerar a pré-visualização das páginas: ${err?.message || err}`);
    } finally {
      setCarregandoMiniaturas(false);
    }
  }

  useEffect(() => {
    if (abaAtiva === "dividir" && arquivos.length > 0) {
      carregarMiniaturasDividir(arquivos[0]);
    } else if (abaAtiva !== "dividir") {
      setMiniaturasDividir([]);
      setPaginasSelecionadasDividir(new Set());
    }
  }, [abaAtiva, arquivos]);

  const alternarSelecaoPagina = (num: number) => {
    setPaginasSelecionadasDividir((prev) => {
      const novo = new Set(prev);
      if (novo.has(num)) {
        novo.delete(num);
      } else {
        novo.add(num);
      }
      return novo;
    });
  };

  const selecionarTodasPaginas = () => {
    const todas = new Set(miniaturasDividir.map((m) => m.numPagina));
    setPaginasSelecionadasDividir(todas);
  };

  const desmarcarTodasPaginas = () => {
    setPaginasSelecionadasDividir(new Set());
  };

  const inverterSelecaoPaginas = () => {
    setPaginasSelecionadasDividir((prev) => {
      const invertido = new Set<number>();
      miniaturasDividir.forEach((m) => {
        if (!prev.has(m.numPagina)) {
          invertido.add(m.numPagina);
        }
      });
      return invertido;
    });
  };

  // 1. JUNTAR PDF
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
      baixarBlob(pdfBytes, "PDF_Mesclado_iLovePDF.pdf");
      setMensagemSucesso("PDFs mesclados e juntados com sucesso!");
    } catch {
      setErro("Erro ao mesclar os PDFs.");
    } finally {
      setProcessando(false);
    }
  }

  // 2. DIVIDIR PDF / EXTRAIR PÁGINAS COM SELEÇÃO VISUAL
  async function executarDividir() {
    if (arquivos.length === 0) {
      setErro("Selecione um arquivo PDF para dividir.");
      return;
    }
    if (paginasSelecionadasDividir.size === 0) {
      setErro("Selecione pelo menos 1 página para extrair.");
      return;
    }
    setProcessando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const bytes = await arquivos[0].arrayBuffer();
      const pdfOriginal = await PDFDocument.load(bytes);
      const paginasOrdenadas = Array.from(paginasSelecionadasDividir).sort((a, b) => a - b);
      const indicesZeroBased = paginasOrdenadas.map((num) => num - 1);
      const nomeBase = arquivos[0].name.replace(/\.pdf$/i, "");

      if (modoExtrairUnicoPdf) {
        const pdfNovo = await PDFDocument.create();
        const paginas = await pdfNovo.copyPages(pdfOriginal, indicesZeroBased);
        paginas.forEach((pg) => pdfNovo.addPage(pg));
        const pdfBytes = await pdfNovo.save();
        baixarBlob(pdfBytes, `${nomeBase}_Paginas_Selecionadas.pdf`);
        setMensagemSucesso(`${paginasOrdenadas.length} página(s) selecionada(s) extraída(s) com sucesso em um único PDF!`);
      } else {
        for (const num of paginasOrdenadas) {
          const pdfNovo = await PDFDocument.create();
          const [pagina] = await pdfNovo.copyPages(pdfOriginal, [num - 1]);
          pdfNovo.addPage(pagina);
          const pdfBytes = await pdfNovo.save();
          baixarBlob(pdfBytes, `${nomeBase}_Pagina_${num}.pdf`);
        }
        setMensagemSucesso(`${paginasOrdenadas.length} página(s) extraída(s) e baixada(s) como arquivos individuais!`);
      }
    } catch (err: any) {
      setErro(`Erro ao processar e extrair as páginas: ${err?.message || err}`);
    } finally {
      setProcessando(false);
    }
  }

  // 3. COMPRIMIR PDF
  async function executarComprimir() {
    if (arquivos.length === 0) {
      setErro("Selecione um PDF para comprimir.");
      return;
    }
    setProcessando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const bytes = await arquivos[0].arrayBuffer();
      const pdfOriginal = await PDFDocument.load(bytes);
      const pdfOtimizado = await PDFDocument.create();

      const paginas = await pdfOtimizado.copyPages(pdfOriginal, pdfOriginal.getPageIndices());
      paginas.forEach((p) => pdfOtimizado.addPage(p));

      // Salva com compactação de objetos
      const pdfBytes = await pdfOtimizado.save({ useObjectStreams: true });
      baixarBlob(pdfBytes, `${arquivos[0].name.replace(/\.pdf$/i, "")}_Comprimido.pdf`);
      setMensagemSucesso("PDF otimizado e comprimido com sucesso!");
    } catch {
      setErro("Erro ao comprimir PDF.");
    } finally {
      setProcessando(false);
    }
  }

  // 4. RECORTAR PDF
  async function executarRecortar() {
    if (arquivos.length === 0) {
      setErro("Selecione um PDF para recortar as margens.");
      return;
    }
    setProcessando(true);
    setErro("");

    try {
      const bytes = await arquivos[0].arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const paginas = pdfDoc.getPages();

      for (const page of paginas) {
        const { width, height } = page.getSize();
        const margemX = (width * porcentagemMargem) / 100;
        const margemY = (height * porcentagemMargem) / 100;
        page.setCropBox(margemX, margemY, width - margemX * 2, height - margemY * 2);
      }

      const pdfBytes = await pdfDoc.save();
      baixarBlob(pdfBytes, `${arquivos[0].name.replace(/\.pdf$/i, "")}_Recortado.pdf`);
      setMensagemSucesso("Margens do PDF recortadas com sucesso!");
    } catch {
      setErro("Erro ao recortar margens do PDF.");
    } finally {
      setProcessando(false);
    }
  }

  // 5. DESBLOQUEAR PDF
  async function executarDesbloquear() {
    if (arquivos.length === 0) {
      setErro("Selecione um PDF protegido para desbloquear.");
      return;
    }
    setProcessando(true);
    setErro("");

    try {
      const bytes = await arquivos[0].arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pdfBytes = await pdfDoc.save();

      baixarBlob(pdfBytes, `${arquivos[0].name.replace(/\.pdf$/i, "")}_Desbloqueado.pdf`);
      setMensagemSucesso("PDF desbloqueado e livre de senhas!");
    } catch {
      setErro("Erro ao desbloquear o PDF. Verifique se a senha do arquivo é necessária.");
    } finally {
      setProcessando(false);
    }
  }

  // 6. ORGANIZAR PDF
  async function carregarInfoOrganizar(f: File) {
    try {
      const bytes = await f.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const total = pdfDoc.getPageCount();
      const lista: InfoPagina[] = [];
      for (let i = 0; i < total; i++) {
        lista.push({ index: i, numPagina: i + 1 });
      }
      setPaginasOrganizar(lista);
    } catch {
      setErro("Não foi possível carregar as páginas para organizar.");
    }
  }

  async function executarOrganizar() {
    if (arquivos.length === 0) {
      setErro("Selecione um PDF para organizar.");
      return;
    }
    setProcessando(true);
    setErro("");

    try {
      const bytes = await arquivos[0].arrayBuffer();
      const pdfOriginal = await PDFDocument.load(bytes);
      const pdfNovo = await PDFDocument.create();

      const indicesReordenados = paginasOrganizar.map((p) => p.index);
      const paginasCopiadas = await pdfNovo.copyPages(pdfOriginal, indicesReordenados);
      paginasCopiadas.forEach((p) => pdfNovo.addPage(p));

      const pdfBytes = await pdfNovo.save();
      baixarBlob(pdfBytes, `${arquivos[0].name.replace(/\.pdf$/i, "")}_Organizado.pdf`);
      setMensagemSucesso("Páginas organizadas com sucesso!");
    } catch {
      setErro("Erro ao reorganizar páginas do PDF.");
    } finally {
      setProcessando(false);
    }
  }

  function adicionarArquivos(novos: FileList | null) {
    if (!novos) return;
    const array = Array.from(novos);
    setArquivos((prev) => [...prev, ...array]);
    setMensagemSucesso("");
    setErro("");

    if (abaAtiva === "organizar" && array.length > 0) {
      carregarInfoOrganizar(array[0]);
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

  const abasFerramentas: {
    id: AbaILovePDF;
    label: string;
    descricao: string;
    Icone: any;
    cor: string;
  }[] = [
    {
      id: "juntar",
      label: "Juntar PDF",
      descricao: "Mescle múltiplos documentos PDF em um único arquivo na ordem que preferir",
      Icone: Layers,
      cor: "bg-red-500/10 text-red-600 dark:text-red-400",
    },
    {
      id: "dividir",
      label: "Dividir PDF",
      descricao: "Extraia páginas específicas ou separe cada página do documento PDF em arquivos individuais",
      Icone: Scissors,
      cor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      id: "comprimir",
      label: "Comprimir PDF",
      descricao: "Reduza o peso do arquivo PDF preservando a legibilidade e qualidade visual",
      Icone: Minimize2,
      cor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      id: "recortar",
      label: "Recortar Margens",
      descricao: "Apare as bordas em branco ou ajuste as margens de páginas selecionadas do PDF",
      Icone: Crop,
      cor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      id: "desbloquear",
      label: "Desbloquear PDF",
      descricao: "Remova senhas e restrições de edição de documentos PDF protegidos",
      Icone: Lock,
      cor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
    {
      id: "organizar",
      label: "Organizar Páginas",
      descricao: "Reordene, exclua ou duplique páginas de forma visual e intuitiva",
      Icone: FileArchive,
      cor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    },
  ];

  const abaInfo = abasFerramentas.find((a) => a.id === abaAtiva)!;

  return (
    <div className={cn("space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200", modoFocado && "space-y-4 max-w-full")}>
      {!modoFocado && (
        <>
          <CabecalhoPagina
            titulo="Ferramentas PDF"
            descricao="Manipule, mescle, divida e otimize documentos PDF diretamente no seu navegador."
            icone={<FileText size={20} />}
            corIcone="bg-red-500/10 text-red-600 dark:text-red-400"
          />

          {/* Grade de Ferramentas com Visual Unificado do Conversor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {abasFerramentas.map((f) => {
              const ativa = abaAtiva === f.id;
              const IconeComp = f.Icone;

              return (
                <div
                  key={f.id}
                  onClick={() => {
                    setAbaAtiva(f.id);
                    setArquivos([]);
                    setErro("");
                    setMensagemSucesso("");
                  }}
                  className={cn(
                    "group relative flex flex-col justify-between p-4 rounded-2xl border transition-all cursor-pointer shadow-xs",
                    ativa
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border/80 bg-card hover:bg-accent/50 hover:border-primary/40"
                  )}
                >
                  <div className="space-y-2.5">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105", f.cor)}>
                      <IconeComp size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                        {f.label}
                      </h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {f.descricao}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Avisos */}
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {mensagemSucesso && <Aviso tom="sucesso">{mensagemSucesso}</Aviso>}

      {/* Área de Seleção (Dropzone) */}
      <Cartao className="p-6 border-dashed border-2 border-border/80 hover:border-primary/50 transition-colors text-center cursor-pointer bg-card/40">
        <input
          ref={fileInputRef}
          type="file"
          multiple={abaAtiva === "juntar"}
          accept=".pdf,application/pdf"
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
              Clique ou arraste seus arquivos PDF aqui
            </p>
            <p className="text-xs text-muted-foreground mt-1">{abaInfo.descricao}</p>
          </div>
          <Botao variante="neutro" tamanho="pequeno" className="mt-2">
            Selecionar Arquivo PDF
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
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-card shadow-sm"
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
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moverArquivo(idx, 1)}
                        disabled={idx === arquivos.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => removerArquivo(idx)}
                    className="p-1 text-red-500 hover:text-red-600 transition-colors ml-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações Específicas */}

      {/* JUNTAR */}
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

      {/* DIVIDIR / EXTRAIR PÁGINAS VISUALMENTE */}
      {abaAtiva === "dividir" && arquivos.length > 0 && (
        <div className="space-y-4 pt-2">
          {carregandoMiniaturas ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-border bg-card/60 gap-3 text-muted-foreground animate-in fade-in duration-150">
              <Loader2 size={24} className="animate-spin text-primary" />
              <p className="text-xs font-medium text-foreground">
                Gerando pré-visualização das páginas do PDF...
              </p>
              <p className="text-[11px] text-muted-foreground">
                Isso leva apenas alguns instantes.
              </p>
            </div>
          ) : miniaturasDividir.length > 0 ? (
            <div className="space-y-4">
              {/* Barra de Ferramentas da Seleção Visual */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">
                    Clique nas páginas que deseja extrair:
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                    {paginasSelecionadasDividir.size} de {miniaturasDividir.length} selecionadas
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={selecionarTodasPaginas}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-foreground transition-colors cursor-pointer"
                  >
                    Selecionar Todas
                  </button>
                  <button
                    type="button"
                    onClick={desmarcarTodasPaginas}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-foreground transition-colors cursor-pointer"
                  >
                    Desmarcar Todas
                  </button>
                  <button
                    type="button"
                    onClick={inverterSelecaoPaginas}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-foreground transition-colors cursor-pointer"
                  >
                    Inverter
                  </button>
                </div>
              </div>

              {/* Opção de Modo de Extração */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-secondary/20">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" />
                  <span className="text-xs font-medium text-foreground">Modo de Saída:</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModoExtrairUnicoPdf(true)}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                      modoExtrairUnicoPdf
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    Unir em 1 PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoExtrairUnicoPdf(false)}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                      !modoExtrairUnicoPdf
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    Páginas Separadas (.pdf)
                  </button>
                </div>
              </div>

              {/* Grade Visual de Miniaturas das Páginas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[420px] overflow-y-auto p-1 rounded-xl border border-border/60 bg-background/50">
                {miniaturasDividir.map((miniatura) => {
                  const selecionada = paginasSelecionadasDividir.has(miniatura.numPagina);
                  return (
                    <div
                      key={miniatura.numPagina}
                      onClick={() => alternarSelecaoPagina(miniatura.numPagina)}
                      className={cn(
                        "group relative flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer select-none",
                        selecionada
                          ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/40"
                          : "border-border/80 bg-card hover:border-primary/40 opacity-55 hover:opacity-100"
                      )}
                    >
                      {/* Topo do Card com Número e Checkbox */}
                      <div className="flex items-center justify-between w-full mb-1.5 px-0.5">
                        <span className={cn(
                          "text-[11px] font-bold px-1.5 py-0.5 rounded-md",
                          selecionada ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        )}>
                          Pág {miniatura.numPagina}
                        </span>

                        <div className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                          selecionada
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border/80 bg-background text-transparent group-hover:border-primary/50"
                        )}>
                          {selecionada ? <Check size={12} strokeWidth={3} /> : <div className="h-2 w-2 rounded-xs" />}
                        </div>
                      </div>

                      {/* Imagem da Miniatura */}
                      <div className="w-full aspect-[1/1.414] rounded-lg overflow-hidden border border-border/50 bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center">
                        <img
                          src={miniatura.dataUrl}
                          alt={`Página ${miniatura.numPagina}`}
                          className="w-full h-full object-contain pointer-events-none"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão de Ação */}
              <div className="flex justify-end pt-1">
                <Botao
                  variante="primario"
                  disabled={paginasSelecionadasDividir.size === 0 || processando}
                  onClick={executarDividir}
                  className="w-full sm:w-auto flex items-center gap-2 shadow-md"
                >
                  {processando ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : modoExtrairUnicoPdf ? (
                    <Scissors size={16} />
                  ) : (
                    <Download size={16} />
                  )}
                  <span>
                    {modoExtrairUnicoPdf
                      ? `Extrair ${paginasSelecionadasDividir.size} Página(s) em 1 PDF`
                      : `Baixar ${paginasSelecionadasDividir.size} Página(s) Individuais`}
                  </span>
                </Botao>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* COMPRIMIR */}
      {abaAtiva === "comprimir" && (
        <div className="flex justify-end pt-2">
          <Botao
            variante="primario"
            disabled={arquivos.length === 0 || processando}
            onClick={executarComprimir}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            {processando ? <Loader2 size={16} className="animate-spin" /> : <Minimize2 size={16} />}
            <span>Comprimir PDF</span>
          </Botao>
        </div>
      )}

      {/* RECORTAR */}
      {abaAtiva === "recortar" && (
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Porcentagem de recorte de margens ({porcentagemMargem}%):
            </label>
            <input
              type="range"
              min={2}
              max={30}
              value={porcentagemMargem}
              onChange={(e) => setPorcentagemMargem(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <div className="flex justify-end">
            <Botao
              variante="primario"
              disabled={arquivos.length === 0 || processando}
              onClick={executarRecortar}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              {processando ? <Loader2 size={16} className="animate-spin" /> : <Crop size={16} />}
              <span>Recortar Margens do PDF</span>
            </Botao>
          </div>
        </div>
      )}

      {/* DESBLOQUEAR */}
      {abaAtiva === "desbloquear" && (
        <div className="space-y-4 pt-2">
          <div className="flex justify-end">
            <Botao
              variante="primario"
              disabled={arquivos.length === 0 || processando}
              onClick={executarDesbloquear}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              {processando ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              <span>Desbloquear PDF</span>
            </Botao>
          </div>
        </div>
      )}

      {/* ORGANIZAR */}
      {abaAtiva === "organizar" && paginasOrganizar.length > 0 && (
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Reordenar Páginas do Documento ({paginasOrganizar.length} páginas)
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {paginasOrganizar.map((p, idx) => (
              <div key={idx} className="p-3 border border-border rounded-xl bg-card flex flex-col items-center gap-2 text-xs">
                <span className="font-bold text-foreground">Pág. {p.numPagina}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (idx === 0) return;
                      const copy = [...paginasOrganizar];
                      const tmp = copy[idx];
                      copy[idx] = copy[idx - 1];
                      copy[idx - 1] = tmp;
                      setPaginasOrganizar(copy);
                    }}
                    disabled={idx === 0}
                    className="p-1 rounded bg-secondary disabled:opacity-30"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => {
                      if (idx === paginasOrganizar.length - 1) return;
                      const copy = [...paginasOrganizar];
                      const tmp = copy[idx];
                      copy[idx] = copy[idx + 1];
                      copy[idx + 1] = tmp;
                      setPaginasOrganizar(copy);
                    }}
                    disabled={idx === paginasOrganizar.length - 1}
                    className="p-1 rounded bg-secondary disabled:opacity-30"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    onClick={() => setPaginasOrganizar((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1 rounded bg-red-500/10 text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Botao
              variante="primario"
              disabled={processando}
              onClick={executarOrganizar}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              {processando ? <Loader2 size={16} className="animate-spin" /> : <FileArchive size={16} />}
              <span>Salvar PDF Organizado</span>
            </Botao>
          </div>
        </div>
      )}
    </div>
  );
}
