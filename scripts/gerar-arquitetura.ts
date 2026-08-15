/**
 * Gera o ARCHITECTURE.md a partir do código real.
 *
 * Por que isto existe: documentação escrita à mão envelhece em silêncio.
 * Qualquer IA que entre neste repositório vai ler o código antes de ler
 * qualquer .md — e muitas nunca leem .md nenhum. Então o mapa do projeto
 * precisa ser DERIVADO do código, não mantido em paralelo a ele.
 *
 * O que ele lê:
 *   src/lib/tipos.ts      → PASTAS, interfaces de entidade, status válidos
 *   src/lib/entidades.ts  → funções de conversão e o `tipo` gravado no arquivo
 *   src/pages/*.tsx       → quais telas já usam os hooks padrão
 *
 * Roda sozinho no `npm run build`. Para rodar à mão:
 *   node --experimental-strip-types scripts/gerar-arquitetura.ts
 */

import ts from "typescript";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = join(RAIZ, "ARCHITECTURE.md");

/* ----------------------------------------------------------- utilidades */

function lerFonte(caminhoRelativo: string): ts.SourceFile {
  const caminho = join(RAIZ, caminhoRelativo);
  return ts.createSourceFile(
    caminho,
    readFileSync(caminho, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
}

/** Primeira linha do comentário /** ... *\/ logo acima do nó. */
function docDe(no: ts.Node, fonte: ts.SourceFile): string {
  const texto = fonte.getFullText();
  const trechos = ts.getLeadingCommentRanges(texto, no.getFullStart()) ?? [];
  const bloco = trechos
    .map((t) => texto.slice(t.pos, t.end))
    .filter((c) => c.startsWith("/**"))
    .pop();
  if (!bloco) return "";

  return bloco
    .replace(/^\/\*\*/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((l) => l.replace(/^\s*\*ˍ?/, "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

/* ------------------------------------------------------- leitura: tipos */

type Campo = { nome: string; tipo: string; opcional: boolean; doc: string };
type Entidade = { nome: string; estende: string | null; campos: Campo[]; doc: string };

const fonteTipos = lerFonte("src/lib/tipos.ts");

/** PASTAS: chave lógica → caminho no repositório de dados. */
function lerPastas(): Record<string, string> {
  const pastas: Record<string, string> = {};
  fonteTipos.forEachChild((no) => {
    if (!ts.isVariableStatement(no)) return;
    for (const decl of no.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== "PASTAS") continue;
      let obj = decl.initializer;
      if (obj && ts.isAsExpression(obj)) obj = obj.expression;
      if (!obj || !ts.isObjectLiteralExpression(obj)) continue;
      for (const p of obj.properties) {
        if (ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer)) {
          pastas[p.name.getText(fonteTipos)] = p.initializer.text;
        }
      }
    }
  });
  return pastas;
}

/** Constantes de status: STATUS_TAREFA, STATUS_META, ... */
function lerStatus(): Record<string, string[]> {
  const status: Record<string, string[]> = {};
  fonteTipos.forEachChild((no) => {
    if (!ts.isVariableStatement(no)) return;
    for (const decl of no.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.name.text.startsWith("STATUS_")) continue;
      let arr = decl.initializer;
      if (arr && ts.isAsExpression(arr)) arr = arr.expression;
      if (!arr || !ts.isArrayLiteralExpression(arr)) continue;
      status[decl.name.text] = arr.elements
        .filter(ts.isStringLiteral)
        .map((e) => e.text);
    }
  });
  return status;
}

function lerEntidades(): Entidade[] {
  const entidades: Entidade[] = [];
  fonteTipos.forEachChild((no) => {
    if (!ts.isInterfaceDeclaration(no)) return;

    const estende =
      no.heritageClauses?.[0]?.types?.[0]?.expression.getText(fonteTipos) ?? null;

    const campos: Campo[] = no.members.filter(ts.isPropertySignature).map((m) => ({
      nome: m.name.getText(fonteTipos),
      tipo: m.type?.getText(fonteTipos) ?? "unknown",
      opcional: Boolean(m.questionToken),
      doc: docDe(m, fonteTipos),
    }));

    entidades.push({ nome: no.name.text, estende, campos, doc: docDe(no, fonteTipos) });
  });
  return entidades;
}

/* --------------------------------------------------- leitura: entidades */

const textoEntidades = readFileSync(join(RAIZ, "src/lib/entidades.ts"), "utf8");
const fonteEntidades = lerFonte("src/lib/entidades.ts");

/** Nomes das funções exportadas de entidades.ts. */
function lerFuncoesEntidades(): string[] {
  const nomes: string[] = [];
  fonteEntidades.forEachChild((no) => {
    if (!ts.isFunctionDeclaration(no) || !no.name) return;
    const exportada = no.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (exportada) nomes.push(no.name.text);
  });
  return nomes;
}

/**
 * O valor gravado em `tipo:` dentro de cada `*ParaArquivo`.
 * É o que aparece no frontmatter do .md — a ponte entre o tipo TS e o arquivo.
 */
function lerTipoDeFrontmatter(nomeFuncao: string): string {
  const corpo = textoEntidades.split(`export function ${nomeFuncao}`)[1];
  if (!corpo) return "";
  const trecho = corpo.slice(0, 600);
  return trecho.match(/\btipo:\s*(?:[\w.]+\s*\|\|\s*)?"([a-z-]+)"/)?.[1] ?? "";
}

/* ------------------------------------------------------- leitura: telas */

type Tela = { arquivo: string; ler: string; gravar: string };

/**
 * Placar da migração aos hooks padrão.
 *
 * Uma tela que nem toca no repositório (Conversor, Transcritor) não está
 * "faltando migrar" — está fora do assunto. Marcar essas como "não" faria o
 * documento mentir sobre o que ainda há para fazer.
 */
function lerTelas(): Tela[] {
  const dir = join(RAIZ, "src/pages");
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .sort()
    .map((f) => {
      const txt = readFileSync(join(dir, f), "utf8");

      const usaHookLer = txt.includes("useItemRepo(");
      const usaHookGravar = txt.includes("useSalvar(");
      const leRepoNaMao = txt.includes("carregarRepo(");
      const gravaNaMao = /\bgravar\(|\bapagar\(|invalidarCache\(/.test(txt);

      return {
        arquivo: f,
        ler: usaHookLer ? "hook" : leRepoNaMao ? "na mão" : "não usa",
        gravar: usaHookGravar ? "hook" : gravaNaMao ? "na mão" : "não usa",
      };
    });
}

/* ------------------------------------------------------------- montagem */

const pastas = lerPastas();
const status = lerStatus();
const entidades = lerEntidades();
const funcoes = lerFuncoesEntidades();
const telas = lerTelas();

/** Liga cada entidade à sua pasta e às suas funções de conversão. */
const CHAVE_POR_ENTIDADE: Record<string, string> = {
  Nota: "notas",
  Tarefa: "tarefas",
  Meta: "metas",
  Entrega: "entregas",
  Referencia: "referencias",
  Lousa: "lousas",
};

const doApp = entidades.filter((e) => e.nome in CHAVE_POR_ENTIDADE);

function linhaTabela(e: Entidade): string {
  const chave = CHAVE_POR_ENTIDADE[e.nome];
  const ler = funcoes.find((f) => f.toLowerCase() === `como${e.nome}`.toLowerCase());
  const gravar = funcoes.find(
    (f) => f.toLowerCase() === `${e.nome}ParaArquivo`.toLowerCase(),
  );
  const tipoFm = gravar ? lerTipoDeFrontmatter(gravar) : "";
  return `| ${e.nome} | \`${e.nome}\` | \`PASTAS.${chave}\` → \`${pastas[chave]}/\` | ${
    tipoFm ? `\`${tipoFm}\`` : "—"
  } | ${ler ? `\`${ler}()\`` : "—"} | ${gravar ? `\`${gravar}()\`` : "—"} |`;
}

/** Um `|` cru dentro de uma célula parte a tabela em duas colunas. */
function escapar(texto: string): string {
  return texto.replace(/\|/g, "\\|");
}

function blocoCampos(e: Entidade): string {
  const base = entidades.find((x) => x.nome === "ItemBase");
  const herdados =
    e.estende === "ItemBase" && base
      ? base.campos.map((c) => ({
          ...c,
          doc: [c.doc, "_(de ItemBase)_"].filter(Boolean).join(" "),
        }))
      : [];
  const todos = [...herdados, ...e.campos];

  const linhas = todos
    .map(
      (c) =>
        `| \`${c.nome}\` | \`${escapar(c.tipo)}\` | ${c.opcional ? "não" : "sim"} | ${
          escapar(c.doc) || "—"
        } |`,
    )
    .join("\n");

  // As linhas em branco são obrigatórias: sem elas o markdown gruda o
  // parágrafo na tabela e a tabela deixa de ser tabela.
  return [
    `### ${e.nome}`,
    "",
    e.doc || "_(sem descrição)_",
    "",
    "| Campo | Tipo | Obrigatório | O que é |",
    "|---|---|---|---|",
    linhas,
  ].join("\n");
}

const tabelaStatus = Object.entries(status)
  .map(([nome, vals]) => `| \`${nome}\` | ${vals.map((v) => `\`${v}\``).join(", ")} |`)
  .join("\n");

const tabelaTelas = telas
  .map((t) => `| \`src/pages/${t.arquivo}\` | ${t.ler} | ${t.gravar} |`)
  .join("\n");

const hoje = new Date().toISOString().slice(0, 10);

const conteudo = `# Arquitetura do Klaus

> **Gerado automaticamente por \`scripts/gerar-arquitetura.ts\` em ${hoje}.**
> Não edite este arquivo à mão — ele é reescrito a cada \`npm run build\`.
> Para mudar o que está aqui, mude \`src/lib/tipos.ts\` e \`src/lib/entidades.ts\`.

Se você é uma IA trabalhando neste repositório: **comece por aqui**, depois leia
\`src/lib/tipos.ts\`. Os tipos são o contrato — o compilador recusa código que os viole.

## O que este app é

Uma SPA em React + TypeScript, sem backend. Os dados são arquivos \`.md\` num
repositório separado do GitHub, lidos e gravados pela Contents API direto do
navegador. O token do GitHub vive só no \`localStorage\`, lido por \`lerConfig()\`.

Não existe banco de dados, não existe servidor, não existe índice derivado.
Os arquivos \`.md\` são a única fonte de verdade.

## Entidades

Cada entidade tem um tipo em \`src/lib/tipos.ts\`, uma pasta no repositório de
dados e um par de funções de conversão em \`src/lib/entidades.ts\`.

| Entidade | Tipo TS | Pasta no repo | \`tipo:\` no frontmatter | Ler do arquivo | Gravar no arquivo |
|---|---|---|---|---|---|
${doApp.map(linhaTabela).join("\n")}

## Campos de cada entidade

${doApp.map(blocoCampos).join("\n\n")}

## Valores de status válidos

Status fora desta lista são normalizados para o primeiro valor ao ler o arquivo —
um \`.md\` editado à mão no celular nunca quebra a tela.

| Constante | Valores aceitos |
|---|---|
${tabelaStatus}

## Os dois hooks padrão

Toda tela principal carrega com \`useItemRepo\` e grava com \`useSalvar\`. Eles
existem para que o boilerplate — e os erros de ordem que ele escondia — não
sejam reescritos em cada tela.

\`\`\`tsx
const { itens, acervo, titulos, carregando, erro, recarregar } =
  useItemRepo(cfg, PASTAS.notas, (item) =>
    comoNota(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
  );

const { salvarTexto, apagarItem, salvando, erro: erroSalvar } = useSalvar(cfg);
\`\`\`

\`useItemRepo\` cuida do \`jaCarregouRef\` (que quebra o laço de recarregamento),
escuta \`"acervo-atualizado"\` sozinho e expõe \`recarregar()\`.

\`useSalvar\` garante a ordem: \`gravar()\` → \`atualizarCacheLocal()\` com o SHA
**real** → \`invalidarCache()\` → evento \`"acervo-atualizado"\`.

### Telas e o estado da migração

\`hook\` = usa o hook padrão · \`na mão\` = ainda chama \`repo.ts\`/\`github.ts\`
direto · \`não usa\` = não toca no repositório de dados.

| Tela | Carregar | Gravar |
|---|---|---|
${tabelaTelas}

## Como criar uma tela nova

1. Declare a entidade em \`src/lib/tipos.ts\` e adicione a pasta em \`PASTAS\`.
2. Escreva \`como<Entidade>\` e \`<entidade>ParaArquivo\` em \`src/lib/entidades.ts\`.
   O \`paraArquivo\` **tem** que passar por \`mesclarFrontmatter\`.
3. Copie o padrão de \`src/pages/Notas.tsx\`.
4. Carregue com \`useItemRepo(cfg, PASTAS.suaPasta, comoSuaEntidade)\`.
5. Grave com \`useSalvar(cfg)\` — uma única instância por tela.
6. Rode \`npm test\`. O \`ARCHITECTURE.md\` se atualiza sozinho no próximo build.

## Regras inegociáveis

- **Frontmatter passa por \`mesclarFrontmatter()\` antes de qualquer save.** Um
  campo que o app não conhece — escrito à mão no celular — tem que sobreviver ao
  próximo save feito pelo app. Por isso todo item carrega \`bruto\`.
- **O cache só é atualizado com o SHA real devolvido pelo GitHub**, nunca antes
  de \`gravar()\` retornar. Atualizar antes envenena o mapa \`textoPorSha\`.
- **\`invalidarCache()\` e o evento \`"acervo-atualizado"\` são disparados pelo
  \`useSalvar\`** — não chame na mão numa tela.
- **Uma instância de \`useSalvar\` por tela.** Duas criam dois estados
  \`salvando\`/\`erro\` independentes e um deles nunca chega à tela.
- **O token do GitHub e a chave do Gemini só existem via \`lerConfig()\`.** Nunca
  no código, nunca em outro storage.
- **Sem backend PRÓPRIO.** Não existe servidor nosso, e não deve passar a
  existir. Mas a regra antiga dizia "nenhum \`fetch\` além de \`api.github.com\`"
  e isso deixou de ser verdade em cinco lugares — a regra escrita assim não
  protegia mais nada, só enganava quem a lesse. As saídas de rede de hoje,
  todas conscientes:
  | Destino | Onde | Por quê |
  |---|---|---|
  | \`api.github.com\` | \`github.ts\`, \`repo.ts\` | os seus dados |
  | \`generativelanguage.googleapis.com\` | \`gemini.ts\` | chat, transcrição |
  | \`api.telegram.org\` | \`inbox.ts\` | notificações |
  | \`script.google.com\` | \`inbox.ts\` | e-mail, URL que você configura |
  | \`corsproxy.io\`, \`allorigins.win\` | \`clipper.ts\` | **proxy de terceiros**, avisado na tela |
  | \`cdnjs.cloudflare.com\` | \`Conversor.tsx\` | cMaps do pdf.js — **deveria ser empacotado** |

  Antes de adicionar a sétima, pergunte se ela precisa mesmo existir. A
  transcrição local e o OCR rodam no próprio navegador, sem rede nenhuma —
  esse é o padrão a seguir.
- **Sem índice derivado.** \`carregarRepo\` usa cache por SHA; a verdade continua
  sendo o \`.md\`.

## Convenções de nomenclatura

| O que é | Convenção | Exemplo |
|---|---|---|
| Pasta no repositório | constante em \`PASTAS\` | \`PASTAS.notas\` |
| Tipo de entidade | interface em \`tipos.ts\` | \`Nota\`, \`Tarefa\` |
| Ler do arquivo | \`como\` + entidade | \`comoNota()\` |
| Gravar no arquivo | entidade + \`ParaArquivo\` | \`notaParaArquivo()\` |
| Hook de tela | \`use\` + o que faz | \`useItemRepo\`, \`useSalvar\` |
| Campo de frontmatter | snake_case | \`ia_sugeriu\`, \`criado_em\` |
| Variável em código | camelCase em português | \`carregando\`, \`salvando\` |
| Evento de sincronização | string kebab | \`"acervo-atualizado"\` |
`;

/**
 * Só reescreve quando algo além da data mudou.
 *
 * Sem isto, todo build sujaria o git com uma alteração de uma linha só.
 */
const semData = (t: string) => t.replace(/em \d{4}-\d{2}-\d{2}/, "em DATA");
const anterior = existsSync(SAIDA) ? readFileSync(SAIDA, "utf8") : "";

if (semData(anterior) === semData(conteudo)) {
  console.log("ARCHITECTURE.md já está atualizado.");
} else {
  writeFileSync(SAIDA, conteudo, "utf8");
  console.log(
    `ARCHITECTURE.md gerado: ${doApp.length} entidades, ${telas.length} telas.`,
  );
}
