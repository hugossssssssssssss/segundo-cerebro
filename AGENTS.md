# Instruções para agentes de IA

App web do "segundo cérebro" do Hugo, designer gráfico brasileiro.
**Responda sempre em português do Brasil e explique sem jargão técnico** — ele não é desenvolvedor.

## A ideia em uma frase

Um site estático que edita arquivos Markdown num repositório privado do GitHub. **Não existe backend.** O navegador fala direto com `api.github.com` e com a API do Gemini.

```
Navegador (Mac ou Android)
      │
      │ GitHub Contents API — cada gravação vira um commit
      ▼
hugossssssssssssss/segundo-cerebro-dados  (privado)
├── notas/*.md
├── tarefas/*.md
├── pdi/metas/*.md
├── pdi/entregas/*.md
└── referencias/*.md  +  referencias/imagens/
```

Publicado em https://hugossssssssssssss.github.io/segundo-cerebro/ pelo workflow `.github/workflows/deploy.yml`, a cada push na `main`.

## Regras que não podem ser quebradas

1. **Os arquivos `.md` são a fonte da verdade.** Não introduza banco de dados, cache derivado nem índice. Se você criar um, ele vai divergir no dia em que o Hugo editar um arquivo direto pelo GitHub — e ele faz isso.
2. **Frontmatter é opcional.** Um `.md` sem frontmatter tem que continuar abrindo e sendo editado. Ver `lerMarkdown` em `src/lib/markdown.ts`: quando o YAML está quebrado, ela devolve o texto inteiro como corpo em vez de estourar erro. Perder campos é chato; perder o texto do usuário é inaceitável.
3. **Nunca coloque segredo no código.** Token do GitHub e chave do Gemini vivem no `localStorage`, configurados pela tela de Ajustes. Este repositório é **público**.
4. **Não adicione backend.** É o que mantém o custo em R$ 0 e o que o Hugo consegue manter sozinho.
5. **Tudo que a IA preencher fica marcado** com `ia_sugeriu: true` no frontmatter, até o Hugo conferir. Sem essa marca ele deixa de confiar no próprio material.

