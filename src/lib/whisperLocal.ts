import { pipeline, env } from "@xenova/transformers";

// Configura o HuggingFace Transformers.js no navegador
env.allowLocalModels = false;
env.useBrowserCache = true;

let pipelineInstancia: any = null;
let modeloAtual: string = "";

export async function obterTranscritorWhisperLocal(
  nomeModelo: "Xenova/whisper-base" | "Xenova/whisper-small" = "Xenova/whisper-base",
  aoProgresso?: (msg: string) => void
) {
  if (pipelineInstancia && modeloAtual === nomeModelo) return pipelineInstancia;

  aoProgresso?.(`Carregando modelo aberto ${nomeModelo.replace("Xenova/", "")} (IA 100% no navegador)...`);

  pipelineInstancia = await pipeline(
    "automatic-speech-recognition",
    nomeModelo,
    {
      quantized: true,
      progress_callback: (p: any) => {
        if (p.status === "progress" && p.progress) {
          aoProgresso?.(`Baixando modelo ${nomeModelo.replace("Xenova/", "")}: ${Math.round(p.progress)}%`);
        } else if (p.status === "ready") {
          aoProgresso?.("Modelo local pronto! Transcrevendo...");
        }
      },
    }
  );

  modeloAtual = nomeModelo;
  return pipelineInstancia;
}

/**
 * Remove loops de repetição de palavras ou frases
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
      if (contadorRepeticao >= 2) continue;
    } else {
      contadorRepeticao = 0;
    }
    resultado.push(p);
  }

  return resultado.join(" ");
}

/**
 * Decodifica o áudio do usuário para 16kHz Mono
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
 * Transcreve o áudio 100% localmente no navegador via Whisper Base ou Small (muito superior ao Tiny).
 */
export async function transcreverAudioLocalWhisper(
  file: File,
  modelo: "Xenova/whisper-base" | "Xenova/whisper-small" = "Xenova/whisper-base",
  aoProgresso?: (msg: string) => void
): Promise<string> {
  aoProgresso?.("Preparando decodificação de áudio...");
  const audioData = await decodificarAudioPara16kHz(file);

  const transcritor = await obterTranscritorWhisperLocal(modelo, aoProgresso);

  aoProgresso?.("Transcrevendo com modelo Whisper local...");
  const saida = await transcritor(audioData, {
    language: "portuguese",
    task: "transcribe",
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  const textoFinal = saibaComoFormatador(saida, file.name, modelo);
  return textoFinal;
}

/**
 * Reconhecimento Nativo usando a Web Speech API do próprio sistema operacioanl / navegador
 */
export async function transcreverComWebSpeechAPI(
  file: File,
  aoProgresso?: (msg: string) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      reject(new Error("Seu navegador não possui suporte ao Web Speech API nativo."));
      return;
    }

    aoProgresso?.("Transcrevendo via motor de voz nativo do sistema em pt-BR...");
    
    const audioUrl = URL.createObjectURL(file);
    const audioEl = new Audio(audioUrl);
    const recognition = new SpeechRecognition();

    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;

    let textoAcumulado = "";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          textoAcumulado += event.results[i][0].transcript + " ";
        }
      }
    };

    recognition.onerror = (e: any) => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error(`Erro no reconhecimento nativo: ${e.error || "falha ao ouvir"}`));
    };

    recognition.onend = () => {
      URL.revokeObjectURL(audioUrl);
      const resultado = removerRepeticoesInfinitas(textoAcumulado.trim());
      if (!resultado) {
        resolve("Não foi possível reconhecer a fala nativamente.");
      } else {
        resolve(`# Transcrição Nativa do Navegador (pt-BR)\n\n**Arquivo**: \`${file.name}\`  \n**Motor**: Nativo do Sistema (0ms Custo / 0 API)  \n\n---\n\n${resultado}`);
      }
    };

    audioEl.onended = () => {
      recognition.stop();
    };

    try {
      recognition.start();
      await audioEl.play();
    } catch {
      recognition.start();
    }
  });
}

function saibaComoFormatador(saida: any, nomeArquivo: string, modelo: string): string {
  if (!saida) return "Nenhum texto detectado no áudio.";

  const modeloNome = modelo.replace("Xenova/", "");
  let md = `# Transcrição Local (Whisper ${modeloNome.toUpperCase()})\n\n`;
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
