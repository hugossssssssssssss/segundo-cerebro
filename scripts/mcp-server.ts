/**
 * Servidor Model Context Protocol (MCP) para o Klaus.
 *
 * Permite que clientes compatíveis com MCP (Claude Desktop, Antigravity, Cursor, etc.)
 * se comuniquem diretamente com o acervo do Klaus através do protocolo JSON-RPC sobre stdio.
 *
 * Como rodar:
 *   node --experimental-strip-types scripts/mcp-server.ts
 *
 * Configuração no Claude Desktop (claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "klaus": {
 *       "command": "node",
 *       "args": ["--experimental-strip-types", "/caminho/para/segundo-cerebro/scripts/mcp-server.ts"],
 *       "env": {
 *         "KLAUS_DIR": "/caminho/para/seu/segundo-cerebro-dados"
 *       }
 *     }
 *   }
 * }
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import readline from "node:readline";

// Diretório raiz padrão para busca dos dados markdown
const DIR_DADOS = resolve(process.env.KLAUS_DIR || join(process.cwd(), "..", "segundo-cerebro-dados"));

const FERRAMENTAS = [
  {
    name: "klaus_listar",
    description: "Lista os arquivos Markdown disponíveis no acervo do Klaus, filtrando opcionalmente por pasta.",
    inputSchema: {
      type: "object",
      properties: {
        pasta: {
          type: "string",
          enum: ["tarefas", "notas", "referencias", "pdi/metas", "pdi/entregas", "contatos", "todas"],
          description: "Subpasta do acervo a listar",
          default: "todas",
        },
      },
    },
  },
  {
    name: "klaus_ler",
    description: "Lê o conteúdo completo de um arquivo Markdown com seu frontmatter YAML.",
    inputSchema: {
      type: "object",
      properties: {
        caminho: {
          type: "string",
          description: "Caminho relativo do arquivo (ex: notas/ideia.md ou tarefas/2026-08-30-layout.md)",
        },
      },
      required: ["caminho"],
    },
  },
  {
    name: "klaus_criar",
    description: "Cria um novo item Markdown com frontmatter estruturado no Klaus.",
    inputSchema: {
      type: "object",
      properties: {
        pasta: {
          type: "string",
          enum: ["tarefas", "notas", "referencias", "pdi/metas", "pdi/entregas", "contatos"],
          description: "Pasta de destino",
        },
        titulo: { type: "string", description: "Título do item" },
        corpo: { type: "string", description: "Conteúdo Markdown. Use @Item para referenciar outros documentos." },
        status: { type: "string", enum: ["a-fazer", "fazendo", "feito"] },
        prazo: { type: "string", description: "Data no formato AAAA-MM-DD" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["pasta", "titulo"],
    },
  },
  {
    name: "klaus_editar",
    description: "Edita o corpo ou campos de um arquivo Markdown existente no Klaus.",
    inputSchema: {
      type: "object",
      properties: {
        caminho: { type: "string", description: "Caminho relativo exato do arquivo" },
        titulo: { type: "string", description: "Novo título se for alterar" },
        corpo: { type: "string", description: "Novo corpo do documento" },
        status: { type: "string", enum: ["a-fazer", "fazendo", "feito"] },
        prazo: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["caminho"],
    },
  },
  {
    name: "klaus_buscar",
    description: "Pesquisa por termos em títulos, tags e corpos no acervo do Klaus.",
    inputSchema: {
      type: "object",
      properties: {
        termo: { type: "string", description: "Termo de busca" },
      },
      required: ["termo"],
    },
  },
];

function listarArquivosRecursivo(dir: string, base = ""): string[] {
  if (!existsSync(dir)) return [];
  const resultados: string[] = [];
  const entradas = readdirSync(dir, { withFileTypes: true });

  for (const ent of entradas) {
    if (ent.name.startsWith(".")) continue;
    const caminhoRel = base ? `${base}/${ent.name}` : ent.name;
    const caminhoAbs = join(dir, ent.name);

    if (ent.isDirectory()) {
      resultados.push(...listarArquivosRecursivo(caminhoAbs, caminhoRel));
    } else if (ent.isFile() && ent.name.endsWith(".md")) {
      resultados.push(caminhoRel);
    }
  }
  return resultados;
}

function processarAcao(nome: string, args: Record<string, any>): any {
  if (nome === "klaus_listar") {
    const pasta = args.pasta === "todas" || !args.pasta ? "" : args.pasta;
    const dirAlvo = pasta ? join(DIR_DADOS, pasta) : DIR_DADOS;
    const arquivos = listarArquivosRecursivo(dirAlvo, pasta);
    return {
      total: arquivos.length,
      diretorio: DIR_DADOS,
      arquivos,
    };
  }

  if (nome === "klaus_ler") {
    const caminhoAbs = resolve(DIR_DADOS, args.caminho);
    if (!caminhoAbs.startsWith(DIR_DADOS) || !existsSync(caminhoAbs)) {
      throw new Error(`Arquivo não encontrado: ${args.caminho}`);
    }
    const conteudo = readFileSync(caminhoAbs, "utf8");
    return { caminho: args.caminho, conteudo };
  }

  if (nome === "klaus_criar") {
    const slug = args.titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const hoje = new Date().toISOString().slice(0, 10);
    const nomeArquivo = `${hoje}-${slug}.md`;
    const pastaAbs = resolve(DIR_DADOS, args.pasta);
    mkdirSync(pastaAbs, { recursive: true });
    const caminhoAbs = join(pastaAbs, nomeArquivo);

    const yamlLinhas = [
      "---",
      `titulo: "${args.titulo.replace(/"/g, '\\"')}"`,
      `tipo: ${args.pasta.split("/").pop() || "nota"}`,
      args.status ? `status: ${args.status}` : null,
      args.prazo ? `prazo: "${args.prazo}"` : null,
      args.tags && args.tags.length ? `tags: [${args.tags.map((t: string) => `"${t}"`).join(", ")}]` : null,
      `criado_em: "${new Date().toISOString()}"`,
      "ia_sugeriu: true",
      "---",
      "",
      args.corpo || "",
    ]
      .filter((l) => l !== null)
      .join("\n");

    writeFileSync(caminhoAbs, yamlLinhas, "utf8");
    return {
      sucesso: true,
      caminho: `${args.pasta}/${nomeArquivo}`,
      mensagem: `Arquivo criado com sucesso: ${args.pasta}/${nomeArquivo}`,
    };
  }

  if (nome === "klaus_buscar") {
    const todos = listarArquivosRecursivo(DIR_DADOS);
    const termo = (args.termo || "").toLowerCase();
    const achados: Array<{ caminho: string; titulo: string }> = [];

    for (const arq of todos) {
      try {
        const texto = readFileSync(join(DIR_DADOS, arq), "utf8");
        if (texto.toLowerCase().includes(termo) || arq.toLowerCase().includes(termo)) {
          const primeiraLinha = texto.split("\n").find((l) => l.startsWith("titulo:")) || arq;
          achados.push({
            caminho: arq,
            titulo: primeiraLinha.replace("titulo:", "").replace(/["']/g, "").trim(),
          });
        }
      } catch {}
      if (achados.length >= 20) break;
    }
    return { total: achados.length, resultados: achados };
  }

  throw new Error(`Ferramenta desconhecida: ${nome}`);
}

function responder(id: string | number | null, resultado?: any, erro?: any) {
  const resposta: Record<string, any> = {
    jsonrpc: "2.0",
    id,
  };
  if (erro) {
    resposta.error = erro;
  } else {
    resposta.result = resultado;
  }
  process.stdout.write(JSON.stringify(resposta) + "\n");
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (linha) => {
  const limpa = linha.trim();
  if (!limpa) return;

  try {
    const req = JSON.parse(limpa);
    const { id, method, params } = req;

    if (method === "initialize") {
      responder(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "klaus-mcp-server",
          version: "1.97.0",
        },
      });
      return;
    }

    if (method === "notifications/initialized") {
      // Confirmação do cliente, sem retorno
      return;
    }

    if (method === "tools/list") {
      responder(id, { tools: FERRAMENTAS });
      return;
    }

    if (method === "tools/call") {
      const nomeFerramenta = params?.name;
      const args = params?.arguments || {};
      try {
        const res = processarAcao(nomeFerramenta, args);
        responder(id, {
          content: [
            {
              type: "text",
              text: typeof res === "string" ? res : JSON.stringify(res, null, 2),
            },
          ],
        });
      } catch (e: any) {
        responder(id, {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao executar ${nomeFerramenta}: ${e.message}`,
            },
          ],
        });
      }
      return;
    }

    if (method === "ping") {
      responder(id, {});
      return;
    }

    // Método não suportado
    if (id !== undefined && id !== null) {
      responder(id, undefined, {
        code: -32601,
        message: `Método não encontrado: ${method}`,
      });
    }
  } catch (e: any) {
    responder(null, undefined, {
      code: -32700,
      message: `JSON inválido: ${e.message}`,
    });
  }
});
