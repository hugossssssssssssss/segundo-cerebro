#!/usr/bin/env node

/**
 * Klaus CLI — Ferramental Oficial de Desenvolvimento de Extensões do Klaus
 *
 * Comandos:
 *   node scripts/klaus-cli.js new <id> [nome]
 *   node scripts/klaus-cli.js pack <id> [arquivo-saida]
 *   node scripts/klaus-cli.js unpack <arquivo.klaus-ext.json>
 *   node scripts/klaus-cli.js validate
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PROJETOS_DIR = path.join(ROOT_DIR, ".klaus", "projetos");

const KLAUS_PACKAGE_FORMAT = "klaus-extension-v1";

const CATEGORIAS_VALIDAS = new Set([
  "design",
  "productivity",
  "ai",
  "utilities",
  "personal",
  "produtividade",
  "ia",
  "utilitarios",
  "pessoal",
]);

const PERMISSOES_VALIDAS = new Set([
  "theme",
  "events",
  "storage",
  "github",
  "ui",
]);

function printHeader() {
  console.log("\x1b[33m\x1b[1m[Klaus CLI]\x1b[0m Ferramental Oficial do Ecossistema Klaus\n");
}

function printHelp() {
  printHeader();
  console.log("Uso:");
  console.log("  node scripts/klaus-cli.js new <id> [nome]        Cria o boilerplate de um novo projeto");
  console.log("  node scripts/klaus-cli.js pack <id> [saida.json]  Empacota um projeto em .klaus-ext.json");
  console.log("  node scripts/klaus-cli.js unpack <pacote.json>    Extrai um pacote para .klaus/projetos/");
  console.log("  node scripts/klaus-cli.js validate                Valida todos os manifestos de projetos");
  console.log("");
}

function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") {
    return { valid: false, errors: ["Manifesto deve ser um objeto JSON."] };
  }
  if (!manifest.id || typeof manifest.id !== "string" || !/^[a-z0-9_-]+$/i.test(manifest.id)) {
    errors.push("Campo 'id' ausente ou com caracteres inválidos.");
  }
  if (!manifest.name || typeof manifest.name !== "string" || !manifest.name.trim()) {
    errors.push("Campo 'name' obrigatório ausente.");
  }
  if (!manifest.version || typeof manifest.version !== "string") {
    errors.push("Campo 'version' obrigatório ausente.");
  }
  if (!manifest.entry || typeof manifest.entry !== "string") {
    errors.push("Campo 'entry' obrigatório ausente.");
  }
  if (manifest.category && !CATEGORIAS_VALIDAS.has(manifest.category)) {
    errors.push(`Categoria desconhecida: "${manifest.category}".`);
  }
  if (manifest.permissions) {
    if (!Array.isArray(manifest.permissions)) {
      errors.push("Campo 'permissions' deve ser um array.");
    } else {
      for (const p of manifest.permissions) {
        if (!PERMISSOES_VALIDAS.has(p)) {
          errors.push(`Permissão desconhecida: "${p}".`);
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function cmdNew(id, nomeArg) {
  printHeader();
  if (!id) {
    console.error("\x1b[31mErro: Informe o identificador único do projeto (ex: meu-app)\x1b[0m");
    process.exit(1);
  }

  const idLimpo = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const nome = nomeArg || idLimpo.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const destino = path.join(PROJETOS_DIR, idLimpo);

  if (fs.existsSync(destino)) {
    console.error(`\x1b[31mErro: A pasta já existe em ${destino}\x1b[0m`);
    process.exit(1);
  }

  fs.mkdirSync(destino, { recursive: true });

  const manifest = {
    id: idLimpo,
    name: nome,
    version: "1.0.0",
    description: `Extensão ${nome} integrada ao Klaus.`,
    entry: "index.html",
    icon: "FolderGit2",
    color: "#f59e0b",
    category: "utilitarios",
    permissions: ["theme", "ui", "storage"],
    theme: {
      supportsDark: true,
      accentColor: "#f59e0b",
    },
    sandbox: {
      allowScripts: true,
      allowPopups: true,
      allowSameOrigin: false,
    },
  };

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${nome}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 2rem;
      background-color: var(--klaus-bg, #0f172a);
      color: var(--klaus-fg, #f8fafc);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
    }
    .card {
      background: var(--klaus-card, #1e293b);
      border: 1px solid var(--klaus-border, #334155);
      border-radius: 1rem;
      padding: 2rem;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    h1 {
      margin-top: 0;
      color: var(--klaus-primary, #f59e0b);
    }
    button {
      background: var(--klaus-primary, #f59e0b);
      color: var(--klaus-primary-fg, #ffffff);
      border: 0;
      padding: 0.6rem 1.2rem;
      border-radius: 0.5rem;
      font-weight: bold;
      cursor: pointer;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${nome}</h1>
    <p>Sua nova extensão Klaus está pronta para ser customizada!</p>
    <p style="font-size: 0.85rem; opacity: 0.8;">As variáveis de tema <code>--klaus-bg</code>, <code>--klaus-primary</code> são injetadas automaticamente.</p>
    <button onclick="alert('Klaus App Engine funcionando!')">Testar Ação</button>
  </div>
</body>
</html>
`;

  fs.writeFileSync(path.join(destino, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
  fs.writeFileSync(path.join(destino, "index.html"), htmlContent, "utf-8");

  console.log(`\x1b[32m✔ Projeto criado com sucesso!\x1b[0m`);
  console.log(`  Pasta:    \x1b[36m.klaus/projetos/${idLimpo}/\x1b[0m`);
  console.log(`  Manifest: \x1b[36m.klaus/projetos/${idLimpo}/manifest.json\x1b[0m`);
  console.log(`  Entrada:  \x1b[36m.klaus/projetos/${idLimpo}/index.html\x1b[0m\n`);
  console.log("Você já pode visualizar e editar seu projeto dentro do Klaus!");
}

function cmdPack(id, arquivoSaida) {
  printHeader();
  if (!id) {
    console.error("\x1b[31mErro: Informe o identificador do projeto para empacotar.\x1b[0m");
    process.exit(1);
  }

  const pasta = path.join(PROJETOS_DIR, id);
  const manifestPath = path.join(pasta, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    console.error(`\x1b[31mErro: Manifesto não encontrado em ${manifestPath}\x1b[0m`);
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch (err) {
    console.error(`\x1b[31mErro ao ler manifest.json: ${err.message}\x1b[0m`);
    process.exit(1);
  }

  const validacao = validateManifest(manifest);
  if (!validacao.valid) {
    console.error("\x1b[31mManifesto inválido:\x1b[0m");
    for (const e of validacao.errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  // Coleta todos os arquivos da pasta
  const files = {};
  const itens = fs.readdirSync(pasta);
  for (const item of itens) {
    if (item === "manifest.json" || item.startsWith(".")) continue;
    const itemPath = path.join(pasta, item);
    if (fs.statSync(itemPath).isFile()) {
      files[item] = fs.readFileSync(itemPath, "utf-8");
    }
  }

  const entry = manifest.entry || "index.html";
  if (!files[entry]) {
    console.error(`\x1b[31mErro: Arquivo de entrada '${entry}' declarado no manifesto não existe na pasta.\x1b[0m`);
    process.exit(1);
  }

  const bundle = {
    format: KLAUS_PACKAGE_FORMAT,
    manifest,
    files,
    createdAt: new Date().toISOString(),
  };

  const outPath = arquivoSaida || path.join(ROOT_DIR, `${id}.klaus-ext.json`);
  fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2), "utf-8");

  console.log(`\x1b[32m✔ Pacote Klaus Extension gerado com sucesso!\x1b[0m`);
  console.log(`  Arquivo: \x1b[36m${outPath}\x1b[0m`);
  console.log(`  Arquivos empacotados: ${Object.keys(files).length + 1} (incluindo manifest.json)\n`);
}

function cmdUnpack(caminhoPacote) {
  printHeader();
  if (!caminhoPacote || !fs.existsSync(caminhoPacote)) {
    console.error("\x1b[31mErro: Arquivo de pacote não encontrado.\x1b[0m");
    process.exit(1);
  }

  let bundle;
  try {
    bundle = JSON.parse(fs.readFileSync(caminhoPacote, "utf-8"));
  } catch (err) {
    console.error(`\x1b[31mErro ao ler pacote: ${err.message}\x1b[0m`);
    process.exit(1);
  }

  if (bundle.format !== KLAUS_PACKAGE_FORMAT) {
    console.error(`\x1b[31mErro: Formato de pacote incompatível (${bundle.format})\x1b[0m`);
    process.exit(1);
  }

  const validacao = validateManifest(bundle.manifest);
  if (!validacao.valid) {
    console.error("\x1b[31mManifesto do pacote inválido:\x1b[0m");
    for (const e of validacao.errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const destino = path.join(PROJETOS_DIR, bundle.manifest.id);
  fs.mkdirSync(destino, { recursive: true });

  fs.writeFileSync(path.join(destino, "manifest.json"), JSON.stringify(bundle.manifest, null, 2), "utf-8");
  for (const [nome, conteudo] of Object.entries(bundle.files || {})) {
    fs.writeFileSync(path.join(destino, nome), conteudo, "utf-8");
  }

  console.log(`\x1b[32m✔ Pacote desempacotado com sucesso!\x1b[0m`);
  console.log(`  Destino: \x1b[36m.klaus/projetos/${bundle.manifest.id}/\x1b[0m\n`);
}

function cmdValidate() {
  printHeader();
  if (!fs.existsSync(PROJETOS_DIR)) {
    console.log("Nenhum projeto encontrado em .klaus/projetos/.");
    return;
  }

  const pastas = fs.readdirSync(PROJETOS_DIR);
  let total = 0;
  let erros = 0;

  for (const p of pastas) {
    const manifestPath = path.join(PROJETOS_DIR, p, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;

    total++;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      const res = validateManifest(manifest);
      if (res.valid) {
        console.log(`\x1b[32m✔\x1b[0m [${manifest.id}] "${manifest.name}" v${manifest.version} — Válido`);
      } else {
        erros++;
        console.log(`\x1b[31m✖\x1b[0m [${manifest.id || p}] Erros:`);
        for (const e of res.errors) console.log(`    - ${e}`);
      }
    } catch (err) {
      erros++;
      console.log(`\x1b[31m✖\x1b[0m [${p}] JSON corrompido: ${err.message}`);
    }
  }

  console.log(`\nVerificação concluída: ${total} projeto(s) analisado(s), ${erros} erro(s).`);
  if (erros > 0) process.exit(1);
}

// ── Roteador Principal de Comandos ──────────────────────────────────────────
const [, , comando, ...args] = process.argv;

switch (comando) {
  case "new":
    cmdNew(args[0], args[1]);
    break;
  case "pack":
    cmdPack(args[0], args[1]);
    break;
  case "unpack":
    cmdUnpack(args[0]);
    break;
  case "validate":
    cmdValidate();
    break;
  default:
    printHelp();
}
