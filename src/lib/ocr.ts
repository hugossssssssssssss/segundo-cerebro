/**
 * Lê o texto que está DENTRO de uma imagem.
 *
 * O buraco que isto tapa: metade das referências salvas é print — de site, de
 * slide, de post, de conversa. O texto ali dentro é invisível para a busca,
 * então uma referência ótima some seis meses depois porque você lembra da
 * frase e não do título que deu para ela.
 *
 * Depois de passar por aqui o texto vira texto puro no `.md`, e a busca (⌘K)
 * o encontra como qualquer outro. Continua legível fora do app, como tudo.
 *
 * Roda no navegador via Tesseract, sem backend. O pacote de idioma tem alguns
 * megabytes e é carregado sob demanda — nunca no primeiro acesso ao app.
 */

/** Título sob o qual o texto lido é guardado no corpo do arquivo. */
export const CABECALHO_OCR = "## Texto da imagem";

/**
 * Limpa a saída bruta do OCR.
 *
 * O Tesseract devolve muita sujeira previsível: linha só com um caractere
 * solto (borda ou ícone que ele tentou ler como letra), espaço duplicado e
 * uma cascata de linhas em branco. Sem esta limpeza o corpo do `.md` fica
 * ilegível e o Hugo não confia mais no que está escrito lá.
 */
export function limparTextoLido(bruto: string): string {
  const linhas = bruto
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    // Descarta ruído de borda: linha com um ou dois caracteres quase sempre é
    // a moldura de um botão que o OCR tentou ler como letra. A linha VAZIA
    // sobrevive de propósito — é ela que separa os parágrafos, e sem isso o
    // texto vira um bloco único ilegível.
    .filter((l) => l === "" || l.length > 2 || /^\d+$/.test(l));

  return linhas.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Acrescenta o texto lido ao corpo, sob um cabeçalho fixo.
 *
 * Reexecutar o OCR SUBSTITUI o bloco anterior em vez de empilhar cópias —
 * você vai apertar o botão de novo depois de trocar a imagem, e três versões
 * do mesmo texto no arquivo seria pior que não ter nenhuma.
 */
export function anexarTextoLido(corpo: string, texto: string): string {
  const bloco = `${CABECALHO_OCR}\n\n${texto}`;

  if (corpo.includes(CABECALHO_OCR)) {
    const inicio = corpo.indexOf(CABECALHO_OCR);
    const depois = corpo.slice(inicio + CABECALHO_OCR.length);
    // o bloco termina no próximo cabeçalho de mesmo nível, ou no fim do texto
    const proximo = depois.search(/\n##\s/);
    const resto = proximo >= 0 ? depois.slice(proximo) : "";
    return `${corpo.slice(0, inicio)}${bloco}${resto}`.trim();
  }

  const base = corpo.trimEnd();
  return `${base}${base ? "\n\n" : ""}${bloco}\n`;
}

/**
 * Extrai o texto de uma imagem (URL, blob: ou File).
 *
 * `aoProgredir` recebe de 0 a 1 — sem ele a tela fica parada por 10 a 30
 * segundos e parece travada.
 */
export async function extrairTexto(
  imagem: string | File | Blob,
  aoProgredir?: (fracao: number) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");

  // "por+eng": o material de design do Hugo mistura os dois idiomas na mesma
  // imagem o tempo todo. Só português erra os termos em inglês, e vice-versa.
  const worker = await createWorker(["por", "eng"], 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") aoProgredir?.(m.progress);
    },
  });

  try {
    const { data } = await worker.recognize(imagem);
    return limparTextoLido(data.text ?? "");
  } finally {
    // sem terminar, o worker e o modelo carregado ficam na memória da aba
    await worker.terminate();
  }
}
