# Documento de Fundação e Arquitetura Definitivo: Projeto Klaus

> **Classificação:** Documento Técnico de Engenharia Reversa e Referência Arquitetural  
> **Versão da Codebase:** `1.82.3`  
> **Autor:** Arquiteto de Software de Elite & Engenheiro de Produto  
> **Público-Alvo:** Engenheiros de Software, Arquitetos e Agentes de Inteligência Artificial

---

## 1. A Filosofia e o Coração do Klaus

### 1.1 Local-First & Data Ownership Absoluto

O Klaus foi projetado sob a premissa de que **o usuário é o único e soberano dono de seus dados**. Não existe servidor proprietário, banco de dados hospedado em nuvem de terceiros (como Supabase, Firebase ou MongoDB Atlas), nem camada de backend proprietária intermediando as requisições. 

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR DO USUÁRIO                            │
│                                                                        │
│  ┌────────────────────────┐         ┌───────────────────────────────┐  │
│  │   Memória RAM (State)  │ ◄────── │  IndexedDB (Fila de Sync &    │  │
│  │  useItemRepo / SWR     │         │  Storage Offline Persistente) │  │
│  └───────────┬────────────┘         └───────────────▲───────────────┘  │
│              │                                      │                  │
│              ▼                                      │                  │
│  ┌────────────────────────┐                         │                  │
│  │   Sync Queue & Hooks   │ ────────────────────────┘                  │
│  │ (useSalvar/MutacaoItem)│                                            │
│  └───────────┬────────────┘                                            │
└──────────────┼─────────────────────────────────────────────────────────┘
               │
               │ HTTPS Direto (CORS: Bearer Token)
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│             GITHUB REPOSITORY (Dados Privados do Usuário)              │
│                                                                        │
│  api.github.com/repos/:owner/:repo/contents                            │
│  ├── notas/*.md                                                        │
│  ├── tarefas/*.md                                                      │
│  ├── pdi/metas/*.md                                                    │
│  ├── pdi/entregas/*.md                                                 │
│  ├── referencias/*.md  (+ referencias/imagens/*)                       │
│  ├── lousas/*.md                                                       │
│  └── contatos/*.md                                                     │
└────────────────────────────────────────────────────────────────────────┘
```

#### Princípios de Engenharia Implementados:
1. **Comunicação Direta Client-to-API:** O frontend em React comunica-se diretamente com os endpoints REST e GraphQL da GitHub API (`https://api.github.com`) através de Personal Access Tokens (PATs) fine-grained com permissão restrita de *Contents: Read & Write*.
2. **Armazenamento de Segredos Exclusivo do Cliente:** O token do GitHub e a chave da API do Gemini residem exclusivamente no `localStorage` do navegador do usuário.
3. **Custo Operacional Zero:** O aplicativo é distribuído como um Single Page Application (SPA) estático hospedado no GitHub Pages, eliminando custos de infraestrutura de servidor.

---

### 1.2 Markdown com Frontmatter como Banco de Dados Distribuído

No Klaus, o formato Markdown (`.md`) com Frontmatter YAML não é apenas um formato de exibição textual: **ele atua como o motor de banco de dados NoSQL/Documental**.

```markdown
---
id: 2026-08-15-briefing-design-system
titulo: "Briefing do Novo Design System"
tipo: nota
subtipo: briefing
tags:
  - design
  - branding
criado_em: "2026-08-15T10:00:00.000Z"
atualizado_em: "2026-08-28T09:00:00.000Z"
relacionamentos:
  - "@Definição de Tipografia"
---

# Contexto do Projeto

Discutido com @Ana Silva o alinhamento de componentes visuais para o cliente.

- [ ] Definir paleta primária
- [x] Extrair tokens do Figma

## Tempo
- 2026-08-28 14:00 → 14:25 (25min)
```

#### Regras Fundamentais de Parsing e Tolerância a Falhas:
- **Tolerância Absoluta a Falhas de Sintaxe:** Se o usuário editar um arquivo manualmente no celular ou via interface web do GitHub e corromper o cabeçalho YAML, a função `lerMarkdown()` em `src/lib/markdown.ts` recupera o arquivo tratando o texto bruto como corpo da nota em vez de estourar exceções.
- **Preservação de Campos Desconhecidos (`mesclarFrontmatter`):** Nenhum salvamento gera um frontmatter do zero. A função mescla os metadados gerenciados pelo Klaus sobre os metadados existentes no objeto `bruto`, garantindo que campos inseridos por editores externos ou outras ferramentas de IA nunca sejam sobrescritos.

---

## 2. Modelo de Dados e Entidades

Todas as entidades estendem o contrato fundamental `ItemBase` definido em `src/lib/tipos.ts`.

```typescript
export interface ItemBase {
  readonly caminho: string;
  readonly sha: string;
  readonly bruto: Frontmatter;
  readonly id?: string;
  titulo: string;
  corpo: string;
  criadoEm?: string;
  atualizadoEm?: string;
  relacionamentos?: string[];
}
```

---

### 2.1 Entidade: Nota (`Nota`)

- **Pasta no Repositório:** `notas/`
- **Regra de Nomenclatura:** `notas/AAAA-MM-DD-slug-do-titulo.md`

#### Schema TypeScript:
```typescript
export interface Nota extends ItemBase {
  tipo: "nota" | "referencia" | "rascunho";
  subtipo?: "nota" | "reuniao" | "briefing" | "rascunho";
  tags: string[];
  atualizado?: string;
  dataReuniao?: string;
  participantes?: string[];
}
```

#### Exemplo Físico no Disco/GitHub:
```markdown
---
id: 2026-08-28-reuniao-alinhamento-branding
titulo: "Reunião de Alinhamento de Branding"
tipo: nota
subtipo: reuniao
data_reuniao: "2026-08-28"
participantes:
  - "Hugo Silva"
  - "Mariana Costa"
tags:
  - briefing
  - identidade-visual
criado_em: "2026-08-28T14:30:00.000Z"
atualizado_em: "2026-08-28T15:10:00.000Z"
---

Alinhamento sobre a tipografia primária com @Mariana Costa.

- [x] Validar fontes com licença comercial
- [ ] Exportar guia de estilos para o time
```

---

### 2.2 Entidade: Tarefa (`Tarefa`)

- **Pasta no Repositório:** `tarefas/`
- **Regra de Nomenclatura:** `tarefas/AAAA-MM-DD-slug-do-titulo.md`

#### Schema TypeScript:
```typescript
export const STATUS_TAREFA = ["a-fazer", "fazendo", "feito"] as const;
export type StatusTarefa = (typeof STATUS_TAREFA)[number];

export interface Tarefa extends ItemBase {
  status: StatusTarefa;
  prazo?: string; // Formatos: "AAAA-MM-DD" ou "AAAA-MM-DD → AAAA-MM-DD"
  tags: string[];
  prioridade?: "baixa" | "media" | "alta" | "urgente";
  pomodorosEstimados?: number;
  pomodorosRealizados?: number;
  pomodoro?: number;
  Pomodoro?: number;
  fraturados?: number;
}
```

#### Exemplo Físico no Disco/GitHub:
```markdown
---
id: 2026-08-28-finalizar-vetorizacao-logo
titulo: "Finalizar Vetorização do Logo"
tipo: tarefa
status: fazendo
prazo: "2026-08-30"
prioridade: alta
tags:
  - vetor
  - logo
pomodoros_estimados: 4
pomodoros_realizados: 2
criado_em: "2026-08-28T09:00:00.000Z"
atualizado_em: "2026-08-28T11:45:00.000Z"
---

Ajustar as curvas Bézier da versão monocromática.

- [x] Ajustar espessura das linhas externas
- [ ] Gerar arquivos EPS e SVG

## Tempo
- 2026-08-28 11:20 → 11:45 (25min)
- 2026-08-28 10:50 → 11:15 (25min)
```

---

### 2.3 Entidade: Meta do PDI (`Meta`)

- **Pasta no Repositório:** `pdi/metas/`
- **Regra de Nomenclatura:** `pdi/metas/slug-identificador.md`

#### Schema TypeScript:
```typescript
export const STATUS_META = ["a-fazer", "em-andamento", "concluida"] as const;
export type StatusMeta = (typeof STATUS_META)[number];

export interface Meta extends ItemBase {
  readonly id: string; // Chave semântica sem .md usada pelas Entregas
  status: StatusMeta;
  prazo?: string;
  indicador: string; // Critério de medição de sucesso
  tags?: string[];
}
```

#### Exemplo Físico no Disco/GitHub:
```markdown
---
id: dominar-direcao-arte-3d
titulo: "Dominar Direção de Arte em 3D"
tipo: meta
status: em-andamento
prazo: "2026-12-31"
indicador: "Publicar 3 projetos autorais completos no portfólio"
tags:
  - pdi
  - 3d
criado_em: "2026-01-10T08:00:00.000Z"
atualizado_em: "2026-08-20T17:00:00.000Z"
---

Desenvolver competências em iluminação e renderização avançada com Blender e Cinema 4D.
```

---

### 2.4 Entidade: Entrega do PDI (`Entrega`)

- **Pasta no Repositório:** `pdi/entregas/`
- **Regra de Nomenclatura:** `pdi/entregas/AAAA-MM-DD-slug-do-titulo.md`

#### Schema TypeScript:
```typescript
export interface Entrega extends ItemBase {
  readonly id: string;
  data: string; // Data ISO da entrega (AAAA-MM-DD)
  metas: string[]; // Array com os IDs das metas vinculadas
  iaSugeriu: boolean; // Flag de verificação humana pendente
}
```

#### Exemplo Físico no Disco/GitHub:
```markdown
---
id: 2026-08-28-render-cena-iluminacao-estudio
titulo: "Render de Cena com Iluminação de Estúdio"
tipo: entrega
data: "2026-08-28"
metas:
  - dominar-direcao-arte-3d
ia_sugeriu: true
criado_em: "2026-08-28T16:00:00.000Z"
atualizado_em: "2026-08-28T16:00:00.000Z"
---

Finalizada a primeira cena com mapa HDRI personalizado e texturização procedural.
```

---

### 2.5 Entidade: Referência Visual (`Referencia`)

- **Pasta no Repositório:** `referencias/` (Imagens salvas em `referencias/imagens/`)
- **Regra de Nomenclatura:** `referencias/AAAA-MM-DD-slug-do-titulo.md`

#### Schema TypeScript:
```typescript
export interface Referencia extends ItemBase {
  readonly id: string;
  imagem?: string; // Caminho relativo dentro do repositório (ex: referencias/imagens/foto.webp)
  fonte?: string;  // URL de origem (Behance, Pinterest, Dribbble)
  tags: string[];
  porque: string;  // Justificativa essencial da coleta
}
```

#### Exemplo Físico no Disco/GitHub:
```markdown
---
id: 2026-08-28-poster-estilo-suico-1960
titulo: "Pôster em Estilo Suíço Anos 60"
tipo: referencia
imagem: referencias/imagens/2026-08-28-poster-suico.webp
fonte: "https://www.behance.net/gallery/exemplos-grid-suico"
porque: "Uso impecável de grid assimétrico de 12 colunas e tipografia grotesca pura."
tags:
  - tipografia
  - grid
  - composicao
criado_em: "2026-08-28T11:00:00.000Z"
atualizado_em: "2026-08-28T11:00:00.000Z"
---

Excelente contraste tonal entre o fundo cru e a tipografia vermelha saturada.
```

---

### 2.6 Entidade: Lousa / Mapa Mental Excalidraw (`Lousa`)

- **Pasta no Repositório:** `lousas/`
- **Regra de Nomenclatura:** `lousas/AAAA-MM-DD-slug-do-titulo.md`

#### Schema TypeScript:
```typescript
export interface Lousa {
  readonly caminho: string;
  readonly sha: string;
  titulo: string;
  tituloOriginal: string;
  dados: LousaDados;
}

export interface LousaDados {
  title?: string;
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: unknown;
}
```

#### Exemplo Físico no Disco/GitHub:
```markdown
---
titulo: "Mapa Mental - Arquitetura de Marca"
tipo: lousa
---
{
  "title": "Mapa Mental - Arquitetura de Marca",
  "elements": [
    {
      "id": "node-1",
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 80,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#89b4fa",
      "fillStyle": "solid",
      "strokeWidth": 2
    }
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": 20
  },
  "files": {}
}
```

---

### 2.7 Entidade: Contato (`Contato`)

- **Pasta no Repositório:** `contatos/`
- **Regra de Nomenclatura:** `contatos/AAAA-MM-DD-slug-do-nome.md`

#### Schema TypeScript:
```typescript
export interface Contato extends ItemBase {
  readonly id: string;
  cargo?: string;
  empresa?: string;
  email?: string;
  telefone?: string;
  paiId?: string; // Chave do líder/contato pai na árvore hierárquica
  tags: string[];
  propriedades: Record<string, string>; // Propriedades dinâmicas arbitrárias
  atualizado?: string;
}
```

#### Exemplo Físico no Disco/GitHub:
```markdown
---
id: 2026-08-28-roberto-almeida
titulo: "Roberto Almeida"
tipo: contato
cargo: "Diretor de Criação"
empresa: "Agência Prisma"
email: "roberto@prismadesign.com.br"
telefone: "+55 11 98888-7777"
pai_id: "2026-08-20-carlos-eduardo"
tags:
  - cliente
  - lideranca
aniversario: "1985-04-12"
software_preferido: "Figma"
criado_em: "2026-08-28T08:00:00.000Z"
atualizado_em: "2026-08-28T08:00:00.000Z"
---

Contato principal para o projeto de rebranding corporativo.
```

---

## 3. O Motor de Parsing e Serialização (O Core)

Toda a transformação entre strings Markdown e estruturas de dados em memória é orquestrada em `src/lib/markdown.ts`.

```
                            FLUXO DE PARSING
                     (Do Arquivo para a Memória)
                     
 ┌────────────────┐
 │ Arquivo .md no │
 │ Repositório    │
 └───────┬────────┘
         │
         ▼
 ┌─────────────────────────────────────────────────────────┐
 │ lerMarkdown(texto)                                      │
 │                                                         │
 │  1. Regex: /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/          │
 │     ├── [Sucesso] ──► js-yaml.load(yaml) ──► { dados } │
 │     │                                                   │
 │     └── [Sem YAML] ─► Parser JSON Fallback (Lousas)     │
 │                                                         │
 │  2. Corpo = texto.slice(offsetFrontmatter)              │
 │  3. Em caso de YAML corrompido: corpo = texto total     │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Objeto Documento em Memória                             │
 │ { dados: Frontmatter, corpo: string }                   │
 └─────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────

                          FLUXO DE SERIALIZAÇÃO
                       (Da Memória para o Arquivo)
                       
 ┌─────────────────────────────────────────────────────────┐
 │ Objeto Tipado em Memória                                │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ entidadeParaArquivo(item)                               │
 │                                                         │
 │  1. mesclarFrontmatter(item.bruto, { novosCampos })     │
 │     (Mantém campos desconhecidos de outras IAs intactos)│
 │                                                         │
 │  2. escreverMarkdown({ dados, corpo })                  │
 │     ├── Filtra campos nulos/vazios/indefinidos          │
 │     ├── js-yaml.dump(dados, { lineWidth: -1, noRefs })  │
 │     └── Monta: "---\n" + yaml + "---\n\n" + corpo       │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌────────────────┐
 │ Arquivo .md    │
 │ Gravado via Git│
 └────────────────┘
```

### 3.1 Parser: De Markdown para Memória

```typescript
import { load, dump } from "js-yaml";

const SEPARADOR = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function lerMarkdown(texto: string): Documento {
  const encontrado = texto.match(SEPARADOR);
  if (!encontrado) {
    const limpo = (texto || "").trim();
    // Fallback de detecção de Lousas em JSON puro
    if (limpo.startsWith("{") && limpo.endsWith("}")) {
      try {
        const parsed = JSON.parse(limpo);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const t = parsed.title || parsed.titulo || parsed.dados?.titulo;
          if (t && typeof t === "string") {
            return { dados: { titulo: t.trim(), tipo: "lousa" }, corpo: texto };
          }
        }
      } catch (erro) {
        logger.warn("Falha ao analisar o JSON de lousa", erro);
      }
    }
    return { dados: {}, corpo: texto };
  }

  try {
    const analisado = load(encontrado[1]);
    const dados =
      analisado && typeof analisado === "object" && !Array.isArray(analisado)
        ? (analisado as Frontmatter)
        : {};
    return { dados, corpo: texto.slice(encontrado[0].length) };
  } catch (erro) {
    logger.error("Falha ao analisar o YAML do frontmatter", erro);
    // Recuperação graciosa: devolve todo o conteúdo sem perder dados do usuário
    return { dados: {}, corpo: texto };
  }
}
```

---

### 3.2 Serializer: Da Memória para Markdown

```typescript
export function escreverMarkdown(doc: Documento): string {
  const campos = Object.entries(doc.dados).filter(
    ([k, v]) =>
      (!k.startsWith("_") || k === "_visibilidade" || k === "_rotulos" || k === "_coresTags") &&
      v !== undefined &&
      v !== null &&
      v !== "",
  );
  if (campos.length === 0) return doc.corpo;

  const yamlTexto = dump(Object.fromEntries(campos), {
    lineWidth: -1, // Evita quebra artificial de strings longas
    noRefs: true,    // Impede a geração de âncoras/referências circulares YAML (&id / *id)
  });
  return `---\n${yamlTexto}---\n\n${doc.corpo.replace(/^\n+/, "")}`;
}
```

---

### 3.3 Parser e Manipulação de Subtarefas

O Klaus trata checkboxes no formato GFM Markdown como dados estruturados via expressões regulares em `src/lib/tarefas.ts`:

```typescript
const CAIXA = /^(\s*)[-*]\s+\[( |x|X)\]\s+(.*)$/;

export function lerSubtarefas(corpo: string): Subtarefa[] {
  const saida: Subtarefa[] = [];
  corpo.split("\n").forEach((linha, i) => {
    const m = linha.match(CAIXA);
    if (m) {
      saida.push({
        linha: i,
        feita: m[2].toLowerCase() === "x",
        texto: m[3].trim(),
      });
    }
  });
  return saida;
}
```

---

### 3.4 Sanitização do Editor BlockNote e `@menções`

O editor visual Notion-like utiliza o **BlockNote (ProseMirror)**. Para evitar escapes indevidos de caracteres Markdown gerados pelo motor do editor, a função `restaurarWikilinks` atua na saída de dados:

```typescript
export function restaurarWikilinks(markdown: string): string {
  if (!markdown) return "";

  // 1. Isola blocos de código para não corromper códigos técnicos
  const blocosCodigo: string[] = [];
  const semCodigo = markdown.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    blocosCodigo.push(match);
    return `__BLOCO_CODIGO_${blocosCodigo.length - 1}__`;
  });

  // 2. Converte \[\[alvo\]\] e [[alvo]] para @alvo
  let limpo = semCodigo.replace(
    /\\?\[\\?\[([^\[\]\n]{1,200}?)\\?\]\\?\]/g,
    (_todo, alvo: string) => {
      const barra = alvo.indexOf("|");
      const escolhido = barra >= 0 ? alvo.slice(barra + 1) : alvo;
      return `@${escolhido.trim()}`;
    },
  );

  // 3. Converte URLs coladas do app (?abrir=...) para @menções
  limpo = limpo.replace(
    /(?:https?:\/\/[^\s)]+|#\/[^\s)]+)\?abrir=([a-zA-Z0-9_%.-]+)/g,
    (_todo, rawCaminho) => {
      const dec = decodeURIComponent(rawCaminho);
      const nomeOuTitulo = dec.split("/").pop()!.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
      return `@${nomeOuTitulo}`;
    }
  );

  // 4. Restaura blocos de código originais intactos
  limpo = limpo.replace(/__BLOCO_CODIGO_(\d+)__/g, (_m, idx) => blocosCodigo[Number(idx)] ?? "");
  return limpo;
}
```

---

## 4. O Grafo: Relacionamentos, Links e Integridade

A interconexão de conhecimento no Klaus é gerenciada em `src/lib/links.ts` e visualizada em 3D em `src/lib/grafo.ts`.

### 4.1 Expressão Regular de Menções e Wikilinks

```typescript
const LETRA = "a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ";
const MIOLO = `${LETRA}0-9_\\- \\t`;

export const PADRAO = new RegExp(
  "(?:" +
    // 1. [[alvo]] e [[alvo|texto exibido]]
    "\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\]" +
    "|" +
    // 2. @alvo com guardas negativas contra e-mails e números isolados
    `(?<![\\w.@-])@([${LETRA}][${MIOLO}]{1,99}?)(?=[^${MIOLO}]|$)` +
    "|" +
    // 3. URLs coladas da aplicação
    "(?:https?:\\/\\/[^\\s)]+|#\\/[^\\s)]+)\\?abrir=([a-zA-Z0-9_%.-]+)" +
    ")",
  "g",
);
```

---

### 4.2 Resolução de Backlinks em Memória (`mencoesA`)

O índice de relacionamentos é montado dinamicamente a partir dos documentos carregados em memória sem necessidade de persistir índices no disco:

```typescript
export function mencoesA(
  caminhoAlvo: string,
  itens: ItemRepo[],
  indice: Map<string, Alvo>,
): Mencao[] {
  const saida: Mencao[] = [];

  for (const item of itens) {
    if (item.caminho === caminhoAlvo) continue;

    const links = extrairLinks(item.texto, indice);
    const acertou = links.find((l) => l.alvo?.caminho === caminhoAlvo);
    if (!acertou) continue;

    saida.push({
      caminho: item.caminho,
      titulo: tituloProvavel(item.doc, item.nome),
      tipo: tipoDoItem(item),
      trecho: recorteEmVolta(item.doc.corpo, acertou.bruto),
    });
  }

  return saida;
}
```

---

### 4.3 Propagação de Renomeações e Integridade Referencial

Quando um título de documento é alterado, o Klaus propaga a renomeação em todos os arquivos dependentes com verificação de prefixos para evitar falsos positivos:

```typescript
export async function propagarRenomeacao(
  cfg: any,
  todos: ItemRepo[],
  tituloAntigo: string,
  tituloNovo: string,
): Promise<ResultadoRenomeacao> {
  const antigoLimpo = tituloAntigo.trim();
  const novoLimpo = tituloNovo.trim();

  // Mapeia títulos mais específicos para não quebrar prefixos (ex: "@Reunião" vs "@Reunião Geral")
  const titulosMaisLongos = todos
    .map((i) => tituloProvavel(i.doc, i.nome))
    .filter((t) => t && t.length > antigoLimpo.length && t.startsWith(`${antigoLimpo} `));

  function ehPrefixoDeOutroTitulo(texto: string, pos: number): boolean {
    return titulosMaisLongos.some((t) => texto.startsWith(t, pos));
  }

  const regArroba = new RegExp(`@${escaparRegex(antigoLimpo)}(?![\\w\\u00C0-\\u024F])`, "g");
  const regColchetes = new RegExp(`\\[\\[${escaparRegex(antigoLimpo)}\\]\\]`, "g");

  let sucessoContagem = 0;
  const falhas: string[] = [];

  for (const item of todos) {
    if (!item.texto) continue;
    let textoNovo = item.texto;
    textoNovo = textoNovo.replace(regArroba, (casado, deslocamento: number, textoInteiro: string) =>
      ehPrefixoDeOutroTitulo(textoInteiro, deslocamento + 1) ? casado : `@${novoLimpo}`,
    );
    textoNovo = textoNovo.replace(regColchetes, `[[${novoLimpo}]]`);

    if (textoNovo !== item.texto) {
      try {
        const novoSha = await gravarComRetry(
          cfg,
          item.caminho,
          textoNovo,
          item.sha,
          `refatorar: renomear menção de ${antigoLimpo} para ${novoLimpo}`,
        );
        const docAtualizado = lerMarkdown(textoNovo);
        atualizarCacheLocal(item.caminho, textoNovo, docAtualizado, novoSha);
        sucessoContagem++;
      } catch {
        falhas.push(item.caminho);
      }
    }
  }

  if (sucessoContagem > 0) {
    invalidarCache();
    dispararAtualizacaoAcervo();
    notificarOutrasAbas();
  }

  return { atualizados: sucessoContagem, falhas };
}
```

---

## 5. Arquitetura de Persistência, Sync e Estado Global

### 5.1 O Ciclo de Vida do Dado e Algoritmo de 2 Requisições

Para contornar o limite de 5.000 requisições/hora da API do GitHub, `src/lib/repo.ts` implementa um carregamento completo em lote:

```
REQUISIÇÃO 1 (Git Trees API):
GET https://api.github.com/repos/:owner/:repo/git/trees/:branch?recursive=1
Devolve lista de todas as folhas (path, sha, size).
                     │
                     ▼
COMPARAÇÃO COM CACHE LOCAL (RAM + IndexedDB `sha_cache`):
Identifica quais SHAs mudaram ou não estão em cache.
                     │
                     ▼
REQUISIÇÃO 2 (GraphQL Batch Query - se houver SHAs faltando):
POST https://api.github.com/graphql
Query em lote solicitando até 100 blobs simultaneamente:
query {
  repository(owner: "...", name: "...") {
    f0: object(expression: "main:notas/nota1.md") { ... on Blob { text } }
    f1: object(expression: "main:tarefas/tarefa1.md") { ... on Blob { text } }
  }
}
```

#### Imutabilidade por SHA:
O Git Blob SHA é derivado diretamente do hash do conteúdo (`sha1("blob " + size + "\0" + content)`). Portanto:
$$\text{SHA idêntico} \implies \text{Conteúdo idêntico}$$
Isso permite manter os textos no IndexedDB de forma perene; ao salvar um arquivo, apenas o arquivo alterado é baixado novamente.

---

### 5.2 Gerenciamento de Estado e SWR (Stale-While-Revalidate)

O Klaus utiliza uma arquitetura baseada em **Custom Hooks Especializados + Event Bus Nativo + BroadcastChannel**:

| Hook / Módulo | Responsabilidade |
|---|---|
| `useItemRepo` | Carregamento com SWR (0ms delay via cache IndexedDB/RAM), mesclagem de rascunhos offline em voo e escuta reativa do acervo. |
| `useSalvar` | Gravação otimista (Optimistic UI), enfileiramento na Sync Queue, atualização do cache e disparo do bus de eventos. |
| `useMutacaoItem` | Mutação de alto nível com debounce seguro para digitação contínua e flush automático de timers no desmonte do componente. |
| `syncChannel.ts` | Comunicação entre múltiplas abas abertas no navegador via `BroadcastChannel("klaus_sync_channel")`. |
| `eventos.ts` | Barramento de eventos no DOM (`"acervo-atualizado"`) com debounce e filtragem de pastas. |

---

### 5.3 Resiliência Offline e Resolução de Conflitos (HTTP 409 / 422)

O módulo `src/lib/offlineQueue.ts` gerencia a persistência de rascunhos quando não há conexão:

1. **Gravação Otimista:** Ao salvar offline, o item é persistido no IndexedDB (`sync_queue`) com um SHA temporário (`temp_...`).
2. **Coalescing de Rascunhos:** Múltiplas edições do mesmo arquivo em modo offline são fundidas na última versão antes do envio.
3. **Detecção Semântica de Conflito 409:** Em `src/lib/github.ts`, caso o GitHub retorne conflito de SHA desatualizado, a função `conteudosSemelhantes()` compara o documento remoto com a versão enviada. Se a alteração for apenas um save redundante ou marcação de timestamp, o SHA remoto é aceito sem alertar erro; se o texto for diferente, a operação entra em estado de conflito visual para decisão manual do usuário.

---

## 6. Interface, Views e Componentes Visuais

```
┌────────────────────────────────────────────────────────────────────────┐
│                              APP SHELL                                 │
│                                                                        │
│ ┌───────────────┐ ┌──────────────────────────────────────────────────┐ │
│ │ Navegação     │ │ Header: Logo Mobile, Abas do Workspace,          │ │
│ │ Lateral       │ │ Audio Player, Central de Notificações, Busca (⌘K)│ │
│ │ (Desktop)     │ ├──────────────────────────────────────────────────┤ │
│ │               │ │                                                  │ │
│ │ - Início      │ │ Workspace Multi-Abas / Roteador Principal:       │ │
│ │ - Tarefas     │ │                                                  │ │
│ │ - Notas       │ │ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ │ │
│ │ - Lousas      │ │ │   Kanban    │ │ Whiteboard  │ │ BlockNote    │ │ │
│ │ - PDI         │ │ │  (@dnd-kit) │ │(Excalidraw) │ │(EditorNotion)│ │ │
│ │ - Referências │ │ └─────────────┘ └─────────────┘ └──────────────┘ │ │
│ │ - Contatos    │ │                                                  │ │
│ │ - Chat IA     │ │                                                  │ │
│ │ - Ajustes     │ │                                                  │ │
│ └───────────────┘ └──────────────────────────────────────────────────┘ │
│                   Dock Inferior Mobile (Frosted Glass com Safe Area)   │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Mapeamento das Principais Views

1. **Kanban de Tarefas (`src/components/Quadro.tsx`):**
   - Construído com `@dnd-kit/core` e `@dnd-kit/sortable`.
   - Permite arrastar tarefas entre as colunas (`a-fazer`, `fazendo`, `feito`).
   - Acessibilidade por teclado nativa (`sortableKeyboardCoordinates`).
   - Mapeia o progresso do método Pomodoro com o componente `PrismasFoco`.

2. **Editor de Documentos Notion-like (`src/components/EditorNotion.tsx`):**
   - Construído sobre o `@blocknote/core` e `@blocknote/mantine`.
   - Slash menu customizado em português (`/`).
   - Gatilho `@` para autocompletar menções de outros arquivos com recálculo de alvos via `SuggestionMenuController`.
   - Destaque cromático de menções sem mutação de DOM através da API nativa do navegador `CSS.highlights`.

3. **Lousas e Mapas Mentais (`src/pages/Lousas.tsx`):**
   - Integração completa com `@excalidraw/excalidraw`.
   - Persiste a cena vetorial e metadados no corpo do arquivo Markdown no formato JSON puro.

4. **Workspace Multi-Abas em Tela Cheia (`src/components/workspace/WorkspaceContext.tsx`):**
   - Sistema de abas no topo da aplicação com suporte a arrastar e reordenar abas, auto-save debounced e navegação sequencial entre arquivos da mesma pasta.

---

### 6.2 Dívidas Técnicas e Pontos de Atenção Catalogados

> [!WARNING]
> **Ofuscação de Credenciais vs. Criptografia Real:**
> O token do GitHub e a chave Gemini são ofuscados usando um algoritmo XOR com salt salvo no próprio `localStorage` (`sessionKeyBuffer`). Isso esconde as chaves de inspeções superficiais, mas **não protege contra ataques de XSS**. A solução definitiva (derivação PBKDF2 $\to$ AES-GCM via senha mestra em memória) já possui scaffolding em `settings.ts`, mas ainda não está ativada.

> [!NOTE]
> **Offline Parcial (Ausência de Service Worker Completo):**
> Embora a sincronização de dados utilize IndexedDB (`offlineQueue.ts`), os arquivos JS/CSS do bundle dependem do cache HTTP do navegador. Se o usuário abrir a aplicação em uma aba nova sem conexão, o app não carregará até que seja implementado um plugin de Service Worker (PWA).

> [!NOTE]
> **Notificações em Background:**
> Os lembretes e escalonamentos de notificação para o Telegram (`src/lib/inbox.ts`) executam dentro de loops do React no navegador. Lembretes não são disparados com a aba do navegador fechada.

---

## 7. Sumário de Comandos e Rotinas de Manutenção

- **Testes Unitários e de Componentes (387 testes):**
  ```bash
  npm test
  ```
- **Compilação e Atualização Automática de Arquitetura:**
  ```bash
  npm run build
  ```
- **Validação de Código / Linter:**
  ```bash
  npm run lint
  ```
