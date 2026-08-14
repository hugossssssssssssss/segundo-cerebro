/**
 * Ações que a IA pode propor — e que só acontecem se você aprovar.
 *
 * O Gemini não escreve no repositório direto. Ele devolve um bloco declarando
 * o que quer fazer; o app mostra um cartão com a proposta e nada é gravado
 * antes de você clicar em Aprovar.
 *
 * A razão é simples: um engano da IA vira commit no seu repositório. É
 * recuperável pelo git, mas descobrir e desfazer dá trabalho — e a confiança
 * na ferramenta não sobrevive a duas ou três surpresas dessas.
 */

import type { Settings } from "./settings";
import { gravar, apagar, ler } from "./github";
import { invalidarCache, type ItemRepo } from "./repo";
import { escreverMarkdown, lerMarkdown, nomeLivre } from "./markdown";
import { hojeISO } from "./utils";

export type TipoAcao = "criar" | "editar" | "apagar";

export type Acao = {
  tipo: TipoAcao;
  /** Pasta de destino, para criar. Ex: "tarefas" */
  pasta?: string;
  /** Caminho existente, para editar ou apagar */
  caminho?: string;
  titulo?: string;
  /** Campos do frontmatter que a IA quer definir */
  campos?: Record<string, unknown>;
  corpo?: string;
  /** Por que a IA está propondo isto — mostrado no cartão */
  motivo?: string;
};

export const PASTAS_VALIDAS = [
  "tarefas",
  "notas",
  "referencias",
  "reunioes",
  "pdi/metas",
  "pdi/entregas",
] as const;

/**
 * Declaração das ferramentas para o Gemini.
 *
 * Usar chamada de função nativa, e não pedir um bloco JSON no texto: testei
 * as duas e o pedido por prompt falhou — o modelo devolveu um frontmatter
 * markdown em vez do formato pedido, e errou o tipo do item. Com ferramenta
 * declarada ele acertou pasta, prazo e tags de primeira, e criou três itens
 * quando pedi três.
 */
export const FERRAMENTAS = [
  {
    functionDeclarations: [
      {
        name: "criar_item",
        description:
          "Cria um item novo no segundo cérebro do Hugo. Uma chamada por item.",
        parameters: {
          type: "object",
          properties: {
            pasta: {
              type: "string",
              enum: [...PASTAS_VALIDAS],
              description: "Onde o item vai morar",
            },
            titulo: { type: "string" },
            corpo: {
              type: "string",
              description:
                "Texto livre. Use [[Título de outro item]] para ligar a outra coisa dele.",
            },
            status: {
              type: "string",
              enum: ["a-fazer", "fazendo", "feito"],
              description: "Só para tarefas",
            },
            prazo: { type: "string", description: "AAAA-MM-DD" },
            tags: { type: "array", items: { type: "string" } },
            motivo: {
              type: "string",
              description: "Uma frase dizendo por que você está propondo isto",
            },
          },
          required: ["pasta", "titulo"],
        },
      },
      {
        name: "editar_item",
        description:
          "Muda um item que já existe. Use o caminho exato que você viu no conteúdo.",
        parameters: {
          type: "object",
          properties: {
            caminho: {
              type: "string",
              description: "Ex: tarefas/2026-08-13-revisar.md",
            },
            titulo: { type: "string" },
            corpo: { type: "string" },
            status: { type: "string", enum: ["a-fazer", "fazendo", "feito"] },
            prazo: { type: "string", description: "AAAA-MM-DD" },
            tags: { type: "array", items: { type: "string" } },
            metas: {
              type: "array",
              items: { type: "string" },
              description: "Só para entregas: nomes de arquivo das metas",
            },
            motivo: { type: "string" },
          },
          required: ["caminho"],
        },
      },
      {
        name: "apagar_item",
        description:
          "Apaga um item. Só chame se o Hugo pedir explicitamente para apagar aquilo.",
        parameters: {
          type: "object",
          properties: {
            caminho: { type: "string" },
            motivo: { type: "string" },
          },
          required: ["caminho"],
        },
      },
    ],
  },
];

/** Uma chamada de função como o Gemini devolve. */
export type ChamadaFuncao = { name: string; args: Record<string, unknown> };

/** Converte as chamadas do Gemini em ações, descartando o que for inválido. */
export function acoesDeChamadas(chamadas: ChamadaFuncao[]): Acao[] {
  const acoes: Acao[] = [];

  for (const c of chamadas) {
    const a = c.args ?? {};
    const campos: Record<string, unknown> = {};
    for (const k of ["status", "prazo", "tags", "metas"]) {
      if (a[k] !== undefined) campos[k] = a[k];
    }

    const base = {
      titulo: typeof a.titulo === "string" ? a.titulo : undefined,
      corpo: typeof a.corpo === "string" ? a.corpo : undefined,
      motivo: typeof a.motivo === "string" ? a.motivo : undefined,
      campos: Object.keys(campos).length ? campos : undefined,
    };

    const candidato: Acao =
      c.name === "criar_item"
        ? { tipo: "criar", pasta: String(a.pasta ?? ""), ...base }
        : c.name === "editar_item"
          ? { tipo: "editar", caminho: String(a.caminho ?? ""), ...base }
          : c.name === "apagar_item"
            ? { tipo: "apagar", caminho: String(a.caminho ?? ""), ...base }
            : ({ tipo: "criar" } as Acao); // nome desconhecido cai na validação

    if (valida(candidato)) acoes.push(candidato);
  }

  return acoes;
}

