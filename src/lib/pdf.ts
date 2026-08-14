import html2pdf from "html2pdf.js";

/**
 * Converte um elemento do DOM em um arquivo PDF de alta definição
 * totalmente no navegador do usuário sem backend.
 */
export async function exportarElementoParaPdf(
  elemento: HTMLElement,
  nomeArquivo: string,
): Promise<void> {
  const opcoes = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: nomeArquivo.endsWith(".pdf") ? nomeArquivo : `${nomeArquivo}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  await html2pdf().set(opcoes as any).from(elemento).save();
}
