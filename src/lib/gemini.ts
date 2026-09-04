/**
 * Conversa com o Gemini, direto do navegador.
 *
 * A API do Google responde a requisições cross-origin (verificado: ela devolve
 * access-control-allow-origin com a origem do site), então não existe backend
 * aqui também. A chave fica no localStorage e nunca sai para lugar nenhum
 * além do próprio Google.
 */

import type { Settings } from "./settings";
import { FERRAMENTAS, type ChamadaFuncao } from "./acoes";
import { hojeISO } from "./utils";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type Papel = "user" | "model";
export type Mensagem = { papel: Papel; texto: string };

export class ErroGemini extends Error {}

/**
 * Instruções fixas em toda conversa.
 *
 * As duas regras que mais importam: nunca inventar fato sobre o trabalho de
 * quem usa o app, e marcar como sugestão o que a pessoa ainda não conferiu.
 *
 * É função e não constante porque o nome e a área saem da configuração, que
 * cada pessoa preenche com o que é dela. Os dois campos são opcionais, então
 * cada trecho abaixo tem de continuar gramatical quando vierem vazios — daí
 * as alternativas em vez de interpolar direto.
 */
export function instrucaoBase(cfg: Settings): string {
  const nome = cfg.nomeUsuario.trim();
  const profissao = cfg.profissaoUsuario.trim();

  // "de Fulano" quando há nome; "do usuário" quando não há.
  const dono = nome ? `de ${nome}` : "do usuário";

  return `Você é o assistente inteligente do Klaus, o segundo cérebro ${dono}${
    profissao ? `, que atua como ${profissao}` : ""
  }.

REGRAS:
1. Responda sempre em português do Brasil, de forma direta, clara e prática, sem introduções vazias.
2. NUNCA invente fatos sobre o trabalho, as entregas, as metas ou as pessoas ${dono}. Você tem acesso ao panorama completo do acervo e ao conteúdo detalhado no contexto que recebeu.
3. ${
    profissao
      ? `A área ${dono} é ${profissao}`
      : "Não presuma formação técnica em quem lê"
  }: seja didático e explique sem jargão técnico de programação.
4. Seja conciso e focado em produtividade real: ${nome || "o usuário"} lê suas respostas no meio da rotina de trabalho.

ESTRUTURA DO KLAUS:
- Tarefas (tarefas/): Contêm status ('a-fazer', 'fazendo', 'feito'), prazo (AAAA-MM-DD), prioridade ('urgente', 'alta', 'media', 'baixa'), tags e subtarefas.
- Notas (notas/): Anotações livres, briefings, ideias, reflexões, documentos de projeto e minutas.
- PDI / Metas e Entregas (pdi/metas/ e pdi/entregas/): Metas de desenvolvimento profissional e entregas realizadas que alimentam essas metas.
- Contatos (contatos/): Pessoas, cargos, empresas e rede profissional.
- Referências (referencias/): Inspirações visuais, paletas e referências.

PADRÃO DE TAGS:
- Use sempre tags limpas com palavras com a primeira letra maiúscula e espaço em vez de hífens (Ex: 'Social Media', 'Design Gráfico', 'Branding', 'Reunião', 'Finanças'), nunca no formato 'social-media' ou 'social_media'.

SUGESTÃO E VÍNCULO DE CONTATOS:
- Ao analisar reuniões, conversas ou transcrições de áudio, identifique pessoas e participantes citados.
- Se a pessoa ainda NÃO existir em Contatos (contatos/), use a ferramenta 'criar_item' com pasta 'contatos' e título sendo o Nome da Pessoa (apenas o nome, para que o usuário adicione emails e detalhes depois).
- Se a pessoa JÁ existir em Contatos ou ao criar tarefas/notas para ela, relacione usando a menção '@Nome da Pessoa' no corpo ou título do item.

DIRETRIZES DE ANÁLISE:
- Para "Por onde começar hoje" ou "Tarefas da semana": Analise as tarefas em aberto ('a-fazer' e 'fazendo'), compare os prazos com a data de hoje, priorize itens urgentes/atrasados ou com prazo próximo e cruze com as metas do PDI para propor uma ordem de execução clara e motivadora.
- Para "Organizar minhas notas" / "Triagem": Examine as notas listadas, identifique ideias soltas, sugira transformá-las em tarefas práticas usando criar_item, organizá-las por tags ou relacioná-las com projetos.
- Para "Como foi minha semana": Avalie tarefas concluídas ('feito'), entregas registradas e o progresso em direção às metas.
- Para reuniões / transcrições: Extraia decisões, tarefas com prazos e sugira novos contatos para cada participante novo mencionado.`;
}

