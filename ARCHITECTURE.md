# Arquitetura do Klaus

> **Gerado automaticamente por `scripts/gerar-arquitetura.ts` em 2026-08-17.**
> Não edite este arquivo à mão — ele é reescrito a cada `npm run build`.
> Para mudar o que está aqui, mude `src/lib/tipos.ts` e `src/lib/entidades.ts`.

Se você é uma IA trabalhando neste repositório: **comece por aqui**, depois leia
`src/lib/tipos.ts`. Os tipos são o contrato — o compilador recusa código que os viole.

## O que este app é

Uma SPA em React + TypeScript, sem backend. Os dados são arquivos `.md` num
repositório separado do GitHub, lidos e gravados pela Contents API direto do
navegador. O token do GitHub vive só no `localStorage`, lido por `lerConfig()`.

Não existe banco de dados, não existe servidor, não existe índice derivado.
Os arquivos `.md` são a única fonte de verdade.

## Entidades

Cada entidade tem um tipo em `src/lib/tipos.ts`, uma pasta no repositório de
dados e um par de funções de conversão em `src/lib/entidades.ts`.

| Entidade | Tipo TS | Pasta no repo | `tipo:` no frontmatter | Ler do arquivo | Gravar no arquivo |
|---|---|---|---|---|---|
| Nota | `Nota` | `PASTAS.notas` → `notas/` | `nota` | `comoNota()` | `notaParaArquivo()` |
| Tarefa | `Tarefa` | `PASTAS.tarefas` → `tarefas/` | `tarefa` | `comoTarefa()` | `tarefaParaArquivo()` |
| Meta | `Meta` | `PASTAS.metas` → `pdi/metas/` | `meta` | `comoMeta()` | `metaParaArquivo()` |
| Entrega | `Entrega` | `PASTAS.entregas` → `pdi/entregas/` | `entrega` | `comoEntrega()` | `entregaParaArquivo()` |
| Referencia | `Referencia` | `PASTAS.referencias` → `referencias/` | `referencia` | `comoReferencia()` | `referenciaParaArquivo()` |
| Lousa | `Lousa` | `PASTAS.lousas` → `lousas/` | — | — | — |
| Contato | `Contato` | `PASTAS.contatos` → `contatos/` | `contato` | `comoContato()` | `contatoParaArquivo()` |

## Campos de cada entidade

### Nota

Uma nota ou rascunho em `notas/`.

| Campo | Tipo | Obrigatório | O que é |
|---|---|---|---|
| `caminho` | `string` | sim | _(de ItemBase)_ |
| `sha` | `string` | sim | _(de ItemBase)_ |
| `bruto` | `Frontmatter` | sim | _(de ItemBase)_ |
| `titulo` | `string` | sim | _(de ItemBase)_ |
| `corpo` | `string` | sim | _(de ItemBase)_ |
| `tipo` | `"nota" \| "referencia" \| "rascunho"` | sim | — |
| `tags` | `string[]` | sim | — |
| `atualizado` | `string` | não | — |

### Tarefa

Uma tarefa em `tarefas/`.

| Campo | Tipo | Obrigatório | O que é |
|---|---|---|---|
| `caminho` | `string` | sim | _(de ItemBase)_ |
| `sha` | `string` | sim | _(de ItemBase)_ |
| `bruto` | `Frontmatter` | sim | _(de ItemBase)_ |
| `titulo` | `string` | sim | _(de ItemBase)_ |
| `corpo` | `string` | sim | _(de ItemBase)_ |
| `status` | `StatusTarefa` | sim | — |
| `prazo` | `string` | não | — |
| `tags` | `string[]` | sim | — |

### Meta

Uma meta do PDI em `pdi/metas/`.

| Campo | Tipo | Obrigatório | O que é |
|---|---|---|---|
| `caminho` | `string` | sim | _(de ItemBase)_ |
| `sha` | `string` | sim | _(de ItemBase)_ |
| `bruto` | `Frontmatter` | sim | _(de ItemBase)_ |
| `titulo` | `string` | sim | _(de ItemBase)_ |
| `corpo` | `string` | sim | _(de ItemBase)_ |
| `id` | `string` | sim | Nome do arquivo sem .md — é a chave usada pelas entregas para referenciar. |
| `status` | `StatusMeta` | sim | — |
| `prazo` | `string` | não | — |
| `indicador` | `string` | sim | Como você vai saber que chegou lá. |

### Entrega

Uma entrega do PDI em `pdi/entregas/`.