## Mapa do código

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/repo.ts` | Carrega o repositório inteiro: árvore (1 req) + GraphQL em lote. Revalida sempre; reaproveita conteúdo por sha |
| `src/lib/github.ts` | **Escrita** (gravar/apagar) e leitura pontual de um arquivo. Traduz erro do GitHub, distinguindo limite de API de falta de permissão |
| `src/lib/markdown.ts` | Frontmatter tolerante a falha, nomes de arquivo, mesclagem, `restaurarWikilinks` |
| `src/lib/busca.ts` | Busca em título, corpo e tags de tudo, no navegador |
| `src/lib/links.ts` | `@menções` (e os `[[links]]` antigos), índice por título e "mencionado em" |
| `src/lib/acoes.ts` | O que a IA pode criar, editar e apagar — com validação e confirmação |
| `src/lib/settings.ts` | Config no localStorage; limpa o que vem do copiar-e-colar |
| `src/lib/tarefas.ts` | Status, prazo, urgência, pomodoro, subtarefas |
| `src/lib/pdi.ts` | Metas, entregas e a agregação entre elas |
| `src/lib/referencias.ts` | Referências visuais e upload de imagem |
| `src/lib/gemini.ts` | Chamada ao Gemini com ferramentas, e os prompts salvos |
| `src/components/ui.tsx` | Componentes próprios (Botao, Cartao, Selo, Modal…) |
| `src/components/ui/*.tsx` | Componentes shadcn, do redesign. **Há duplicação com o de cima** — ao mexer, prefira um e siga nele |
| `src/components/EditorNotion.tsx` | Editor BlockNote. Converte `[[links]]` em `@menções` na saída, autocompleta com `@` e re-sincroniza quando o corpo muda por fora |
| `src/pages/*.tsx` | Uma tela por área |

## Padrão de uma tela

Todas seguem a mesma forma. Copie a mais parecida em vez de inventar outra:

```tsx
const cfg = lerConfig();
const pronto = configCompleta(cfg);        // sem token → tela pedindo Ajustes

const carregar = useCallback(async () => {
  // carregarRepo traz o repositório INTEIRO em 2 requisições e reaproveita
  // por sha. Nunca volte para `listar` + N × `ler`: era 101 requisições
  // por abertura de tela.
  const todos = await carregarRepo(cfg);
  const itens = daPasta(todos, PASTA);
  // converter com comoX(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome))
}, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

// gravar: escreverMarkdown({ dados: xParaFrontmatter(x), corpo }) → gravar(...)
// SEMPRE invalidarCache() depois de gravar ou apagar, e recarregar
```

`xParaFrontmatter` precisa passar por `mesclarFrontmatter(x.bruto, {...})`, senão
o save apaga os campos que o app não conhece — e outras IAs escrevem nesses
arquivos.

## Armadilhas já encontradas (não repita)

- **`js-yaml` v5 não tem export default.** Use `import { load, dump }`.
- **O tsconfig do build é `tsconfig.app.json`**, não o `tsconfig.json` da raiz. O alias `@/` precisa estar nos dois lugares: lá e no `vite.config.ts`.
- **`erasableSyntaxOnly` está ligado**: nada de parameter properties (`constructor(private x)`).
- **A pasta do projeto tem espaço e acento no nome.** Use `fileURLToPath`, nunca `.pathname` (que devolve `%20`).
- **Token com quebra de linha derruba tudo** com um "Failed to fetch" que não explica nada. Por isso `limpar()` em `settings.ts`.
- **URL malformada (`/repos//nome`) também dá "Failed to fetch"**: o preflight de CORS volta sem os cabeçalhos e o navegador aborta. Valide campo vazio antes de montar URL.
- **Imagem de repositório privado não carrega em `<img src>`.** Busque com o token e vire `blob:` (ver `Referencias.tsx`).
- **Limite de 5 MB por arquivo** na API do GitHub.

## Antes de entregar qualquer mudança

```
npm test          # 286 testes; nenhum precisa de rede.
                  # Inclui testes de componente (jsdom + Testing Library):
                  # três das quatro perdas de dados achadas nas auditorias
                  # viviam em componentes e eram invisíveis sem eles.
npm run build     # tem que passar limpo
npm run dev       # e abrir de verdade no navegador
```

Nunca diga que funciona sem ter rodado. E teste também numa tela estreita: metade do uso é no Android.

## O editor e o corpo do texto

**Dois componentes escrevem no mesmo corpo:** `Subtarefas` (as caixinhas) e
`EditorNotion`. Isso é seguro — verificado: o registro do pomodoro, as menções
e as caixinhas sobrevivem à ida e volta pelo serializador (`editor.test.ts`).
O custo é perder a posição do cursor no editor ao marcar uma caixinha, o que
não acontece enquanto você digita.


`EditorNotion` re-sincroniza quando o `markdown` muda por fora (as subtarefas
editam o mesmo corpo). O truque é o `ultimoMd`: o editor guarda o que ele
mesmo emitiu, ignora esse eco e só re-analisa o que veio de fora — senão o
cursor saltaria a cada tecla.

**Ao mexer aqui, mantenha `restaurarWikilinks` na saída.** Ela faz duas
coisas, e as duas importam:

1. **Limpa o escape do serializador.** O BlockNote grava `\[\[Briefing\]\]`
   com os colchetes escapados; sem a limpeza o arquivo fica sujo no GitHub e
   o app deixa de reconhecer a ligação.
2. **Converte `[[alvo]]` em `@alvo`.** A ligação entre itens é escrita com
   `@` — foi a decisão tomada quando o autocompletar passou a usar esse
   gatilho. Os `[[links]]` antigos continuam sendo RESOLVIDOS (ver `PADRAO` em
   `links.ts`), mas todo arquivo que passa pelo editor sai padronizado em `@`.
   Isso reescreve o `.md` do Hugo: é conversão de mão única e consciente.

**Menção é TEXTO PURO no arquivo**, nunca `[@Nome](caminho.md)`. O caminho
seria contado da raiz do repositório enquanto o arquivo que contém a menção
mora numa subpasta — o link resolvia errado e dava 404 no GitHub. Quem resolve
a menção é `extrairLinks`, pelo texto.

**A cor das menções vem de `CSS.highlights`**, não de `<span>` injetado. O
ProseMirror (motor do BlockNote) reescreve o DOM a cada tecla e trata elemento
estranho como conteúdo do documento — envolver texto em tag ali dentro custa
o cursor, e pode sujar o arquivo.

## Menção, relacionamento e o campo `relacionamentos`

`sincronizarRelacionamentos` mantém o campo `relacionamentos` do frontmatter
em dia com as menções do corpo. Duas armadilhas já pagas:

- **Ela precisa da lista de títulos que existem.** `@Grade suíça para @Briefing`
  é ambíguo: sem saber o que existe, não dá para saber onde o primeiro título
  termina. Sem a lista, a função NÃO MEXE EM NADA — de propósito. Passar uma
  lista vazia apagaria o campo só porque a tela abriu antes do repositório
  carregar.
- **Só `@` conta como menção em link markdown.** A expressão aceitava
  `[qualquer coisa](href)`, então um `[Google](https://google.com)` virava o
  relacionamento "@Google", e o `![](imagens/foto.png)` de toda referência
  visual virava um relacionamento com o texto alternativo da imagem.

## Pendências conscientes

- Token e chave ficam em texto puro no `localStorage`. O plano discutido é criptografá-los com uma senha (WebCrypto, sem backend). O Hugo adiou por ora.
- `ia_sugeriu` só é GRAVADO em `pdi/entregas`, que é onde existe tela para conferir e limpar. Se você criar essa interface em outra pasta, ajuste `marcaDaIA` em `acoes.ts`.
- Sem funcionamento offline: o app depende do GitHub estar acessível.
- Imagens engordam o repositório. Acima de ~1 GB, migrar para um bucket e guardar só os links.