export type RespostaIA = {
  texto: string;
  /** O que a IA quer fazer — nada é executado sem o usuário aprovar */
  chamadas: ChamadaFuncao[];
};

export async function conversar(
  cfg: Settings,
  historico: Mensagem[],
  contexto?: string,
  signal?: AbortSignal,
): Promise<RespostaIA> {
  if (!cfg.geminiKey) {
    throw new ErroGemini(
      "Falta a chave do Gemini. Preencha na aba de Ajustes.",
    );
  }

  const base = `${instrucaoBase(cfg)}\n\nHoje é ${hojeISO()}.`;

  const instrucao = contexto
    ? `${base}\n\n--- CONTEÚDO ATUAL DO KLAUS ---\n${contexto}\n--- FIM DO CONTEÚDO ---`
    : base;

  let resposta: Response;
  try {
    resposta = await fetch(
      `${BASE}/${encodeURIComponent(cfg.geminiModel)}:generateContent`,
      {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": cfg.geminiKey.trim(),
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instrucao }] },
          contents: historico.map((m) => ({
            role: m.papel,
            parts: [{ text: m.texto }],
          })),
          tools: FERRAMENTAS,
          generationConfig: { temperature: 0.3, maxOutputTokens: 4000 },
        }),
      },
    );
  } catch (e) {
    if (signal?.aborted) {
      throw new ErroGemini("Resposta interrompida por você.");
    }
    throw new ErroGemini(
      navigator.onLine
        ? `Não consegui falar com o Gemini. (${e instanceof Error ? e.message : String(e)})`
        : "Você está sem internet.",
    );
  }

  if (!resposta.ok) {
    let detalhe = "";
    try {
      const corpo = await resposta.json();
      detalhe = corpo?.error?.message ?? "";
    } catch {
      /* sem json */
    }
    const amigavel: Record<number, string> = {
      400: `O Gemini recusou o pedido. ${detalhe}`,
      403: "Chave do Gemini inválida ou sem permissão. Confira em Ajustes.",
      429: "Você passou do limite gratuito do Gemini por agora. Tente de novo daqui a pouco.",
      404: `Modelo "${cfg.geminiModel}" não encontrado. Escolha outro em Ajustes.`,
    };
    throw new ErroGemini(
      amigavel[resposta.status] ?? `Erro do Gemini (${resposta.status}). ${detalhe}`,
    );
  }

  const dados = await resposta.json();

  const bloqueio = dados?.promptFeedback?.blockReason;
  if (bloqueio) {
    throw new ErroGemini(
      `O Gemini bloqueou a resposta (${bloqueio}). Tente reformular.`,
    );
  }

  type Parte = { text?: string; functionCall?: ChamadaFuncao };
  const partes: Parte[] = dados?.candidates?.[0]?.content?.parts ?? [];

  const texto = partes
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  const chamadas = partes
    .map((p) => p.functionCall)
    .filter((c): c is ChamadaFuncao => Boolean(c?.name));

  // resposta vazia só é problema se não veio ação nenhuma junto
  if (!texto && chamadas.length === 0) {
    const motivo = dados?.candidates?.[0]?.finishReason;
    throw new ErroGemini(
      motivo === "MAX_TOKENS"
        ? "A resposta ficou longa demais e foi cortada. Peça algo mais específico."
        : "O Gemini respondeu vazio. Tente de novo.",
    );
  }

  return { texto, chamadas };
}

/* ------------------------------------------------------- prompts salvos */

export type PromptSalvo = {
  id: string;
  nome: string;
  descricao: string;
  /** Que pastas o prompt precisa ler para funcionar */
  precisa: string[];
  texto: string;
};