| Campo | Tipo | Obrigatório | O que é |
|---|---|---|---|
| `caminho` | `string` | sim | _(de ItemBase)_ |
| `sha` | `string` | sim | _(de ItemBase)_ |
| `bruto` | `Frontmatter` | sim | _(de ItemBase)_ |
| `titulo` | `string` | sim | _(de ItemBase)_ |
| `corpo` | `string` | sim | _(de ItemBase)_ |
| `id` | `string` | sim | — |
| `data` | `string` | sim | Data AAAA-MM-DD da entrega. |
| `metas` | `string[]` | sim | IDs das metas que esta entrega alimenta (nome do arquivo sem .md). |
| `iaSugeriu` | `boolean` | sim | true quando a ligação foi sugerida pela IA e ainda não conferida pelo Hugo. |

### Referencia

Uma referência visual em `referencias/`.

| Campo | Tipo | Obrigatório | O que é |
|---|---|---|---|
| `caminho` | `string` | sim | _(de ItemBase)_ |
| `sha` | `string` | sim | _(de ItemBase)_ |
| `bruto` | `Frontmatter` | sim | _(de ItemBase)_ |
| `titulo` | `string` | sim | _(de ItemBase)_ |
| `corpo` | `string` | sim | _(de ItemBase)_ |
| `id` | `string` | sim | — |
| `imagem` | `string` | não | Caminho da imagem dentro do repositório, se houver. |
| `fonte` | `string` | não | URL de origem, se veio da web. |
| `tags` | `string[]` | sim | — |
| `porque` | `string` | sim | Por que você salvou isto — o campo mais importante. |

### Lousa

Uma lousa Excalidraw em `lousas/`. O corpo é o JSON do Excalidraw.

| Campo | Tipo | Obrigatório | O que é |
|---|---|---|---|
| `caminho` | `string` | sim | — |
| `sha` | `string` | sim | — |
| `titulo` | `string` | sim | — |
| `tituloOriginal` | `string` | sim | — |
| `dados` | `LousaDados` | sim | O JSON do Excalidraw, parseado. |

### Contato

Um contato ou pessoa vinculada em `contatos/`.

| Campo | Tipo | Obrigatório | O que é |
|---|---|---|---|
| `caminho` | `string` | sim | _(de ItemBase)_ |
| `sha` | `string` | sim | _(de ItemBase)_ |
| `bruto` | `Frontmatter` | sim | _(de ItemBase)_ |
| `titulo` | `string` | sim | _(de ItemBase)_ |
| `corpo` | `string` | sim | _(de ItemBase)_ |
| `id` | `string` | sim | — |
| `cargo` | `string` | não | — |
| `empresa` | `string` | não | — |
| `email` | `string` | não | — |
| `telefone` | `string` | não | — |
| `paiId` | `string` | não | — |
| `tags` | `string[]` | sim | — |
| `propriedades` | `Record<string, string>` | sim | — |
| `atualizado` | `string` | não | — |

## Valores de status válidos

Status fora desta lista são normalizados para o primeiro valor ao ler o arquivo —
um `.md` editado à mão no celular nunca quebra a tela.

| Constante | Valores aceitos |
|---|---|
| `STATUS_TAREFA` | `a-fazer`, `fazendo`, `feito` |
| `STATUS_META` | `a-fazer`, `em-andamento`, `concluida` |

## Os dois hooks padrão

Toda tela principal carrega com `useItemRepo` e grava com `useSalvar`. Eles
existem para que o boilerplate — e os erros de ordem que ele escondia — não
sejam reescritos em cada tela.

```tsx
const { itens, acervo, titulos, carregando, erro, recarregar } =
  useItemRepo(cfg, PASTAS.notas, (item) =>
    comoNota(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
  );

const { salvarTexto, apagarItem, salvando, erro: erroSalvar } = useSalvar(cfg);
```

`useItemRepo` cuida do `jaCarregouRef` (que quebra o laço de recarregamento),
escuta `"acervo-atualizado"` sozinho e expõe `recarregar()`.

`useSalvar` garante a ordem: `gravar()` → `atualizarCacheLocal()` com o SHA
**real** → `invalidarCache()` → evento `"acervo-atualizado"`.

### Telas e o estado da migração

`hook` = usa o hook padrão · `na mão` = ainda chama `repo.ts`/`github.ts`
direto · `não usa` = não toca no repositório de dados.

