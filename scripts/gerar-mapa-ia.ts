/**
 * Gera o AI_CONTEXT.md a partir da análise estática da codebase real do Klaus.
 *
 * Este script varre src/lib, src/pages, src/components e extrai módulos, tipos,
 * funções exportadas e seus comentários JSDoc, combinando com as Regras de Ouro (Golden Rules)
 * e o mapa arquitetural para fornecer o contexto de mais alto valor e menor custo em tokens
 * para Agentes de IA e LLMs trabalhando no repositório.
 *
 * Roda automaticamente no build ou via:
 *   npm run mapa-ia
 */

import ts from "typescript";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = join(RAIZ, "AI_CONTEXT.md");

/* ----------------------------------------------------------- Utilitários AST */

function lerFonte(caminhoAbsoluto: string): ts.SourceFile {
  return ts.createSourceFile(
    caminhoAbsoluto,
    readFileSync(caminhoAbsoluto, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
}

function extrairDocDoNo(no: ts.Node, fonte: ts.SourceFile): string {
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
    .map((l) => l.replace(/^\s*\* ?/, "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

function extrairDocDoArquivo(fonte: ts.SourceFile): string {
  const texto = fonte.getFullText();
  const trechos = ts.getLeadingCommentRanges(texto, 0) ?? [];
  const primeiroBloco = trechos
    .map((t) => texto.slice(t.pos, t.end))
    .filter((c) => c.startsWith("/**"))[0];
  if (!primeiroBloco) return "";

  return primeiroBloco
    .replace(/^\/\*\*/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((l) => l.replace(/^\s*\* ?/, "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

type Exportacao = {
  nome: string;
  tipo: "funcao" | "tipo" | "interface" | "constante" | "classe";
  doc: string;
};

type ModuloLib = {
  arquivo: string;
  caminhoRelativo: string;
  docArquivo: string;
  exportacoes: Exportacao[];
};

function temModificadorExport(no: ts.Node): boolean {
  if (!ts.canHaveModifiers(no)) return false;
  const modificadores = ts.getModifiers(no);
  return Boolean(modificadores?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

function analisarArquivoTs(caminhoAbsoluto: string): ModuloLib {
  const fonte = lerFonte(caminhoAbsoluto);
  const docArquivo = extrairDocDoArquivo(fonte);
  const exportacoes: Exportacao[] = [];

  fonte.forEachChild((no) => {
    const ehExportado = temModificadorExport(no);

    if (ts.isFunctionDeclaration(no) && no.name && ehExportado) {
      exportacoes.push({
        nome: no.name.text,
        tipo: "funcao",
        doc: extrairDocDoNo(no, fonte),
      });
    } else if (ts.isInterfaceDeclaration(no) && ehExportado) {
      exportacoes.push({
        nome: no.name.text,
        tipo: "interface",
        doc: extrairDocDoNo(no, fonte),
      });
    } else if (ts.isTypeAliasDeclaration(no) && ehExportado) {
      exportacoes.push({
        nome: no.name.text,
        tipo: "tipo",
        doc: extrairDocDoNo(no, fonte),
      });
    } else if (ts.isVariableStatement(no) && ehExportado) {
      for (const decl of no.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const nome = decl.name.text;
          const doc = extrairDocDoNo(no, fonte);
          exportacoes.push({
            nome,
            tipo: "constante",
            doc,
          });
        }
      }
    } else if (ts.isClassDeclaration(no) && no.name && ehExportado) {
      exportacoes.push({
        nome: no.name.text,
        tipo: "classe",
        doc: extrairDocDoNo(no, fonte),
      });
    }
  });

  return {
    arquivo: relative(RAIZ, caminhoAbsoluto),
    caminhoRelativo: relative(join(RAIZ, "src"), caminhoAbsoluto),
    docArquivo,
    exportacoes,
  };
}

/* --------------------------------------------------- Varredura de Diretórios */

function varrerLib(): ModuloLib[] {
  const dir = join(RAIZ, "src/lib");
  if (!existsSync(dir)) return [];

  const arquivos = readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"))
    .sort();

  return arquivos.map((arq) => analisarArquivoTs(join(dir, arq)));
}

function varrerPages(): { nome: string; arquivo: string; doc: string }[] {
  const dir = join(RAIZ, "src/pages");
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
    .sort()
    .map((f) => {
      const fonte = lerFonte(join(dir, f));
      const doc = extrairDocDoArquivo(fonte) || `Interface e fluxo da tela de ${f.replace(/\.tsx$/, "")}`;
      return {
        nome: f.replace(/\.tsx$/, ""),
        arquivo: `src/pages/${f}`,
        doc,
      };
    });
}

function varrerComponents(): { categoria: string; componentes: string[] }[] {
  const dir = join(RAIZ, "src/components");
  if (!existsSync(dir)) return [];

  const itens = readdirSync(dir).sort();
  const raizComponentes = itens
    .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
    .map((f) => f.replace(/\.tsx$/, ""));

  const categorias: { categoria: string; componentes: string[] }[] = [
    { categoria: "Componentes Principais (src/components/)", componentes: raizComponentes },
  ];

  const subpastas = itens.filter((f) => {
    const caminho = join(dir, f);
    return statSync(caminho).isDirectory();
  });

  for (const sub of subpastas) {
    const subItens = readdirSync(join(dir, sub))
      .filter((f) => (f.endsWith(".tsx") || f.endsWith(".ts")) && !f.endsWith(".test.tsx"))
      .sort()
      .map((f) => f.replace(/\.(tsx|ts)$/, ""));
    categorias.push({
      categoria: `Sub-componentes: src/components/${sub}/`,
      componentes: subItens,
    });
  }

  return categorias;
}

/* ------------------------------------------------- Categorização de Módulos */

const CATEGORIAS_LIB: { titulo: string; filtro: (m: ModuloLib) => boolean }[] = [
  {
    titulo: "1. Persistência, GitHub API & Sincronização",
    filtro: (m) =>
      ["github.ts", "repo.ts", "offlineQueue.ts", "storageOffline.ts", "syncChannel.ts", "settings.ts", "lixeira.ts"].some(
        (f) => m.arquivo.endsWith(f),
      ),
  },
  {
    titulo: "2. Parser de Markdown, Frontmatter & Dados",
    filtro: (m) =>
      [
        "markdown.ts",
        "entidades.ts",
        "tipos.ts",
        "autoMergeMarkdown.ts",
        "pasteHtmlParaMarkdown.ts",
        "entidadeRegistro.ts",
        "sanitizer.ts",
        "schemas.ts",
      ].some((f) => m.arquivo.endsWith(f)),
  },
  {
    titulo: "3. Hooks de Estado, Leitura e Mutação",
    filtro: (m) =>
      ["useItemRepo.ts", "useMutacaoItem.ts", "useSalvar.ts", "useMediaDevices.ts"].some((f) =>
        m.arquivo.endsWith(f),
      ),
  },
  {
    titulo: "4. Links, Menções (@) & Grafo de Conexões",
    filtro: (m) =>
      ["links.ts", "vinculosNota.ts", "refatorarLinks.ts", "grafo.ts"].some((f) =>
        m.arquivo.endsWith(f),
      ),
  },
  {
    titulo: "5. Inteligência Artificial, Gemini & Ações do Sistema",
    filtro: (m) =>
      [
        "gemini.ts",
        "iaRapida.ts",
        "acoes.ts",
        "ferramentasApp.ts",
        "ragLocal.ts",
        "whisperLocal.ts",
        "ocr.ts",
        "clipper.ts",
      ].some((f) => m.arquivo.endsWith(f)),
  },
  {
    titulo: "6. Busca, Filtros & Recuperação de Dados",
    filtro: (m) =>
      ["busca.ts", "buscaWeb.ts", "favoritos.ts", "historicoAtividade.ts", "inbox.ts"].some((f) =>
        m.arquivo.endsWith(f),
      ),
  },
  {
    titulo: "7. Entidades Especializadas & Regras de Negócio",
    filtro: (m) =>
      [
        "tarefas.ts",
        "pdi.ts",
        "referencias.ts",
        "contatos.ts",
        "subtarefas.ts",
        "templates.ts",
        "noticias.ts",
        "migracaoLote.ts",
        "menuPersonalizado.ts",
      ].some((f) => m.arquivo.endsWith(f)),
  },
  {
    titulo: "8. Infraestrutura, Áudio, Imagens e Utilitários Gerais",
    filtro: (m) =>
      [
        "utils.ts",
        "imagem.ts",
        "pdf.ts",
        "logger.ts",
        "toast.ts",
        "tema.ts",
        "icones.ts",
        "catalogoIconesMarcas.ts",
        "telemetria.ts",
        "telemetriaRequisicoes.ts",
        "versao.ts",
        "camadas.ts",
        "eventos.ts",
        "limpezaProcessos.ts",
        "starterKit.ts",
        "instaladorWorkflow.ts",
        "creditosOpenSource.ts",
        "historicoConversor.ts",
      ].some((f) => m.arquivo.endsWith(f)),
  },
];

/* ------------------------------------------------- Geração do Documento */

function gerarMarkdown(modulos: ModuloLib[]): string {
  const dataHoje = new Date().toISOString().split("T")[0];
  const paginas = varrerPages();
  const componentes = varrerComponents();

  const linhas: string[] = [
    `# Contexto de IA & Mapa de Navegação do Klaus`,
    ``,
    `> **Documento vivo gerado automaticamente por \`scripts/gerar-mapa-ia.ts\` em ${dataHoje}.**`,
    `> Não edite as tabelas de módulos à mão — execute \`npm run mapa-ia\` ou \`npm run build\` para sincronizar com o código.`,
    ``,
    `Este arquivo foi desenhado sob medida para **Agentes de IA e LLMs** que operam no repositório Klaus.`,
    `Ele condensa a arquitetura, regras de ouro, rotas de persistência, ciclo de dados e o catálogo de exportações ativas.`,
    ``,
    `---`,
    ``,
    `## 🏆 Regras de Ouro para IAs (Golden Rules)`,
    ``,
    `Toda IA que realizar manutenção, refatoração ou criação de novas funcionalidades no Klaus **DEVE** seguir estritamente estas diretrizes:`,
    ``,
    `### 1. Fonte da Verdade (Source of Truth)`,
    `- **Arquivos Markdown (\`.md\`) são a ÚNICA fonte de verdade.**`,
    `- **NÃO** crie bancos de dados, storages locais dependentes de servidor ou caches derivados externos. O usuário Hugo edita arquivos diretamente pela interface web do GitHub, e qualquer índice externo divergirá.`,
    `- **Arquitetura 100% Client-Side / Zero Backend**: O app roda estaticamente no GitHub Pages. Todas as operações com dados comunicam-se diretamente com \`api.github.com\` via GitHub Contents API e GraphQL.`,
    ``,
    `### 2. Integridade de Arquivos & Parsing de Markdown`,
    `- **Frontmatter é sempre opcional e tolerante a falhas:** Um arquivo \`.md\` sem frontmatter YAML ou com YAML malformado DEVE continuar abrindo e sendo editável. Perder campos é chato; perder o texto do usuário é inaceitável (veja \`lerMarkdown\` em \`src/lib/markdown.ts\`).`,
    `- **Isole a lógica de parsing da lógica de UI:** Parsing de Markdown, extração de frontmatter e serialização pertencem exclusivamente a \`src/lib/markdown.ts\` e \`src/lib/entidades.ts\`. Componentes de UI não devem fazer regex manual de frontmatter.`,
    `- **Preserve campos desconhecidos:** Sempre utilize \`mesclarFrontmatter(x.bruto, { ... })\` ao salvar para não apagar campos criados por outras IAs ou ferramentas.`,
    ``,
    `### 3. Navegação e Arquivos Reais`,
    `- **NUNCA invente caminhos de arquivos.** Sempre consulte este mapa ou utilize as ferramentas de busca de código antes de tentar importar ou modificar módulos.`,
    `- **Respeite a árvore de dados do repositório privado:**`,
    `  - Notas: \`notas/*.md\``,
    `  - Tarefas: \`tarefas/*.md\``,
    `  - Metas do PDI: \`pdi/metas/*.md\``,
    `  - Entregas do PDI: \`pdi/entregas/*.md\``,
    `  - Referências: \`referencias/*.md\` + \`referencias/imagens/*\``,
    `  - Contatos: \`contatos/*.md\``,
    `  - Lousas: \`lousas/*.md\``,
    ``,
    `### 4. Ciclo de Dados & Performance de Rede`,
    `- **Carregamento em lote:** Utilize os hooks padronizados (\`useItemRepo\`, \`useSalvar\`) ou \`carregarRepo(cfg)\` em \`src/lib/repo.ts\`. **NUNCA** execute \`listar()\` seguido de N requisições \`ler()\`. O Klaus carrega a árvore e os conteúdos via GraphQL em lote com cache inteligente por \`sha\`.`,
    `- **Invalidação mandatória:** Sempre chame \`invalidarCache()\` após qualquer operação de \`gravar()\` ou \`apagar()\`.`,
    ``,
    `### 5. Estilização & Design System`,
    `- **Siga o [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md):** Utilize Tailwind CSS v4 e a suíte de componentes em \`src/components/\` (\`CabecalhoPagina\`, \`BarraFerramentas\`, \`CartaoItem\`, \`SeloStatus\`, \`TagChip\`, etc.) e Radix/Shadcn em \`src/components/ui/\`.`,
    `- **Layout responsivo:** Mais de 50% dos acessos do usuário são via Android / mobile. Toda tela deve se adaptar perfeitamente a viewports estreitas.`,
    ``,
    `### 6. IA e Transparência`,
    `- **Marcação \`ia_sugeriu: true\`:** Qualquer alteração ou inserção automática realizada pela IA nos dados do usuário (especialmente em \`pdi/entregas\`) deve conter a flag \`ia_sugeriu: true\` no frontmatter até que o usuário revise.`,
    ``,
    `### 7. Segurança de Segredos`,
    `- **NUNCA comite segredos ou tokens:** O repositório do código é público. Tokens do GitHub e chaves do Gemini residem unicamente no \`localStorage\` do navegador.`,
    ``,
    `### 8. Versionamento e Finalização Mandatória`,
    `- **Incrementar versão a cada alteração:** Ao adicionar funcionalidades ou correções, incremente a versão em \`package.json\` e em \`src/lib/versao.ts\`.`,
    `- **Garantir testes e build limpos:** Sempre execute \`npm test\` e \`npm run build\` antes de concluir a entrega.`,
    `- **Commit e Push:** Realize \`git add .\`, \`git commit -m "..."\` e \`git push\` ao finalizar a tarefa.`,
    ``,
    `---`,
    ``,
    `## 🧭 Mapeamento Rápido de Arquitetura & Fluxos`,
    ``,
    `### Fluxo de Leitura e Edição`,
    `\`\`\`text`,
    `Navegador (React SPA)`,
    `  │`,
    `  ├── 1. Leitura: useItemRepo() → carregarRepo() → GitHub Contents/GraphQL (Cache por SHA)`,
    `  ├── 2. Parsing: comoNota(), comoTarefa(), etc. em src/lib/entidades.ts`,
    `  ├── 3. Edição: EditorNotion (BlockNote) + Subtarefas (Checkbox inline)`,
    `  ├── 4. Conversão: notaParaArquivo() / mesclarFrontmatter()`,
    `  └── 5. Escrita: useSalvar() → gravar() em src/lib/github.ts → invalidarCache()`,
    `\`\`\``,
    ``,
    `### Hooks de Leitura e Escrita Recomendados`,
    `| Hook / Módulo | Arquivo | Responsabilidade |`,
    `|---|---|---|`,
    `| \`useItemRepo\` | \`src/lib/useItemRepo.ts\` | Hook reativo para carregar itens de uma pasta com cache, estado de carregamento e auto-revalidação |`,
    `| \`useSalvar\` | \`src/lib/useSalvar.ts\` | Hook unificado para gravação, debounce, fila offline e atualização de estado |`,
    `| \`useMutacaoItem\` | \`src/lib/useMutacaoItem.ts\` | Hook para operações atômicas de mutação direta de itens |`,
    `| \`carregarRepo\` | \`src/lib/repo.ts\` | Carrega repositório inteiro em 2 requisições otimizadas reaproveitando SHA |`,
    `| \`gravar\` / \`apagar\` | \`src/lib/github.ts\` | Chamadas diretas à API do GitHub com tratamento de conflitos e limites de taxa |`,
    ``,
    `---`,
    ``,
    `## 📱 Catálogo de Telas e Rotas (\`src/pages/\`)`,
    ``,
    `| Tela | Arquivo | Finalidade Principal |`,
    `|---|---|---|`,
  ];

  for (const pag of paginas) {
    linhas.push(`| **${pag.nome}** | \`${pag.arquivo}\` | ${pag.doc.replace(/\|/g, "\\|")} |`);
  }

  linhas.push(
    ``,
    `---`,
    ``,
    `## 🧩 Catálogo de Componentes (\`src/components/\`)`,
    ``,
  );

  for (const cat of componentes) {
    linhas.push(`### ${cat.categoria}`);
    linhas.push(
      cat.componentes.map((c) => `\`${c}\``).join(", ") || "_(nenhum componente encontrado)_",
    );
    linhas.push(``);
  }

  linhas.push(
    `---`,
    ``,
    `## 📚 Mapeamento Dinâmico de Módulos (\`src/lib/\`)`,
    ``,
    `Abaixo estão os módulos de lógica de negócio e utilitários categorizados por área de atuação:`,
    ``,
  );

  for (const cat of CATEGORIAS_LIB) {
    const modulosNaCategoria = modulos.filter(cat.filtro);
    if (modulosNaCategoria.length === 0) continue;

    linhas.push(`### ${cat.titulo}`);
    linhas.push(``);

    for (const mod of modulosNaCategoria) {
      linhas.push(`#### 📄 \`${mod.arquivo}\``);
      if (mod.docArquivo) {
        linhas.push(`> ${mod.docArquivo}`);
        linhas.push(``);
      }

      if (mod.exportacoes.length > 0) {
        linhas.push(`**Exportações principais:**`);
        for (const exp of mod.exportacoes.slice(0, 15)) {
          const docStr = exp.doc ? ` — _${exp.doc.slice(0, 100)}${exp.doc.length > 100 ? "..." : ""}_` : "";
          linhas.push(`- \`${exp.tipo}\` **\`${exp.nome}\`**${docStr}`);
        }
        if (mod.exportacoes.length > 15) {
          linhas.push(`- _...e mais ${mod.exportacoes.length - 15} exportações secundárias._`);
        }
      } else {
        linhas.push(`_(Exportações internas ou módulo utilitário)_`);
      }
      linhas.push(``);
    }
  }

  return linhas.join("\n") + "\n";
}

/* ---------------------------------------------------------------- Execução */

try {
  console.log("🔍 Analisando módulos de src/lib, src/pages e src/components...");
  const modulos = varrerLib();
  console.log(`📦 Encontrados ${modulos.length} módulos em src/lib.`);

  console.log("📝 Gerando AI_CONTEXT.md...");
  const conteudoMd = gerarMarkdown(modulos);

  writeFileSync(SAIDA, conteudoMd, "utf8");
  console.log(`✅ AI_CONTEXT.md gerado com sucesso em: ${SAIDA}`);
} catch (erro) {
  console.error("❌ Erro ao gerar AI_CONTEXT.md:", erro);
  process.exit(1);
}