export const PROMPTS: PromptSalvo[] = [
  {
    id: "organizar-reuniao",
    nome: "Organizar reunião",
    descricao: "Cole a transcrição e receba decisões, tarefas, contatos e contexto",
    precisa: ["contatos"],
    texto: `Vou colar a transcrição de uma reunião. Organize em seções estruturadas, usando SÓ o que estiver na transcrição:

**Participantes & Contatos** — liste os participantes identificados. Para quem for novo, proponha a criação do contato no Klaus.

**Decisões** — só o que foi decidido de fato. Discussão sem conclusão não é decisão; se ficou em aberto, escreva "em aberto: ...".

**Minhas ações** — o que eu fiquei de fazer, como lista de caixinhas. Se houver prazo, inclua a data.

**Ações de outros** — quem ficou de fazer o quê, usando menção @Nome da pessoa.

**Contexto** — o que não cabe acima mas vale lembrar daqui a seis meses: quem defendeu o quê, tensões, prioridades implícitas.

Se algum trecho estiver confuso ou cortado, escreva "[trecho pouco claro]" em vez de preencher a lacuna.

Transcrição:
`,
  },
  {
    id: "classificar-entregas",
    nome: "Ligar entregas às metas",
    descricao: "Sugere qual meta cada entrega solta alimenta",
    precisa: ["pdi/metas", "pdi/entregas"],
    texto: `Olhe minhas metas e minhas entregas que ainda não têm meta atribuída.

Para cada entrega sem meta, proponha a quais metas ela pertence. Responda numa tabela:

| Entrega | Meta proposta | Por quê | Confiança |

Na coluna "Por quê", cite o que foi feito de concreto — não repita o título. Uma frase.
Na coluna "Confiança", use alta, média ou baixa. Prefira dizer "baixa" a forçar uma ligação fraca.

Se uma entrega não se encaixar em meta nenhuma, diga isso em vez de forçar. E se você notar várias entregas sobre um mesmo assunto que nenhuma meta cobre, aponte: pode estar faltando uma meta, ou eu posso estar gastando tempo com o que não me desenvolve.

Ao final, liste o campo pronto para eu colar em cada entrega, assim:
nome-do-arquivo.md → metas: [id-da-meta]`,
  },
  {
    id: "revisao-semana",
    nome: "Como foi minha semana",
    descricao: "Balanço dos últimos 7 dias com uma pergunta no fim",
    precisa: ["tarefas", "pdi/entregas", "pdi/metas"],
    texto: `Faça o balanço da minha última semana com base no que você recebeu.

## O que andou
O que efetivamente saiu, citando pelo nome.

## O que travou
Tarefas que passaram do prazo, coisas paradas. Se o mesmo obstáculo apareceu mais de uma vez, aponte — padrão repetido importa mais que evento isolado.

## Ligação com minhas metas
Quais metas receberam movimento e quais não receberam nada.

## Uma pergunta
Termine com UMA pergunta que valha eu pensar antes de planejar a próxima semana. Deve nascer do que você leu, não ser genérica.

Não elogie por elogiar. Se a semana foi fraca, diga que foi fraca e mostre os dados.`,
  },
  {
    id: "por-onde-comecar",
    nome: "Por onde começar hoje",
    descricao: "Analisa suas tarefas e metas para propor a ordem do dia",
    precisa: ["tarefas", "pdi/metas"],
    texto: `Olhe minhas tarefas e metas em aberto e me sugira por onde começar hoje.

1. Quais são as tarefas mais urgentes ou prioritárias para hoje?
2. Como elas se conectam com as minhas metas do PDI?
3. Qual a sequência de foco recomendada para o meu dia?

Seja direto e objetivo.`,
  },
  {
    id: "triagem",
    nome: "Organizar minhas notas",
    descricao: "Sugere o que fazer com cada nota solta",
    precisa: ["notas"],
    texto: `Olhe minhas notas e proponha o que fazer com cada uma:

| Nota | O que fazer | Por quê |

Opções: virar tarefa (proponha o texto e um prazo se houver pista), juntar com outra nota (diga qual), manter como está, ou descartar.

Sobre descartar: seja disposto a sugerir. Um monte de anotação que nunca é jogada fora vira um depósito que eu passo a evitar. Se algo foi escrito há semanas e não significa mais nada, diga.

Se várias notas forem sobre o mesmo assunto, sugira juntar numa só.`,
  },
];