| Tela | Carregar | Gravar |
|---|---|---|
| `src/pages/BoasVindas.tsx` | não usa | não usa |
| `src/pages/Chat.tsx` | na mão | não usa |
| `src/pages/Configuracoes.tsx` | na mão | hook |
| `src/pages/Contatos.tsx` | hook | hook |
| `src/pages/Conversor.tsx` | não usa | na mão |
| `src/pages/FerramentasPDF.tsx` | não usa | não usa |
| `src/pages/GrafoNeural.tsx` | na mão | hook |
| `src/pages/Home.tsx` | na mão | na mão |
| `src/pages/Inbox.tsx` | na mão | hook |
| `src/pages/Lousas.tsx` | hook | hook |
| `src/pages/Notas.tsx` | hook | hook |
| `src/pages/Noticias.tsx` | não usa | não usa |
| `src/pages/PDI.tsx` | hook | hook |
| `src/pages/Processos.tsx` | na mão | na mão |
| `src/pages/Referencias.tsx` | hook | hook |
| `src/pages/Tarefas.tsx` | hook | hook |
| `src/pages/Transcritor.tsx` | não usa | na mão |

## Como criar uma tela nova

1. Declare a entidade em `src/lib/tipos.ts` e adicione a pasta em `PASTAS`.
2. Escreva `como<Entidade>` e `<entidade>ParaArquivo` em `src/lib/entidades.ts`.
   O `paraArquivo` **tem** que passar por `mesclarFrontmatter`.
3. Copie o padrão de `src/pages/Notas.tsx`.
4. Carregue com `useItemRepo(cfg, PASTAS.suaPasta, comoSuaEntidade)`.
5. Grave com `useSalvar(cfg)` — uma única instância por tela.
6. Rode `npm test`. O `ARCHITECTURE.md` se atualiza sozinho no próximo build.

## Regras inegociáveis

- **Frontmatter passa por `mesclarFrontmatter()` antes de qualquer save.** Um
  campo que o app não conhece — escrito à mão no celular — tem que sobreviver ao
  próximo save feito pelo app. Por isso todo item carrega `bruto`.
- **O cache só é atualizado com o SHA real devolvido pelo GitHub**, nunca antes
  de `gravar()` retornar. Atualizar antes envenena o mapa `textoPorSha`.
- **`invalidarCache()` e o evento `"acervo-atualizado"` são disparados pelo
  `useSalvar`** — não chame na mão numa tela.
- **Uma instância de `useSalvar` por tela.** Duas criam dois estados
  `salvando`/`erro` independentes e um deles nunca chega à tela.
- **O token do GitHub e a chave do Gemini só existem via `lerConfig()`.** Nunca
  no código, nunca em outro storage.
- **Sem backend PRÓPRIO.** Não existe servidor nosso, e não deve passar a
  existir. Mas a regra antiga dizia "nenhum `fetch` além de `api.github.com`"
  e isso deixou de ser verdade em cinco lugares — a regra escrita assim não
  protegia mais nada, só enganava quem a lesse. As saídas de rede de hoje,
  todas conscientes:
  | Destino | Onde | Por quê |
  |---|---|---|
  | `api.github.com` | `github.ts`, `repo.ts` | os seus dados |
  | `generativelanguage.googleapis.com` | `gemini.ts` | chat, transcrição |
  | `api.telegram.org` | `inbox.ts` | notificações |
  | `script.google.com` | `inbox.ts` | e-mail, URL que você configura |
  | `corsproxy.io`, `allorigins.win` | `clipper.ts` | **proxy de terceiros**, avisado na tela |
  | `cdnjs.cloudflare.com` | `Conversor.tsx` | cMaps do pdf.js — **deveria ser empacotado** |

  Antes de adicionar a sétima, pergunte se ela precisa mesmo existir. A
  transcrição local e o OCR rodam no próprio navegador, sem rede nenhuma —
  esse é o padrão a seguir.
- **Sem índice derivado.** `carregarRepo` usa cache por SHA; a verdade continua
  sendo o `.md`.

## Convenções de nomenclatura

| O que é | Convenção | Exemplo |
|---|---|---|
| Pasta no repositório | constante em `PASTAS` | `PASTAS.notas` |
| Tipo de entidade | interface em `tipos.ts` | `Nota`, `Tarefa` |
| Ler do arquivo | `como` + entidade | `comoNota()` |
| Gravar no arquivo | entidade + `ParaArquivo` | `notaParaArquivo()` |
| Hook de tela | `use` + o que faz | `useItemRepo`, `useSalvar` |
| Campo de frontmatter | snake_case | `ia_sugeriu`, `criado_em` |
| Variável em código | camelCase em português | `carregando`, `salvando` |
| Evento de sincronização | string kebab | `"acervo-atualizado"` |
