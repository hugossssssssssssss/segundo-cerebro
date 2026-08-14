import { pipeline, env } from "@xenova/transformers";

// Configura o HuggingFace Transformers.js no navegador
env.allowLocalModels = false;
env.useBrowserCache = true;

let pipelineInstancia: any = null;

export async function obterTranscritorWhisperLocal(aoProgresso?: (msg: string) => void) {
  if (pipelineInstancia) return pipelineInstancia;

  aoProgresso?.("Carregando modelo aberto do Whisper...");

  // Modelo leve e rápido rodando 100% no navegador (WASM / Custo R$ 0)
  pipelineInstancia = await pipeline(
    "automatic-speech-recognition",
    "Xenova/whisper-tiny",
    {
      quantized: true,
      progress_callback: (p: any) => {
        if (p.status === "progress" && p.progress) {
          aoProgresso?.(`Carregando modelo local: ${Math.round(p.progress)}%`);
        } else if (p.status === "ready") {
          aoProgresso?.("Modelo pronto! Transcrevendo...");
        }
      },
    }
  );

  return pipelineInstancia;
}

/**
 * Remove loops de repetição de palavras ou frases (ex: "da situação da situação...")
 */
export function removerRepeticoesInfinitas(texto: string): string {
  if (!texto) return "";

  // 1. Remove repetições continuadas da mesma palavra
  let limpo = texto.replace(/\b(\w+)(?:\s+\1){2,}\b/gi, "$1");

  // 2. Remove repetições de frases inteiras repetidas mais de 2 vezes
  limpo = limpo.replace(/(.{3,40}?)\1{2,}/gi, "$1");

  // 3. Filtro extra por array de palavras consecutivas
  const palavras = limpo.split(/\s+/);
  const resultado: string[] = [];
  let contadorRepeticao = 0;

  for (let i = 0; i < palavras.length; i++) {
    const p = palavras[i];
    if (i > 0 && p.toLowerCase() === palavras[i - 1].toLowerCase()) {
      contadorRepeticao++;
      if (contadorRepeticao >= 2) continue; // descarta a partir da 3ª palavra idêntica seguida
    } else {
      contadorRepeticao = 0;
    }
    resultado.push(p);
  }

  return resultado.join(" ");
}

/**
 * Decodifica o áudio do usuário para 16kHz Mono (padrão do Whisper)
 */
export async function decodificarAudioPara16kHz(file: File): Promise<Float32Array> {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 16000,
  });
  const buffer = await file.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(buffer);
  
  return audioBuffer.getChannelData(0);
}

/**
 * Transcreve o áudio 100% localmente no navegador via Whisper open-source com filtro anti-loop.
 */
export async function transcreverAudioLocalWhisper(
  file: File,
  aoProgresso?: (msg: string) => void
): Promise<string> {
  aoProgresso?.("Preparando áudio...");
  const audioData = await decodificarAudioPara16kHz(file);

  const transcritor = await obterTranscritorWhisperLocal(aoProgresso);

  aoProgresso?.("Transcrevendo 100% local no navegador...");
  const saida = await transcritor(audioData, {
    language: "portuguese",
    task: "transcribe",
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  const textoFinal = saibaComoFormatador(saida, file.name);
  return textoFinal;
}

function saibaComoFormatador(saida: any, nomeArquivo: string): string {
  if (!saida) return "Nenhum texto detectado no áudio.";

  let md = `# Transcrição Local (Whisper Open-Source)\n\n`;
  md += `**Arquivo**: \`${nomeArquivo}\`  \n`;
  md += `**Processamento**: 100% Navegador (Sem API / Custo R$ 0)  \n\n`;
  md += `---\n\n`;

  if (Array.isArray(saida.chunks) && saida.chunks.length > 0) {
    let oradorAtual = 1;
    let blocoTexto = "";

    saida.chunks.forEach((chunk: any, index: number) => {
      const textoChunk = removerRepeticoesInfinitas(chunk.text || "").trim();
      if (!textoChunk) return;

      const inicio = Math.floor(chunk.timestamp?.[0] || 0);
      const min = String(Math.floor(inicio / 60)).padStart(2, "0");
      const seg = String(inicio % 60).padStart(2, "0");

      if (index > 0 && chunk.timestamp?.[0] - (saida.chunks[index - 1].timestamp?.[1] || 0) > 3.0) {
        oradorAtual = (oradorAtual % 2) + 1;
      }

      blocoTexto += `**[${min}:${seg}] Orador ${oradorAtual}**: ${textoChunk}\n\n`;
    });

    const blocoLimpo = removerRepeticoesInfinitas(blocoTexto);
    md += blocoLimpo || "Áudio processado sem fala legível.";
  } else if (typeof saida.text === "string" && saida.text.trim()) {
    md += `${removerRepeticoesInfinitas(saida.text.trim())}\n`;
  } else {
    md += "Transcrição concluída sem texto legível.";
  }

  return md;
}