/**
 * Transcreve arquivo de áudio com identificação de oradores e marcação de tempo.
 */
export async function transcreverAudioComIA(
  cfg: Settings,
  file: File,
  aoProgresso?: (msg: string) => void
): Promise<string> {
  if (!cfg.geminiKey) {
    throw new ErroGemini("Falta a chave do Gemini. Preencha a chave na tela de Ajustes.");
  }

  aoProgresso?.("Lendo arquivo de áudio...");
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  aoProgresso?.("Convertendo áudio para envio...");
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  const base64Data = btoa(binary);

  aoProgresso?.("Processando transcrição e oradores com IA...");

  /**
   * Começa pelo modelo escolhido em Ajustes.
   *
   * Antes esta lista era fixa e ignorava a escolha do Hugo — e ainda por cima
   * três dos quatro modelos eram da família 1.5, aposentada para chaves novas:
   * na prática só o quarto respondia, depois de três tentativas queimadas.
   */
  const modelos = [
    ...new Set(
      [cfg.geminiModel, "gemini-2.5-flash", "gemini-2.0-flash"].filter(Boolean),
    ),
  ];
  let ultimoErro = "";

  for (const mod of modelos) {
    const url = `${BASE}/${mod}:generateContent`;

    const body = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: file.type || "audio/mp3",
                data: base64Data,
              },
            },
            {
              text: `Faça a transcrição completa e detalhada deste áudio em Português do Brasil.
REGRAS OBRIGATÓRIAS:
1. Identifique e rotule separadamente cada orador (ex: Orador 1, Orador 2, Orador 3).
2. Adicione marcações de tempo aproximadas (ex: [00:15], [01:42]) a cada mudança de fala.
3. Mantenha o texto limpo, pontuado e fiel às falas originais.
4. Se houver partes inaudíveis, indique com [inaudível].`,
            },
          ],
        },
      ],
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No CABEÇALHO, não na URL. Antes ia como `?key=...`, e chave em URL
          // acaba em log de servidor, em histórico e no cabeçalho Referer. A
          // função `conversar`, logo acima, sempre fez assim.
          "x-goog-api-key": cfg.geminiKey.trim(),
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const textoResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textoResult) return textoResult;
        ultimoErro = "O Gemini respondeu sem texto nenhum.";
        continue;
      }

      const errData = await res.json().catch(() => ({}));
      ultimoErro = errData.error?.message || `Erro HTTP ${res.status}`;

      // Chave inválida ou sem permissão não melhora trocando de modelo:
      // insistir só gasta requisição e troca a mensagem certa por uma pior.
      if (res.status === 401 || res.status === 403) {
        throw new ErroGemini(
          "Chave do Gemini inválida ou sem permissão. Confira em Ajustes.",
        );
      }
      if (res.status === 429) {
        throw new ErroGemini(
          "Você passou do limite gratuito do Gemini por agora. Tente de novo daqui a pouco.",
        );
      }
    } catch (e: any) {
      if (e instanceof ErroGemini) throw e;
      ultimoErro = e?.message || String(e);
    }
  }

  throw new ErroGemini(ultimoErro || "Não foi possível conectar a nenhum modelo Gemini disponível.");
}

/**
 * Analisa o conteúdo de um documento com a IA Gemini e extrai prazos/lembretes.
 */
export async function extrairLembretesComIA(
  cfg: Settings,
  textoDoc: string,
): Promise<Array<{ titulo: string; dataHora: string }>> {
  if (!cfg.geminiKey) return [];

  const modelos = [cfg.geminiModel || "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  const prompt = `Analise o texto abaixo e extraia compromissos, lembretes ou prazos de entrega nele mencionados.
Retorne EXCLUSIVAMENTE um JSON sem formatação no seguinte formato:
[{"titulo": "Descrição do lembrete", "dataHora": "YYYY-MM-DD HH:mm"}]

Se não houver prazos ou lembretes, devolva [].

Texto:
${textoDoc}`;

  for (const mod of modelos) {
    const url = `${BASE}/${mod}:generateContent`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": cfg.geminiKey.trim(),
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/) || rawText.match(/\[\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {
      // avança para próximo modelo
    }
  }

  return [];
}
