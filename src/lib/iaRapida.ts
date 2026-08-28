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
 * Correção gramatical e ortográfica gratuita em Português do Brasil via LanguageTool.
 * Sem necessidade de chave ou login.
 */
export async function corrigirTextoGratuito(texto: string): Promise<string | null> {
  const limpo = texto
    .replace(/^(?:corrija|corrigir|correção:?|arrume|revisar|revisão:?|ortografia:?)\s*/i, "")
    .trim();
  if (!limpo) return "Por favor, informe o texto que deseja revisar.";

  try {
    const params = new URLSearchParams({ text: limpo, language: "pt-BR" });
    const res = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (res.ok) {
      const data = await res.json();
      const matches = data.matches;
      if (!matches || matches.length === 0) {
        return `O texto está gramaticalmente correto:\n\n"${limpo}"`;
      }

      // Aplica as correções sugeridas de trás para frente no texto
      let corrigido = limpo;
      const ordenados = [...matches].sort((a: any, b: any) => b.offset - a.offset);
      for (const m of ordenados) {
        if (m.replacements && m.replacements.length > 0) {
          const melhorSubst = m.replacements[0].value;
          corrigido =
            corrigido.slice(0, m.offset) +
            melhorSubst +
            corrigido.slice(m.offset + m.length);
        }
      }

      return corrigido;
    }
  } catch {
    // Falha de rede
  }

  return null;
}

/**
 * Consulta de definições, fatos, conceitos e pessoas em Português via Wikipedia.
 * 100% gratuita, sem chaves e com CORS aberto.
 */
export async function consultarWikipedia(pergunta: string): Promise<string | null> {
  const termo = pergunta
    .replace(
      /^(?:o que (?:é|e|era|significa)|quem (?:foi|é|era)|defina|definir|significado de|explique|sobre|conceito de)\s+/i,
      "",
    )
    .replace(/[?!.]/g, "")
    .trim();

  if (!termo || termo.length < 2) return null;

  try {
    const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      termo.replace(/\s+/g, "_"),
    )}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.extract) {
        return data.extract;
      }
    }
  } catch {
    // Falha de rede
  }

  return null;
}

/**
 * Consulta o Gemini quando configurado no Klaus, com tentativa sequencial nos modelos disponíveis.
 */
export async function consultarGeminiRobusto(
  prompt: string,
  historico: MensagemIARapida[],
  cfg: any,
): Promise<string> {
  const modelos = [
    ...new Set(
      [cfg.geminiModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"].filter(
        Boolean,
      ),
    ),
  ];

  let ultimoErro = "";

  for (const mod of modelos) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        mod,
      )}:generateContent`;

      const instrucaoSistema = `Você é um assistente minimalista embutido em um editor de documentos.
Seu objetivo é responder perguntas curtas, resolver contas, corrigir trechos de texto e dar respostas diretas.
Responda sempre em português do Brasil de forma concisa e sem introduções vazias.
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

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": cfg.geminiKey.trim(),
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instrucaoSistema }] },
          contents: corpoMensagens,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const texto = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (texto) return texto.trim();
      } else {
        const errJson = await res.json().catch(() => ({}));
        ultimoErro = errJson?.error?.message || `Erro HTTP ${res.status}`;
        if (res.status === 401 || res.status === 403) {
          throw new Error("Chave do Gemini inválida ou sem permissão. Verifique em Ajustes.");
        }
        if (res.status === 429) {
          throw new Error("Limite temporário do Gemini atingido. Tente em instantes.");
        }
      }
    } catch (e: any) {
      if (e?.message?.includes("Chave do Gemini") || e?.message?.includes("Limite temporário")) {
        throw e;
      }
      ultimoErro = e?.message || String(e);
    }
  }

  throw new Error(ultimoErro || "Falha ao conectar com o modelo de IA.");
}

/**
 * Função principal para perguntas rápidas no editor de documentos.
 * Atende a contas, correções, perguntas factuais e respostas completas.
 */
export async function perguntarIARapida(
  prompt: string,
  historico: MensagemIARapida[] = [],
): Promise<string> {
  const p = prompt.trim();
  if (!p) return "";

  // 1. Tenta resolver localmente contas matemáticas instantaneamente (0ms)
  const resultadoConta = tentarResolverContaLocal(p);
  if (resultadoConta) {
    return resultadoConta;
  }

  const cfg = lerConfig();

  // 2. Se o usuário tiver o Gemini configurado no Klaus, usa o poder total da IA
  if (cfg.geminiKey?.trim()) {
    try {
      return await consultarGeminiRobusto(p, historico, cfg);
    } catch (err: any) {
      if (
        err?.message?.includes("Chave do Gemini") ||
        err?.message?.includes("Limite temporário")
      ) {
        throw err;
      }
    }
  }

  // 3. Verificação de correção de texto / gramática
  const ehPedidoCorrecao = /^(?:corrija|corrigir|correção|arrume|revisar|revisão|ortografia)/i.test(p);
  if (ehPedidoCorrecao) {
    const corrigido = await corrigirTextoGratuito(p);
    if (corrigido) return corrigido;
  }

  // 4. Pergunta sobre conceito, definição, história ou pessoa
  const ehPerguntaFactual = /^(?:o que (?:é|e|era|significa)|quem (?:foi|é|era)|defina|definir|significado de|explique|sobre|conceito de)/i.test(p);
  if (ehPerguntaFactual) {
    const respostaFato = await consultarWikipedia(p);
    if (respostaFato) return respostaFato;
  }

  // 5. Utilitários locais (contagem de palavras, caracteres)
  const pBaixo = p.toLowerCase();
  if (pBaixo.includes("contar palavras") || pBaixo.includes("quantas palavras")) {
    const palavras = p.split(/\s+/).filter(Boolean).length;
    return `O texto digitado contém ${palavras} palavras.`;
  }
  if (pBaixo.includes("contar caracteres") || pBaixo.includes("quantos caracteres")) {
    return `O texto digitado possui ${p.length} caracteres.`;
  }

  // 6. Se perguntou algo factual geral sem o gatilho inicial explícito
  const tentativaGeral = await consultarWikipedia(p);
  if (tentativaGeral) return tentativaGeral;

  // 7. Se não achou na Wikipedia nem é conta e não tem chave do Gemini
  if (!cfg.geminiKey?.trim()) {
    return (
      "Para respostas complexas e criativas ilimitadas, configure sua chave gratuita do Gemini na tela de Ajustes do Klaus.\n\n" +
      "Enquanto isso, você pode me pedir contas (ex: '25 * 4', '15% de 800'), correções de texto (ex: 'corrija: nós foi na feira') ou definições (ex: 'o que é design', 'quem foi Santos Dumont')."
    );
  }

  throw new Error("Não foi possível obter uma resposta no momento. Tente novamente.");
}
