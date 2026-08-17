import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PDFDocument } from "pdf-lib";
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
} from "lucide-react";
import { Botao, Cartao, Aviso } from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { cn } from "@/lib/utils";

type AbaILovePDF = "juntar" | "dividir" | "comprimir" | "recortar" | "desbloquear" | "organizar";

interface InfoPagina {
  index: number;
  numPagina: number;
}

export default function FerramentasPDF() {
  const [searchParams] = useSearchParams();
  const abaParam = searchParams.get("aba") as AbaILovePDF | null;

  const [abaAtiva, setAbaAtiva] = useState<AbaILovePDF>(() => {
    if (abaParam && ["juntar", "dividir", "comprimir", "recortar", "desbloquear", "organizar"].includes(abaParam)) {
      return abaParam;
    }
    return "juntar";
  });

  useEffect(() => {
    if (abaParam && ["juntar", "dividir", "comprimir", "recortar", "desbloquear", "organizar"].includes(abaParam)) {
      setAbaAtiva(abaParam);
    }
  }, [abaParam]);

  // Estados
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [processando, setProcessando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erro, setErro] = useState("");

  // Configurações das ferramentas
  const [intervaloPaginas, setIntervaloPaginas] = useState("");
  const [porcentagemMargem, setPorcentagemMargem] = useState(10);
  const [paginasOrganizar, setPaginasOrganizar] = useState<InfoPagina[]>([]);

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

  // 2. DIVIDIR PDF
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
          setErro("Nenhuma página válida encontrada no intervalo.");
          setProcessando(false);
          return;
        }

        const pdfNovo = await PDFDocument.create();
        const paginas = await pdfNovo.copyPages(pdfOriginal, indices);
        paginas.forEach((pg) => pdfNovo.addPage(pg));
        const pdfBytes = await pdfNovo.save();
        baixarBlob(pdfBytes, `PDF_Dividido_${intervaloPaginas.replace(/\s+/g, "")}.pdf`);
        setMensagemSucesso("Páginas extraídas com sucesso!");
      } else {
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
  }[] = [
    {
      id: "juntar",
      label: "Juntar PDF",
      descricao: "Mesclar e juntar PDFs e colocá-los em qualquer ordem que desejar.",
      Icone: Layers,
    },
    {
      id: "dividir",
      label: "Dividir PDF",
      descricao:
        "Selecione um intervalo de páginas, separe uma página, ou converta cada página do documento em arquivo PDF independente.",
      Icone: Scissors,
    },
    {
      id: "comprimir",
      label: "Comprimir PDF",
      descricao:
        "Diminua o tamanho do seu arquivo PDF, mantendo a melhor qualidade possível. Otimize seus arquivos PDF.",
      Icone: Minimize2,
    },
    {
      id: "recortar",
      label: "Recortar PDF",
      descricao:
        "Recorte as margens de documentos PDF ou selecione áreas específicas e depois aplique as alterações a uma página ou a todo o documento.",
      Icone: Crop,
    },
    {
      id: "desbloquear",
      label: "Desbloquear PDF",
      descricao:
        "Remova a senha de segurança dos PDF, assim você pode usá-los como quiser.",
      Icone: Lock,
    },
    {
      id: "organizar",
      label: "Organizar PDF",
      descricao:
        "Ordene as páginas de seu arquivo PDF como pretender. Exclua ou adicione páginas PDF ao seu documento como lhe for mais conveniente.",
      Icone: FileArchive,
    },
  ];

  const abaInfo = abasFerramentas.find((a) => a.id === abaAtiva)!;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Ferramentas PDF"
        descricao={abaInfo.descricao}
        icone={<FileText size={20} />}
        corIcone="bg-red-500/10 text-red-600 dark:text-red-400"
      />

      {/* Navegação por Abas das 6 Ferramentas Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {abasFerramentas.map(({ id, label, Icone }) => (
          <button
            key={id}
            onClick={() => {
              setAbaAtiva(id);
              setArquivos([]);
              setErro("");
              setMensagemSucesso("");
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-xs font-semibold border transition-all text-center",
              abaAtiva === id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground"
            )}
          >
            <Icone size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>

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

      {/* DIVIDIR */}
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
              placeholder="Deixe em branco para converter cada página em arquivo separado"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary"
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
