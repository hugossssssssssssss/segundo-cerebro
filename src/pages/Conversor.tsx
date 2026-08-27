import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import TurndownService from "turndown";
import { PDFDocument } from "pdf-lib";
import jEpub from "jepub";
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
  FileImage,
  BookOpen,
  Trash2,
} from "lucide-react";
import { Botao, Cartao, Aviso } from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { cn } from "@/lib/utils";
import { lerConfig } from "@/lib/settings";
import { nomeLivre, escreverMarkdown } from "@/lib/markdown";
import { carregarRepo } from "@/lib/repo";
import { useSalvar } from "@/lib/useSalvar";
import { useFerramentasFlutuantes } from "@/components/ContextoFerramentasFlutuantes";
import {
  adicionarAoHistorico,
  listarHistorico,
  limparExcedentesETtl,
  deletarHistorico,
} from "@/lib/historicoConversor";
import type { ItemHistorico } from "@/lib/historicoConversor";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

declare global {
  interface Window {
    JSZip?: typeof JSZip;
  }
}

if (typeof window !== "undefined") {
  window.JSZip = JSZip;
}

// Configura o worker do PDF.js via Vite bundle local
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export type TipoFerramentaConversor =
  | "pdf_para_png"
  | "pdf_para_jpg"
  | "pdf_para_epub"
  | "epub_trocar_capa"
  | "img_para_pdf"
  | "img_para_webp"
  | "img_para_png"
  | "img_para_jpg"
  | "texto_para_md";

interface PaginaRenderizada {
  numPagina: number;
  dataUrl: string;
  nomeArquivo: string;
  blob?: Blob;
}

interface ItemFerramentaUI {
  id: TipoFerramentaConversor;
  titulo: string;
  descricao: string;
  icone: any;
  cor: string;
}

