import html2pdf from "html2pdf.js";

/**
 * Converte um elemento do DOM em um arquivo PDF de alta qualidade.
 * Clona o elemento temporariamente com estilos de impressão limpos (fundo branco,
 * texto legível, sem botões ou menus) para garantir que o PDF saia perfeito.
 */
export async function exportarElementoParaPdf(
  elemento: HTMLElement,
  nomeArquivo: string,
): Promise<void> {
  // Clona o elemento para não alterar a tela do usuário
  const clone = elemento.cloneNode(true) as HTMLElement;

  // Remove elementos interativos que não devem sair no PDF (botões, modais, etc)
  clone.querySelectorAll("button, input[type='file'], .no-pdf").forEach((el) => el.remove());

  // Aplica contêiner temporário limpo com estilo folha A4 em fundo branco
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0px";
  container.style.width = "800px";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#000000";
  container.style.padding = "32px";
  container.style.fontFamily = "sans-serif";

  // Força cor de texto escura no clone
  clone.style.color = "#111827";
  clone.style.backgroundColor = "#ffffff";

  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    const opcoes = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: nomeArquivo.endsWith(".pdf") ? nomeArquivo : `${nomeArquivo}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    const html2pdfFn = (html2pdf as any).default || html2pdf;
    await html2pdfFn().set(opcoes as any).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}
