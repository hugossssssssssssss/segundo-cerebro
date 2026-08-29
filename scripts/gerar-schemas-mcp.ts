/**
 * Gera especificações JSON Schema e definições MCP (Model Context Protocol).
 *
 * Permite que agentes externos (Claude Desktop, Antigravity, Cursor, scripts locais)
 * interajam com os dados do repositório do Klaus respeitando as regras de validação.
 *
 * Roda no build:
 *   node --experimental-strip-types scripts/gerar-schemas-mcp.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_DOCS = join(RAIZ, "docs");
const DIR_SCHEMAS = join(DIR_DOCS, "schemas");

mkdirSync(DIR_SCHEMAS, { recursive: true });

// 1. JSON Schemas para as entidades
const SCHEMAS: Record<string, object> = {
  nota: {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Nota",
    type: "object",
    properties: {
      id: { type: "string", description: "Identificador estável do item" },
      titulo: { type: "string", description: "Título legível da nota" },
      tipo: { type: "string", enum: ["nota", "referencia", "rascunho"], default: "nota" },
      subtipo: { type: "string", enum: ["nota", "reuniao", "briefing", "rascunho"] },
      tags: { type: "array", items: { type: "string" } },
      criado_em: { type: "string", format: "date-time" },
      atualizado_em: { type: "string", format: "date-time" },
      data_reuniao: { type: "string", format: "date" },
      participantes: { type: "array", items: { type: "string" } },
      relacionamentos: { type: "array", items: { type: "string" } },
      ia_sugeriu: { type: "boolean" },
    },
    required: ["titulo"],
    additionalProperties: true,
  },
  tarefa: {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Tarefa",
    type: "object",
    properties: {
      id: { type: "string", description: "Identificador estável da tarefa" },
      titulo: { type: "string", description: "Título da tarefa" },
      tipo: { type: "string", enum: ["tarefa"], default: "tarefa" },
      status: { type: "string", enum: ["a-fazer", "fazendo", "feito"], default: "a-fazer" },
      prazo: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "AAAA-MM-DD" },
      prioridade: { type: "string", enum: ["baixa", "media", "alta", "urgente"] },
      tags: { type: "array", items: { type: "string" } },
      pomodoros_estimados: { type: "number", minimum: 0 },
      pomodoros_realizados: { type: "number", minimum: 0 },
      criado_em: { type: "string", format: "date-time" },
      atualizado_em: { type: "string", format: "date-time" },
      ia_sugeriu: { type: "boolean" },
    },
    required: ["titulo", "status"],
    additionalProperties: true,
  },
  meta: {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Meta (PDI)",
    type: "object",
    properties: {
      id: { type: "string", description: "Identificador estável ou slug da meta" },
      titulo: { type: "string", description: "Onde você quer chegar" },
      tipo: { type: "string", enum: ["meta"], default: "meta" },
      status: { type: "string", enum: ["a-fazer", "em-andamento", "concluida"], default: "a-fazer" },
      prazo: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      indicador: { type: "string", description: "Como saber se chegou lá" },
      tags: { type: "array", items: { type: "string" } },
      criado_em: { type: "string", format: "date-time" },
      atualizado_em: { type: "string", format: "date-time" },
      ia_sugeriu: { type: "boolean" },
    },
    required: ["titulo", "status"],
    additionalProperties: true,
  },
  entrega: {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Entrega (PDI)",
    type: "object",
    properties: {
      id: { type: "string" },
      titulo: { type: "string", description: "O que foi entregue" },
      tipo: { type: "string", enum: ["entrega"], default: "entrega" },
      data: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      metas: { type: "array", items: { type: "string" }, description: "IDs das metas vinculadas" },
      ia_sugeriu: { type: "boolean" },
      criado_em: { type: "string", format: "date-time" },
      atualizado_em: { type: "string", format: "date-time" },
    },
    required: ["titulo", "data", "metas"],
    additionalProperties: true,
  },
  contato: {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Contato",
    type: "object",
    properties: {
      id: { type: "string" },
      titulo: { type: "string", description: "Nome do contato" },
      cargo: { type: "string" },
      empresa: { type: "string" },
      email: { type: "string" },
      telefone: { type: "string" },
      pai_id: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
    },
    required: ["titulo"],
    additionalProperties: true,
  },
};

for (const [nome, schema] of Object.entries(SCHEMAS)) {
  const caminho = join(DIR_SCHEMAS, `${nome}.schema.json`);
  writeFileSync(caminho, JSON.stringify(schema, null, 2) + "\n", "utf8");
}

// 2. Definições de Ferramentas no padrão Model Context Protocol (MCP)
const MCP_TOOLS = {
  $schema: "https://modelcontextprotocol.io/schema/tools.json",
  name: "klaus-segundo-cerebro",
  description: "Ferramentas do Klaus para agentes de IA interagirem com arquivos Markdown soberanos.",
  tools: [
    {
      name: "klaus_criar_item",
      description: "Cria um novo item (.md) em uma pasta do Klaus com frontmatter YAML padronizado.",
      inputSchema: {
        type: "object",
        properties: {
          pasta: {
            type: "string",
            enum: ["tarefas", "notas", "referencias", "reunioes", "pdi/metas", "pdi/entregas", "contatos"],
            description: "Pasta de destino dentro do repositório",
          },
          titulo: { type: "string", description: "Título do item" },
          corpo: { type: "string", description: "Conteúdo livre em Markdown. Use @Título para mencionar outros itens." },
          status: { type: "string", enum: ["a-fazer", "fazendo", "feito"], description: "Exclusivo para tarefas" },
          prazo: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Data de entrega ou limite AAAA-MM-DD" },
          tags: { type: "array", items: { type: "string" } },
          motivo: { type: "string", description: "Justificativa da criação para o usuário" },
        },
        required: ["pasta", "titulo"],
      },
    },
    {
      name: "klaus_editar_item",
      description: "Modifica os metadados ou o corpo de um arquivo .md existente no repositório Klaus.",
      inputSchema: {
        type: "object",
        properties: {
          caminho: { type: "string", description: "Caminho relativo exato do arquivo (ex: tarefas/2026-08-29-design.md)" },
          titulo: { type: "string", description: "Novo título se for alterar" },
          corpo: { type: "string", description: "Novo corpo em Markdown. Use '<limpar>' para esvaziar." },
          status: { type: "string", enum: ["a-fazer", "fazendo", "feito"] },
          prazo: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          tags: { type: "array", items: { type: "string" } },
          motivo: { type: "string", description: "Motivo da alteração" },
        },
        required: ["caminho"],
      },
    },
    {
      name: "klaus_apagar_item",
      description: "Exclui um arquivo .md do repositório após confirmação humana.",
      inputSchema: {
        type: "object",
        properties: {
          caminho: { type: "string", description: "Caminho relativo exato do arquivo a excluir" },
          motivo: { type: "string", description: "Justificativa da exclusão" },
        },
        required: ["caminho"],
      },
    },
  ],
};

const caminhoMcp = join(DIR_DOCS, "mcp-klaus-tools.json");
writeFileSync(caminhoMcp, JSON.stringify(MCP_TOOLS, null, 2) + "\n", "utf8");

console.log("✓ Schemas JSON e definições MCP gerados com sucesso em docs/");
