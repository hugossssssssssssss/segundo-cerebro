import { lerConfig } from "./settings";
import { hojeISO } from "./utils";

export interface MensagemIARapida {
  papel: "user" | "model";
  texto: string;
}

/**
 * Avaliador local rápido para contas matemáticas e expressões do dia a dia.
 * Resolve instantaneamente (0ms) sem depender de rede.
 * Exemplos: "25 * 4", "15% de 850", "1200 / 3", "200 + 45 - 12".
 */
export function tentarResolverContaLocal(texto: string): string | null {
  const limpo = texto.trim().toLowerCase();

  // Caso: "quanto é X % de Y" ou "X% de Y"
  const matchPorcentagem = limpo.match(/(?:quanto\s+(?:é|e)\s+)?(\d+(?:[.,]\d+)?)\s*%\s*(?:de|\*)\s*(\d+(?:[.,]\d+)?)/i);
  if (matchPorcentagem) {
    const p = parseFloat(matchPorcentagem[1].replace(",", "."));
    const v = parseFloat(matchPorcentagem[2].replace(",", "."));
    if (!isNaN(p) && !isNaN(v)) {
      const resultado = (p / 100) * v;
      return `${p}% de ${v} = ${resultado.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`;
    }
  }

  // Caso: conta aritmética simples com números e operadores +, -, *, /, x, ÷
  const expMatch = limpo
    .replace(/^(?:quanto\s+(?:é|e)|calcule|conta:?)\s*/i, "")
    .replace(/[?=]/g, "")
    .replace(/x/gi, "*")
    .replace(/÷/g, "/")
    .replace(/,/g, ".")
    .trim();

  // Checa se sobraram apenas dígitos, pontos, espaços e operadores válidos
  if (/^[\d\s+\-*/().^]+$/.test(expMatch) && /[\d]/.test(expMatch) && /[+\-*/^]/.test(expMatch)) {
    try {
      // Normalização de potência: 2^3 -> 2**3
      const expPronta = expMatch.replace(/\^/g, "**");
      // Avaliação segura com Function apenas para tokens estritamente matemáticos
      const res = Function(`"use strict"; return (${expPronta})`)();
      if (typeof res === "number" && !isNaN(res) && isFinite(res)) {
        return `${expMatch.trim()} = ${res.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`;
      }
    } catch {
      // Ignora erro de sintaxe matemática e prossegue para IA
    }
  }

  return null;
}

/**
 * Consulta o Gemini caso o usuário possua a chave configurada no Klaus.
 */
async function consultarGemini(
  prompt: string,
  historico: MensagemIARapida[],
  chave: string,
  modelo: string,
): Promise<string> {
  const instrucaoSistema = `Você é um assistente minimalista embutido em um editor de documentos.
Seu objetivo é responder perguntas curtas, resolver contas, corrigir trechos de texto e dar respostas diretas.
Responda sempre em português do Brasil.
Seja direto, conciso e evite introduções como "claro!" ou "com certeza!".
Hoje é ${hojeISO()}.`;

  const corpoMensagens = [
    ...historico.map((m) => ({
      role: m.papel,
      parts: [{ text: m.texto }],
    })),
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelo || "gemini-2.0-flash",
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": chave.trim(),
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instrucaoSistema }] },
        contents: corpoMensagens,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Erro na API (${res.status})`);
  }

  const json = await res.json();
  const texto = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error("Resposta vazia da IA.");
  return texto.trim();
}

/**
 * Consulta um provedor gratuito aberto (DeepSeek / Llama aberto ou fallback).
 */
async function consultarProvedorGratuito(
  prompt: string,
  historico: MensagemIARapida[],
): Promise<string> {
  // Provedor público sem chave com suporte a CORS
  // Tentativa 1: Endpoint de inferência aberto de texto
  const mensagensFormatadas = [
    {
      role: "system",
      content:
        "Você é um assistente minimalista embutido em um editor de texto. Responda em português do Brasil de forma direta, concisa e sem enrolação.",
    },
    ...historico.map((m) => ({
      role: m.papel === "model" ? "assistant" : "user",
      content: m.texto,
    })),
    { role: "user", content: prompt },
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // OpenRouter permite inferência com modelos abertos gratuitos
        "HTTP-Referer": "https://segundo-cerebro.local",
        "X-Title": "Klaus Document Assistant",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat:free",
        messages: mensagensFormatadas,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const conteudo = data?.choices?.[0]?.message?.content;
      if (conteudo) return conteudo.trim();
    }
  } catch {
    // Continua para fallback inteligente
  }

  // Fallback Inteligente local para perguntas frequentes / correções
  const pBaixo = prompt.toLowerCase().trim();
  if (pBaixo.includes("contar palavras") || pBaixo.includes("quantas palavras")) {
    const palavras = prompt.split(/\s+/).filter(Boolean).length;
    return `O texto fornecido contém aproximadamente ${palavras} palavras.`;
  }

  // Se for uma conta matemática não capturada antes
  const conta = tentarResolverContaLocal(prompt);
  if (conta) return conta;

  throw new Error("Não foi possível obter resposta no momento. Tente novamente.");
}

/**
 * Função principal para perguntas rápidas no editor de documentos.
 */
export async function perguntarIARapida(
  prompt: string,
  historico: MensagemIARapida[] = [],
): Promise<string> {
  const p = prompt.trim();
  if (!p) return "";

  // 1. Tenta resolver localmente contas matemáticas instantaneamente
  const resultadoConta = tentarResolverContaLocal(p);
  if (resultadoConta) {
    return resultadoConta;
  }

  // 2. Se o usuário tiver o Gemini configurado no Klaus, usa com prioridade
  const cfg = lerConfig();
  if (cfg.geminiKey?.trim()) {
    try {
      return await consultarGemini(p, historico, cfg.geminiKey, cfg.geminiModel);
    } catch {
      // Se falhar o Gemini, tenta fallback gratuito
    }
  }

  // 3. Consulta provedor gratuito sem chave
  try {
    return await consultarProvedorGratuito(p, historico);
  } catch (erro) {
    if (cfg.geminiKey?.trim()) {
      throw erro;
    }
    throw new Error(
      "Não foi possível conectar à IA gratuita no momento. Você também pode informar sua chave gratuita do Gemini na tela de Ajustes.",
    );
  }
}