/** Recusa ação malformada ou que aponte para fora das pastas conhecidas. */
function valida(a: unknown): a is Acao {
  if (!a || typeof a !== "object") return false;
  const x = a as Acao;

  if (!["criar", "editar", "apagar"].includes(x.tipo)) return false;

  if (x.tipo === "criar") {
    return (
      typeof x.titulo === "string" &&
      x.titulo.trim().length > 0 &&
      typeof x.pasta === "string" &&
      (PASTAS_VALIDAS as readonly string[]).includes(x.pasta)
    );
  }

  // editar e apagar precisam de um caminho dentro de uma pasta conhecida
  if (typeof x.caminho !== "string" || !x.caminho.endsWith(".md")) return false;
  if (x.caminho.includes("..")) return false; // nada de subir diretório
  return (PASTAS_VALIDAS as readonly string[]).some((p) =>
    x.caminho!.startsWith(`${p}/`),
  );
}

/** Frase curta descrevendo a ação, para o cartão de confirmação. */
export function descrever(a: Acao): string {
  if (a.tipo === "criar") return `Criar ${rotuloPasta(a.pasta!)} "${a.titulo}"`;
  if (a.tipo === "apagar") return `Apagar "${nomeDoCaminho(a.caminho!)}"`;
  return `Editar "${nomeDoCaminho(a.caminho!)}"`;
}

function rotuloPasta(pasta: string): string {
  const rotulos: Record<string, string> = {
    tarefas: "a tarefa",
    notas: "a nota",
    referencias: "a referência",
    reunioes: "a reunião",
    "pdi/metas": "a meta",
    "pdi/entregas": "a entrega",
  };
  return rotulos[pasta] ?? "o item";
}

function nomeDoCaminho(caminho: string): string {
  return caminho.split("/").pop()!.replace(/\.md$/, "");
}

/**
 * Executa uma ação aprovada.
 *
 * Tudo que a IA grava sai marcado com `ia_sugeriu: true`, para você saber
 * depois o que foi você que escreveu e o que foi a máquina.
 */
export async function executar(
  cfg: Settings,
  acao: Acao,
  acervo: ItemRepo[],
): Promise<string> {
  if (acao.tipo === "apagar") {
    const alvo = acervo.find((i) => i.caminho === acao.caminho);
    if (!alvo) throw new Error(`Não achei o arquivo ${acao.caminho}.`);
    await apagar(cfg, alvo.caminho, alvo.sha);
    invalidarCache();
    return alvo.caminho;
  }

  if (acao.tipo === "editar") {
    // relê antes de gravar: o arquivo pode ter mudado desde o carregamento
    const { texto, sha } = await ler(cfg, acao.caminho!);
    const doc = lerMarkdown(texto);
    const conteudo = escreverMarkdown({
      dados: {
        ...doc.dados,
        ...(acao.campos ?? {}),
        ...(acao.titulo ? { titulo: acao.titulo } : {}),
        ia_sugeriu: true,
      },
      corpo: acao.corpo ?? doc.corpo,
    });
    await gravar(cfg, acao.caminho!, conteudo, sha, `IA edita ${acao.caminho}`);
    invalidarCache();
    return acao.caminho!;
  }

  // criar
  const caminho = nomeLivre(
    acao.pasta!,
    acao.titulo!,
    acervo.map((i) => i.caminho),
  );
  const conteudo = escreverMarkdown({
    dados: {
      titulo: acao.titulo,
      tipo: tipoDaPasta(acao.pasta!),
      ...(acao.pasta === "pdi/entregas" || acao.pasta === "reunioes"
        ? { data: hojeISO() }
        : {}),
      ...(acao.campos ?? {}),
      ia_sugeriu: true,
    },
    corpo: acao.corpo ?? "",
  });
  await gravar(cfg, caminho, conteudo, undefined, `IA cria ${caminho}`);
  invalidarCache();
  return caminho;
}

function tipoDaPasta(pasta: string): string {
  const tipos: Record<string, string> = {
    tarefas: "tarefa",
    notas: "nota",
    referencias: "referencia",
    reunioes: "reuniao",
    "pdi/metas": "meta",
    "pdi/entregas": "entrega",
  };
  return tipos[pasta] ?? "nota";
}

/** Instruções que ensinam a IA a propor ações. Vai junto do prompt. */
export const INSTRUCAO_ACOES = `
QUANDO O HUGO PEDIR PARA CRIAR, EDITAR OU APAGAR ALGO:

Responda em duas partes. Primeiro uma frase curta em português dizendo o que
você vai fazer. Depois um bloco assim:

\`\`\`acoes
[
  {
    "tipo": "criar",
    "pasta": "tarefas",
    "titulo": "Revisar a proposta",
    "campos": { "status": "a-fazer", "prazo": "2026-08-20", "tags": ["cliente"] },
    "corpo": "Detalhes aqui.",
    "motivo": "você pediu uma tarefa para sexta"
  }
]
\`\`\`

REGRAS:
- "pasta" só pode ser: tarefas, notas, referencias, reunioes, pdi/metas, pdi/entregas
- para editar ou apagar, use "caminho" com o caminho exato do arquivo, que você
  encontra no conteúdo que recebeu
- datas sempre AAAA-MM-DD; status de tarefa: a-fazer, fazendo ou feito
- para ligar um item a outro, escreva [[Título do outro item]] dentro do corpo
- proponha só o que foi pedido. Não invente tarefas "que podem ser úteis"
- se não tiver certeza do que ele quer, pergunte em vez de propor ação
- NUNCA proponha apagar algo sem que ele tenha pedido explicitamente

O Hugo vê cada ação num cartão e aprova uma por uma. Nada é gravado sem isso.
`;
