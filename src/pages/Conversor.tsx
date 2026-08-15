import { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import TurndownService from "turndown";
import { PDFDocument } from "pdf-lib";
import {
  RefreshCw,
  FileText,
  Image as ImageIcon,
  FileType,
  Download,
  FilePlus,
  Loader2,
  Check,
  Copy,
  FolderArchive,
  Upload,
  FileCheck,
} from "lucide-react";
import { Botao, Cartao, Aviso } from "@/components/ui";
import { cn } from "@/lib/utils";
import { lerConfig } from "@/lib/settings";
import { gravar } from "@/lib/github";
import { nomeLivre, escreverMarkdown } from "@/lib/markdown";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configura o worker do PDF.js via Vite bundle local
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type AbaConversor = "pdf_para_img" | "img_para_pdf" | "img_para_img" | "texto_para_md";

interface PaginaRenderizada {
  numPagina: number;
  dataUrl: string;
  nomeArquivo: string;
}

export default function Conversor() {
  const [abaAtiva, setAbaAtiva] = useState<AbaConversor>("pdf_para_img");

  // Estados de PDF -> Imagem
  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null);
  const [paginasRenderizadas, setPaginasRenderizadas] = useState<PaginaRenderizada[]>([]);
  const [formatoSaidaPdf, setFormatoSaidaPdf] = useState<"png" | "jpeg">("png");

  // Estados de Imagem -> PDF
  const [arquivosParaPdf, setArquivosParaPdf] = useState<File[]>([]);

  // Estados de Imagem -> Imagem
  const [arquivosImagem, setArquivosImagem] = useState<File[]>([]);
  const [formatoSaidaImg, setFormatoSaidaImg] = useState<"png" | "jpeg" | "webp">("png");
  const [qualidadeImg, setQualidadeImg] = useState<number>(90);

  // Estados de Texto -> Markdown
  const [arquivoTexto, setArquivoTexto] = useState<File | null>(null);
  const [conteudoTextoInput, setConteudoTextoInput] = useState<string>("");
  const [markdownResultado, setMarkdownResultado] = useState<string>("");
  const [formatoTextoInput, setFormatoTextoInput] = useState<"txt" | "html" | "json" | "csv">("txt");
  const [salvandoNota, setSalvandoNota] = useState(false);

  // Estados de controle
  const [processando, setProcessando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. CONVERTER PDF PARA PNG/JPG
  async function converterPdfParaImagens() {
    if (!arquivoPdf) {
      setErro("Selecione um arquivo PDF para converter.");
      return;
    }
    setProcessando(true);
    setErro("");
    setMensagemSucesso("");
    setPaginasRenderizadas([]);

    try {
      const buffer = await arquivoPdf.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
        cMapPacked: true,
      });
      const pdf = await loadingTask.promise;
      const totalPaginas = pdf.numPages;

      const resultados: PaginaRenderizada[] = [];

      for (let i = 1; i <= totalPaginas; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          const mimeType = formatoSaidaPdf === "png" ? "image/png" : "image/jpeg";
          const dataUrl = canvas.toDataURL(mimeType, 0.92);
          const ext = formatoSaidaPdf === "png" ? "png" : "jpg";
          const baseName = arquivoPdf.name.replace(/\.pdf$/i, "");

          resultados.push({
            numPagina: i,
            dataUrl,
            nomeArquivo: `${baseName}_Pagina_${i}.${ext}`,
          });
        }
      }

      setPaginasRenderizadas(resultados);
      setMensagemSucesso(`Todas as ${totalPaginas} páginas foram convertidas em imagem com sucesso!`);
    } catch (err: any) {
      setErro(`Erro ao processar o PDF: ${err?.message || String(err)}`);
    } finally {
      setProcessando(false);
    }
  }

  function baixarZipImagensPdf() {
    if (paginasRenderizadas.length === 0) return;
    setProcessando(true);
    const zip = new JSZip();
    const pasta = zip.folder("paginas_pdf");

    for (const item of paginasRenderizadas) {
      const base64Data = item.dataUrl.split(",")[1];
      pasta?.file(item.nomeArquivo, base64Data, { base64: true });
    }

    zip.generateAsync({ type: "blob" }).then((content) => {
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Paginas_${arquivoPdf?.name.replace(/\.pdf$/i, "") || "PDF"}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setProcessando(false);
    });
  }

  // 2. CONVERTER IMAGENS PARA PDF
  async function converterImagensParaPdf() {
    if (arquivosParaPdf.length === 0) {
      setErro("Selecione pelo menos 1 imagem para converter em PDF.");
      return;
    }
    setProcessando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const pdfDoc = await PDFDocument.create();

      for (const imgFile of arquivosParaPdf) {
        const bytes = await imgFile.arrayBuffer();
        let imagemEmbed;
        const tipo = imgFile.type.toLowerCase();

        if (tipo.includes("png")) {
          imagemEmbed = await pdfDoc.embedPng(bytes);
        } else if (tipo.includes("jpeg") || tipo.includes("jpg")) {
          imagemEmbed = await pdfDoc.embedJpg(bytes);
        } else {
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
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Imagens_Convertidas.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMensagemSucesso("Imagens convertidas em PDF com sucesso!");
    } catch {
      setErro("Erro ao converter imagens para PDF.");
    } finally {
      setProcessando(false);
    }
  }

  // 3. CONVERTER IMAGEM (WEBP, PNG, JPG → PNG, JPG, WEBP)
  async function converterImagens() {
    if (arquivosImagem.length === 0) {
      setErro("Selecione pelo menos 1 imagem para converter.");
      return;
    }
    setProcessando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const zip = new JSZip();
      const mimeType =
        formatoSaidaImg === "png"
          ? "image/png"
          : formatoSaidaImg === "webp"
          ? "image/webp"
          : "image/jpeg";

      for (const file of arquivosImagem) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((res) => (img.onload = res));

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);

        const dataUrl = canvas.toDataURL(mimeType, qualidadeImg / 100);
        const base64Data = dataUrl.split(",")[1];
        const nomePuro = file.name.replace(/\.[^/.]+$/, "");
        const novoNome = `${nomePuro}_convertido.${formatoSaidaImg}`;

        if (arquivosImagem.length === 1) {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = novoNome;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          zip.file(novoNome, base64Data, { base64: true });
        }
        URL.revokeObjectURL(img.src);
      }

      if (arquivosImagem.length > 1) {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Imagens_Convertidas_${formatoSaidaImg.toUpperCase()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setMensagemSucesso(`${arquivosImagem.length} imagem(ns) convertida(s) para ${formatoSaidaImg.toUpperCase()} com sucesso!`);
    } catch {
      setErro("Erro ao converter imagens.");
    } finally {
      setProcessando(false);
    }
  }

  // 4. CONVERTER TEXTO PARA MARKDOWN
  function converterTextoParaMarkdown() {
    if (!conteudoTextoInput.trim()) {
      setErro("Digite ou envie um texto/código para converter.");
      return;
    }
    setErro("");
    setMensagemSucesso("");

    try {
      if (formatoTextoInput === "html") {
        const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
        const md = turndown.turndown(conteudoTextoInput);
        setMarkdownResultado(md);
      } else if (formatoTextoInput === "json") {
        const parsed = JSON.parse(conteudoTextoInput);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
          const chaves = Object.keys(parsed[0]);
          let tabela = `| ${chaves.join(" | ")} |\n`;
          tabela += `| ${chaves.map(() => "---").join(" | ")} |\n`;
          parsed.forEach((item) => {
            tabela += `| ${chaves.map((k) => item[k] ?? "").join(" | ")} |\n`;
          });
          setMarkdownResultado(tabela);
        } else {
          setMarkdownResultado("```json\n" + JSON.stringify(parsed, null, 2) + "\n```");
        }
      } else if (formatoTextoInput === "csv") {
        const linhas = conteudoTextoInput.trim().split("\n");
        if (linhas.length > 0) {
          const cabecalho = linhas[0].split(",").map((s) => s.trim());
          let tabela = `| ${cabecalho.join(" | ")} |\n`;
          tabela += `| ${cabecalho.map(() => "---").join(" | ")} |\n`;
          for (let i = 1; i < linhas.length; i++) {
            const vals = linhas[i].split(",").map((s) => s.trim());
            tabela += `| ${vals.join(" | ")} |\n`;
          }
          setMarkdownResultado(tabela);
        }
      } else {
        setMarkdownResultado(conteudoTextoInput);
      }
      setMensagemSucesso("Texto convertido para Markdown com sucesso!");
    } catch {
      setErro("Não foi possível converter a entrada. Verifique a formatação.");
    }
  }

  async function salvarComoNotaDoApp() {
    if (!markdownResultado.trim()) return;
    setSalvandoNota(true);
    setErro("");

    try {
      const cfg = lerConfig();
      const titulo = arquivoTexto ? arquivoTexto.name.replace(/\.[^/.]+$/, "") : "Nota Convertida";
      const caminho = nomeLivre("notas", titulo, []);
      const doc = {
        dados: { titulo, criado_em: new Date().toISOString() },
        corpo: markdownResultado,
      };
      const textoMd = escreverMarkdown(doc);
      await gravar(cfg, caminho, textoMd, undefined, `Nota criada via Conversor`);
      setMensagemSucesso(`Salvo como nota "${titulo}" no seu repositório com sucesso!`);
    } catch {
      setErro("Erro ao salvar como nota no repositório.");
    } finally {
      setSalvandoNota(false);
    }
  }

  function aoSelecionarArquivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErro("");
    setMensagemSucesso("");

    if (abaAtiva === "pdf_para_img") {
      setArquivoPdf(files[0]);
      setPaginasRenderizadas([]);
    } else if (abaAtiva === "img_para_pdf") {
      setArquivosParaPdf(Array.from(files));
    } else if (abaAtiva === "img_para_img") {
      setArquivosImagem(Array.from(files));
    } else if (abaAtiva === "texto_para_md") {
      const f = files[0];
      setArquivoTexto(f);
      const reader = new FileReader();
      reader.onload = (e) => {
        const texto = e.target?.result as string;
        setConteudoTextoInput(texto || "");
        if (f.name.endsWith(".html") || f.name.endsWith(".htm")) setFormatoTextoInput("html");
        else if (f.name.endsWith(".json")) setFormatoTextoInput("json");
        else if (f.name.endsWith(".csv")) setFormatoTextoInput("csv");
        else setFormatoTextoInput("txt");
      };
      reader.readAsText(f);
    }
  }

  const modulosConversor: { id: AbaConversor; label: string; Icone: any }[] = [
    { id: "pdf_para_img", label: "PDF → PNG / JPG", Icone: FileText },
    { id: "img_para_pdf", label: "Imagens → PDF", Icone: FilePlus },
    { id: "img_para_img", label: "WEBP / PNG / JPG → Outros", Icone: ImageIcon },
    { id: "texto_para_md", label: "TXT / HTML / JSON → Markdown", Icone: FileType },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Cabeçalho Limpo */}
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <RefreshCw size={20} />
          </div>
          Conversor
        </h1>
      </div>

      {/* Navegação por Abas das Conversões Separadas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {modulosConversor.map(({ id, label, Icone }) => (
          <button
            key={id}
            onClick={() => {
              setAbaAtiva(id);
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

      {/* CONVERSÃO 1: PDF PARA PNG/JPG */}
      {abaAtiva === "pdf_para_img" && (
        <div className="space-y-6">
          <Cartao className="p-6 border-dashed border-2 border-border/80 hover:border-primary/50 transition-colors text-center cursor-pointer bg-card/40">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => aoSelecionarArquivos(e.target.files)}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2.5 py-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FilePlus size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {arquivoPdf ? `Arquivo selecionado: ${arquivoPdf.name}` : "Clique ou arraste um arquivo PDF aqui"}
                </p>
              </div>
              <Botao variante="neutro" tamanho="pequeno" className="mt-2">
                {arquivoPdf ? "Trocar PDF" : "Selecionar PDF"}
              </Botao>
            </div>
          </Cartao>

          {arquivoPdf && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/60">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground">Formato de Saída:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFormatoSaidaPdf("png")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                      formatoSaidaPdf === "png"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    PNG
                  </button>
                  <button
                    onClick={() => setFormatoSaidaPdf("jpeg")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                      formatoSaidaPdf === "jpeg"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    JPG
                  </button>
                </div>
              </div>

              <Botao
                variante="primario"
                disabled={processando}
                onClick={converterPdfParaImagens}
                className="w-full sm:w-auto flex items-center gap-2"
              >
                {processando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                <span>Converter Páginas em Imagem</span>
              </Botao>
            </div>
          )}

          {paginasRenderizadas.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Páginas Convertidas ({paginasRenderizadas.length})
                </h3>
                <Botao variante="neutro" tamanho="pequeno" onClick={baixarZipImagensPdf} className="flex items-center gap-1.5">
                  <FolderArchive size={15} />
                  <span>Baixar Todas (.ZIP)</span>
                </Botao>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {paginasRenderizadas.map((p) => (
                  <div key={p.numPagina} className="flex flex-col items-center p-2.5 rounded-xl border border-border bg-card space-y-2 group">
                    <img
                      src={p.dataUrl}
                      alt={`Página ${p.numPagina}`}
                      className="w-full h-44 object-contain rounded-lg bg-secondary/50"
                    />
                    <div className="flex items-center justify-between w-full px-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">Pág. {p.numPagina}</span>
                      <a
                        href={p.dataUrl}
                        download={p.nomeArquivo}
                        className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONVERSÃO 2: IMAGENS PARA PDF */}
      {abaAtiva === "img_para_pdf" && (
        <div className="space-y-6">
          <Cartao className="p-6 border-dashed border-2 border-border/80 hover:border-primary/50 transition-colors text-center cursor-pointer bg-card/40">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => aoSelecionarArquivos(e.target.files)}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2.5 py-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ImageIcon size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {arquivosParaPdf.length > 0
                    ? `${arquivosParaPdf.length} imagem(ns) selecionada(s)`
                    : "Clique ou arraste imagens (PNG, JPG, WEBP)"}
                </p>
              </div>
              <Botao variante="neutro" tamanho="pequeno" className="mt-2">
                Selecionar Imagens
              </Botao>
            </div>
          </Cartao>

          {arquivosParaPdf.length > 0 && (
            <div className="flex justify-end pt-2">
              <Botao
                variante="primario"
                disabled={processando}
                onClick={converterImagensParaPdf}
                className="w-full sm:w-auto flex items-center gap-2"
              >
                {processando ? <Loader2 size={16} className="animate-spin" /> : <FilePlus size={16} />}
                <span>Converter {arquivosParaPdf.length} Imagens em PDF</span>
              </Botao>
            </div>
          )}
        </div>
      )}

      {/* CONVERSÃO 3: FORMATOS DE IMAGEM */}
      {abaAtiva === "img_para_img" && (
        <div className="space-y-6">
          <Cartao className="p-6 border-dashed border-2 border-border/80 hover:border-primary/50 transition-colors text-center cursor-pointer bg-card/40">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => aoSelecionarArquivos(e.target.files)}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2.5 py-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ImageIcon size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {arquivosImagem.length > 0
                    ? `${arquivosImagem.length} imagem(ns) selecionada(s)`
                    : "Clique ou arraste imagens (WEBP, PNG, JPG, GIF, SVG, BMP)"}
                </p>
              </div>
              <Botao variante="neutro" tamanho="pequeno" className="mt-2">
                Selecionar Imagens
              </Botao>
            </div>
          </Cartao>

          {arquivosImagem.length > 0 && (
            <div className="space-y-4 p-4 rounded-xl border border-border bg-card/60">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">Formato Desejado:</span>
                  <div className="flex items-center gap-2">
                    {(["png", "jpeg", "webp"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setFormatoSaidaImg(fmt)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-colors",
                          formatoSaidaImg === fmt
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {fmt === "jpeg" ? "JPG" : fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-xs font-semibold text-muted-foreground">Qualidade:</span>
                  <input
                    type="range"
                    min={30}
                    max={100}
                    value={qualidadeImg}
                    onChange={(e) => setQualidadeImg(Number(e.target.value))}
                    className="w-24 accent-primary"
                  />
                  <span className="text-xs font-bold text-foreground w-8">{qualidadeImg}%</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border/40">
                <Botao
                  variante="primario"
                  disabled={processando}
                  onClick={converterImagens}
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  {processando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  <span>Converter {arquivosImagem.length} Imagem(ns)</span>
                </Botao>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONVERSÃO 4: TEXTO PARA MARKDOWN */}
      {abaAtiva === "texto_para_md" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card/60">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Formato de Origem:</span>
              <div className="flex items-center gap-2">
                {[
                  { id: "txt", label: "Texto (.txt)" },
                  { id: "html", label: "HTML (.html)" },
                  { id: "json", label: "JSON (.json)" },
                  { id: "csv", label: "CSV (.csv)" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setFormatoTextoInput(id as any)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                      formatoTextoInput === id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="cursor-pointer text-xs font-semibold text-primary hover:underline flex items-center gap-1.5">
              <Upload size={14} />
              <span>Subir Arquivo</span>
              <input
                type="file"
                accept=".txt,.html,.htm,.json,.csv"
                onChange={(e) => aoSelecionarArquivos(e.target.files)}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Conteúdo Original ({formatoTextoInput.toUpperCase()})
              </label>
              <textarea
                value={conteudoTextoInput}
                onChange={(e) => setConteudoTextoInput(e.target.value)}
                placeholder={`Cole seu texto ou código ${formatoTextoInput.toUpperCase()} aqui...`}
                rows={12}
                className="w-full rounded-xl border border-border bg-background p-3.5 text-xs text-foreground outline-none resize-y font-mono"
              />
              <Botao
                variante="primario"
                onClick={converterTextoParaMarkdown}
                className="w-full flex items-center justify-center gap-2"
              >
                <RefreshCw size={15} />
                <span>Converter para Markdown</span>
              </Botao>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Resultado em Markdown (.md)
                </label>
                {markdownResultado && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(markdownResultado);
                      setCopiado(true);
                      setTimeout(() => setCopiado(false), 2000);
                    }}
                    className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                  >
                    {copiado ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiado ? "Copiado!" : "Copiar"}</span>
                  </button>
                )}
              </div>
              <textarea
                readOnly
                value={markdownResultado}
                rows={12}
                placeholder="O resultado formatado em Markdown aparecerá aqui..."
                className="w-full rounded-xl border border-border bg-background/60 p-3.5 text-xs text-foreground outline-none resize-y font-mono"
              />
              {markdownResultado && (
                <Botao
                  variante="neutro"
                  disabled={salvandoNota}
                  onClick={salvarComoNotaDoApp}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {salvandoNota ? <Loader2 size={15} className="animate-spin" /> : <FileCheck size={15} />}
                  <span>Salvar como Nota no App</span>
                </Botao>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