const FERRAMENTAS_CONVERSOR: ItemFerramentaUI[] = [
  {
    id: "pdf_para_png",
    titulo: "PDF para PNG",
    descricao: "Extraia cada página do PDF como imagem PNG transparente/HD",
    icone: FileImage,
    cor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    id: "pdf_para_jpg",
    titulo: "PDF para JPG",
    descricao: "Converte páginas de PDF em arquivos de imagem JPG compactos",
    icone: FileImage,
    cor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    id: "pdf_para_epub",
    titulo: "PDF para EPUB",
    descricao: "Extraia o texto de documentos PDF e monte um arquivo EPUB fluido",
    icone: BookOpen,
    cor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "epub_trocar_capa",
    titulo: "Trocar Capa de EPUB",
    descricao: "Substitua a imagem de capa de um livro digital EPUB existente",
    icone: FileImage,
    cor: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    id: "img_para_pdf",
    titulo: "Imagens para PDF",
    descricao: "Junte uma ou mais imagens (PNG, JPG, WebP) em um único PDF",
    icone: FileText,
    cor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    id: "img_para_webp",
    titulo: "Converter para WebP",
    descricao: "Otimize suas imagens com alta compactação mantendo a qualidade",
    icone: ImageIcon,
    cor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "img_para_png",
    titulo: "Converter para PNG",
    descricao: "Transforme imagens JPG/WebP para formato PNG com transparência",
    icone: ImageIcon,
    cor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "img_para_jpg",
    titulo: "Converter para JPG",
    descricao: "Transforme PNGs ou WebPs em formato JPG leve e rápido",
    icone: ImageIcon,
    cor: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    id: "texto_para_md",
    titulo: "Texto para Markdown",
    descricao: "Converte arquivos TXT, HTML, JSON ou CSV em nota Markdown limpa",
    icone: FileType,
    cor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
];

export default function Conversor() {
  const cfg = lerConfig();
  const { salvarTexto } = useSalvar(cfg);
  const [searchParams, setSearchParams] = useSearchParams();
  const ferramentaParam = searchParams.get("ferramenta") as TipoFerramentaConversor | null;

  const { ferramentaAtiva: ferramentaContexto } = useFerramentasFlutuantes();

  const [ferramentaAtiva, setFerramentaAtiva] = useState<TipoFerramentaConversor>(
    ferramentaContexto && FERRAMENTAS_CONVERSOR.some((f) => f.id === ferramentaContexto)
      ? (ferramentaContexto as TipoFerramentaConversor)
      : ferramentaParam && FERRAMENTAS_CONVERSOR.some((f) => f.id === ferramentaParam)
      ? ferramentaParam
      : "pdf_para_png"
  );

  // Sincroniza estado se o parâmetro de URL ou o contexto flutuante mudar
  useEffect(() => {
    if (ferramentaContexto && FERRAMENTAS_CONVERSOR.some((f) => f.id === ferramentaContexto)) {
      setFerramentaAtiva(ferramentaContexto as TipoFerramentaConversor);
    } else if (ferramentaParam && FERRAMENTAS_CONVERSOR.some((f) => f.id === ferramentaParam)) {
      setFerramentaAtiva(ferramentaParam);
    }
  }, [ferramentaParam, ferramentaContexto]);

  const selecionarFerramenta = (id: TipoFerramentaConversor) => {
    setFerramentaAtiva(id);
    setSearchParams({ ferramenta: id });
    setErro("");
    setMensagemSucesso("");
  };

  // Estados de PDF -> Imagem
  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null);
  const [paginasRenderizadas, setPaginasRenderizadas] = useState<PaginaRenderizada[]>([]);

  useEffect(() => {
    return () => {
      paginasRenderizadas.forEach((p) => {
        if (p.dataUrl.startsWith("blob:")) {
          URL.revokeObjectURL(p.dataUrl);
        }
      });
    };
  }, [paginasRenderizadas]);
  const [formatoSaidaPdf, setFormatoSaidaPdf] = useState<"png" | "jpeg">("png");

  // Ajusta formato padrão quando muda entre pdf_para_png e pdf_para_jpg
  useEffect(() => {
    if (ferramentaAtiva === "pdf_para_png") setFormatoSaidaPdf("png");
    if (ferramentaAtiva === "pdf_para_jpg") setFormatoSaidaPdf("jpeg");
  }, [ferramentaAtiva]);

  // Estados de PDF -> EPUB
  const [pdfEpubArquivo, setPdfEpubArquivo] = useState<File | null>(null);
  const [pdfEpubTitulo, setPdfEpubTitulo] = useState("");
  const [pdfEpubAutor, setPdfEpubAutor] = useState("");

  // Estados de Trocar Capa de EPUB
  const [epubArquivo, setEpubArquivo] = useState<File | null>(null);
  const [novaCapaArquivo, setNovaCapaArquivo] = useState<File | null>(null);

  // Estados de Imagem -> PDF
  const [arquivosParaPdf, setArquivosParaPdf] = useState<File[]>([]);

  // Estados de Imagem -> Imagem
  const [arquivosImagem, setArquivosImagem] = useState<File[]>([]);
  const [formatoSaidaImg, setFormatoSaidaImg] = useState<"png" | "jpeg" | "webp">("png");
  const [qualidadeImg, setQualidadeImg] = useState<number>(90);

  // Histórico
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);

  // Sincroniza a limpeza e recarregamento do histórico
  useEffect(() => {
    limparExcedentesETtl().then(() => {
      recarregarHistorico();
    });
  }, [ferramentaAtiva]);

  const recarregarHistorico = async () => {
    const lista = await listarHistorico();
    setHistorico(lista);
  };

  const baixarArquivoDoHistorico = (item: ItemHistorico) => {
    const url = URL.createObjectURL(item.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const aoLimparHistorico = async () => {
    await deletarHistorico();
    await recarregarHistorico();
  };

  // Ajusta formato padrão quando muda entre img_para_webp, img_para_png e img_para_jpg
  useEffect(() => {
    if (ferramentaAtiva === "img_para_webp") setFormatoSaidaImg("webp");
    if (ferramentaAtiva === "img_para_png") setFormatoSaidaImg("png");
    if (ferramentaAtiva === "img_para_jpg") setFormatoSaidaImg("jpeg");
  }, [ferramentaAtiva]);

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

      if (totalPaginas > 30) {
        throw new Error(
          `Este documento possui ${totalPaginas} páginas. Para evitar travamentos e proteger a memória do seu dispositivo, o limite para conversão é de até 30 páginas.`
        );
      }

      const resultados: PaginaRenderizada[] = [];

      for (let i = 1; i <= totalPaginas; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          const mimeType = formatoSaidaPdf === "png" ? "image/png" : "image/jpeg";
          const ext = formatoSaidaPdf === "png" ? "png" : "jpg";
          
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, mimeType, 0.92)
          );
          
          if (blob) {
            const dataUrl = URL.createObjectURL(blob);
            const nomeBase = arquivoPdf.name.replace(/\.pdf$/i, "");
            resultados.push({
              numPagina: i,
              dataUrl,
              nomeArquivo: `${nomeBase}-pagina-${i}.${ext}`,
              blob,
            });
          }
        }
      }

      setPaginasRenderizadas(resultados);
      setMensagemSucesso(`PDF convertido com sucesso! ${totalPaginas} página(s) processada(s).`);
    } catch (err: any) {
      setErro(`Erro ao processar o PDF: ${err.message || "Arquivo inválido ou corrompido"}`);
    } finally {
      setProcessando(false);
    }
  }

  // Baixar todas as imagens geradas em um pacote .ZIP
  async function baixarZipImagensPdf() {
    if (paginasRenderizadas.length === 0) return;
    const zip = new JSZip();
    paginasRenderizadas.forEach((p) => {
      if (p.blob) {
        zip.file(p.nomeArquivo, p.blob);
      } else {
        const base64Data = p.dataUrl.split(",")[1];
        zip.file(p.nomeArquivo, base64Data, { base64: true });
      }
    });
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${arquivoPdf?.name.replace(/\.pdf$/i, "")}-paginas.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // CONVERTER PDF PARA EPUB
  async function converterPdfParaEpub() {
    if (!pdfEpubArquivo) {
      setErro("Selecione um arquivo PDF para converter.");
      return;
    }
    setProcessando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const buffer = await pdfEpubArquivo.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
        cMapPacked: true,
      });
      const pdf = await loadingTask.promise;
      const totalPaginas = pdf.numPages;

      const titulo = pdfEpubTitulo.trim() || pdfEpubArquivo.name.replace(/\.pdf$/i, "");
      const autor = pdfEpubAutor.trim() || "Autor Desconhecido";

      const jepubObj = new jEpub();
      jepubObj.init({
        title: titulo,
        author: autor,
        publisher: "Klaus",
        description: `Livro gerado a partir do arquivo PDF: ${pdfEpubArquivo.name}`,
        tags: ["pdf", "epub", "klaus"],
      });

      let paginasValidas = 0;

      for (let i = 1; i <= totalPaginas; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let textoPagina = "";
        let ultimaY = -1;

        for (const item of textContent.items) {
          if ("str" in item) {
            const y = item.transform[5];
            if (ultimaY !== -1 && Math.abs(y - ultimaY) > 6) {
              textoPagina += "\n";
            }
            textoPagina += item.str + " ";
            ultimaY = y;
          }
        }

        const textoLimpo = textoPagina.trim();
        if (textoLimpo.length > 0) {
          const paragrafos = textoLimpo
            .split("\n")
            .map((linha) => linha.trim())
            .filter((linha) => linha.length > 0)
            .map((linha) => `<p>${escaparHtml(linha)}</p>`)
            .join("");

          jepubObj.add(`Página ${i}`, `<h2>Página ${i}</h2>\n${paragrafos}`);
          paginasValidas++;
        }
      }

      if (paginasValidas === 0) {
        throw new Error("Nenhum texto legível pôde ser extraído do PDF.");
      }

      const epubBlob = (await jepubObj.generate("blob")) as Blob;
      const nomeFinal = `${titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.epub`;
      
      const url = URL.createObjectURL(epubBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeFinal;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await adicionarAoHistorico(nomeFinal, "PDF para EPUB", epubBlob);
      await recarregarHistorico();

      setMensagemSucesso(`EPUB "${titulo}" gerado com sucesso! ${paginasValidas} página(s) convertida(s).`);
    } catch (err: any) {
      setErro(`Erro ao converter PDF para EPUB: ${err.message || "Arquivo inválido ou corrompido"}`);
    } finally {
      setProcessando(false);
    }
  }

  function escaparHtml(texto: string) {
    return texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // TROCAR CAPA DE EPUB
  async function trocarCapaEpub() {
    if (!epubArquivo) {
      setErro("Selecione um arquivo EPUB de origem.");
      return;
    }
    if (!novaCapaArquivo) {
      setErro("Selecione uma nova imagem de capa.");
      return;
    }
    setProcessando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const zip = await JSZip.loadAsync(epubArquivo);
      
      const containerXml = await zip.file("META-INF/container.xml")?.async("string");
      if (!containerXml) {
        throw new Error("Arquivo container.xml não encontrado no EPUB. O arquivo pode estar corrompido.");
      }

      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, "text/xml");
      const rootfile = containerDoc.querySelector("rootfile");
      const opfPath = rootfile?.getAttribute("full-path");
      
      if (!opfPath) {
        throw new Error("Caminho do manifesto content.opf não encontrado no container.");
      }

      const opfTexto = await zip.file(opfPath)?.async("string");
      if (!opfTexto) {
        throw new Error(`Manifesto OPF não encontrado no caminho indicado: ${opfPath}`);
      }

      const opfDoc = parser.parseFromString(opfTexto, "text/xml");

      let itemCapa = opfDoc.querySelector("item[properties~='cover-image']");
      
      if (!itemCapa) {
        const metaCover = opfDoc.querySelector("meta[name='cover']");
        const coverId = metaCover?.getAttribute("content");
        if (coverId) {
          itemCapa = opfDoc.querySelector(`item[id='${coverId}']`);
        }
      }

      if (!itemCapa) {
        const itensManifesto = Array.from(opfDoc.querySelectorAll("item"));
        itemCapa = itensManifesto.find((item) => {
          const id = item.getAttribute("id") || "";
          const href = item.getAttribute("href") || "";
          const type = item.getAttribute("media-type") || "";
          return (
            type.startsWith("image/") &&
            (id.toLowerCase().includes("cover") || href.toLowerCase().includes("cover"))
          );
        }) || null;
      }

      let nomeArquivoSaida = epubArquivo.name;
      if (!nomeArquivoSaida.endsWith("-nova-capa.epub")) {
        nomeArquivoSaida = nomeArquivoSaida.replace(/\.epub$/i, "") + "-nova-capa.epub";
      }

      if (itemCapa) {
        const hrefOriginal = itemCapa.getAttribute("href");
        const mimeOriginal = itemCapa.getAttribute("media-type") || "image/jpeg";
        if (!hrefOriginal) {
          throw new Error("Referência de href da capa original está inválida no manifesto.");
        }

        const caminhoCapaNoZip = resolverCaminhoRelativo(opfPath, hrefOriginal);
        const blobNovaCapa = await converterImagemParaFormato(novaCapaArquivo, mimeOriginal);

        zip.file(caminhoCapaNoZip, blobNovaCapa);
      } else {
        const blobNovaCapa = await converterImagemParaFormato(novaCapaArquivo, "image/jpeg");
        const pastaOpf = opfPath.substring(0, opfPath.lastIndexOf("/")) || "";
        const caminhoCapaNoZip = pastaOpf ? `${pastaOpf}/cover.jpg` : "cover.jpg";
        
        zip.file(caminhoCapaNoZip, blobNovaCapa);

        const manifest = opfDoc.querySelector("manifest");
        const metadata = opfDoc.querySelector("metadata");

        if (manifest) {
          const novoItem = opfDoc.createElement("item");
          novoItem.setAttribute("id", "klaus-cover");
          novoItem.setAttribute("href", "cover.jpg");
          novoItem.setAttribute("media-type", "image/jpeg");
          novoItem.setAttribute("properties", "cover-image");
          manifest.appendChild(novoItem);
        }

        if (metadata) {
          const novaMeta = opfDoc.createElement("meta");
          novaMeta.setAttribute("name", "cover");
          novaMeta.setAttribute("content", "klaus-cover");
          metadata.appendChild(novaMeta);
        }

        const opfTextoAtualizado = new XMLSerializer().serializeToString(opfDoc);
        zip.file(opfPath, opfTextoAtualizado);
      }

      const epubBlob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });

      const url = URL.createObjectURL(epubBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivoSaida;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await adicionarAoHistorico(nomeArquivoSaida, "Trocar Capa de EPUB", epubBlob);
      await recarregarHistorico();

      setMensagemSucesso(`Capa do EPUB trocada com sucesso! Novo arquivo baixado.`);
    } catch (err: any) {
      setErro(`Erro ao trocar a capa do EPUB: ${err.message || "Arquivo inválido ou malformado"}`);
    } finally {
      setProcessando(false);
    }
  }

  function resolverCaminhoRelativo(base: string, relativo: string): string {
    const partesBase = base.split("/");
    partesBase.pop();
    
    const partesRelativo = relativo.split("/");
    for (const parte of partesRelativo) {
      if (parte === "..") {
        partesBase.pop();
      } else if (parte !== ".") {
        partesBase.push(parte);
      }
    }
    return partesBase.join("/");
  }

  function converterImagemParaFormato(arquivo: File, mimeAlvo: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!arquivo.type.startsWith("image/")) {
        reject(new Error("O arquivo enviado para a capa não é uma imagem válida."));
        return;
      }

      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Falha ao criar o Canvas de conversão."));
          return;
        }

        if (mimeAlvo === "image/jpeg" || mimeAlvo === "image/jpg") {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);
        
        const mimeFinal = (mimeAlvo === "image/jpg") ? "image/jpeg" : mimeAlvo;

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Falha ao gerar o Blob da imagem de capa."));
            }
          },
          mimeFinal,
          0.92
        );
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Erro ao ler a imagem. Arquivo pode estar corrompido ou ter formato inválido."));
      };
      img.src = url;
    });
  }

  // 2. CONVERTER IMAGENS PARA PDF
  async function converterImagensParaPdf() {
    if (arquivosParaPdf.length === 0) {
      setErro("Selecione pelo menos uma imagem para gerar o PDF.");
      return;
    }
    setProcessando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const pdfDoc = await PDFDocument.create();

      for (const file of arquivosParaPdf) {
        const arrayBuffer = await file.arrayBuffer();
        let image;
        if (file.type === "image/png" || file.name.endsWith(".png")) {
          image = await pdfDoc.embedPng(arrayBuffer);
        } else if (file.type === "image/jpeg" || file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")) {
          image = await pdfDoc.embedJpg(arrayBuffer);
        } else {
          // Converte outros formatos (WebP, GIF) para Canvas PNG primeiro
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
              };
              img.onerror = reject;
              img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          image = await pdfDoc.embedPng(dataUrl);
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "imagens-compiladas.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMensagemSucesso(`PDF com ${arquivosParaPdf.length} imagem(ns) gerado com sucesso!`);
    } catch (err: any) {
      setErro(`Erro ao compilar imagens para PDF: ${err.message || "Erro desconhecido"}`);
    } finally {
      setProcessando(false);
    }
  }

  // 3. CONVERTER FORMATOS DE IMAGEM (WEBP, PNG, JPG)
  async function converterFormatoImagens() {
    if (arquivosImagem.length === 0) {
      setErro("Selecione imagens para converter.");
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
      const ext = formatoSaidaImg === "jpeg" ? "jpg" : formatoSaidaImg;

      for (const file of arquivosImagem) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                if (formatoSaidaImg === "jpeg") {
                  ctx.fillStyle = "#FFFFFF";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0);
              }
              resolve(canvas.toDataURL(mimeType, qualidadeImg / 100));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64Data = dataUrl.split(",")[1];
        const nomeBase = file.name.replace(/\.[^/.]+$/, "");
        zip.file(`${nomeBase}.${ext}`, base64Data, { base64: true });
      }

      if (arquivosImagem.length === 1) {
        const file = arquivosImagem[0];
        const nomeBase = file.name.replace(/\.[^/.]+$/, "");
        const zipFile = zip.file(`${nomeBase}.${ext}`);
        if (zipFile) {
          const blob = await zipFile.async("blob");
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${nomeBase}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `imagens-convertidas-${ext}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setMensagemSucesso(`${arquivosImagem.length} imagem(ns) convertida(s) para .${ext} com sucesso!`);
    } catch (err: any) {
      setErro(`Erro ao converter imagens: ${err.message || "Falha na conversão"}`);
    } finally {
      setProcessando(false);
    }
  }

  // 4. CONVERTER TEXTO PARA MARKDOWN
  function converterTextoParaMarkdown() {
    if (!conteudoTextoInput.trim()) {
      setErro("Digite ou envie um arquivo de texto para converter.");
      return;
    }
    setErro("");
    setMensagemSucesso("");

    try {
      let resultado = "";

      if (formatoTextoInput === "html") {
        const turndownService = new TurndownService({
          headingStyle: "atx",
          codeBlockStyle: "fenced",
        });
        resultado = turndownService.turndown(conteudoTextoInput);
      } else if (formatoTextoInput === "json") {
        try {
          const obj = JSON.parse(conteudoTextoInput);
          resultado = "```json\n" + JSON.stringify(obj, null, 2) + "\n```";
        } catch {
          resultado = "```text\n" + conteudoTextoInput + "\n```";
        }
      } else if (formatoTextoInput === "csv") {
        const linhas = conteudoTextoInput.trim().split("\n");
        if (linhas.length > 0) {
          const cabecalho = linhas[0].split(",").map((c) => c.trim());
          const separador = cabecalho.map(() => "---");
          const corpo = linhas.slice(1).map((l) =>
            l.split(",").map((c) => c.trim()).join(" | ")
          );
          resultado =
            `| ${cabecalho.join(" | ")} |\n` +
            `| ${separador.join(" | ")} |\n` +
            corpo.map((l) => `| ${l} |`).join("\n");
        } else {
          resultado = conteudoTextoInput;
        }
      } else {
        resultado = conteudoTextoInput;
      }

      setMarkdownResultado(resultado);
      setMensagemSucesso("Texto convertido para Markdown com sucesso!");
    } catch (err: any) {
      setErro(`Erro na conversão para Markdown: ${err.message || "Erro de síntese"}`);
    }
  }

  async function salvarComoNotaMarkdown() {
    if (!markdownResultado.trim()) return;
    if (!cfg.githubToken) {
      setErro("Configure seu token do GitHub em Ajustes para salvar notas.");
      return;
    }

    setSalvandoNota(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const tituloProvavel = arquivoTexto
        ? arquivoTexto.name.replace(/\.[^/.]+$/, "")
        : "Nota Convertida";
      const acervo = await carregarRepo(cfg);
      const caminho = nomeLivre("notas", tituloProvavel, acervo.map((i) => i.caminho));
      const mdFormatado = escreverMarkdown({
        dados: { titulo: tituloProvavel, criado_em: new Date().toISOString().slice(0, 10) },
        corpo: markdownResultado,
      });

      await salvarTexto(caminho, mdFormatado, undefined, `Criar nota convertida: ${tituloProvavel}`);
      setMensagemSucesso(`Nota salva com sucesso em ${caminho}!`);
    } catch (err: any) {
      setErro(`Erro ao salvar no GitHub: ${err.message || "Falha ao gravar arquivo"}`);
    } finally {
      setSalvandoNota(false);
    }
  }

  function copiarMarkdown() {
    if (!markdownResultado) return;
    navigator.clipboard.writeText(markdownResultado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function aoSelecionarArquivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErro("");
    setMensagemSucesso("");

    if (ferramentaAtiva === "pdf_para_png" || ferramentaAtiva === "pdf_para_jpg") {
      setArquivoPdf(files[0]);
      setPaginasRenderizadas([]);
    } else if (ferramentaAtiva === "pdf_para_epub") {
      setPdfEpubArquivo(files[0]);
      setPdfEpubTitulo("");
      setPdfEpubAutor("");
    } else if (ferramentaAtiva === "img_para_pdf") {
      setArquivosParaPdf(Array.from(files));
    } else if (
      ferramentaAtiva === "img_para_webp" ||
      ferramentaAtiva === "img_para_png" ||
      ferramentaAtiva === "img_para_jpg"
    ) {
      setArquivosImagem(Array.from(files));
    } else if (ferramentaAtiva === "texto_para_md") {
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

  const ferramentaAtualInfo = FERRAMENTAS_CONVERSOR.find((f) => f.id === ferramentaAtiva)!;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Conversor de Arquivos"
        descricao="Ferramentas rápidas de conversão presencial no seu navegador, sem enviar dados para servidores externos."
        icone={<RefreshCw size={20} />}
        corIcone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
      />

      {/* Grid de Ferramentas Estilo iLovePDF */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {FERRAMENTAS_CONVERSOR.map((f) => {
          const IconeComp = f.icone;
          const ativa = ferramentaAtiva === f.id;
          return (
            <button
              key={f.id}
              onClick={() => selecionarFerramenta(f.id)}
              className={cn(
                "flex flex-col text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden group",
                ativa
                  ? "bg-card border-primary shadow-md ring-2 ring-primary/20"
                  : "bg-card/60 border-border/80 hover:border-border hover:bg-card"
              )}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", f.cor)}>
                  <IconeComp size={18} />
                </div>
                {ativa && (
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              <h3 className="font-bold text-sm text-foreground tracking-tight">{f.titulo}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {f.descricao}
              </p>
            </button>
          );
        })}
      </div>

      {/* Avisos */}
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {mensagemSucesso && <Aviso tom="sucesso">{mensagemSucesso}</Aviso>}

      {/* FERRAMENTA 1 & 2: PDF PARA PNG OU JPG */}
      {(ferramentaAtiva === "pdf_para_png" || ferramentaAtiva === "pdf_para_jpg") && (
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
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", ferramentaAtualInfo.cor)}>
                <FilePlus size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {arquivoPdf ? `Arquivo selecionado: ${arquivoPdf.name}` : "Clique ou arraste um arquivo PDF aqui"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Exportar páginas como {ferramentaAtiva === "pdf_para_png" ? "PNG HD" : "JPG Otimizado"}
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
                <span className="text-xs font-semibold text-muted-foreground">Formato Escolhido:</span>
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
                <span>Converter em {formatoSaidaPdf.toUpperCase()}</span>
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

      {/* FERRAMENTA: PDF PARA EPUB */}
      {ferramentaAtiva === "pdf_para_epub" && (
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BookOpen size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {pdfEpubArquivo ? `Arquivo selecionado: ${pdfEpubArquivo.name}` : "Clique ou arraste um arquivo PDF aqui"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  O texto do PDF será extraído para criar um livro EPUB fluido
                </p>
              </div>
              <Botao variante="neutro" tamanho="pequeno" className="mt-2">
                {pdfEpubArquivo ? "Trocar PDF" : "Selecionar PDF"}
              </Botao>
            </div>
          </Cartao>

          {pdfEpubArquivo && (
            <div className="space-y-4 p-5 rounded-2xl border border-border bg-card/60">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Metadados do Livro (Opcional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Título do Livro</label>
                  <input
                    type="text"
                    value={pdfEpubTitulo}
                    onChange={(e) => setPdfEpubTitulo(e.target.value)}
                    placeholder={pdfEpubArquivo.name.replace(/\.pdf$/i, "")}
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Autor</label>
                  <input
                    type="text"
                    value={pdfEpubAutor}
                    onChange={(e) => setPdfEpubAutor(e.target.value)}
                    placeholder="Autor Desconhecido"
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Botao
                  variante="primario"
                  disabled={processando}
                  onClick={converterPdfParaEpub}
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  {processando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  <span>Converter para EPUB</span>
                </Botao>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FERRAMENTA: TROCAR CAPA DE EPUB */}
      {ferramentaAtiva === "epub_trocar_capa" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Upload do EPUB */}
            <Cartao className="p-6 border-dashed border-2 border-border/80 hover:border-primary/50 transition-colors text-center cursor-pointer bg-card/40">
              <input
                type="file"
                accept=".epub"
                id="input-epub-arquivo"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setEpubArquivo(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <label
                htmlFor="input-epub-arquivo"
                className="flex flex-col items-center justify-center gap-2.5 py-4 cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {epubArquivo ? `Livro: ${epubArquivo.name}` : "Carregar arquivo EPUB"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Arraste ou clique para selecionar o arquivo .epub
                  </p>
                </div>
                <Botao variante="neutro" tamanho="pequeno" className="mt-2 pointer-events-none">
                  {epubArquivo ? "Trocar EPUB" : "Selecionar EPUB"}
                </Botao>
              </label>
            </Cartao>

            {/* Upload da Nova Capa */}
            <Cartao className="p-6 border-dashed border-2 border-border/80 hover:border-primary/50 transition-colors text-center cursor-pointer bg-card/40">
              <input
                type="file"
                accept="image/*"
                id="input-capa-arquivo"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setNovaCapaArquivo(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <label
                htmlFor="input-capa-arquivo"
                className="flex flex-col items-center justify-center gap-2.5 py-4 cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ImageIcon size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {novaCapaArquivo ? `Nova Capa: ${novaCapaArquivo.name}` : "Carregar Nova Capa"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Arraste ou clique para selecionar (JPG, PNG)
                  </p>
                </div>
                <Botao variante="neutro" tamanho="pequeno" className="mt-2 pointer-events-none">
                  {novaCapaArquivo ? "Trocar Imagem" : "Selecionar Imagem"}
                </Botao>
              </label>
            </Cartao>
          </div>

          {(epubArquivo || novaCapaArquivo) && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/60">
              <div className="text-xs text-muted-foreground">
                {epubArquivo && novaCapaArquivo ? (
                  <span>Pronto para substituir a capa de <strong>{epubArquivo.name}</strong></span>
                ) : (
                  <span>Selecione o arquivo EPUB e a nova imagem de capa para prosseguir.</span>
                )}
              </div>

              <Botao
                variante="primario"
                disabled={processando || !epubArquivo || !novaCapaArquivo}
                onClick={trocarCapaEpub}
                className="w-full sm:w-auto flex items-center gap-2"
              >
                {processando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                <span>Processar e Trocar Capa</span>
              </Botao>
            </div>
          )}
        </div>
      )}

      {/* FERRAMENTA 3: IMAGENS PARA PDF */}
      {ferramentaAtiva === "img_para_pdf" && (
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
                    : "Clique ou arraste imagens (PNG, JPG, WebP) aqui"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione uma ou mais imagens para juntar em um arquivo PDF
                </p>
              </div>
              <Botao variante="neutro" tamanho="pequeno" className="mt-2">
                {arquivosParaPdf.length > 0 ? "Trocar Imagens" : "Selecionar Imagens"}
              </Botao>
            </div>
          </Cartao>

          {arquivosParaPdf.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Imagens que comporão o PDF ({arquivosParaPdf.length})
                </h3>
                <Botao
                  variante="primario"
                  disabled={processando}
                  onClick={converterImagensParaPdf}
                  className="flex items-center gap-2"
                >
                  {processando ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  <span>Gerar e Baixar PDF</span>
                </Botao>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {arquivosParaPdf.map((f, i) => (
                  <div key={i} className="flex flex-col p-2 rounded-xl border border-border bg-card text-xs">
                    <span className="font-semibold text-foreground truncate">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FERRAMENTAS 4, 5, 6: CONVERTER PARA WEBP, PNG OU JPG */}
      {(ferramentaAtiva === "img_para_webp" ||
        ferramentaAtiva === "img_para_png" ||
        ferramentaAtiva === "img_para_jpg") && (
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
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", ferramentaAtualInfo.cor)}>
                <ImageIcon size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {arquivosImagem.length > 0
                    ? `${arquivosImagem.length} imagem(ns) selecionada(s)`
                    : "Clique ou arraste imagens aqui"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Converter para o formato{" "}
                  <strong className="text-foreground">
                    {ferramentaAtiva === "img_para_webp"
                      ? "WEBP"
                      : ferramentaAtiva === "img_para_png"
                      ? "PNG"
                      : "JPG"}
                  </strong>
                </p>
              </div>
              <Botao variante="neutro" tamanho="pequeno" className="mt-2">
                {arquivosImagem.length > 0 ? "Trocar Imagens" : "Selecionar Imagens"}
              </Botao>
            </div>
          </Cartao>

          {arquivosImagem.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/60">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Formato Alvo:</span>
                  <span className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-bold uppercase">
                    {formatoSaidaImg}
                  </span>
                </div>

                {formatoSaidaImg !== "png" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Qualidade:</span>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={qualidadeImg}
                      onChange={(e) => setQualidadeImg(Number(e.target.value))}
                      className="w-24 accent-primary"
                    />
                    <span className="text-xs font-medium text-foreground w-8">{qualidadeImg}%</span>
                  </div>
                )}
              </div>

              <Botao
                variante="primario"
                disabled={processando}
                onClick={converterFormatoImagens}
                className="w-full sm:w-auto flex items-center gap-2"
              >
                {processando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                <span>Converter ({arquivosImagem.length})</span>
              </Botao>
            </div>
          )}
        </div>
      )}

      {/* FERRAMENTA 7: TEXTO PARA MARKDOWN */}
      {ferramentaAtiva === "texto_para_md" && (
        <div className="space-y-6">
          <Cartao className="p-6 border-dashed border-2 border-border/80 hover:border-primary/50 transition-colors text-center cursor-pointer bg-card/40">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.html,.htm,.json,.csv"
              onChange={(e) => aoSelecionarArquivos(e.target.files)}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2.5 py-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Upload size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {arquivoTexto ? `Arquivo: ${arquivoTexto.name}` : "Carregar arquivo TXT, HTML, JSON ou CSV"}
                </p>
              </div>
              <Botao variante="neutro" tamanho="pequeno">
                {arquivoTexto ? "Trocar Arquivo" : "Escolher Arquivo"}
              </Botao>
            </div>
          </Cartao>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Conteúdo / Texto Bruto
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Formato de Origem:</span>
                {(["txt", "html", "json", "csv"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormatoTextoInput(fmt)}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-semibold uppercase transition-colors",
                      formatoTextoInput === fmt
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={conteudoTextoInput}
              onChange={(e) => setConteudoTextoInput(e.target.value)}
              placeholder="Cole aqui seu texto, código HTML, estrutura JSON ou tabela CSV..."
              rows={6}
              className="w-full rounded-xl border border-border bg-card p-3 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/30"
            />

            <div className="flex justify-end">
              <Botao variante="primario" onClick={converterTextoParaMarkdown} className="flex items-center gap-2">
                <FileType size={16} />
                <span>Converter em Markdown</span>
              </Botao>
            </div>
          </div>

          {markdownResultado && (
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Resultado em Markdown
                </h3>
                <div className="flex items-center gap-2">
                  <Botao variante="neutro" tamanho="pequeno" onClick={copiarMarkdown} className="flex items-center gap-1.5">
                    {copiado ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{copiado ? "Copiado!" : "Copiar"}</span>
                  </Botao>
                  <Botao
                    variante="primario"
                    tamanho="pequeno"
                    disabled={salvandoNota}
                    onClick={salvarComoNotaMarkdown}
                    className="flex items-center gap-1.5"
                  >
                    {salvandoNota ? <Loader2 size={14} className="animate-spin" /> : <FileCheck size={14} />}
                    <span>Salvar Nota no Klaus</span>
                  </Botao>
                </div>
              </div>

              <textarea
                readOnly
                value={markdownResultado}
                rows={8}
                className="w-full rounded-xl border border-border bg-secondary/40 p-3 text-sm font-mono focus:outline-hidden"
              />
            </div>
          )}
        </div>
      )}

      {/* HISTÓRICO RECENTE (IndexedDB) */}
      {historico.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-border mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Histórico Recente de Conversões</h3>
              <p className="text-xs text-muted-foreground">Últimos 2 arquivos processados salvos localmente. Expira em 7 dias.</p>
            </div>
            <Botao
              variante="neutro"
              tamanho="pequeno"
              onClick={aoLimparHistorico}
              className="flex items-center gap-1.5 text-red-600 hover:bg-red-500/10 cursor-pointer animate-none"
            >
              <Trash2 size={14} />
              <span>Limpar Histórico</span>
            </Botao>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {historico.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/60 animate-in fade-in duration-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    {item.tipo === "PDF para EPUB" ? <BookOpen size={20} /> : <FileImage size={20} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-foreground truncate" title={item.nome}>{item.nome}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.tipo} • {new Date(item.data).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => baixarArquivoDoHistorico(item)}
                  className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors shrink-0 ml-2 cursor-pointer"
                  title="Baixar Arquivo"
                >
                  <Download size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
